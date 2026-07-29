import express from "express";
import path from "path";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Initialize Gemini SDK with named parameters
const getGeminiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_API_KEY || process.env.VITE_GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("Gemini API key is missing in environment variables.");
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
};

// API route for streaming chat with Gemini
app.post("/api/chat", async (req, res) => {
  try {
    const { messages } = req.body;
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: "Invalid messages format" });
    }

    let ai;
    try {
      ai = getGeminiClient();
    } catch (err: any) {
      console.error("Gemini init error:", err.message);
      return res.status(500).json({
        error: "Gemini API key is not configured on the server. Please set GEMINI_API_KEY in environment variables.",
      });
    }

    // Format history for the Gemini SDK
    // Gemini SDK expects role: 'user' or 'model' and parts: [{ text: '...' }]
    const formattedContents = messages.map((msg: any) => ({
      role: msg.sender === "user" ? "user" : "model",
      parts: [{ text: msg.text }],
    }));

    // Set headers for Server-Sent Events (SSE) streaming
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    const responseStream = await ai.models.generateContentStream({
      model: "gemini-3.6-flash",
      contents: formattedContents,
      config: {
        systemInstruction: "You are Kaelix AI, a helpful, friendly, and intelligent chat assistant. Respond clearly and format your output beautifully in clean markdown.",
      },
    });

    for await (const chunk of responseStream) {
      if (chunk.text) {
        // SSE data format: data: <payload>\n\n
        res.write(`data: ${JSON.stringify({ text: chunk.text })}\n\n`);
      }
    }

    res.write("data: [DONE]\n\n");
    res.end();
  } catch (error: any) {
    console.error("Error in /api/chat:", error);
    res.write(`data: ${JSON.stringify({ error: error.message || "An error occurred while streaming response." })}\n\n`);
    res.end();
  }
});

// Configure Vite integration for dev vs prod environments
async function setupVite() {
  if (process.env.NODE_ENV !== "production") {
    // Development mode
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Production mode
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Kaelix Server] Running on http://localhost:${PORT}`);
  });
}

setupVite().catch((err) => {
  console.error("Failed to start server:", err);
});
