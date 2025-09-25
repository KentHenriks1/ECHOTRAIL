import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { MaterialIcons } from "@expo/vector-icons";
import * as Location from "expo-location";
import { useTheme } from "../hooks/useTheme";
import { ModernCard, ModernButton } from "../components/modern";
import { TrailCard } from "../components/trails";
import { MapView } from "../components/maps/MapView";
import { mockTrails } from "../data/mockTrails";
import {
  calculateDistance,
  filterTrails,
  createDefaultFilters,
  findNearbyTrails,
  getTrailStats,
} from "../utils/trailUtils";
import GPXService from "../services/GPXService";
import AudioGuideService from "../services/AudioGuideService";

export const MapsTestScreen: React.FC = () => {
  const { colors, isDark } = useTheme();
  const theme = {
    colors,
    _dark: isDark,
    typography: {
      fontSize: {
        _xs: 12,
        _sm: 14,
        _md: 16,
        _lg: 18,
        _xl: 20,
        _xxl: 24,
        _xxxl: 32,
      },
      fontFamily: {
        regular: "System",
        medium: "System",
        semiBold: "System",
        bold: "System",
      },
    },
    spacing: {
      _xs: 4,
      _sm: 8,
      _md: 16,
      _lg: 24,
      _xl: 32,
    },
    borderRadius: {
      _sm: 4,
      _md: 8,
      _lg: 16,
      _xl: 24,
    },
  }; // Backward compatibility wrapper
  const styles = createStyles(theme);
  const [location, setLocation] = useState<Location.LocationObject | null>(
    null
  );
  const [testResults, setTestResults] = useState<string[]>([]);
  const [isTestingGPS, setIsTestingGPS] = useState(false);
  const [isTestingAudio, setIsTestingAudio] = useState(false);

  const addTestResult = useCallback((result: string) => {
    setTestResults((prev) => [
      ...prev,
      `${new Date().toLocaleTimeString()}: ${result}`,
    ]);
  }, []);

  const runBasicTests = useCallback(() => {
    addTestResult("🧪 Starter grunnleggende tester...");

    // Test 1: Calculate distance function
    try {
      const osloLat = 59.9139;
      const osloLon = 10.7522;
      const bergenLat = 60.3913;
      const bergenLon = 5.3221;

      const distance = calculateDistance(
        osloLat,
        osloLon,
        bergenLat,
        bergenLon
      );
      const distanceKm = Math.round(distance / 1000);

      addTestResult(`✅ Avstandsberegning: Oslo til Bergen = ${distanceKm} km`);
    } catch (error) {
      addTestResult(`❌ Avstandsberegning feilet: ${error}`);
    }

    // Test 2: Trail filtering
    try {
      const filters = createDefaultFilters();
      const osloLocation = { latitude: 59.9139, longitude: 10.7522 };
      const filteredTrails = filterTrails(mockTrails, filters, osloLocation);

      addTestResult(`✅ Trail-filtering: Fant ${filteredTrails.length} trails`);
      addTestResult(
        `✅ Alle trails har distanse: ${filteredTrails.every((t) => t.distanceFromUser !== undefined)}`
      );
    } catch (error) {
      addTestResult(`❌ Trail-filtering feilet: ${error}`);
    }

    // Test 3: Nearby trails
    try {
      const osloLocation = { latitude: 59.9139, longitude: 10.7522 };
      const nearby = findNearbyTrails(mockTrails, osloLocation, 20000, 3);

      addTestResult(
        `✅ Nærliggende trails: Fant ${nearby.length} trails innen 20km`
      );
    } catch (error) {
      addTestResult(`❌ Nærliggende trails feilet: ${error}`);
    }

    // Test 4: Trail statistics
    try {
      const stats = getTrailStats(mockTrails);
      addTestResult(
        `✅ Trail-statistikk: ${stats.totalTrails} trails, ${stats.audioGuidePercentage}% har lydguide`
      );
    } catch (error) {
      addTestResult(`❌ Trail-statistikk feilet: ${error}`);
    }

    addTestResult("🎉 Grunnleggende tester fullført!");
  }, [addTestResult]);

  useEffect(() => {
    runBasicTests();
  }, [runBasicTests]);

  const testGPSLocation = async () => {
    setIsTestingGPS(true);
    addTestResult("📍 Tester GPS-lokasjon...");

    try {
      // Request permissions
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        addTestResult("❌ GPS-tillatelse ikke gitt");
        return;
      }

      // Get current position
      const currentLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      setLocation(currentLocation);
      addTestResult(
        `✅ GPS-posisjon: ${currentLocation.coords.latitude.toFixed(4)}, ${currentLocation.coords.longitude.toFixed(4)}`
      );
      addTestResult(`✅ Nøyaktighet: ${currentLocation.coords.accuracy}m`);

      // Test with real location
      const nearby = findNearbyTrails(
        mockTrails,
        {
          latitude: currentLocation.coords.latitude,
          longitude: currentLocation.coords.longitude,
        },
        50000,
        5
      );

      addTestResult(`✅ Fant ${nearby.length} trails i ditt område`);
    } catch (error) {
      addTestResult(`❌ GPS-test feilet: ${error}`);
    } finally {
      setIsTestingGPS(false);
    }
  };

  const testGPXTracking = async () => {
    addTestResult("🗺️ Tester GPX-sporing...");

    try {
      // Start a test tracking session
      const sessionId = await GPXService.startTracking(
        "Test Trail",
        "test-123",
        "Testing GPX functionality"
      );
      addTestResult(`✅ GPX-sporing startet: ${sessionId}`);

      // Wait a bit
      await new Promise((resolve) => setTimeout(resolve, 3000));

      // Check session status
      const session = GPXService.getCurrentSession();
      if (session) {
        addTestResult(
          `✅ Aktiv økt: ${session.track.points.length} GPS-punkter`
        );
        addTestResult(
          `✅ Distanse: ${session.statistics.totalDistance.toFixed(0)}m`
        );
      }

      // Stop tracking
      const completedTrack = await GPXService.stopTracking();
      if (completedTrack) {
        addTestResult(
          `✅ GPX-sporing stoppet: ${completedTrack.points.length} punkter lagret`
        );
      }
    } catch (error) {
      addTestResult(`❌ GPX-test feilet: ${error}`);
    }
  };

  const testAudioGuide = async () => {
    setIsTestingAudio(true);
    addTestResult("🔊 Tester lydguide...");

    try {
      // Find a trail with audio guide points
      const trailWithAudio = mockTrails.find(
        (t) => t.audioGuidePoints.length > 0
      );

      if (!trailWithAudio) {
        addTestResult("⚠️ Ingen trails med lydguide funnet");
        return;
      }

      addTestResult(`✅ Fant trail med lydguide: ${trailWithAudio.name}`);
      addTestResult(`✅ Lydpunkter: ${trailWithAudio.audioGuidePoints.length}`);

      // Initialize audio guide
      await AudioGuideService.initializeForTrail(trailWithAudio);
      addTestResult(`✅ Lydguide initialisert`);

      // Test OpenAI availability
      const openAIAvailable = await AudioGuideService.isOpenAITTSAvailable();
      addTestResult(
        `✅ OpenAI TTS tilgjengelig: ${openAIAvailable ? "Ja" : "Nei"}`
      );

      // Get available voices
      const voices = AudioGuideService.getAvailableVoices();
      addTestResult(`✅ Tilgjengelige stemmer: ${voices.length}`);

      // Preview first audio point
      if (trailWithAudio.audioGuidePoints.length > 0) {
        const firstPoint = trailWithAudio.audioGuidePoints[0];
        addTestResult(`🎵 Forhåndsvisning: "${firstPoint.title}"`);

        await AudioGuideService.previewAudioPoint(firstPoint, {
          useOpenAI: openAIAvailable,
        });
        addTestResult(`✅ Lydavspilling fullført`);
      }

      await AudioGuideService.stop();
    } catch (error) {
      addTestResult(`❌ Lydguide-test feilet: ${error}`);
    } finally {
      setIsTestingAudio(false);
    }
  };

  const clearResults = () => {
    setTestResults([]);
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <StatusBar style={theme._dark ? "light" : "dark"} />

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <MaterialIcons
            name="bug-report"
            size={32}
            color={theme.colors.primary}
          />
          <Text style={[styles.title, { color: theme.colors.text }]}>
            Maps & Trails Test
          </Text>
          <Text
            style={[styles.subtitle, { color: theme.colors.textSecondary }]}
          >
            Test alle kart- og trail-funksjoner
          </Text>
        </View>

        {/* Test Controls */}
        <ModernCard
          theme={theme}
          variant="elevated"
          style={styles.controlsCard}
        >
          <Text style={[styles.cardTitle, { color: theme.colors.text }]}>
            Test Kontroller
          </Text>

          <ModernButton
            theme={theme}
            title={isTestingGPS ? "Tester GPS..." : "Test GPS & Lokasjon"}
            onPress={testGPSLocation}
            variant="primary"
            disabled={isTestingGPS}
            icon="location-on"
            style={styles.testButton}
          />

          <ModernButton
            theme={theme}
            title="Test GPX Sporing"
            onPress={testGPXTracking}
            variant="secondary"
            icon="track-changes"
            style={styles.testButton}
          />

          <ModernButton
            theme={theme}
            title={isTestingAudio ? "Tester lyd..." : "Test Lydguide"}
            onPress={testAudioGuide}
            variant="primary"
            disabled={isTestingAudio}
            icon="volume-up"
            style={styles.testButton}
          />

          <ModernButton
            theme={theme}
            title="Tøm resultater"
            onPress={clearResults}
            variant="secondary"
            icon="clear"
            style={styles.testButton}
          />
        </ModernCard>

        {/* Map Display */}
        {location && (
          <ModernCard theme={theme} variant="elevated" style={styles.mapCard}>
            <Text style={[styles.cardTitle, { color: theme.colors.text }]}>
              Din posisjon
            </Text>
            <MapView
              theme={theme}
              trails={mockTrails.slice(0, 3)} // Show first 3 trails
              style={styles.map}
              showUserLocation={true}
            />
          </ModernCard>
        )}

        {/* Test Results */}
        <ModernCard theme={theme} variant="default" style={styles.resultsCard}>
          <View style={styles.resultsHeader}>
            <Text style={[styles.cardTitle, { color: theme.colors.text }]}>
              Test Resultater
            </Text>
            <Text
              style={[
                styles.resultCount,
                { color: theme.colors.textSecondary },
              ]}
            >
              {testResults.length} resultater
            </Text>
          </View>

          <ScrollView style={styles.resultsScroll} nestedScrollEnabled>
            {testResults.length === 0 ? (
              <Text
                style={[
                  styles.noResults,
                  { color: theme.colors.textSecondary },
                ]}
              >
                Ingen testresultater ennå. Trykk på en test-knapp for å starte.
              </Text>
            ) : (
              testResults.map((result, index) => (
                <Text
                  key={index}
                  style={[styles.resultText, { color: theme.colors.text }]}
                >
                  {result}
                </Text>
              ))
            )}
          </ScrollView>
        </ModernCard>

        {/* Trail Stats */}
        <ModernCard theme={theme} variant="glass" style={styles.statsCard}>
          <Text style={[styles.cardTitle, { color: theme.colors.text }]}>
            Trail Statistikk
          </Text>
          {(() => {
            const stats = getTrailStats(mockTrails);
            return (
              <View style={styles.statsGrid}>
                <View style={styles.statItem}>
                  <Text
                    style={[styles.statValue, { color: theme.colors.primary }]}
                  >
                    {stats.totalTrails}
                  </Text>
                  <Text
                    style={[
                      styles.statLabel,
                      { color: theme.colors.textSecondary },
                    ]}
                  >
                    Totalt trails
                  </Text>
                </View>
                <View style={styles.statItem}>
                  <Text
                    style={[
                      styles.statValue,
                      { color: theme.colors.secondary },
                    ]}
                  >
                    {stats.audioGuidePercentage}%
                  </Text>
                  <Text
                    style={[
                      styles.statLabel,
                      { color: theme.colors.textSecondary },
                    ]}
                  >
                    Med lydguide
                  </Text>
                </View>
                <View style={styles.statItem}>
                  <Text
                    style={[styles.statValue, { color: theme.colors.success }]}
                  >
                    {stats.averageRating}
                  </Text>
                  <Text
                    style={[
                      styles.statLabel,
                      { color: theme.colors.textSecondary },
                    ]}
                  >
                    Gj.snitt rating
                  </Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={[styles.statValue, { color: "#f59e0b" }]}>
                    {Math.round(stats.totalDistance)}km
                  </Text>
                  <Text
                    style={[
                      styles.statLabel,
                      { color: theme.colors.textSecondary },
                    ]}
                  >
                    Total distanse
                  </Text>
                </View>
              </View>
            );
          })()}
        </ModernCard>
      </ScrollView>
    </SafeAreaView>
  );
};

