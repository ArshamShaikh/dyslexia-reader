// HomeScreen.jsx
import { useState } from "react";
import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

export default function HomeScreen({ navigation }) {
  const [inputText, setInputText] = useState("");

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Dyslexia Reader</Text>
      <Text style={styles.subtitle}>
        Accessible Reading for Every Learner
      </Text>

      <TextInput
        style={styles.textInput}
        placeholder="Paste or type text here..."
        placeholderTextColor="#888"
        multiline
        value={inputText}
        onChangeText={setInputText}
      />

      <TouchableOpacity
        style={styles.primaryButton}
        onPress={() =>
          navigation.navigate("Reader", {
            text: inputText || "Sample reading text will appear here.",
          })
        }
      >
        <Text style={styles.primaryButtonText}>Start Reading</Text>
      </TouchableOpacity>

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
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F7FA",
    padding: 20,
    justifyContent: "center",
  },

  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#3A6EA5",
    textAlign: "center",
  },

  subtitle: {
    fontSize: 14,
    textAlign: "center",
    color: "#555",
    marginBottom: 20,
  },

  textInput: {
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    padding: 15,
    minHeight: 150,
    textAlignVertical: "top",
    fontSize: 16,
    color: "#000",
    marginBottom: 20,
  },

  primaryButton: {
    backgroundColor: "#3A6EA5",
    paddingVertical: 14,
    borderRadius: 8,
    marginBottom: 12,
  },

  primaryButtonText: {
    color: "#FFF",
    textAlign: "center",
    fontSize: 16,
    fontWeight: "600",
  },

  secondaryButton: {
    borderWidth: 1.5,
    borderColor: "#3A6EA5",
    paddingVertical: 12,
    borderRadius: 8,
  },

  secondaryButtonText: {
    color: "#3A6EA5",
    textAlign: "center",
    fontSize: 16,
    fontWeight: "600",
  },

  placeholderFeature: {
    marginTop: 25,
    alignItems: "center",
  },

  placeholderText: {
    color: "#888",
    fontSize: 13,
  },
});
