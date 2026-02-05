import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { StatusBar } from "expo-status-bar";
import { useFonts } from "expo-font";
import { MaterialIcons } from "@expo/vector-icons";
import { SettingsProvider } from "./src/context/SettingsContext";
import HomeScreen from "./src/screens/HomeScreen";
import ReaderScreen from "./src/screens/ReaderScreen";
import SavedScreen from "./src/screens/SavedScreen";
import SettingsScreen from "./src/screens/SettingsScreen";
import { useSettings } from "./src/context/SettingsContext";
import { THEMES } from "./src/theme/colors";

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function MainTabs() {
  const { backgroundTheme, textColor } = useSettings();
  const theme = THEMES[backgroundTheme] || THEMES.light;

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: textColor,
        tabBarInactiveTintColor: backgroundTheme === "dark" ? "#B5B5B5" : "#777",
        tabBarStyle: {
          backgroundColor:
            theme.background === "#121212" ? "rgba(32, 32, 32, 0.98)" : "#FFFFFF",
          borderTopColor: theme.border,
        },
        tabBarIcon: ({ color, size }) => {
          const icon =
            route.name === "HomeTab"
              ? "home"
              : route.name === "SavedTab"
                ? "bookmark"
                : "settings";
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
      <StatusBar style="dark" />
      <NavigationContainer>
        <Stack.Navigator
          initialRouteName="MainTabs"
          screenOptions={{ headerShown: false }}
        >
          <Stack.Screen name="MainTabs" component={MainTabs} />
          <Stack.Screen name="Reader" component={ReaderScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    </SettingsProvider>
  );
}
