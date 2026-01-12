export const splitIntoLines = (text, wordsPerLine = 8) => {
  if (!text) return [];

  const words = text.split(/\s+/);
  const lines = [];

  for (let i = 0; i < words.length; i += wordsPerLine) {
    lines.push(words.slice(i, i + wordsPerLine).join(" "));
  }

  return lines;
};
