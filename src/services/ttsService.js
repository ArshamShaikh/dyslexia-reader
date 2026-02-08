import * as Speech from "expo-speech";
import { NativeEventEmitter, NativeModules } from "react-native";

const { NativeTts } = NativeModules;
export const isNativeTtsAvailable = !!NativeTts?.speak;
const hasNativeEmitterHooks =
  typeof NativeTts?.addListener === "function" &&
  typeof NativeTts?.removeListeners === "function";
export const ttsEventEmitter = isNativeTtsAvailable
  ? new NativeEventEmitter(hasNativeEmitterHooks ? NativeTts : undefined)
  : null;

let isSpeaking = false;
let queue = [];
let currentIndex = 0;

const MAX_CHUNK_CHARS = 1200;

const sanitizeText = (text) =>
  text
    .replace(/\s+/g, " ")
    .replace(/\u00A0/g, " ")
    .trim();

const splitLongSentence = (sentence) => {
  const words = sentence.split(" ");
  const chunks = [];
  let current = "";
  words.forEach((word) => {
    const next = current ? `${current} ${word}` : word;
    if (next.length > MAX_CHUNK_CHARS) {
      if (current) chunks.push(current);
      current = word;
    } else {
      current = next;
    }
  });
  if (current) chunks.push(current);
  return chunks;
};

const buildChunks = (text) => {
  const clean = sanitizeText(text);
  if (!clean) return [];
  const sentences = clean.split(/(?<=[.!?])\s+/);
  const chunks = [];
  let current = "";
  sentences.forEach((sentence) => {
    if (!sentence) return;
    const candidate = current ? `${current} ${sentence}` : sentence;
    if (candidate.length <= MAX_CHUNK_CHARS) {
      current = candidate;
      return;
    }

    if (current) {
      chunks.push(current);
      current = "";
    }

    if (sentence.length > MAX_CHUNK_CHARS) {
      chunks.push(...splitLongSentence(sentence));
    } else {
      current = sentence;
    }
  });
  if (current) chunks.push(current);
  return chunks;
};

const clampPitch = (value, min = 0.5, max = 2.0) => Math.max(min, Math.min(max, value));

const speakNext = (speed, pitch) => {
  if (currentIndex >= queue.length) {
    isSpeaking = false;
    return;
  }
  const chunk = queue[currentIndex];
  currentIndex += 1;
  Speech.speak(chunk, {
    rate: speed,
    pitch,
    language: "en",
    onDone: () => speakNext(speed, pitch),
    onStopped: () => {
      isSpeaking = false;
    },
    onError: () => {
      isSpeaking = false;
    },
  });
};

const clampRate = (value, min, max) => Math.max(min, Math.min(max, value));

const normalizeRate = (speed, useNative) => {
  if (!useNative) return speed;
  // Native mapping:
  // - Keep 1.0x near natural pace (~0.85 engine rate on this device class)
  // - Expand >1x so speed changes are clearly audible
  // - Keep slower side usable but not too slow
  if (speed >= 1) {
    const boosted = 0.85 + (speed - 1) * 1.4;
    return clampRate(boosted, 0.3, 2.0);
  }
  const slowed = 0.45 + speed * 0.4;
  return clampRate(slowed, 0.3, 2.0);
};

export const speakText = (text, speed = 0.45, useNative = false, pitch = 1.0) => {
  if (!text) return;

  stopSpeech();

  const rate = normalizeRate(speed, useNative);
  const safePitch = clampPitch(Number(pitch) || 1.0);

  if (useNative && isNativeTtsAvailable) {
    isSpeaking = true;
    try {
      NativeTts.speak(text, rate, safePitch);
    } catch {
      // Backward compatibility for older native builds exposing speak(text, rate).
      NativeTts.speak(text, rate);
    }
    return;
  }

  queue = buildChunks(text);
  currentIndex = 0;
  if (!queue.length) return;
  isSpeaking = true;
  speakNext(rate, safePitch);
};

export const stopSpeech = () => {
  if (isNativeTtsAvailable) {
    NativeTts.stop();
  }
  if (isSpeaking) {
    Speech.stop();
  }
  isSpeaking = false;
  queue = [];
  currentIndex = 0;
};

export const getNativeVoices = async () => {
  if (!isNativeTtsAvailable || typeof NativeTts?.getVoices !== "function") return [];
  try {
    const voices = await NativeTts.getVoices();
    if (!Array.isArray(voices)) return [];
    return voices;
  } catch {
    return [];
  }
};

export const setNativeVoice = (voiceName = "") => {
  if (!isNativeTtsAvailable || typeof NativeTts?.setVoice !== "function") return;
  NativeTts.setVoice(voiceName || "");
};
