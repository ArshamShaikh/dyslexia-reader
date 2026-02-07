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

const speakNext = (speed) => {
  if (currentIndex >= queue.length) {
    isSpeaking = false;
    return;
  }
  const chunk = queue[currentIndex];
  currentIndex += 1;
  Speech.speak(chunk, {
    rate: speed,
    pitch: 1.0,
    language: "en",
    onDone: () => speakNext(speed),
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
  // Android native TTS runs faster at 1.0; slow it down so 1x ~ 0.6.
  return clampRate(speed * 0.6, 0.25, 1.0);
};

export const speakText = (text, speed = 0.45, useNative = false) => {
  if (!text) return;

  stopSpeech();

  const rate = normalizeRate(speed, useNative);

  if (useNative && isNativeTtsAvailable) {
    isSpeaking = true;
    NativeTts.speak(text, rate);
    return;
  }

  queue = buildChunks(text);
  currentIndex = 0;
  if (!queue.length) return;
  isSpeaking = true;
  speakNext(rate);
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
