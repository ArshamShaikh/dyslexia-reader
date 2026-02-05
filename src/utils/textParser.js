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

export const splitIntoLines = (text, maxCharsPerLine = 36) => {
  if (!text) return [];

  const words = text.trim().split(/\s+/);
  const lines = [];
  let currentLine = "";

  words.forEach((word) => {
    const chunks = safeSplitWord(word, maxCharsPerLine);
    chunks.forEach((chunk) => {
      const nextLine = currentLine ? `${currentLine} ${chunk}` : chunk;
      if (nextLine.length > maxCharsPerLine && currentLine) {
        lines.push(currentLine);
        currentLine = chunk;
      } else {
        currentLine = nextLine;
      }
    });
  });

  if (currentLine) {
    lines.push(currentLine);
  }

  return lines;
};
