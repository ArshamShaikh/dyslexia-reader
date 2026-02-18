import { Storage } from "@google-cloud/storage";
import vision from "@google-cloud/vision";
import { randomUUID } from "node:crypto";

const client = new vision.ImageAnnotatorClient();
const storage = new Storage();

const PDF_OCR_INPUT_BUCKET = String(process.env.GOOGLE_VISION_PDF_INPUT_BUCKET || "").trim();
const PDF_OCR_OUTPUT_BUCKET = String(process.env.GOOGLE_VISION_PDF_OUTPUT_BUCKET || "").trim();
const PDF_OCR_OUTPUT_PREFIX = String(
  process.env.GOOGLE_VISION_PDF_OUTPUT_PREFIX || "vision-pdf-ocr"
).trim();
const PDF_OCR_BATCH_SIZE = Math.max(
  1,
  Math.min(20, Number.parseInt(process.env.GOOGLE_VISION_PDF_BATCH_SIZE || "5", 10) || 5)
);
const PDF_OCR_CLEANUP = process.env.GOOGLE_VISION_PDF_CLEANUP !== "false";

const normalizePrefix = (prefix = "") =>
  String(prefix || "")
    .replace(/^\/+/, "")
    .replace(/\/+$/, "");

const joinStoragePath = (...parts) =>
  parts
    .map((part) => String(part || "").replace(/^\/+|\/+$/g, ""))
    .filter(Boolean)
    .join("/");

const createGsUri = (bucket, objectPath) => `gs://${bucket}/${objectPath}`;

function pageRangeStartFromName(name = "") {
  const match = String(name).match(/-(\d+)-to-(\d+)\.json$/i);
  if (!match) return Number.POSITIVE_INFINITY;
  return Number.parseInt(match[1], 10);
}

async function readOcrOutputText(bucketName, prefix) {
  const [files] = await storage.bucket(bucketName).getFiles({ prefix });
  const jsonFiles = files
    .filter((file) => String(file.name || "").toLowerCase().endsWith(".json"))
    .sort((a, b) => {
      const aPage = pageRangeStartFromName(a.name);
      const bPage = pageRangeStartFromName(b.name);
      if (aPage !== bPage) return aPage - bPage;
      return String(a.name || "").localeCompare(String(b.name || ""));
    });

  const chunks = [];
  for (const file of jsonFiles) {
    const [buffer] = await file.download();
    let parsed;
    try {
      parsed = JSON.parse(buffer.toString("utf8"));
    } catch {
      continue;
    }
    const responses = Array.isArray(parsed?.responses) ? parsed.responses : [];
    for (const item of responses) {
      const text =
        item?.fullTextAnnotation?.text ||
        (Array.isArray(item?.textAnnotations) ? item.textAnnotations[0]?.description : "");
      const clean = String(text || "").trim();
      if (clean) chunks.push(clean);
    }
  }
  return chunks.join("\n\n").trim();
}

async function deleteByPrefix(bucketName, prefix) {
  try {
    const [files] = await storage.bucket(bucketName).getFiles({ prefix });
    if (!files.length) return;
    await Promise.allSettled(files.map((file) => file.delete()));
  } catch {
    // Best-effort cleanup only.
  }
}

export function isPdfOcrFallbackConfigured() {
  return Boolean(PDF_OCR_INPUT_BUCKET && PDF_OCR_OUTPUT_BUCKET);
}

function getWordText(word = {}) {
  return (word.symbols || []).map((s) => s.text || "").join("").trim();
}

function getBoundingBox(vertices = []) {
  const xs = vertices.map((v) => Number(v.x || 0));
  const ys = vertices.map((v) => Number(v.y || 0));
  const left = Math.min(...xs);
  const right = Math.max(...xs);
  const top = Math.min(...ys);
  const bottom = Math.max(...ys);
  return {
    left,
    right,
    top,
    bottom,
    width: Math.max(1, right - left),
    height: Math.max(1, bottom - top),
    centerY: (top + bottom) / 2,
  };
}

