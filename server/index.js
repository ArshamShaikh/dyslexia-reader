import "dotenv/config";
import { randomUUID } from "node:crypto";
import compression from "compression";
import cors from "cors";
import express from "express";
import multer from "multer";
import {
  extractTextFromImage,
  extractTextFromPdf as extractTextFromPdfOcr,
  isPdfOcrFallbackConfigured,
} from "./googleVision.js";
import { extractTextFromPdf } from "./pdfText.js";
import { extractTextFromDocx } from "./wordDocx.js";
import { cleanOcrText } from "./ocrCleaner.js";

const app = express();

const clampInt = (value, min, max, fallback) => {
  const parsed = Number.parseInt(String(value || ""), 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
};

const MAX_UPLOAD_MB = clampInt(process.env.MAX_UPLOAD_MB, 10, 200, 100);
const MAX_EXTRACTED_CHARS = clampInt(
  process.env.MAX_EXTRACTED_TEXT_CHARS,
  200000,
  5000000,
  2000000
);
const API_ACCESS_TOKEN = String(process.env.API_ACCESS_TOKEN || "").trim();
const RATE_LIMIT_WINDOW_MS = clampInt(
  process.env.RATE_LIMIT_WINDOW_MS,
  10000,
  10 * 60 * 1000,
  60 * 1000
);
const RATE_LIMIT_MAX_REQUESTS = clampInt(
  process.env.RATE_LIMIT_MAX_REQUESTS,
  30,
  10000,
  180
);
const OCR_JOB_TTL_MS = clampInt(
  process.env.PDF_OCR_JOB_TTL_MS,
  60 * 1000,
  6 * 60 * 60 * 1000,
  45 * 60 * 1000
);
const MAX_OCR_JOBS = clampInt(process.env.PDF_OCR_MAX_JOBS, 10, 500, 80);
const upload = multer({ limits: { fileSize: MAX_UPLOAD_MB * 1024 * 1024 } });
const rateLimitStore = new Map();
const pdfOcrJobs = new Map();
const clientErrorEvents = [];

const normalizeClientIp = (req) =>
  String(
    req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
      req.headers["x-real-ip"] ||
      req.ip ||
      req.socket?.remoteAddress ||
      "unknown"
  );

const trimRateLimitStore = () => {
  const now = Date.now();
  for (const [key, bucket] of rateLimitStore.entries()) {
    if (!bucket || now >= bucket.resetAt) {
      rateLimitStore.delete(key);
    }
  }
};

const rateLimitMiddleware = (req, res, next) => {
  trimRateLimitStore();
  const key = normalizeClientIp(req);
  const now = Date.now();
  const current = rateLimitStore.get(key);
  if (!current || now >= current.resetAt) {
    rateLimitStore.set(key, {
      count: 1,
      resetAt: now + RATE_LIMIT_WINDOW_MS,
    });
    return next();
  }

  if (current.count >= RATE_LIMIT_MAX_REQUESTS) {
    const retryAfterSeconds = Math.max(1, Math.ceil((current.resetAt - now) / 1000));
    res.setHeader("Retry-After", String(retryAfterSeconds));
    return res.status(429).json({
      error: "Too many requests. Please wait and try again.",
      retryAfterSeconds,
    });
  }

  current.count += 1;
  rateLimitStore.set(key, current);
  return next();
};

const extractApiToken = (req) => {
  const authHeader = String(req.headers.authorization || "").trim();
  if (/^bearer\s+/i.test(authHeader)) {
    return authHeader.replace(/^bearer\s+/i, "").trim();
  }
  return String(req.headers["x-api-key"] || "").trim();
};

const authMiddleware = (req, res, next) => {
  if (!API_ACCESS_TOKEN) return next();
  const provided = extractApiToken(req);
  if (provided && provided === API_ACCESS_TOKEN) return next();
  return res.status(401).json({
    error: "Unauthorized request.",
  });
};

const setPdfJob = (jobId, patch) => {
  const current = pdfOcrJobs.get(jobId);
  if (!current) return;
  pdfOcrJobs.set(jobId, {
    ...current,
    ...patch,
    updatedAt: Date.now(),
  });
};

const trimPdfJobs = () => {
  const now = Date.now();
  for (const [jobId, job] of pdfOcrJobs.entries()) {
    if (!job) {
      pdfOcrJobs.delete(jobId);
      continue;
    }
    if (now - Number(job.updatedAt || job.createdAt || now) > OCR_JOB_TTL_MS) {
      pdfOcrJobs.delete(jobId);
    }
  }
  if (pdfOcrJobs.size <= MAX_OCR_JOBS) return;
  const sorted = [...pdfOcrJobs.entries()].sort(
    (a, b) => Number(a[1]?.updatedAt || 0) - Number(b[1]?.updatedAt || 0)
  );
  while (sorted.length > MAX_OCR_JOBS) {
    const [jobId] = sorted.shift();
    pdfOcrJobs.delete(jobId);
  }
};

const startPdfOcrJob = (buffer, fileName = "") => {
  trimPdfJobs();
  const now = Date.now();
  const jobId = `pdfocr_${now}_${randomUUID().slice(0, 8)}`;
  pdfOcrJobs.set(jobId, {
    id: jobId,
    type: "pdf-ocr",
    status: "queued",
    phase: "queued",
    progress: 5,
    createdAt: now,
    updatedAt: now,
    source: "pdf-ocr-fallback",
    fileName: String(fileName || "").slice(0, 120),
    text: "",
    truncated: false,
    maxChars: MAX_EXTRACTED_CHARS,
    error: "",
  });

  setImmediate(async () => {
    try {
      setPdfJob(jobId, {
        status: "processing",
        phase: "running-ocr",
        progress: 18,
      });
      const rawOcrText = await extractTextFromPdfOcr(buffer);
      setPdfJob(jobId, {
        phase: "finalizing-text",
        progress: 84,
      });
      const finalized = finalizeExtractedText(rawOcrText, {
        source: "pdf-ocr-fallback",
      });
      if (!finalized.text) {
        setPdfJob(jobId, {
          status: "failed",
          phase: "done",
          progress: 100,
          error: "No text detected in PDF, even after OCR fallback.",
        });
        return;
      }
      setPdfJob(jobId, {
        ...finalized,
        status: "completed",
        phase: "done",
        progress: 100,
        error: "",
      });
    } catch (error) {
      setPdfJob(jobId, {
        status: "failed",
        phase: "done",
        progress: 100,
        error: String(error?.message || "PDF OCR job failed."),
      });
    } finally {
      trimPdfJobs();
    }
  });

  return jobId;
};

const formatPdfJobResponse = (job) => {
  if (!job) return null;
  const base = {
    id: job.id,
    status: job.status,
    phase: job.phase,
    progress: job.progress,
    source: job.source,
    truncated: Boolean(job.truncated),
    maxChars: Number(job.maxChars || MAX_EXTRACTED_CHARS),
    error: job.error || "",
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
  };
  if (job.status === "completed") {
    return { ...base, text: String(job.text || "") };
  }
  return base;
};

const finalizeExtractedText = (rawText = "", meta = {}) => {
  const cleaned = cleanOcrText(rawText || "");
  if (!cleaned) {
    return {
      text: "",
      truncated: false,
      maxChars: MAX_EXTRACTED_CHARS,
      ...meta,
    };
  }
  if (cleaned.length <= MAX_EXTRACTED_CHARS) {
    return {
      text: cleaned,
      truncated: false,
      maxChars: MAX_EXTRACTED_CHARS,
      ...meta,
    };
  }
  return {
    text: cleaned.slice(0, MAX_EXTRACTED_CHARS),
    truncated: true,
    maxChars: MAX_EXTRACTED_CHARS,
    ...meta,
  };
};

app.use(cors());
app.use(express.json({ limit: "1mb" }));
app.use(
  compression({
    threshold: 1024,
  })
);

setInterval(trimPdfJobs, 60 * 1000).unref();

const IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp", ".heic", ".heif"];
const secureMiddlewares = [authMiddleware, rateLimitMiddleware];

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
  res.json({
    ok: true,
    scannedPdfOcrFallback: isPdfOcrFallbackConfigured(),
    maxUploadMb: MAX_UPLOAD_MB,
    maxExtractedChars: MAX_EXTRACTED_CHARS,
    authRequired: Boolean(API_ACCESS_TOKEN),
    rateLimit: {
      windowMs: RATE_LIMIT_WINDOW_MS,
      maxRequests: RATE_LIMIT_MAX_REQUESTS,
    },
  });
});

