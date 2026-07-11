import "dotenv/config";
import express from "express";
import cors from "cors";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Anthropic from "@anthropic-ai/sdk";
import { SYSTEM_PROMPT } from "./systemPrompt.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 8787;
const MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-5";

const anthropic = process.env.ANTHROPIC_API_KEY
  ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  : null;

const app = express();
app.use(cors());
app.use(express.json({ limit: "1mb" }));

app.post("/api/chat", async (req, res) => {
  if (!anthropic) {
    res.status(500).json({
      error:
        "ANTHROPIC_API_KEY sozlanmagan. Server .env faylida API kalitni belgilang (.env.example ga qarang).",
    });
    return;
  }

  const { messages } = req.body || {};
  if (!Array.isArray(messages) || messages.length === 0) {
    res.status(400).json({ error: "messages massivi talab qilinadi." });
    return;
  }

  const claudeMessages = messages
    .filter((m) => m && typeof m.content === "string" && m.content.trim().length > 0)
    .map((m) => ({
      role: m.role === "assistant" ? "assistant" : "user",
      content: m.content,
    }));

  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("X-Accel-Buffering", "no");

  try {
    const stream = anthropic.messages.stream({
      model: MODEL,
      max_tokens: 1536,
      system: SYSTEM_PROMPT,
      messages: claudeMessages,
    });

    stream.on("text", (delta) => {
      res.write(delta);
    });

    stream.on("error", (err) => {
      console.error("Anthropic stream error:", err);
      if (!res.headersSent) {
        res.status(500);
      }
      res.end();
    });

    await stream.finalMessage();
    res.end();
  } catch (err) {
    console.error("Chat error:", err);
    if (!res.headersSent) {
      res.status(500).json({ error: "AI bilan bog'lanishda xatolik yuz berdi." });
    } else {
      res.end();
    }
  }
});

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, model: MODEL, configured: Boolean(anthropic) });
});

const distPath = path.join(__dirname, "..", "dist");
app.use(express.static(distPath));
app.get(/^(?!\/api).*/, (_req, res) => {
  res.sendFile(path.join(distPath, "index.html"));
});

app.listen(PORT, () => {
  console.log(`Fintellect API server ishga tushdi: http://localhost:${PORT}`);
});
