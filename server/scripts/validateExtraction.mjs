import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { extractTextFromPdf } from "../pdfText.js";
import { extractTextFromDocx } from "../wordDocx.js";
import { cleanOcrText } from "../ocrCleaner.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..", "..");

const cliArgs = process.argv.slice(2);
const strictMode = cliArgs.includes("--strict");
const corpusArg = cliArgs.find((arg) => !arg.startsWith("--"));
const corpusDir = path.resolve(
  projectRoot,
  corpusArg || path.join("server", "test-corpus")
);
const thresholdConfigPath = path.join(
  projectRoot,
  "server",
  "tests",
  "extraction-thresholds.json"
);

const SUPPORTED_EXTENSIONS = new Set([".txt", ".pdf", ".docx"]);
const DEFAULT_THRESHOLDS = {
  minCharsFail: 30,
  minCharsWarn: 80,
  maxSingleWordLineRatioFail: 0.45,
  maxSingleWordLineRatioWarn: 0.28,
  maxShortLineRatioFail: 0.62,
  maxShortLineRatioWarn: 0.42,
  minParagraphBreaksWarn: 0,
};

const normalize = (text = "") => text.replace(/\r\n/g, "\n").trim();

const wordCount = (line) => (line.match(/[A-Za-z0-9']+/g) || []).length;

function analyzeFormatting(text) {
  const lines = normalize(text).split("\n");
  const nonEmptyLines = lines.filter((line) => line.trim().length > 0);
  const singleWordLines = nonEmptyLines.filter((line) => wordCount(line) === 1).length;
  const shortLines = nonEmptyLines.filter((line) => wordCount(line) > 0 && wordCount(line) <= 2).length;
  const numberedLines = nonEmptyLines.filter((line) => /^\s*\d+[\.\)]\s+/.test(line)).length;
  const bulletLines = nonEmptyLines.filter((line) => /^\s*[-*•]\s+/.test(line)).length;
  const tableRows = nonEmptyLines.filter((line) => /\s\|\s/.test(line)).length;
  const headingLikeLines = nonEmptyLines.filter((line) => {
    const trimmed = line.trim();
    return trimmed.length <= 80 && /^[A-Z][A-Z0-9\s\-:&()/.]+$/.test(trimmed);
  }).length;
  const paragraphBreaks = lines.filter((line) => !line.trim()).length;

  const nonEmptyCount = nonEmptyLines.length || 1;
  return {
    chars: normalize(text).length,
    lines: lines.length,
    nonEmptyLines: nonEmptyLines.length,
    paragraphBreaks,
    numberedLines,
    bulletLines,
    tableRows,
    headingLikeLines,
    singleWordLineRatio: singleWordLines / nonEmptyCount,
    shortLineRatio: shortLines / nonEmptyCount,
  };
}

async function readExpectations(filePath) {
  const expectPath = `${filePath}.expect.json`;
  try {
    const data = await fs.readFile(expectPath, "utf8");
    return JSON.parse(data);
  } catch (_error) {
    return null;
  }
}

async function readGlobalThresholds() {
  try {
    const raw = await fs.readFile(thresholdConfigPath, "utf8");
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return DEFAULT_THRESHOLDS;
    return { ...DEFAULT_THRESHOLDS, ...parsed };
  } catch {
    return DEFAULT_THRESHOLDS;
  }
}

function evaluateWithExpectations(cleanedText, metrics, expectations, thresholds) {
  const failures = [];
  const warnings = [];

  if (!cleanedText) {
    failures.push("Cleaned text is empty.");
    return { failures, warnings };
  }

  if (!expectations) {
    if (metrics.chars < thresholds.minCharsFail) {
      failures.push(
        `Output too short (${metrics.chars} chars). Minimum fail threshold is ${thresholds.minCharsFail}.`
      );
    } else if (metrics.chars < thresholds.minCharsWarn) {
      warnings.push(
        `Output is short (${metrics.chars} chars). Warn threshold is ${thresholds.minCharsWarn}.`
      );
    }

    if (
      metrics.singleWordLineRatio > thresholds.maxSingleWordLineRatioFail &&
      metrics.nonEmptyLines > 12
    ) {
      failures.push(
        `Single-word line ratio ${metrics.singleWordLineRatio.toFixed(
          2
        )} exceeds fail threshold ${thresholds.maxSingleWordLineRatioFail.toFixed(2)}.`
      );
    } else if (
      metrics.singleWordLineRatio > thresholds.maxSingleWordLineRatioWarn &&
      metrics.nonEmptyLines > 12
    ) {
      warnings.push("High single-word line ratio (possible broken wrapping).");
    }

    if (metrics.shortLineRatio > thresholds.maxShortLineRatioFail && metrics.nonEmptyLines > 12) {
      failures.push(
        `Short-line ratio ${metrics.shortLineRatio.toFixed(2)} exceeds fail threshold ${thresholds.maxShortLineRatioFail.toFixed(
          2
        )}.`
      );
    } else if (metrics.shortLineRatio > thresholds.maxShortLineRatioWarn && metrics.nonEmptyLines > 12) {
      warnings.push(
        `Short-line ratio ${metrics.shortLineRatio.toFixed(2)} exceeds warn threshold ${thresholds.maxShortLineRatioWarn.toFixed(
          2
        )}.`
      );
    }

    if (metrics.paragraphBreaks <= thresholds.minParagraphBreaksWarn && metrics.lines > 12) {
      warnings.push("Very low paragraph breaks; content may be over-merged.");
    }

    return { failures, warnings };
  }

  const lower = cleanedText.toLowerCase();

  if (typeof expectations.minChars === "number" && metrics.chars < expectations.minChars) {
    failures.push(`Expected at least ${expectations.minChars} chars, got ${metrics.chars}.`);
  }

  if (
    typeof expectations.maxSingleWordLineRatio === "number" &&
    metrics.singleWordLineRatio > expectations.maxSingleWordLineRatio
  ) {
    failures.push(
      `Single-word line ratio ${metrics.singleWordLineRatio.toFixed(2)} exceeds max ${expectations.maxSingleWordLineRatio.toFixed(
        2
      )}.`
    );
  }

  if (typeof expectations.minNumberedLines === "number" && metrics.numberedLines < expectations.minNumberedLines) {
    failures.push(
      `Expected at least ${expectations.minNumberedLines} numbered lines, got ${metrics.numberedLines}.`
    );
  }

  if (typeof expectations.minBulletLines === "number" && metrics.bulletLines < expectations.minBulletLines) {
    failures.push(
      `Expected at least ${expectations.minBulletLines} bullet lines, got ${metrics.bulletLines}.`
    );
  }

  if (typeof expectations.minTableRows === "number" && metrics.tableRows < expectations.minTableRows) {
    failures.push(
      `Expected at least ${expectations.minTableRows} table rows, got ${metrics.tableRows}.`
    );
  }

  if (Array.isArray(expectations.requiredContains)) {
    for (const token of expectations.requiredContains) {
      if (!lower.includes(String(token).toLowerCase())) {
        failures.push(`Missing expected text: "${token}".`);
      }
    }
  }

  if (Array.isArray(expectations.requiredRegex)) {
    for (const pattern of expectations.requiredRegex) {
      const regex = new RegExp(pattern, "m");
      if (!regex.test(cleanedText)) {
        failures.push(`Missing expected regex match: /${pattern}/.`);
      }
    }
  }

  if (Array.isArray(expectations.warnIfMissing)) {
    for (const token of expectations.warnIfMissing) {
      if (!lower.includes(String(token).toLowerCase())) {
        warnings.push(`Missing optional text: "${token}".`);
      }
    }
  }

  return { failures, warnings };
}

async function collectFilesRecursively(baseDir) {
  const entries = await fs.readdir(baseDir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const fullPath = path.join(baseDir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await collectFilesRecursively(fullPath)));
      continue;
    }
    const ext = path.extname(entry.name).toLowerCase();
    if (SUPPORTED_EXTENSIONS.has(ext)) files.push(fullPath);
  }
  return files.sort();
}

