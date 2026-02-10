import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { StatusBar } from "expo-status-bar";
import { useFonts } from "expo-font";
import { MaterialIcons } from "@expo/vector-icons";
import { SettingsProvider, useSettings } from "./src/context/SettingsContext";
import HomeScreen from "./src/screens/HomeScreen";
import ReaderScreen from "./src/screens/ReaderScreen";
import SavedScreen from "./src/screens/SavedScreen";
import SettingsScreen from "./src/screens/SettingsScreen";
import { THEMES } from "./src/theme/colors";
import { FONT_FAMILY_MAP, isOpenDyslexicUi, uiSizeForFont, uiTrackingForFont } from "./src/theme/typography";

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function MainTabs() {
  const { backgroundTheme, uiFontFamily } = useSettings();
  const theme = THEMES[backgroundTheme] || THEMES.light;
  const tabLabelFontFamily = FONT_FAMILY_MAP[uiFontFamily];
  const tabLabelWeight = uiFontFamily === "System" ? "700" : "400";
  const tabLabelSize = uiSizeForFont(uiFontFamily, 12);
  const tabLabelTop = isOpenDyslexicUi(uiFontFamily) ? -2 : -1;
  const tabLabelTracking = uiTrackingForFont(uiFontFamily);

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: theme.text,
        tabBarInactiveTintColor: backgroundTheme === "dark" ? "#B5B5B5" : "#777",
        tabBarStyle: {
          backgroundColor:
            theme.background === "#121212" ? "rgba(32, 32, 32, 0.98)" : theme.highlight,
          borderTopColor: theme.border,
          height: 76,
          paddingTop: 6,
          paddingBottom: 10,
        },
        tabBarItemStyle: {
          paddingTop: 1,
          paddingBottom: 0,
        },
        tabBarIconStyle: {
          marginTop: -2,
        },
        tabBarLabelStyle: {
          fontFamily: tabLabelFontFamily,
          fontWeight: tabLabelWeight,
          fontSize: tabLabelSize,
          marginTop: tabLabelTop,
          marginBottom: 4,
          letterSpacing: tabLabelTracking,
        },
        tabBarIcon: ({ color, size }) => {
          const iconMap = {
            HomeTab: "home",
            SavedTab: "bookmark",
            SettingsTab: "settings",
          };
          const icon = iconMap[route.name] || "home";
          return <MaterialIcons name={icon} size={size} color={color} />;
        },
        tabBarLabel:
          route.name === "HomeTab"
            ? "Home"
            : route.name === "SavedTab"
              ? "Saved"
              : "Settings",
      })}
    >
      <Tab.Screen name="HomeTab" component={HomeScreen} />
      <Tab.Screen name="SavedTab" component={SavedScreen} />
      <Tab.Screen name="SettingsTab" component={SettingsScreen} />
    </Tab.Navigator>
  );
}

function AppShell() {
  const { backgroundTheme } = useSettings();
  const theme = THEMES[backgroundTheme] || THEMES.light;
  const statusBarStyle = backgroundTheme === "dark" ? "light" : "dark";

  return (
    <>
      <StatusBar style={statusBarStyle} backgroundColor={theme.background} translucent={false} />
      <NavigationContainer>
        <Stack.Navigator
          initialRouteName="MainTabs"
          screenOptions={{ headerShown: false }}
        >
          <Stack.Screen name="MainTabs" component={MainTabs} />
          <Stack.Screen name="Reader" component={ReaderScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    </>
  );
}

export default function App() {
  const [fontsLoaded] = useFonts({
    "Lexend-Regular": require("./assets/lexend/static/Lexend-Regular.ttf"),
    "Lexend-SemiBold": require("./assets/lexend/static/Lexend-SemiBold.ttf"),
    "OpenDyslexic-Regular": require("./assets/opendyslexic-0.92/OpenDyslexic-Regular.otf"),
  });

  if (!fontsLoaded) {
    return null;
  }

  return (
    <SettingsProvider>
      <AppShell />
    </SettingsProvider>
  );
}
