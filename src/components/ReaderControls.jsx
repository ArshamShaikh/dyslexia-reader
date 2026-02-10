import { MaterialIcons } from "@expo/vector-icons";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

export default function ReaderControls({
  isPlaying,
  onPlayPause,
  onBackward,
  onForward,
  onOpenSpeed,
  onOpenSettings,
  readingSpeed,
  isSpeedPanelOpen,
  theme,
  textColor,
  controlsDisabled = false,
}) {
  const isDark = theme?.background === "#121212";
  const buttonBg = isDark ? "#2D2D2D" : theme?.highlight || "#ECEDEF";
  const buttonBorder = theme?.border || "#BDBDBD";
  const buttonIcon = textColor;

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: isDark ? "rgba(32, 32, 32, 0.98)" : theme?.highlight || "#ECEDEF",
          borderColor: theme?.border || "#BDBDBD",
        },
      ]}
    >
      <View style={styles.mainControls}>
        <TouchableOpacity
          style={[
            styles.smallButton,
            controlsDisabled && styles.disabledButton,
            { backgroundColor: buttonBg, borderColor: buttonBorder },
          ]}
          onPress={onBackward}
          disabled={controlsDisabled}
          accessibilityLabel="Previous line"
        >
          <MaterialIcons name="replay-5" size={18} color={textColor} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.playButton,
            isPlaying && styles.playButtonActive,
            controlsDisabled && styles.disabledButton,
            {
              backgroundColor: buttonBg,
              borderColor: buttonBorder,
            },
          ]}
          onPress={onPlayPause}
          disabled={controlsDisabled}
          accessibilityLabel={isPlaying ? "Pause" : "Play"}
        >
          <MaterialIcons
            name={isPlaying ? "pause" : "play-arrow"}
            size={28}
            color={buttonIcon}
          />
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.smallButton,
            controlsDisabled && styles.disabledButton,
            { backgroundColor: buttonBg, borderColor: buttonBorder },
          ]}
          onPress={onForward}
          disabled={controlsDisabled}
          accessibilityLabel="Next line"
        >
          <MaterialIcons name="forward-5" size={18} color={textColor} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.speedButton,
            controlsDisabled && styles.disabledButton,
            {
              borderColor: isSpeedPanelOpen ? (theme?.text || "#1F1F1F") : buttonBorder,
              backgroundColor: buttonBg,
            },
          ]}
          onPress={onOpenSpeed}
          disabled={controlsDisabled}
          accessibilityLabel="Reading speed"
        >
          <MaterialIcons
            name="speed"
            size={16}
            color={textColor}
          />
          <Text
            style={[
              styles.speedText,
              { color: textColor },
            ]}
          >
            {readingSpeed.toFixed(2)}x
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.smallButton,
            controlsDisabled && styles.disabledButton,
            { backgroundColor: buttonBg, borderColor: buttonBorder },
          ]}
          onPress={onOpenSettings}
          disabled={controlsDisabled}
          accessibilityLabel="Reader settings"
        >
          <MaterialIcons name="tune" size={20} color={textColor} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    borderWidth: 1.5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 6,
  },
  mainControls: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 14,
  },
  smallButton: {
    width: 34,
    height: 34,
    borderRadius: 9,
    borderWidth: 1.5,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.14,
    shadowRadius: 2,
    elevation: 2,
  },
  playButton: {
    borderRadius: 50,
    width: 48,
    height: 48,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 4,
  },
  playButtonActive: {
    transform: [{ scale: 0.98 }],
  },
  disabledButton: {
    opacity: 0.45,
  },
  speedButton: {
    minWidth: 84,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1.5,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 2,
    elevation: 2,
  },
  speedText: {
    fontSize: 12,
    fontWeight: "700",
  },
});
