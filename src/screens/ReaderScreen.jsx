import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  Keyboard,
  Linking,
  Modal,
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Slider from "@react-native-community/slider";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import ReaderControls from "../components/ReaderControls";
import { useSettings } from "../context/SettingsContext";
import {
  getNativeVoices,
  isNativeTtsAvailable,
  setNativeVoice,
  speakText,
  stopSpeech,
  ttsEventEmitter,
} from "../services/ttsService";
import { splitIntoLines, splitIntoSegments } from "../utils/textParser";
import { THEMES } from "../theme/colors";
import { FONT_FAMILY_MAP } from "../theme/typography";
import { addSavedText, getSavedTexts, isTextSaved } from "../services/storageService";
import { getReaderSessionText } from "../services/readerSessionService";


export default function ReaderScreen({ route, navigation }) {
  const { text = "", sessionId = "" } = route.params || {};
  const MAX_TOTAL_CHARS = 500000;
  // Keep each spoken part safely below Android TTS single-utterance limits
  // across device vendors (some engines fail above ~2k chars).
  const SEGMENT_CHARS = 1800;
  const sessionText = getReaderSessionText(sessionId);
  const sourceText = sessionText || text || SAMPLE_TEXT;
  const initialFullText =
    sourceText.length > MAX_TOTAL_CHARS
      ? sourceText.slice(0, MAX_TOTAL_CHARS)
      : sourceText;
  const [editableFullText, setEditableFullText] = useState(initialFullText);
  const fullText = editableFullText;
  const segments = useMemo(
    () => splitIntoSegments(fullText, SEGMENT_CHARS),
    [fullText]
  );
  const [currentSegmentIndex, setCurrentSegmentIndex] = useState(0);
  const safeText = segments[currentSegmentIndex] || "";
  const [currentLineIndex, setCurrentLineIndex] = useState(-1);
  const [currentWordIndex, setCurrentWordIndex] = useState(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [, setIsPaused] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editDraftText, setEditDraftText] = useState("");
  const [saveNotice, setSaveNotice] = useState("");
  const toastTimerRef = useRef(null);
  const [showQuickSettings, setShowQuickSettings] = useState(false);
  const [showSpeedPanel, setShowSpeedPanel] = useState(false);
  const [partInputValue, setPartInputValue] = useState("1");
  const [partSearchQuery, setPartSearchQuery] = useState("");
  const [partSearchCursor, setPartSearchCursor] = useState(-1);
  const [isSegmentLoading, setIsSegmentLoading] = useState(false);
  const [segmentStatusMessage, setSegmentStatusMessage] = useState("");
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [settingsTab, setSettingsTab] = useState("fonts");
  const [activeColorTarget, setActiveColorTarget] = useState("text");
  const [draftColor, setDraftColor] = useState({
    hue: 0,
    saturation: 0,
    value: 1,
  });
  const [shadeBoxSize, setShadeBoxSize] = useState({ width: 1, height: 1 });
  const [isColorDragging, setIsColorDragging] = useState(false);
  const [isHueSliding, setIsHueSliding] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [isSaved, setIsSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showSaveFolderPicker, setShowSaveFolderPicker] = useState(false);
  const [saveFolderOptions, setSaveFolderOptions] = useState([]);
  const [selectedSaveFolder, setSelectedSaveFolder] = useState("");
  const [showSaveNewFolderInput, setShowSaveNewFolderInput] = useState(false);
  const [saveFolderInput, setSaveFolderInput] = useState("");
  const [saveTitleInput, setSaveTitleInput] = useState("");
  const [isSaveFolderLoading, setIsSaveFolderLoading] = useState(false);
  const [availableVoices, setAvailableVoices] = useState([]);
  const [showAllVoices, setShowAllVoices] = useState(false);
  const [showVoiceSection, setShowVoiceSection] = useState(false);
  const [previewVoiceName, setPreviewVoiceName] = useState("");
  const [containerWidth, setContainerWidth] = useState(0);
  const [avgCharWidth, setAvgCharWidth] = useState(0);
  const [useNativeTts] = useState(isNativeTtsAvailable);
  const timeoutRef = useRef(null);
  const scrollViewRef = useRef(null);
  const scrollContentRef = useRef(null);
  const wordRefsRef = useRef([]);
  const lineOffsetsRef = useRef([]);
  const wordOffsetsRef = useRef([]);
  const lineHeightsRef = useRef([]);
  const lineLayoutSignatureRef = useRef([]);
  const wordLayoutSignatureRef = useRef([]);
  const speechMapRef = useRef([]);
  const speechMapIndexRef = useRef(0);
  const currentSegmentIndexRef = useRef(0);
  const segmentCountRef = useRef(segments.length);
  const resumeOnNextSegmentRef = useRef(false);
  const lastHighlightTsRef = useRef(0);
  const currentLineIndexRef = useRef(-1);
  const currentWordIndexRef = useRef(-1);
  const pendingHighlightRef = useRef(null);
  const pendingHighlightTimerRef = useRef(null);
  const recenterRetryTimerRef = useRef(null);
  const pendingSearchTargetRef = useRef(null);
  const exactSearchRecenterTimerRef = useRef(null);
  const colorDragRafRef = useRef(null);
  const pendingShadePointRef = useRef({ x: 0, y: 0 });
  const draftColorRef = useRef({ hue: 0, saturation: 0, value: 1 });
  const scrollViewportHeightRef = useRef(0);
  const scrollContentHeightRef = useRef(0);
  const scrollYRef = useRef(0);
  const partInputRef = useRef(null);
  const searchInputRef = useRef(null);
  const editInputRef = useRef(null);
  const moveToNextSegmentRef = useRef(null);
  const isPlayingRef = useRef(false);
  const isVoicePreviewingRef = useRef(false);
  const previewTimerRef = useRef(null);
  const isUserDraggingRef = useRef(false);
  const manualScrollHoldUntilRef = useRef(0);
  const segmentSwitchTokenRef = useRef(0);
  const appliedSearchFocusKeyRef = useRef("");
  const seekToPositionRef = useRef(null);
  const recenterToCurrentHighlightRef = useRef(null);
  const insets = useSafeAreaInsets();

  const {
    fontFamily,
    fontSize,
    lineHeight,
    wordSpacing,
    letterSpacing,
    textBoxPadding,
    backgroundTheme,
    textColor,
    highlightStrength,
    readingSpeed,
    pitch,
    highlightHue,
    highlightSaturation,
    highlightValue,
    textHue,
    textSaturation,
    textValue,
    readingAreaHue,
    readingAreaSaturation,
    readingAreaValue,
    setReadingSpeed,
    setPitch,
    ttsVoiceName,
    setTtsVoiceName,
    setFontSize,
    setLineHeight,
    setBackgroundTheme,
    setFontFamily,
    setWordSpacing,
    setLetterSpacing,
    setHighlightHue,
    setHighlightSaturation,
    setHighlightValue,
    setTextHue,
    setTextSaturation,
    setTextValue,
    setReadingAreaHue,
    setReadingAreaSaturation,
    setReadingAreaValue,
  } = useSettings();

  const theme = THEMES[backgroundTheme] || THEMES.light;
  const uiTextColor = theme.text;
  const readerTextColor = textColor;
  const resolvedFontFamily = FONT_FAMILY_MAP[fontFamily];
  const isDarkBackground = backgroundTheme === "dark";
  const uiButtonBg = isDarkBackground ? "#2B2B2B" : theme.highlight;
  const uiButtonIcon = uiTextColor;
  const statusBarBg = isDarkBackground ? "#2A2F37" : "#F3F7FC";
  const statusBarBorder = isDarkBackground ? "#46505E" : "#C8D4E5";
  const statusBarAccent = isDarkBackground ? "#9BC7FF" : "#2C5EA8";
  const windowWidth = Dimensions.get("window").width;
  const measuredWidth = containerWidth || windowWidth;
  const isLandscape = windowWidth > Dimensions.get("window").height;
  const lineHeightPx = Math.round(fontSize * lineHeight);
  const lineGap = Math.max(4, Math.round(lineHeightPx - fontSize));
  // Convert user spacing controls to stable visual pixels for layout/rendering.
  const effectiveWordGap = Math.max(0, Math.min(24, Number((wordSpacing * 1.8).toFixed(2))));
  const effectiveLetterSpacing = Number((letterSpacing * 0.7).toFixed(2));
  const approxCharWidth =
    (avgCharWidth || fontSize * 0.53) + effectiveLetterSpacing * 0.35;
  const paddingAllowance = fontSize >= 22 ? 14 : fontSize >= 18 ? 10 : 8;
  const safetyFactor = isLandscape
    ? fontSize >= 22
      ? 1.02
      : fontSize >= 18
        ? 1.05
        : 1.08
    : fontSize >= 22
      ? 0.98
      : fontSize >= 18
        ? 1.02
        : 1.05;
  const availableWidth = Math.max(
    120,
    measuredWidth - textBoxPadding * 2 - paddingAllowance
  );
  const maxCharsPerLine = Math.max(
    26,
    Math.floor((availableWidth * safetyFactor) / approxCharWidth)
  );

  const lines = useMemo(() => {
    return splitIntoLines(safeText, maxCharsPerLine);
  }, [safeText, maxCharsPerLine]);

  const lineWords = useMemo(() => {
    return lines.map((line) => line.split(/\s+/).filter(Boolean));
  }, [lines]);
  const lineWordStarts = useMemo(() => {
    const starts = [];
    let acc = 0;
    for (let i = 0; i < lineWords.length; i += 1) {
      starts.push(acc);
      acc += lineWords[i].length;
    }
    return starts;
  }, [lineWords]);
  const totalWordCount = useMemo(() => {
    if (!lineWords.length) return 0;
    const lastLine = lineWords[lineWords.length - 1] || [];
    return (lineWordStarts[lineWordStarts.length - 1] || 0) + lastLine.length;
  }, [lineWordStarts, lineWords]);
  const normalizedPartSearchQuery = partSearchQuery.trim().toLowerCase();
  const partSearchMatches = useMemo(() => {
    if (!normalizedPartSearchQuery) return [];
    const matches = [];
    for (let i = 0; i < segments.length; i += 1) {
      if (String(segments[i] || "").toLowerCase().includes(normalizedPartSearchQuery)) {
        matches.push(i);
      }
    }
    return matches;
  }, [segments, normalizedPartSearchQuery]);
  const currentMatchPart =
    partSearchCursor >= 0 && partSearchCursor < partSearchMatches.length
      ? partSearchMatches[partSearchCursor]
      : -1;
  const searchTokens = useMemo(() => {
    if (!normalizedPartSearchQuery) return [];
    return normalizedPartSearchQuery.split(/\s+/).filter(Boolean);
  }, [normalizedPartSearchQuery]);
  const isSearchWordMatch = useCallback(
    (word) => {
      if (!searchTokens.length) return false;
      const normalized = String(word || "")
        .toLowerCase()
        .replace(/^[^a-z0-9]+|[^a-z0-9]+$/g, "");
      if (!normalized) return false;
      return searchTokens.some((token) => normalized.includes(token));
    },
    [searchTokens]
  );

  const findFirstWordMatchInCurrentSegment = useCallback(
    (query) => {
      const tokens = String(query || "")
        .trim()
        .toLowerCase()
        .split(/\s+/)
        .map((token) =>
          token.replace(/^[^a-z0-9]+|[^a-z0-9]+$/g, "")
        )
        .filter(Boolean);
      if (!tokens.length) return null;

      const wordEntries = [];
      for (let lineIndex = 0; lineIndex < lineWords.length; lineIndex += 1) {
        const words = lineWords[lineIndex] || [];
        for (let wordIndex = 0; wordIndex < words.length; wordIndex += 1) {
          const normalizedWord = String(words[wordIndex] || "")
            .toLowerCase()
            .replace(/^[^a-z0-9]+|[^a-z0-9]+$/g, "");
          if (!normalizedWord) continue;
          wordEntries.push({ lineIndex, wordIndex, normalizedWord });
        }
      }
      if (!wordEntries.length) return null;

      const tokenMatches = (word, token) => word.includes(token);

      for (let i = 0; i < wordEntries.length; i += 1) {
        if (!tokenMatches(wordEntries[i].normalizedWord, tokens[0])) continue;
        if (tokens.length === 1) {
          return {
            lineIndex: wordEntries[i].lineIndex,
            wordIndex: wordEntries[i].wordIndex,
          };
        }

        let fullPhraseMatch = true;
        for (let j = 1; j < tokens.length; j += 1) {
          const candidate = wordEntries[i + j];
          if (!candidate || !tokenMatches(candidate.normalizedWord, tokens[j])) {
            fullPhraseMatch = false;
            break;
          }
        }
        if (fullPhraseMatch) {
          return {
            lineIndex: wordEntries[i].lineIndex,
            wordIndex: wordEntries[i].wordIndex,
          };
        }
      }

      return null;
    },
    [lineWords]
  );

  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  const setDraftColorSafe = (updater) => {
    setDraftColor((prev) => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      draftColorRef.current = next;
      return next;
    });
  };
  const hsvToHex = useCallback((h, s, v) => {
    const hue = ((Number(h) % 360) + 360) % 360;
    const sat = clamp(Number(s), 0, 1);
    const val = clamp(Number(v), 0, 1);
    const c = val * sat;
    const x = c * (1 - Math.abs(((hue / 60) % 2) - 1));
    const m = val - c;
    let r = 0;
    let g = 0;
    let b = 0;
    if (hue < 60) [r, g, b] = [c, x, 0];
    else if (hue < 120) [r, g, b] = [x, c, 0];
    else if (hue < 180) [r, g, b] = [0, c, x];
    else if (hue < 240) [r, g, b] = [0, x, c];
    else if (hue < 300) [r, g, b] = [x, 0, c];
    else [r, g, b] = [c, 0, x];
    const toHex = (v) =>
      Math.round((v + m) * 255)
        .toString(16)
        .padStart(2, "0");
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  }, []);
  const toRgba = (hex, alpha) => {
    const cleanHex = hex.replace("#", "");
    if (cleanHex.length !== 6) return `rgba(0, 0, 0, ${alpha})`;
    const r = parseInt(cleanHex.slice(0, 2), 16);
    const g = parseInt(cleanHex.slice(2, 4), 16);
    const b = parseInt(cleanHex.slice(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha.toFixed(2)})`;
  };
  const textPreviewColor = hsvToHex(textHue, textSaturation, textValue);
  const highlightBase = hsvToHex(highlightHue, highlightSaturation, highlightValue);
  const readingAreaBg = hsvToHex(
    readingAreaHue,
    readingAreaSaturation,
    readingAreaValue
  );
  const lineAlpha = clamp(0.18 + highlightStrength * 0.24, 0.18, 0.52);
  const wordAlpha = clamp(lineAlpha + 0.18, 0.30, 0.72);
  const lineHighlight = toRgba(highlightBase, lineAlpha);
  const wordHighlight = toRgba(highlightBase, wordAlpha);
  const wordTextColor = readerTextColor;
  const searchMatchBg = isDarkBackground
    ? "rgba(255, 215, 64, 0.36)"
    : "rgba(255, 235, 59, 0.55)";
  const stepAdjust = (value, step, min, max, direction) => {
    const next = Math.min(max, Math.max(min, value + direction * step));
    return Number(next.toFixed(2));
  };
  const SPEED_PRESETS = [0.6, 0.75, 0.9, 1.0, 1.25, 1.5];
  const buildHueStops = (saturation, value) => {
    const stops = [];
    for (let h = 0; h <= 360; h += 45) {
      stops.push(hsvToHex(h, saturation, value));
    }
    return stops;
  };
  const openVoiceSettings = async () => {
    if (Platform.OS === "android" && typeof Linking.sendIntent === "function") {
      try {
        await Linking.sendIntent("com.android.settings.TTS_SETTINGS");
        return;
      } catch {
        // Fallback below
      }
      try {
        await Linking.sendIntent("android.settings.TTS_SETTINGS");
        return;
      } catch {
        // Fallback below
      }
    }
    try {
      await Linking.openSettings();
    } catch {
      // no-op
    }
  };
  const blurInlineInputs = () => {
    partInputRef.current?.blur?.();
    searchInputRef.current?.blur?.();
  };
  const previewVoice = (voiceName = "") => {
    if (!useNativeTts) return;
    if (previewTimerRef.current) {
      clearTimeout(previewTimerRef.current);
      previewTimerRef.current = null;
    }
    isVoicePreviewingRef.current = true;
    const wasPlaying = isPlayingRef.current;
    setPreviewVoiceName(voiceName || "default");
    stopSpeech();
    if (wasPlaying) {
      setIsPlaying(false);
      setIsPaused(true);
    }
    setNativeVoice(voiceName || "");
    speakText("Hi, this is how this voice sounds.", readingSpeed, true, pitch);
    previewTimerRef.current = setTimeout(() => {
      isVoicePreviewingRef.current = false;
      setPreviewVoiceName("");
      setNativeVoice(ttsVoiceName || "");
      previewTimerRef.current = null;
    }, 1200);
  };
  const voiceLocaleLabel = useCallback((localeTag = "") => {
    const tag = String(localeTag).toLowerCase();
    if (tag.startsWith("en-in")) return "Eng (IN)";
    if (tag.startsWith("en-us")) return "Eng (US)";
    if (tag.startsWith("en-gb")) return "Eng (UK)";
    if (tag.startsWith("en-au")) return "Eng (AU)";
    if (tag.startsWith("en-ca")) return "Eng (CA)";
    if (tag.startsWith("en-ng")) return "Eng (NG)";
    if (tag.startsWith("en")) return "Eng";
    return "Voice";
  }, []);
  const buildVoiceLabel = useCallback((voice) => {
    const name = String(voice?.name || "");
    const locale = String(voice?.locale || "").toLowerCase();
    const base = voiceLocaleLabel(locale);
    const codeMatch = name.match(/-x-([a-z0-9]+)-local$/i);
    const variant = codeMatch?.[1] ? codeMatch[1].toUpperCase() : "";
    return variant ? `${base} ${variant}` : base;
  }, [voiceLocaleLabel]);
  // Derived from runtime voice metadata; memoized on source list.
  const normalizedVoices = useMemo(() => {
    const seen = new Set();
    const deduped = [];
    availableVoices.forEach((voice) => {
      const name = String(voice?.name || "");
      if (!name || seen.has(name)) return;
      seen.add(name);
      deduped.push({
        name,
        locale: String(voice?.locale || ""),
        label: buildVoiceLabel(voice),
      });
    });
    return deduped;
  }, [availableVoices, buildVoiceLabel]);
  const allVoices = useMemo(() => {
    return [...normalizedVoices].sort((a, b) => a.label.localeCompare(b.label));
  }, [normalizedVoices]);
  const recommendedVoices = useMemo(() => {
    const preferred = ["en-in", "en-us", "en-gb", "en-au", "en-ca"];
    const ranked = [...allVoices].sort((a, b) => {
      const aTag = a.locale.toLowerCase();
      const bTag = b.locale.toLowerCase();
      const aScore = preferred.findIndex((code) => aTag.startsWith(code));
      const bScore = preferred.findIndex((code) => bTag.startsWith(code));
      const aRank = aScore === -1 ? 99 : aScore;
      const bRank = bScore === -1 ? 99 : bScore;
      if (aRank !== bRank) return aRank - bRank;
      return a.label.localeCompare(b.label);
    });
    const picked = ranked.slice(0, 6);
    if (
      ttsVoiceName &&
      !picked.some((voice) => voice.name === ttsVoiceName)
    ) {
      const selected = ranked.find((voice) => voice.name === ttsVoiceName);
      if (selected) {
        return [selected, ...picked.slice(0, 5)];
      }
    }
    return picked;
  }, [allVoices, ttsVoiceName]);
  const recommendedVoiceSet = useMemo(() => {
    return new Set(recommendedVoices.map((voice) => voice.name));
  }, [recommendedVoices]);
  const extraVoices = useMemo(() => {
    return allVoices.filter((voice) => !recommendedVoiceSet.has(voice.name));
  }, [allVoices, recommendedVoiceSet]);
  const renderHueSlider = (value, onChange, onComplete, trackColors, onStart) => (
    <View style={styles.hueSliderWrap}>
      <View style={styles.hueTrack}>
        {trackColors.map((color, idx) => (
          <View key={`${color}-${idx}`} style={[styles.hueTrackStop, { backgroundColor: color }]} />
        ))}
      </View>
      <Slider
        style={styles.hueSlider}
        minimumValue={0}
        maximumValue={360}
        step={1}
        value={value}
        onSlidingStart={onStart}
        onValueChange={onChange}
        onSlidingComplete={onComplete}
        minimumTrackTintColor="transparent"
        maximumTrackTintColor="transparent"
        thumbTintColor={uiTextColor}
      />
    </View>
  );
  const colorTargets = {
    text: {
      hue: textHue,
      saturation: textSaturation,
      value: textValue,
      setHue: setTextHue,
      setSaturation: setTextSaturation,
      setValue: setTextValue,
      preview: textPreviewColor,
      label: "Text",
    },
    highlight: {
      hue: highlightHue,
      saturation: highlightSaturation,
      value: highlightValue,
      setHue: setHighlightHue,
      setSaturation: setHighlightSaturation,
      setValue: setHighlightValue,
      preview: highlightBase,
      label: "Highlight",
    },
    readingArea: {
      hue: readingAreaHue,
      saturation: readingAreaSaturation,
      value: readingAreaValue,
      setHue: setReadingAreaHue,
      setSaturation: setReadingAreaSaturation,
      setValue: setReadingAreaValue,
      preview: readingAreaBg,
      label: "Reading Area",
    },
  };
  const activeColor = colorTargets[activeColorTarget] || colorTargets.text;
  const activeInteractiveColor =
    isColorDragging || isHueSliding ? draftColor : activeColor;
  const activeHueTrackColors = buildHueStops(
    activeInteractiveColor.saturation,
    activeInteractiveColor.value
  );
  const SV_COLS = 18;
  const SV_ROWS = 10;
  // Shade grid intentionally keyed to hue changes for responsiveness while dragging.
  const activeShadeGrid = useMemo(() => {
    const rows = [];
    for (let r = 0; r < SV_ROWS; r += 1) {
      const v = 1 - r / (SV_ROWS - 1);
      const cols = [];
      for (let c = 0; c < SV_COLS; c += 1) {
        const s = c / (SV_COLS - 1);
        cols.push(hsvToHex(activeInteractiveColor.hue, s, v));
      }
      rows.push(cols);
    }
    return rows;
  }, [activeInteractiveColor.hue, hsvToHex]);
  const commitDraftColor = useCallback((override) => {
    const source = override
      ? { ...draftColorRef.current, ...override }
      : draftColorRef.current;
    activeColor.setHue(Number(source.hue.toFixed(0)));
    activeColor.setSaturation(Number(source.saturation.toFixed(3)));
    activeColor.setValue(Number(source.value.toFixed(3)));
  }, [activeColor]);
  const getSVFromPoint = useCallback((x, y) => {
    const width = Math.max(1, shadeBoxSize.width);
    const height = Math.max(1, shadeBoxSize.height);
    const clampedX = clamp(x, 0, width);
    const clampedY = clamp(y, 0, height);
    return {
      saturation: Number((clampedX / width).toFixed(3)),
      value: Number((1 - clampedY / height).toFixed(3)),
    };
  }, [shadeBoxSize.height, shadeBoxSize.width]);
  const updateActiveSVFromPoint = useCallback((x, y) => {
    const nextSV = getSVFromPoint(x, y);
    setDraftColorSafe((prev) => ({
      ...prev,
      ...nextSV,
    }));
  }, [getSVFromPoint]);
  const flushPendingShadeUpdate = useCallback(() => {
    if (!colorDragRafRef.current) return null;
    cancelAnimationFrame(colorDragRafRef.current);
    colorDragRafRef.current = null;
    const { x, y } = pendingShadePointRef.current;
    const nextSV = getSVFromPoint(x, y);
    setDraftColorSafe((prev) => ({
      ...prev,
      ...nextSV,
    }));
    return nextSV;
  }, [getSVFromPoint]);
  const queueActiveSVUpdate = useCallback((x, y) => {
    pendingShadePointRef.current = { x, y };
    if (colorDragRafRef.current) return;
    colorDragRafRef.current = requestAnimationFrame(() => {
      colorDragRafRef.current = null;
      const { x: px, y: py } = pendingShadePointRef.current;
      updateActiveSVFromPoint(px, py);
    });
  }, [updateActiveSVFromPoint]);
  // PanResponder callbacks are ref-driven; keep dependency surface minimal for touch smoothness.
  const shadePanResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: (event) => {
          setDraftColorSafe({
            hue: activeColor.hue,
            saturation: activeColor.saturation,
            value: activeColor.value,
          });
          setIsColorDragging(true);
          queueActiveSVUpdate(event.nativeEvent.locationX, event.nativeEvent.locationY);
        },
        onPanResponderMove: (event) => {
          queueActiveSVUpdate(event.nativeEvent.locationX, event.nativeEvent.locationY);
        },
        onPanResponderRelease: () => {
          const nextSV = flushPendingShadeUpdate();
          commitDraftColor(nextSV || undefined);
          setIsColorDragging(false);
        },
        onPanResponderTerminate: () => {
          const nextSV = flushPendingShadeUpdate();
          commitDraftColor(nextSV || undefined);
          setIsColorDragging(false);
        },
      }),
    [
      activeColor.hue,
      activeColor.saturation,
      activeColor.value,
      commitDraftColor,
      flushPendingShadeUpdate,
      queueActiveSVUpdate,
    ]
  );

  // Auto-follow uses live scroll refs; exhaustive deps cause jitter loops.
  useEffect(() => {
    if (isColorDragging || isHueSliding) return;
    setDraftColorSafe({
      hue: activeColor.hue,
      saturation: activeColor.saturation,
      value: activeColor.value,
    });
  }, [
    activeColorTarget,
    activeColor.hue,
    activeColor.saturation,
    activeColor.value,
    isColorDragging,
    isHueSliding,
  ]);

  // Cleanup timeout on unmount
  // Layout-mode recenter only; highlight refs intentionally read inside timer.
  useEffect(() => {
    return () => {
      stopSpeech();
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (toastTimerRef.current) {
        clearTimeout(toastTimerRef.current);
      }
      if (pendingHighlightTimerRef.current) {
        clearTimeout(pendingHighlightTimerRef.current);
      }
      if (recenterRetryTimerRef.current) {
        clearTimeout(recenterRetryTimerRef.current);
        recenterRetryTimerRef.current = null;
      }
      if (exactSearchRecenterTimerRef.current) {
        clearTimeout(exactSearchRecenterTimerRef.current);
        exactSearchRecenterTimerRef.current = null;
      }
      pendingSearchTargetRef.current = null;
      if (previewTimerRef.current) {
        clearTimeout(previewTimerRef.current);
        previewTimerRef.current = null;
      }
      isVoicePreviewingRef.current = false;
      if (colorDragRafRef.current) {
        cancelAnimationFrame(colorDragRafRef.current);
        colorDragRafRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    const unsubBlur = navigation.addListener("blur", () => {
      stopSpeech();
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      if (pendingHighlightTimerRef.current) {
        clearTimeout(pendingHighlightTimerRef.current);
        pendingHighlightTimerRef.current = null;
      }
      pendingHighlightRef.current = null;
      setIsPlaying(false);
      setIsPaused(false);
      setCurrentLineIndex(-1);
      setCurrentWordIndex(-1);
    });
    return unsubBlur;
  }, [navigation]);

  useEffect(() => {
    const showSub = Keyboard.addListener("keyboardDidShow", (event) => {
      const nextHeight = event?.endCoordinates?.height || 0;
      setKeyboardHeight(nextHeight);
    });
    const hideSub = Keyboard.addListener("keyboardDidHide", () => {
      setKeyboardHeight(0);
    });
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  // Resume is triggered by segment transitions and controlled runtime refs.
  useEffect(() => {
    currentLineIndexRef.current = currentLineIndex;
  }, [currentLineIndex]);
  useEffect(() => {
    currentWordIndexRef.current = currentWordIndex;
  }, [currentWordIndex]);

  // Native TTS listeners are ref-guarded to avoid false transitions from preview/demo.
  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  useEffect(() => {
    currentSegmentIndexRef.current = currentSegmentIndex;
  }, [currentSegmentIndex]);

  useEffect(() => {
    if (!normalizedPartSearchQuery) {
      if (partSearchCursor !== -1) setPartSearchCursor(-1);
      appliedSearchFocusKeyRef.current = "";
      return;
    }
    if (!partSearchMatches.length) {
      if (partSearchCursor !== -1) setPartSearchCursor(-1);
      appliedSearchFocusKeyRef.current = "";
      return;
    }
    if (partSearchCursor >= partSearchMatches.length) {
      setPartSearchCursor(-1);
    }
  }, [
    normalizedPartSearchQuery,
    partSearchMatches,
    partSearchCursor,
  ]);

  useEffect(() => {
    setPartInputValue(String(currentSegmentIndex + 1));
  }, [currentSegmentIndex]);

  useEffect(() => {
    setEditableFullText(initialFullText);
    setIsEditMode(false);
    setEditDraftText("");
  }, [initialFullText]);

  useEffect(() => {
    segmentCountRef.current = segments.length;
    setCurrentSegmentIndex((prev) => {
      if (prev < segments.length) return prev;
      return Math.max(0, segments.length - 1);
    });
  }, [segments.length]);

  useEffect(() => {
    resumeOnNextSegmentRef.current = false;
    setCurrentSegmentIndex(0);
    setIsSegmentLoading(false);
    setSegmentStatusMessage("");
    setPartSearchQuery("");
    setPartSearchCursor(-1);
  }, [initialFullText]);

  useEffect(() => {
    if (!isSegmentLoading) return;
    const token = segmentSwitchTokenRef.current;
    const timer = setTimeout(() => {
      if (segmentSwitchTokenRef.current !== token) return;
      setIsSegmentLoading(false);
      setSegmentStatusMessage("");
    }, 220);
    return () => clearTimeout(timer);
  }, [safeText, lines.length, isSegmentLoading]);

  useEffect(() => {
    if (!useNativeTts) return;
    let isActive = true;
    getNativeVoices().then((voices) => {
      if (!isActive) return;
      setAvailableVoices(voices);
    });
    return () => {
      isActive = false;
    };
  }, [useNativeTts]);

  useEffect(() => {
    if (!useNativeTts) return;
    setNativeVoice(ttsVoiceName || "");
  }, [useNativeTts, ttsVoiceName]);

  useEffect(() => {
    lineOffsetsRef.current = [];
    wordOffsetsRef.current = [];
    wordRefsRef.current = [];
    lineHeightsRef.current = [];
    lineLayoutSignatureRef.current = [];
    wordLayoutSignatureRef.current = [];
    pendingSearchTargetRef.current = null;
    scrollYRef.current = 0;
    scrollContentHeightRef.current = 0;
    setCurrentLineIndex(-1);
    setCurrentWordIndex(-1);
    let isActive = true;
    setIsSaved(false);
    isTextSaved(fullText).then((saved) => {
      if (isActive) setIsSaved(saved);
    });
    return () => {
      isActive = false;
    };
  }, [safeText, fullText]);

  useEffect(() => {
    // Invalidate cached row/word anchors when wrapping metrics change.
    lineOffsetsRef.current = [];
    wordOffsetsRef.current = [];
    wordRefsRef.current = [];
    lineHeightsRef.current = [];
    lineLayoutSignatureRef.current = [];
    wordLayoutSignatureRef.current = [];
    pendingSearchTargetRef.current = null;
  }, [safeText, maxCharsPerLine, lineHeightPx, effectiveWordGap, effectiveLetterSpacing]);

  const getLineRole = (line) => {
    const value = (line || "").trim();
    if (!value) return "paragraph";
    if (/^(\-|\*|\u2022|[0-9]+[\.\)]|[A-Za-z][\.\)])\s+/.test(value)) return "list";
    if (/^(Q\.?\s*[0-9]+[\.\)]|Question\s+[0-9]+[:.]?)/i.test(value)) return "list";
    if (value.length <= 80 && /[:]\s*$/.test(value)) return "heading";
    if (value.length <= 70 && /^[A-Z][A-Z0-9\s\-:,&()/.]+$/.test(value)) return "heading";
    return "paragraph";
  };

  const COMMON_SHORT_WORDS = useMemo(
    () =>
      new Set([
        "a",
        "an",
        "and",
        "as",
        "at",
        "be",
        "by",
        "for",
        "in",
        "is",
        "it",
        "of",
        "on",
        "or",
        "so",
        "the",
        "to",
        "up",
        "we",
      ]),
    []
  );

  const getWordHoldMs = (lineIndex, wordIndex) => {
    const word = lineWords[lineIndex]?.[wordIndex] || "";
    const plainWord = word.toLowerCase().replace(/[^a-z0-9]/g, "");
    const coreLength = plainWord.length;
    const endsSoftPause = /[,;:]$/.test(word);
    const endsHardPause = /[.!?]$/.test(word);

    const base = Math.max(95, Math.min(220, Math.round(120 / readingSpeed)));
    let hold = base;

    if (coreLength <= 2) hold += 90;
    else if (coreLength <= 4) hold += 55;
    else if (coreLength >= 8) hold -= 15;

    if (COMMON_SHORT_WORDS.has(plainWord)) hold += 45;
    if (endsSoftPause) hold += 90;
    if (endsHardPause) hold += 140;

    return Math.max(110, Math.min(380, hold));
  };

  const getHighlightAnchorY = (lineIndex, wordIndex) => {
    const fallbackByContentProgress = () => {
      const contentHeight = scrollContentHeightRef.current || 0;
      if (contentHeight > 0 && lineWords.length > 1) {
        const progress = clamp(lineIndex / (lineWords.length - 1), 0, 1);
        return progress * contentHeight;
      }
      return lineIndex * (lineHeightPx + lineGap + 4);
    };

    const measuredY = lineOffsetsRef.current[lineIndex];
    const measuredWordY = wordOffsetsRef.current[lineIndex]?.[wordIndex];
    if (Number.isFinite(measuredY) && Number.isFinite(measuredWordY)) {
      return measuredY + measuredWordY;
    }

    const measuredHeight = lineHeightsRef.current[lineIndex];
    const lineStartY = Number.isFinite(measuredY) ? measuredY : fallbackByContentProgress();
    if (!Number.isFinite(measuredHeight) || measuredHeight <= lineHeightPx + 2) return lineStartY;

    const words = lineWords[lineIndex] || [];
    if (!words.length || wordIndex < 0) return lineStartY;

    const approxRows = Math.max(1, Math.round(measuredHeight / Math.max(1, lineHeightPx)));
    if (approxRows <= 1) return lineStartY;

    const ratio = words.length <= 1 ? 0 : wordIndex / (words.length - 1);
    const rowIndex = Math.min(approxRows - 1, Math.max(0, Math.floor(ratio * approxRows)));
    const measuredAnchor = lineStartY + rowIndex * lineHeightPx;
    return Number.isFinite(measuredAnchor) ? measuredAnchor : fallbackByContentProgress();
  };
  const getMeasuredHighlightAnchorY = (lineIndex, wordIndex) => {
    const currentLine = String(lines[lineIndex] || "");
    const currentWord = String(lineWords[lineIndex]?.[wordIndex] || "");
    if (!currentLine || !currentWord) return NaN;
    const measuredLineSignature = lineLayoutSignatureRef.current[lineIndex];
    const measuredWordSignature =
      wordLayoutSignatureRef.current[lineIndex]?.[wordIndex];
    if (measuredLineSignature !== currentLine) return NaN;
    if (measuredWordSignature !== currentWord) return NaN;
    const measuredY = lineOffsetsRef.current[lineIndex];
    const measuredWordY = wordOffsetsRef.current[lineIndex]?.[wordIndex];
    if (Number.isFinite(measuredY) && Number.isFinite(measuredWordY)) {
      return measuredY + measuredWordY;
    }
    return NaN;
  };
  const recenterToExactWord = useCallback((lineIndex, wordIndex, attempt = 0) => {
    const wordRef = wordRefsRef.current[lineIndex]?.[wordIndex];
    const contentRef = scrollContentRef.current;
    if (!scrollViewRef.current || lineIndex < 0 || wordIndex < 0) return;
    if (
      !wordRef ||
      !contentRef ||
      typeof wordRef.measureLayout !== "function"
    ) {
      if (attempt >= 12) return;
      if (exactSearchRecenterTimerRef.current) {
        clearTimeout(exactSearchRecenterTimerRef.current);
      }
      exactSearchRecenterTimerRef.current = setTimeout(() => {
        recenterToExactWord(lineIndex, wordIndex, attempt + 1);
      }, 45);
      return;
    }
    wordRef.measureLayout(
      contentRef,
      (_x, y, _width, height) => {
        if (exactSearchRecenterTimerRef.current) {
          clearTimeout(exactSearchRecenterTimerRef.current);
          exactSearchRecenterTimerRef.current = null;
        }
        const viewportHeight = scrollViewportHeightRef.current || 0;
        const anchorY = y + (Number(height) > 0 ? height * 0.5 : lineHeightPx * 0.5);
        const targetY =
          viewportHeight > 0
            ? Math.max(0, anchorY - viewportHeight * 0.5)
            : Math.max(0, anchorY);
        scrollViewRef.current?.scrollTo({ y: targetY, animated: false });
        scrollYRef.current = targetY;
      },
      () => {
        if (attempt >= 12) return;
        if (exactSearchRecenterTimerRef.current) {
          clearTimeout(exactSearchRecenterTimerRef.current);
        }
        exactSearchRecenterTimerRef.current = setTimeout(() => {
          recenterToExactWord(lineIndex, wordIndex, attempt + 1);
        }, 45);
      }
    );
  }, [lineHeightPx]);

  useEffect(() => {
    if (!scrollViewRef.current || currentLineIndex < 0) return;
    if (!isPlaying) return;
    if (isUserDraggingRef.current) return;
    if (Date.now() < manualScrollHoldUntilRef.current) return;
    const y = getHighlightAnchorY(currentLineIndex, currentWordIndex);
    if (!Number.isFinite(y)) return;
    const viewportHeight = scrollViewportHeightRef.current || 0;
    if (viewportHeight <= 0) return;
    const currentScrollY = scrollYRef.current || 0;
    const followThreshold = currentScrollY + viewportHeight * 0.48;
    // Keep the active highlight around upper/mid viewport, not near bottom.
    if (y <= followThreshold) return;
    const desiredY = Math.max(0, y - viewportHeight * 0.30);
    const targetY = Math.max(currentScrollY, desiredY);
    if (Math.abs(targetY - currentScrollY) < 3) return;
    scrollViewRef.current.scrollTo({
      y: targetY,
      animated: false,
    });
    scrollYRef.current = targetY;
  }, [currentLineIndex, currentWordIndex, isPlaying, isFullScreen, lineGap, lineHeightPx]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!scrollViewRef.current) return;
    if (isUserDraggingRef.current) return;
    const lineIndex = currentLineIndexRef.current;
    const wordIndex = currentWordIndexRef.current;
    if (lineIndex < 0) return;
    // Run only when layout mode changes, not on every highlight update.
    // Do not clear measured offsets here; clearing can permanently lose layout anchors
    // if React Native doesn't emit onLayout again for unchanged rows.
    const timer = setTimeout(() => {
      const anchorY = getHighlightAnchorY(lineIndex, wordIndex);
      const estimatedY =
        Number.isFinite(anchorY) && anchorY >= 0
          ? anchorY
          : lineIndex * (lineHeightPx + lineGap + 4);
      const targetY = Math.max(0, estimatedY - (isFullScreen ? 64 : 40));
      scrollViewRef.current?.scrollTo({
        y: targetY,
        animated: false,
      });
      scrollYRef.current = targetY;
    }, 80);
    return () => clearTimeout(timer);
  }, [isFullScreen, lineGap, lineHeightPx]); // eslint-disable-line react-hooks/exhaustive-deps

  const recenterToCurrentHighlight = (
    animated = true,
    lineIndexOverride = null,
    wordIndexOverride = null,
    attempt = 0,
    options = {}
  ) => {
    const { strictMeasured = false, centerInView = false } = options;
    const lineIndex =
      Number.isInteger(lineIndexOverride) && lineIndexOverride >= 0
        ? lineIndexOverride
        : currentLineIndexRef.current;
    const wordIndex =
      Number.isInteger(wordIndexOverride) && wordIndexOverride >= 0
        ? wordIndexOverride
        : currentWordIndexRef.current;
    if (!scrollViewRef.current || lineIndex < 0) return;
    const measuredY = getMeasuredHighlightAnchorY(lineIndex, wordIndex);
    const y = strictMeasured
      ? measuredY
      : Number.isFinite(measuredY)
        ? measuredY
        : getHighlightAnchorY(lineIndex, wordIndex);
    if (!Number.isFinite(y)) {
      if (attempt >= 12) return;
      if (recenterRetryTimerRef.current) {
        clearTimeout(recenterRetryTimerRef.current);
      }
      recenterRetryTimerRef.current = setTimeout(() => {
        recenterToCurrentHighlight(
          false,
          lineIndex,
          wordIndex,
          attempt + 1,
          options
        );
      }, 45);
      return;
    }
    if (recenterRetryTimerRef.current) {
      clearTimeout(recenterRetryTimerRef.current);
      recenterRetryTimerRef.current = null;
    }
    const viewportHeight = scrollViewportHeightRef.current || 0;
    let targetY = 0;
    if (centerInView && viewportHeight > 0) {
      targetY = Math.max(
        0,
        y - Math.max(8, viewportHeight * 0.5 - lineHeightPx * 0.5)
      );
    } else {
      const baseOffset = isFullScreen ? 84 : 56;
      targetY = Math.max(0, y - Math.max(baseOffset, viewportHeight * 0.35));
    }
    scrollViewRef.current.scrollTo({ y: targetY, animated });
    scrollYRef.current = targetY;
  };
  recenterToCurrentHighlightRef.current = recenterToCurrentHighlight;

  useEffect(() => {
    if (isFullScreen) {
      setShowSpeedPanel(false);
      setShowQuickSettings(false);
      setSettingsTab("fonts");
    }
  }, [isFullScreen]);

  const jumpToSegment = (
    segmentIndex,
    resumePlayback = false,
    statusMessage = "",
    forceIfSame = false
  ) => {
    const maxIndex = Math.max(0, segmentCountRef.current - 1);
    const clamped = Math.max(0, Math.min(maxIndex, segmentIndex));
    if (clamped === currentSegmentIndexRef.current && !resumePlayback) {
      if (!forceIfSame) return false;
      // For in-segment search jumps, keep current scroll and let exact recenter handle positioning.
      return true;
    }
    if (resumePlayback) {
      resumeOnNextSegmentRef.current = true;
    }
    const switchToken = Date.now();
    segmentSwitchTokenRef.current = switchToken;
    setIsSegmentLoading(true);
    setSegmentStatusMessage(
      statusMessage || `Loading part ${clamped + 1} of ${segmentCountRef.current}...`
    );
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (segmentSwitchTokenRef.current !== switchToken) return;
        setCurrentSegmentIndex(clamped);
      });
    });
    return true;
  };

  const moveToNextSegment = (resumePlayback = false, statusMessage = "") => {
    const next = currentSegmentIndexRef.current + 1;
    if (next >= segmentCountRef.current) return false;
    return jumpToSegment(next, resumePlayback, statusMessage);
  };

  const moveToPrevSegment = (statusMessage = "") => {
    const prev = currentSegmentIndexRef.current - 1;
    if (prev < 0) return false;
    return jumpToSegment(prev, false, statusMessage);
  };
  moveToNextSegmentRef.current = moveToNextSegment;

  const stopPlaybackForManualPartSwitch = () => {
    stopSpeech();
    stopHighlighting();
    setIsPlaying(false);
    setIsPaused(false);
  };

  const navigateToSegmentManually = (
    segmentIndex,
    statusMessage = "",
    forceIfSame = false
  ) => {
    const moved = jumpToSegment(segmentIndex, false, statusMessage, forceIfSame);
    if (moved) {
      stopPlaybackForManualPartSwitch();
    }
    return moved;
  };

  const commitManualPartInput = () => {
    const trimmed = String(partInputValue || "").trim();
    const parsed = Number.parseInt(trimmed, 10);
    if (!Number.isFinite(parsed)) {
      setPartInputValue(String(currentSegmentIndex + 1));
      return;
    }
    const clamped = Math.min(Math.max(parsed, 1), segments.length);
    setPartInputValue(String(clamped));
    if (clamped - 1 !== currentSegmentIndex) {
      navigateToSegmentManually(clamped - 1, `Opening part ${clamped}...`);
    }
  };

  const jumpToSearchMatch = (cursorIndex) => {
    if (
      cursorIndex < 0 ||
      cursorIndex >= partSearchMatches.length
    ) {
      return;
    }
    const targetPart = partSearchMatches[cursorIndex];
    setPartSearchCursor(cursorIndex);
    navigateToSegmentManually(
      targetPart,
      `Opening match ${cursorIndex + 1} of ${partSearchMatches.length}...`,
      true
    );
  };

  const goToNextSearchMatch = () => {
    if (!partSearchMatches.length) return;
    if (partSearchCursor < 0) {
      jumpToSearchMatch(0);
      return;
    }
    const next = (partSearchCursor + 1) % partSearchMatches.length;
    jumpToSearchMatch(next);
  };

  const goToPrevSearchMatch = () => {
    if (!partSearchMatches.length) return;
    if (partSearchCursor < 0) {
      jumpToSearchMatch(partSearchMatches.length - 1);
      return;
    }
    const start = partSearchCursor;
    const prev =
      (start - 1 + partSearchMatches.length) % partSearchMatches.length;
    jumpToSearchMatch(prev);
  };

  useEffect(() => {
    if (!resumeOnNextSegmentRef.current) return;
    resumeOnNextSegmentRef.current = false;
    const timer = setTimeout(() => {
      if (!lineWords.length) {
        setIsPlaying(false);
        setIsPaused(false);
        return;
      }
      setIsPlaying(true);
      setIsPaused(false);
      const speechPayload = buildSpeechMap(0, 0);
      speechMapRef.current = speechPayload.map;
      speechMapIndexRef.current = 0;
      speakText(speechPayload.text, readingSpeed, useNativeTts, pitch);
      if (!useNativeTts) {
        startHighlighting(0, 0);
      }
      recenterToCurrentHighlight(false);
    }, 90);
    return () => clearTimeout(timer);
  }, [safeText, lineWords.length, readingSpeed, useNativeTts, pitch]); // eslint-disable-line react-hooks/exhaustive-deps

  const handlePlayPause = () => {
    if (isPlaying) {
      handlePause();
    } else {
      handlePlay();
    }
  };

  const seekToPosition = (lineIndex, wordIndex = 0) => {
    const words = lineWords[lineIndex] || [];
    if (!words.length) return;

    const safeWordIndex = Math.min(Math.max(0, wordIndex), words.length - 1);
    const wasPlaying = isPlaying;

    stopSpeech();
    stopHighlighting();
    if (pendingHighlightTimerRef.current) {
      clearTimeout(pendingHighlightTimerRef.current);
      pendingHighlightTimerRef.current = null;
    }
    pendingHighlightRef.current = null;
    speechMapRef.current = [];
    speechMapIndexRef.current = 0;

    setCurrentLineIndex(lineIndex);
    setCurrentWordIndex(safeWordIndex);

    if (!wasPlaying) return;

    setIsPlaying(true);
    setIsPaused(false);
    const speechPayload = buildSpeechMap(lineIndex, safeWordIndex);
    speechMapRef.current = speechPayload.map;
    speechMapIndexRef.current = 0;
    speakText(speechPayload.text, readingSpeed, useNativeTts, pitch);
    if (!useNativeTts) {
      startHighlighting(lineIndex, safeWordIndex);
    }
  };
  seekToPositionRef.current = seekToPosition;

  useEffect(() => {
    if (!normalizedPartSearchQuery) return;
    if (partSearchCursor < 0) return;
    if (currentMatchPart !== currentSegmentIndex) return;
    let settleTimer = null;
    const applyKey = `${normalizedPartSearchQuery}:${currentSegmentIndex}:${partSearchCursor}`;
    if (appliedSearchFocusKeyRef.current === applyKey) return;
    const matchPosition = findFirstWordMatchInCurrentSegment(
      normalizedPartSearchQuery
    );
    appliedSearchFocusKeyRef.current = applyKey;
    if (!matchPosition) return;
    pendingSearchTargetRef.current = {
      key: applyKey,
      lineIndex: matchPosition.lineIndex,
      wordIndex: matchPosition.wordIndex,
    };
    seekToPositionRef.current?.(matchPosition.lineIndex, matchPosition.wordIndex);
    requestAnimationFrame(() => {
      recenterToExactWord(matchPosition.lineIndex, matchPosition.wordIndex, 0);
      recenterToCurrentHighlightRef.current?.(
        false,
        matchPosition.lineIndex,
        matchPosition.wordIndex,
        0,
        { strictMeasured: true, centerInView: true }
      );
      settleTimer = setTimeout(() => {
        recenterToExactWord(matchPosition.lineIndex, matchPosition.wordIndex, 0);
        recenterToCurrentHighlightRef.current?.(
          false,
          matchPosition.lineIndex,
          matchPosition.wordIndex,
          0,
          { strictMeasured: true, centerInView: true }
        );
      }, 120);
    });
    return () => {
      if (settleTimer) clearTimeout(settleTimer);
    };
  }, [
    normalizedPartSearchQuery,
    partSearchCursor,
    currentMatchPart,
    currentSegmentIndex,
    findFirstWordMatchInCurrentSegment,
    recenterToExactWord,
  ]);

  const buildSpeechMap = (startLine, startWord) => {
    const map = [];
    let cursor = 0;
    let first = true;
    for (let lineIndex = startLine; lineIndex < lineWords.length; lineIndex += 1) {
      const words = lineWords[lineIndex] || [];
      const startAt = lineIndex === startLine ? startWord : 0;
      for (let wordIndex = startAt; wordIndex < words.length; wordIndex += 1) {
        const word = words[wordIndex];
        if (!first) {
          cursor += 1;
        }
        const start = cursor;
        cursor += word.length;
        map.push({ start, end: cursor, lineIndex, wordIndex });
        first = false;
      }
    }
    const text = map.map((item) => lineWords[item.lineIndex][item.wordIndex]).join(" ");
    return { text, map };
  };

  const handlePlay = () => {
    try {
      if (isSegmentLoading || !lines.length) return;
      const startLineIndex = currentLineIndex >= 0 ? currentLineIndex : 0;
      const startWordIndex = currentWordIndex >= 0 ? currentWordIndex : 0;
      const speechPayload = buildSpeechMap(startLineIndex, startWordIndex);
      if (!speechPayload.text || !speechPayload.text.trim()) {
        setIsPlaying(false);
        setIsPaused(false);
        return;
      }
      setIsPlaying(true);
      setIsPaused(false);
      speechMapRef.current = speechPayload.map;
      speechMapIndexRef.current = 0;
      speakText(speechPayload.text, readingSpeed, useNativeTts, pitch);
      if (!useNativeTts) {
        startHighlighting(startLineIndex, startWordIndex);
      }
    } catch (error) {
      console.error("Error during playback:", error);
      setIsPlaying(false);
    }
  };

  const handlePause = () => {
    try {
      stopSpeech();
      if (pendingHighlightTimerRef.current) {
        clearTimeout(pendingHighlightTimerRef.current);
        pendingHighlightTimerRef.current = null;
      }
      pendingHighlightRef.current = null;
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

  const handleBackward = () => {
    if (!lines.length || !totalWordCount) return;
    const wordsPerLineEstimate = Math.max(
      3,
      Math.min(12, Math.round(maxCharsPerLine / 7))
    );
    const stepWords = wordsPerLineEstimate;
    const baseLine = currentLineIndex >= 0 ? currentLineIndex : 0;
    const baseWord = currentWordIndex >= 0 ? currentWordIndex : 0;
    const currentFlat = Math.max(
      0,
      Math.min(
        totalWordCount - 1,
        (lineWordStarts[baseLine] || 0) + baseWord
      )
    );
    const targetFlat = Math.max(0, currentFlat - stepWords);

    let targetLine = 0;
    for (let i = lineWordStarts.length - 1; i >= 0; i -= 1) {
      if (lineWordStarts[i] <= targetFlat) {
        targetLine = i;
        break;
      }
    }
    const targetWord = Math.max(0, targetFlat - (lineWordStarts[targetLine] || 0));

    setCurrentLineIndex(targetLine);
    setCurrentWordIndex(targetWord);
    if (!isPlaying) return;
    stopSpeech();
    const speechPayload = buildSpeechMap(targetLine, targetWord);
    speechMapRef.current = speechPayload.map;
    speechMapIndexRef.current = 0;
    speakText(speechPayload.text, readingSpeed, useNativeTts, pitch);
    if (!useNativeTts) {
      startHighlighting(targetLine, targetWord);
    }
  };

  const handleForward = () => {
    if (!lines.length || !totalWordCount) return;
    const wordsPerLineEstimate = Math.max(
      3,
      Math.min(12, Math.round(maxCharsPerLine / 7))
    );
    const stepWords = wordsPerLineEstimate;
    const baseLine = currentLineIndex >= 0 ? currentLineIndex : 0;
    const baseWord = currentWordIndex >= 0 ? currentWordIndex : 0;
    const currentFlat = Math.max(
      0,
      Math.min(
        totalWordCount - 1,
        (lineWordStarts[baseLine] || 0) + baseWord
      )
    );
    const forwardTarget = currentFlat + stepWords;
    if (forwardTarget >= totalWordCount) {
      if (
        moveToNextSegment(isPlaying, "Loading next part...")
      ) {
        setCurrentLineIndex(-1);
        setCurrentWordIndex(-1);
        if (isPlaying) {
          stopSpeech();
          stopHighlighting();
          resumeOnNextSegmentRef.current = true;
        }
      }
      return;
    }

    const targetFlat = Math.max(0, forwardTarget);
    let targetLine = 0;
    for (let i = lineWordStarts.length - 1; i >= 0; i -= 1) {
      if (lineWordStarts[i] <= targetFlat) {
        targetLine = i;
        break;
      }
    }
    const targetWord = Math.max(0, targetFlat - (lineWordStarts[targetLine] || 0));

    setCurrentLineIndex(targetLine);
    setCurrentWordIndex(targetWord);
    if (!isPlaying) return;
    stopSpeech();
    const speechPayload = buildSpeechMap(targetLine, targetWord);
    speechMapRef.current = speechPayload.map;
    speechMapIndexRef.current = 0;
    speakText(speechPayload.text, readingSpeed, useNativeTts, pitch);
    if (!useNativeTts) {
      startHighlighting(targetLine, targetWord);
    }
  };

  const applySpeedChange = (nextSpeed) => {
    const safeSpeed = Number(nextSpeed.toFixed(2));
    setReadingSpeed(safeSpeed);
    if (!isPlaying) return;
    stopSpeech();
    stopHighlighting();
    if (pendingHighlightTimerRef.current) {
      clearTimeout(pendingHighlightTimerRef.current);
      pendingHighlightTimerRef.current = null;
    }
    pendingHighlightRef.current = null;
    setTimeout(() => {
      setIsPlaying(true);
      const resumeLine = currentLineIndex >= 0 ? currentLineIndex : 0;
      const resumeWord = currentWordIndex >= 0 ? currentWordIndex : 0;
      const speechPayload = buildSpeechMap(resumeLine, resumeWord);
      speechMapRef.current = speechPayload.map;
      speechMapIndexRef.current = 0;
      speakText(speechPayload.text, safeSpeed, useNativeTts, pitch);
      if (!useNativeTts) {
        startHighlighting(resumeLine, resumeWord);
      }
    }, 90);
  };

  const startHighlighting = (startIndex = 0, startWord = 0) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    const advanceWord = (lineIndex, wordIndex) => {
      if (lineIndex >= lineWords.length) {
        stopSpeech();
        if (moveToNextSegment(true, "Loading next part...")) {
          return;
        }
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

      const delay = getWordHoldMs(lineIndex, wordIndex);
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

  const applyPitchChange = (nextPitch) => {
    const safePitch = Number(nextPitch.toFixed(2));
    setPitch(safePitch);
    if (!isPlaying) return;
    stopSpeech();
    stopHighlighting();
    if (pendingHighlightTimerRef.current) {
      clearTimeout(pendingHighlightTimerRef.current);
      pendingHighlightTimerRef.current = null;
    }
    pendingHighlightRef.current = null;
    setTimeout(() => {
      setIsPlaying(true);
      const resumeLine = currentLineIndex >= 0 ? currentLineIndex : 0;
      const resumeWord = currentWordIndex >= 0 ? currentWordIndex : 0;
      const speechPayload = buildSpeechMap(resumeLine, resumeWord);
      speechMapRef.current = speechPayload.map;
      speechMapIndexRef.current = 0;
      speakText(speechPayload.text, readingSpeed, useNativeTts, safePitch);
      if (!useNativeTts) {
        startHighlighting(resumeLine, resumeWord);
      }
    }, 90);
  };

  const stopHighlighting = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setCurrentLineIndex(-1);
    setCurrentWordIndex(-1);
  };

  useEffect(() => {
    if (!useNativeTts || !ttsEventEmitter) return undefined;
    const rangeSub = ttsEventEmitter.addListener("tts-range", ({ start }) => {
      if (isVoicePreviewingRef.current || !isPlayingRef.current) return;
      const map = speechMapRef.current;
      let idx = speechMapIndexRef.current;
      while (idx < map.length && start >= map[idx].end) {
        idx += 1;
      }
      if (idx < map.length) {
        speechMapIndexRef.current = idx;
        const item = map[idx];
        setCurrentLineIndex(item.lineIndex);
        setCurrentWordIndex(item.wordIndex);
        lastHighlightTsRef.current = Date.now();
      }
    });
    const doneSub = ttsEventEmitter.addListener("tts-done", () => {
      if (isVoicePreviewingRef.current || !isPlayingRef.current) return;
      if (pendingHighlightTimerRef.current) {
        clearTimeout(pendingHighlightTimerRef.current);
        pendingHighlightTimerRef.current = null;
      }
      pendingHighlightRef.current = null;
      if (moveToNextSegmentRef.current?.(true, "Loading next part...")) {
        return;
      }
      setIsPlaying(false);
      setIsPaused(false);
      setCurrentLineIndex(-1);
      setCurrentWordIndex(-1);
    });
    const errSub = ttsEventEmitter.addListener("tts-error", () => {
      if (isVoicePreviewingRef.current || !isPlayingRef.current) return;
      if (pendingHighlightTimerRef.current) {
        clearTimeout(pendingHighlightTimerRef.current);
        pendingHighlightTimerRef.current = null;
      }
      pendingHighlightRef.current = null;
      setIsPlaying(false);
      setIsPaused(false);
    });
    return () => {
      if (pendingHighlightTimerRef.current) {
        clearTimeout(pendingHighlightTimerRef.current);
        pendingHighlightTimerRef.current = null;
      }
      pendingHighlightRef.current = null;
      rangeSub.remove();
      doneSub.remove();
      errSub.remove();
    };
  }, [useNativeTts]);

  const showTransientNotice = (message, durationMs = 1400) => {
    setSaveNotice(message);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setSaveNotice(""), durationMs);
  };

  const handleStartEdit = () => {
    if (isSegmentLoading || isSaving) return;
    stopSpeech();
    stopHighlighting();
    setIsPlaying(false);
    setIsPaused(false);
    setShowSpeedPanel(false);
    setShowQuickSettings(false);
    setEditDraftText(safeText);
    setIsEditMode(true);
    requestAnimationFrame(() => {
      editInputRef.current?.focus?.();
    });
  };

  const handleCancelEdit = () => {
    setIsEditMode(false);
    setEditDraftText("");
  };

  const handleApplyEdit = () => {
    if (!isEditMode) return;
    const nextSegmentText = String(editDraftText || "");
    if (nextSegmentText === safeText) {
      handleCancelEdit();
      return;
    }
    const nextSegments = [...segments];
    nextSegments[currentSegmentIndex] = nextSegmentText;
    const rebuilt = nextSegments.join("\n\n").slice(0, MAX_TOTAL_CHARS);
    setEditableFullText(rebuilt);
    setIsEditMode(false);
    setEditDraftText("");
    showTransientNotice("Edits applied", 1200);
  };

  const handleSave = async () => {
    if (!fullText || !fullText.trim() || isSaving) return;
    const targetFolder = String(
      showSaveNewFolderInput ? saveFolderInput : selectedSaveFolder
    )
      .trim();
    const targetTitle = String(saveTitleInput || "").trim();
    setShowSaveFolderPicker(false);
    setShowSaveNewFolderInput(false);
    setSaveFolderInput("");
    setSaveTitleInput("");
    setIsSaving(true);
    setSaveNotice("Saving...");
    try {
      await addSavedText(fullText, targetTitle || undefined, {
        folder: targetFolder || "",
      });
      setIsSaved(true);
      setSaveNotice("Saved");
    } catch (_error) {
      setSaveNotice("Save failed");
    } finally {
      setIsSaving(false);
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
      toastTimerRef.current = setTimeout(() => setSaveNotice(""), 1400);
    }
  };

  const openSaveFolderPicker = async () => {
    if (!fullText || !fullText.trim() || isSaving) return;
    if (isSaved) {
      setSaveNotice("Already saved");
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
      toastTimerRef.current = setTimeout(() => setSaveNotice(""), 1400);
      return;
    }

    setSelectedSaveFolder("");
    setShowSaveNewFolderInput(false);
    setSaveFolderInput("");
    setSaveTitleInput(
      String(fullText || "")
        .trim()
        .split(/\s+/)
        .slice(0, 6)
        .join(" ")
    );
    setShowSaveFolderPicker(true);
    setIsSaveFolderLoading(true);
    try {
      const saved = await getSavedTexts();
      const uniqueFolders = [
        ...new Set(
          saved
            .map((item) => String(item?.folder || "").trim())
            .filter(Boolean)
        ),
      ].sort((a, b) => a.localeCompare(b));
      setSaveFolderOptions(uniqueFolders);
    } catch (_error) {
      setSaveFolderOptions([]);
    } finally {
      setIsSaveFolderLoading(false);
    }
  };

  return (
    <SafeAreaView
      style={[
        styles.container,
        isFullScreen && styles.containerFull,
        { backgroundColor: theme.background },
      ]}
    >
      {!isFullScreen && (
        <TouchableOpacity
          style={[
            styles.backButton,
            {
              top: insets.top + 6,
              backgroundColor: uiButtonBg,
              borderColor: theme.border,
              borderWidth: 1,
            },
          ]}
          onPress={() => navigation.goBack()}
          accessibilityLabel="Go back"
        >
          <MaterialIcons name="arrow-back" size={18} color={uiButtonIcon} />
        </TouchableOpacity>
      )}

      {!isFullScreen && (
        <View style={styles.topActions}>
          <TouchableOpacity
            style={[
              styles.themeButton,
              {
                backgroundColor: uiButtonBg,
                borderColor: theme.border,
                borderWidth: 1,
              },
            ]}
            onPress={() =>
              setBackgroundTheme(backgroundTheme === "dark" ? "light" : "dark")
            }
            accessibilityLabel="Toggle theme"
            >
              <MaterialIcons
                name={backgroundTheme === "dark" ? "light-mode" : "dark-mode"}
                size={17}
                color={uiButtonIcon}
              />
            </TouchableOpacity>
          {isEditMode && (
            <TouchableOpacity
              style={[
                styles.editButton,
                {
                  backgroundColor: uiButtonBg,
                  borderColor: theme.border,
                  borderWidth: 1,
                },
              ]}
              onPress={handleCancelEdit}
              accessibilityLabel="Cancel editing"
            >
              <MaterialIcons name="close" size={16} color={uiButtonIcon} />
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[
              styles.editButton,
              (isSaving || isSegmentLoading) && styles.topButtonDisabled,
              {
                backgroundColor: uiButtonBg,
                borderColor: theme.border,
                borderWidth: 1,
              },
            ]}
            onPress={isEditMode ? handleApplyEdit : handleStartEdit}
            accessibilityLabel={isEditMode ? "Apply edits" : "Edit text"}
            disabled={isSaving || isSegmentLoading}
          >
            <MaterialIcons
              name={isEditMode ? "check" : "edit"}
              size={16}
              color={uiButtonIcon}
            />
            <Text style={[styles.saveText, { color: uiButtonIcon }]}>
              {isEditMode ? "Done" : "Edit"}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.saveButton,
              (isSaving || isSegmentLoading || isEditMode) && styles.topButtonDisabled,
              {
                backgroundColor: uiButtonBg,
                borderColor: theme.border,
                borderWidth: 1,
              },
            ]}
            onPress={() => {
              if (isEditMode) {
                showTransientNotice("Tap Done to apply edits first");
                return;
              }
              openSaveFolderPicker();
            }}
            accessibilityLabel="Save text"
            disabled={isSaving || isSegmentLoading || isEditMode}
          >
            {isSaving ? (
              <ActivityIndicator size="small" color={uiButtonIcon} />
            ) : (
              <MaterialIcons
                name={isSaved ? "bookmark" : "bookmark-border"}
                size={18}
                color={uiButtonIcon}
              />
            )}
            <Text style={[styles.saveText, { color: uiButtonIcon }]}>
              {isSaving ? "Saving..." : isSaved ? "Saved" : "Save"}
            </Text>
          </TouchableOpacity>
        </View>
      )}
      {!!saveNotice && !isFullScreen && (
        <View style={[styles.toast, { backgroundColor: uiTextColor }]}>
          <Text style={[styles.toastText, { color: theme.background }]}>
            {saveNotice}
          </Text>
        </View>
      )}
      {segments.length > 1 && !isEditMode && !isFullScreen && (
        <View style={styles.inlinePartNavWrap}>
          <View style={styles.inlineNavRow}>
            <View style={styles.partHalfPart}>
              <View
                style={[
                  styles.inlineInputShell,
                  styles.partNavInputShell,
                  {
                    borderColor: theme.border,
                    backgroundColor:
                      isDarkBackground
                        ? "rgba(255,255,255,0.06)"
                        : "rgba(0,0,0,0.04)",
                  },
                ]}
              >
                <TouchableOpacity
                  style={[styles.inlineArrowButton, styles.partNavArrowButton]}
                  onPress={() => {
                    blurInlineInputs();
                    const moved = moveToPrevSegment("Loading previous part...");
                    if (moved) stopPlaybackForManualPartSwitch();
                  }}
                  disabled={currentSegmentIndex <= 0 || isSegmentLoading}
                  accessibilityLabel="Previous part"
                >
                  <MaterialIcons
                    name="navigate-before"
                    size={14}
                    color={
                      currentSegmentIndex <= 0 || isSegmentLoading
                        ? theme.border
                        : uiTextColor
                    }
                  />
                </TouchableOpacity>
                <View
                  style={[
                    styles.partCounterChip,
                    styles.partCounterChipCompact,
                    {
                      borderColor: theme.border,
                      backgroundColor:
                        isDarkBackground
                          ? "rgba(255,255,255,0.09)"
                          : "rgba(255,255,255,0.92)",
                    },
                  ]}
                >
                  <TextInput
                    ref={partInputRef}
                    style={[
                      styles.partInput,
                      {
                        color: uiTextColor,
                      },
                    ]}
                    value={partInputValue}
                    onChangeText={(value) => {
                      const digitsOnly = String(value || "").replace(/[^0-9]/g, "");
                      setPartInputValue(digitsOnly);
                    }}
                    onSubmitEditing={commitManualPartInput}
                    onBlur={commitManualPartInput}
                    keyboardType="number-pad"
                    returnKeyType="done"
                    maxLength={Math.max(2, String(segments.length).length)}
                    selectTextOnFocus
                  />
                  <Text style={[styles.partCounterSlash, { color: uiTextColor }]}>/</Text>
                  <Text style={[styles.partCounterTotal, { color: uiTextColor }]}>
                    {segments.length}
                  </Text>
                </View>
                <TouchableOpacity
                  style={[styles.inlineArrowButton, styles.partNavArrowButton]}
                  onPress={() => {
                    blurInlineInputs();
                    const moved = moveToNextSegment(false, "Loading next part...");
                    if (moved) stopPlaybackForManualPartSwitch();
                  }}
                  disabled={currentSegmentIndex >= segments.length - 1 || isSegmentLoading}
                  accessibilityLabel="Next part"
                >
                  <MaterialIcons
                    name="navigate-next"
                    size={14}
                    color={
                      currentSegmentIndex >= segments.length - 1 || isSegmentLoading
                        ? theme.border
                        : uiTextColor
                    }
                  />
                </TouchableOpacity>
              </View>
            </View>
            <View style={styles.partHalfSearch}>
              <View
                style={[
                  styles.inlineInputShell,
                  {
                    borderColor: theme.border,
                    backgroundColor:
                      isDarkBackground
                        ? "rgba(255,255,255,0.06)"
                        : "rgba(0,0,0,0.04)",
                  },
                ]}
              >
                <TextInput
                  ref={searchInputRef}
                  style={[
                    styles.partSearchInput,
                    {
                      color: uiTextColor,
                    },
                  ]}
                  value={partSearchQuery}
                  onChangeText={setPartSearchQuery}
                  placeholder="Search"
                  placeholderTextColor={isDarkBackground ? "#8F9499" : "#8A8A8A"}
                  returnKeyType="search"
                  onSubmitEditing={() => {
                    if (partSearchCursor < 0) {
                      jumpToSearchMatch(0);
                    } else {
                      goToNextSearchMatch();
                    }
                    blurInlineInputs();
                  }}
                />
                <TouchableOpacity
                  style={[
                    styles.inlineArrowButton,
                    !partSearchMatches.length && styles.segmentCenterButtonDisabled,
                  ]}
                  onPress={() => {
                    blurInlineInputs();
                    goToPrevSearchMatch();
                  }}
                  disabled={!partSearchMatches.length}
                  accessibilityLabel="Previous search result"
                >
                  <MaterialIcons name="expand-less" size={16} color={uiTextColor} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.inlineArrowButton,
                    !partSearchMatches.length && styles.segmentCenterButtonDisabled,
                  ]}
                  onPress={() => {
                    blurInlineInputs();
                    goToNextSearchMatch();
                  }}
                  disabled={!partSearchMatches.length}
                  accessibilityLabel="Next search result"
                >
                  <MaterialIcons name="expand-more" size={16} color={uiTextColor} />
                </TouchableOpacity>
              </View>
            </View>
          </View>
          {!!normalizedPartSearchQuery && (
            <Text style={[styles.partSearchMeta, { color: uiTextColor }]}>
              {partSearchMatches.length
                ? partSearchCursor >= 0
                  ? `Match ${partSearchCursor + 1} of ${partSearchMatches.length} - Part ${currentMatchPart + 1}`
                  : `${partSearchMatches.length} match${partSearchMatches.length > 1 ? "es" : ""} found`
                : "No matching parts found"}
            </Text>
          )}
        </View>
      )}
      {isSegmentLoading && (
        <View
          style={[
            styles.segmentLoadingBar,
            {
              borderColor: statusBarBorder,
              backgroundColor: statusBarBg,
            },
          ]}
        >
          <ActivityIndicator size="small" color={statusBarAccent} />
          <Text style={[styles.segmentLoadingText, { color: uiTextColor }]}>
            {segmentStatusMessage || "Loading..."}
          </Text>
        </View>
      )}

      {/* Text Box with Internal Scrolling */}
      <View
        style={[
          styles.textContainerWrapper,
          isFullScreen && styles.textContainerWrapperFull,
          !isFullScreen && styles.textContainerBox,
          isEditMode &&
            !isFullScreen &&
            keyboardHeight > 0 && {
              marginBottom: Math.max(12, keyboardHeight - insets.bottom + 8),
            },
          {
            padding: textBoxPadding,
            backgroundColor: readingAreaBg,
          },
        ]}
        onLayout={(event) => {
          const width = event.nativeEvent.layout.width;
          if (width && width !== containerWidth) {
            setContainerWidth(width);
          }
        }}
      >
        <TouchableOpacity
          style={[
            styles.inlineFullScreenButton,
            isFullScreen && styles.inlineFullScreenButtonFull,
            {
              backgroundColor: uiButtonBg,
              borderColor: theme.border,
              borderWidth: 1,
            },
          ]}
          onPress={() => setIsFullScreen((prev) => !prev)}
          accessibilityLabel="Toggle full screen"
        >
          <MaterialIcons
            name={isFullScreen ? "fullscreen-exit" : "fullscreen"}
            size={14}
            color={uiButtonIcon}
          />
        </TouchableOpacity>
        <Text
          style={[
            styles.measureText,
            {
              fontFamily: resolvedFontFamily,
              fontSize,
              letterSpacing: effectiveLetterSpacing,
            },
          ]}
          onLayout={(event) => {
            const width = event.nativeEvent.layout.width;
            const sampleLength = styles.measureTextSample.length;
            if (width && sampleLength) {
              const nextAvg = Number((width / sampleLength).toFixed(3));
              if (Number.isFinite(nextAvg) && nextAvg > 0 && Math.abs(nextAvg - avgCharWidth) > 0.02) {
                setAvgCharWidth(nextAvg);
              }
            }
          }}
        >
          {styles.measureTextSample}
        </Text>
        {isEditMode ? (
          <TextInput
            ref={editInputRef}
            style={[
              styles.editTextInput,
              {
                color: readerTextColor,
                fontFamily: resolvedFontFamily,
                fontSize,
                lineHeight: lineHeightPx,
                letterSpacing: effectiveLetterSpacing,
              },
            ]}
            multiline={true}
            value={editDraftText}
            onChangeText={setEditDraftText}
            textAlignVertical="top"
            selectionColor={uiTextColor}
            autoCorrect={false}
            autoCapitalize="sentences"
            scrollEnabled={true}
          />
        ) : (
          <ScrollView
            ref={scrollViewRef}
            style={styles.textScroll}
            keyboardShouldPersistTaps="handled"
            onTouchStart={blurInlineInputs}
            onContentSizeChange={(_, contentHeight) => {
              scrollContentHeightRef.current = contentHeight || 0;
            }}
            onScroll={(event) => {
              scrollYRef.current = event.nativeEvent.contentOffset.y || 0;
            }}
            scrollEventThrottle={16}
            onScrollBeginDrag={() => {
              isUserDraggingRef.current = true;
              manualScrollHoldUntilRef.current = Date.now() + 350;
            }}
            onScrollEndDrag={() => {
              isUserDraggingRef.current = false;
              manualScrollHoldUntilRef.current = Date.now() + 180;
            }}
            onLayout={(event) => {
              scrollViewportHeightRef.current = event.nativeEvent.layout.height;
            }}
            contentContainerStyle={[
              styles.innerScrollContent,
              isFullScreen && styles.innerScrollContentFull,
            ]}
            showsVerticalScrollIndicator={true}
            scrollEnabled={true}
          >
            <View ref={scrollContentRef}>
              {lines.map((line, index) => {
                if (line === "") {
                  return (
                    <View
                      key={`spacer-${index}`}
                      style={[styles.paragraphSpacer, { height: Math.max(18, lineGap + 12) }]}
                    />
                  );
                }

                const words = lineWords[index] || [];
                const role = getLineRole(line);
                const lineFontWeight =
                  role === "heading" ? "700" : role === "list" ? "600" : "400";
                const lineFontSize = role === "heading" ? fontSize + 1 : fontSize;

                return (
                  <View
                    key={`line-${index}-${line}`}
                    style={[
                      styles.line,
                      {
                        backgroundColor:
                          index === currentLineIndex ? lineHighlight : "transparent",
                        paddingHorizontal: 4,
                        paddingVertical: 2,
                        borderRadius: 3,
                        marginBottom: lineGap,
                      },
                    ]}
                    onLayout={(event) => {
                      const lineSignature = String(line || "");
                      const prevLineSignature = lineLayoutSignatureRef.current[index];
                      if (prevLineSignature !== lineSignature) {
                        wordOffsetsRef.current[index] = [];
                        wordLayoutSignatureRef.current[index] = [];
                      }
                      lineLayoutSignatureRef.current[index] = lineSignature;
                      lineOffsetsRef.current[index] = event.nativeEvent.layout.y;
                      lineHeightsRef.current[index] = event.nativeEvent.layout.height;
                      if (!wordOffsetsRef.current[index]) {
                        wordOffsetsRef.current[index] = [];
                      }
                      if (!wordLayoutSignatureRef.current[index]) {
                        wordLayoutSignatureRef.current[index] = [];
                      }
                    }}
                  >
                    {words.map((word, wordIndex) => (
                      <Text
                        key={`${index}-${wordIndex}-${word}`}
                        ref={(node) => {
                          if (!wordRefsRef.current[index]) {
                            wordRefsRef.current[index] = [];
                          }
                          wordRefsRef.current[index][wordIndex] = node;
                        }}
                        onPress={() => seekToPosition(index, wordIndex)}
                        onLayout={(event) => {
                          const wordY = event.nativeEvent.layout.y;
                          if (!wordOffsetsRef.current[index]) {
                            wordOffsetsRef.current[index] = [];
                          }
                          if (!wordLayoutSignatureRef.current[index]) {
                            wordLayoutSignatureRef.current[index] = [];
                          }
                          wordOffsetsRef.current[index][wordIndex] = wordY;
                          wordLayoutSignatureRef.current[index][wordIndex] = String(
                            word || ""
                          );
                          const pending = pendingSearchTargetRef.current;
                          if (
                            pending &&
                            pending.lineIndex === index &&
                            pending.wordIndex === wordIndex
                          ) {
                            requestAnimationFrame(() => {
                              recenterToExactWord(index, wordIndex, 0);
                              recenterToCurrentHighlightRef.current?.(
                                false,
                                index,
                                wordIndex,
                                0,
                                { strictMeasured: true, centerInView: true }
                              );
                            });
                            pendingSearchTargetRef.current = null;
                          }
                        }}
                        style={{
                          fontFamily: resolvedFontFamily,
                          fontSize: lineFontSize,
                          lineHeight: lineHeightPx,
                          fontWeight: lineFontWeight,
                          letterSpacing: effectiveLetterSpacing,
                          marginRight: wordIndex === words.length - 1 ? 0 : effectiveWordGap,
                          flexShrink: 1,
                          backgroundColor:
                            index === currentLineIndex && wordIndex === currentWordIndex
                              ? wordHighlight
                              : isSearchWordMatch(word)
                                ? searchMatchBg
                                : "transparent",
                          color:
                            index === currentLineIndex && wordIndex === currentWordIndex
                              ? wordTextColor
                              : readerTextColor,
                          borderRadius: 3,
                          paddingHorizontal: 0,
                        }}
                      >
                        {word}
                      </Text>
                    ))}
                  </View>
                );
              })}
            </View>
          </ScrollView>
        )}
      </View>

      {/* Controls */}
      {!isFullScreen && !isEditMode && (
        <>
        {showSpeedPanel && (
          <View
            style={[
              styles.speedPanel,
              {
                backgroundColor: isDarkBackground ? "#222222" : theme.highlight,
                borderColor: theme.border,
              },
            ]}
          >
            <View style={styles.speedPresetRow}>
              {SPEED_PRESETS.map((preset) => {
                const isActive = Math.abs(readingSpeed - preset) < 0.02;
                return (
                  <TouchableOpacity
                    key={preset}
                    style={[
                      styles.speedPresetButton,
                      { borderColor: theme.border },
                      isActive && { backgroundColor: uiTextColor },
                    ]}
                    onPress={() => applySpeedChange(preset)}
                  >
                    <Text
                      style={[
                        styles.speedPresetText,
                        { color: isActive ? theme.background : uiTextColor },
                      ]}
                    >
                      {preset.toFixed(2)}x
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <View style={styles.speedAdjustRow}>
              <TouchableOpacity
                style={[styles.quickStepButton, { borderColor: theme.border }]}
                onPress={() => applySpeedChange(stepAdjust(readingSpeed, 0.05, 0.3, 2.0, -1))}
              >
                <Text style={[styles.quickStepText, { color: uiTextColor }]}>-</Text>
              </TouchableOpacity>
              <Slider
                style={styles.speedSlider}
                minimumValue={0.3}
                maximumValue={2.0}
                step={0.05}
                value={readingSpeed}
                onValueChange={(value) => applySpeedChange(value)}
                minimumTrackTintColor={uiTextColor}
                maximumTrackTintColor={theme.border}
                thumbTintColor={uiTextColor}
              />
              <TouchableOpacity
                style={[styles.quickStepButton, { borderColor: theme.border }]}
                onPress={() => applySpeedChange(stepAdjust(readingSpeed, 0.05, 0.3, 2.0, 1))}
              >
                <Text style={[styles.quickStepText, { color: uiTextColor }]}>+</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
        <ReaderControls
          isPlaying={isPlaying}
          onPlayPause={handlePlayPause}
          onBackward={handleBackward}
          onForward={handleForward}
          onOpenSpeed={() => {
            setShowQuickSettings(false);
            setShowSpeedPanel((v) => !v);
          }}
          onOpenSettings={() => {
            setShowSpeedPanel(false);
            setShowQuickSettings(true);
          }}
          readingSpeed={readingSpeed}
          isSpeedPanelOpen={showSpeedPanel}
          theme={theme}
          textColor={uiTextColor}
          controlsDisabled={isSegmentLoading}
        />
        </>
      )}

      <Modal
        visible={showQuickSettings}
        transparent={true}
        animationType="slide"
        onRequestClose={() => {
          setShowQuickSettings(false);
          setSettingsTab("fonts");
          setShowAllVoices(false);
          setShowVoiceSection(false);
        }}
      >
        <View style={styles.quickSettingsOverlay}>
          <Pressable
            style={styles.quickSettingsBackdrop}
            onPress={() => {
              setShowQuickSettings(false);
              setSettingsTab("fonts");
              setShowAllVoices(false);
              setShowVoiceSection(false);
            }}
          />
          <View
            style={[
              styles.quickSettingsPanel,
              {
                backgroundColor:
                  isDarkBackground ? "#1C1C1C" : theme.highlight,
                borderColor: theme.border,
              },
            ]}
          >
            <View style={styles.quickHeader}>
              <Text style={[styles.quickTitle, { color: uiTextColor }]}>
                Settings
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setShowQuickSettings(false);
                  setSettingsTab("fonts");
                  setShowAllVoices(false);
                  setShowVoiceSection(false);
                }}
              >
                <MaterialIcons name="close" size={20} color={uiTextColor} />
              </TouchableOpacity>
            </View>

            <View style={styles.quickTabs}>
              <TouchableOpacity
                style={[
                  styles.quickTab,
                  settingsTab === "fonts" && { backgroundColor: uiTextColor },
                ]}
                onPress={() => setSettingsTab("fonts")}
              >
                <Text
                  style={[
                    styles.quickTabText,
                    { color: settingsTab === "fonts" ? theme.background : uiTextColor },
                  ]}
                >
                  Fonts
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.quickTab,
                  settingsTab === "spacing" && { backgroundColor: uiTextColor },
                ]}
                onPress={() => setSettingsTab("spacing")}
              >
                <Text
                  style={[
                    styles.quickTabText,
                    { color: settingsTab === "spacing" ? theme.background : uiTextColor },
                  ]}
                >
                  Spacing
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.quickTab,
                  settingsTab === "colors" && { backgroundColor: uiTextColor },
                ]}
                onPress={() => setSettingsTab("colors")}
              >
                <Text
                  style={[
                    styles.quickTabText,
                    { color: settingsTab === "colors" ? theme.background : uiTextColor },
                  ]}
                >
                  Colors
                </Text>
              </TouchableOpacity>
              {useNativeTts && (
                <TouchableOpacity
                  style={[
                    styles.quickTab,
                    settingsTab === "voice" && { backgroundColor: uiTextColor },
                  ]}
                  onPress={() => setSettingsTab("voice")}
                >
                  <Text
                    style={[
                      styles.quickTabText,
                      { color: settingsTab === "voice" ? theme.background : uiTextColor },
                    ]}
                  >
                    Voice
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            <ScrollView
              style={styles.quickScroll}
              contentContainerStyle={styles.quickScrollContent}
              showsVerticalScrollIndicator={true}
              scrollEnabled={!isColorDragging}
            >
            {settingsTab === "fonts" && (
              <View style={[styles.quickRow, styles.quickRowSpacing]}>
                <Text style={[styles.quickLabel, { color: uiTextColor }]}>Font</Text>
                <View style={styles.quickChipRow}>
                  {["Lexend", "OpenDyslexic", "System"].map((font) => {
                    const isActive = fontFamily === font;
                    return (
                      <TouchableOpacity
                        key={font}
                        style={[
                          styles.quickChip,
                          isActive && { backgroundColor: uiTextColor },
                          { borderColor: theme.border },
                        ]}
                        onPress={() => setFontFamily(font)}
                      >
                        <Text
                          style={[
                            styles.quickChipText,
                            {
                              color: isActive ? theme.background : uiTextColor,
                              fontFamily: FONT_FAMILY_MAP[font] || undefined,
                            },
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

            {settingsTab === "voice" && useNativeTts && (
              <View style={[styles.quickRow, styles.quickRowSpacing]}>
                <TouchableOpacity
                  style={[
                    styles.voiceSectionHeader,
                    { borderColor: theme.border, backgroundColor: theme.highlight },
                  ]}
                  onPress={() => setShowVoiceSection((prev) => !prev)}
                >
                  <View style={styles.voiceHeaderLeft}>
                    <Text style={[styles.quickLabel, { color: uiTextColor }]}>Voice</Text>
                    <Text style={[styles.voiceCurrentText, { color: uiTextColor }]}>
                      {ttsVoiceName
                        ? allVoices.find((v) => v.name === ttsVoiceName)?.label || "Selected"
                        : "Default"}
                    </Text>
                  </View>
                  <MaterialIcons
                    name={showVoiceSection ? "expand-less" : "expand-more"}
                    size={18}
                    color={uiTextColor}
                  />
                </TouchableOpacity>
                {showVoiceSection && (
                  <>
                    <Text style={[styles.voiceSectionLabel, { color: uiTextColor }]}>
                      Recommended
                    </Text>
                    <View style={styles.quickChipRow}>
                      <View style={styles.voiceChoice}>
                        <TouchableOpacity
                          style={[
                            styles.quickChip,
                            styles.voiceChip,
                            !ttsVoiceName && { backgroundColor: uiTextColor },
                            { borderColor: theme.border },
                          ]}
                          onPress={() => setTtsVoiceName("")}
                        >
                          <Text
                            numberOfLines={1}
                            style={[
                              styles.quickChipText,
                              styles.voiceChipText,
                              { color: !ttsVoiceName ? theme.background : uiTextColor },
                            ]}
                          >
                            Default
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[
                            styles.voicePreviewButton,
                            { borderColor: theme.border },
                            previewVoiceName === "default" && {
                              backgroundColor: uiTextColor,
                            },
                          ]}
                          onPress={() => previewVoice("")}
                          accessibilityLabel="Preview default voice"
                        >
                          <MaterialIcons
                            name="volume-up"
                            size={14}
                            color={
                              previewVoiceName === "default"
                                ? theme.background
                                : uiTextColor
                            }
                          />
                        </TouchableOpacity>
                      </View>
                      {recommendedVoices.map((voice) => {
                        const voiceName = voice.name;
                        const shortLabel = voice.label;
                        const isActive = ttsVoiceName === voiceName;
                        return (
                          <View key={voiceName} style={styles.voiceChoice}>
                            <TouchableOpacity
                              style={[
                                styles.quickChip,
                                styles.voiceChip,
                                isActive && { backgroundColor: uiTextColor },
                                { borderColor: theme.border },
                              ]}
                              onPress={() => setTtsVoiceName(voiceName)}
                            >
                              <Text
                                numberOfLines={1}
                                style={[
                                  styles.quickChipText,
                                  styles.voiceChipText,
                                  { color: isActive ? theme.background : uiTextColor },
                                ]}
                              >
                                {shortLabel}
                              </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={[
                                styles.voicePreviewButton,
                                { borderColor: theme.border },
                                previewVoiceName === voiceName && {
                                  backgroundColor: uiTextColor,
                                },
                              ]}
                              onPress={() => previewVoice(voiceName)}
                              accessibilityLabel={`Preview ${shortLabel} voice`}
                            >
                              <MaterialIcons
                                name="volume-up"
                                size={14}
                                color={
                                  previewVoiceName === voiceName
                                    ? theme.background
                                    : uiTextColor
                                }
                              />
                            </TouchableOpacity>
                          </View>
                        );
                      })}
                    </View>
                    {allVoices.length > recommendedVoices.length && (
                      <TouchableOpacity
                        style={[
                          styles.voiceToggleButton,
                          { borderColor: uiTextColor, backgroundColor: uiTextColor },
                        ]}
                        onPress={() => setShowAllVoices((prev) => !prev)}
                      >
                        <MaterialIcons
                          name={showAllVoices ? "expand-less" : "expand-more"}
                          size={14}
                          color={theme.background}
                        />
                        <Text style={[styles.voiceToggleText, { color: theme.background }]}>
                          {showAllVoices
                            ? "Hide full voice list"
                            : `Show all voices (${allVoices.length})`}
                        </Text>
                      </TouchableOpacity>
                    )}
                    {showAllVoices && extraVoices.length > 0 && (
                      <>
                        <Text style={[styles.voiceSectionLabel, { color: uiTextColor }]}>
                          All voices
                        </Text>
                        <View style={styles.quickChipRow}>
                          {extraVoices.map((voice) => {
                            const voiceName = voice.name;
                            const shortLabel = voice.label;
                            const isActive = ttsVoiceName === voiceName;
                            return (
                              <View key={voiceName} style={styles.voiceChoice}>
                                <TouchableOpacity
                                  style={[
                                    styles.quickChip,
                                    styles.voiceChip,
                                    isActive && { backgroundColor: uiTextColor },
                                    { borderColor: theme.border },
                                  ]}
                                  onPress={() => setTtsVoiceName(voiceName)}
                                >
                                  <Text
                                    numberOfLines={1}
                                    style={[
                                      styles.quickChipText,
                                      styles.voiceChipText,
                                      { color: isActive ? theme.background : uiTextColor },
                                    ]}
                                  >
                                    {shortLabel}
                                  </Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                  style={[
                                    styles.voicePreviewButton,
                                    { borderColor: theme.border },
                                    previewVoiceName === voiceName && {
                                      backgroundColor: uiTextColor,
                                    },
                                  ]}
                                  onPress={() => previewVoice(voiceName)}
                                  accessibilityLabel={`Preview ${shortLabel} voice`}
                                >
                                  <MaterialIcons
                                    name="volume-up"
                                    size={14}
                                    color={
                                      previewVoiceName === voiceName
                                        ? theme.background
                                        : uiTextColor
                                    }
                                  />
                                </TouchableOpacity>
                              </View>
                            );
                          })}
                        </View>
                      </>
                    )}
                    <View
                      style={[
                        styles.quickHelpBox,
                        {
                          borderColor: theme.border,
                          backgroundColor:
                            theme.background === "#16171A"
                              ? "rgba(255,255,255,0.05)"
                              : "rgba(0,0,0,0.03)",
                        },
                      ]}
                    >
                      <Text style={[styles.quickHelpTitle, { color: uiTextColor }]}>
                        How to add more voices
                      </Text>
                      <Text style={[styles.quickHelpText, { color: uiTextColor }]}>
                        1. Open phone Settings.
                      </Text>
                      <Text style={[styles.quickHelpText, { color: uiTextColor }]}>
                        2. Tap Text-to-speech output.
                      </Text>
                      <Text style={[styles.quickHelpText, { color: uiTextColor }]}>
                        3. Download a new voice.
                      </Text>
                      <Text style={[styles.quickHelpText, { color: uiTextColor }]}>
                        4. Come back and reopen this app.
                      </Text>
                      <TouchableOpacity
                        style={[
                          styles.voiceSettingsBtn,
                          { borderColor: theme.border, backgroundColor: theme.highlight },
                        ]}
                        onPress={openVoiceSettings}
                      >
                        <MaterialIcons name="settings" size={14} color={uiTextColor} />
                        <Text style={[styles.voiceSettingsBtnText, { color: uiTextColor }]}>
                          Open voice settings
                        </Text>
                      </TouchableOpacity>
                      {availableVoices.length <= 1 && (
                        <Text style={[styles.quickHelpNote, { color: uiTextColor }]}>
                          You currently have 1 voice on this phone.
                        </Text>
                      )}
                    </View>
                  </>
                )}
                <View style={styles.quickRow}>
                  <View style={styles.quickRowHeader}>
                    <Text style={[styles.quickLabel, { color: uiTextColor }]}>
                      Pitch: {pitch.toFixed(2)}x
                    </Text>
                  </View>
                  <View style={styles.quickSliderRow}>
                    <Slider
                      style={styles.quickSlider}
                      minimumValue={0.5}
                      maximumValue={2.0}
                      step={0.05}
                      value={pitch}
                      onValueChange={(value) => applyPitchChange(value)}
                      minimumTrackTintColor={uiTextColor}
                      maximumTrackTintColor={theme.border}
                      thumbTintColor={uiTextColor}
                    />
                    <View style={styles.quickStepperInline}>
                      <TouchableOpacity
                        style={styles.quickStepButton}
                        onPress={() => applyPitchChange(stepAdjust(pitch, 0.05, 0.5, 2.0, -1))}
                      >
                        <Text style={[styles.quickStepText, { color: uiTextColor }]}>-</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.quickStepButton}
                        onPress={() => applyPitchChange(stepAdjust(pitch, 0.05, 0.5, 2.0, 1))}
                      >
                        <Text style={[styles.quickStepText, { color: uiTextColor }]}>+</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              </View>
            )}

            {settingsTab === "fonts" && (
            <View style={styles.quickRow}>
              <View style={styles.quickRowHeader}>
                <Text style={[styles.quickLabel, { color: uiTextColor }]}>
                  Font Size: {fontSize.toFixed(0)}
                </Text>
              </View>
              <View style={styles.quickSliderRow}>
                <Slider
                  style={styles.quickSlider}
                  minimumValue={14}
                  maximumValue={26}
                  step={1}
                  value={fontSize}
                  onValueChange={(value) => setFontSize(value)}
                  minimumTrackTintColor={uiTextColor}
                  maximumTrackTintColor={theme.border}
                  thumbTintColor={uiTextColor}
                />
                <View style={styles.quickStepperInline}>
                  <TouchableOpacity
                    style={styles.quickStepButton}
                    onPress={() => setFontSize((v) => stepAdjust(v, 1, 14, 26, -1))}
                  >
                    <Text style={[styles.quickStepText, { color: uiTextColor }]}>-</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.quickStepButton}
                    onPress={() => setFontSize((v) => stepAdjust(v, 1, 14, 26, 1))}
                  >
                    <Text style={[styles.quickStepText, { color: uiTextColor }]}>+</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
            )}

            {settingsTab === "spacing" && (
              <View style={styles.quickRow}>
                <View style={styles.quickRowHeader}>
                  <Text style={[styles.quickLabel, { color: uiTextColor }]}>
                    Line Spacing: {lineHeight.toFixed(2)}
                  </Text>
                </View>
                <View style={styles.quickSliderRow}>
                  <Slider
                    style={styles.quickSlider}
                    minimumValue={1.1}
                    maximumValue={2.6}
                    step={0.05}
                    value={lineHeight}
                    onValueChange={(value) => setLineHeight(Number(value.toFixed(2)))}
                    minimumTrackTintColor={uiTextColor}
                    maximumTrackTintColor={theme.border}
                    thumbTintColor={uiTextColor}
                  />
                  <View style={styles.quickStepperInline}>
                    <TouchableOpacity
                      style={styles.quickStepButton}
                      onPress={() =>
                        setLineHeight((v) => stepAdjust(v, 0.05, 1.1, 2.6, -1))
                      }
                    >
                      <Text style={[styles.quickStepText, { color: uiTextColor }]}>-</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.quickStepButton}
                      onPress={() =>
                        setLineHeight((v) => stepAdjust(v, 0.05, 1.1, 2.6, 1))
                      }
                    >
                      <Text style={[styles.quickStepText, { color: uiTextColor }]}>+</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            )}

            {settingsTab === "spacing" && (
              <View style={styles.quickRow}>
                <View style={styles.quickRowHeader}>
                  <Text style={[styles.quickLabel, { color: uiTextColor }]}>
                    Word Spacing: {wordSpacing.toFixed(0)}pt
                  </Text>
                </View>
                <View style={styles.quickSliderRow}>
                  <Slider
                    style={styles.quickSlider}
                    minimumValue={0}
                    maximumValue={12}
                    step={1}
                    value={wordSpacing}
                    onValueChange={(value) => setWordSpacing(value)}
                    minimumTrackTintColor={uiTextColor}
                    maximumTrackTintColor={theme.border}
                    thumbTintColor={uiTextColor}
                  />
                  <View style={styles.quickStepperInline}>
                    <TouchableOpacity
                      style={styles.quickStepButton}
                      onPress={() => setWordSpacing((v) => stepAdjust(v, 1, 0, 12, -1))}
                    >
                      <Text style={[styles.quickStepText, { color: uiTextColor }]}>-</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.quickStepButton}
                      onPress={() => setWordSpacing((v) => stepAdjust(v, 1, 0, 12, 1))}
                    >
                      <Text style={[styles.quickStepText, { color: uiTextColor }]}>+</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            )}

            {settingsTab === "spacing" && (
              <View style={styles.quickRow}>
                <View style={styles.quickRowHeader}>
                  <Text style={[styles.quickLabel, { color: uiTextColor }]}>
                    Letter Spacing: {letterSpacing.toFixed(2)}
                  </Text>
                </View>
                <View style={styles.quickSliderRow}>
                  <Slider
                    style={styles.quickSlider}
                    minimumValue={0}
                    maximumValue={1.2}
                    step={0.05}
                    value={letterSpacing}
                    onValueChange={(value) => setLetterSpacing(Number(value.toFixed(2)))}
                    minimumTrackTintColor={uiTextColor}
                    maximumTrackTintColor={theme.border}
                    thumbTintColor={uiTextColor}
                  />
                  <View style={styles.quickStepperInline}>
                    <TouchableOpacity
                      style={styles.quickStepButton}
                      onPress={() =>
                        setLetterSpacing((v) => stepAdjust(v, 0.05, 0, 1.2, -1))
                      }
                    >
                      <Text style={[styles.quickStepText, { color: uiTextColor }]}>-</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.quickStepButton}
                      onPress={() =>
                        setLetterSpacing((v) => stepAdjust(v, 0.05, 0, 1.2, 1))
                      }
                    >
                      <Text style={[styles.quickStepText, { color: uiTextColor }]}>+</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            )}

            {settingsTab === "colors" && (
              <View style={styles.quickRow}>
                <View
                  style={[
                    styles.colorTargetSegmented,
                    { borderColor: theme.border, backgroundColor: "rgba(127,127,127,0.10)" },
                  ]}
                >
                  {[
                    { key: "text", label: "Text" },
                    { key: "highlight", label: "Highlight" },
                    { key: "readingArea", label: "Background" },
                  ].map((target, index, arr) => {
                    const item = colorTargets[target.key];
                    const active = activeColorTarget === target.key;
                    const isLast = index === arr.length - 1;
                    return (
                      <TouchableOpacity
                        key={target.key}
                        style={[
                          styles.colorTargetButton,
                          !isLast && { borderRightWidth: 1, borderRightColor: theme.border },
                          active && { backgroundColor: uiTextColor },
                        ]}
                        onPress={() => setActiveColorTarget(target.key)}
                      >
                        <View style={[styles.colorPreviewSmall, { backgroundColor: item.preview }]} />
                        <Text
                          numberOfLines={1}
                          style={[
                            styles.colorTargetText,
                            { color: active ? theme.background : uiTextColor },
                          ]}
                        >
                          {target.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}

            {settingsTab === "colors" && (
              <View style={styles.quickRow}>
                <View
                  style={styles.shadePanel}
                  onLayout={(event) => {
                    const { width, height } = event.nativeEvent.layout;
                    if (width && height) setShadeBoxSize({ width, height });
                  }}
                >
                  {activeShadeGrid.map((row, rowIndex) => (
                    <View key={`r-${rowIndex}`} style={styles.shadeRow}>
                      {row.map((color, colIndex) => (
                        <View
                          key={`c-${rowIndex}-${colIndex}`}
                          style={[styles.shadeCell, { backgroundColor: color }]}
                        />
                      ))}
                    </View>
                  ))}
                  <View
                    style={[
                      styles.shadePointer,
                      {
                        left: clamp(
                          activeInteractiveColor.saturation * shadeBoxSize.width - 8,
                          0,
                          Math.max(0, shadeBoxSize.width - 16)
                        ),
                        top: clamp(
                          (1 - activeInteractiveColor.value) * shadeBoxSize.height - 8,
                          0,
                          Math.max(0, shadeBoxSize.height - 16)
                        ),
                        borderColor: isDarkBackground ? "#FFFFFF" : "#1F1F1F",
                      },
                    ]}
                    pointerEvents="none"
                  />
                  <View style={styles.shadeTouchLayer} {...shadePanResponder.panHandlers} />
                </View>
                <View style={styles.quickSliderRow}>
                  {renderHueSlider(
                    activeInteractiveColor.hue,
                    (value) => {
                      const nextHue = Number(value.toFixed(0));
                      setDraftColorSafe((prev) => ({
                        ...prev,
                        hue: nextHue,
                      }));
                    },
                    (value) => {
                      const nextHue = Number(value.toFixed(0));
                      const next = {
                        ...draftColorRef.current,
                        hue: nextHue,
                      };
                      setDraftColorSafe(next);
                      activeColor.setHue(next.hue);
                      activeColor.setSaturation(Number(next.saturation.toFixed(3)));
                      activeColor.setValue(Number(next.value.toFixed(3)));
                      setIsHueSliding(false);
                    },
                    activeHueTrackColors,
                    () => {
                      setDraftColorSafe({
                        hue: activeColor.hue,
                        saturation: activeColor.saturation,
                        value: activeColor.value,
                      });
                      setIsHueSliding(true);
                    }
                  )}
                </View>
              </View>
            )}

            </ScrollView>
          </View>
        </View>
      </Modal>
      <Modal
        visible={showSaveFolderPicker}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setShowSaveFolderPicker(false);
          setShowSaveNewFolderInput(false);
          setSaveFolderInput("");
          setSaveTitleInput("");
        }}
      >
        <View style={styles.partNavigatorOverlay}>
          <Pressable
            style={styles.partNavigatorBackdrop}
            onPress={() => {
              setShowSaveFolderPicker(false);
              setShowSaveNewFolderInput(false);
              setSaveFolderInput("");
              setSaveTitleInput("");
            }}
          />
          <View
            style={[
              styles.partNavigatorPanel,
              {
                borderColor: theme.border,
                backgroundColor:
                  isDarkBackground ? "#1C1C1C" : theme.highlight,
              },
            ]}
          >
            <View style={styles.partNavigatorHeader}>
              <Text style={[styles.partNavigatorTitle, { color: uiTextColor }]}>
                Save To Folder
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setShowSaveFolderPicker(false);
                  setShowSaveNewFolderInput(false);
                  setSaveFolderInput("");
                  setSaveTitleInput("");
                }}
              >
                <MaterialIcons name="close" size={20} color={uiTextColor} />
              </TouchableOpacity>
            </View>
            <Text style={[styles.partNavigatorSubtitle, { color: uiTextColor }]}>
              Choose a folder, or save to root.
            </Text>

            <TextInput
              style={[
                styles.saveFolderInput,
                {
                  color: uiTextColor,
                  borderColor: theme.border,
                  backgroundColor:
                    isDarkBackground
                      ? "rgba(255,255,255,0.06)"
                      : "rgba(0,0,0,0.04)",
                },
              ]}
              value={saveTitleInput}
              onChangeText={setSaveTitleInput}
              placeholder="File name"
              placeholderTextColor={isDarkBackground ? "#8F9499" : "#8A8A8A"}
              editable={!isSaving}
            />

            <View style={styles.saveFolderTopActions}>
              <TouchableOpacity
                style={[
                  styles.saveFolderNewBtn,
                  {
                    borderColor: theme.border,
                    backgroundColor:
                      isDarkBackground
                        ? "rgba(255,255,255,0.06)"
                        : "rgba(0,0,0,0.04)",
                  },
                ]}
                onPress={() => {
                  setShowSaveNewFolderInput((prev) => {
                    const next = !prev;
                    if (next) {
                      setSelectedSaveFolder("");
                      setSaveFolderInput("");
                    }
                    return next;
                  });
                }}
                disabled={isSaving}
              >
                <MaterialIcons name="create-new-folder" size={16} color={uiTextColor} />
                <Text style={[styles.saveFolderNewBtnText, { color: uiTextColor }]}>
                  {showSaveNewFolderInput ? "Close" : "New Folder"}
                </Text>
              </TouchableOpacity>
            </View>

            {showSaveNewFolderInput && (
              <TextInput
                style={[
                  styles.saveFolderInput,
                  {
                    color: uiTextColor,
                    borderColor: theme.border,
                    backgroundColor:
                      isDarkBackground
                        ? "rgba(255,255,255,0.06)"
                        : "rgba(0,0,0,0.04)",
                  },
                ]}
                value={saveFolderInput}
                onChangeText={(value) => {
                  setSaveFolderInput(value);
                  setSelectedSaveFolder("");
                }}
                placeholder="Enter folder name"
                placeholderTextColor={isDarkBackground ? "#8F9499" : "#8A8A8A"}
                editable={!isSaving}
              />
            )}

            {isSaveFolderLoading ? (
              <View style={styles.saveFolderLoadingRow}>
                <ActivityIndicator size="small" color={uiTextColor} />
                <Text style={[styles.saveFolderLoadingText, { color: uiTextColor }]}>
                  Loading folders...
                </Text>
              </View>
            ) : (
              <ScrollView
                style={styles.saveFolderList}
                contentContainerStyle={styles.saveFolderListWrap}
                keyboardShouldPersistTaps="handled"
              >
                <TouchableOpacity
                  style={[
                    styles.saveFolderListItem,
                    {
                      borderColor:
                        selectedSaveFolder === "" ? uiTextColor : theme.border,
                      backgroundColor:
                        selectedSaveFolder === ""
                          ? isDarkBackground
                            ? "rgba(255,255,255,0.14)"
                            : "rgba(0,0,0,0.08)"
                          : "transparent",
                    },
                  ]}
                  onPress={() => {
                    setSelectedSaveFolder("");
                    setShowSaveNewFolderInput(false);
                  }}
                >
                  <View style={styles.saveFolderListLeft}>
                    <MaterialIcons name="home" size={16} color={uiTextColor} />
                    <Text style={[styles.saveFolderListName, { color: uiTextColor }]}>
                      Root
                    </Text>
                  </View>
                  {selectedSaveFolder === "" && (
                    <MaterialIcons name="check" size={18} color={uiTextColor} />
                  )}
                </TouchableOpacity>

                {saveFolderOptions.map((folderName) => (
                  <TouchableOpacity
                    key={folderName}
                    style={[
                      styles.saveFolderListItem,
                      {
                        borderColor:
                          selectedSaveFolder === folderName
                            ? uiTextColor
                            : theme.border,
                        backgroundColor:
                          selectedSaveFolder === folderName
                            ? isDarkBackground
                              ? "rgba(255,255,255,0.14)"
                              : "rgba(0,0,0,0.08)"
                            : "transparent",
                      },
                    ]}
                    onPress={() => {
                      setSelectedSaveFolder(folderName);
                      setShowSaveNewFolderInput(false);
                    }}
                  >
                    <View style={styles.saveFolderListLeft}>
                      <MaterialIcons name="folder" size={16} color={uiTextColor} />
                      <Text
                        style={[styles.saveFolderListName, { color: uiTextColor }]}
                        numberOfLines={1}
                      >
                        {folderName}
                      </Text>
                    </View>
                    {selectedSaveFolder === folderName && (
                      <MaterialIcons name="check" size={18} color={uiTextColor} />
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}

            <TouchableOpacity
              style={[
                styles.saveFolderConfirmButton,
                {
                  borderColor: uiTextColor,
                  backgroundColor: uiTextColor,
                },
              ]}
              onPress={handleSave}
              disabled={isSaving}
            >
              <Text
                style={[
                  styles.saveFolderConfirmText,
                  { color: theme.background },
                ]}
              >
                Save
              </Text>
            </TouchableOpacity>
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
  innerScrollContentFull: {
    paddingTop: 8,
    paddingRight: 18,
    paddingBottom: 32,
  },
  textScroll: {
    flex: 1,
    minHeight: 0,
  },
  editTextInput: {
    flex: 1,
    minHeight: 0,
    width: "100%",
    paddingTop: 4,
    paddingBottom: 120,
  },
  topActions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    paddingHorizontal: 12,
    paddingTop: 4,
    gap: 6,
  },
  backButton: {
    position: "absolute",
    left: 12,
    width: 30,
    height: 30,
    borderRadius: 7,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#1F1F1F",
    zIndex: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 4,
    elevation: 3,
  },
  saveButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#1F1F1F",
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 7,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.16,
    shadowRadius: 4,
    elevation: 3,
  },
  editButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#1F1F1F",
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 7,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.16,
    shadowRadius: 4,
    elevation: 3,
  },
  saveText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "600",
  },
  topButtonDisabled: {
    opacity: 0.62,
  },
  saveNotice: {
    marginLeft: 12,
    color: "#1F1F1F",
    fontSize: 12,
    fontWeight: "600",
  },
  toast: {
    position: "absolute",
    top: 56,
    alignSelf: "center",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    zIndex: 3,
  },
  toastText: {
    fontSize: 12,
    fontWeight: "700",
  },
  segmentCenterButtonDisabled: {
    opacity: 0.6,
  },
  segmentLoadingBar: {
    marginHorizontal: 12,
    marginBottom: 6,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  segmentLoadingText: {
    fontSize: 11,
    fontWeight: "600",
  },
  partNavigatorOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 16,
    backgroundColor: "rgba(0,0,0,0.28)",
  },
  partNavigatorBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  partNavigatorPanel: {
    width: "100%",
    maxWidth: 380,
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    gap: 10,
    maxHeight: "78%",
  },
  partNavigatorHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  partNavigatorTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  partNavigatorSubtitle: {
    fontSize: 12,
    fontWeight: "600",
    opacity: 0.82,
  },
  partNavigatorScroll: {
    flexGrow: 0,
  },
  partNavigatorScrollContent: {
    gap: 10,
    paddingBottom: 4,
  },
  inlinePartNavWrap: {
    marginHorizontal: 12,
    marginTop: 6,
    marginBottom: 0,
    paddingHorizontal: 0,
    paddingVertical: 2,
    gap: 4,
  },
  inlineNavRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    width: "100%",
  },
  inlineInputShell: {
    borderWidth: 1,
    borderRadius: 8,
    minHeight: 32,
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 4,
    overflow: "hidden",
    justifyContent: "space-between",
    gap: 4,
  },
  inlineArrowButton: {
    width: 22,
    height: 22,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 5,
    flexShrink: 0,
  },
  partNavInputShell: {
    paddingHorizontal: 2,
    gap: 2,
  },
  partNavArrowButton: {
    width: 16,
    height: 16,
    borderRadius: 4,
  },
  partCounterChip: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 5,
    minHeight: 24,
    marginHorizontal: 0,
    minWidth: 52,
    flexShrink: 0,
  },
  partCounterChipCompact: {
    minWidth: 0,
    paddingHorizontal: 3,
  },
  partInput: {
    minWidth: 12,
    maxWidth: 18,
    borderWidth: 0,
    paddingHorizontal: 0,
    paddingVertical: 0,
    textAlign: "right",
    fontSize: 11,
    fontWeight: "700",
    includeFontPadding: false,
    lineHeight: 16,
  },
  partCounterSlash: {
    fontSize: 11,
    fontWeight: "700",
    lineHeight: 16,
    includeFontPadding: false,
    marginHorizontal: 1,
  },
  partCounterTotal: {
    fontSize: 11,
    fontWeight: "700",
    lineHeight: 16,
    includeFontPadding: false,
  },
  inlinePartOfText: {
    fontSize: 12,
    fontWeight: "700",
    opacity: 0.82,
    includeFontPadding: false,
    marginRight: 0,
    marginLeft: 0,
    lineHeight: 16,
  },
  partHalfPart: {
    flexBasis: "30%",
    maxWidth: "30%",
    minWidth: 0,
    flexGrow: 0,
    flexShrink: 1,
  },
  partHalfSearch: {
    flexBasis: "70%",
    maxWidth: "70%",
    flexGrow: 1,
    flexShrink: 1,
    minWidth: 0,
  },
  partSearchInput: {
    flex: 1,
    minWidth: 0,
    borderWidth: 0,
    paddingHorizontal: 4,
    paddingVertical: 0,
    fontSize: 12,
    fontWeight: "600",
  },
  partSearchMeta: {
    fontSize: 10,
    fontWeight: "600",
    opacity: 0.85,
    marginTop: 2,
  },
  saveFolderLoadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 4,
  },
  saveFolderLoadingText: {
    fontSize: 13,
    fontWeight: "600",
  },
  saveFolderTopActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  saveFolderNewBtn: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  saveFolderNewBtnText: {
    fontSize: 12,
    fontWeight: "700",
  },
  saveFolderInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
    fontWeight: "600",
  },
  saveFolderList: {
    maxHeight: 220,
  },
  saveFolderListWrap: {
    gap: 8,
  },
  saveFolderListItem: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 9,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  saveFolderListLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
    minWidth: 0,
  },
  saveFolderListName: {
    fontSize: 13,
    fontWeight: "700",
  },
  saveFolderConfirmButton: {
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  saveFolderConfirmText: {
    fontSize: 14,
    fontWeight: "800",
  },
  themeButton: {
    width: 30,
    height: 30,
    borderRadius: 7,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.16,
    shadowRadius: 4,
    elevation: 3,
  },
  quickSettingsOverlay: {
    flex: 1,
    backgroundColor: "transparent",
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
    maxHeight: "72%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.22,
    shadowRadius: 10,
    elevation: 10,
  },
  quickTabs: {
    flexDirection: "row",
    backgroundColor: "rgba(120, 120, 120, 0.18)",
    borderRadius: 999,
    padding: 3,
    gap: 4,
  },
  quickTab: {
    flex: 1,
    borderRadius: 999,
    paddingVertical: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  quickTabText: {
    fontSize: 11,
    fontWeight: "700",
  },
  quickScroll: {
    flexGrow: 0,
  },
  quickScrollContent: {
    paddingBottom: 8,
    gap: 12,
  },
  speedPanel: {
    marginHorizontal: 12,
    marginBottom: 6,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 10,
    gap: 10,
  },
  speedPresetRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    justifyContent: "flex-start",
  },
  speedPresetButton: {
    width: "31%",
    minWidth: 0,
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
  },
  speedPresetText: {
    fontSize: 12,
    fontWeight: "700",
  },
  speedAdjustRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  speedSlider: {
    flex: 1,
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
  quickHelpBox: {
    marginTop: 4,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 2,
  },
  quickHelpTitle: {
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 2,
  },
  quickHelpText: {
    fontSize: 11,
    fontWeight: "500",
  },
  quickHelpNote: {
    fontSize: 10,
    fontWeight: "600",
    marginTop: 4,
    opacity: 0.8,
  },
  voiceSettingsBtn: {
    marginTop: 6,
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  voiceSettingsBtnText: {
    fontSize: 11,
    fontWeight: "700",
  },
  quickRowSpacing: {
    marginBottom: 8,
  },
  voiceSectionHeader: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  voiceHeaderLeft: {
    minWidth: 0,
    flex: 1,
    gap: 2,
  },
  voiceCurrentText: {
    fontSize: 11,
    fontWeight: "500",
    opacity: 0.78,
  },
  voiceSectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    opacity: 0.78,
  },
  voiceToggleButton: {
    alignSelf: "flex-start",
    borderWidth: 1,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  voiceToggleText: {
    fontSize: 11,
    fontWeight: "700",
  },
  voiceChoice: {
    width: "48%",
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  voiceChip: {
    flex: 1,
    minHeight: 24,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  voiceChipText: {
    textAlign: "center",
    fontSize: 11,
  },
  voicePreviewButton: {
    width: 26,
    height: 24,
    borderWidth: 1,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
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
  colorTargetSegmented: {
    flexDirection: "row",
    borderWidth: 1,
    borderRadius: 12,
    overflow: "hidden",
  },
  colorTargetButton: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 8,
  },
  colorTargetText: {
    fontSize: 12,
    fontWeight: "700",
  },
  colorPreviewSmall: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.22)",
  },
  shadePanel: {
    height: 120,
    borderRadius: 10,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.12)",
    backgroundColor: "#FFFFFF",
  },
  shadeRow: {
    flex: 1,
    flexDirection: "row",
  },
  shadeCell: {
    flex: 1,
  },
  shadePointer: {
    position: "absolute",
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    backgroundColor: "transparent",
  },
  shadeTouchLayer: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: "transparent",
  },
  quickChipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  quickChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    minHeight: 28,
    justifyContent: "center",
    alignItems: "center",
  },
  quickChipText: {
    fontSize: 12,
    fontWeight: "600",
  },
  quickSliderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  quickSlider: {
    flex: 1,
  },
  hueSliderWrap: {
    flex: 1,
    height: 28,
    justifyContent: "center",
  },
  hueTrack: {
    position: "absolute",
    left: 2,
    right: 2,
    height: 8,
    borderRadius: 6,
    overflow: "hidden",
    flexDirection: "row",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.12)",
  },
  hueTrackStop: {
    flex: 1,
  },
  hueSlider: {
    width: "100%",
    height: 28,
  },
  quickStepperInline: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  quickStepButton: {
    width: 24,
    height: 24,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: "#BDBDBD",
    alignItems: "center",
    justifyContent: "center",
  },
  quickStepText: {
    fontSize: 14,
    fontWeight: "700",
  },
  textContainerWrapper: {
    flex: 1,
    marginHorizontal: 12,
    marginTop: 8,
    marginBottom: 12,
    overflow: "visible",
    minHeight: 0,
  },
  textContainerWrapperFull: {
    flex: 1,
    marginHorizontal: 8,
    marginTop: 4,
    marginBottom: 6,
    borderRadius: 12,
    width: undefined,
    alignSelf: "auto",
    minHeight: 0,
    paddingTop: 0,
    overflow: "hidden",
  },
  inlineFullScreenButton: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 3,
    opacity: 0.82,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.16,
    shadowRadius: 3,
    elevation: 2,
  },
  inlineFullScreenButtonFull: {
    top: 8,
    right: 8,
  },
  textContainerBox: {
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 3,
  },
  line: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    maxWidth: "100%",
  },
  paragraphSpacer: {
    height: 8,
  },
  measureText: {
    position: "absolute",
    opacity: 0,
    height: 0,
  },
  measureTextSample: "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ",
});




