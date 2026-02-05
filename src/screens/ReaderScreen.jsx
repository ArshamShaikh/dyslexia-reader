import { useEffect, useMemo, useRef, useState } from "react";
import {
  Dimensions,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Slider from "@react-native-community/slider";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import ReaderControls from "../components/ReaderControls";
import { useSettings } from "../context/SettingsContext";
import { speakText, stopSpeech } from "../services/ttsService";
import { splitIntoLines } from "../utils/textParser";
import { THEMES } from "../theme/colors";
import { FONT_FAMILY_MAP } from "../theme/typography";
import { addSavedText } from "../services/storageService";


export default function ReaderScreen({ route, navigation }) {
  const { text = SAMPLE_TEXT } = route.params || {};
  const [currentLineIndex, setCurrentLineIndex] = useState(-1);
  const [currentWordIndex, setCurrentWordIndex] = useState(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [saveNotice, setSaveNotice] = useState("");
  const [showQuickSettings, setShowQuickSettings] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [showMoreSettings, setShowMoreSettings] = useState(false);
  const timeoutRef = useRef(null);
  const scrollViewRef = useRef(null);
  const lineOffsetsRef = useRef([]);
  const insets = useSafeAreaInsets();

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
    highlightStrength,
    readingSpeed,
    setReadingSpeed,
    setFontSize,
    setLineHeight,
    setBackgroundTheme,
    setHighlightStrength,
    setFontFamily,
    setWordSpacing,
    setLetterSpacing,
  } = useSettings();

  const theme = THEMES[backgroundTheme] || THEMES.light;
  const resolvedFontFamily = FONT_FAMILY_MAP[fontFamily];
  const isDarkBackground = theme.background === "#121212";
  const windowWidth = Dimensions.get("window").width;
  const lineHeightPx = Math.round(fontSize * lineHeight);
  const lineGap = Math.max(4, Math.round(lineHeightPx - fontSize));
  const approxCharWidth = fontSize * 0.55 + wordSpacing * 0.25 + letterSpacing * 0.6;
  const maxCharsPerLine = Math.max(
    22,
    Math.floor((windowWidth - textBoxPadding * 2 - 48) / approxCharWidth)
  );

  const lines = useMemo(() => {
    return splitIntoLines(text, maxCharsPerLine);
  }, [text, maxCharsPerLine]);

  const lineWords = useMemo(() => {
    return lines.map((line) => line.split(/\s+/).filter(Boolean));
  }, [lines]);

  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  const lineAlpha = clamp(0.08 + highlightStrength * 0.18, 0.08, 0.35);
  const wordAlpha = clamp(lineAlpha + 0.16, 0.18, 0.55);
  const lineHighlight = isDarkBackground
    ? `rgba(255, 255, 255, ${lineAlpha.toFixed(2)})`
    : `rgba(0, 0, 0, ${lineAlpha.toFixed(2)})`;
  const wordHighlight = isDarkBackground
    ? `rgba(255, 255, 255, ${wordAlpha.toFixed(2)})`
    : `rgba(0, 0, 0, ${wordAlpha.toFixed(2)})`;
  const wordTextColor = textColor;
  const stepAdjust = (value, step, min, max, direction) => {
    const next = Math.min(max, Math.max(min, value + direction * step));
    return Number(next.toFixed(2));
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    lineOffsetsRef.current = [];
    setCurrentLineIndex(-1);
    setCurrentWordIndex(-1);
  }, [text, maxCharsPerLine]);

  useEffect(() => {
    const y = lineOffsetsRef.current[currentLineIndex];
    if (scrollViewRef.current && y != null) {
      scrollViewRef.current.scrollTo({
        y: Math.max(0, y - 40),
        animated: true,
      });
    }
  }, [currentLineIndex]);

  const handlePlayPause = () => {
    if (isPlaying) {
      handlePause();
    } else {
      handlePlay();
    }
  };

  const buildRemainingText = (lineIndex, wordIndex) => {
    if (lineIndex < 0) return lines.join(" ");
    const currentLineWords = lineWords[lineIndex] || [];
    const currentSlice =
      wordIndex >= 0 ? currentLineWords.slice(wordIndex) : currentLineWords;
    const remainingLines = lines.slice(lineIndex + 1);
    return [currentSlice.join(" "), ...remainingLines].join(" ").trim();
  };

  const handlePlay = () => {
    try {
      if (!lines.length) return;
      const startLineIndex = currentLineIndex >= 0 ? currentLineIndex : 0;
      const startWordIndex = currentWordIndex >= 0 ? currentWordIndex : 0;
      setIsPlaying(true);
      setIsPaused(false);
      speakText(buildRemainingText(startLineIndex, startWordIndex), readingSpeed);
      startHighlighting(startLineIndex, startWordIndex);
    } catch (error) {
      console.error("Error during playback:", error);
      setIsPlaying(false);
    }
  };

  const handlePause = () => {
    try {
      stopSpeech();
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      setIsPlaying(false);
      setIsPaused(true);
    } catch (error) {
      console.error("Error stopping playback:", error);
    }
  };

  const handleStop = () => {
    try {
      stopSpeech();
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      setIsPlaying(false);
      setIsPaused(false);
      setCurrentLineIndex(-1);
      setCurrentWordIndex(-1);
    } catch (error) {
      console.error("Error stopping playback:", error);
    }
  };

  const handleRestart = () => {
    try {
      if (!lines.length) return;
      handleStop();
      setTimeout(() => {
        setIsPlaying(true);
        setIsPaused(false);
        speakText(lines.join(" "), readingSpeed);
        startHighlighting(0);
      }, 100);
    } catch (error) {
      console.error("Error restarting:", error);
    }
  };

  const handleBackward = () => {
    if (!lines.length) return;
    const newIndex = Math.max(0, currentLineIndex - 1);
    setCurrentLineIndex(newIndex);
    setCurrentWordIndex(-1);
    if (isPlaying) {
      stopSpeech();
      startHighlighting(newIndex, 0);
      speakText(buildRemainingText(newIndex, 0), readingSpeed);
    }
  };

  const handleForward = () => {
    if (!lines.length) return;
    const newIndex = Math.min(lines.length - 1, currentLineIndex + 1);
    setCurrentLineIndex(newIndex);
    setCurrentWordIndex(-1);
    if (isPlaying) {
      stopSpeech();
      startHighlighting(newIndex, 0);
      speakText(buildRemainingText(newIndex, 0), readingSpeed);
    }
  };

  const handleSpeedChange = (speed) => {
    setReadingSpeed(speed);
    if (isPlaying) {
      // Restart with new speed
      stopSpeech();
      stopHighlighting();
      setTimeout(() => {
        setIsPlaying(true);
        const resumeLine = currentLineIndex >= 0 ? currentLineIndex : 0;
        const resumeWord = currentWordIndex >= 0 ? currentWordIndex : 0;
        speakText(buildRemainingText(resumeLine, resumeWord), speed);
        startHighlighting(resumeLine, resumeWord);
      }, 100);
    }
  };

  const startHighlighting = (startIndex = 0, startWord = 0) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    const baseMsPerWord = 240 / readingSpeed;

    const advanceWord = (lineIndex, wordIndex) => {
      if (lineIndex >= lineWords.length) {
        setIsPlaying(false);
        setIsPaused(false);
        setCurrentLineIndex(-1);
        setCurrentWordIndex(-1);
        return;
      }

      const words = lineWords[lineIndex] || [];
      if (words.length === 0) {
        advanceWord(lineIndex + 1, 0);
        return;
      }

      setCurrentLineIndex(lineIndex);
      setCurrentWordIndex(wordIndex);

      const delay = Math.max(140, Math.round(baseMsPerWord));
      timeoutRef.current = setTimeout(() => {
        const nextWord = wordIndex + 1;
        if (nextWord >= words.length) {
          advanceWord(lineIndex + 1, 0);
        } else {
          advanceWord(lineIndex, nextWord);
        }
      }, delay);
    };

    advanceWord(startIndex, startWord);
  };

  const stopHighlighting = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setCurrentLineIndex(-1);
    setCurrentWordIndex(-1);
  };

  const handleSave = async () => {
    if (!text || !text.trim()) return;
    await addSavedText(text);
    setSaveNotice("Saved");
    setTimeout(() => setSaveNotice(""), 1200);
  };

  return (
    <SafeAreaView
      style={[
        styles.container,
        isFullScreen && styles.containerFull,
        { backgroundColor: theme.background },
      ]}
    >
      <View
        style={[
          styles.topActions,
          isFullScreen && styles.topActionsFull,
          isFullScreen && { top: insets.top + 6 },
        ]}
      >
        <TouchableOpacity
          style={[
            styles.fullScreenButton,
            {
              backgroundColor:
                theme.background === "#121212" ? "#2B2B2B" : "#1F1F1F",
            },
          ]}
          onPress={() => setIsFullScreen((prev) => !prev)}
          accessibilityLabel="Toggle full screen"
        >
          <MaterialIcons
            name={isFullScreen ? "fullscreen-exit" : "fullscreen"}
            size={18}
            color="#FFFFFF"
          />
        </TouchableOpacity>
        {!isFullScreen && (
          <>
        <TouchableOpacity
          style={[
            styles.saveButton,
            {
              backgroundColor:
                theme.background === "#121212" ? "#2B2B2B" : "#1F1F1F",
            },
          ]}
          onPress={handleSave}
          accessibilityLabel="Save text"
        >
          <MaterialIcons name="bookmark" size={18} color="#FFFFFF" />
          <Text style={styles.saveText}>Save</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.settingsButton,
            {
              backgroundColor:
                theme.background === "#121212" ? "#2B2B2B" : "#1F1F1F",
            },
          ]}
          onPress={() => setShowQuickSettings(true)}
          accessibilityLabel="Open settings"
        >
          <MaterialIcons name="settings" size={18} color="#FFFFFF" />
        </TouchableOpacity>
        {!!saveNotice && (
          <Text style={[styles.saveNotice, { color: textColor }]}>{saveNotice}</Text>
        )}
          </>
        )}
      </View>

      {/* Text Box with Internal Scrolling */}
      <View
        style={[
          styles.textContainerWrapper,
          isFullScreen && styles.textContainerWrapperFull,
          showTextBox && !isFullScreen && styles.textContainerBox,
          {
            padding: textBoxPadding,
            borderColor: theme.border,
            backgroundColor: showTextBox
              ? theme.background === "#121212"
                ? "rgba(255, 255, 255, 0.04)"
                : "rgba(255, 255, 255, 0.6)"
              : "transparent",
          },
        ]}
      >
        <ScrollView
          ref={scrollViewRef}
          style={styles.textScroll}
          contentContainerStyle={styles.innerScrollContent}
          showsVerticalScrollIndicator={true}
          scrollEnabled={true}
        >
          {lines.map((line, index) => {
            if (line === "") {
              return (
                <View
                  key={`spacer-${index}`}
                  style={[styles.paragraphSpacer, { height: Math.max(8, lineGap + 4) }]}
                />
              );
            }

            const words = lineWords[index] || [];

            return (
              <View
                key={index}
                style={[
                  styles.line,
                  {
                    backgroundColor:
                      index === currentLineIndex ? lineHighlight : "transparent",
                    paddingHorizontal: 6,
                    paddingVertical: 2,
                    borderRadius: 3,
                    marginBottom: lineGap,
                  },
                ]}
                onLayout={(event) => {
                  lineOffsetsRef.current[index] = event.nativeEvent.layout.y;
                }}
              >
                {words.map((word, wordIndex) => (
                  <Text
                    key={`${index}-${wordIndex}`}
                    style={{
                      fontFamily: resolvedFontFamily,
                      fontSize,
                      lineHeight: lineHeightPx,
                      color: textColor,
                      letterSpacing,
                      marginRight: wordIndex === words.length - 1 ? 0 : wordSpacing,
                      backgroundColor:
                        index === currentLineIndex && wordIndex === currentWordIndex
                          ? wordHighlight
                          : "transparent",
                      color:
                        index === currentLineIndex && wordIndex === currentWordIndex
                          ? wordTextColor
                          : textColor,
                      borderRadius: 3,
                      paddingHorizontal:
                        index === currentLineIndex && wordIndex === currentWordIndex ? 2 : 0,
                    }}
                  >
                    {word}
                  </Text>
                ))}
              </View>
            );
          })}
        </ScrollView>
      </View>

      {/* Controls */}
      {!isFullScreen && (
        <ReaderControls
          isPlaying={isPlaying}
          onPlayPause={handlePlayPause}
          onBackward={handleBackward}
          onForward={handleForward}
          onRestart={handleRestart}
          onStop={handleStop}
          currentSpeed={readingSpeed}
          onSpeedChange={handleSpeedChange}
          theme={theme}
          textColor={textColor}
        />
      )}

      <Modal
        visible={showQuickSettings}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowQuickSettings(false)}
      >
        <View style={[styles.quickSettingsOverlay, { backgroundColor: "transparent" }]}>
          <Pressable
            style={styles.quickSettingsBackdrop}
            onPress={() => {
              setShowQuickSettings(false);
              setShowMoreSettings(false);
            }}
          />
          <View
            style={[
              styles.quickSettingsPanel,
              {
                backgroundColor:
                  theme.background === "#121212" ? "#1C1C1C" : "#FFFFFF",
                borderColor: theme.border,
              },
            ]}
          >
            <View style={styles.quickHeader}>
              <Text style={[styles.quickTitle, { color: textColor }]}>
                Settings
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setShowQuickSettings(false);
                  setShowMoreSettings(false);
                }}
              >
                <MaterialIcons name="close" size={20} color={textColor} />
              </TouchableOpacity>
            </View>

            <View style={styles.quickTabs}>
              <TouchableOpacity
                style={[
                  styles.quickTab,
                  !showMoreSettings && { backgroundColor: textColor },
                  { borderColor: theme.border },
                ]}
                onPress={() => setShowMoreSettings(false)}
              >
                <Text
                  style={[
                    styles.quickTabText,
                    { color: !showMoreSettings ? theme.background : textColor },
                  ]}
                >
                  Quick
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.quickTab,
                  showMoreSettings && { backgroundColor: textColor },
                  { borderColor: theme.border },
                ]}
                onPress={() => setShowMoreSettings(true)}
              >
                <Text
                  style={[
                    styles.quickTabText,
                    { color: showMoreSettings ? theme.background : textColor },
                  ]}
                >
                  Advanced
                </Text>
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.quickScroll}
              contentContainerStyle={styles.quickScrollContent}
              showsVerticalScrollIndicator={true}
            >
            <View style={styles.quickRow}>
              <Text style={[styles.quickLabel, { color: textColor }]}>Theme</Text>
              <View style={styles.quickToggleRow}>
                <Text style={[styles.quickHint, { color: textColor }]}>Light</Text>
                <Switch
                  value={backgroundTheme === "dark"}
                  onValueChange={(value) =>
                    setBackgroundTheme(value ? "dark" : "light")
                  }
                  trackColor={{ false: "#BDBDBD", true: textColor }}
                  thumbColor={backgroundTheme === "dark" ? theme.background : "#F4F4F4"}
                />
                <Text style={[styles.quickHint, { color: textColor }]}>Dark</Text>
              </View>
            </View>

            {showMoreSettings && (
              <View style={styles.quickRow}>
                <Text style={[styles.quickLabel, { color: textColor }]}>Font</Text>
                <View style={styles.quickChipRow}>
                  {["Lexend", "OpenDyslexic", "System"].map((font) => {
                    const isActive = fontFamily === font;
                    return (
                      <TouchableOpacity
                        key={font}
                        style={[
                          styles.quickChip,
                          isActive && { backgroundColor: textColor },
                          { borderColor: theme.border },
                        ]}
                        onPress={() => setFontFamily(font)}
                      >
                        <Text
                          style={[
                            styles.quickChipText,
                            { color: isActive ? theme.background : textColor },
                          ]}
                        >
                          {font}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}

            <View style={styles.quickRow}>
              <View style={styles.quickRowHeader}>
                <Text style={[styles.quickLabel, { color: textColor }]}>
                  Font Size: {fontSize.toFixed(0)}
                </Text>
                <View style={styles.quickStepper}>
                  <TouchableOpacity
                    style={styles.quickStepButton}
                    onPress={() => setFontSize((v) => stepAdjust(v, 1, 14, 26, -1))}
                  >
                    <Text style={[styles.quickStepText, { color: textColor }]}>-</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.quickStepButton}
                    onPress={() => setFontSize((v) => stepAdjust(v, 1, 14, 26, 1))}
                  >
                    <Text style={[styles.quickStepText, { color: textColor }]}>+</Text>
                  </TouchableOpacity>
                </View>
              </View>
              <Slider
                minimumValue={14}
                maximumValue={26}
                step={1}
                value={fontSize}
                onValueChange={(value) => setFontSize(value)}
                minimumTrackTintColor={textColor}
                maximumTrackTintColor={theme.border}
                thumbTintColor={textColor}
              />
            </View>

            <View style={styles.quickRow}>
              <View style={styles.quickRowHeader}>
                <Text style={[styles.quickLabel, { color: textColor }]}>
                  Line Spacing: {lineHeight.toFixed(2)}
                </Text>
                <View style={styles.quickStepper}>
                  <TouchableOpacity
                    style={styles.quickStepButton}
                    onPress={() =>
                      setLineHeight((v) => stepAdjust(v, 0.05, 1.2, 2.0, -1))
                    }
                  >
                    <Text style={[styles.quickStepText, { color: textColor }]}>-</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.quickStepButton}
                    onPress={() =>
                      setLineHeight((v) => stepAdjust(v, 0.05, 1.2, 2.0, 1))
                    }
                  >
                    <Text style={[styles.quickStepText, { color: textColor }]}>+</Text>
                  </TouchableOpacity>
                </View>
              </View>
              <Slider
                minimumValue={1.2}
                maximumValue={2.0}
                step={0.05}
                value={lineHeight}
                onValueChange={(value) => setLineHeight(Number(value.toFixed(2)))}
                minimumTrackTintColor={textColor}
                maximumTrackTintColor={theme.border}
                thumbTintColor={textColor}
              />
            </View>

            {showMoreSettings && (
              <>
            {showMoreSettings && (
              <View style={styles.quickRow}>
                <View style={styles.quickRowHeader}>
                  <Text style={[styles.quickLabel, { color: textColor }]}>
                    Word Spacing: {wordSpacing.toFixed(0)}pt
                  </Text>
                  <View style={styles.quickStepper}>
                    <TouchableOpacity
                      style={styles.quickStepButton}
                      onPress={() => setWordSpacing((v) => stepAdjust(v, 1, 2, 12, -1))}
                    >
                      <Text style={[styles.quickStepText, { color: textColor }]}>-</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.quickStepButton}
                      onPress={() => setWordSpacing((v) => stepAdjust(v, 1, 2, 12, 1))}
                    >
                      <Text style={[styles.quickStepText, { color: textColor }]}>+</Text>
                    </TouchableOpacity>
                  </View>
                </View>
                <Slider
                  minimumValue={2}
                  maximumValue={12}
                  step={1}
                  value={wordSpacing}
                  onValueChange={(value) => setWordSpacing(value)}
                  minimumTrackTintColor={textColor}
                  maximumTrackTintColor={theme.border}
                  thumbTintColor={textColor}
                />
              </View>
            )}

            {showMoreSettings && (
              <View style={styles.quickRow}>
                <View style={styles.quickRowHeader}>
                  <Text style={[styles.quickLabel, { color: textColor }]}>
                    Letter Spacing: {letterSpacing.toFixed(2)}
                  </Text>
                  <View style={styles.quickStepper}>
                    <TouchableOpacity
                      style={styles.quickStepButton}
                      onPress={() =>
                        setLetterSpacing((v) => stepAdjust(v, 0.05, 0.1, 1.0, -1))
                      }
                    >
                      <Text style={[styles.quickStepText, { color: textColor }]}>-</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.quickStepButton}
                      onPress={() =>
                        setLetterSpacing((v) => stepAdjust(v, 0.05, 0.1, 1.0, 1))
                      }
                    >
                      <Text style={[styles.quickStepText, { color: textColor }]}>+</Text>
                    </TouchableOpacity>
                  </View>
                </View>
                <Slider
                  minimumValue={0.1}
                  maximumValue={1.0}
                  step={0.05}
                  value={letterSpacing}
                  onValueChange={(value) => setLetterSpacing(Number(value.toFixed(2)))}
                  minimumTrackTintColor={textColor}
                  maximumTrackTintColor={theme.border}
                  thumbTintColor={textColor}
                />
              </View>
            )}

            {!showMoreSettings && (
              <View style={styles.quickRow}>
                <View style={styles.quickRowHeader}>
                  <Text style={[styles.quickLabel, { color: textColor }]}>
                    Highlight Strength: {Math.round(highlightStrength * 100)}%
                  </Text>
                  <View style={styles.quickStepper}>
                    <TouchableOpacity
                      style={styles.quickStepButton}
                      onPress={() =>
                        setHighlightStrength((v) => stepAdjust(v, 0.1, 0.2, 1.0, -1))
                      }
                    >
                      <Text style={[styles.quickStepText, { color: textColor }]}>-</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.quickStepButton}
                      onPress={() =>
                        setHighlightStrength((v) => stepAdjust(v, 0.1, 0.2, 1.0, 1))
                      }
                    >
                      <Text style={[styles.quickStepText, { color: textColor }]}>+</Text>
                    </TouchableOpacity>
                  </View>
                </View>
                <Slider
                  minimumValue={0.2}
                  maximumValue={1.0}
                  step={0.1}
                  value={highlightStrength}
                  onValueChange={(value) => setHighlightStrength(Number(value.toFixed(2)))}
                  minimumTrackTintColor={textColor}
                  maximumTrackTintColor={theme.border}
                  thumbTintColor={textColor}
                />
              </View>
            )}
              </>
            )}

            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
