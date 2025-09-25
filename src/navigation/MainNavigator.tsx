import React, { useEffect, useState } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createStackNavigator } from "@react-navigation/stack";
import { View, Text, StyleSheet, ActivityIndicator } from "react-native";
import { MaterialIcons, Ionicons } from "@expo/vector-icons";

// Services
import { authService, AuthState } from "../services/AuthService";
import { dataSyncService } from "../services/DataSyncService";

// Screens - Main
import HomeScreen from "../screens/HomeScreen";
import TrailRecordingScreen from "../screens/TrailRecordingScreen";
import TrailsScreen from "../screens/TrailsScreen";
import DiscoverScreen from "../screens/DiscoverScreen";
import SettingsScreen from "../screens/SettingsScreen";

// Screens - Auth
import LoginScreen from "../screens/LoginScreen";
import RegisterScreen from "../screens/RegisterScreen";
import OnboardingScreen from "../screens/OnboardingScreen";

// Screens - Detail
import TrailDetailsScreen from "../screens/TrailDetailsScreen";
import ActiveTrailScreen from "../screens/ActiveTrailScreen";
import MapScreen from "../screens/MapScreen";
import MemoriesScreen from "../screens/MemoriesScreen";

// Theme
import { useTheme } from "../hooks/useTheme";

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();
const AuthStack = createStackNavigator();

export type RootStackParamList = {
  MainTabs: undefined;
  TrailDetails: { trailId: string };
  ActiveTrail: { trailId: string };
  MapView: {
    trails?: any[];
    centerLocation?: { latitude: number; longitude: number };
  };
  Memories: undefined;
};

export type TabParamList = {
  Home: undefined;
  Recording: undefined;
  Trails: undefined;
  Discover: undefined;
  Settings: undefined;
};

export type AuthStackParamList = {
  Onboarding: undefined;
  Login: undefined;
  Register: undefined;
};

// Loading Screen Component
const LoadingScreen: React.FC = () => {
  const { colors } = useTheme();

  return (
    <View
      style={[styles.loadingContainer, { backgroundColor: colors.background }]}
    >
      <ActivityIndicator size="large" color={colors.primary} />
      <Text style={[styles.loadingText, { color: colors.text }]}>
        Laster EchoTrail...
      </Text>
    </View>
  );
};

// Auth Navigator
const AuthNavigator: React.FC = () => {
  const { colors } = useTheme();

  return (
    // @ts-ignore - Navigation ID type issue with this version of React Navigation
    <AuthStack.Navigator
      screenOptions={{
        headerShown: false,
        cardStyle: { backgroundColor: colors.background },
      }}
    >
      <AuthStack.Screen name="Onboarding" component={OnboardingScreen} />
      <AuthStack.Screen name="Login" component={LoginScreen} />
      <AuthStack.Screen name="Register" component={RegisterScreen} />
    </AuthStack.Navigator>
  );
};

// Tab Navigator
const TabNavigator: React.FC = () => {
  const { colors, isDark } = useTheme();
  const [recordingActive, setRecordingActive] = useState(false);

  return (
    // @ts-ignore - Navigation ID type issue with this version of React Navigation
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: string;
          let IconComponent = MaterialIcons;

          switch (route.name) {
            case "Home":
              iconName = "home";
              break;
            case "Recording":
              iconName = recordingActive
                ? "stop-circle"
                : "radio-button-checked";
              IconComponent = Ionicons as any;
              break;
            case "Trails":
              iconName = "map";
              break;
            case "Discover":
              iconName = "explore";
              break;
            case "Settings":
              iconName = "settings";
              break;
            default:
              iconName = "help";
          }

          return (
            <IconComponent name={iconName as any} size={size} color={color} />
          );
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          paddingBottom: 8,
          paddingTop: 8,
          height: 80,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: "600",
        },
        headerShown: false,
      })}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{ tabBarLabel: "Hjem" }}
      />
      <Tab.Screen
        name="Recording"
        component={TrailRecordingScreen}
        options={{
          tabBarLabel: "Sporing",
          tabBarBadge: recordingActive ? "●" : undefined,
          tabBarBadgeStyle: { backgroundColor: colors.error, color: "white" },
        }}
      />
      <Tab.Screen
        name="Trails"
        component={TrailsScreen}
        options={{ tabBarLabel: "Mine Ruter" }}
      />
      <Tab.Screen
        name="Discover"
        component={DiscoverScreen}
        options={{ tabBarLabel: "Utforsk" }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{ tabBarLabel: "Innstillinger" }}
      />
    </Tab.Navigator>
  );
};

