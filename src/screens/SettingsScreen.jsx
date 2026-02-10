import { useMemo, useState } from "react";
import { MaterialIcons } from "@expo/vector-icons";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import ThemedDialog from "../components/ThemedDialog";
import { useSettings } from "../context/SettingsContext";
import { THEMES } from "../theme/colors";
import { FONT_FAMILY_MAP, uiSizeForFont, uiTrackingForFont } from "../theme/typography";

const UI_FONT_OPTIONS = ["System", "Lexend", "OpenDyslexic"];

export default function SettingsScreen() {
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const [showLoggedOutDialog, setShowLoggedOutDialog] = useState(false);
  const {
    backgroundTheme,
    setBackgroundTheme,
    uiFontFamily,
    setUiFontFamily,
    applyUiFontEverywhere,
    setApplyUiFontEverywhere,
  } = useSettings();

  const theme = THEMES[backgroundTheme] || THEMES.light;
  const uiTextColor = theme.text;
  const isDark = backgroundTheme === "dark";
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

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <Text style={[styles.title, { color: uiTextColor }, uiFontStyle]}>Settings</Text>

      <View
        style={[
          styles.card,
          {
            borderColor: theme.border,
            backgroundColor: isDark ? "#1C1C1C" : "#FFFFFF",
          },
        ]}
      >
        <View style={styles.profileTopRow}>
          <View
            style={[
              styles.avatarWrap,
              {
                borderColor: theme.border,
                backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.03)",
              },
            ]}
          >
            <MaterialIcons name="account-circle" size={42} color={uiTextColor} />
          </View>
          <View style={styles.profileTextWrap}>
            <Text style={[styles.profileName, { color: uiTextColor }, uiFontStyle]}>
              Student User
            </Text>
            <Text style={[styles.profileEmail, { color: uiTextColor }, uiFontStyle]}>
              student@example.com
            </Text>
          </View>
        </View>
        <TouchableOpacity
          style={[
            styles.logoutButton,
            {
              borderColor: "#D26B6B",
              backgroundColor: isDark ? "rgba(210,107,107,0.16)" : "rgba(210,107,107,0.08)",
            },
          ]}
          onPress={() => setShowLogoutDialog(true)}
        >
          <MaterialIcons name="logout" size={18} color="#D26B6B" />
          <Text style={[styles.logoutText, uiFontStyle]}>Logout</Text>
        </TouchableOpacity>
      </View>

      <View
        style={[
          styles.card,
          {
            borderColor: theme.border,
            backgroundColor: isDark ? "#1C1C1C" : "#FFFFFF",
          },
        ]}
      >
        <Text style={[styles.sectionLabel, { color: uiTextColor }, uiFontStyle]}>Theme</Text>
        <View
          style={[
            styles.segmentedWrap,
            {
              borderColor: theme.border,
              backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.03)",
            },
          ]}
        >
          <TouchableOpacity
            style={[
              styles.segmentedBtn,
              {
                backgroundColor: backgroundTheme === "light" ? uiTextColor : "transparent",
              },
            ]}
            onPress={() => setBackgroundTheme("light")}
          >
            <MaterialIcons
              name="light-mode"
              size={16}
              color={backgroundTheme === "light" ? theme.background : uiTextColor}
            />
            <Text
              style={[
                styles.segmentedBtnText,
                { color: backgroundTheme === "light" ? theme.background : uiTextColor },
                uiFontStyle,
              ]}
            >
              Light
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.segmentedBtn,
              {
                backgroundColor: backgroundTheme === "dark" ? uiTextColor : "transparent",
              },
            ]}
            onPress={() => setBackgroundTheme("dark")}
          >
            <MaterialIcons
              name="dark-mode"
              size={16}
              color={backgroundTheme === "dark" ? theme.background : uiTextColor}
            />
            <Text
              style={[
                styles.segmentedBtnText,
                { color: backgroundTheme === "dark" ? theme.background : uiTextColor },
                uiFontStyle,
              ]}
            >
              Dark
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <View
        style={[
          styles.card,
          {
            borderColor: theme.border,
            backgroundColor: isDark ? "#1C1C1C" : "#FFFFFF",
          },
        ]}
      >
        <Text style={[styles.sectionLabel, { color: uiTextColor }, uiFontStyle]}>App Font</Text>
        <View style={styles.fontChipWrap}>
          {UI_FONT_OPTIONS.map((font) => {
            const isActive = uiFontFamily === font;
            return (
              <TouchableOpacity
                key={font}
                style={[
                  styles.fontChip,
                  {
                    borderColor: theme.border,
                    backgroundColor:
                      isActive
                        ? uiTextColor
                        : isDark
                          ? "rgba(255,255,255,0.06)"
                          : "rgba(0,0,0,0.03)",
                  },
                ]}
                onPress={() => setUiFontFamily(font)}
              >
              <Text
                style={[
                  styles.fontChipText,
                    {
                      color: isActive ? theme.background : uiTextColor,
                      fontFamily: FONT_FAMILY_MAP[font],
                      fontSize: uiSizeForFont(font, 12),
                      letterSpacing: uiTrackingForFont(font),
                    },
                  ]}
              >
                  {font}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
        <TouchableOpacity
          style={[
            styles.applyEverywhereRow,
            {
              borderColor: theme.border,
              backgroundColor: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.02)",
            },
          ]}
          onPress={() => setApplyUiFontEverywhere((prev) => !prev)}
        >
          <MaterialIcons
            name={applyUiFontEverywhere ? "check-box" : "check-box-outline-blank"}
            size={18}
            color={uiTextColor}
          />
          <Text style={[styles.applyEverywhereText, { color: uiTextColor }, uiFontStyle]}>
            Apply fonts everywhere
          </Text>
        </TouchableOpacity>
      </View>

      <ThemedDialog
        visible={showLogoutDialog}
        title="Log out?"
        message="This is a local demo profile. Logging out will sign you out from this device."
        actions={[
          { label: "Cancel", value: "cancel" },
          { label: "Logout", value: "logout", tone: "destructive" },
        ]}
        theme={theme}
        onAction={(action) => {
          setShowLogoutDialog(false);
          if (action?.value === "logout") {
            setShowLoggedOutDialog(true);
          }
        }}
        onRequestClose={() => setShowLogoutDialog(false)}
      />
      <ThemedDialog
        visible={showLoggedOutDialog}
        title="Logged out"
        message="You are now signed out."
        actions={[{ label: "OK", value: "ok", tone: "primary" }]}
        theme={theme}
        onAction={() => setShowLoggedOutDialog(false)}
        onRequestClose={() => setShowLoggedOutDialog(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 12,
    gap: 10,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 0,
  },
  card: {
    borderWidth: 1.2,
    borderRadius: 12,
    padding: 10,
    gap: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  profileTopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  avatarWrap: {
    borderWidth: 1,
    borderRadius: 999,
    width: 52,
    height: 52,
    alignItems: "center",
    justifyContent: "center",
  },
  profileTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  profileName: {
    fontSize: 16,
    fontWeight: "700",
  },
  profileEmail: {
    fontSize: 12,
    opacity: 0.82,
    marginTop: 1,
  },
  logoutButton: {
    borderWidth: 1,
    borderRadius: 9,
    paddingHorizontal: 10,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
  },
  logoutText: {
    color: "#D26B6B",
    fontSize: 13,
    fontWeight: "700",
  },
  sectionLabel: {
    fontSize: 15,
    fontWeight: "700",
  },
  segmentedWrap: {
    borderWidth: 1,
    borderRadius: 999,
    padding: 3,
    flexDirection: "row",
    gap: 4,
  },
  segmentedBtn: {
    flex: 1,
    borderRadius: 999,
    minHeight: 34,
    paddingHorizontal: 8,
    paddingVertical: 7,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  segmentedBtnText: {
    fontSize: 13,
    fontWeight: "700",
  },
  fontChipWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  fontChip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 28,
  },
  fontChipText: {
    fontSize: 12,
    fontWeight: "600",
  },
  applyEverywhereRow: {
    marginTop: 2,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  applyEverywhereText: {
    fontSize: 12,
    fontWeight: "600",
  },
});
