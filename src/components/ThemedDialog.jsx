import { MaterialIcons } from "@expo/vector-icons";
import { Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from "react-native";

export default function ThemedDialog({
  visible,
  title,
  message,
  actions = [],
  theme,
  onAction,
  onRequestClose,
}) {
  const resolvedActions =
    actions.length > 0
      ? actions
      : [{ label: "OK", value: "ok", tone: "primary" }];

  const panelBg = theme?.background === "#16171A" ? "#1C1D20" : "#FFFFFF";
  const textColor = theme?.text || "#1B1C1F";
  const borderColor = theme?.border || "#C8CBD1";
  const isStacked = resolvedActions.length >= 3;

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
            {
              backgroundColor: panelBg,
              borderColor,
            },
          ]}
        >
          {!!title && <Text style={[styles.title, { color: textColor }]}>{title}</Text>}
          {!!message && <Text style={[styles.message, { color: textColor }]}>{message}</Text>}
          <View style={[styles.actionsRow, isStacked && styles.actionsCol]}>
            {resolvedActions.map((action, idx) => {
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
                    isStacked && styles.actionBtnStacked,
                    {
                      backgroundColor: bg,
                      borderColor: actionBorderColor,
                    },
                  ]}
                  onPress={() => onAction?.(action)}
                >
                  {actionIcon ? (
                    <View style={styles.actionContent}>
                      <MaterialIcons name={actionIcon} size={18} color={fg} />
                      <Text style={[styles.actionText, { color: fg }]}>{action.label}</Text>
                    </View>
                  ) : (
                    <Text style={[styles.actionText, { color: fg }]}>{action.label}</Text>
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
  title: {
    fontSize: 18,
    fontWeight: "700",
  },
  message: {
    fontSize: 14,
    lineHeight: 20,
  },
  actionsRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 8,
    marginTop: 4,
    flexWrap: "wrap",
  },
  actionsCol: {
    flexDirection: "column",
    alignItems: "stretch",
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
  actionBtnStacked: {
    width: "100%",
  },
  actionContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  actionText: {
    fontSize: 13,
    fontWeight: "700",
  },
});
