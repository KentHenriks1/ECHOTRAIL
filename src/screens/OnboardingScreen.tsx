import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Alert,
  useColorScheme,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import * as Location from "expo-location";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createTheme } from "../ui";
import { captureMessage, addBreadcrumb } from "../utils/sentry";
import { logger } from "../utils/logger";

interface OnboardingScreenProps {
  onComplete: () => void;
}

const ONBOARDING_COMPLETED_KEY = "onboarding_completed";

export const OnboardingScreen: React.FC<OnboardingScreenProps> = ({
  onComplete,
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [locationPermissionGranted, setLocationPermissionGranted] =
    useState(false);
  const colorScheme = useColorScheme();
  const theme = createTheme(colorScheme || "light");

  const steps = [
    {
      icon: "explore" as keyof typeof MaterialIcons.glyphMap,
      title: "Velkommen til EchoTrail",
      description:
        "Oppdag stedsspesifikke historier og lag dine egne minner mens du utforsker verden rundt deg.",
    },
    {
      icon: "location-on" as keyof typeof MaterialIcons.glyphMap,
      title: "Lokasjon for bedre opplevelse",
      description:
        "EchoTrail bruker din posisjon for å gi deg relevante historier basert på hvor du befinner deg.",
    },
    {
      icon: "photo-camera" as keyof typeof MaterialIcons.glyphMap,
      title: "Lag dine egne minner",
      description:
        "Ta bilder, spill inn lyd og lag hendelser på stedene du besøker. Alt lagres trygt på din enhet.",
    },
    {
      icon: "offline-pin" as keyof typeof MaterialIcons.glyphMap,
      title: "Fungerer offline",
      description:
        "Appen fungerer selv uten internett. Dine spor og minner synkroniseres når du får tilkobling igjen.",
    },
  ];

  const requestLocationPermission = async () => {
    try {
      addBreadcrumb("User requesting location permission", "permission");

      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status === "granted") {
        setLocationPermissionGranted(true);
        captureMessage("Location permission granted during onboarding", "info");

        // Ask for background permission only if foreground is granted
        const backgroundStatus =
          await Location.requestBackgroundPermissionsAsync();
        if (backgroundStatus.status === "granted") {
          captureMessage("Background location permission granted", "info");
        }
      } else {
        Alert.alert(
          "Lokasjon kreves",
          "EchoTrail trenger tilgang til din posisjon for å gi deg den beste opplevelsen. Du kan aktivere dette i innstillingene senere.",
          [{ text: "OK" }]
        );
        captureMessage(
          "Location permission denied during onboarding",
          "warning"
        );
      }
    } catch (error) {
      logger.error("Error requesting location permission:", error);
      Alert.alert(
        "Feil",
        "Kunne ikke be om lokasjonstitgang. Prøv igjen i innstillingene."
      );
    }
  };

  const handleNext = async () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      // Complete onboarding
      try {
        await AsyncStorage.setItem(ONBOARDING_COMPLETED_KEY, "true");
        captureMessage("Onboarding completed successfully", "info");
        onComplete();
      } catch (error) {
        logger.error("Error saving onboarding state:", error);
        onComplete(); // Continue anyway
      }
    }
  };

  const handleSkip = async () => {
    try {
      await AsyncStorage.setItem(ONBOARDING_COMPLETED_KEY, "true");
      captureMessage("Onboarding skipped", "info");
      onComplete();
    } catch (error) {
      logger.error("Error saving onboarding state:", error);
      onComplete(); // Continue anyway
    }
  };

  const isLocationStep = currentStep === 1;
  const currentStepData = steps[currentStep];

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <View style={styles.content}>
        {/* Progress indicator */}
        <View style={styles.progressContainer}>
          {steps.map((_, index) => (
            <View
              key={index}
              style={[
                styles.progressDot,
                {
                  backgroundColor:
                    index <= currentStep
                      ? theme.colors.primary
                      : theme.colors.border,
                },
              ]}
            />
          ))}
        </View>

        {/* Icon */}
        <View
          style={[
            styles.iconContainer,
            { backgroundColor: theme.colors.surface },
          ]}
        >
          <MaterialIcons
            name={currentStepData.icon}
            size={64}
            color={theme.colors.primary}
          />
        </View>

        {/* Title and description */}
        <Text style={[styles.title, { color: theme.colors.text }]}>
          {currentStepData.title}
        </Text>
        <Text
          style={[styles.description, { color: theme.colors.textSecondary }]}
        >
          {currentStepData.description}
        </Text>

        {/* Location permission button */}
        {isLocationStep && !locationPermissionGranted && (
          <TouchableOpacity
            style={[
              styles.permissionButton,
              { backgroundColor: theme.colors.primary },
            ]}
            onPress={requestLocationPermission}
          >
            <MaterialIcons name="location-on" size={24} color="white" />
            <Text style={styles.permissionButtonText}>Aktiver lokasjon</Text>
          </TouchableOpacity>
        )}

        {/* Success message */}
        {isLocationStep && locationPermissionGranted && (
          <View
            style={[
              styles.successContainer,
              { backgroundColor: theme.colors.success + "20" },
            ]}
          >
            <MaterialIcons
              name="check-circle"
              size={24}
              color={theme.colors.success}
            />
            <Text style={[styles.successText, { color: theme.colors.success }]}>
              Lokasjon aktivert!
            </Text>
          </View>
        )}
      </View>

      {/* Bottom buttons */}
      <View style={styles.bottomContainer}>
        {currentStep < steps.length - 1 && (
          <TouchableOpacity onPress={handleSkip} style={styles.skipButton}>
            <Text
              style={[
                styles.skipButtonText,
                { color: theme.colors.textSecondary },
              ]}
            >
              Hopp over
            </Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[styles.nextButton, { backgroundColor: theme.colors.primary }]}
          onPress={handleNext}
        >
          <Text style={styles.nextButtonText}>
            {currentStep === steps.length - 1 ? "Kom i gang" : "Neste"}
          </Text>
          {currentStep < steps.length - 1 && (
            <MaterialIcons name="arrow-forward" size={20} color="white" />
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

// Check if onboarding has been completed
export const hasCompletedOnboarding = async (): Promise<boolean> => {
  try {
    const completed = await AsyncStorage.getItem(ONBOARDING_COMPLETED_KEY);
    return completed === "true";
  } catch (error) {
    console.error("Error checking onboarding state:", error);
    return false;
  }
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 32,
    paddingTop: 60,
    alignItems: "center",
  },
  progressContainer: {
    flexDirection: "row",
    marginBottom: 60,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginHorizontal: 4,
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 16,
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
    textAlign: "center",
    marginBottom: 40,
  },
  permissionButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 12,
    marginTop: 20,
  },
  permissionButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },
  successContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 20,
  },
  successText: {
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },
  bottomContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 32,
    paddingBottom: 40,
  },
  skipButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  skipButtonText: {
    fontSize: 16,
  },
  nextButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
  },
  nextButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
    marginRight: 8,
  },
});

export default OnboardingScreen;
