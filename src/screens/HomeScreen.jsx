// HomeScreen.jsx
import { MaterialIcons } from "@expo/vector-icons";
import { useState } from "react";
import {
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useSettings } from "../context/SettingsContext";
import { THEMES } from "../theme/colors";

export default function HomeScreen({ navigation }) {
  const [inputText, setInputText] = useState("");
  const [textInputHeight, setTextInputHeight] = useState(120);
  const { backgroundTheme, textColor } = useSettings();
  const theme = THEMES[backgroundTheme] || THEMES.light;

  const handleContentSizeChange = (event) => {
    const height = Math.min(event.nativeEvent.contentSize.height, 300);
    setTextInputHeight(Math.max(120, height));
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.headerContainer}>
        <Text style={[styles.title, { color: textColor }]}>Dyslexia Reader</Text>
        <Text style={[styles.subtitle, { color: textColor }]}>
          Accessible Reading for Every Learner
        </Text>
      </View>

      {/* Dynamic Text Box with Floating Play Button */}
      <View style={styles.textInputWrapper}>
        <TextInput
          style={[
            styles.textInput,
            {
              height: textInputHeight,
              color: textColor,
              borderColor: theme.border,
              backgroundColor: theme.background === "#121212" ? "#1C1C1C" : "#FFFFFF",
            },
          ]}
          placeholder="Paste or type text here..."
          placeholderTextColor={theme.background === "#121212" ? "#9EA3A8" : "#888"}
          multiline
          value={inputText}
          onChangeText={setInputText}
          onContentSizeChange={handleContentSizeChange}
        />
        <TouchableOpacity
          style={[
            styles.playButton,
            { backgroundColor: theme.background === "#121212" ? "#333333" : "#1F1F1F" },
          ]}
          onPress={() =>
            navigation.navigate("Reader", {
              text: inputText || "Sample reading text will appear here.",
            })
          }
          accessible={true}
          accessibilityLabel="Start reading"
        >
          <MaterialIcons name="play-arrow" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[
            styles.secondaryButton,
            { borderColor: theme.border },
          ]}
          onPress={() => navigation.navigate("Saved")}
        >
          <Text style={[styles.secondaryButtonText, { color: textColor }]}>
            Saved Texts
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.secondaryButton,
            { borderColor: theme.border },
          ]}
          onPress={() => navigation.navigate("Settings")}
        >
          <Text style={[styles.secondaryButtonText, { color: textColor }]}>
            Reading Settings
          </Text>
        </TouchableOpacity>

        <View style={styles.placeholderFeature}>
          <Text style={[styles.placeholderText, { color: textColor }]}>
            OCR Scan Feature (Coming Soon)
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "transparent",
    padding: 16,
    flexDirection: "column",
  },

  headerContainer: {
    marginBottom: 12,
  },

  title: {
    fontSize: 26,
    fontWeight: "700",
    color: "#1F1F1F",
    textAlign: "center",
  },

  subtitle: {
    fontSize: 12,
    textAlign: "center",
    color: "#555",
    marginTop: 4,
  },

  textInputWrapper: {
    position: "relative",
    marginBottom: 12,
    flexShrink: 1,
    maxHeight: 280,
  },

  textInput: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingRight: 50,
    paddingLeft: 12,
    paddingTop: 12,
    paddingBottom: 12,
    minHeight: 120,
    maxHeight: 280,
    textAlignVertical: "top",
    fontSize: 14,
    color: "#000",
    borderWidth: 2,
    borderColor: "#BDBDBD",
  },

  playButton: {
    position: "absolute",
    bottom: 12,
    right: 12,
    backgroundColor: "#1F1F1F",
    borderRadius: 24,
    width: 44,
    height: 44,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 4,
  },

  buttonContainer: {
    gap: 10,
  },

  primaryButton: {
    backgroundColor: "#1F1F1F",
    paddingVertical: 12,
    borderRadius: 8,
  },

  primaryButtonText: {
    color: "#FFF",
    textAlign: "center",
    fontSize: 14,
    fontWeight: "600",
  },

  secondaryButton: {
    borderWidth: 1.5,
    borderColor: "#BDBDBD",
    paddingVertical: 10,
    borderRadius: 8,
  },

  secondaryButtonText: {
    color: "#1F1F1F",
    textAlign: "center",
    fontSize: 14,
    fontWeight: "600",
  },

  placeholderFeature: {
    marginTop: 12,
    alignItems: "center",
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: "#DDD",
  },

  placeholderText: {
    color: "#888",
    fontSize: 11,
  },
});
