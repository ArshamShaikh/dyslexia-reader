import { MaterialIcons } from "@expo/vector-icons";
import { useState } from "react";
import {
  ActionSheetIOS,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

export default function ReaderControls({
  isPlaying,
  onPlayPause,
  onBackward,
  onForward,
  onRestart,
  currentSpeed,
  onSpeedChange,
}) {
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const speedOptions = [0.5, 0.75, 1.0, 1.25, 1.5];

  const handleSpeedPress = () => {
    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ["Cancel", ...speedOptions.map((s) => `${s}x`)],
          cancelButtonIndex: 0,
        },
        (index) => {
          if (index > 0) {
            onSpeedChange(speedOptions[index - 1]);
          }
        }
      );
    } else {
      setShowSpeedMenu(true);
    }
  };

  return (
    <>
      <View style={styles.container}>
        {/* Main Controls Row */}
        <View style={styles.mainControls}>
          {/* Restart Button */}
          <TouchableOpacity
            style={styles.smallButton}
            onPress={onRestart}
            accessible={true}
            accessibilityLabel="Restart"
          >
            <MaterialIcons name="restart-alt" size={18} color="#FFFFFF" />
          </TouchableOpacity>

          {/* Backward Button */}
          <TouchableOpacity
            style={styles.smallButton}
            onPress={onBackward}
            accessible={true}
            accessibilityLabel="Go back 5 words"
          >
            <MaterialIcons name="replay-5" size={18} color="#FFFFFF" />
          </TouchableOpacity>

          {/* Play/Pause Button */}
          <TouchableOpacity
            style={[styles.playButton, isPlaying && styles.playButtonActive]}
            onPress={onPlayPause}
            accessible={true}
            accessibilityLabel={isPlaying ? "Pause" : "Play"}
          >
            <MaterialIcons
              name={isPlaying ? "pause" : "play-arrow"}
              size={28}
              color="#FFFFFF"
            />
          </TouchableOpacity>

          {/* Forward Button */}
          <TouchableOpacity
            style={styles.smallButton}
            onPress={onForward}
            accessible={true}
            accessibilityLabel="Skip forward 5 words"
          >
            <MaterialIcons name="forward-5" size={18} color="#FFFFFF" />
          </TouchableOpacity>

          {/* Speed Control Button */}
          <TouchableOpacity
            style={styles.speedButton}
            onPress={handleSpeedPress}
            accessible={true}
            accessibilityLabel={`Speed ${currentSpeed}x`}
          >
            <MaterialIcons name="speed" size={18} color="#FFFFFF" />
            <Text style={styles.speedText}>{currentSpeed.toFixed(2)}x</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Speed Menu Modal for Android */}
      {Platform.OS !== "ios" && (
        <Modal
          visible={showSpeedMenu}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowSpeedMenu(false)}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setShowSpeedMenu(false)}
          >
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Select Speed</Text>
              <View style={styles.speedOptions}>
                {speedOptions.map((speed) => (
                  <TouchableOpacity
                    key={speed}
                    style={[
                      styles.speedOption,
                      currentSpeed === speed && styles.speedOptionActive,
                    ]}
                    onPress={() => {
                      onSpeedChange(speed);
                      setShowSpeedMenu(false);
                    }}
                  >
                    <Text
                      style={[
                        styles.speedOptionText,
                        currentSpeed === speed && styles.speedOptionTextActive,
                      ]}
                    >
                      {speed}x
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </TouchableOpacity>
        </Modal>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: "rgba(58, 110, 165, 0.95)",
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
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
    gap: 12,
  },
  smallButton: {
    padding: 4,
    justifyContent: "center",
    alignItems: "center",
  },
  playButton: {
    backgroundColor: "#2E5A8C",
    borderRadius: 50,
    width: 48,
    height: 48,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 4,
  },
  playButtonActive: {
    backgroundColor: "#1E3A5C",
  },
  speedButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    borderRadius: 6,
    marginLeft: 4,
  },
  speedText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "600",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: 30,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#3A6EA5",
    marginBottom: 16,
    textAlign: "center",
  },
  speedOptions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    justifyContent: "center",
  },
  speedOption: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: "#3A6EA5",
    minWidth: 70,
    alignItems: "center",
  },
  speedOptionActive: {
    backgroundColor: "#3A6EA5",
  },
  speedOptionText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#3A6EA5",
  },
  speedOptionTextActive: {
    color: "#FFFFFF",
  },
});