const createStyles = (theme: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
    },
    scrollView: {
      flex: 1,
    },
    header: {
      alignItems: "center",
      padding: 24,
    },
    title: {
      fontSize: 24,
      fontWeight: "700",
      marginTop: 8,
      marginBottom: 4,
    },
    subtitle: {
      fontSize: 14,
      textAlign: "center",
    },
    controlsCard: {
      margin: 16,
      padding: 16,
    },
    cardTitle: {
      fontSize: 18,
      fontWeight: "600",
      marginBottom: 16,
    },
    testButton: {
      marginBottom: 8,
    },
    mapCard: {
      margin: 16,
      overflow: "hidden",
    },
    map: {
      height: 200,
    },
    resultsCard: {
      margin: 16,
      padding: 16,
      maxHeight: 300,
    },
    resultsHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 12,
    },
    resultCount: {
      fontSize: 12,
    },
    resultsScroll: {
      maxHeight: 200,
    },
    noResults: {
      textAlign: "center",
      fontStyle: "italic",
      padding: 20,
    },
    resultText: {
      fontSize: 13,
      lineHeight: 18,
      marginBottom: 4,
      fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
    },
    statsCard: {
      margin: 16,
      padding: 16,
      marginBottom: 32,
    },
    statsGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      justifyContent: "space-between",
    },
    statItem: {
      width: "48%",
      alignItems: "center",
      marginBottom: 16,
    },
    statValue: {
      fontSize: 24,
      fontWeight: "700",
      marginBottom: 4,
    },
    statLabel: {
      fontSize: 12,
      textAlign: "center",
    },
  });
