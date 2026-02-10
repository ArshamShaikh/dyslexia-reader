import { MaterialIcons } from "@expo/vector-icons";
import { useMemo } from "react";
import { Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSettings } from "../context/SettingsContext";
import { FONT_FAMILY_MAP, uiTrackingForFont } from "../theme/typography";

export default function ThemedDialog({
  visible,
  title,
  message,
  actions = [],
  theme,
  onAction,
  onRequestClose,
}) {
  const { uiFontFamily } = useSettings();
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
  const resolvedActions =
    actions.length > 0
      ? actions
      : [{ label: "OK", value: "ok", tone: "primary" }];
  const compactActions = resolvedActions.filter((action) => action.compact);
  const regularActions = resolvedActions.filter((action) => !action.compact);

  const panelBg = theme?.background === "#16171A" ? "#1C1D20" : "#FFFFFF";
  const textColor = theme?.text || "#1B1C1F";
  const borderColor = theme?.border || "#C8CBD1";
  const isStacked = regularActions.length >= 3;
  const isPickerLayout =
    compactActions.length > 0 &&
    regularActions.length === 2 &&
    regularActions.every((action) => !!action.icon);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onRequestClose}
    >
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onRequestClose} />
        <View
          style={[
            styles.panel,
            isPickerLayout && styles.panelPicker,
            {
              backgroundColor: panelBg,
              borderColor,
            },
          ]}
        >
          {compactActions.length > 0 && (
            <View style={styles.cornerActions}>
              {compactActions.map((action, idx) => {
                const tone = action.tone || "default";
                const isDestructive = tone === "destructive";
                const fg = isDestructive ? "#D26B6B" : textColor;
                const actionBorderColor = isDestructive ? "#D26B6B" : borderColor;
                return (
                  <TouchableOpacity
                    key={`compact-${action.label}-${idx}`}
                    style={[
                      styles.compactActionBtn,
                      {
                        borderColor: actionBorderColor,
                        backgroundColor: "transparent",
                      },
                    ]}
                    onPress={() => onAction?.(action)}
                  >
                    {!!action.icon && (
                      <MaterialIcons name={action.icon} size={16} color={fg} />
                    )}
                    <Text style={[styles.compactActionText, { color: fg }, uiFontStyle]}>{action.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
          <View style={[styles.titleBlock, isPickerLayout && styles.titleBlockPicker]}>
            {!!title && (
              <Text
                style={[
                  styles.title,
                  isPickerLayout && styles.titlePicker,
                  { color: textColor },
                  uiFontStyle,
                ]}
              >
                {title}
                </Text>
              )}
            {!!message && (
              <Text
                style={[
                  styles.message,
                  isPickerLayout && styles.messagePicker,
                  { color: textColor },
                  uiFontStyle,
                ]}
              >
                {message}
                </Text>
              )}
          </View>
          <View
            style={[
              styles.actionsRow,
              isStacked && styles.actionsCol,
              isPickerLayout && styles.actionsRowPicker,
            ]}
          >
            {regularActions.map((action, idx) => {
              const tone = action.tone || "default";
              const isPrimary = tone === "primary";
              const isDestructive = tone === "destructive";
              const bg = isPrimary ? textColor : "transparent";
              const fg = isPrimary ? panelBg : isDestructive ? "#D26B6B" : textColor;
              const actionBorderColor = isPrimary
                ? textColor
                : isDestructive
                  ? "#D26B6B"
                  : borderColor;
              const actionIcon = action.icon;
              return (
                <TouchableOpacity
                  key={`${action.label}-${idx}`}
                  style={[
                    styles.actionBtn,
                    !!actionIcon && styles.actionBtnIconCard,
                    isStacked && styles.actionBtnStacked,
                    {
                      backgroundColor: bg,
                      borderColor: actionBorderColor,
                    },
                  ]}
                  onPress={() => onAction?.(action)}
                >
                  {actionIcon ? (
                    <View style={styles.actionContentColumn}>
                      <MaterialIcons name={actionIcon} size={24} color={fg} />
                      <Text style={[styles.actionText, { color: fg }, uiFontStyle]}>{action.label}</Text>
                    </View>
                  ) : (
                    <Text style={[styles.actionText, { color: fg }, uiFontStyle]}>{action.label}</Text>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  panel: {
    width: "100%",
    maxWidth: 360,
    position: "relative",
    borderRadius: 14,
    borderWidth: 1.5,
    padding: 14,
    gap: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  panelPicker: {
    paddingTop: 12,
  },
  titleBlock: {
    gap: 4,
  },
  titleBlockPicker: {
    alignItems: "center",
    marginTop: 26,
    marginBottom: 2,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
  },
  titlePicker: {
    textAlign: "center",
    fontSize: 19,
  },
  message: {
    fontSize: 14,
    lineHeight: 20,
  },
  messagePicker: {
    textAlign: "center",
  },
  actionsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
    marginTop: 4,
    flexWrap: "wrap",
  },
  actionsCol: {
    flexDirection: "column",
    alignItems: "stretch",
  },
  actionsRowPicker: {
    marginTop: 0,
  },
  actionBtn: {
    minWidth: 88,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  actionBtnIconCard: {
    flex: 1,
    minHeight: 80,
    paddingVertical: 7,
    paddingHorizontal: 10,
  },
  actionBtnStacked: {
    width: "100%",
  },
  actionContentColumn: {
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  cornerActions: {
    position: "absolute",
    top: 10,
    right: 10,
    zIndex: 2,
  },
  compactActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderWidth: 1.5,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
    alignSelf: "flex-end",
  },
  compactActionText: {
    fontSize: 12,
    fontWeight: "700",
  },
  actionText: {
    fontSize: 13,
    fontWeight: "700",
  },
});