// Main Stack Navigator
const MainNavigator: React.FC = () => {
  const { colors } = useTheme();

  return (
    // @ts-ignore - Navigation ID type issue with this version of React Navigation
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: colors.surface,
          shadowColor: colors.text || "#000",
        },
        headerTintColor: colors.text,
        headerTitleStyle: {
          fontWeight: "700",
          fontSize: 18,
        },
        cardStyle: { backgroundColor: colors.background },
        // animationEnabled: true,
        gestureEnabled: true,
      }}
    >
      <Stack.Screen
        name="MainTabs"
        component={TabNavigator}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="TrailDetails"
        component={TrailDetailsScreen}
        options={({ route }) => ({
          title: "Rutedetaljer",
          headerBackTitle: "Tilbake",
        })}
      />
      <Stack.Screen
        name="ActiveTrail"
        component={ActiveTrailScreen}
        options={{
          title: "Aktiv Sporing",
          headerBackTitle: "Tilbake",
          gestureEnabled: false, // Prevent accidental swipe back during recording
        }}
      />
      <Stack.Screen
        name="MapView"
        component={MapScreen}
        options={{
          title: "Kart",
          headerBackTitle: "Tilbake",
        }}
      />
      <Stack.Screen
        name="Memories"
        component={MemoriesScreen}
        options={{
          title: "Minner",
          headerBackTitle: "Tilbake",
        }}
      />
    </Stack.Navigator>
  );
};

// Root Navigator Component
const RootNavigator: React.FC = () => {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: true,
    token: null,
  });
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    // Initialize authentication state
    const initializeApp = async () => {
      try {
        // Set up auth state listener
        authService.setCallbacks({
          onAuthStateChange: (state) => {
            setAuthState(state);
            if (!state.isLoading) {
              setIsInitialized(true);
            }
          },
          onError: (error) => {
            console.error("Auth error:", error);
          },
        });

        // Initialize data sync service
        dataSyncService.setCallbacks({
          onSyncComplete: (status) => {
            console.log("Sync completed:", status);
          },
          onSyncError: (error) => {
            console.error("Sync error:", error);
          },
        });

        // Get initial auth state
        const initialState = authService.getAuthState();
        setAuthState(initialState);

        // Mark as initialized after a short delay to ensure all services are ready
        setTimeout(() => {
          setIsInitialized(true);
        }, 1000);
      } catch (error) {
        console.error("Error initializing app:", error);
        setIsInitialized(true);
      }
    };

    initializeApp();
  }, []);

  // Show loading screen while initializing
  if (!isInitialized || authState.isLoading) {
    return <LoadingScreen />;
  }

  // Show auth navigator if not authenticated
  if (!authState.isAuthenticated || !authState.user) {
    return <AuthNavigator />;
  }

  // Show main app if authenticated
  return <MainNavigator />;
};

// Main App Navigator
const AppNavigator: React.FC = () => {
  const { colors } = useTheme();

  return (
    <NavigationContainer
      theme={{
        dark: false, // We handle dark mode manually
        colors: {
          primary: colors.primary,
          background: colors.background,
          card: colors.surface,
          text: colors.text,
          border: colors.border,
          notification: colors.error,
        },
        fonts: {
          regular: {
            fontFamily: "System",
            fontWeight: "400",
          },
          medium: {
            fontFamily: "System",
            fontWeight: "500",
          },
          bold: {
            fontFamily: "System",
            fontWeight: "700",
          },
          heavy: {
            fontFamily: "System",
            fontWeight: "900",
          },
        },
      }}
    >
      <RootNavigator />
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: "500",
  },
});

export default AppNavigator;
