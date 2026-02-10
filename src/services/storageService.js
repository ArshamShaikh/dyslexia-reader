import AsyncStorage from "@react-native-async-storage/async-storage";

const SETTINGS_KEY = "settings:v1";
const SAVED_TEXTS_KEY = "savedTexts:v1";
const MAX_FOLDER_LENGTH = 32;
const MAX_LABEL_LENGTH = 24;

const normalizeFolder = (folder) =>
  String(folder || "")
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, MAX_FOLDER_LENGTH);

const normalizeLabels = (labels) => {
  if (!Array.isArray(labels)) return [];
  const cleaned = labels
    .map((label) =>
      String(label || "")
        .trim()
        .replace(/\s+/g, " ")
        .slice(0, MAX_LABEL_LENGTH)
    )
    .filter(Boolean)
    .slice(0, 8);
  return [...new Set(cleaned)];
};

const normalizeSavedEntry = (item) => {
  const normalizedLabels = normalizeLabels(item?.labels);
  return {
    ...item,
    title: String(item?.title || ""),
    text: String(item?.text || ""),
    labels: normalizedLabels,
    // Backward-compat: migrate old label-based grouping to folder when missing.
    folder: normalizeFolder(item?.folder || normalizedLabels[0] || ""),
  };
};

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
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.map(normalizeSavedEntry) : [];
  } catch (error) {
    console.warn("Saved texts load failed:", error);
    return [];
  }
};

export const isTextSaved = async (text) => {
  const trimmed = (text || "").trim();
  if (!trimmed) return false;
  const existing = await getSavedTexts();
  return existing.some((item) => item.text === trimmed);
};

export const addSavedText = async (text, title, meta = {}) => {
  const trimmed = (text || "").trim();
  if (!trimmed) return [];

  const existing = await getSavedTexts();
  const alreadySaved = existing.find((item) => item.text === trimmed);
  if (alreadySaved) {
    return existing;
  }

  const labels = Array.isArray(meta) ? meta : normalizeLabels(meta?.labels);
  const folder = Array.isArray(meta)
    ? normalizeFolder(labels[0] || "")
    : normalizeFolder(meta?.folder);

  const entry = {
    id: Date.now().toString(),
    title: title || trimmed.split(/\s+/).slice(0, 6).join(" "),
    text: trimmed,
    labels: normalizeLabels(labels),
    folder,
    createdAt: new Date().toISOString(),
  };
  const updated = [entry, ...existing];
  try {
    await AsyncStorage.setItem(SAVED_TEXTS_KEY, JSON.stringify(updated));
  } catch (error) {
    console.warn("Saved texts save failed:", error);
  }
  return updated;
};

export const updateSavedTextMeta = async (id, updates = {}) => {
  const existing = await getSavedTexts();
  const updated = existing.map((item) => {
    if (item.id !== id) return item;
    const normalizedUpdateLabels =
      updates.labels !== undefined
        ? normalizeLabels(updates.labels)
        : normalizeLabels(item.labels);
    const normalizedUpdateFolder =
      updates.folder !== undefined
        ? normalizeFolder(updates.folder)
        : normalizeFolder(item.folder || normalizedUpdateLabels[0] || "");
    return {
      ...item,
      title:
        typeof updates.title === "string" && updates.title.trim()
          ? updates.title.trim()
          : item.title,
      labels: normalizedUpdateLabels,
      folder: normalizedUpdateFolder,
    };
  });
  try {
    await AsyncStorage.setItem(SAVED_TEXTS_KEY, JSON.stringify(updated));
  } catch (error) {
    console.warn("Saved texts update failed:", error);
  }
  return updated;
};

export const renameSavedFolder = async (fromFolder, toFolder) => {
  const existing = await getSavedTexts();
  const fromName = normalizeFolder(fromFolder);
  const targetFolder = normalizeFolder(toFolder);
  if (!fromName) return existing;

  const updated = existing.map((item) => {
    const currentFolder = normalizeFolder(item?.folder || item?.labels?.[0] || "");
    if (currentFolder !== fromName) return item;
    return {
      ...item,
      folder: targetFolder,
    };
  });

  try {
    await AsyncStorage.setItem(SAVED_TEXTS_KEY, JSON.stringify(updated));
  } catch (error) {
    console.warn("Saved folder rename failed:", error);
  }
  return updated;
};

export const deleteSavedFolder = async (folderName) => {
  const existing = await getSavedTexts();
  const sourceFolder = normalizeFolder(folderName);
  if (!sourceFolder) return existing;

  const updated = existing.map((item) => {
    const currentFolder = normalizeFolder(item?.folder || item?.labels?.[0] || "");
    if (currentFolder !== sourceFolder) return item;
    return {
      ...item,
      folder: "",
    };
  });

  try {
    await AsyncStorage.setItem(SAVED_TEXTS_KEY, JSON.stringify(updated));
  } catch (error) {
    console.warn("Saved folder delete failed:", error);
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