app.get("/jobs/:jobId", ...secureMiddlewares, (req, res) => {
  const jobId = String(req.params.jobId || "").trim();
  const job = pdfOcrJobs.get(jobId);
  if (!job) {
    return res.status(404).json({ error: "Job not found." });
  }
  return res.json(formatPdfJobResponse(job));
});

app.post("/events/client-error", ...secureMiddlewares, (req, res) => {
  const payload = req.body || {};
  const message = String(payload.message || "").trim().slice(0, 900);
  if (!message) {
    return res.status(400).json({ error: "Missing error message." });
  }
  const event = {
    id: `event_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    createdAt: Date.now(),
    clientIp: normalizeClientIp(req),
    message,
    stack: String(payload.stack || "").slice(0, 8000),
    isFatal: Boolean(payload.isFatal),
    context: payload.context && typeof payload.context === "object" ? payload.context : {},
    appVersion: String(payload.appVersion || "").slice(0, 64),
    platform: String(payload.platform || "").slice(0, 32),
  };
  clientErrorEvents.push(event);
  while (clientErrorEvents.length > 250) {
    clientErrorEvents.shift();
  }
  console.error("[client-error]", {
    message: event.message,
    isFatal: event.isFatal,
    appVersion: event.appVersion,
    platform: event.platform,
  });
  return res.json({ ok: true });
});

app.post("/ocr", ...secureMiddlewares, upload.single("file"), async (req, res) => {
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
    return res.json(finalizeExtractedText(text, { source: "image-ocr" }));
  } catch (error) {
    console.error("OCR error:", error);
    return res.status(500).json({ error: "OCR failed" });
  }
});

app.post("/pdf", ...secureMiddlewares, upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }
    if (!isPdfFile(req.file)) {
      return res.status(415).json({
        error: "Unsupported file for PDF extraction. Please upload a .pdf file.",
      });
    }
    const textLayerRaw = await extractTextFromPdf(req.file.buffer);
    const textLayerResult = finalizeExtractedText(textLayerRaw, {
      source: "pdf-text-layer",
    });
    if (textLayerResult.text) {
      return res.json(textLayerResult);
    }

    if (isPdfOcrFallbackConfigured()) {
      const shouldProcessAsync =
        String(req.query.async || "1").trim() !== "0";
      if (shouldProcessAsync) {
        const jobId = startPdfOcrJob(req.file.buffer, req.file.originalname);
        return res.status(202).json({
          jobId,
          status: "queued",
          phase: "queued",
          progress: 5,
          pollPath: `/jobs/${jobId}`,
          source: "pdf-ocr-fallback",
        });
      }

      const ocrTextRaw = await extractTextFromPdfOcr(req.file.buffer);
      const finalized = finalizeExtractedText(ocrTextRaw, {
        source: "pdf-ocr-fallback",
      });
      if (finalized.text) {
        return res.json(finalized);
      }
      return res.status(422).json({
        error: "No text detected in PDF, even after OCR fallback.",
      });
    }
    return res.status(422).json({
      error:
        "No text detected in PDF. This looks scanned. Configure scanned PDF OCR fallback (Vision + Cloud Storage buckets).",
    });
  } catch (error) {
    console.error("PDF error:", error);
    return res.status(500).json({ error: "PDF extraction failed" });
  }
});

app.post("/docx", ...secureMiddlewares, upload.single("file"), async (req, res) => {
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
    return res.json(finalizeExtractedText(text, { source: "docx" }));
  } catch (error) {
    console.error("DOCX error:", error);
    return res.status(500).json({ error: "DOCX extraction failed" });
  }
});

app.use((error, _req, res, _next) => {
  if (error?.code === "LIMIT_FILE_SIZE") {
    return res.status(413).json({
      error: `File too large. Maximum supported size is ${MAX_UPLOAD_MB}MB.`,
    });
  }
  console.error("Unhandled server error:", error);
  return res.status(500).json({ error: "Server error" });
});

const port = process.env.PORT || 5050;
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
