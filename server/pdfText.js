import { createRequire } from "module";

const require = createRequire(import.meta.url);
const pdfParse = require("pdf-parse");

export async function extractTextFromPdf(buffer) {
  const parseFn = typeof pdfParse === "function" ? pdfParse : pdfParse.default;
  if (typeof parseFn !== "function") {
    throw new Error("pdf-parse did not export a function");
  }
  const data = await parseFn(buffer);
  const text = (data?.text || "").trim();
  return text;
}
