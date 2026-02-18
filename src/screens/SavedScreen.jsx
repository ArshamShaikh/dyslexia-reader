import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { MaterialIcons } from "@expo/vector-icons";
import {
  deleteSavedText,
  getSavedTexts,
  updateSavedTextMeta,
} from "../services/storageService";
import { useSettings } from "../context/SettingsContext";
import { THEMES } from "../theme/colors";
import { FONT_FAMILY_MAP, uiSizeForFont, uiTrackingForFont } from "../theme/typography";
import ThemedDialog from "../components/ThemedDialog";
import { createReaderSession } from "../services/readerSessionService";

export default function SavedScreen({ navigation }) {
  const [savedTexts, setSavedTexts] = useState([]);
  const [isListLoading, setIsListLoading] = useState(false);
  const [isWorking, setIsWorking] = useState(false);
  const [openingFileId, setOpeningFileId] = useState("");
  const [pendingDeleteId, setPendingDeleteId] = useState(null);
  const [renamingFile, setRenamingFile] = useState(null);
  const [renameInput, setRenameInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

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
  const titleSize = uiSizeForFont(uiFontFamily, 22);
  const fileTitleSize = uiSizeForFont(uiFontFamily, 14);
  const searchSize = uiSizeForFont(uiFontFamily, 14);
  const isDark = backgroundTheme === "dark";
  const isBusy = isListLoading || isWorking || !!openingFileId;

  const normalizedSearch = useMemo(() => searchQuery.trim().toLowerCase(), [searchQuery]);

  const filteredFiles = useMemo(() => {
    if (!normalizedSearch) return savedTexts;
    return savedTexts.filter((item) => {
      const haystack = `${item.title || ""} ${item.text || ""}`.toLowerCase();
      return haystack.includes(normalizedSearch);
    });
  }, [savedTexts, normalizedSearch]);

  const loadSavedTexts = useCallback(async () => {
    setIsListLoading(true);
    try {
      const items = await getSavedTexts();
      setSavedTexts(items);
    } finally {
      setIsListLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadSavedTexts();
    }, [loadSavedTexts])
  );

  const handleDelete = async (id) => {
    if (!id || isBusy) return;
    setIsWorking(true);
    try {
      const updated = await deleteSavedText(id);
      setSavedTexts(updated);
    } finally {
      setIsWorking(false);
    }
  };

  const openRenameDialog = (item) => {
    setRenamingFile(item);
    setRenameInput(String(item?.title || ""));
  };

  const closeRenameDialog = () => {
    setRenamingFile(null);
    setRenameInput("");
  };

  const saveRename = async () => {
    if (!renamingFile || isBusy) return;
    const nextName = renameInput.trim();
    if (!nextName) return;
    setIsWorking(true);
    try {
      const updated = await updateSavedTextMeta(renamingFile.id, { title: nextName });
      setSavedTexts(updated);
      closeRenameDialog();
    } finally {
      setIsWorking(false);
    }
  };

  const openReader = async (item) => {
    if (!item || isBusy) return;
    setOpeningFileId(item.id);
    setIsWorking(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 60));
      const sessionId = createReaderSession(item.text);
      navigation.navigate("Reader", {
        sessionId,
        text: item.text.slice(0, 20000),
      });
    } finally {
      setTimeout(() => {
        setOpeningFileId("");
        setIsWorking(false);
      }, 220);
    }
  };

  const renderFileItem = (item) => (
    <View
      key={item.id}
      style={[
        styles.fileCard,
        {
          backgroundColor: isDark ? "#1C1C1C" : "#FFFFFF",
          borderColor: theme.border,
        },
      ]}
    >
      <View style={styles.fileTopRow}>
        <Pressable
          style={[styles.fileMain, isBusy && styles.disabledTouch]}
          onPress={() => openReader(item)}
          disabled={isBusy}
        >
          <MaterialIcons
            name="description"
            size={18}
            color={uiTextColor}
            style={styles.fileIcon}
          />
          <View style={styles.fileTextWrap}>
            <Text style={[styles.fileTitle, { color: uiTextColor, fontSize: fileTitleSize }, uiFontStyle]} numberOfLines={1}>
              {item.title}
            </Text>
          </View>
          {openingFileId === item.id && <ActivityIndicator size="small" color={uiTextColor} />}
        </Pressable>
        <View style={styles.fileActions}>
          <TouchableOpacity
            style={[styles.iconBtn, styles.fileIconBtn, { borderColor: theme.border }]}
            onPress={() => openRenameDialog(item)}
            accessibilityLabel="Rename file"
            disabled={isBusy}
          >
            <MaterialIcons name="edit" size={15} color={uiTextColor} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.iconBtn, styles.fileIconBtn, { borderColor: "#D26B6B" }]}
            onPress={() => setPendingDeleteId(item.id)}
            accessibilityLabel="Delete file"
            disabled={isBusy}
          >
            <MaterialIcons name="delete-outline" size={15} color="#D26B6B" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <Text style={[styles.title, { color: uiTextColor, fontSize: titleSize }, uiFontStyle]}>Saved Files</Text>

      <View
        style={[
          styles.searchBar,
          {
            borderColor: theme.border,
            backgroundColor:
              isDark
                ? "rgba(255,255,255,0.06)"
                : "rgba(0,0,0,0.03)",
          },
        ]}
      >
        <MaterialIcons name="search" size={18} color={uiTextColor} />
        <TextInput
          style={[styles.searchInput, { color: uiTextColor, fontSize: searchSize }, uiFontStyle]}
          placeholder="Search files..."
          placeholderTextColor={isDark ? "#9EA3A8" : "#888"}
          value={searchQuery}
          onChangeText={setSearchQuery}
          editable={!isBusy}
        />
        {!!searchQuery && (
          <TouchableOpacity onPress={() => setSearchQuery("")} disabled={isBusy}>
            <MaterialIcons name="close" size={18} color={uiTextColor} />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView contentContainerStyle={styles.contentWrap}>
        {savedTexts.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={[styles.emptyText, { color: uiTextColor }, uiFontStyle]}>
              You have no saved files yet.
            </Text>
          </View>
        ) : filteredFiles.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={[styles.emptyText, { color: uiTextColor }, uiFontStyle]}>
              No matching files.
            </Text>
          </View>
        ) : (
          <View style={styles.sectionList}>{filteredFiles.map((item) => renderFileItem(item))}</View>
        )}
      </ScrollView>

      <ThemedDialog
        visible={!!pendingDeleteId}
        title="Delete saved file?"
        message="This action cannot be undone."
        actions={[
          { label: "Cancel", value: "cancel" },
          { label: "Delete", value: "delete", tone: "destructive" },
        ]}
        theme={theme}
        onAction={async (action) => {
          if (isBusy) return;
          const targetId = pendingDeleteId;
          setPendingDeleteId(null);
          if (action?.value === "delete" && targetId) {
            await handleDelete(targetId);
          }
        }}
        onRequestClose={() => setPendingDeleteId(null)}
      />

      <Modal
        visible={!!renamingFile}
        transparent
        animationType="fade"
        onRequestClose={closeRenameDialog}
      >
        <KeyboardAvoidingView
          style={styles.editOverlay}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={Platform.OS === "ios" ? 24 : 10}
        >
          <Pressable style={styles.editBackdrop} onPress={closeRenameDialog} />
          <View
            style={[
              styles.editPanel,
              {
                borderColor: theme.border,
                backgroundColor: isDark ? "#1C1C1C" : "#FFFFFF",
              },
            ]}
          >
            <Text style={[styles.editTitle, { color: uiTextColor }, uiFontStyle]}>Rename File</Text>
            <Text style={[styles.editHint, { color: uiTextColor }, uiFontStyle]}>
              Enter a new file name.
            </Text>
            <TextInput
              style={[
                styles.editInput,
                {
                  color: uiTextColor,
                  borderColor: theme.border,
                  backgroundColor:
                    isDark
                      ? "rgba(255,255,255,0.06)"
                      : "rgba(0,0,0,0.03)",
                },
                uiFontStyle,
              ]}
              value={renameInput}
              onChangeText={setRenameInput}
              placeholder="File name"
              placeholderTextColor={isDark ? "#A0A0A0" : "#777"}
              editable={!isBusy}
            />
            <View style={styles.editActions}>
              <TouchableOpacity
                style={[styles.textBtn, { borderColor: theme.border }]}
                onPress={closeRenameDialog}
                disabled={isBusy}
              >
                <Text style={[styles.textBtnText, { color: uiTextColor }, uiFontStyle]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.textBtn,
                  {
                    borderColor: uiTextColor,
                    backgroundColor: uiTextColor,
                  },
                ]}
                onPress={saveRename}
                disabled={isBusy}
              >
                <Text style={[styles.textBtnText, { color: theme.background }, uiFontStyle]}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "transparent",
    padding: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 12,
    textAlign: "center",
  },
  searchBar: {
    borderWidth: 1,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 8,
    marginBottom: 10,
  },
  searchInput: {
    flex: 1,
    minWidth: 0,
    fontSize: 14,
    paddingVertical: 0,
  },
  contentWrap: {
    paddingBottom: 24,
    gap: 12,
  },
  sectionList: {
    gap: 10,
  },
  fileCard: {
    borderWidth: 1.2,
    borderRadius: 12,
    padding: 10,
    minHeight: 58,
    gap: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  fileTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 6,
  },
  fileMain: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
    minWidth: 0,
  },
  fileIcon: {
    marginTop: 0,
  },
  fileTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  fileTitle: {
    fontSize: 14,
    fontWeight: "700",
    lineHeight: 19,
  },
  fileActions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 6,
    marginLeft: 6,
  },
  fileIconBtn: {
    width: 30,
    height: 30,
    borderRadius: 7,
  },
  iconBtn: {
    width: 34,
    height: 34,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 24,
  },
  emptyText: {
    fontSize: 13,
    opacity: 0.82,
  },
  editOverlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  editBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.24)",
  },
  editPanel: {
    borderTopLeftRadius: 14,
    borderTopRightRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 18,
    gap: 10,
  },
  editTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  editHint: {
    fontSize: 12,
    opacity: 0.86,
  },
  editInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
  },
  editActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 8,
    marginTop: 4,
  },
  textBtn: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
  },
  textBtnText: {
    fontSize: 11,
    fontWeight: "700",
  },
  disabledTouch: {
    opacity: 0.72,
  },
});
