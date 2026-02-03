import { useEffect, useRef, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import ReaderControls from "../components/ReaderControls";
import { useSettings } from "../context/SettingsContext";
import { speakText, stopSpeech } from "../services/ttsService";


export default function ReaderScreen({ route }) {
  const { text = SAMPLE_TEXT } = route.params || {};
  const words = text.split(/\s+/);
  const [currentWordIndex, setCurrentWordIndex] = useState(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentSpeed, setCurrentSpeed] = useState(1.0);
  const intervalRef = useRef(null);
  const scrollViewRef = useRef(null);

  const {
    fontFamily,
    fontSize,
    lineHeight,
    wordSpacing,
    letterSpacing,
    textBoxPadding,
    showTextBox,
    backgroundTheme,
    textColor,
    readingSpeed,
  } = useSettings();

  // Cleanup interval on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  const handlePlayPause = () => {
    if (isPlaying) {
      handleStop();
    } else {
      handlePlay();
    }
  };

  const handlePlay = () => {
    try {
      setIsPlaying(true);
      speakText(text, readingSpeed);
      startHighlighting();
    } catch (error) {
      console.error("Error during playback:", error);
      setIsPlaying(false);
    }
  };

  const handleStop = () => {
    try {
      stopSpeech();
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      setIsPlaying(false);
      // Keep current word index - don't reset
    } catch (error) {
      console.error("Error stopping playback:", error);
    }
  };

  const handleRestart = () => {
    try {
      stopSpeech();
      stopHighlighting();
      setCurrentWordIndex(-1);
      setIsPlaying(false);
    } catch (error) {
      console.error("Error restarting:", error);
    }
  };

  const handleBackward = () => {
    // Go back 5 words
    const newIndex = Math.max(-1, currentWordIndex - 5);
    setCurrentWordIndex(newIndex);
  };

  const handleForward = () => {
    // Skip forward 5 words
    const newIndex = Math.min(words.length - 1, currentWordIndex + 5);
    setCurrentWordIndex(newIndex);
  };

  const handleSpeedChange = (speed) => {
    setCurrentSpeed(speed);
    if (isPlaying) {
      // Restart with new speed
      stopSpeech();
      stopHighlighting();
      setTimeout(() => {
        setIsPlaying(true);
        speakText(text, speed);
        startHighlighting();
      }, 100);
    }
  };

  const startHighlighting = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    setCurrentWordIndex(0);

    // Calculate average time per word (adjust based on speed)
    // At 1.0x speed: ~240ms per word (typical speaking pace)
    // Scales inversely with speed
    const avgTimePerWord = 240 / readingSpeed;

    intervalRef.current = setInterval(() => {
      setCurrentWordIndex(prev => {
        if (prev >= words.length - 1) {
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
          setIsPlaying(false);
          return -1;
        }
        return prev + 1;
      });
    }, avgTimePerWord);
  };

  const stopHighlighting = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setCurrentWordIndex(-1);
  };


  return (
    <SafeAreaView
      style={[
        styles.container,
        { backgroundColor: getBackgroundColor(backgroundTheme) },
      ]}
    >
      {/* Text Box with Internal Scrolling */}
      <View
        style={[
          styles.textContainerWrapper,
          showTextBox && styles.textContainerBox,
          {
            padding: textBoxPadding,
          },
        ]}
      >
        <ScrollView
          ref={scrollViewRef}
          contentContainerStyle={styles.innerScrollContent}
          showsVerticalScrollIndicator={true}
          scrollEnabled={true}
        >
          {words.map((word, index) => (
            <Text
              key={index}
              style={[
                styles.word,
                {
                  fontFamily,
                  fontSize,
                  lineHeight: fontSize * lineHeight,
                  color: textColor,
                  letterSpacing: letterSpacing,
                  marginRight: wordSpacing,
                  backgroundColor:
                    index === currentWordIndex ? "#FFD700" : "transparent",
                  paddingHorizontal: 2,
                  paddingVertical: 2,
                  borderRadius: 3,
                },
              ]}
            >
              {word}
            </Text>
          ))}
        </ScrollView>
      </View>

      {/* Controls */}
      <ReaderControls
        isPlaying={isPlaying}
        onPlayPause={handlePlayPause}
        onBackward={handleBackward}
        onForward={handleForward}
        onRestart={handleRestart}
        currentSpeed={currentSpeed}
        onSpeedChange={handleSpeedChange}
      />
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
    justifyContent: "space-between",
    flexDirection: "column",
  },
  innerScrollContent: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignContent: "flex-start",
    paddingBottom: 120,
  },
  textContainerWrapper: {
    flex: 1,
    marginHorizontal: 16,
    marginTop: 20,
    marginBottom: 16,
    overflow: "hidden",
  },
  textContainerBox: {
    borderWidth: 2,
    borderColor: "#9ECAE1",
    borderRadius: 10,
    backgroundColor: "rgba(156, 202, 225, 0.1)",
  },
  word: {
    letterSpacing: 0.3,
  },
});
