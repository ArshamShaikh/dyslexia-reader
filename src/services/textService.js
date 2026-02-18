
import AsyncStorage from "@react-native-async-storage/async-storage";
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
const WORD_DEFINITION_CACHE_KEY = "wordDefinitionCache:v1";
const WORD_DEFINITION_CACHE_LIMIT = 500;
let wordDefinitionCache = null;
let wordDefinitionCacheLoadPromise = null;

const isVowel = (char) => VOWELS.has(String(char || "").toLowerCase());
const toCleanWord = (word) =>
  String(word || "")
    .replace(/[^a-zA-Z]/g, "")
    .toLowerCase();

const loadWordDefinitionCache = async () => {
  if (wordDefinitionCache) return wordDefinitionCache;
  if (wordDefinitionCacheLoadPromise) return wordDefinitionCacheLoadPromise;
  wordDefinitionCacheLoadPromise = AsyncStorage.getItem(WORD_DEFINITION_CACHE_KEY)
    .then((raw) => {
      const parsed = raw ? JSON.parse(raw) : {};
      wordDefinitionCache = parsed && typeof parsed === "object" ? parsed : {};
      return wordDefinitionCache;
    })
    .catch(() => {
      wordDefinitionCache = {};
      return wordDefinitionCache;
    })
    .finally(() => {
      wordDefinitionCacheLoadPromise = null;
    });
  return wordDefinitionCacheLoadPromise;
};

const trimWordDefinitionCache = (cache) => {
  const entries = Object.entries(cache || {});
  if (entries.length <= WORD_DEFINITION_CACHE_LIMIT) return cache;
  const sorted = entries.sort(
    (a, b) => Number(b[1]?.updatedAt || 0) - Number(a[1]?.updatedAt || 0)
  );
  return Object.fromEntries(sorted.slice(0, WORD_DEFINITION_CACHE_LIMIT));
};

const persistWordDefinitionCache = async (cache) => {
  const trimmed = trimWordDefinitionCache(cache || {});
  wordDefinitionCache = trimmed;
  try {
    await AsyncStorage.setItem(WORD_DEFINITION_CACHE_KEY, JSON.stringify(trimmed));
  } catch {
    // Ignore storage failures; in-memory cache still helps current session.
  }
};

const parseDefinitionPayload = (entry) => {
  const meaning = entry?.meanings?.[0];
  const definition = meaning?.definitions?.[0]?.definition;
  const phonetic =
    entry?.phonetic || (entry?.phonetics || []).find((item) => item?.text)?.text;
  if (!definition) return null;
  return {
    word: String(entry?.word || ""),
    phonetic: phonetic ? String(phonetic) : undefined,
    partOfSpeech: meaning?.partOfSpeech ? String(meaning.partOfSpeech) : undefined,
    definition: String(definition),
  };
};

const toWikipediaTitle = (word) =>
  String(word || "")
    .replace(/[^a-zA-Z\s'-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const trimDefinitionText = (value, maxLength = 280) => {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  if (!text) return "";
  if (text.length <= maxLength) return text;
  const clipped = text.slice(0, maxLength);
  const sentenceStop = Math.max(clipped.lastIndexOf(". "), clipped.lastIndexOf("; "));
  if (sentenceStop > 80) {
    return clipped.slice(0, sentenceStop + 1).trim();
  }
  return `${clipped.trimEnd()}...`;
};

const parseWikipediaSummary = (payload, fallbackWord) => {
  if (!payload || typeof payload !== "object") return null;
  if (payload.type === "disambiguation") return null;

  const definition = trimDefinitionText(payload.extract);
  if (!definition) return null;

  const description = String(payload.description || "").trim();
  return {
    word: String(payload.title || fallbackWord || ""),
    partOfSpeech: description || "reference",
    definition,
  };
};

const getCachedDefinition = (cache, cleanWord) => {
  const cached = cache?.[cleanWord];
  if (!cached?.definition) return null;
  const { updatedAt: _updatedAt, ...cachedPayload } = cached;
  return { ...cachedPayload, source: "offline-cache" };
};

const fetchWikipediaDefinition = async (word) => {
  const title = toWikipediaTitle(word);
  if (!title) return null;

  const controller =
    typeof AbortController !== "undefined" ? new AbortController() : null;
  const timeoutId = setTimeout(() => controller?.abort?.(), 5000);

  try {
    const response = await fetch(
      `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`,
      controller ? { signal: controller.signal } : undefined
    );
    if (!response.ok) return null;
    const payload = await response.json();
    return parseWikipediaSummary(payload, title);
  } catch (error) {
    if (!isLikelyOfflineLookupError(error)) {
      console.warn("Wikipedia summary lookup failed", error);
    }
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
};

const isLikelyOfflineLookupError = (error) => {
  const message = String(error?.message || "").toLowerCase();
  return (
    error?.name === "AbortError" ||
    message.includes("network request failed") ||
    message.includes("failed to fetch") ||
    message.includes("load failed") ||
    message.includes("timeout")
  );
};

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
  const cleanWord = toCleanWord(word);
  if (!cleanWord) return null;
  const cache = await loadWordDefinitionCache();
  const controller =
    typeof AbortController !== "undefined" ? new AbortController() : null;
  const timeoutId = setTimeout(() => controller?.abort?.(), 6000);

  try {
    const response = await fetch(
      `https://api.dictionaryapi.dev/api/v2/entries/en/${cleanWord}`,
      controller ? { signal: controller.signal } : undefined
    );
    if (response.ok) {
      const data = await response.json();
      if (Array.isArray(data) && data.length > 0) {
        const parsed = parseDefinitionPayload(data[0]);
        if (parsed) {
          const nextCache = {
            ...cache,
            [cleanWord]: { ...parsed, updatedAt: Date.now() },
          };
          await persistWordDefinitionCache(nextCache);
          return { ...parsed, source: "dictionaryapi.dev" };
        }
      }
    }

    // Fallback for names/places and other proper nouns not covered by dictionary API.
    const wikiDefinition = await fetchWikipediaDefinition(word);
    if (wikiDefinition) {
      const nextCache = {
        ...cache,
        [cleanWord]: { ...wikiDefinition, updatedAt: Date.now() },
      };
      await persistWordDefinitionCache(nextCache);
      return { ...wikiDefinition, source: "wikipedia" };
    }

    return getCachedDefinition(cache, cleanWord);
  } catch (error) {
    const isOfflineError = isLikelyOfflineLookupError(error);
    if (!isOfflineError) {
      console.warn("Dictionary lookup failed", error);
    }
    const cached = getCachedDefinition(cache, cleanWord);
    if (cached) return cached;
    if (isOfflineError) {
      return { unavailableReason: "offline" };
    }
    return null;
  } finally {
    clearTimeout(timeoutId);
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
