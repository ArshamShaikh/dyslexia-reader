// SavedScreen.jsx
import { useCallback, useState } from "react";
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { deleteSavedText, getSavedTexts } from "../services/storageService";
import { useSettings } from "../context/SettingsContext";
import { THEMES } from "../theme/colors";

export default function SavedScreen({ navigation }) {
  const [savedTexts, setSavedTexts] = useState([]);
  const { backgroundTheme, textColor } = useSettings();
  const theme = THEMES[backgroundTheme] || THEMES.light;

  const loadSavedTexts = useCallback(() => {
    getSavedTexts().then(setSavedTexts);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadSavedTexts();
    }, [loadSavedTexts])
  );

  const handleDelete = async (id) => {
    const updated = await deleteSavedText(id);
    setSavedTexts(updated);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <Text style={[styles.title, { color: textColor }]}>Saved Texts</Text>
      {savedTexts.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={[styles.emptyText, { color: textColor }]}>
            You have no saved passages yet.
          </Text>
        </View>
      ) : (
        <FlatList
          data={savedTexts}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <View
              style={[
                styles.card,
                {
                  backgroundColor:
                    theme.background === "#121212" ? "#1C1C1C" : "#FFFFFF",
                  borderColor: theme.border,
                },
              ]}
            >
              <TouchableOpacity
                onPress={() => navigation.navigate("Reader", { text: item.text })}
              >
                <Text style={[styles.cardTitle, { color: textColor }]}>
                  {item.title}
                </Text>
                <Text style={[styles.cardPreview, { color: textColor }]} numberOfLines={2}>
                  {item.text}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={() => handleDelete(item.id)}
                accessibilityLabel="Delete saved text"
              >
                <Text style={styles.deleteText}>Delete</Text>
              </TouchableOpacity>
            </View>
          )}
        />
      )}

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
    color: "#1F1F1F",
    marginBottom: 16,
    textAlign: "center",
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyText: {
    color: "#777",
    fontSize: 13,
  },
  listContent: {
    gap: 12,
    paddingBottom: 24,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: "#BDBDBD",
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1F1F1F",
    marginBottom: 6,
  },
  cardPreview: {
    fontSize: 12,
    color: "#333333",
  },
  deleteButton: {
    alignSelf: "flex-start",
    marginTop: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#D26B6B",
  },
  deleteText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#D26B6B",
  },
});
