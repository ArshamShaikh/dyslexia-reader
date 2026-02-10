export const FONT_FAMILY_MAP = {
  Lexend: "Lexend-Regular",
  OpenDyslexic: "OpenDyslexic-Regular",
  System: undefined,
};

export const isOpenDyslexicUi = (fontKey) => fontKey === "OpenDyslexic";

export const uiFontScaleFor = (fontKey) => (isOpenDyslexicUi(fontKey) ? 0.76 : 1);

export const uiSizeForFont = (fontKey, baseSize) =>
  Math.max(10, Math.round(baseSize * uiFontScaleFor(fontKey)));

export const uiTrackingForFont = (fontKey) => (isOpenDyslexicUi(fontKey) ? -0.35 : 0);
