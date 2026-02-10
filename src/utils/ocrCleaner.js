const TABLE_CELL_SEPARATOR = " | ";

const normalizeMojibake = (text = "") =>
  text
    .replace(/Ã¢â‚¬Â¢/g, "\u2022")
    .replace(/\r\n/g, "\n");

const normalizeUnicodeSpaces = (line = "") =>
  line
    .replace(/\u00a0/g, " ")
    .replace(/\u2007/g, " ")
    .replace(/\u202f/g, " ");

const compactLine = (line = "") =>
  normalizeUnicodeSpaces(line)
    .replace(/[ \t]+/g, " ")
    .replace(/[ \t]+:\s*/g, ": ")
    .trim();

const looksLikeHeading = (line = "") => {
  const trimmed = compactLine(line);
  if (!trimmed) return false;
  if (trimmed.length > 90) return false;
  if (/^[A-Z][A-Z0-9\s\-:,&()/.]+$/.test(trimmed) && trimmed.length >= 4) return true;
  if (/^([A-Z][a-z]+(\s+[A-Z][a-z]+){0,8})$/.test(trimmed) && !/[.!?]$/.test(trimmed)) {
    return true;
  }
  return false;
};

const isBullet = (line = "") =>
  /^(\-|\*|\u2022|[0-9]+[\.\)]|[A-Za-z][\.\)])\s+/.test(compactLine(line));

const looksLikeTableBorder = (line = "") =>
  /^[\s|+\-_=:.]{4,}$/.test(normalizeUnicodeSpaces(line).trim());

const splitTableCells = (line = "") => {
  const raw = normalizeUnicodeSpaces(line)
    .replace(/[ \t]*\|[ \t]*/g, "|")
    .trim();
  if (!raw) return [];
  if (raw.includes("|")) {
    return raw.split("|").map((cell) => compactLine(cell)).filter(Boolean);
  }
  return raw
    .split(/\t+| {2,}/)
    .map((cell) => compactLine(cell))
    .filter(Boolean);
};

const looksLikeTableCandidate = (line = "") => {
  const compact = compactLine(line);
  if (!compact) return false;
  if (looksLikeTableBorder(line)) return false;
  const cells = splitTableCells(line);
  if (cells.length < 2) return false;
  if (compact.length > 220) return false;

  const shortCells = cells.filter((cell) => cell.length <= 24).length;
  const numericCells = cells.filter((cell) => /\d/.test(cell)).length;
  const mostlyProse =
    /[.!?]$/.test(compact) &&
    cells.length <= 2 &&
    cells[0]?.split(" ").length > 5 &&
    cells[1]?.split(" ").length > 7;

  return !mostlyProse && (numericCells > 0 || shortCells >= 2);
};

const normalizeTableRow = (line = "") => {
  const cells = splitTableCells(line);
  if (cells.length < 2) return compactLine(line);
  return cells.join(TABLE_CELL_SEPARATOR);
};

const likelyLineContinuation = (line = "") => {
  const value = compactLine(line);
  if (!value) return false;
  if (/^[a-z]/.test(value)) return true;
  if (/^(and|or|but|to|of|for|with|in|on|at|from|by|as|the|a|an)\b/i.test(value)) {
    return true;
  }
  return false;
};

const shouldJoinAsContinuation = (line = "") => {
  const value = compactLine(line);
  if (!value) return false;
  if (looksLikeHeading(value)) return false;
  if (isBullet(value)) return false;
  if (looksLikeTableCandidate(line) || looksLikeTableBorder(line)) return false;
  return true;
};

const hasNearTableNeighbor = (rawLines, index) => {
  for (let step = 1; step <= 2; step += 1) {
    const next = rawLines[index + step];
    if (next === undefined) break;
    if (!compactLine(next)) continue;
    if (looksLikeTableCandidate(next) || looksLikeTableBorder(next)) return true;
    break;
  }
  return false;
};

export const cleanOcrText = (raw) => {
  if (!raw) return "";

  let text = normalizeMojibake(raw);
  // Remove soft hyphenation at line breaks (e.g., "exam-\nple" -> "example").
  text = text.replace(/([A-Za-z])-\n([A-Za-z])/g, "$1$2");

  const rawLines = text.split("\n").map((line) =>
    normalizeUnicodeSpaces(line).replace(/[ \t]+$/g, "")
  );

  const output = [];
  let paragraph = "";
  let inTableBlock = false;

  const flushParagraph = () => {
    if (!paragraph) return;
    output.push(paragraph.trim());
    paragraph = "";
  };

  for (let i = 0; i < rawLines.length; i += 1) {
    const rawLine = rawLines[i];
    const line = compactLine(rawLine);
    const nextRawLine = rawLines[i + 1] || "";
    const nextLine = compactLine(nextRawLine);

    if (!line) {
      flushParagraph();
      if (output[output.length - 1] !== "") output.push("");
      inTableBlock = false;
      continue;
    }

    const tableBorder = looksLikeTableBorder(rawLine);
    const tableRow =
      looksLikeTableCandidate(rawLine) && (inTableBlock || hasNearTableNeighbor(rawLines, i));
    const heading = looksLikeHeading(line);
    const bullet = isBullet(line);

    if (tableBorder) {
      flushParagraph();
      if (output[output.length - 1] !== "") output.push("");
      inTableBlock = true;
      continue;
    }

    if (tableRow) {
      flushParagraph();
      if (!inTableBlock && output[output.length - 1] !== "") output.push("");
      output.push(normalizeTableRow(rawLine));
      inTableBlock = true;
      continue;
    }

    if (inTableBlock) {
      inTableBlock = false;
      if (output[output.length - 1] !== "") output.push("");
    }

    if (heading || bullet) {
      flushParagraph();

      if (bullet) {
        let combined = line;
        let j = i + 1;
        while (j < rawLines.length && shouldJoinAsContinuation(rawLines[j])) {
          combined = `${combined} ${compactLine(rawLines[j])}`;
          j += 1;
        }
        output.push(combined.trim());
        i = j - 1;
        if (j < rawLines.length && compactLine(rawLines[j])) output.push("");
        continue;
      }

      output.push(line);
      if (!nextLine || (heading && looksLikeHeading(nextLine) && !isBullet(nextLine))) {
        output.push("");
      }
      continue;
    }

    if (!paragraph) {
      paragraph = line;
    } else if (likelyLineContinuation(rawLine) || !/[.!?;:]$/.test(paragraph)) {
      paragraph = `${paragraph} ${line}`;
    } else {
      paragraph = `${paragraph} ${line}`;
    }

    if (!nextLine || looksLikeHeading(nextLine) || isBullet(nextLine) || looksLikeTableCandidate(nextRawLine) || looksLikeTableBorder(nextRawLine)) {
      flushParagraph();
      if (nextLine && (looksLikeHeading(nextLine) || isBullet(nextLine))) output.push("");
    }
  }

  flushParagraph();

  return output
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/ ?\| ?/g, TABLE_CELL_SEPARATOR)
    .trim();
};
