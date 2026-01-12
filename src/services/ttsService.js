import * as Speech from "expo-speech";

let isSpeaking = false;

export const speakText = (text, speed = 0.45) => {
  if (!text) return;

  stopSpeech(); // ensure no overlap

  isSpeaking = true;

  Speech.speak(text, {
    rate: speed,
    pitch: 1.0,
    language: "en",
    onDone: () => {
      isSpeaking = false;
    },
    onStopped: () => {
      isSpeaking = false;
    },
  });
};

export const stopSpeech = () => {
  if (isSpeaking) {
    Speech.stop();
    isSpeaking = false;
  }
};
