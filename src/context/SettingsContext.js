import { createContext, useContext, useState } from "react";

const SettingsContext = createContext(null);

export const SettingsProvider = ({ children }) => {
  const [fontFamily, setFontFamily] = useState("Lexend");
  const [fontSize, setFontSize] = useState(18);
  const [lineHeight, setLineHeight] = useState(1.6);
  const [backgroundTheme, setBackgroundTheme] = useState("soft");
  const [textColor, setTextColor] = useState("#2E2E2E");
  const [readingSpeed, setReadingSpeed] = useState(0.45);

  const value = {
    fontFamily,
    setFontFamily,

    fontSize,
    setFontSize,

    lineHeight,
    setLineHeight,

    backgroundTheme,
    setBackgroundTheme,

    textColor,
    setTextColor,

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
