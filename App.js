import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { StatusBar } from "expo-status-bar";
import { SettingsProvider } from "./src/context/SettingsContext";
import HomeScreen from "./src/screens/HomeScreen";
import ReaderScreen from "./src/screens/ReaderScreen";
import SavedScreen from "./src/screens/SavedScreen";
import SettingsScreen from "./src/screens/SettingsScreen";


const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <SettingsProvider>
      <StatusBar style="dark" />
      <NavigationContainer>
        <Stack.Navigator
          initialRouteName="Home"
          screenOptions={{ headerShown: false }}
        >
          <Stack.Screen name="Home" component={HomeScreen} />
          <Stack.Screen name="Reader" component={ReaderScreen} />
          <Stack.Screen name="Settings" component={SettingsScreen} />
          <Stack.Screen name="Saved" component={SavedScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    </SettingsProvider>
  );
}
