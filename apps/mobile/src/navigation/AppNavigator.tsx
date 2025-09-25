/**
 * App Navigator - Enterprise Edition
 * Main navigation component with tab navigation and authentication flow
 */

import React, { Suspense } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createStackNavigator } from "@react-navigation/stack";
import { Text, Platform, View, ActivityIndicator } from "react-native";
import { ErrorBoundary } from "react-error-boundary";
import { useAuth } from "../providers/AuthProvider";
import { 
  LazyHomeScreen,
  LazyMapsScreen, 
  LazyTrailsScreen,
  LazyTrailRecordingScreen,
  LazyProfileScreen,
  LazyAITestScreen,
  LoginScreen 
} from "../screens/lazy";
import { ThemeConfig } from "../core/config";

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

// Loading fallback component
const ScreenLoadingFallback: React.FC<{ screenName: string }> = ({ screenName }) => (
  <View style={{
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    padding: 20,
  }}>
    <ActivityIndicator size="large" color={ThemeConfig.primaryColor} />
    <Text style={{
      marginTop: 16,
      fontSize: 16,
      color: '#64748b',
      fontWeight: '500',
    }}>Loading {screenName}...</Text>
  </View>
);

// Error fallback component
const ScreenErrorFallback: React.FC<{ error: Error; resetErrorBoundary: () => void; screenName: string }> = ({ 
  error, 
  resetErrorBoundary, 
  screenName 
}) => (
  <View style={{
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fef2f2',
    padding: 20,
  }}>
    <Text style={{
      fontSize: 18,
      fontWeight: 'bold',
      color: '#dc2626',
      marginBottom: 8,
      textAlign: 'center',
    }}>Failed to load {screenName}</Text>
    <Text style={{
      fontSize: 14,
      color: '#991b1b',
      textAlign: 'center',
      marginBottom: 20,
    }}>{error.message}</Text>
    <Text 
      style={{
        fontSize: 16,
        color: '#2563eb',
        fontWeight: '600',
        textDecorationLine: 'underline',
      }}
      onPress={resetErrorBoundary}
    >
      Tap to retry
    </Text>
  </View>
);

// Wrapper function to add Suspense and Error Boundary to lazy screens
function withLazyWrapper(LazyComponent: React.ComponentType<any>, screenName: string) {
  return function WrappedLazyScreen(props: any) {
    return (
      <ErrorBoundary
        FallbackComponent={(fallbackProps) => (
          <ScreenErrorFallback {...fallbackProps} screenName={screenName} />
        )}
      >
        <Suspense fallback={<ScreenLoadingFallback screenName={screenName} />}>
          <LazyComponent {...props} />
        </Suspense>
      </ErrorBoundary>
    );
  };
}

// Create wrapped lazy screen components
const WrappedLazyHomeScreen = withLazyWrapper(LazyHomeScreen, 'Dashboard');
const WrappedLazyMapsScreen = withLazyWrapper(LazyMapsScreen, 'Maps');
const WrappedLazyTrailsScreen = withLazyWrapper(LazyTrailsScreen, 'My Trails');
const WrappedLazyTrailRecordingScreen = withLazyWrapper(LazyTrailRecordingScreen, 'Trail Recording');
const WrappedLazyProfileScreen = withLazyWrapper(LazyProfileScreen, 'Profile');
const WrappedLazyAITestScreen = withLazyWrapper(LazyAITestScreen, 'AI Test');

// Tab Navigator for authenticated users
function TabNavigator(): React.ReactElement {
  return (
    <Tab.Navigator
      id={undefined}
      screenOptions={{
        tabBarActiveTintColor: ThemeConfig.primaryColor,
        tabBarInactiveTintColor: "#64748b",
        tabBarStyle: {
          backgroundColor: "#ffffff",
          borderTopWidth: 1,
          borderTopColor: "#e2e8f0",
          height: Platform.OS === "ios" ? 85 : 65,
          paddingTop: 5,
          paddingBottom: Platform.OS === "ios" ? 25 : 10,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: "500",
        },
        headerStyle: {
          backgroundColor: "#ffffff",
          borderBottomWidth: 1,
          borderBottomColor: "#e2e8f0",
        },
        headerTitleStyle: {
          fontSize: 18,
          fontWeight: "600",
          color: "#1e293b",
        },
        headerTintColor: ThemeConfig.primaryColor,
      }}
    >
      <Tab.Screen
        name="Home"
        component={WrappedLazyHomeScreen}
        options={{
          title: "Dashboard",
          tabBarIcon: ({ focused }) => (
            <Text style={{ fontSize: 20 }}>{focused ? "🏠" : "🏡"}</Text>
          ),
        }}
      />

      <Tab.Screen
        name="Maps"
        component={WrappedLazyMapsScreen}
        options={{
          title: "Maps",
          tabBarIcon: ({ focused }) => (
            <Text style={{ fontSize: 20 }}>{focused ? "🗺️" : "🌍"}</Text>
          ),
        }}
      />

      <Tab.Screen
        name="Record"
        component={WrappedLazyTrailRecordingScreen}
        options={{
          title: "Record Trail",
          tabBarIcon: ({ focused }) => (
            <Text style={{ fontSize: 20 }}>{focused ? "🎯" : "📍"}</Text>
          ),
        }}
      />

      <Tab.Screen
        name="Trails"
        component={WrappedLazyTrailsScreen}
        options={{
          title: "My Trails",
          tabBarIcon: ({ focused }) => (
            <Text style={{ fontSize: 20 }}>{focused ? "🥾" : "👟"}</Text>
          ),
        }}
      />

      <Tab.Screen
        name="Profile"
        component={WrappedLazyProfileScreen}
        options={{
          title: "Profile",
          tabBarIcon: ({ focused }) => (
            <Text style={{ fontSize: 20 }}>{focused ? "👤" : "👥"}</Text>
          ),
        }}
      />

      <Tab.Screen
        name="AITest"
        component={WrappedLazyAITestScreen}
        options={{
          title: "AI Test",
          tabBarIcon: ({ focused }) => (
            <Text style={{ fontSize: 20 }}>{focused ? "🤖" : "🧪"}</Text>
          ),
        }}
      />
    </Tab.Navigator>
  );
}

// Stack Navigator for authentication flow
function AuthNavigator(): React.ReactElement {
  return (
    <Stack.Navigator
      id={undefined}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="Login" component={LoginScreen} />
    </Stack.Navigator>
  );
}

// Main App Navigator
export function AppNavigator(): React.ReactElement {
  const { isAuthenticated } = useAuth();

  return (
    <NavigationContainer>
      {isAuthenticated ? <TabNavigator /> : <AuthNavigator />}
    </NavigationContainer>
  );
}
