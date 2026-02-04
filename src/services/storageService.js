import AsyncStorage from "@react-native-async-storage/async-storage";

const SETTINGS_KEY = "settings:v1";
const SAVED_TEXTS_KEY = "savedTexts:v1";

export const loadSettings = async () => {
  try {
    const raw = await AsyncStorage.getItem(SETTINGS_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    console.warn("Settings load failed:", error);
    return null;
  }
};

export const saveSettings = async (settings) => {
  try {
    await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch (error) {
    console.warn("Settings save failed:", error);
  }
};

export const getSavedTexts = async () => {
  try {
    const raw = await AsyncStorage.getItem(SAVED_TEXTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (error) {
    console.warn("Saved texts load failed:", error);
    return [];
  }
};

export const addSavedText = async (text, title) => {
  const trimmed = (text || "").trim();
  if (!trimmed) return [];

  const entry = {
    id: Date.now().toString(),
    title: title || trimmed.split(/\s+/).slice(0, 6).join(" "),
    text: trimmed,
    createdAt: new Date().toISOString(),
  };

  const existing = await getSavedTexts();
  const updated = [entry, ...existing];
  try {
    await AsyncStorage.setItem(SAVED_TEXTS_KEY, JSON.stringify(updated));
  } catch (error) {
    console.warn("Saved texts save failed:", error);
  }
  return updated;
};

export const deleteSavedText = async (id) => {
  const existing = await getSavedTexts();
  const updated = existing.filter((item) => item.id !== id);
  try {
    await AsyncStorage.setItem(SAVED_TEXTS_KEY, JSON.stringify(updated));
  } catch (error) {
    console.warn("Saved texts delete failed:", error);
  }
  return updated;
};
