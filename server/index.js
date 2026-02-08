import "dotenv/config";
import cors from "cors";
import express from "express";
import multer from "multer";
import { extractTextFromImage } from "./googleVision.js";
import { extractTextFromPdf } from "./pdfText.js";
import { extractTextFromDocx } from "./wordDocx.js";

const app = express();
const upload = multer({ limits: { fileSize: 50 * 1024 * 1024 } });

app.use(cors());
app.use(express.json());

const IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp", ".heic", ".heif"];

function getLowerName(file) {
  return (file?.originalname || "").toLowerCase();
}

function hasExtension(file, ext) {
  return getLowerName(file).endsWith(ext);
}

function isPdfFile(file) {
  return (
    file?.mimetype === "application/pdf" ||
    file?.mimetype?.includes("pdf") ||
    hasExtension(file, ".pdf")
  );
}

function isDocxFile(file) {
  return (
    file?.mimetype?.includes("officedocument.wordprocessingml.document") ||
    hasExtension(file, ".docx")
  );
}

function isImageFile(file) {
  return (
    file?.mimetype?.startsWith("image/") ||
    IMAGE_EXTENSIONS.some((ext) => hasExtension(file, ext))
  );
}

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.post("/ocr", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }
    if (!isImageFile(req.file)) {
      return res.status(415).json({
        error: "Unsupported file for OCR. Please upload an image file.",
      });
    }
    const text = await extractTextFromImage(req.file.buffer);
    return res.json({ text });
  } catch (error) {
    console.error("OCR error:", error);
    return res.status(500).json({ error: "OCR failed" });
  }
});

app.post("/pdf", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }
    if (!isPdfFile(req.file)) {
      return res.status(415).json({
        error: "Unsupported file for PDF extraction. Please upload a .pdf file.",
      });
    }
    const text = await extractTextFromPdf(req.file.buffer);
    if (!text) {
      return res.status(422).json({
        error:
          "No text detected in PDF. This looks like a scanned PDF. OCR for scanned PDFs is not enabled yet.",
      });
    }
    return res.json({ text });
  } catch (error) {
    console.error("PDF error:", error);
    return res.status(500).json({ error: "PDF extraction failed" });
  }
});

app.post("/docx", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }
    if (!isDocxFile(req.file)) {
      return res.status(415).json({
        error: "Unsupported file for DOCX extraction. Please upload a .docx file.",
      });
    }
    const text = await extractTextFromDocx(req.file.buffer);
    return res.json({ text });
  } catch (error) {
    console.error("DOCX error:", error);
    return res.status(500).json({ error: "DOCX extraction failed" });
  }
});

const port = process.env.PORT || 5050;
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
