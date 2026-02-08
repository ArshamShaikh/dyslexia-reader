// SettingsScreen.jsx
import Slider from "@react-native-community/slider";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useSettings } from "../context/SettingsContext";
import { THEMES } from "../theme/colors";


export default function SettingsScreen() {
  const {
    fontSize,
    setFontSize,
    lineHeight,
    setLineHeight,
    wordSpacing,
    setWordSpacing,
    letterSpacing,
    setLetterSpacing,
    textBoxPadding,
    setTextBoxPadding,
    readingSpeed,
    setReadingSpeed,
    backgroundTheme,
    setBackgroundTheme,
    highlightStrength,
    setHighlightStrength,
    fontFamily,
    setFontFamily,
  } = useSettings();
  const theme = THEMES[backgroundTheme] || THEMES.light;
  const isDark = backgroundTheme === "dark";

  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  const roundToStep = (value, step) => Math.round(value / step) * step;
  const stepAdjust = (value, step, min, max, direction) => {
    const next = roundToStep(value + direction * step, step);
    return clamp(Number(next.toFixed(2)), min, max);
  };
  const stepperButtonStyle = () => ({
    borderColor: theme.border,
    backgroundColor: isDark ? "#1C1C1C" : "#FFFFFF",
  });
  const stepperTextStyle = () => ({
    color: isDark ? "#F2F2F2" : "#1F1F1F",
  });

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={[styles.title, { color: theme.text }]}>Reading Settings</Text>

        {/* Theme Toggle */}
        <View
          style={[
            styles.settingBlock,
            {
              backgroundColor: isDark ? "#1C1C1C" : "#FFFFFF",
              borderColor: theme.border,
            },
          ]}
        >
          <Text style={[styles.label, { color: theme.text }]}>Theme</Text>
          <View style={styles.optionRow}>
            {["light", "dark"].map((themeKey) => {
              const isActive = backgroundTheme === themeKey;
              return (
                <TouchableOpacity
                  key={themeKey}
                  style={[
                    styles.optionButton,
                    isActive && { backgroundColor: theme.text },
                    { borderColor: theme.border },
                  ]}
                  onPress={() => {
                    setBackgroundTheme(themeKey);
                  }}
                  accessibilityLabel={`Theme ${themeKey}`}
                >
                  <Text
                    style={[
                      styles.optionText,
                      { color: isActive ? theme.background : theme.text },
                    ]}
                  >
                    {themeKey === "light" ? "Light" : "Dark"}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

      {/* Highlight Strength */}
      <View
        style={[
          styles.settingBlock,
          {
            backgroundColor: isDark ? "#1C1C1C" : "#FFFFFF",
            borderColor: theme.border,
          },
        ]}
      >
        <View style={styles.rowHeader}>
          <Text style={[styles.label, { color: theme.text }]}>
            Highlight Strength: {Math.round(highlightStrength * 100)}%
          </Text>
        </View>
        <View style={styles.sliderRow}>
          <Slider
            style={styles.slider}
            minimumValue={0.2}
            maximumValue={1.0}
            step={0.1}
            value={highlightStrength}
            onValueChange={(value) => setHighlightStrength(Number(value.toFixed(2)))}
            minimumTrackTintColor={theme.text}
            maximumTrackTintColor={theme.border}
            thumbTintColor={theme.text}
          />
          <View style={styles.stepperInline}>
            <TouchableOpacity
              style={[styles.stepperButton, stepperButtonStyle()]}
              onPress={() =>
                setHighlightStrength((prev) => stepAdjust(prev, 0.1, 0.2, 1.0, -1))
              }
              accessibilityLabel="Decrease highlight strength"
            >
              <Text style={[styles.stepperText, stepperTextStyle()]}>
                -
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.stepperButton, stepperButtonStyle()]}
              onPress={() =>
                setHighlightStrength((prev) => stepAdjust(prev, 0.1, 0.2, 1.0, 1))
              }
              accessibilityLabel="Increase highlight strength"
            >
              <Text style={[styles.stepperText, stepperTextStyle()]}>
                +
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Font Size */}
      <View
        style={[
          styles.settingBlock,
          {
            backgroundColor: isDark ? "#1C1C1C" : "#FFFFFF",
            borderColor: theme.border,
          },
        ]}
        >
        <View style={styles.rowHeader}>
          <Text style={[styles.label, { color: theme.text }]}>
            Font Size: {fontSize.toFixed(0)}
          </Text>
        </View>
        <View style={styles.sliderRow}>
          <Slider
            style={styles.slider}
            minimumValue={14}
            maximumValue={26}
            step={1}
            value={fontSize}
            onValueChange={(value) => setFontSize(value)}
            minimumTrackTintColor={theme.text}
            maximumTrackTintColor={theme.border}
            thumbTintColor={theme.text}
          />
          <View style={styles.stepperInline}>
            <TouchableOpacity
              style={[styles.stepperButton, stepperButtonStyle()]}
              onPress={() =>
                setFontSize((prev) => stepAdjust(prev, 1, 14, 26, -1))
              }
              accessibilityLabel="Decrease font size"
            >
              <Text style={[styles.stepperText, stepperTextStyle()]}>-</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.stepperButton, stepperButtonStyle()]}
              onPress={() =>
                setFontSize((prev) => stepAdjust(prev, 1, 14, 26, 1))
              }
              accessibilityLabel="Increase font size"
            >
              <Text style={[styles.stepperText, stepperTextStyle()]}>+</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Font Family */}
      <View
        style={[
          styles.settingBlock,
          {
            backgroundColor: isDark ? "#1C1C1C" : "#FFFFFF",
            borderColor: theme.border,
          },
        ]}
      >
        <Text style={[styles.label, { color: theme.text }]}>Font</Text>
        <View style={styles.optionRow}>
          {["Lexend", "OpenDyslexic", "System"].map((font) => (
            <TouchableOpacity
              key={font}
              style={[
                styles.optionButton,
                fontFamily === font && { backgroundColor: theme.text },
                { borderColor: theme.border },
              ]}
              onPress={() => setFontFamily(font)}
            >
              <Text
                style={[
                  styles.optionText,
                  {
                    color:
                      fontFamily === font ? theme.background : theme.text,
                  },
                ]}
              >
                {font}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <Text style={[styles.hintText, { color: theme.text }]}>
          Tip: If OpenDyslexic is not installed, it will fall back to System.
        </Text>
      </View>

      {/* Line Spacing */}
      <View
        style={[
          styles.settingBlock,
          {
            backgroundColor: isDark ? "#1C1C1C" : "#FFFFFF",
            borderColor: theme.border,
          },
        ]}
      >
        <View style={styles.rowHeader}>
          <Text style={[styles.label, { color: theme.text }]}>
            Line Spacing: {lineHeight.toFixed(2)}
          </Text>
        </View>
        <View style={styles.sliderRow}>
          <Slider
            style={styles.slider}
            minimumValue={1.1}
            maximumValue={2.6}
            step={0.05}
            value={lineHeight}
            onValueChange={(value) =>
              setLineHeight(Number(value.toFixed(2)))
            }
            minimumTrackTintColor={theme.text}
            maximumTrackTintColor={theme.border}
            thumbTintColor={theme.text}
          />
          <View style={styles.stepperInline}>
            <TouchableOpacity
              style={[styles.stepperButton, stepperButtonStyle()]}
              onPress={() =>
                setLineHeight((prev) => stepAdjust(prev, 0.05, 1.1, 2.6, -1))
              }
              accessibilityLabel="Decrease line spacing"
            >
              <Text style={[styles.stepperText, stepperTextStyle()]}>-</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.stepperButton, stepperButtonStyle()]}
              onPress={() =>
                setLineHeight((prev) => stepAdjust(prev, 0.05, 1.1, 2.6, 1))
              }
              accessibilityLabel="Increase line spacing"
            >
              <Text style={[styles.stepperText, stepperTextStyle()]}>+</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Word Spacing */}
      <View
        style={[
          styles.settingBlock,
          {
            backgroundColor: isDark ? "#1C1C1C" : "#FFFFFF",
            borderColor: theme.border,
          },
        ]}
      >
        <View style={styles.rowHeader}>
          <Text style={[styles.label, { color: theme.text }]}>
            Word Spacing: {wordSpacing.toFixed(0)}pt
          </Text>
        </View>
        <View style={styles.sliderRow}>
          <Slider
            style={styles.slider}
            minimumValue={0}
            maximumValue={12}
            step={1}
            value={wordSpacing}
            onValueChange={(value) => setWordSpacing(value)}
            minimumTrackTintColor={theme.text}
            maximumTrackTintColor={theme.border}
            thumbTintColor={theme.text}
          />
          <View style={styles.stepperInline}>
            <TouchableOpacity
              style={[styles.stepperButton, stepperButtonStyle()]}
              onPress={() =>
                setWordSpacing((prev) => stepAdjust(prev, 1, 0, 12, -1))
              }
              accessibilityLabel="Decrease word spacing"
            >
              <Text style={[styles.stepperText, stepperTextStyle()]}>-</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.stepperButton, stepperButtonStyle()]}
              onPress={() =>
                setWordSpacing((prev) => stepAdjust(prev, 1, 0, 12, 1))
              }
              accessibilityLabel="Increase word spacing"
            >
              <Text style={[styles.stepperText, stepperTextStyle()]}>+</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Letter Spacing */}
      <View
        style={[
          styles.settingBlock,
          {
            backgroundColor: isDark ? "#1C1C1C" : "#FFFFFF",
            borderColor: theme.border,
          },
        ]}
      >
        <View style={styles.rowHeader}>
          <Text style={[styles.label, { color: theme.text }]}>
            Letter Spacing: {letterSpacing.toFixed(2)}
          </Text>
        </View>
        <View style={styles.sliderRow}>
          <Slider
            style={styles.slider}
            minimumValue={0}
            maximumValue={1.2}
            step={0.05}
            value={letterSpacing}
            onValueChange={(value) =>
              setLetterSpacing(Number(value.toFixed(2)))
            }
            minimumTrackTintColor={theme.text}
            maximumTrackTintColor={theme.border}
            thumbTintColor={theme.text}
          />
          <View style={styles.stepperInline}>
            <TouchableOpacity
              style={[styles.stepperButton, stepperButtonStyle()]}
              onPress={() =>
                setLetterSpacing((prev) => stepAdjust(prev, 0.05, 0, 1.2, -1))
              }
              accessibilityLabel="Decrease letter spacing"
            >
              <Text style={[styles.stepperText, stepperTextStyle()]}>-</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.stepperButton, stepperButtonStyle()]}
              onPress={() =>
                setLetterSpacing((prev) => stepAdjust(prev, 0.05, 0, 1.2, 1))
              }
              accessibilityLabel="Increase letter spacing"
            >
              <Text style={[styles.stepperText, stepperTextStyle()]}>+</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Text Box Padding */}
      <View
        style={[
          styles.settingBlock,
          {
            backgroundColor: isDark ? "#1C1C1C" : "#FFFFFF",
            borderColor: theme.border,
          },
        ]}
      >
        <View style={styles.rowHeader}>
          <Text style={[styles.label, { color: theme.text }]}>
            Text Box Padding: {textBoxPadding.toFixed(0)}pt
          </Text>
        </View>
        <View style={styles.sliderRow}>
          <Slider
            style={styles.slider}
            minimumValue={6}
            maximumValue={36}
            step={1}
            value={textBoxPadding}
            onValueChange={(value) => setTextBoxPadding(value)}
            minimumTrackTintColor={theme.text}
            maximumTrackTintColor={theme.border}
            thumbTintColor={theme.text}
          />
          <View style={styles.stepperInline}>
            <TouchableOpacity
              style={[styles.stepperButton, stepperButtonStyle()]}
              onPress={() =>
                setTextBoxPadding((prev) => stepAdjust(prev, 1, 6, 36, -1))
              }
              accessibilityLabel="Decrease text box padding"
            >
              <Text style={[styles.stepperText, stepperTextStyle()]}>-</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.stepperButton, stepperButtonStyle()]}
              onPress={() =>
                setTextBoxPadding((prev) => stepAdjust(prev, 1, 6, 36, 1))
              }
              accessibilityLabel="Increase text box padding"
            >
              <Text style={[styles.stepperText, stepperTextStyle()]}>+</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Reading Speed */}
      <View
        style={[
          styles.settingBlock,
          {
            backgroundColor: isDark ? "#1C1C1C" : "#FFFFFF",
            borderColor: theme.border,
          },
        ]}
      >
        <View style={styles.rowHeader}>
          <Text style={[styles.label, { color: theme.text }]}>
            Reading Speed: {readingSpeed.toFixed(2)}x
          </Text>
        </View>
        <View style={styles.sliderRow}>
          <Slider
            style={styles.slider}
            minimumValue={0.3}
            maximumValue={2.0}
            step={0.05}
            value={readingSpeed}
            onValueChange={(value) =>
              setReadingSpeed(Number(value.toFixed(2)))
            }
            minimumTrackTintColor={theme.text}
            maximumTrackTintColor={theme.border}
            thumbTintColor={theme.text}
          />
          <View style={styles.stepperInline}>
            <TouchableOpacity
              style={[styles.stepperButton, stepperButtonStyle()]}
              onPress={() =>
                setReadingSpeed((prev) => stepAdjust(prev, 0.05, 0.3, 2.0, -1))
              }
              accessibilityLabel="Decrease reading speed"
            >
              <Text style={[styles.stepperText, stepperTextStyle()]}>-</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.stepperButton, stepperButtonStyle()]}
              onPress={() =>
                setReadingSpeed((prev) => stepAdjust(prev, 0.05, 0.3, 2.0, 1))
              }
              accessibilityLabel="Increase reading speed"
            >
              <Text style={[styles.stepperText, stepperTextStyle()]}>+</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "transparent",
    padding: 16,
  },
  scrollContent: {
    paddingBottom: 24,
  },

  title: {
    fontSize: 22,
    fontWeight: "700",
    color: "#1F1F1F",
    marginBottom: 16,
    textAlign: "center",
  },

  settingBlock: {
    backgroundColor: "#FFFFFF",
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1.5,
    borderColor: "#BDBDBD",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 3,
  },

  label: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 6,
    color: "#333",
  },
  hintText: {
    fontSize: 11,
    color: "#777",
    marginTop: 6,
  },

  toggleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  toggleControl: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  toggleLabel: {
    fontSize: 12,
    fontWeight: "700",
  },

  rowHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
  },
  sliderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  slider: {
    flex: 1,
  },
  stepperInline: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  stepperButton: {
    width: 24,
    height: 24,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: "#BDBDBD",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
  },
  stepperText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1F1F1F",
  },
  optionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  optionButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: "#BDBDBD",
  },
  optionButtonActive: {
    backgroundColor: "#1F1F1F",
  },
  optionText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#1F1F1F",
  },
  optionTextActive: {
    color: "#FFFFFF",
  },

});
