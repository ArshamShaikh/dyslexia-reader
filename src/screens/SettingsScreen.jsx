// SettingsScreen.jsx
import Slider from "@react-native-community/slider";
import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useSettings } from "../context/SettingsContext";


export default function SettingsScreen() {
  const {
    fontSize,
    setFontSize,
    lineHeight,
    setLineHeight,
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
        <Text style={styles.label}>Line Spacing</Text>
        <Slider
          minimumValue={1.2}
          maximumValue={2.0}
          value={lineHeight}
          onValueChange={setLineHeight}
          minimumTrackTintColor="#3A6EA5"
        />
      </View>

      {/* Reading Speed */}
      <View style={styles.settingBlock}>
        <Text style={styles.label}>Reading Speed</Text>
        <Slider
          minimumValue={0.3}
          maximumValue={0.8}
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
    padding: 20,
  },

  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#3A6EA5",
    marginBottom: 20,
    textAlign: "center",
  },

  settingBlock: {
    backgroundColor: "#FFFFFF",
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
  },

  label: {
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 8,
    color: "#333",
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
