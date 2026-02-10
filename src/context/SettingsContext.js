import { createContext, useContext, useEffect, useRef, useState } from "react";
import { loadSettings, saveSettings } from "../services/storageService";
import { THEMES } from "../theme/colors";

const SettingsContext = createContext(null);
const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

const LIMITS = {
  fontSize: [14, 26],
  lineHeight: [1.1, 2.6],
  wordSpacing: [0, 12],
  letterSpacing: [0, 1.2],
  textBoxPadding: [6, 36],
  highlightStrength: [0.2, 1.0],
  readingSpeed: [0.3, 2.0],
  pitch: [0.5, 2.0],
  hue: [0, 360],
  channel: [0, 1],
};

export const SettingsProvider = ({ children }) => {
  const [fontFamily, setFontFamily] = useState("Lexend");
  const [uiFontFamily, setUiFontFamily] = useState("System");
  const [applyUiFontEverywhere, setApplyUiFontEverywhere] = useState(false);
  const [fontSize, setFontSize] = useState(18);
  const [lineHeight, setLineHeight] = useState(1.5);
  const [wordSpacing, setWordSpacing] = useState(4);
  const [letterSpacing, setLetterSpacing] = useState(0.3);
  const [textBoxPadding, setTextBoxPadding] = useState(16);
  const [showTextBox, setShowTextBox] = useState(true);
  const [backgroundTheme, setBackgroundTheme] = useState("light");
  const [textColor, setTextColor] = useState(THEMES.light.text);
  const [highlightStrength, setHighlightStrength] = useState(0.6);
  const [readingSpeed, setReadingSpeed] = useState(0.6);
  const [pitch, setPitch] = useState(1.0);
  const [ttsVoiceName, setTtsVoiceName] = useState("");
  const [highlightHue, setHighlightHue] = useState(220);
  const [textHue, setTextHue] = useState(220);
  const [textSaturation, setTextSaturation] = useState(0.8);
  const [textValue, setTextValue] = useState(0.2);
  const [readingAreaHue, setReadingAreaHue] = useState(220);
  const [highlightSaturation, setHighlightSaturation] = useState(0.9);
  const [highlightValue, setHighlightValue] = useState(0.82);
  const [readingAreaSaturation, setReadingAreaSaturation] = useState(0.22);
  const [readingAreaValue, setReadingAreaValue] = useState(0.9);
  const didLoadRef = useRef(false);
  const saveTimerRef = useRef(null);

  const makeSafeSetter = (setter, min, max) => (valueOrUpdater) => {
    setter((prev) => {
      const rawValue =
        typeof valueOrUpdater === "function" ? valueOrUpdater(prev) : valueOrUpdater;
      return clamp(Number(rawValue), min, max);
    });
  };

  const setSafeFontSize = makeSafeSetter(
    setFontSize,
    LIMITS.fontSize[0],
    LIMITS.fontSize[1]
  );
  const setSafeLineHeight = makeSafeSetter(
    setLineHeight,
    LIMITS.lineHeight[0],
    LIMITS.lineHeight[1]
  );
  const setSafeWordSpacing = makeSafeSetter(
    setWordSpacing,
    LIMITS.wordSpacing[0],
    LIMITS.wordSpacing[1]
  );
  const setSafeLetterSpacing = makeSafeSetter(
    setLetterSpacing,
    LIMITS.letterSpacing[0],
    LIMITS.letterSpacing[1]
  );
  const setSafeTextBoxPadding = makeSafeSetter(
    setTextBoxPadding,
    LIMITS.textBoxPadding[0],
    LIMITS.textBoxPadding[1]
  );
  const setSafeHighlightStrength = makeSafeSetter(
    setHighlightStrength,
    LIMITS.highlightStrength[0],
    LIMITS.highlightStrength[1]
  );
  const setSafeReadingSpeed = makeSafeSetter(
    setReadingSpeed,
    LIMITS.readingSpeed[0],
    LIMITS.readingSpeed[1]
  );
  const setSafePitch = makeSafeSetter(
    setPitch,
    LIMITS.pitch[0],
    LIMITS.pitch[1]
  );
  const setSafeHighlightHue = makeSafeSetter(
    setHighlightHue,
    LIMITS.hue[0],
    LIMITS.hue[1]
  );
  const setSafeTextHue = makeSafeSetter(
    setTextHue,
    LIMITS.hue[0],
    LIMITS.hue[1]
  );
  const setSafeReadingAreaHue = makeSafeSetter(
    setReadingAreaHue,
    LIMITS.hue[0],
    LIMITS.hue[1]
  );
  const setSafeTextSaturation = makeSafeSetter(
    setTextSaturation,
    LIMITS.channel[0],
    LIMITS.channel[1]
  );
  const setSafeTextValue = makeSafeSetter(
    setTextValue,
    LIMITS.channel[0],
    LIMITS.channel[1]
  );
  const setSafeHighlightSaturation = makeSafeSetter(
    setHighlightSaturation,
    LIMITS.channel[0],
    LIMITS.channel[1]
  );
  const setSafeHighlightValue = makeSafeSetter(
    setHighlightValue,
    LIMITS.channel[0],
    LIMITS.channel[1]
  );
  const setSafeReadingAreaSaturation = makeSafeSetter(
    setReadingAreaSaturation,
    LIMITS.channel[0],
    LIMITS.channel[1]
  );
  const setSafeReadingAreaValue = makeSafeSetter(
    setReadingAreaValue,
    LIMITS.channel[0],
    LIMITS.channel[1]
  );

  useEffect(() => {
    let isMounted = true;
    loadSettings().then((stored) => {
      if (!isMounted) return;
      if (stored) {
        if (stored.fontFamily) setFontFamily(stored.fontFamily);
        if (stored.uiFontFamily) setUiFontFamily(stored.uiFontFamily);
        if (typeof stored.applyUiFontEverywhere === "boolean") {
          setApplyUiFontEverywhere(stored.applyUiFontEverywhere);
        }
        if (stored.fontSize) setSafeFontSize(stored.fontSize);
        if (stored.lineHeight) setSafeLineHeight(stored.lineHeight);
        if (stored.wordSpacing !== undefined) setSafeWordSpacing(stored.wordSpacing);
        if (stored.letterSpacing !== undefined) setSafeLetterSpacing(stored.letterSpacing);
        if (stored.textBoxPadding) setSafeTextBoxPadding(stored.textBoxPadding);
        if (typeof stored.showTextBox === "boolean") {
          setShowTextBox(stored.showTextBox);
        }
        if (stored.backgroundTheme) {
          const normalizedTheme =
            stored.backgroundTheme === "white" ? "light" : stored.backgroundTheme;
          const safeTheme =
            normalizedTheme === "dark" || normalizedTheme === "light"
              ? normalizedTheme
              : "light";
          setBackgroundTheme(safeTheme);
        }
        if (typeof stored.highlightStrength === "number") {
          setSafeHighlightStrength(stored.highlightStrength);
        }
        if (typeof stored.highlightHue === "number") setSafeHighlightHue(stored.highlightHue);
        if (typeof stored.textHue === "number") setSafeTextHue(stored.textHue);
        if (typeof stored.readingAreaHue === "number") setSafeReadingAreaHue(stored.readingAreaHue);
        if (typeof stored.textSaturation === "number") {
          setSafeTextSaturation(stored.textSaturation);
        }
        if (typeof stored.textValue === "number") {
          setSafeTextValue(stored.textValue);
        }
        if (typeof stored.highlightSaturation === "number") {
          setSafeHighlightSaturation(stored.highlightSaturation);
        }
        if (typeof stored.highlightValue === "number") {
          setSafeHighlightValue(stored.highlightValue);
        }
        if (typeof stored.readingAreaSaturation === "number") {
          setSafeReadingAreaSaturation(stored.readingAreaSaturation);
        }
        if (typeof stored.readingAreaValue === "number") {
          setSafeReadingAreaValue(stored.readingAreaValue);
        }
        if (stored.textColor) setTextColor(stored.textColor);
        if (stored.readingSpeed) setSafeReadingSpeed(stored.readingSpeed);
        if (typeof stored.pitch === "number") setSafePitch(stored.pitch);
        if (typeof stored.ttsVoiceName === "string") setTtsVoiceName(stored.ttsVoiceName);
      }
      didLoadRef.current = true;
    });

    return () => {
      isMounted = false;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!didLoadRef.current) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      saveSettings({
        fontFamily,
        uiFontFamily,
        applyUiFontEverywhere,
        fontSize,
        lineHeight,
        wordSpacing,
        letterSpacing,
        textBoxPadding,
        showTextBox,
        backgroundTheme,
        textColor,
        highlightStrength,
        readingSpeed,
        pitch,
        ttsVoiceName,
        highlightHue,
        textHue,
        readingAreaHue,
        textSaturation,
        textValue,
        highlightSaturation,
        highlightValue,
        readingAreaSaturation,
        readingAreaValue,
      });
    }, 200);
  }, [
    fontFamily,
    uiFontFamily,
    applyUiFontEverywhere,
    fontSize,
    lineHeight,
    wordSpacing,
    letterSpacing,
    textBoxPadding,
    showTextBox,
    backgroundTheme,
    textColor,
    highlightStrength,
    readingSpeed,
    pitch,
    ttsVoiceName,
    highlightHue,
    textHue,
    readingAreaHue,
    textSaturation,
    textValue,
    highlightSaturation,
    highlightValue,
    readingAreaSaturation,
    readingAreaValue,
  ]);

  useEffect(() => {
    if (!applyUiFontEverywhere) return;
    setFontFamily(uiFontFamily);
  }, [applyUiFontEverywhere, uiFontFamily]);

  const hsvToHex = (h, s, v) => {
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
    const toHex = (n) =>
      Math.round((n + m) * 255)
        .toString(16)
        .padStart(2, "0");
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  };

  useEffect(() => {
    setTextColor(hsvToHex(textHue, textSaturation, textValue));
  }, [textHue, textSaturation, textValue]);

  const value = {
    fontFamily,
    setFontFamily,
    uiFontFamily,
    setUiFontFamily,
    applyUiFontEverywhere,
    setApplyUiFontEverywhere,

    fontSize,
    setFontSize: setSafeFontSize,

    lineHeight,
    setLineHeight: setSafeLineHeight,

    wordSpacing,
    setWordSpacing: setSafeWordSpacing,

    letterSpacing,
    setLetterSpacing: setSafeLetterSpacing,

    textBoxPadding,
    setTextBoxPadding: setSafeTextBoxPadding,

    showTextBox,
    setShowTextBox,

    backgroundTheme,
    setBackgroundTheme,

    textColor,
    setTextColor,

    highlightStrength,
    setHighlightStrength: setSafeHighlightStrength,

    readingSpeed,
    setReadingSpeed: setSafeReadingSpeed,
    pitch,
    setPitch: setSafePitch,
    ttsVoiceName,
    setTtsVoiceName,
    highlightHue,
    setHighlightHue: setSafeHighlightHue,
    textHue,
    setTextHue: setSafeTextHue,
    textSaturation,
    setTextSaturation: setSafeTextSaturation,
    textValue,
    setTextValue: setSafeTextValue,
    readingAreaHue,
    setReadingAreaHue: setSafeReadingAreaHue,
    highlightSaturation,
    setHighlightSaturation: setSafeHighlightSaturation,
    highlightValue,
    setHighlightValue: setSafeHighlightValue,
    readingAreaSaturation,
    setReadingAreaSaturation: setSafeReadingAreaSaturation,
    readingAreaValue,
    setReadingAreaValue: setSafeReadingAreaValue,
  };

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error("useSettings must be used within SettingsProvider");
  }
  return context;
};
