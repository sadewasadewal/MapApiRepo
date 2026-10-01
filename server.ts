import express from "express";
import path from "path";
import dotenv from "dotenv";
import { handleChatRequest, geocodeLocation } from "./src/server/api.ts";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const MAPS_API_KEY = process.env.VITE_GOOGLE_MAPS_API_KEY || "AIzaSyB1ZONYvs3Yp7teH6YYQhWWpWx48vBPtLY";

app.use(express.json());

// API Endpoints
app.get("/api/config", (_req, res) => {
  res.json({
    mapsApiKey: MAPS_API_KEY,
  });
});

app.post("/api/chat", async (req, res) => {
  try {
    const payload = req.body;
    if (!payload || !payload.messages || !Array.isArray(payload.messages)) {
      res.status(400).json({ error: "Invalid request: messages array is required." });
      return;
    }

    const result = await handleChatRequest(payload);
    res.json(result);
  } catch (error: any) {
    console.error("Error in /api/chat:", error);
    res.status(500).json({
      error: error.message || "An unexpected error occurred while communicating with Gemini.",
    });
  }
});

app.post("/api/geocode", async (req, res) => {
  try {
    const { query } = req.body;
    if (!query) {
      res.status(400).json({ error: "Missing query" });
      return;
    }
    const result = await geocodeLocation(query, MAPS_API_KEY);
    if (!result) {
      res.status(404).json({ error: "Location not found" });
      return;
    }
    res.json(result);
  } catch (err: any) {
    console.error("Error in /api/geocode:", err);
    res.status(500).json({ error: err.message || "Failed to geocode location" });
  }
});

// Serve frontend in production
const distPath = path.resolve(process.cwd(), "dist");
app.use(express.static(distPath));

app.get("*", (_req, res) => {
  res.sendFile(path.join(distPath, "index.html"));
});

export { app };

if (process.env.NODE_ENV === "production" || process.argv[1]?.includes("server.ts")) {
  app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
  });
}
