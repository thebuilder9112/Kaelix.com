import express from "express";
import path from "path";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Enable CORS for all routes and handle preflight OPTIONS requests
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With");
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});

// Initialize Gemini SDK with named parameters & support AI Studio environment variables
let aiClient: GoogleGenAI | null = null;

const getGeminiClient = () => {
  const apiKey =
    process.env.GEMINI_API_KEY ||
    process.env.VITE_API_KEY ||
    process.env.API_KEY ||
    process.env.GOOGLE_API_KEY;

  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is missing. Please configure your API key in AI Studio Settings.");
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

// API route for streaming chat with Gemini
app.all("/api/chat", async (req, res) => {
  if (req.method !== "POST") {
    return res.status(200).json({ status: "ok", message: "Kaelix Chat API endpoint (Use POST for chat generation)" });
  }

  try {
    const { messages } = req.body || {};

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: "Invalid messages format" });
    }

    let ai: GoogleGenAI;
    try {
      ai = getGeminiClient();
    } catch (err: any) {
      console.error("Gemini init error:", err.message);
      return res.status(500).json({
        error: "GEMINI_API_KEY is not configured. Please ensure your API key is configured in AI Studio Settings.",
      });
    }

    // Set headers for Server-Sent Events (SSE) streaming
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    // Format history for the Gemini SDK
    const formattedContents = messages.map((msg: any) => ({
      role: msg.sender === "user" ? "user" : "model",
      parts: [{ text: msg.text }],
    }));

    const responseStream = await ai.models.generateContentStream({
      model: "gemini-3.6-flash",
      contents: formattedContents,
      config: {
        systemInstruction: "You are Kaelix AI, a helpful, friendly, and intelligent chat assistant. If anyone asks who created, built, made, or owns this AI, you must always answer that Aum Chauhan and Tirth Pandya made it. Respond clearly and format your output beautifully in clean markdown.",
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
    console.error("Error in /api/chat:", error);
    let rawMsg = error?.message || error?.toString() || "An error occurred while generating response.";
    let friendlyError = rawMsg;

    if (rawMsg.includes("leaked") || rawMsg.includes("403") || rawMsg.includes("PERMISSION_DENIED") || rawMsg.includes("API key")) {
      friendlyError = "The Gemini API key is invalid or revoked. Please update your API key in AI Studio Settings.";
    }

    if (!res.headersSent) {
      res.setHeader("Content-Type", "text/event-stream");
    }
    res.write(`data: ${JSON.stringify({ error: friendlyError })}\n\n`);
    res.end();
  }
});

// Configure Vite integration for dev vs prod environments
async function setupVite() {
  if (process.env.NODE_ENV !== "production") {
    // Development mode
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: false },
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
