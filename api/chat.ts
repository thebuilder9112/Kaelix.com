import { GoogleGenAI } from "@google/genai";

let aiClient: GoogleGenAI | null = null;

const getGeminiClient = () => {
  const apiKey =
    process.env.GEMINI_API_KEY ||
    process.env.API_KEY ||
    process.env.VITE_API_KEY ||
    process.env.GOOGLE_API_KEY;

  if (!apiKey) {
    throw new Error(
      "GEMINI_API_KEY is not set in your environment variables. Please add GEMINI_API_KEY to your environment variables in AI Studio or your deployment dashboard."
    );
  }

  if (!aiClient) {
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
};

export default async function handler(req: any, res: any) {
  // CORS Headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(200).json({ status: "ok", message: "Kaelix Chat API endpoint" });
  }

  try {
    let body = req.body;
    if (typeof body === "string") {
      try {
        body = JSON.parse(body);
      } catch {
        // use as-is
      }
    }

    const { messages } = body || {};

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: "Invalid messages format" });
    }

    let ai: GoogleGenAI;
    try {
      ai = getGeminiClient();
    } catch (err: any) {
      console.error("Gemini init error:", err.message);
      return res.status(500).json({
        error: "GEMINI_API_KEY is missing. Please configure your GEMINI_API_KEY in your environment variables.",
      });
    }

    // Set Server-Sent Events headers
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");

    // Format chat history
    const formattedContents = messages.map((msg: any) => ({
      role: msg.sender === "user" ? "user" : "model",
      parts: [{ text: msg.text }],
    }));

    const responseStream = await ai.models.generateContentStream({
      model: "gemini-3.6-flash",
      contents: formattedContents,
      config: {
        systemInstruction:
          "You are Kaelix AI, a helpful, friendly, and intelligent chat assistant. If anyone asks who created, built, made, or owns this AI, you must always answer that Aum Chauhan and Tirth Pandya made it. Respond clearly and format your output beautifully in clean markdown.",
      },
    });

    for await (const chunk of responseStream) {
      if (chunk.text) {
        res.write(`data: ${JSON.stringify({ text: chunk.text })}\n\n`);
      }
    }

    res.write("data: [DONE]\n\n");
    res.end();
  } catch (error: any) {
    console.error("Error in /api/chat handler:", error);
    let rawMsg = error?.message || error?.toString() || "An error occurred while generating response.";
    let friendlyError = rawMsg;

    if (
      rawMsg.includes("leaked") ||
      rawMsg.includes("403") ||
      rawMsg.includes("PERMISSION_DENIED") ||
      rawMsg.includes("API key")
    ) {
      friendlyError = "The Gemini API key is invalid or revoked. Please update your API key in settings.";
    }

    if (!res.headersSent) {
      return res.status(500).json({ error: friendlyError });
    } else {
      res.write(`data: ${JSON.stringify({ error: friendlyError })}\n\n`);
      res.end();
    }
  }
}
