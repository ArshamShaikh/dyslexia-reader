// HomeScreen.jsx
import { MaterialIcons } from "@expo/vector-icons";
import { useState } from "react";
import {
    Alert,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useSettings } from "../context/SettingsContext";
import { THEMES } from "../theme/colors";
import * as Clipboard from "expo-clipboard";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system";

export default function HomeScreen({ navigation }) {
  const [inputText, setInputText] = useState("");
  const [textInputHeight, setTextInputHeight] = useState(120);
  const { backgroundTheme, textColor } = useSettings();
  const theme = THEMES[backgroundTheme] || THEMES.light;

  const handleContentSizeChange = (event) => {
    const height = Math.min(event.nativeEvent.contentSize.height, 300);
    setTextInputHeight(Math.max(120, height));
  };
  const handlePasteFromClipboard = async () => {
    const text = await Clipboard.getStringAsync();
    if (!text) {
      Alert.alert("Clipboard is empty", "Copy some text and try again.");
      return;
    }
    setInputText(text);
  };

  const handlePickFile = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: ["text/plain", "text/*"],
      copyToCacheDirectory: true,
    });
    if (result.canceled) return;

    const file = result.assets?.[0];
    if (!file) return;

    try {
      const content = await FileSystem.readAsStringAsync(file.uri);
      if (!content) {
        Alert.alert("File is empty", "Please choose a file with text.");
        return;
      }
      setInputText(content);
    } catch (error) {
      Alert.alert("Couldn't open file", "Try a different file.");
    }
  };

  const handleOCR = () => {
    Alert.alert("OCR coming soon", "We’ll add camera scanning in Phase 3.");
  };

  const handlePDF = () => {
    Alert.alert(
      "PDF support coming soon",
      "We’ll add cloud PDF extraction for full cross-platform support."
    );
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

      <View style={styles.inputActions}>
        <TouchableOpacity
          style={[
            styles.actionButton,
            {
              borderColor: theme.border,
              backgroundColor:
                theme.background === "#121212" ? "#1C1C1C" : "#FFFFFF",
            },
          ]}
          onPress={handlePickFile}
          accessibilityLabel="Attach file"
        >
          <MaterialIcons name="attach-file" size={22} color={textColor} />
          <Text style={[styles.actionLabel, { color: textColor }]}>File</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.actionButton,
            {
              borderColor: theme.border,
              backgroundColor:
                theme.background === "#121212" ? "#1C1C1C" : "#FFFFFF",
            },
          ]}
          onPress={handlePDF}
          accessibilityLabel="PDF import"
        >
          <MaterialIcons name="picture-as-pdf" size={22} color={textColor} />
          <Text style={[styles.actionLabel, { color: textColor }]}>PDF</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.actionButton,
            {
              borderColor: theme.border,
              backgroundColor:
                theme.background === "#121212" ? "#1C1C1C" : "#FFFFFF",
            },
          ]}
          onPress={handleOCR}
          accessibilityLabel="Scan text"
        >
          <MaterialIcons name="document-scanner" size={22} color={textColor} />
          <Text style={[styles.actionLabel, { color: textColor }]}>Scan</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.actionButton,
            {
              borderColor: theme.border,
              backgroundColor:
                theme.background === "#121212" ? "#1C1C1C" : "#FFFFFF",
            },
          ]}
          onPress={handlePasteFromClipboard}
          accessibilityLabel="Paste from clipboard"
        >
          <MaterialIcons name="content-paste" size={22} color={textColor} />
          <Text style={[styles.actionLabel, { color: textColor }]}>Paste</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.placeholderFeature}>
        <Text style={[styles.placeholderText, { color: textColor }]}>
          More input options coming soon
        </Text>
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
  inputActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
    marginTop: 6,
  },
  actionButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    gap: 4,
  },
  actionLabel: {
    fontSize: 11,
    fontWeight: "600",
  },
});
