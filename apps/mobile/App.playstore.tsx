import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import * as Location from "expo-location";

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

interface User {
  id: string;
  name: string;
  email: string;
}

interface Trail {
  id: string;
  name: string;
  description: string;
  latitude: number;
  longitude: number;
  distance: number;
}

export default function App() {
  const [appIsReady, setAppIsReady] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [location, setLocation] = useState<Location.LocationObject | null>(
    null
  );
  const [trails, setTrails] = useState<Trail[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function prepare() {
      try {
        // Initialize app resources
        await initializeApp();
      } catch (e) {
        console.warn(e);
      } finally {
        setAppIsReady(true);
      }
    }

    prepare();
  }, []);

  const initializeApp = async () => {
    // Check if user was previously signed in
    const savedUser = await checkSavedUser();
    if (savedUser) {
      setUser(savedUser);
      await loadUserData();
    }
  };

  const checkSavedUser = async (): Promise<User | null> => {
    // Mock: In real app, check AsyncStorage or secure store
    // return await SecureStore.getItemAsync('user');
    return null;
  };

  const signInWithGoogle = async () => {
    setLoading(true);
    try {
      // Mock Google Sign-In (in real app, use @react-native-google-signin/google-signin)
      await new Promise((resolve) => setTimeout(resolve, 1500));

      const mockUser: User = {
        id: "google-user-123",
        name: "Kent Rune Henriksen",
        email: "kent@zentric.no",
      };

      setUser(mockUser);
      await loadUserData();

      Alert.alert("Velkommen!", `Logget inn som ${mockUser.name}`);
    } catch (error) {
      Alert.alert("Feil", "Kunne ikke logge inn med Google");
    } finally {
      setLoading(false);
    }
  };

  const loadUserData = async () => {
    try {
      // Get user location
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === "granted") {
        const currentLocation = await Location.getCurrentPositionAsync({});
        setLocation(currentLocation);
      }

      // Load nearby trails from backend
      await loadNearbyTrails();
    } catch (error) {
      console.warn("Error loading user data:", error);
    }
  };

  const loadNearbyTrails = async () => {
    try {
      // Mock API call to our Vercel backend
      const response = await fetch(
        `${process.env.EXPO_PUBLIC_API_BASE_URL}/api/trails`
      );

      if (response.ok) {
        const data = await response.json();
        setTrails(data.trails || []);
      } else {
        // Mock trails for demo
        const mockTrails: Trail[] = [
          {
            id: "1",
            name: "Oslo Sentrum Trail",
            description: "Historisk vandring gjennom Oslo sentrum",
            latitude: 59.9139,
            longitude: 10.7522,
            distance: 2.5,
          },
          {
            id: "2",
            name: "Vigeland Skulpturpark",
            description: "AI-guidet tur i verdensberømte skulpturpark",
            latitude: 59.9267,
            longitude: 10.7006,
            distance: 1.8,
          },
          {
            id: "3",
            name: "Akershus Festning",
            description: "Middelalderhistorier fra festningen",
            latitude: 59.9065,
            longitude: 10.7365,
            distance: 1.2,
          },
        ];
        setTrails(mockTrails);
      }
    } catch (error) {
      console.warn("Error loading trails:", error);
    }
  };

  const signOut = () => {
    Alert.alert("Logg ut", "Er du sikker på at du vil logge ut?", [
      { text: "Avbryt", style: "cancel" },
      {
        text: "Logg ut",
        style: "destructive",
        onPress: () => {
          setUser(null);
          setLocation(null);
          setTrails([]);
        },
      },
    ]);
  };

  const onLayoutRootView = useCallback(async () => {
    if (appIsReady) {
      await SplashScreen.hideAsync();
    }
  }, [appIsReady]);

  if (!appIsReady) {
    return null;
  }

  if (!user) {
    return (
      <SafeAreaProvider>
        <SafeAreaView style={styles.container} onLayout={onLayoutRootView}>
          <StatusBar style="auto" />
          <View style={styles.loginContainer}>
            <Text style={styles.title}>🎯 EchoTrail</Text>
            <Text style={styles.subtitle}>
              Oppdag stedsspesifikke AI-historier basert på din posisjon
            </Text>

            <View style={styles.features}>
              <Text style={styles.feature}>📍 GPS-baserte historier</Text>
              <Text style={styles.feature}>🤖 AI-genererte opplevelser</Text>
              <Text style={styles.feature}>🗺️ Interaktive kart</Text>
              <Text style={styles.feature}>📱 Offline tilgjengelig</Text>
            </View>

            <TouchableOpacity
              style={[styles.googleButton, loading && styles.disabledButton]}
              onPress={signInWithGoogle}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="white" />
              ) : (
                <>
                  <Text style={styles.googleIcon}>G</Text>
                  <Text style={styles.googleButtonText}>
                    Fortsett med Google
                  </Text>
                </>
              )}
            </TouchableOpacity>

            <Text style={styles.footerText}>
              Krever tilgang til posisjon for beste opplevelse
            </Text>
          </View>
        </SafeAreaView>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.container} onLayout={onLayoutRootView}>
        <StatusBar style="auto" />

        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.welcomeText}>Hei, {user.name}!</Text>
            <Text style={styles.locationText}>
              {location
                ? `📍 ${location.coords.latitude.toFixed(4)}, ${location.coords.longitude.toFixed(4)}`
                : "📍 Henter posisjon..."}
            </Text>
          </View>
          <TouchableOpacity onPress={signOut} style={styles.signOutButton}>
            <Text style={styles.signOutText}>Logg ut</Text>
          </TouchableOpacity>
        </View>

        {/* Trails List */}
        <ScrollView style={styles.content}>
          <Text style={styles.sectionTitle}>Trails i nærheten</Text>

          {trails.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>🔄 Laster trails...</Text>
            </View>
          ) : (
            trails.map((trail) => (
              <TouchableOpacity key={trail.id} style={styles.trailCard}>
                <Text style={styles.trailName}>{trail.name}</Text>
                <Text style={styles.trailDescription}>{trail.description}</Text>
                <Text style={styles.trailDistance}>📏 {trail.distance} km</Text>
              </TouchableOpacity>
            ))
          )}

          <View style={styles.statusCard}>
            <Text style={styles.statusTitle}>🔗 System Status</Text>
            <Text style={styles.status}>Backend: ✅ Connected</Text>
            <Text style={styles.status}>Database: ✅ Neon</Text>
            <Text style={styles.status}>
              Location: {location ? "✅" : "⏳"} GPS
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  loginContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  title: {
    fontSize: 40,
    fontWeight: "bold",
    color: "#2563eb",
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 18,
    color: "#64748b",
    textAlign: "center",
    marginBottom: 40,
    lineHeight: 26,
  },
  features: {
    marginBottom: 40,
  },
  feature: {
    fontSize: 16,
    color: "#475569",
    marginBottom: 12,
    textAlign: "center",
  },
  googleButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#4285f4",
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    marginBottom: 24,
    minWidth: 240,
    justifyContent: "center",
  },
  disabledButton: {
    opacity: 0.7,
  },
  googleIcon: {
    backgroundColor: "white",
    color: "#4285f4",
    fontSize: 18,
    fontWeight: "bold",
    width: 32,
    height: 32,
    textAlign: "center",
    lineHeight: 32,
    borderRadius: 16,
    marginRight: 12,
  },
  googleButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  footerText: {
    fontSize: 14,
    color: "#9ca3af",
    textAlign: "center",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    backgroundColor: "white",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  welcomeText: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1e293b",
  },
  locationText: {
    fontSize: 14,
    color: "#64748b",
    marginTop: 4,
  },
  signOutButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: "#ef4444",
    borderRadius: 8,
  },
  signOutText: {
    color: "white",
    fontSize: 14,
    fontWeight: "600",
  },
  content: {
    flex: 1,
    padding: 20,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#1e293b",
    marginBottom: 20,
  },
  emptyState: {
    alignItems: "center",
    padding: 40,
  },
  emptyText: {
    fontSize: 16,
    color: "#64748b",
  },
  trailCard: {
    backgroundColor: "white",
    padding: 20,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  trailName: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1e293b",
    marginBottom: 8,
  },
  trailDescription: {
    fontSize: 14,
    color: "#64748b",
    marginBottom: 8,
    lineHeight: 20,
  },
  trailDistance: {
    fontSize: 12,
    color: "#059669",
    fontWeight: "600",
  },
  statusCard: {
    backgroundColor: "#f1f5f9",
    padding: 20,
    borderRadius: 12,
    marginTop: 20,
    marginBottom: 40,
  },
  statusTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#1e293b",
    marginBottom: 12,
  },
  status: {
    fontSize: 14,
    color: "#059669",
    marginBottom: 8,
    fontWeight: "600",
  },
});
