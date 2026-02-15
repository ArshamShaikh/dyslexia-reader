
import Hypher from "hypher";
import englishUs from "hyphenation.en-us";

/**
 * Service to handle text analysis features: value lookup, syllable breakdown, etc.
 */

const VOWELS = new Set(["a", "e", "i", "o", "u", "y"]);
const KNOWN_ONSETS = new Set([
  "bl", "br", "ch", "cl", "cr", "dr", "fl", "fr", "gh", "gl", "gr", "ph",
  "pl", "pr", "qu", "sc", "sh", "sk", "sl", "sm", "sn", "sp", "st", "sw",
  "th", "tr", "tw", "wh", "wr",
  "sch", "scr", "shr", "skw", "spl", "spr", "squ", "str", "thr",
]);

const hypher = new Hypher(englishUs);

const isVowel = (char) => VOWELS.has(String(char || "").toLowerCase());

const splitByCoreHeuristic = (word) => {
  const parts = [];
  let cursor = 0;
  const n = word.length;

  // Collect vowel nuclei ranges.
  const nuclei = [];
  while (cursor < n) {
    if (!isVowel(word[cursor])) {
      cursor += 1;
      continue;
    }
    const start = cursor;
    while (cursor + 1 < n && isVowel(word[cursor + 1])) {
      cursor += 1;
    }
    nuclei.push([start, cursor]);
    cursor += 1;
  }

  if (!nuclei.length) return [word];
  if (nuclei.length === 1) return [word];

  let syllableStart = 0;
  for (let i = 0; i < nuclei.length - 1; i += 1) {
    const [, currentEnd] = nuclei[i];
    const [nextStart] = nuclei[i + 1];
    const clusterStart = currentEnd + 1;
    const clusterEnd = nextStart - 1;
    const cluster = word.slice(clusterStart, clusterEnd + 1);

    let splitIndex = nextStart;
    if (cluster.length === 0) {
      // Hiatus (e.g., "di-al"), split right before next vowel nucleus.
      splitIndex = nextStart;
    } else if (cluster.length === 1) {
      // V-CV pattern by default.
      splitIndex = clusterStart;
    } else {
      // Keep the largest legal onset on the right side.
      let onsetLen = 1;
      const lowerCluster = cluster.toLowerCase();
      for (const len of [3, 2, 1]) {
        if (len > lowerCluster.length) continue;
        const suffix = lowerCluster.slice(lowerCluster.length - len);
        if (KNOWN_ONSETS.has(suffix)) {
          onsetLen = len;
          break;
        }
      }
      splitIndex = clusterStart + (cluster.length - onsetLen);
    }

    // Avoid zero-width or backward splits.
    if (splitIndex <= syllableStart || splitIndex > n) continue;
    const segment = word.slice(syllableStart, splitIndex);
    if (segment) parts.push(segment);
    syllableStart = splitIndex;
  }

  const tail = word.slice(syllableStart);
  if (tail) parts.push(tail);

  // Light post-fix: merge tiny trailing fragments when they look broken.
  if (parts.length >= 2) {
    const last = parts[parts.length - 1];
    const prev = parts[parts.length - 2];
    if (last.length === 1 && !isVowel(last) && /[aeiouy]/i.test(prev)) {
      parts[parts.length - 2] = `${prev}${last}`;
      parts.pop();
    }
  }

  return parts.length ? parts : [word];
};


export const getWordDefinition = async (word) => {
  try {
    const cleanWord = word.replace(/[^a-zA-Z]/g, "");
    if (!cleanWord) return null;

    const response = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${cleanWord}`);
    if (!response.ok) {
      return null;
    }
    const data = await response.json();
    if (Array.isArray(data) && data.length > 0) {
      const entry = data[0];
      const meaning = entry.meanings[0];
      const definition = meaning?.definitions[0]?.definition;
      const phonetic = entry.phonetic || (entry.phonetics.find((p) => p.text)?.text);

      return {
        word: entry.word,
        phonetic,
        partOfSpeech: meaning?.partOfSpeech,
        definition,
        source: "dictionaryapi.dev",
      };
    }
    return null;
  } catch (error) {
    console.warn("Dictionary lookup failed", error);
    return null;
  }
};

export const getSyllableBreakdown = (word) => {
  const clean = String(word || "").replace(/[^a-zA-Z]/g, "");
  if (!clean) return [];
  if (clean.length <= 3) return [clean];

  // Primary: language-pattern hyphenation (domain-agnostic across vocabulary).
  // This generally produces better syllable-like chunks than simple heuristics.
  try {
    const hyphenated = hypher.hyphenate(clean);
    if (Array.isArray(hyphenated) && hyphenated.length > 1) {
      return hyphenated;
    }
  } catch {
    // Fall through to heuristic.
  }

  const parts = splitByCoreHeuristic(clean);
  if (parts.length <= 1) return [clean];
  return parts;
};
