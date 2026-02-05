import vision from "@google-cloud/vision";

const client = new vision.ImageAnnotatorClient();

export async function extractTextFromImage(buffer) {
  const [result] = await client.textDetection({ image: { content: buffer } });
  const detections = result?.textAnnotations || [];
  return detections[0]?.description?.trim() || "";
}

export async function extractTextFromPdf(buffer) {
  // NOTE: For PDFs, the recommended approach is the async batch API.
  // This is a simple placeholder to keep the pipeline consistent.
  // We'll replace with asyncBatchAnnotateFiles in the next step.
  const [result] = await client.textDetection({ image: { content: buffer } });
  const detections = result?.textAnnotations || [];
  return detections[0]?.description?.trim() || "";
}
