import mammoth from "mammoth";

function decodeHtmlEntities(value = "") {
  return value
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'")
    .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(Number(dec)));
}

function stripTags(value = "") {
  return decodeHtmlEntities(value.replace(/<[^>]+>/g, ""))
    .replace(/[ \t]+/g, " ")
    .trim();
}

function htmlToReadableText(html = "") {
  let text = html;

  // Preserve numbered list markers from DOCX question papers.
  text = text.replace(/<ol\b([^>]*)>([\s\S]*?)<\/ol>/gi, (_, attrs = "", body = "") => {
    const startMatch = attrs.match(/\bstart\s*=\s*["']?(\d+)["']?/i);
    let number = startMatch ? Number(startMatch[1]) : 1;
    const items = [...body.matchAll(/<li\b[^>]*>([\s\S]*?)<\/li>/gi)];
    if (!items.length) return "";
    const lines = items.map((match) => {
      const content = stripTags(match[1] || "");
      const line = `${number}. ${content}`;
      number += 1;
      return line;
    });
    return `\n${lines.join("\n")}\n`;
  });

  text = text.replace(/<ul\b[^>]*>([\s\S]*?)<\/ul>/gi, (_, body = "") => {
    const items = [...body.matchAll(/<li\b[^>]*>([\s\S]*?)<\/li>/gi)];
    if (!items.length) return "";
    const lines = items.map((match) => `- ${stripTags(match[1] || "")}`);
    return `\n${lines.join("\n")}\n`;
  });

  text = text
    .replace(/<\/(p|div|h[1-6]|blockquote|tr)>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<li\b[^>]*>/gi, "")
    .replace(/<\/li>/gi, "\n");

  return stripTags(text)
    .replace(/\r\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export async function extractTextFromDocx(buffer) {
  const htmlResult = await mammoth.convertToHtml({ buffer });
  const htmlText = htmlToReadableText(htmlResult?.value || "");
  if (htmlText) return htmlText;

  const fallback = await mammoth.extractRawText({ buffer });
  return fallback?.value?.trim() || "";
}