function buildLayoutAwareText(fullTextAnnotation) {
  const pages = fullTextAnnotation?.pages || [];
  const words = [];

  for (const page of pages) {
    for (const block of page.blocks || []) {
      for (const paragraph of block.paragraphs || []) {
        for (const word of paragraph.words || []) {
          const text = getWordText(word);
          if (!text) continue;
          const box = getBoundingBox(word.boundingBox?.vertices || []);
          words.push({ text, ...box });
        }
      }
    }
  }

  if (!words.length) return "";

  words.sort((a, b) => {
    if (Math.abs(a.centerY - b.centerY) > 2) return a.centerY - b.centerY;
    return a.left - b.left;
  });

  const lines = [];
  for (const word of words) {
    let bestIndex = -1;
    let bestScore = Infinity;
    for (let i = 0; i < lines.length; i += 1) {
      const line = lines[i];
      const tolerance = Math.max(8, Math.min(18, line.avgHeight * 0.72));
      const delta = Math.abs(word.centerY - line.centerY);
      if (delta <= tolerance && delta < bestScore) {
        bestIndex = i;
        bestScore = delta;
      }
    }
    if (bestIndex === -1) {
      lines.push({
        words: [word],
        centerY: word.centerY,
        avgHeight: word.height,
        top: word.top,
        bottom: word.bottom,
      });
      continue;
    }
    const line = lines[bestIndex];
    const prevCount = line.words.length;
    line.words.push(word);
    line.top = Math.min(line.top, word.top);
    line.bottom = Math.max(line.bottom, word.bottom);
    line.centerY = (line.centerY * prevCount + word.centerY) / (prevCount + 1);
    line.avgHeight = (line.avgHeight * prevCount + word.height) / (prevCount + 1);
  }

  lines.sort((a, b) => a.top - b.top);

  const renderedLines = [];
  let prevBottom = null;
  for (const line of lines) {
    line.words.sort((a, b) => a.left - b.left);
    if (prevBottom !== null) {
      const verticalGap = line.top - prevBottom;
      if (verticalGap > line.avgHeight * 1.4 && renderedLines[renderedLines.length - 1] !== "") {
        renderedLines.push("");
      }
    }

    const avgCharWidth =
      line.words.reduce((sum, w) => sum + w.width / Math.max(1, w.text.length), 0) /
      Math.max(1, line.words.length);

    let text = "";
    for (let i = 0; i < line.words.length; i += 1) {
      const word = line.words[i];
      if (i === 0) {
        text = word.text;
        continue;
      }
      const prev = line.words[i - 1];
      const gap = Math.max(0, word.left - prev.right);
      const joinWithoutSpace = /^[,.;:!?%)\]}]$/.test(word.text);
      if (joinWithoutSpace) {
        text += word.text;
        continue;
      }
      // Keep wider gaps for table-like OCR as multi-space separators.
      if (gap > avgCharWidth * 5.2) text += "    ";
      else if (gap > avgCharWidth * 2.4) text += "  ";
      else text += " ";
      text += word.text;
    }

    renderedLines.push(text.trimEnd());
    prevBottom = line.bottom;
  }

  return renderedLines.join("\n").trim();
}

export async function extractTextFromImage(buffer) {
  const [result] = await client.documentTextDetection({ image: { content: buffer } });
  const layoutAware = buildLayoutAwareText(result?.fullTextAnnotation);
  if (layoutAware) return layoutAware;
  const detections = result?.textAnnotations || [];
  return detections[0]?.description?.trim() || "";
}

export async function extractTextFromPdf(buffer) {
  if (!isPdfOcrFallbackConfigured()) {
    throw new Error(
      "PDF OCR fallback not configured. Set GOOGLE_VISION_PDF_INPUT_BUCKET and GOOGLE_VISION_PDF_OUTPUT_BUCKET."
    );
  }
  if (!buffer || !buffer.length) return "";

  const jobId = `${Date.now()}-${randomUUID()}`;
  const inputObjectPath = joinStoragePath("pdf-ocr-input", `${jobId}.pdf`);
  const outputPrefix = joinStoragePath(
    normalizePrefix(PDF_OCR_OUTPUT_PREFIX),
    "jobs",
    jobId
  );
  const outputDestination = `${createGsUri(PDF_OCR_OUTPUT_BUCKET, outputPrefix)}/`;
  const inputUri = createGsUri(PDF_OCR_INPUT_BUCKET, inputObjectPath);

  await storage
    .bucket(PDF_OCR_INPUT_BUCKET)
    .file(inputObjectPath)
    .save(buffer, {
      resumable: false,
      contentType: "application/pdf",
      validation: false,
    });

  try {
    const request = {
      requests: [
        {
          inputConfig: {
            gcsSource: { uri: inputUri },
            mimeType: "application/pdf",
          },
          features: [{ type: "DOCUMENT_TEXT_DETECTION" }],
          outputConfig: {
            gcsDestination: { uri: outputDestination },
            batchSize: PDF_OCR_BATCH_SIZE,
          },
        },
      ],
    };

    const [operation] = await client.asyncBatchAnnotateFiles(request);
    await operation.promise();
    const text = await readOcrOutputText(PDF_OCR_OUTPUT_BUCKET, outputPrefix);
    return text;
  } finally {
    if (PDF_OCR_CLEANUP) {
      await Promise.allSettled([
        storage
          .bucket(PDF_OCR_INPUT_BUCKET)
          .file(inputObjectPath)
          .delete()
          .catch(() => {}),
        deleteByPrefix(PDF_OCR_OUTPUT_BUCKET, outputPrefix),
      ]);
    }
  }
}
