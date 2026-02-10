// SavedScreen.jsx
import { useCallback, useEffect, useMemo, useState } from "react";
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
  deleteSavedFolder,
  deleteSavedText,
  getSavedTexts,
  renameSavedFolder,
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
  const [pendingDeleteFolder, setPendingDeleteFolder] = useState(null);
  const [movingItem, setMovingItem] = useState(null);
  const [renamingFile, setRenamingFile] = useState(null);
  const [renamingFolder, setRenamingFolder] = useState(null);
  const [folderInput, setFolderInput] = useState("");
  const [showNewFolderInput, setShowNewFolderInput] = useState(false);
  const [renameInput, setRenameInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFolder, setActiveFolder] = useState(null);
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
  const sectionTitleSize = uiSizeForFont(uiFontFamily, 15);
  const folderNameSize = uiSizeForFont(uiFontFamily, 14);
  const folderCountSize = uiSizeForFont(uiFontFamily, 11);
  const fileTitleSize = uiSizeForFont(uiFontFamily, 14);
  const searchSize = uiSizeForFont(uiFontFamily, 14);
  const isDark = backgroundTheme === "dark";
  const isBusy = isListLoading || isWorking || !!openingFileId;

  const getFolderName = (item) => {
    const raw = String(item?.folder || "").trim();
    if (!raw || raw.toLowerCase() === "unfiled") return "";
    return raw;
  };

  const folders = useMemo(() => {
    const folderMap = new Map();
    savedTexts.forEach((item) => {
      const folderName = getFolderName(item);
      if (!folderName) return;
      const existing = folderMap.get(folderName) || { name: folderName, count: 0 };
      existing.count += 1;
      folderMap.set(folderName, existing);
    });
    return [...folderMap.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [savedTexts]);

  const rootFiles = useMemo(
    () => savedTexts.filter((item) => !getFolderName(item)),
    [savedTexts]
  );

  const normalizedSearch = useMemo(
    () => searchQuery.trim().toLowerCase(),
    [searchQuery]
  );

  const filteredFolders = useMemo(() => {
    if (!normalizedSearch) return folders;
    return folders.filter((folder) =>
      folder.name.toLowerCase().includes(normalizedSearch)
    );
  }, [folders, normalizedSearch]);

  const fileMatches = useMemo(() => {
    const source = activeFolder
      ? savedTexts.filter((item) => getFolderName(item) === activeFolder)
      : savedTexts;

    if (!normalizedSearch) return source;

    return source.filter((item) => {
      const haystack = `${item.title || ""} ${item.text || ""} ${getFolderName(item)}`.toLowerCase();
      return haystack.includes(normalizedSearch);
    });
  }, [savedTexts, activeFolder, normalizedSearch]);

  useEffect(() => {
    if (!activeFolder) return;
    if (!folders.some((folder) => folder.name === activeFolder)) {
      setActiveFolder(null);
    }
  }, [activeFolder, folders]);

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
    if (!id) return;
    setIsWorking(true);
    try {
      const updated = await deleteSavedText(id);
      setSavedTexts(updated);
    } finally {
      setIsWorking(false);
    }
  };

  const handleDeleteFolder = async (folderName) => {
    if (!folderName) return;
    setIsWorking(true);
    try {
      const updated = await deleteSavedFolder(folderName);
      setSavedTexts(updated);
      if (activeFolder === folderName) {
        setActiveFolder(null);
      }
    } finally {
      setIsWorking(false);
    }
  };

  const openMoveDialog = (item) => {
    setMovingItem(item);
    setFolderInput(getFolderName(item));
    setShowNewFolderInput(false);
  };

  const openRenameFileDialog = (item) => {
    setRenamingFolder(null);
    setRenamingFile(item);
    setRenameInput(String(item?.title || ""));
  };

  const openRenameFolderDialog = (folderName) => {
    setRenamingFile(null);
    setRenamingFolder(folderName);
    setRenameInput(folderName);
  };

  const closeRenameDialog = () => {
    setRenamingFile(null);
    setRenamingFolder(null);
    setRenameInput("");
  };

  const saveRename = async () => {
    if (isBusy) return;
    const nextName = renameInput.trim();
    if (renamingFile) {
      if (!nextName) return;
      setIsWorking(true);
      try {
        const updated = await updateSavedTextMeta(renamingFile.id, { title: nextName });
        setSavedTexts(updated);
        closeRenameDialog();
      } finally {
        setIsWorking(false);
      }
      return;
    }

    if (renamingFolder !== null) {
      setIsWorking(true);
      try {
        const updated = await renameSavedFolder(renamingFolder, nextName);
        setSavedTexts(updated);
        if (activeFolder === renamingFolder) {
          setActiveFolder(nextName || null);
        }
        closeRenameDialog();
      } finally {
        setIsWorking(false);
      }
    }
  };

  const saveFolderMove = async () => {
    if (!movingItem || isBusy) return;
    const folder = folderInput.trim();
    const currentFolder = getFolderName(movingItem);
    const targetFolder = folder;
    if (targetFolder === currentFolder) {
      setMovingItem(null);
      setFolderInput("");
      return;
    }
    setIsWorking(true);
    try {
      const updated = await updateSavedTextMeta(movingItem.id, {
        folder,
      });
      setSavedTexts(updated);
      setMovingItem(null);
      setFolderInput("");
      setShowNewFolderInput(false);
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
            onPress={() => openRenameFileDialog(item)}
            accessibilityLabel="Rename file"
            disabled={isBusy}
          >
            <MaterialIcons name="edit" size={15} color={uiTextColor} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.iconBtn, styles.fileIconBtn, { borderColor: theme.border }]}
            onPress={() => openMoveDialog(item)}
            accessibilityLabel="Move file to folder"
            disabled={isBusy}
          >
            <MaterialIcons name="drive-file-move" size={15} color={uiTextColor} />
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
          placeholder={activeFolder ? "Search in this folder..." : "Search folders or files..."}
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

      {activeFolder && (
        <View
          style={[
            styles.breadcrumb,
            {
              borderColor: theme.border,
              backgroundColor:
                isDark
                  ? "rgba(255,255,255,0.06)"
                  : "rgba(0,0,0,0.03)",
            },
          ]}
        >
          <TouchableOpacity
            style={styles.breadcrumbBack}
            onPress={() => setActiveFolder(null)}
            disabled={isBusy}
          >
            <MaterialIcons name="arrow-back" size={16} color={uiTextColor} />
            <Text style={[styles.breadcrumbBackText, { color: uiTextColor }, uiFontStyle]}>Folders</Text>
          </TouchableOpacity>
          <View style={styles.breadcrumbCurrent}>
            <MaterialIcons name="folder" size={16} color={uiTextColor} />
            <Text style={[styles.breadcrumbCurrentText, { color: uiTextColor }, uiFontStyle]} numberOfLines={1}>
              {activeFolder}
            </Text>
          </View>
        </View>
      )}

      <ScrollView contentContainerStyle={styles.contentWrap}>
        {savedTexts.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={[styles.emptyText, { color: uiTextColor }, uiFontStyle]}>
              You have no saved files yet.
            </Text>
          </View>
        ) : activeFolder ? (
          fileMatches.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={[styles.emptyText, { color: uiTextColor }, uiFontStyle]}>No files found.</Text>
            </View>
          ) : (
            <View style={styles.sectionList}>
              {fileMatches.map((item) => renderFileItem(item))}
            </View>
          )
        ) : (
          <>
            <Text style={[styles.sectionTitle, { color: uiTextColor, fontSize: sectionTitleSize }, uiFontStyle]}>Folders</Text>
            {filteredFolders.length === 0 ? (
              !normalizedSearch && rootFiles.length > 0 ? null : (
                <View style={styles.emptyState}>
                  <Text style={[styles.emptyText, { color: uiTextColor }, uiFontStyle]}>No matching folders.</Text>
                </View>
              )
            ) : (
              <View style={styles.sectionList}>
                {filteredFolders.map((folder) => (
                  <View
                    key={folder.name}
                    style={[
                      styles.folderCard,
                      {
                        borderColor: theme.border,
                        backgroundColor: isDark ? "#1C1C1C" : "#FFFFFF",
                      },
                    ]}
                  >
                    <Pressable
                      style={[styles.folderMainTap, isBusy && styles.disabledTouch]}
                      onPress={() => setActiveFolder(folder.name)}
                      disabled={isBusy}
                    >
                      <View style={styles.folderLeft}>
                        <MaterialIcons name="folder" size={18} color={uiTextColor} />
                        <View style={styles.folderTextWrap}>
                          <Text style={[styles.folderName, { color: uiTextColor, fontSize: folderNameSize }, uiFontStyle]} numberOfLines={1}>
                            {folder.name}
                          </Text>
                          <Text style={[styles.folderCount, { color: uiTextColor, fontSize: folderCountSize }, uiFontStyle]}>
                            {folder.count} {folder.count === 1 ? "file" : "files"}
                          </Text>
                        </View>
                      </View>
                    </Pressable>
                    <View style={styles.folderActions}>
                      <TouchableOpacity
                        style={[styles.iconBtn, styles.fileIconBtn, { borderColor: theme.border }]}
                        onPress={() => openRenameFolderDialog(folder.name)}
                        accessibilityLabel="Rename folder"
                        disabled={isBusy}
                      >
                        <MaterialIcons name="edit" size={15} color={uiTextColor} />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.iconBtn, styles.fileIconBtn, { borderColor: "#D26B6B" }]}
                        onPress={() => setPendingDeleteFolder(folder.name)}
                        accessibilityLabel="Delete folder"
                        disabled={isBusy}
                      >
                        <MaterialIcons name="delete-outline" size={15} color="#D26B6B" />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {!normalizedSearch && (
              <>
                <Text style={[styles.sectionTitle, { color: uiTextColor, fontSize: sectionTitleSize }, uiFontStyle]}>Files</Text>
                {rootFiles.length === 0 ? (
                  <View style={styles.emptyState}>
                    <Text style={[styles.emptyText, { color: uiTextColor }, uiFontStyle]}>No files in root.</Text>
                  </View>
                ) : (
                  <View style={styles.sectionList}>
                    {rootFiles.map((item) => renderFileItem(item))}
                  </View>
                )}
              </>
            )}

            {!!normalizedSearch && (
              <>
                <Text style={[styles.sectionTitle, { color: uiTextColor, fontSize: sectionTitleSize }, uiFontStyle]}>Matching Files</Text>
                {fileMatches.length === 0 ? (
                  <View style={styles.emptyState}>
                    <Text style={[styles.emptyText, { color: uiTextColor }, uiFontStyle]}>No matching files.</Text>
                  </View>
                ) : (
                  <View style={styles.sectionList}>
                    {fileMatches.slice(0, 30).map((item) => renderFileItem(item))}
                  </View>
                )}
              </>
            )}
          </>
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

      <ThemedDialog
        visible={!!pendingDeleteFolder}
        title="Delete folder?"
        message="Files in this folder will be moved to Root."
        actions={[
          { label: "Cancel", value: "cancel" },
          { label: "Delete", value: "delete", tone: "destructive" },
        ]}
        theme={theme}
        onAction={async (action) => {
          if (isBusy) return;
          const targetFolder = pendingDeleteFolder;
          setPendingDeleteFolder(null);
          if (action?.value === "delete" && targetFolder) {
            await handleDeleteFolder(targetFolder);
          }
        }}
        onRequestClose={() => setPendingDeleteFolder(null)}
      />

      <Modal
        visible={!!renamingFile || renamingFolder !== null}
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
            <Text style={[styles.editTitle, { color: uiTextColor }, uiFontStyle]}>
              {renamingFile ? "Rename File" : "Rename Folder"}
            </Text>
            <Text style={[styles.editHint, { color: uiTextColor }, uiFontStyle]}>
              {renamingFile
                ? "Enter a new file name."
                : "Enter a new folder name. Leave blank to move files to Root."}
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
              placeholder={renamingFile ? "File name" : "Folder name"}
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

      <Modal
        visible={!!movingItem}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setMovingItem(null);
          setFolderInput("");
          setShowNewFolderInput(false);
        }}
      >
        <KeyboardAvoidingView
          style={styles.editOverlay}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={Platform.OS === "ios" ? 24 : 10}
        >
          <Pressable
            style={styles.editBackdrop}
            onPress={() => {
              setMovingItem(null);
              setFolderInput("");
              setShowNewFolderInput(false);
            }}
          />
          <View
            style={[
              styles.editPanel,
              {
                borderColor: theme.border,
                backgroundColor: isDark ? "#1C1C1C" : "#FFFFFF",
              },
            ]}
          >
            <Text style={[styles.editTitle, { color: uiTextColor }, uiFontStyle]}>Move File To Folder</Text>
            <Text style={[styles.editHint, { color: uiTextColor }, uiFontStyle]}>
              Select a destination folder.
            </Text>
            <View style={styles.moveTopActions}>
              <TouchableOpacity
                style={[
                  styles.newFolderBtn,
                  {
                    borderColor: theme.border,
                    backgroundColor:
                      isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.02)",
                  },
                ]}
                onPress={() => {
                  setShowNewFolderInput((prev) => !prev);
                  if (!showNewFolderInput) setFolderInput("");
                }}
                disabled={isBusy}
              >
                <MaterialIcons name="create-new-folder" size={16} color={uiTextColor} />
                <Text style={[styles.newFolderBtnText, { color: uiTextColor }, uiFontStyle]}>
                  {showNewFolderInput ? "Close" : "New Folder"}
                </Text>
              </TouchableOpacity>
            </View>

            {showNewFolderInput && (
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
                value={folderInput}
                onChangeText={setFolderInput}
                placeholder="Enter folder name"
                placeholderTextColor={isDark ? "#A0A0A0" : "#777"}
                editable={!isBusy}
              />
            )}
            <ScrollView
              style={styles.folderPickerScroll}
              contentContainerStyle={styles.folderListWrap}
              keyboardShouldPersistTaps="handled"
            >
              {(() => {
                const currentFolder = getFolderName(movingItem);
                const selectedName = folderInput.trim();
                const isSelected = selectedName === "";
                const isCurrentFolder = currentFolder === "";
                return (
                  <TouchableOpacity
                    key="move-folder-root"
                    style={[
                      styles.folderListItem,
                      {
                        borderColor: isSelected ? uiTextColor : theme.border,
                        backgroundColor:
                          isDark
                            ? "rgba(255,255,255,0.04)"
                            : "rgba(0,0,0,0.02)",
                        opacity: isCurrentFolder ? 0.58 : 1,
                      },
                    ]}
                    onPress={() => setFolderInput("")}
                    disabled={isCurrentFolder || isBusy}
                    accessibilityLabel="Move to root"
                  >
                    <View style={styles.folderListLeft}>
                      <MaterialIcons
                        name="folder-open"
                        size={18}
                        color={uiTextColor}
                      />
                      <Text style={[styles.folderListName, { color: uiTextColor }, uiFontStyle]} numberOfLines={1}>
                        Root
                      </Text>
                    </View>
                    {isSelected && (
                      <MaterialIcons name="check" size={18} color={uiTextColor} />
                    )}
                  </TouchableOpacity>
                );
              })()}
              {folders.map((folder) => {
                const currentFolder = getFolderName(movingItem);
                const selectedName = folderInput.trim();
                const isSelected = selectedName === folder.name;
                const isCurrentFolder = currentFolder === folder.name;
                return (
                  <TouchableOpacity
                    key={`move-folder-${folder.name}`}
                    style={[
                      styles.folderListItem,
                      {
                        borderColor: isSelected ? uiTextColor : theme.border,
                        backgroundColor:
                          isDark
                            ? "rgba(255,255,255,0.04)"
                            : "rgba(0,0,0,0.02)",
                        opacity: isCurrentFolder ? 0.58 : 1,
                      },
                    ]}
                    onPress={() => setFolderInput(folder.name)}
                    disabled={isCurrentFolder || isBusy}
                    accessibilityLabel={`Move to ${folder.name}`}
                  >
                    <View style={styles.folderListLeft}>
                      <MaterialIcons
                        name="folder"
                        size={18}
                        color={uiTextColor}
                      />
                      <Text style={[styles.folderListName, { color: uiTextColor }, uiFontStyle]} numberOfLines={1}>
                        {folder.name}
                      </Text>
                    </View>
                    {isSelected && (
                      <MaterialIcons name="check" size={18} color={uiTextColor} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            <View style={styles.moveActions}>
              <TouchableOpacity
                style={[
                  styles.moveActionBtn,
                  {
                    borderColor: theme.border,
                    backgroundColor:
                      isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.02)",
                  },
                ]}
                onPress={() => {
                  setMovingItem(null);
                  setFolderInput("");
                }}
                disabled={isBusy}
              >
                <Text style={[styles.moveActionText, { color: uiTextColor }, uiFontStyle]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.moveActionBtn,
                  {
                    borderColor: "#0A84FF",
                    backgroundColor: "#0A84FF",
                  },
                ]}
                onPress={saveFolderMove}
                disabled={isBusy}
              >
                <Text style={[styles.moveActionText, { color: "#FFFFFF" }, uiFontStyle]}>Move</Text>
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
  breadcrumb: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    marginBottom: 10,
  },
  breadcrumbBack: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  breadcrumbBackText: {
    fontSize: 12,
    fontWeight: "700",
  },
  breadcrumbCurrent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    flex: 1,
    justifyContent: "flex-end",
    minWidth: 0,
  },
  breadcrumbCurrentText: {
    fontSize: 12,
    fontWeight: "700",
    maxWidth: "80%",
  },
  contentWrap: {
    paddingBottom: 24,
    gap: 12,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    marginTop: 4,
  },
  sectionList: {
    gap: 10,
  },
  folderCard: {
    borderWidth: 1.2,
    borderRadius: 12,
    padding: 10,
    minHeight: 58,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  folderMainTap: {
    flex: 1,
  },
  folderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
    minWidth: 0,
  },
  folderActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginLeft: 6,
  },
  folderTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  folderName: {
    fontSize: 14,
    fontWeight: "700",
    lineHeight: 19,
  },
  folderCount: {
    fontSize: 11,
    opacity: 0.78,
    marginTop: 0,
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
  folderPickerScroll: {
    maxHeight: 220,
  },
  moveTopActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  newFolderBtn: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  newFolderBtnText: {
    fontSize: 12,
    fontWeight: "700",
  },
  folderListWrap: {
    gap: 8,
  },
  folderListItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 9,
  },
  folderListLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
    minWidth: 0,
  },
  folderListName: {
    fontSize: 13,
    fontWeight: "700",
  },
  moveActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
    marginTop: 4,
  },
  moveActionBtn: {
    minWidth: 96,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  moveActionText: {
    fontSize: 14,
    fontWeight: "700",
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
