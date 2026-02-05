import "dotenv/config";
import cors from "cors";
import express from "express";
import multer from "multer";
import { extractTextFromImage, extractTextFromPdf } from "./googleVision.js";

const app = express();
const upload = multer({ limits: { fileSize: 10 * 1024 * 1024 } });

app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.post("/ocr", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }
    const text = await extractTextFromImage(req.file.buffer);
    return res.json({ text });
  } catch (error) {
    return res.status(500).json({ error: "OCR failed" });
  }
});

app.post("/pdf", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }
    const text = await extractTextFromPdf(req.file.buffer);
    return res.json({ text });
  } catch (error) {
    return res.status(500).json({ error: "PDF extraction failed" });
  }
});

const port = process.env.PORT || 5050;
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
