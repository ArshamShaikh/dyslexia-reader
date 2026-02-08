export const cleanOcrText = (raw) => {
  if (!raw) return "";

  const looksLikeHeading = (line) => {
    const trimmed = line.trim();
    if (!trimmed) return false;
    if (trimmed.length > 80) return false;
    if (/^[A-Z][A-Z0-9\s\-:,&()/.]+$/.test(trimmed) && trimmed.length >= 4) return true;
    if (/^([A-Z][a-z]+(\s+[A-Z][a-z]+){0,6})$/.test(trimmed) && !/[.!?]$/.test(trimmed)) {
      return true;
    }
    return false;
  };

  const isBullet = (line) =>
    /^(\-|\*|\u2022|[0-9]+[\.\)]|[A-Za-z][\.\)])\s+/.test(line.trim());

  const shouldJoinAsContinuation = (line) => {
    const trimmed = line.trim();
    if (!trimmed) return false;
    if (looksLikeHeading(trimmed)) return false;
    if (isBullet(trimmed)) return false;
    return true;
  };

  const normalizeLine = (line) =>
    line
      .replace(/\s+/g, " ")
      .replace(/[ \t]+$/g, "")
      .trim();

  let text = raw;

  // Normalize common mojibake and line endings.
  text = text.replace(/â€¢/g, "\u2022");
  text = text.replace(/\r\n/g, "\n");

  // Remove hyphenation at line breaks (e.g., "exam-\nple" -> "example")
  text = text.replace(/([A-Za-z])-\n([A-Za-z])/g, "$1$2");

  const rawLines = text.split("\n").map(normalizeLine);
  const output = [];
  let paragraph = "";

  const flushParagraph = () => {
    if (paragraph) {
      output.push(paragraph.trim());
      paragraph = "";
    }
  };

  for (let i = 0; i < rawLines.length; i += 1) {
    const line = rawLines[i];
    const next = rawLines[i + 1] || "";

    if (!line) {
      flushParagraph();
      if (output[output.length - 1] !== "") output.push("");
      continue;
    }

    const heading = looksLikeHeading(line);
    const bullet = isBullet(line);

    if (heading || bullet) {
      flushParagraph();

      if (bullet) {
        // Keep wrapped bullet/question text in the same logical line.
        let combined = line;
        let j = i + 1;
        while (j < rawLines.length && shouldJoinAsContinuation(rawLines[j])) {
          combined = `${combined} ${rawLines[j]}`;
          j += 1;
        }
        output.push(combined.trim());
        i = j - 1;
        if (j < rawLines.length && rawLines[j]) output.push("");
        continue;
      }

      output.push(line.trim());
      if (!next || (heading && looksLikeHeading(next) && !isBullet(next))) {
        output.push("");
      }
      continue;
    }

    paragraph = paragraph ? `${paragraph} ${line}` : line;

    if (!next || looksLikeHeading(next) || isBullet(next)) {
      flushParagraph();
      if (next && (looksLikeHeading(next) || isBullet(next))) output.push("");
    }
  }

  flushParagraph();

  return output
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
};
