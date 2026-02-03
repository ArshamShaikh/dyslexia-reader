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

export default function HomeScreen({ navigation }) {
  const [inputText, setInputText] = useState("");
  const [textInputHeight, setTextInputHeight] = useState(120);

  const handleContentSizeChange = (event) => {
    const height = Math.min(event.nativeEvent.contentSize.height, 300);
    setTextInputHeight(Math.max(120, height));
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerContainer}>
        <Text style={styles.title}>Dyslexia Reader</Text>
        <Text style={styles.subtitle}>
          Accessible Reading for Every Learner
        </Text>
      </View>

      {/* Dynamic Text Box with Floating Play Button */}
      <View style={styles.textInputWrapper}>
        <TextInput
          style={[styles.textInput, { height: textInputHeight }]}
          placeholder="Paste or type text here..."
          placeholderTextColor="#888"
          multiline
          value={inputText}
          onChangeText={setInputText}
          onContentSizeChange={handleContentSizeChange}
        />
        <TouchableOpacity
          style={styles.playButton}
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
          style={styles.secondaryButton}
          onPress={() => navigation.navigate("Saved")}
        >
          <Text style={styles.secondaryButtonText}>Saved Texts</Text>
        </TouchableOpacity>

        <View style={styles.placeholderFeature}>
          <Text style={styles.placeholderText}>
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
    backgroundColor: "#F5F7FA",
    padding: 16,
    flexDirection: "column",
  },

  headerContainer: {
    marginBottom: 12,
  },

  title: {
    fontSize: 26,
    fontWeight: "700",
    color: "#3A6EA5",
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
    borderColor: "#9ECAE1",
  },

  playButton: {
    position: "absolute",
    bottom: 12,
    right: 12,
    backgroundColor: "#3A6EA5",
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
    backgroundColor: "#3A6EA5",
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
    borderColor: "#3A6EA5",
    paddingVertical: 10,
    borderRadius: 8,
  },

  secondaryButtonText: {
    color: "#3A6EA5",
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
