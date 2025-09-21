import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { StatusBar } from "expo-status-bar";
import { MaterialIcons } from "@expo/vector-icons";
import { createTheme } from "./src/ui";
import {
  useColorScheme,
  View,
  Text,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { useTheme } from "./src/hooks/useTheme";

import { DiscoverScreen } from "./src/screens/DiscoverScreen";
import { MemoriesScreen } from "./src/screens/MemoriesScreen";
import { NewSettingsScreen } from "./src/screens/NewSettingsScreen";
import EchoTrailIntegrationScreen from "./src/screens/EchoTrailIntegrationScreen";
import { AuthProvider, useAuth } from "./src/contexts/AuthContext";
import { ThemeProvider } from "./src/context/ThemeContext";
import { LoginScreen } from "./src/screens/LoginScreen";
import { RegisterScreen } from "./src/screens/RegisterScreen";
import { initSentry } from "./src/utils/sentry";
import { BetaOnboardingScreen } from "./src/screens/BetaOnboardingScreen";
import { hasCompletedOnboarding } from "./src/screens/OnboardingScreen";
import AppInitService from "./src/services/AppInitService";
import "./src/i18n";

// Initialize Sentry early
initSentry();

const Tab = createBottomTabNavigator();

// Loading screen component
const LoadingScreen: React.FC = () => {
  const colorScheme = useColorScheme();
  const theme = createTheme(colorScheme || "light");

  return (
    <View
      style={[
        styles.loadingContainer,
        { backgroundColor: theme.colors.background },
      ]}
    >
      <ActivityIndicator size="large" color={theme.colors.primary} />
      <Text style={[styles.loadingText, { color: theme.colors.text }]}>
        Loading...
      </Text>
    </View>
  );
};

// Main app content
const AppContent: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const { colors } = useTheme();
  const [showOnboarding, setShowOnboarding] = React.useState<boolean | null>(
    null
  );
  const [showRegister, setShowRegister] = React.useState(false);

  React.useEffect(() => {
    const initializeApp = async () => {
      try {
        // Initialize app services
        await AppInitService.initializeApp();

        // Check onboarding status
        const completed = await hasCompletedOnboarding();
        setShowOnboarding(!completed);
      } catch (error) {
        console.warn("App initialization completed with warnings:", error);
        // Still check onboarding even if init fails
        const completed = await hasCompletedOnboarding();
        setShowOnboarding(!completed);
      }
    };

    initializeApp();
  }, []);

  if (isLoading || showOnboarding === null) {
    return <LoadingScreen />;
  }

  if (showOnboarding) {
    return <BetaOnboardingScreen onComplete={() => setShowOnboarding(false)} />;
  }

  if (!isAuthenticated) {
    if (showRegister) {
      return <RegisterScreen onSwitchToLogin={() => setShowRegister(false)} />;
    }
    return <LoginScreen onSwitchToRegister={() => setShowRegister(true)} />;
  }

  return (
    <Tab.Navigator
      id={undefined}
      screenOptions={({ route }) => ({
        tabBarIcon: ({ color, size }) => {
          let iconName: keyof typeof MaterialIcons.glyphMap;

          switch (route.name) {
            case "Discover":
              iconName = "explore";
              break;
            case "Memories":
              iconName = "photo-album";
              break;
            case "EchoTrail":
              iconName = "psychology";
              break;
            case "Settings":
              iconName = "settings";
              break;
            default:
              iconName = "explore";
          }

          return <MaterialIcons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
        },
        headerStyle: {
          backgroundColor: colors.surface,
        },
        headerTintColor: colors.text,
      })}
    >
      <Tab.Screen
        name="Discover"
        component={DiscoverScreen}
        options={{ title: "Oppdag" }}
      />
      <Tab.Screen
        name="Memories"
        component={MemoriesScreen}
        options={{ title: "Minner" }}
      />
      <Tab.Screen
        name="EchoTrail"
        component={EchoTrailIntegrationScreen as any}
        options={{ title: "EchoTrail AI" }}
      />
      <Tab.Screen
        name="Settings"
        component={NewSettingsScreen}
        options={{ title: "Innstillinger" }}
      />
    </Tab.Navigator>
  );
};

export default function App() {
  const colorScheme = useColorScheme();

  return (
    <ThemeProvider>
      <AuthProvider>
        <NavigationContainer>
          <StatusBar style={colorScheme === "dark" ? "light" : "dark"} />
          <AppContent />
        </NavigationContainer>
      </AuthProvider>
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 16,
  },
});
