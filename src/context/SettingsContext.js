import { createContext, useContext, useEffect, useRef, useState } from "react";
import { loadSettings, saveSettings } from "../services/storageService";
import { THEMES } from "../theme/colors";

const SettingsContext = createContext(null);

export const SettingsProvider = ({ children }) => {
  const [fontFamily, setFontFamily] = useState("Lexend");
  const [fontSize, setFontSize] = useState(18);
  const [lineHeight, setLineHeight] = useState(1.5);
  const [wordSpacing, setWordSpacing] = useState(4);
  const [letterSpacing, setLetterSpacing] = useState(0.3);
  const [textBoxPadding, setTextBoxPadding] = useState(16);
  const [showTextBox, setShowTextBox] = useState(true);
  const [backgroundTheme, setBackgroundTheme] = useState("light");
  const [textColor, setTextColor] = useState(THEMES.light.text);
  const [highlightStrength, setHighlightStrength] = useState(0.6);
  const [readingSpeed, setReadingSpeed] = useState(0.5);
  const didLoadRef = useRef(false);
  const saveTimerRef = useRef(null);

  useEffect(() => {
    let isMounted = true;
    loadSettings().then((stored) => {
      if (!isMounted) return;
      if (stored) {
        if (stored.fontFamily) setFontFamily(stored.fontFamily);
        if (stored.fontSize) setFontSize(stored.fontSize);
        if (stored.lineHeight) setLineHeight(stored.lineHeight);
        if (stored.wordSpacing) setWordSpacing(stored.wordSpacing);
        if (stored.letterSpacing) setLetterSpacing(stored.letterSpacing);
        if (stored.textBoxPadding) setTextBoxPadding(stored.textBoxPadding);
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
          const theme = THEMES[safeTheme] || THEMES.light;
          setTextColor(theme.text);
        }
        if (typeof stored.highlightStrength === "number") {
          setHighlightStrength(stored.highlightStrength);
        }
        if (stored.textColor) setTextColor(stored.textColor);
        if (stored.readingSpeed) setReadingSpeed(stored.readingSpeed);
      }
      didLoadRef.current = true;
    });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!didLoadRef.current) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      saveSettings({
        fontFamily,
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
      });
    }, 200);
  }, [
    fontFamily,
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
  ]);

  useEffect(() => {
    const theme = THEMES[backgroundTheme];
    if (theme && theme.text !== textColor) {
      setTextColor(theme.text);
    }
  }, [backgroundTheme]);

  const value = {
    fontFamily,
    setFontFamily,

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

    backgroundTheme,
    setBackgroundTheme,

    textColor,
    setTextColor,

    highlightStrength,
    setHighlightStrength,

    readingSpeed,
    setReadingSpeed,
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
