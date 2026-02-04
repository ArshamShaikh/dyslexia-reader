import { MaterialIcons } from "@expo/vector-icons";
import { useState } from "react";
import {
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Slider from "@react-native-community/slider";

export default function ReaderControls({
  isPlaying,
  onPlayPause,
  onBackward,
  onForward,
  onRestart,
  onStop,
  currentSpeed,
  onSpeedChange,
  theme,
  textColor,
}) {
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const speedOptions = [0.5, 0.75, 1.0, 1.25, 1.5];
  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  const stepAdjust = (value, step, min, max, direction) =>
    clamp(Number((value + direction * step).toFixed(2)), min, max);

  const handleSpeedPress = () => {
    setShowSpeedMenu(true);
  };

  return (
    <>
      <View
        style={[
          styles.container,
          {
            backgroundColor:
              theme?.background === "#121212" ? "rgba(32, 32, 32, 0.98)" : "#FFFFFF",
            borderColor: theme?.border || "#BDBDBD",
          },
        ]}
      >
        {/* Main Controls Row */}
        <View style={styles.mainControls}>
          {/* Restart Button */}
          <TouchableOpacity
            style={styles.smallButton}
            onPress={onRestart}
            accessible={true}
            accessibilityLabel="Restart"
          >
            <MaterialIcons name="restart-alt" size={18} color={textColor} />
          </TouchableOpacity>

          {/* Stop Button */}
          <TouchableOpacity
            style={styles.smallButton}
            onPress={onStop}
            accessible={true}
            accessibilityLabel="Stop"
          >
            <MaterialIcons name="stop" size={18} color={textColor} />
          </TouchableOpacity>

          {/* Backward Button */}
          <TouchableOpacity
            style={styles.smallButton}
            onPress={onBackward}
            accessible={true}
            accessibilityLabel="Previous line"
          >
            <MaterialIcons name="replay-5" size={18} color={textColor} />
          </TouchableOpacity>

          {/* Play/Pause Button */}
          <TouchableOpacity
            style={[
              styles.playButton,
              isPlaying && styles.playButtonActive,
              {
                backgroundColor:
                  theme?.background === "#121212" ? "#2D2D2D" : "#1F1F1F",
              },
            ]}
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
            accessibilityLabel="Next line"
          >
            <MaterialIcons name="forward-5" size={18} color={textColor} />
          </TouchableOpacity>

          {/* Speed Control Button */}
          <TouchableOpacity
            style={[
              styles.speedButton,
              {
                backgroundColor:
                  theme?.background === "#121212"
                    ? "rgba(255, 255, 255, 0.1)"
                    : "rgba(0, 0, 0, 0.08)",
              },
            ]}
            onPress={handleSpeedPress}
            accessible={true}
            accessibilityLabel={`Speed ${currentSpeed}x`}
          >
            <MaterialIcons name="speed" size={18} color={textColor} />
            <Text style={[styles.speedText, { color: textColor }]}>
              {currentSpeed.toFixed(2)}x
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <Modal
        visible={showSpeedMenu}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowSpeedMenu(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowSpeedMenu(false)}
        >
          <View style={styles.modalDock}>
            <View
              style={[
                styles.modalContent,
                {
                  backgroundColor:
                    theme?.background === "#121212" ? "rgba(32, 32, 32, 0.98)" : "#FFFFFF",
                  borderColor: theme?.border || "#BDBDBD",
                },
              ]}
            >
            <Text style={[styles.modalTitle, { color: textColor }]}>
              Speed: {currentSpeed.toFixed(2)}x
            </Text>
            <View style={styles.speedAdjustRowCompact}>
              <View style={styles.speedOptionsVertical}>
                {speedOptions.map((speed) => (
                  <TouchableOpacity
                    key={speed}
                    style={[
                      styles.speedOption,
                      currentSpeed === speed && styles.speedOptionActive,
                      {
                        borderColor:
                          theme?.background === "#121212" ? "#5A5A5A" : "#2E2E2E",
                        backgroundColor:
                          currentSpeed === speed && theme?.background === "#121212"
                            ? "#FFFFFF"
                            : currentSpeed === speed
                              ? "#2E2E2E"
                              : "transparent",
                      },
                    ]}
                    onPress={() => {
                      onSpeedChange(speed);
                      setShowSpeedMenu(false);
                    }}
                  >
                    <Text
                      style={[
                        styles.speedOptionText,
                        {
                          color:
                            currentSpeed === speed
                              ? theme?.background === "#121212"
                                ? "#1F1F1F"
                                : "#FFFFFF"
                              : theme?.background === "#121212"
                                ? "#EAEAEA"
                                : "#1F1F1F",
                        },
                      ]}
                    >
                      {speed}x
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.speedAdjustColumn}>
                <TouchableOpacity
                  style={[
                    styles.adjustButton,
                    {
                      borderColor: theme?.border || "#BDBDBD",
                      backgroundColor:
                        theme?.background === "#121212" ? "#1C1C1C" : "#FFFFFF",
                    },
                  ]}
                  onPress={() =>
                    onSpeedChange(stepAdjust(currentSpeed, 0.05, 0.3, 2.0, 1))
                  }
                >
                  <Text style={[styles.adjustText, { color: textColor }]}>+</Text>
                </TouchableOpacity>
                <View style={styles.verticalSliderWrapCompact}>
                  <View style={styles.verticalSlider}>
                    <Slider
                      minimumValue={0.3}
                      maximumValue={2.0}
                      step={0.05}
                      value={currentSpeed}
                      onValueChange={(value) => onSpeedChange(Number(value.toFixed(2)))}
                      minimumTrackTintColor={textColor}
                      maximumTrackTintColor={theme?.border || "#BDBDBD"}
                      thumbTintColor={textColor}
                    />
                  </View>
                </View>
                <TouchableOpacity
                  style={[
                    styles.adjustButton,
                    {
                      borderColor: theme?.border || "#BDBDBD",
                      backgroundColor:
                        theme?.background === "#121212" ? "#1C1C1C" : "#FFFFFF",
                    },
                  ]}
                  onPress={() =>
                    onSpeedChange(stepAdjust(currentSpeed, 0.05, 0.3, 2.0, -1))
                  }
                >
                  <Text style={[styles.adjustText, { color: textColor }]}>-</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

const CONTROL_BAR_HEIGHT = 64;
const CONTROL_BAR_GAP = 8;

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: "transparent",
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    borderWidth: 1,
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
    backgroundColor: "#1F1F1F",
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
    backgroundColor: "#0F0F0F",
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
    backgroundColor: "transparent",
    justifyContent: "flex-end",
  },
  modalDock: {
    alignItems: "flex-end",
    paddingRight: 12,
    paddingBottom: CONTROL_BAR_HEIGHT + CONTROL_BAR_GAP,
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingTop: 12,
    paddingHorizontal: 12,
    paddingBottom: 12,
    width: 220,
    borderWidth: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1F1F1F",
    marginBottom: 16,
    textAlign: "center",
  },
  speedOptions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    justifyContent: "center",
  },
  speedOptionsVertical: {
    gap: 6,
    alignItems: "flex-start",
  },
  speedOption: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#2E2E2E",
    minWidth: 54,
    alignItems: "center",
  },
  speedOptionActive: {
    backgroundColor: "#2E2E2E",
  },
  speedOptionText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1F1F1F",
  },
  speedOptionTextActive: {
    color: "#FFFFFF",
  },
  speedAdjustColumn: {
    alignItems: "center",
    gap: 10,
  },
  speedAdjustRowCompact: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 6,
  },
  adjustButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#BDBDBD",
    alignItems: "center",
    justifyContent: "center",
  },
  adjustText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1F1F1F",
  },
  verticalSliderWrapCompact: {
    height: 150,
    alignItems: "center",
    justifyContent: "center",
  },
  verticalSlider: {
    width: 150,
    transform: [{ rotate: "-90deg" }],
  },
});
