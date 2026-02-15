import { MaterialIcons } from "@expo/vector-icons";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { getSyllableBreakdown, getWordDefinition } from "../services/textService";
import { speakText, stopSpeech } from "../services/ttsService";

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

const getPhoneticSyllableSegments = (phonetic = "") => {
  const cleaned = String(phonetic || "")
    .replace(/^\s*[/\[]\s*/, "")
    .replace(/\s*[/\]]\s*$/, "")
    .trim();
  if (!cleaned) return [];
  if (!/[.·]/.test(cleaned)) return [];
  return cleaned
    .split(/[.·]+/)
    .map((segment) => segment.trim())
    .filter(Boolean);
};

const getVowelGroupCount = (text = "") => {
  const groups = String(text || "").toLowerCase().match(/[aeiouy]+/g);
  return groups ? groups.length : 0;
};

const getPhoneticUnitCount = (phonetic = "") => {
  const cleaned = String(phonetic || "")
    .replace(/[ˈˌ]/g, "")
    .replace(/[/\[\]\s]/g, "");
  return cleaned.length;
};

const getSyllableWeight = (syllable = "") => {
  const value = String(syllable || "").toLowerCase();
  const len = value.length;
  const vowelGroups = getVowelGroupCount(value);
  let weight = 1 + vowelGroups * 0.8 + len * 0.12;

  if (/(tion|sion|cian|ture|sure|ing|ed|es|s)$/.test(value)) {
    weight *= 0.8;
  }
  if (/(ai|ay|ea|ee|ie|oa|oo|ou|ow|oi|oy|au|aw|ei)/.test(value)) {
    weight += 0.25;
  }
  return clamp(weight, 0.7, 3.0);
};

const buildSyllableTimeline = (word, syllables, phonetic = "") => {
  const parts = syllables.map((part) => String(part || "").trim()).filter(Boolean);
  if (!parts.length) return { durations: [], totalMs: 0 };

  const phoneticSegments = getPhoneticSyllableSegments(phonetic);
  let weights = [];

  if (phoneticSegments.length === parts.length) {
    weights = phoneticSegments.map((segment) => {
      const unitCount = String(segment || "")
        .replace(/[ˈˌ]/g, "")
        .replace(/[^a-zA-Zəɪʊɔæɑɒɛɜʌɚɝθðʃʒŋ]/g, "").length;
      return clamp(0.9 + unitCount * 0.22, 0.7, 3.0);
    });
  } else {
    weights = parts.map((part) => getSyllableWeight(part));
  }

  const phoneticUnits = getPhoneticUnitCount(phonetic);
  const totalMs = phoneticUnits
    ? clamp(820 + phoneticUnits * 85, 1000, 3400)
    : clamp(900 + String(word || "").length * 95, 1000, 3300);

  const totalWeight = weights.reduce((sum, w) => sum + w, 0) || 1;
  const durations = weights.map((w) => Math.max(160, Math.round((totalMs * w) / totalWeight)));

  return { durations, totalMs: durations.reduce((sum, d) => sum + d, 0) };
};

