import vision from "@google-cloud/vision";

const client = new vision.ImageAnnotatorClient();

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
  // NOTE: For PDFs, the recommended approach is the async batch API.
  // This is a simple placeholder to keep the pipeline consistent.
  // We'll replace with asyncBatchAnnotateFiles in the next step.
  const [result] = await client.textDetection({ image: { content: buffer } });
  const detections = result?.textAnnotations || [];
  return detections[0]?.description?.trim() || "";
}
