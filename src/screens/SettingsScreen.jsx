// SettingsScreen.jsx
import Slider from "@react-native-community/slider";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useSettings } from "../context/SettingsContext";


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
    showTextBox,
    setShowTextBox,
    readingSpeed,
    setReadingSpeed,
    backgroundTheme,
    setBackgroundTheme,
  } = useSettings();

  return (
    <SafeAreaView style={styles.container}>

      <Text style={styles.title}>Reading Settings</Text>

      {/* Font Size */}
      <View style={styles.settingBlock}>
        <Text style={styles.label}>Font Size: {fontSize}</Text>
        <Slider
          minimumValue={14}
          maximumValue={26}
          value={fontSize}
          onValueChange={setFontSize}
          minimumTrackTintColor="#3A6EA5"
        />
      </View>

      {/* Line Spacing */}
      <View style={styles.settingBlock}>
        <Text style={styles.label}>Line Spacing: {lineHeight.toFixed(1)}</Text>
        <Slider
          minimumValue={1.2}
          maximumValue={2.0}
          value={lineHeight}
          onValueChange={setLineHeight}
          minimumTrackTintColor="#3A6EA5"
        />
      </View>

      {/* Word Spacing */}
      <View style={styles.settingBlock}>
        <Text style={styles.label}>Word Spacing: {wordSpacing}pt</Text>
        <Slider
          minimumValue={2}
          maximumValue={12}
          value={wordSpacing}
          onValueChange={setWordSpacing}
          minimumTrackTintColor="#3A6EA5"
        />
      </View>

      {/* Letter Spacing */}
      <View style={styles.settingBlock}>
        <Text style={styles.label}>Letter Spacing: {letterSpacing.toFixed(1)}</Text>
        <Slider
          minimumValue={0.1}
          maximumValue={1.0}
          value={letterSpacing}
          onValueChange={setLetterSpacing}
          minimumTrackTintColor="#3A6EA5"
        />
      </View>

      {/* Text Box Padding */}
      <View style={styles.settingBlock}>
        <Text style={styles.label}>Text Box Padding: {textBoxPadding}pt</Text>
        <Slider
          minimumValue={8}
          maximumValue={24}
          value={textBoxPadding}
          onValueChange={setTextBoxPadding}
          minimumTrackTintColor="#3A6EA5"
        />
      </View>

      {/* Show Text Box Toggle */}
      <View style={styles.settingBlock}>
        <View style={styles.toggleRow}>
          <Text style={styles.label}>Show Text Box Border</Text>
          <TouchableOpacity
            style={[
              styles.toggleButton,
              showTextBox && styles.toggleButtonActive,
            ]}
            onPress={() => setShowTextBox(!showTextBox)}
          >
            <Text style={styles.toggleText}>{showTextBox ? "ON" : "OFF"}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Reading Speed */}
      <View style={styles.settingBlock}>
        <Text style={styles.label}>Reading Speed: {readingSpeed.toFixed(2)}x</Text>
        <Slider
          minimumValue={0.3}
          maximumValue={1.0}
          value={readingSpeed}
          onValueChange={setReadingSpeed}
          minimumTrackTintColor="#3A6EA5"
        />
      </View>

      {/* Theme Selector Placeholder */}
      <View style={styles.settingBlock}>
        <Text style={styles.label}>Theme</Text>
        <View style={styles.themeRow}>
          <View style={[styles.themeBox, { backgroundColor: "#F5F7FA" }]} />
          <View style={[styles.themeBox, { backgroundColor: "#FAF3E0" }]} />
          <View style={[styles.themeBox, { backgroundColor: "#1E1E1E" }]} />
        </View>
        <Text style={styles.themeHint}>
          Theme switching enabled in future version
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F7FA",
    padding: 16,
  },

  title: {
    fontSize: 22,
    fontWeight: "700",
    color: "#3A6EA5",
    marginBottom: 16,
    textAlign: "center",
  },

  settingBlock: {
    backgroundColor: "#FFFFFF",
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },

  label: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 6,
    color: "#333",
  },

  toggleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  toggleButton: {
    backgroundColor: "#E0E0E0",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    minWidth: 50,
  },

  toggleButtonActive: {
    backgroundColor: "#3A6EA5",
  },

  toggleText: {
    fontSize: 12,
    fontWeight: "600",
    textAlign: "center",
    color: "#FFFFFF",
  },

  themeRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 5,
  },

  themeBox: {
    width: 40,
    height: 40,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#CCC",
  },

  themeHint: {
    fontSize: 12,
    color: "#777",
    marginTop: 6,
  },
});