export default function WordOptionModal({
  visible,
  onClose,
  word,
  theme,
  textColor,
}) {
  const [definition, setDefinition] = useState(null);
  const [loading, setLoading] = useState(false);
  const [syllables, setSyllables] = useState([]);
  const [activeSyllableIndex, setActiveSyllableIndex] = useState(-1);
  const [isPronouncing, setIsPronouncing] = useState(false);
  const syllableTimersRef = useRef([]);

  useEffect(() => {
    if (visible && word) {
      setLoading(true);
      setDefinition(null);
      setActiveSyllableIndex(-1);
      setIsPronouncing(false);

      const parts = getSyllableBreakdown(word);
      setSyllables(parts);

      getWordDefinition(word)
        .then((def) => {
          setDefinition(def);
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [visible, word]);

  const clearPronounceState = () => {
    if (syllableTimersRef.current.length) {
      syllableTimersRef.current.forEach((timerId) => clearTimeout(timerId));
      syllableTimersRef.current = [];
    }
    stopSpeech();
    setActiveSyllableIndex(-1);
    setIsPronouncing(false);
  };

  useEffect(() => {
    if (visible) return undefined;
    clearPronounceState();
    return undefined;
  }, [visible]);

  useEffect(() => {
    return () => {
      clearPronounceState();
    };
  }, []);

  const handlePronounce = () => {
    if (!word) return;
    if (isPronouncing) {
      clearPronounceState();
      return;
    }

    if (syllableTimersRef.current.length) {
      syllableTimersRef.current.forEach((timerId) => clearTimeout(timerId));
      syllableTimersRef.current = [];
    }
    stopSpeech();

    const parts = syllables.length ? syllables : [word];
    const cleanedParts = parts.map((part) => String(part || "").trim()).filter(Boolean);
    if (!cleanedParts.length) return;

    setIsPronouncing(true);
    // Speak the full word once so pronunciation remains natural.
    speakText(word, 0.42, true, 1.0);

    const { durations } = buildSyllableTimeline(
      word,
      cleanedParts,
      definition?.phonetic || ""
    );
    let elapsed = 0;

    cleanedParts.forEach((_, index) => {
      const holdMs = durations[index] || 220;
      const timerId = setTimeout(() => {
        setActiveSyllableIndex(index);
      }, elapsed);
      syllableTimersRef.current.push(timerId);
      elapsed += holdMs;
    });

    const endTimer = setTimeout(() => {
      setActiveSyllableIndex(-1);
      setIsPronouncing(false);
      syllableTimersRef.current = [];
    }, elapsed + 120);
    syllableTimersRef.current.push(endTimer);
  };

  if (!visible) return null;

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View
              style={[
                styles.modalContent,
                { backgroundColor: theme.highlight, borderColor: theme.border },
              ]}
            >
              <View style={styles.header}>
                <View style={styles.headerLeft}>
                  <Text style={[styles.wordTitle, { color: textColor }]} numberOfLines={1}>
                    {word}
                  </Text>
                  <Text style={[styles.subTitle, { color: textColor }]}>Word details</Text>
                </View>
                <View style={styles.headerActions}>
                  <Pressable
                    onPress={handlePronounce}
                    style={({ pressed }) => [
                      styles.iconButton,
                      {
                        borderColor: theme.border,
                        opacity: pressed ? 0.75 : 1,
                        backgroundColor: isPronouncing
                          ? "rgba(127,127,127,0.18)"
                          : "transparent",
                      },
                    ]}
                  >
                    <MaterialIcons
                      name={isPronouncing ? "graphic-eq" : "volume-up"}
                      size={18}
                      color={textColor}
                    />
                  </Pressable>
                  <Pressable
                    onPress={onClose}
                    style={({ pressed }) => [
                      styles.iconButton,
                      { borderColor: theme.border, opacity: pressed ? 0.75 : 1 },
                    ]}
                  >
                    <MaterialIcons name="close" size={18} color={textColor} />
                  </Pressable>
                </View>
              </View>

              {syllables.length > 0 && (
                <View style={[styles.section, { borderColor: theme.border }]}> 
                  <Text style={[styles.sectionLabel, { color: theme.border }]}>SYLLABLES</Text>
                  <View style={styles.syllableWrap}>
                    {syllables.map((part, index) => (
                      <View
                        key={`${part}-${index}`}
                        style={[
                          styles.syllableChip,
                          {
                            borderColor: theme.border,
                            backgroundColor:
                              index === activeSyllableIndex
                                ? textColor
                                : "transparent",
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.syllableText,
                            {
                              color:
                                index === activeSyllableIndex
                                  ? theme.highlight
                                  : textColor,
                            },
                          ]}
                        >
                          {part}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              <View style={[styles.section, { borderColor: theme.border }]}> 
                <Text style={[styles.sectionLabel, { color: theme.border }]}>MEANING</Text>
                {loading ? (
                  <ActivityIndicator size="small" color={textColor} style={styles.loader} />
                ) : definition ? (
                  <View style={styles.definitionBlock}>
                    {definition.phonetic && (
                      <Text style={[styles.phonetic, { color: theme.border }]}>
                        {definition.phonetic}
                      </Text>
                    )}
                    <Text style={[styles.partOfSpeech, { color: textColor, opacity: 0.85 }]}>
                      {definition.partOfSpeech}
                    </Text>
                    <Text style={[styles.definition, { color: textColor }]}>
                      {definition.definition}
                    </Text>
                  </View>
                ) : (
                  <Text style={[styles.errorText, { color: theme.border }]}>Definition not found.</Text>
                )}
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    alignItems: "center",
    padding: 14,
  },
  modalContent: {
    width: "92%",
    maxWidth: 360,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.22,
    shadowRadius: 7,
    elevation: 6,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
    gap: 10,
  },
  headerLeft: {
    flex: 1,
    minWidth: 0,
  },
  wordTitle: {
    fontSize: 24,
    fontFamily: "Lexend-SemiBold",
    fontWeight: "700",
  },
  subTitle: {
    fontSize: 12,
    opacity: 0.72,
    marginTop: 2,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  iconButton: {
    width: 34,
    height: 34,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  section: {
    marginTop: 8,
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1,
    marginBottom: 7,
    textTransform: "uppercase",
  },
  syllableWrap: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 6,
  },
  syllableChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
  },
  syllableText: {
    fontSize: 14,
    fontFamily: "Lexend-Regular",
  },
  loader: {
    alignSelf: "flex-start",
    marginTop: 2,
    marginBottom: 2,
  },
  definitionBlock: {
    gap: 2,
  },
  phonetic: {
    fontSize: 12,
    marginBottom: 1,
    fontStyle: "italic",
  },
  partOfSpeech: {
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 4,
    textTransform: "capitalize",
  },
  definition: {
    fontSize: 14,
    lineHeight: 20,
    fontFamily: "Lexend-Regular",
  },
  errorText: {
    fontSize: 13,
    fontStyle: "italic",
  },
});
