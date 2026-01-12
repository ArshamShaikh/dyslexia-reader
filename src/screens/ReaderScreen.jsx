import { useState } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useSettings } from "../context/SettingsContext";
import { speakText, stopSpeech } from "../services/ttsService";
import { splitIntoLines } from "../utils/textParser";


export default function ReaderScreen({ route }) {
  const { text = SAMPLE_TEXT } = route.params || {};
  const lines = splitIntoLines(text);
  const [currentLineIndex, setCurrentLineIndex] = useState(-1);


  const {
    fontFamily,
    fontSize,
    lineHeight,
    backgroundTheme,
    textColor,
    readingSpeed,
  } = useSettings();

  const handlePlay = () => {
    speakText(text, readingSpeed);
    startHighlighting();
  };

  const handleStop = () => {
    stopSpeech();
    stopHighlighting();
  };

  const startHighlighting = () => {
    setCurrentLineIndex(0);

    const interval = setInterval(() => {
      setCurrentLineIndex(prev => {
        if (prev >= lines.length - 1) {
          clearInterval(interval);
          return -1;
        }
        return prev + 1;
      });
    }, 4200); // timing per line (adjustable later)
  };

  const stopHighlighting = () => {
    setCurrentLineIndex(-1);
  };


  return (
    <SafeAreaView
      style={[
        styles.container,
        { backgroundColor: getBackgroundColor(backgroundTheme) },
      ]}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {lines.map((line, index) => (
          <Text
            key={index}
            style={[
              styles.text,
              {
                fontFamily,
                fontSize,
                lineHeight: fontSize * lineHeight,
                color: textColor,
                backgroundColor:
                  index === currentLineIndex ? "#D6EAF8" : "transparent",
              },
            ]}
          >
            {line + " "}
          </Text>
        ))}

      </ScrollView>

      {/* Controls will live here later */}
      <View style={styles.controls}>
        <TouchableOpacity style={styles.button} onPress={handlePlay}>
          <Text style={styles.buttonText}>Play</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.button} onPress={handleStop}>
          <Text style={styles.buttonText}>Stop</Text>
        </TouchableOpacity>
      </View>

    </SafeAreaView>
  );
}
const getBackgroundColor = (theme) => {
  switch (theme) {
    case "dark":
      return "#121212";
    case "blue":
      return "#EAF2F8";
    case "soft":
    default:
      return "#FAFAF7";
  }
};
const SAMPLE_TEXT =
  "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.";
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 120, // space for future controls
  },
  text: {
    letterSpacing: 0.3,
  },
  controlsPlaceholder: {
    height: 80,
  },
  controls: {
    height: 90,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 20,
  },

  button: {
    backgroundColor: "#3A6EA5",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },

  buttonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },

});
