// HomeScreen.jsx
import { MaterialIcons } from "@expo/vector-icons";
import Constants from "expo-constants";
import { useMemo, useRef, useState } from "react";
import {
    ActivityIndicator,
    Platform,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useSettings } from "../context/SettingsContext";
import { THEMES } from "../theme/colors";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system";
import * as ImagePicker from "expo-image-picker";
import DocumentScanner from "react-native-document-scanner-plugin";
import { cleanOcrText } from "../utils/ocrCleaner";
import ThemedDialog from "../components/ThemedDialog";

export default function HomeScreen({ navigation }) {
  const [inputText, setInputText] = useState("");
  const [textInputHeight, setTextInputHeight] = useState(120);
  const [isUploading, setIsUploading] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [dialogConfig, setDialogConfig] = useState({
    visible: false,
    title: "",
    message: "",
    actions: [],
  });
  const dialogResolverRef = useRef(null);
  const { backgroundTheme } = useSettings();
  const theme = THEMES[backgroundTheme] || THEMES.light;
  const uiTextColor = theme.text;
  const apiBaseUrl = useMemo(() => {
    // Prefer localhost for dev builds on real Android devices when using adb reverse.
    if (Platform.OS === "android" && Constants.appOwnership !== "expo") {
      return "http://localhost:5050";
    }

    const hostUri =
      Constants.expoConfig?.hostUri ||
      Constants.manifest?.debuggerHost ||
      Constants.manifest2?.extra?.expoGo?.debuggerHost;
    if (hostUri) {
      const hostname = hostUri.split(":")[0];
      return `http://${hostname}:5050`;
    }
    if (Platform.OS === "android") return "http://10.0.2.2:5050";
    return "http://localhost:5050";
  }, []);
  const MAX_READER_CHARS = 20000;
  const openDialog = ({ title, message, actions }) =>
    new Promise((resolve) => {
      dialogResolverRef.current = resolve;
      setDialogConfig({
        visible: true,
        title,
        message,
        actions: actions || [],
      });
    });

  const closeDialog = () => {
    setDialogConfig((prev) => ({ ...prev, visible: false }));
    const resolve = dialogResolverRef.current;
    dialogResolverRef.current = null;
    if (resolve) resolve(null);
  };

  const handleDialogAction = (action) => {
    setDialogConfig((prev) => ({ ...prev, visible: false }));
    const resolve = dialogResolverRef.current;
    dialogResolverRef.current = null;
    if (resolve) resolve(action?.value ?? null);
    if (action?.onPress) action.onPress();
  };

  const showInfo = async (title, message) => {
    await openDialog({
      title,
      message,
      actions: [{ label: "OK", value: "ok", tone: "primary" }],
    });
  };

  const handleContentSizeChange = (event) => {
    const height = Math.min(event.nativeEvent.contentSize.height, 300);
    setTextInputHeight(Math.max(120, height));
  };
  const handlePickFile = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: [
        "text/plain",
        "text/*",
        "application/pdf",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "image/*",
      ],
      copyToCacheDirectory: true,
    });
    if (result.canceled) return;

    const file = result.assets?.[0];
    if (!file) return;

    try {
      const nameLower = file.name?.toLowerCase() || "";
      const uriLower = file.uri?.toLowerCase() || "";
      const isPdf =
        file.mimeType === "application/pdf" ||
        file.mimeType?.includes("pdf") ||
        nameLower.endsWith(".pdf") ||
        uriLower.endsWith(".pdf");
      const isDocx =
        file.mimeType ===
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
        file.mimeType?.includes("officedocument.wordprocessingml.document") ||
        nameLower.endsWith(".docx") ||
        uriLower.endsWith(".docx");
      const isImage =
        file.mimeType?.startsWith("image/") ||
        [".jpg", ".jpeg", ".png", ".webp", ".heic"].some((ext) =>
          nameLower.endsWith(ext) || uriLower.endsWith(ext)
        );

      if (isPdf) {
        setIsUploading(true);
        setStatusMessage("Uploading PDF...");
        const text = await uploadAsset("pdf", file);
        const cleaned = cleanOcrText(text);
        if (!cleaned) {
          await showInfo(
            "No text found",
            "This PDF looks scanned. OCR for scanned PDFs is coming next."
          );
          return;
        }
        setInputText(cleaned);
        return;
      }

      if (isDocx) {
        setIsUploading(true);
        setStatusMessage("Uploading document...");
        const text = await uploadAsset("docx", file);
        const cleaned = cleanOcrText(text);
        if (!cleaned) {
          await showInfo("No text found", "This document might be empty.");
          return;
        }
        setInputText(cleaned);
        return;
      }

      if (isImage) {
        setIsUploading(true);
        setStatusMessage("Uploading image for OCR...");
        const text = await uploadAsset("ocr", file);
        const cleaned = cleanOcrText(text);
        if (!cleaned) {
          await showInfo("No text detected", "Try a clearer image.");
          return;
        }
        setInputText(cleaned);
        return;
      }

      const content = await FileSystem.readAsStringAsync(file.uri);
      if (!content) {
        await showInfo("File is empty", "Please choose a file with text.");
        return;
      }
      setInputText(cleanOcrText(content));
    } catch (error) {
      try {
        setIsUploading(true);
        setStatusMessage("Uploading file...");
        const text = await uploadAsset("pdf", file);
        const cleaned = cleanOcrText(text);
        if (!cleaned) {
          await showInfo(
            "No text found",
            "This PDF looks scanned. OCR for scanned PDFs is coming next."
          );
          return;
        }
        setInputText(cleaned);
      } catch (uploadError) {
        await showInfo(
          "Couldn't open file",
          uploadError?.message || "Try a different file."
        );
      }
    } finally {
      setIsUploading(false);
      setStatusMessage("");
    }
  };

  const uploadAsset = async (endpoint, asset) => {
    const formData = new FormData();
    if (asset.file) {
      formData.append("file", asset.file, asset.name || "upload");
    } else {
      const normalizedUri = asset.uri?.startsWith("file://")
        ? asset.uri
        : `file://${asset.uri}`;
      formData.append("file", {
        uri: normalizedUri,
        name: asset.name || "upload",
        type: asset.mimeType || "application/octet-stream",
      });
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000);
    const response = await fetch(`${apiBaseUrl}/${endpoint}`, {
      method: "POST",
      body: formData,
      headers: {
        "Content-Type": "multipart/form-data",
      },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      const message = payload?.error || `Request failed: ${response.status}`;
      throw new Error(message);
    }
    const data = await response.json();
    return data?.text?.trim() || "";
  };

  const runImageOcr = async (asset) => {
    if (!asset) return;
    try {
      setIsUploading(true);
      setStatusMessage("Uploading for OCR...");
      const normalizedAsset = {
        uri: asset.uri,
        name: asset.fileName || asset.name || "scan.jpg",
        mimeType: asset.mimeType || "image/jpeg",
      };
      const text = await uploadAsset("ocr", normalizedAsset);
      const cleaned = cleanOcrText(text);
      if (!cleaned) {
        await showInfo("No text detected", "Try a clearer image.");
        return;
      }
      setInputText(cleaned);
    } catch (error) {
      await showInfo(
        "OCR failed",
        error?.message || "Check the server and try again."
      );
    } finally {
      setIsUploading(false);
      setStatusMessage("");
    }
  };

  const handlePickPhoto = async () => {
    let asset;
    if (Platform.OS === "web") {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["image/*"],
        copyToCacheDirectory: true,
      });
      if (result.canceled) return;
      asset = result.assets?.[0];
    } else {
      const result = await ImagePicker.launchImageLibraryAsync({
        quality: 0.9,
      });
      if (result.canceled) return;
      asset = result.assets?.[0];
    }
    await runImageOcr(asset);
  };

  const handleCameraScan = async () => {
    if (Platform.OS === "web") {
      await handlePickPhoto();
      return;
    }

    try {
      setStatusMessage("Opening scanner...");
      const { scannedImages } = await DocumentScanner.scanDocument({
        maxNumDocuments: 1,
        responseType: "imageFilePath",
      });
      const scanPath = scannedImages?.[0];
      if (!scanPath) {
        setStatusMessage("");
        return;
      }
      await runImageOcr({
        uri: scanPath,
        name: "scan.jpg",
        mimeType: "image/jpeg",
      });
    } catch (_error) {
      await showInfo("Scanner failed", "Try again or choose Photos instead.");
      setStatusMessage("");
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.headerContainer}>
        <Text style={[styles.title, { color: uiTextColor }]}>Dyslexia Reader</Text>
        <Text style={[styles.subtitle, { color: uiTextColor }]}>
          Accessible Reading for Every Learner
        </Text>
      </View>

      {/* Dynamic Text Box with Floating Play Button */}
      <View
        style={[
          styles.textInputWrapper,
          styles.cardSurface,
          {
            borderColor: theme.border,
            backgroundColor: theme.background === "#121212" ? "#1C1C1C" : theme.highlight,
          },
        ]}
      >
        <TextInput
          style={[
            styles.textInput,
            {
              height: textInputHeight,
              color: uiTextColor,
              borderColor: "transparent",
              backgroundColor: "transparent",
            },
          ]}
          placeholder="Paste or type text here..."
          placeholderTextColor={theme.background === "#121212" ? "#9EA3A8" : "#888"}
          multiline
          value={inputText}
          onChangeText={setInputText}
          onContentSizeChange={handleContentSizeChange}
        />
        {inputText.trim().length > 0 && (
          <TouchableOpacity
            style={[
              styles.clearButton,
              {
                backgroundColor:
                  theme.background === "#121212" ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.05)",
              },
            ]}
            onPress={() => {
              setInputText("");
              setTextInputHeight(120);
            }}
            accessibilityLabel="Clear text"
          >
            <MaterialIcons name="close" size={16} color={uiTextColor} />
            <Text style={[styles.clearButtonText, { color: uiTextColor }]}>Clear</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[
            styles.playButton,
            {
              backgroundColor: theme.background === "#121212" ? "#333333" : theme.highlight,
              borderColor: theme.border,
              borderWidth: 1,
            },
          ]}
          onPress={async () => {
            const rawText = inputText || "Sample reading text will appear here.";
            if (rawText.length > MAX_READER_CHARS) {
              const choice = await openDialog({
                title: "Large document",
                message: `This text is very long. To keep reading smooth, we will open the first ${MAX_READER_CHARS.toLocaleString()} characters.`,
                actions: [
                  { label: "Cancel", value: "cancel" },
                  { label: "Continue", value: "continue", tone: "primary" },
                ],
              });
              if (choice === "continue") {
                navigation.navigate("Reader", {
                  text: rawText.slice(0, MAX_READER_CHARS),
                });
              }
              return;
            }
            navigation.navigate("Reader", { text: rawText });
          }}
          accessible={true}
          accessibilityLabel="Start reading"
        >
          <MaterialIcons name="play-arrow" size={24} color={uiTextColor} />
        </TouchableOpacity>
      </View>

      <View
        style={[
          styles.inputActions,
          styles.cardSurface,
          {
            borderColor: theme.border,
            backgroundColor: theme.background === "#121212" ? "#1C1C1C" : theme.highlight,
          },
        ]}
      >
        <TouchableOpacity
          style={[
            styles.actionButton,
            {
              borderColor: theme.border,
              backgroundColor:
                theme.background === "#121212" ? "#1C1C1C" : theme.highlight,
            },
          ]}
          onPress={handlePickFile}
          disabled={isUploading}
          accessibilityLabel="Attach file"
        >
          <MaterialIcons name="folder-open" size={22} color={uiTextColor} />
          <Text style={[styles.actionLabel, { color: uiTextColor }]}>File</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.actionButton,
            {
              borderColor: theme.border,
              backgroundColor:
                theme.background === "#121212" ? "#1C1C1C" : theme.highlight,
            },
          ]}
          onPress={handlePickPhoto}
          disabled={isUploading}
          accessibilityLabel="Choose photos"
        >
          <MaterialIcons name="photo-library" size={22} color={uiTextColor} />
          <Text style={[styles.actionLabel, { color: uiTextColor }]}>Photos</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.actionButton,
            {
              borderColor: theme.border,
              backgroundColor:
                theme.background === "#121212" ? "#1C1C1C" : theme.highlight,
            },
          ]}
          onPress={handleCameraScan}
          disabled={isUploading}
          accessibilityLabel="Scan with camera"
        >
          <MaterialIcons name="photo-camera" size={22} color={uiTextColor} />
          <Text style={[styles.actionLabel, { color: uiTextColor }]}>Camera</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.placeholderFeature}>
        {(isUploading || statusMessage) && (
          <View
            style={[
              styles.uploadStatusBanner,
              {
                borderColor: theme.border,
                backgroundColor:
                  theme.background === "#121212" ? "#242424" : "#F5F5F5",
              },
            ]}
          >
            <ActivityIndicator size="small" color={uiTextColor} />
            <Text style={[styles.uploadStatusText, { color: uiTextColor }]}>
              {statusMessage || "Uploading..."}
            </Text>
          </View>
        )}
      </View>
      <ThemedDialog
        visible={dialogConfig.visible}
        title={dialogConfig.title}
        message={dialogConfig.message}
        actions={dialogConfig.actions}
        theme={theme}
        onAction={handleDialogAction}
        onRequestClose={closeDialog}
      />

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
    borderWidth: 1.5,
    borderRadius: 16,
    padding: 10,
  },

  textInput: {
    backgroundColor: "transparent",
    borderRadius: 10,
    paddingRight: 50,
    paddingLeft: 12,
    paddingTop: 12,
    paddingBottom: 12,
    minHeight: 120,
    maxHeight: 280,
    textAlignVertical: "top",
    fontSize: 14,
    color: "#000",
    borderWidth: 0,
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
    borderWidth: 1.5,
  },
  clearButton: {
    position: "absolute",
    top: 10,
    right: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(127,127,127,0.45)",
  },
  clearButtonText: {
    fontSize: 11,
    fontWeight: "600",
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
    minHeight: 40,
    justifyContent: "center",
  },
  uploadStatusBanner: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "stretch",
    gap: 8,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  uploadStatusText: {
    fontSize: 12,
    fontWeight: "600",
  },
  inputActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
    marginTop: 6,
    padding: 8,
    borderWidth: 1.2,
    borderRadius: 16,
  },
  actionButton: {
    flex: 1,
    minWidth: 0,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    borderRadius: 9,
    borderWidth: 1.2,
    gap: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 2,
    elevation: 2,
  },
  actionLabel: {
    fontSize: 10,
    fontWeight: "600",
  },
  cardSurface: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 3,
  },
});