const SAMPLE_TEXT =
  "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.";
const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "space-between",
    flexDirection: "column",
  },
  containerFull: {
    justifyContent: "flex-start",
  },
  innerScrollContent: {
    paddingBottom: 120,
    flexGrow: 1,
  },
  textScroll: {
    flex: 1,
    minHeight: 0,
  },
  topActions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    paddingHorizontal: 16,
    paddingTop: 8,
    gap: 8,
  },
  topActionsFull: {
    position: "absolute",
    top: 8,
    right: 16,
    zIndex: 2,
  },
  fullScreenButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  saveButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#1F1F1F",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  saveText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "600",
  },
  saveNotice: {
    marginLeft: 12,
    color: "#1F1F1F",
    fontSize: 12,
    fontWeight: "600",
  },
  settingsButton: {
    marginLeft: 8,
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  quickSettingsOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    justifyContent: "flex-end",
  },
  quickSettingsBackdrop: {
    flex: 1,
  },
  quickSettingsPanel: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 16,
    gap: 12,
    borderWidth: 1,
  },
  quickTabs: {
    flexDirection: "row",
    gap: 8,
  },
  quickTab: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  quickTabText: {
    fontSize: 12,
    fontWeight: "700",
  },
  quickHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  quickTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  quickRow: {
    gap: 6,
  },
  quickRowHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  quickLabel: {
    fontSize: 13,
    fontWeight: "600",
  },
  quickToggleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  quickHint: {
    fontSize: 11,
    fontWeight: "600",
  },
  quickChipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  quickChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  quickChipText: {
    fontSize: 12,
    fontWeight: "600",
  },
  quickStepper: {
    flexDirection: "row",
    gap: 6,
  },
  quickStepButton: {
    width: 28,
    height: 28,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#BDBDBD",
    alignItems: "center",
    justifyContent: "center",
  },
  quickStepText: {
    fontSize: 16,
    fontWeight: "700",
  },
  textContainerWrapper: {
    flex: 1,
    marginHorizontal: 16,
    marginTop: 20,
    marginBottom: 16,
    overflow: "visible",
    minHeight: 0,
  },
  textContainerWrapperFull: {
    flex: 1,
    marginHorizontal: 0,
    marginTop: 0,
    marginBottom: 0,
    borderRadius: 0,
    width: "100%",
    alignSelf: "stretch",
    minHeight: 0,
    paddingTop: 48,
    overflow: "visible",
  },
  textContainerBox: {
    borderWidth: 2,
    borderRadius: 10,
  },
  line: {
    flexDirection: "row",
    alignItems: "center",
  },
  paragraphSpacer: {
    height: 8,
  },
});
