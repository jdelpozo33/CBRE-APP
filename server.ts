import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { apiApp } from "./server/api.ts";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Mount API app
app.use(apiApp);

// In production, serve the built Vite static assets
const distPath = path.join(__dirname, "dist");
app.use(express.static(distPath));

app.get("*", (_req, res) => {
  res.sendFile(path.join(distPath, "index.html"));
});

app.listen(PORT, () => {
  console.log(`Brokerage intelligence server running on port ${PORT}`);
});