async function extractRawText(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === ".txt") {
    return fs.readFile(filePath, "utf8");
  }
  const buffer = await fs.readFile(filePath);
  if (ext === ".pdf") {
    return extractTextFromPdf(buffer);
  }
  if (ext === ".docx") {
    return extractTextFromDocx(buffer);
  }
  throw new Error(`Unsupported extension: ${ext}`);
}

function statusEmoji(status) {
  if (status === "PASS") return "PASS";
  if (status === "WARN") return "WARN";
  return "FAIL";
}

async function main() {
  try {
    await fs.access(corpusDir);
  } catch (_error) {
    console.error(`Corpus folder not found: ${corpusDir}`);
    console.error("Create it and add .txt/.pdf/.docx files, then rerun.");
    process.exit(1);
  }

  const files = await collectFilesRecursively(corpusDir);
  if (!files.length) {
    console.error(`No .txt/.pdf/.docx files found in: ${corpusDir}`);
    process.exit(1);
  }

  const thresholds = await readGlobalThresholds();

  const reportLines = [];
  reportLines.push(`# Extraction Test Report`);
  reportLines.push(`Corpus: ${corpusDir}`);
  reportLines.push(`Files tested: ${files.length}`);
  reportLines.push(`Strict mode: ${strictMode ? "ON" : "OFF"}`);
  reportLines.push(`Threshold config: ${thresholdConfigPath}`);
  reportLines.push("");

  let failCount = 0;
  let warnCount = 0;

  for (const filePath of files) {
    const relativePath = path.relative(projectRoot, filePath).replaceAll("\\", "/");
    try {
      const rawText = await extractRawText(filePath);
      const cleanedText = cleanOcrText(rawText);
      const metrics = analyzeFormatting(cleanedText);
      const expectations = await readExpectations(filePath);
      const { failures, warnings } = evaluateWithExpectations(
        cleanedText,
        metrics,
        expectations,
        thresholds
      );

      const status = failures.length ? "FAIL" : warnings.length ? "WARN" : "PASS";
      if (status === "FAIL") failCount += 1;
      if (status === "WARN") warnCount += 1;

      reportLines.push(`## ${statusEmoji(status)} ${relativePath}`);
      reportLines.push(`- Chars: ${metrics.chars}`);
      reportLines.push(`- Lines: ${metrics.lines} (non-empty: ${metrics.nonEmptyLines})`);
      reportLines.push(`- Numbered lines: ${metrics.numberedLines}`);
      reportLines.push(`- Bullet lines: ${metrics.bulletLines}`);
      reportLines.push(`- Table rows: ${metrics.tableRows}`);
      reportLines.push(`- Paragraph breaks: ${metrics.paragraphBreaks}`);
      reportLines.push(`- Single-word line ratio: ${metrics.singleWordLineRatio.toFixed(2)}`);
      reportLines.push(`- Short-line ratio: ${metrics.shortLineRatio.toFixed(2)}`);

      if (failures.length) {
        reportLines.push(`- Failures:`);
        for (const failure of failures) reportLines.push(`  - ${failure}`);
      }
      if (warnings.length) {
        reportLines.push(`- Warnings:`);
        for (const warning of warnings) reportLines.push(`  - ${warning}`);
      }
      reportLines.push("");
    } catch (error) {
      failCount += 1;
      reportLines.push(`## FAIL ${relativePath}`);
      reportLines.push(`- Error: ${error.message}`);
      reportLines.push("");
    }
  }

  const reportPath = path.join(projectRoot, "server", "tests", "last-extraction-report.md");
  await fs.mkdir(path.dirname(reportPath), { recursive: true });
  await fs.writeFile(reportPath, `${reportLines.join("\n")}\n`, "utf8");

  console.log(reportLines.join("\n"));
  console.log(`Saved report: ${reportPath}`);
  const effectiveFailCount = strictMode ? failCount + warnCount : failCount;
  console.log(
    `Summary: ${files.length} files, ${failCount} fail, ${warnCount} warn${strictMode ? " (warnings count as fail in strict mode)" : ""}`
  );

  process.exit(effectiveFailCount ? 1 : 0);
}

main();
