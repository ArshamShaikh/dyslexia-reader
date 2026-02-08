const safeSplitWord = (word, maxCharsPerLine) => {
  if (!word) return [];
  if (word.length <= maxCharsPerLine) return [word];
  const chunks = [];
  const sliceSize = Math.max(1, maxCharsPerLine - 1);
  for (let i = 0; i < word.length; i += sliceSize) {
    chunks.push(word.slice(i, i + sliceSize));
  }
  return chunks;
};

const isListLine = (line) =>
  /^(\-|\*|\u2022|[0-9]+[\.\)]|[A-Za-z][\.\)])\s+/.test(line);

const isHeadingLine = (line) => {
  const value = line.trim();
  if (!value) return false;
  if (value.length > 90) return false;
  if (/^(Q\.?\s*[0-9]+[\.\)]|Question\s+[0-9]+[:.]?)/i.test(value)) return true;
  if (/^[A-Z][A-Z0-9\s\-:,&()/.]+$/.test(value)) return true;
  if (/:\s*$/.test(value) && value.length <= 80) return true;
  return false;
};

const splitLongParagraph = (paragraph) => {
  const clean = paragraph.trim();
  if (!clean) return [];
  if (clean.length < 260) return [clean];

  const sentences = clean.split(/(?<=[.!?])\s+(?=[A-Z0-9])/).filter(Boolean);
  if (sentences.length <= 2) return [clean];

  const chunks = [];
  let current = "";
  let sentenceCount = 0;

  sentences.forEach((sentence) => {
    const next = current ? `${current} ${sentence}` : sentence;
    const shouldBreak =
      current &&
      (next.length > 240 || sentenceCount >= 2);

    if (shouldBreak) {
      chunks.push(current.trim());
      current = sentence;
      sentenceCount = 1;
      return;
    }

    current = next;
    sentenceCount += 1;
  });

  if (current) chunks.push(current.trim());
  return chunks.length ? chunks : [clean];
};

const normalizeSourceLines = (text) => {
  const rawLines = text.replace(/\r\n/g, "\n").split("\n").map((line) => line.trim());
  const normalized = [];
  let paragraph = "";

  const flushParagraph = () => {
    if (paragraph) {
      const chunks = splitLongParagraph(paragraph);
      chunks.forEach((chunk, index) => {
        normalized.push(chunk);
        if (index < chunks.length - 1) normalized.push("");
      });
      paragraph = "";
    }
  };

  rawLines.forEach((line) => {
    if (!line) {
      flushParagraph();
      if (normalized[normalized.length - 1] !== "") normalized.push("");
      return;
    }

    if (isListLine(line) || isHeadingLine(line)) {
      flushParagraph();
      normalized.push(line);
      return;
    }

    paragraph = paragraph ? `${paragraph} ${line}` : line;
  });

  flushParagraph();
  return normalized;
};

export const splitIntoLines = (text, maxCharsPerLine = 36) => {
  if (!text) return [];

  const lines = [];
  const sourceLines = normalizeSourceLines(text);
  const longTokenLimit = Math.max(22, maxCharsPerLine + 8);

  sourceLines.forEach((sourceLine) => {
    const trimmed = sourceLine.trim();
    if (!trimmed) {
      // Preserve paragraph breaks
      lines.push("");
      return;
    }

    const words = trimmed.split(/\s+/);
    const normalizedWords = [];
    words.forEach((word) => {
      const chunks = safeSplitWord(word, longTokenLimit);
      normalizedWords.push(...chunks);
    });
    lines.push(normalizedWords.join(" "));
  });

  return lines;
};
