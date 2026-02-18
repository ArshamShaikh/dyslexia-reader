// HomeScreen.jsx
import { MaterialIcons } from "@expo/vector-icons";
import Constants from "expo-constants";
import { useMemo, useRef, useState } from "react";
import {
    NativeModules,
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
import { FONT_FAMILY_MAP, uiSizeForFont, uiTrackingForFont } from "../theme/typography";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import * as ImagePicker from "expo-image-picker";
import DocumentScanner from "react-native-document-scanner-plugin";
import { cleanOcrText } from "../utils/ocrCleaner";
import ThemedDialog from "../components/ThemedDialog";
import { createReaderSession } from "../services/readerSessionService";

const formatExtractionSource = (source = "") => {
  const normalized = String(source || "").trim().toLowerCase();
  if (normalized === "pdf-text-layer") return "Text PDF";
  if (normalized === "pdf-ocr-fallback") return "Scanned PDF OCR";
  if (normalized === "docx") return "DOCX";
  if (normalized === "image-ocr" || normalized === "ocr") return "Image OCR";
  if (normalized === "text-file") return "Text File";
  return "Imported";
};

export default function HomeScreen({ navigation }) {
  const [inputText, setInputText] = useState("");
  const [textInputHeight, setTextInputHeight] = useState(120);
  const [isUploading, setIsUploading] = useState(false);
  const [isOpeningReader, setIsOpeningReader] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [lastExtractionMeta, setLastExtractionMeta] = useState(null);
  const [dialogConfig, setDialogConfig] = useState({
    visible: false,
    title: "",
    message: "",
    actions: [],
  });
  const dialogResolverRef = useRef(null);
  const resolvedApiBaseUrlRef = useRef("");
  const { backgroundTheme, uiFontFamily } = useSettings();
  const theme = THEMES[backgroundTheme] || THEMES.light;
  const uiTracking = uiTrackingForFont(uiFontFamily);
  const uiFontStyle = useMemo(
    () =>
      uiFontFamily === "System"
        ? {}
        : {
            fontFamily: FONT_FAMILY_MAP[uiFontFamily],
            fontWeight: "400",
            fontStyle: "normal",
            letterSpacing: uiTracking,
          },
    [uiFontFamily, uiTracking]
  );
  const uiTextColor = theme.text;
  const titleSize = uiSizeForFont(uiFontFamily, 26);
  const subtitleSize = uiSizeForFont(uiFontFamily, 12);
  const actionLabelSize = uiSizeForFont(uiFontFamily, 10);
  const isDarkTheme = backgroundTheme === "dark";
  const statusBannerBg = isDarkTheme ? "#2A2F37" : "#F3F7FC";
  const statusBannerBorder = isDarkTheme ? "#46505E" : "#C8D4E5";
  const statusBannerAccent = isDarkTheme ? "#9BC7FF" : "#2C5EA8";
  const apiBaseCandidates = useMemo(() => {
    const scriptUrl = String(NativeModules?.SourceCode?.scriptURL || "").trim();
    const scriptUrlHostMatch = scriptUrl.match(/^https?:\/\/([^/:]+)/i);
    const fromScriptUrl = scriptUrlHostMatch?.[1]
      ? `http://${scriptUrlHostMatch[1]}:5050`
      : "";
    const fromEnv = String(process.env.EXPO_PUBLIC_EXTRACTION_API_BASE_URL || "")
      .trim()
      .replace(/\/+$/, "");
    const fromConfig = String(
      Constants.expoConfig?.extra?.extractionApiBaseUrl ||
      Constants.manifest2?.extra?.extractionApiBaseUrl ||
      ""
    )
      .trim()
      .replace(/\/+$/, "");
    const linkingUri = String(Constants.linkingUri || "").trim();
    const linkingHostMatch = linkingUri.match(/^[a-z]+:\/\/([^/:]+)/i);
    const fromLinkingUri = linkingHostMatch?.[1]
      ? `http://${linkingHostMatch[1]}:5050`
      : "";
    const hostUri =
      Constants.expoConfig?.hostUri ||
      Constants.manifest?.debuggerHost ||
      Constants.manifest2?.extra?.expoGo?.debuggerHost;
    const fromHostUri = hostUri
      ? `http://${hostUri.split(":")[0]}:5050`
      : "";

    const options = [
      fromScriptUrl,
      fromEnv,
      fromConfig,
      fromLinkingUri,
      fromHostUri,
      "http://localhost:5050",
      Platform.OS === "android" ? "http://10.0.2.2:5050" : "",
    ]
      .map((value) => String(value || "").trim().replace(/\/+$/, ""))
      .filter(Boolean);

    return [...new Set(options)];
  }, []);
  const isLikelyExtractionConnectionError = (error) => {
    const message = String(error?.message || "").toLowerCase();
    return (
      error?.name === "AbortError" ||
      message.includes("network request failed") ||
      message.includes("failed to fetch") ||
      message.includes("load failed") ||
      message.includes("connection") ||
      message.includes("timeout")
    );
  };
  const isRequestTimeoutError = (error) => {
    const message = String(error?.message || "").toLowerCase();
    return error?.name === "AbortError" || message.includes("timeout");
  };
  const extractionUnavailableMessage =
    "Couldn't reach text extraction service. You can still use offline mode with typed/pasted text and text files. For OCR/PDF/DOCX, connect to your extraction server.";
  const apiAccessToken = String(process.env.EXPO_PUBLIC_EXTRACTION_API_TOKEN || "").trim();
  const withApiAuthHeaders = (baseHeaders = {}) =>
    apiAccessToken
      ? {
          ...baseHeaders,
          Authorization: `Bearer ${apiAccessToken}`,
        }
      : baseHeaders;
  const fetchWithTimeout = async (url, options = {}, timeoutMs = 2500) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    try {
      return await fetch(url, {
        ...options,
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeoutId);
    }
  };
  const resolveApiBaseUrl = async () => {
    if (resolvedApiBaseUrlRef.current) return resolvedApiBaseUrlRef.current;
    const attempted = [];
    for (const candidate of apiBaseCandidates) {
      attempted.push(candidate);
      try {
        const response = await fetchWithTimeout(
          `${candidate}/health`,
          { method: "GET", headers: withApiAuthHeaders() },
          1800
        );
        if (!response.ok) continue;
        resolvedApiBaseUrlRef.current = candidate;
        return candidate;
      } catch (_error) {
        // Try next candidate.
      }
    }
    const attemptsText = attempted.length ? ` Tried: ${attempted.join(" | ")}` : "";
    throw new Error(`${extractionUnavailableMessage}${attemptsText}`);
  };
  const MAX_OPEN_CHARS = 1500000;
  const applyImportedText = async (
    text,
    {
      emptyTitle = "No text found",
      emptyMessage = "No readable text found.",
      source = "",
      truncated = false,
      maxChars = MAX_OPEN_CHARS,
    } = {}
  ) => {
    const normalized = String(text || "").trim();
    if (!normalized) {
      setLastExtractionMeta(null);
      await showInfo(emptyTitle, emptyMessage);
      return false;
    }

    const cap = Math.max(200000, Number(maxChars || MAX_OPEN_CHARS));
    if (normalized.length > cap) {
      setInputText(normalized.slice(0, cap));
      setLastExtractionMeta({
        source: source || "imported",
        truncated: true,
        maxChars: cap,
      });
      await showInfo(
        "Large file opened",
        `To keep reading smooth on all phones, we loaded the first ${cap.toLocaleString()} characters.`
      );
      return true;
    }

    setInputText(normalized);
    setLastExtractionMeta({
      source: source || "imported",
      truncated: Boolean(truncated),
      maxChars: cap,
    });
    return true;
  };
  const extractionMetaText = useMemo(() => {
    if (!lastExtractionMeta) return "";
    const base = `Source: ${formatExtractionSource(lastExtractionMeta.source)}`;
    if (lastExtractionMeta.truncated) {
      const cap = Number(lastExtractionMeta.maxChars || MAX_OPEN_CHARS);
      return `${base} • Trimmed to ${cap.toLocaleString()} chars`;
    }
    return base;
  }, [lastExtractionMeta]);
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

  const readTextFileSafely = async (asset) => {
    const candidateUris = [];
    if (asset?.uri) candidateUris.push(asset.uri);
    if (asset?.uri && !asset.uri.startsWith("file://")) {
      candidateUris.push(`file://${asset.uri}`);
    }

    for (const uri of candidateUris) {
      try {
        const content = await FileSystem.readAsStringAsync(uri);
        if (typeof content === "string") return content;
      } catch (_error) {
        // Try next URI strategy.
      }
    }

    if (asset?.uri) {
      try {
        const response = await fetch(asset.uri);
        if (response.ok) {
          const content = await response.text();
          if (typeof content === "string") return content;
        }
      } catch (_error) {
        // Fall through to final error.
      }
    }

    throw new Error("Couldn't read this text file. Try a different file.");
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
      const isTextLike =
        file.mimeType?.startsWith("text/") ||
        [".txt", ".md", ".csv", ".json", ".log"].some((ext) =>
          nameLower.endsWith(ext) || uriLower.endsWith(ext)
        );

      if (isPdf) {
        setIsUploading(true);
        setStatusMessage("Processing PDF... scanned files may take a few minutes.");
        const extracted = await uploadAsset("pdf", file, {
          onProgress: (message) => setStatusMessage(message),
        });
        await applyImportedText(extracted.text, {
          emptyTitle: "No text found",
          emptyMessage: "No readable text was found in this PDF.",
          source: extracted.source,
          truncated: extracted.truncated,
          maxChars: extracted.maxChars,
        });
        return;
      }

      if (isDocx) {
        setIsUploading(true);
        setStatusMessage("Uploading document...");
        const extracted = await uploadAsset("docx", file, {
          onProgress: (message) => setStatusMessage(message),
        });
        await applyImportedText(extracted.text, {
          emptyTitle: "No text found",
          emptyMessage: "This document might be empty.",
          source: extracted.source,
          truncated: extracted.truncated,
          maxChars: extracted.maxChars,
        });
        return;
      }

      if (isImage) {
        setIsUploading(true);
        setStatusMessage("Uploading image for OCR...");
        const extracted = await uploadAsset("ocr", file, {
          onProgress: (message) => setStatusMessage(message),
        });
        await applyImportedText(extracted.text, {
          emptyTitle: "No text detected",
          emptyMessage: "Try a clearer image.",
          source: extracted.source,
          truncated: extracted.truncated,
          maxChars: extracted.maxChars,
        });
        return;
      }

      if (isTextLike) {
        const content = await readTextFileSafely(file);
        await applyImportedText(cleanOcrText(content), {
          emptyTitle: "File is empty",
          emptyMessage: "Please choose a file with text.",
          source: "text-file",
        });
        return;
      }

      await showInfo(
        "Unsupported file",
        "Please choose a PDF, DOCX, image, or text file."
      );
    } catch (error) {
      await showInfo("Couldn't open file", error?.message || "Try a different file.");
    } finally {
      setIsUploading(false);
      setStatusMessage("");
    }
  };

  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const pollPdfJobUntilDone = async (
    apiBaseUrl,
    jobId,
    signal,
    onProgress = () => {}
  ) => {
    const startTime = Date.now();
    const maxWaitMs = 16 * 60 * 1000;
    const phaseLabel = {
      queued: "Queued",
      "running-ocr": "Reading scanned pages",
      "finalizing-text": "Cleaning extracted text",
      done: "Done",
    };

    while (Date.now() - startTime < maxWaitMs) {
      if (signal?.aborted) {
        throw new Error("Request timed out. Please retry.");
      }

      const pollResponse = await fetch(`${apiBaseUrl}/jobs/${encodeURIComponent(jobId)}`, {
        method: "GET",
        headers: withApiAuthHeaders(),
        signal,
      });
      if (!pollResponse.ok) {
        const payload = await pollResponse.json().catch(() => ({}));
        throw new Error(payload?.error || "OCR job failed while polling.");
      }
      const job = await pollResponse.json();
      if (job?.status === "completed") {
        return {
          text: String(job?.text || "").trim(),
          source: String(job?.source || "pdf-ocr-fallback"),
          truncated: Boolean(job?.truncated),
          maxChars: Number(job?.maxChars || 0) || MAX_OPEN_CHARS,
        };
      }
      if (job?.status === "failed") {
        throw new Error(String(job?.error || "PDF OCR failed."));
      }

      const progress = Math.max(5, Math.min(98, Number(job?.progress || 0)));
      const stage = phaseLabel[String(job?.phase || "")] || "Processing";
      onProgress(`Processing PDF (${progress}%) - ${stage}...`);
      await wait(1600);
    }

    throw new Error("PDF OCR is taking too long. Please try again.");
  };

  const uploadAsset = async (endpoint, asset, options = {}) => {
    const onProgress =
      typeof options?.onProgress === "function" ? options.onProgress : () => {};
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
    const sizeBytes = Number(asset?.size || asset?.fileSize || 0);
    const baseTimeoutMs = sizeBytes
      ? Math.min(180000, Math.max(30000, 20000 + Math.ceil(sizeBytes / (1024 * 1024)) * 8000))
      : 90000;
    const timeoutMs =
      endpoint === "pdf"
        ? Math.max(baseTimeoutMs, 12 * 60 * 1000)
        : endpoint === "ocr"
          ? Math.max(baseTimeoutMs, 3 * 60 * 1000)
          : baseTimeoutMs;
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const apiBaseUrl = await resolveApiBaseUrl();
      onProgress("Uploading...");
      const response = await fetch(`${apiBaseUrl}/${endpoint}`, {
        method: "POST",
        body: formData,
        headers: withApiAuthHeaders({
          "Content-Type": "multipart/form-data",
        }),
        signal: controller.signal,
      });
      if (endpoint === "pdf" && response.status === 202) {
        const pending = await response.json().catch(() => ({}));
        const jobId = String(pending?.jobId || "").trim();
        if (!jobId) {
          throw new Error("PDF OCR job could not be started.");
        }
        onProgress("Processing PDF (queued)...");
        return await pollPdfJobUntilDone(apiBaseUrl, jobId, controller.signal, onProgress);
      }
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        const message = payload?.error || `Request failed: ${response.status}`;
        throw new Error(message);
      }
      const data = await response.json();
      return {
        text: String(data?.text || "").trim(),
        source: String(data?.source || endpoint),
        truncated: Boolean(data?.truncated),
        maxChars: Number(data?.maxChars || 0) || MAX_OPEN_CHARS,
      };
    } catch (error) {
      if (isRequestTimeoutError(error)) {
        if (endpoint === "pdf") {
          throw new Error(
            "PDF extraction timed out. Large scanned PDFs can take several minutes. Try again while keeping server and internet active."
          );
        }
        throw new Error("Request timed out. Please retry.");
      }
      if (isLikelyExtractionConnectionError(error)) {
        // Re-discover endpoint on next request if connectivity changed.
        resolvedApiBaseUrlRef.current = "";
        throw new Error(extractionUnavailableMessage);
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
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
      const extracted = await uploadAsset("ocr", normalizedAsset, {
        onProgress: (message) => setStatusMessage(message),
      });
      await applyImportedText(extracted.text, {
        emptyTitle: "No text detected",
        emptyMessage: "Try a clearer image.",
        source: extracted.source,
        truncated: extracted.truncated,
        maxChars: extracted.maxChars,
      });
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
        <Text style={[styles.title, { color: uiTextColor, fontSize: titleSize }, uiFontStyle]} numberOfLines={1}>
          Dyslexia Reader
        </Text>
        <Text style={[styles.subtitle, { color: uiTextColor, fontSize: subtitleSize }, uiFontStyle]}>
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
            backgroundColor: isDarkTheme ? "#1C1C1C" : theme.highlight,
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
            uiFontStyle,
          ]}
          placeholder="Paste or type text here..."
          placeholderTextColor={isDarkTheme ? "#9EA3A8" : "#888"}
          multiline
          value={inputText}
          onChangeText={(value) => {
            setInputText(value);
            setLastExtractionMeta(null);
          }}
          onContentSizeChange={handleContentSizeChange}
        />
        {inputText.trim().length > 0 && (
          <TouchableOpacity
            style={[
              styles.clearButton,
              {
                backgroundColor:
                  isDarkTheme ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.05)",
              },
            ]}
            onPress={() => {
              setInputText("");
              setLastExtractionMeta(null);
              setTextInputHeight(120);
            }}
            accessibilityLabel="Clear text"
          >
            <MaterialIcons name="close" size={16} color={uiTextColor} />
            <Text style={[styles.clearButtonText, { color: uiTextColor }, uiFontStyle]}>Clear</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[
            styles.playButton,
            {
              backgroundColor: isDarkTheme ? "#333333" : theme.highlight,
              borderColor: theme.border,
              borderWidth: 1,
            },
          ]}
          onPress={async () => {
            if (isUploading || isOpeningReader) return;
            setIsOpeningReader(true);
            setStatusMessage("Opening reader...");
            const rawText = inputText || "Sample reading text will appear here.";
            let openText = rawText;
            try {
              // Allow status banner to render before heavy reader initialization.
              await new Promise((resolve) => setTimeout(resolve, 60));
              if (rawText.length > MAX_OPEN_CHARS) {
                const choice = await openDialog({
                  title: "Large document",
                  message: `This document is extremely large. To keep the app stable, we will open the first ${MAX_OPEN_CHARS.toLocaleString()} characters in chunked reading mode.`,
                  actions: [
                    { label: "Cancel", value: "cancel" },
                    { label: "Continue", value: "continue", tone: "primary" },
                  ],
                });
                if (choice !== "continue") return;
                openText = rawText.slice(0, MAX_OPEN_CHARS);
              }
              const sessionId = createReaderSession(openText);
              navigation.navigate("Reader", {
                sessionId,
                text: openText.slice(0, 20000),
              });
            } finally {
              setTimeout(() => {
                setIsOpeningReader(false);
                setStatusMessage((prev) =>
                  prev === "Opening reader..." ? "" : prev
                );
              }, 200);
            }
          }}
          disabled={isUploading || isOpeningReader}
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
            backgroundColor: isDarkTheme ? "#1C1C1C" : theme.highlight,
          },
        ]}
      >
        <TouchableOpacity
          style={[
            styles.actionButton,
            {
              borderColor: theme.border,
              backgroundColor:
                isDarkTheme ? "#1C1C1C" : theme.highlight,
            },
          ]}
          onPress={handlePickFile}
          disabled={isUploading}
          accessibilityLabel="Attach file"
        >
          <MaterialIcons name="folder-open" size={22} color={uiTextColor} />
          <Text style={[styles.actionLabel, { color: uiTextColor, fontSize: actionLabelSize }, uiFontStyle]}>File</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.actionButton,
            {
              borderColor: theme.border,
              backgroundColor:
                isDarkTheme ? "#1C1C1C" : theme.highlight,
            },
          ]}
          onPress={handlePickPhoto}
          disabled={isUploading}
          accessibilityLabel="Choose photos"
        >
          <MaterialIcons name="photo-library" size={22} color={uiTextColor} />
          <Text style={[styles.actionLabel, { color: uiTextColor, fontSize: actionLabelSize }, uiFontStyle]}>Photos</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.actionButton,
            {
              borderColor: theme.border,
              backgroundColor:
                isDarkTheme ? "#1C1C1C" : theme.highlight,
            },
          ]}
          onPress={handleCameraScan}
          disabled={isUploading}
          accessibilityLabel="Scan with camera"
        >
          <MaterialIcons name="photo-camera" size={22} color={uiTextColor} />
          <Text style={[styles.actionLabel, { color: uiTextColor, fontSize: actionLabelSize }, uiFontStyle]}>Camera</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.placeholderFeature}>
        {(isUploading || isOpeningReader || statusMessage) && (
          <View
            style={[
              styles.uploadStatusBanner,
              {
                borderColor: statusBannerBorder,
                backgroundColor: statusBannerBg,
              },
            ]}
          >
            <View style={[styles.uploadStatusDot, { backgroundColor: statusBannerAccent }]} />
            <MaterialIcons name="cloud-upload" size={16} color={statusBannerAccent} />
            <Text style={[styles.uploadStatusText, { color: uiTextColor }, uiFontStyle]}>
              {statusMessage || "Uploading..."}
            </Text>
          </View>
        )}
        {!!extractionMetaText && !isUploading && (
          <View
            style={[
              styles.extractionMetaBadge,
              {
                borderColor: theme.border,
                backgroundColor: isDarkTheme ? "#1F2228" : "#F7F8FA",
              },
            ]}
          >
            <MaterialIcons name="verified" size={13} color={statusBannerAccent} />
            <Text
              numberOfLines={2}
              style={[styles.extractionMetaText, { color: uiTextColor }, uiFontStyle]}
            >
              {extractionMetaText}
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
    gap: 8,
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
    flex: 1,
    minWidth: 0,
    flexShrink: 1,
    lineHeight: 16,
  },
  uploadStatusDot: {
    width: 8,
    height: 8,
    borderRadius: 99,
  },
  extractionMetaBadge: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 7,
  },
  extractionMetaText: {
    flex: 1,
    minWidth: 0,
    fontSize: 11,
    fontWeight: "600",
    lineHeight: 15,
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

