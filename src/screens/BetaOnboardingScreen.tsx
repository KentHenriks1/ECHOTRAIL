import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Dimensions,
} from "react-native";
import { logger } from "../utils/logger";
import { useTranslation } from "react-i18next";
import { createTheme, Button } from "@echotrail/ui";
import { useColorScheme } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { betaFeedbackService } from "../services/BetaFeedbackService";

const { width } = Dimensions.get("window");

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  icon: keyof typeof MaterialIcons.glyphMap;
  action?: string;
  actionLabel?: string;
}

const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    id: "welcome",
    title: "Welcome to EchoTrail Beta!",
    description:
      "Thank you for joining our beta program. Your feedback will help us create the best GPS trail tracking experience.",
    icon: "celebration",
  },
  {
    id: "feedback",
    title: "Share Your Thoughts",
    description:
      "Shake your device anytime to report bugs or suggest features. Your input is invaluable to us.",
    icon: "feedback",
    action: "demo_shake",
    actionLabel: "Try Shake to Report",
  },
  {
    id: "features",
    title: "Explore Beta Features",
    description:
      "You have access to all the latest features including offline maps, background GPS, and advanced sync.",
    icon: "explore",
  },
  {
    id: "community",
    title: "Join the Community",
    description:
      "Connect with other beta testers, share experiences, and get early access to new updates.",
    icon: "people",
  },
  {
    id: "expectations",
    title: "Beta Expectations",
    description:
      "This is beta software, so you might encounter bugs. Help us fix them by providing detailed feedback!",
    icon: "bug-report",
  },
];

interface BetaOnboardingScreenProps {
  onComplete: () => void;
}

export function BetaOnboardingScreen({
  onComplete,
}: BetaOnboardingScreenProps) {
  const { t } = useTranslation();
  const colorScheme = useColorScheme();
  const theme = createTheme(colorScheme || "light");
  const styles = createStyles(theme);

  const [currentStep, setCurrentStep] = useState(0);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    // Track onboarding start
    betaFeedbackService.trackEvent("beta_onboarding_started", {
      timestamp: new Date().toISOString(),
    });

    // Get beta user ID
    const id = betaFeedbackService.getBetaUserId();
    setUserId(id);
  }, []);

  const handleNext = () => {
    const step = ONBOARDING_STEPS[currentStep];

    // Track step completion
    betaFeedbackService.trackEvent("beta_onboarding_step_completed", {
      stepId: step.id,
      _stepIndex: currentStep,
    });

    if (currentStep < ONBOARDING_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = async () => {
    try {
      await betaFeedbackService.completeOnboarding();

      Alert.alert(
        "Welcome Aboard! 🚀",
        "You're all set to start using EchoTrail Beta. Happy trail tracking!",
        [{ text: "Get Started", onPress: onComplete }]
      );
    } catch (error) {
      logger.error("Failed to complete onboarding:", error);
      Alert.alert("Error", "Failed to complete onboarding. Please try again.");
    }
  };

  const handleStepAction = (action: string) => {
    switch (action) {
      case "demo_shake":
        betaFeedbackService.showShakeToReportDialog();
        break;
    }
  };

  const handleSkip = () => {
    Alert.alert(
      "Skip Onboarding?",
      "You can access this information later in the Settings > Beta Program section.",
      [
        { text: "Continue Tour", style: "cancel" },
        { text: "Skip", style: "default", onPress: handleComplete },
      ]
    );
  };

  const step = ONBOARDING_STEPS[currentStep];
  const progress = ((currentStep + 1) / ONBOARDING_STEPS.length) * 100;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
          <Text style={styles.skipButtonText}>Skip</Text>
        </TouchableOpacity>

        <Text style={styles.stepCounter}>
          {currentStep + 1} of {ONBOARDING_STEPS.length}
        </Text>
      </View>

      {/* Progress Bar */}
      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${progress}%` }]} />
        </View>
      </View>

      {/* Content */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.stepContainer}>
          {/* Icon */}
          <View style={styles.iconContainer}>
            <MaterialIcons
              name={step.icon}
              size={64}
              color={theme.colors.primary}
            />
          </View>

          {/* Title */}
          <Text style={styles.stepTitle}>{step.title}</Text>

          {/* Description */}
          <Text style={styles.stepDescription}>{step.description}</Text>

          {/* Beta User ID Display */}
          {currentStep === 0 && userId && (
            <View style={styles.userIdContainer}>
              <Text style={styles.userIdLabel}>Your Beta ID:</Text>
              <Text style={styles.userIdValue}>
                {userId.substring(0, 16)}...
              </Text>
              <Text style={styles.userIdNote}>
                This ID helps us track your feedback and ensure you get proper
                credit for participation.
              </Text>
            </View>
          )}

          {/* Action Button */}
          {step.action && step.actionLabel && (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handleStepAction(step.action!)}
            >
              <Text style={styles.actionButtonText}>{step.actionLabel}</Text>
            </TouchableOpacity>
          )}

          {/* Beta Features Checklist */}
          {step.id === "features" && (
            <View style={styles.featuresList}>
              <Text style={styles.featuresTitle}>What's Available:</Text>
              {[
                "GPS Trail Recording",
                "Offline Map Downloads",
                "Background Location Tracking",
                "Advanced Sync & Conflict Resolution",
                "Push Notifications",
                "Trail Sharing",
                "Data Export & Privacy Controls",
              ].map((feature, index) => (
                <View key={index} style={styles.featureItem}>
                  <MaterialIcons
                    name="check-circle"
                    size={20}
                    color={theme.colors.success}
                  />
                  <Text style={styles.featureText}>{feature}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Beta Guidelines */}
          {step.id === "expectations" && (
            <View style={styles.guidelinesList}>
              <Text style={styles.guidelinesTitle}>Beta Guidelines:</Text>
              {[
                "Report any bugs or crashes immediately",
                "Provide detailed feedback when possible",
                "Test features thoroughly in real-world scenarios",
                "Respect that this is pre-release software",
                "Be patient with performance issues",
                "Share your honest opinions and suggestions",
              ].map((guideline, index) => (
                <View key={index} style={styles.guidelineItem}>
                  <MaterialIcons
                    name="info"
                    size={16}
                    color={theme.colors.primary}
                  />
                  <Text style={styles.guidelineText}>{guideline}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Navigation */}
      <View style={styles.navigation}>
        <TouchableOpacity
          style={[
            styles.navButton,
            currentStep === 0 && styles.navButtonDisabled,
          ]}
          onPress={handlePrevious}
          disabled={currentStep === 0}
        >
          <MaterialIcons
            name="arrow-back"
            size={24}
            color={
              currentStep === 0
                ? theme.colors.textSecondary
                : theme.colors.primary
            }
          />
          <Text
            style={[
              styles.navButtonText,
              currentStep === 0 && styles.navButtonTextDisabled,
            ]}
          >
            Previous
          </Text>
        </TouchableOpacity>

        <Button
          title={
            currentStep === ONBOARDING_STEPS.length - 1 ? "Get Started" : "Next"
          }
          onPress={handleNext}
          theme={theme}
          variant="primary"
        />
      </View>
    </View>
  );
}

const createStyles = (theme: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    header: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingHorizontal: theme.spacing.lg,
      paddingTop: theme.spacing.lg,
      paddingBottom: theme.spacing.md,
    },
    skipButton: {
      padding: theme.spacing.sm,
    },
    skipButtonText: {
      fontSize: theme.typography.fontSize.md,
      color: theme.colors.textSecondary,
    },
    stepCounter: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.fontFamily.medium,
    },
    progressContainer: {
      paddingHorizontal: theme.spacing.lg,
      paddingBottom: theme.spacing.lg,
    },
    progressBar: {
      height: 4,
      backgroundColor: theme.colors.border,
      borderRadius: 2,
      overflow: "hidden",
    },
    progressFill: {
      height: "100%",
      backgroundColor: theme.colors.primary,
      borderRadius: 2,
    },
    content: {
      flex: 1,
      paddingHorizontal: theme.spacing.lg,
    },
    stepContainer: {
      alignItems: "center",
      paddingVertical: theme.spacing.xl,
    },
    iconContainer: {
      width: 120,
      height: 120,
      borderRadius: 60,
      backgroundColor: `${theme.colors.primary}20`,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: theme.spacing.xl,
    },
    stepTitle: {
      fontSize: theme.typography.fontSize.xl,
      fontFamily: theme.typography.fontFamily.bold,
      color: theme.colors.text,
      textAlign: "center",
      marginBottom: theme.spacing.md,
    },
    stepDescription: {
      fontSize: theme.typography.fontSize.md,
      color: theme.colors.textSecondary,
      textAlign: "center",
      lineHeight: 24,
      marginBottom: theme.spacing.lg,
    },
    userIdContainer: {
      backgroundColor: theme.colors.surface,
      padding: theme.spacing.md,
      borderRadius: theme.borderRadius.md,
      width: "100%",
      marginBottom: theme.spacing.lg,
    },
    userIdLabel: {
      fontSize: theme.typography.fontSize.sm,
      fontFamily: theme.typography.fontFamily.medium,
      color: theme.colors.text,
      marginBottom: theme.spacing.xs,
    },
    userIdValue: {
      fontSize: theme.typography.fontSize.md,
      fontFamily: "monospace",
      color: theme.colors.primary,
      marginBottom: theme.spacing.sm,
    },
    userIdNote: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.textSecondary,
      lineHeight: 18,
    },
    actionButton: {
      backgroundColor: theme.colors.secondary,
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.md,
      borderRadius: theme.borderRadius.md,
      marginBottom: theme.spacing.lg,
    },
    actionButtonText: {
      fontSize: theme.typography.fontSize.md,
      fontFamily: theme.typography.fontFamily.medium,
      color: theme.colors.background,
      textAlign: "center",
    },
    featuresList: {
      width: "100%",
      backgroundColor: theme.colors.surface,
      padding: theme.spacing.md,
      borderRadius: theme.borderRadius.md,
      marginBottom: theme.spacing.lg,
    },
    featuresTitle: {
      fontSize: theme.typography.fontSize.md,
      fontFamily: theme.typography.fontFamily.bold,
      color: theme.colors.text,
      marginBottom: theme.spacing.md,
    },
    featureItem: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: theme.spacing.sm,
    },
    featureText: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.text,
      marginLeft: theme.spacing.sm,
      flex: 1,
    },
    guidelinesList: {
      width: "100%",
      backgroundColor: theme.colors.surface,
      padding: theme.spacing.md,
      borderRadius: theme.borderRadius.md,
      marginBottom: theme.spacing.lg,
    },
    guidelinesTitle: {
      fontSize: theme.typography.fontSize.md,
      fontFamily: theme.typography.fontFamily.bold,
      color: theme.colors.text,
      marginBottom: theme.spacing.md,
    },
    guidelineItem: {
      flexDirection: "row",
      alignItems: "flex-start",
      marginBottom: theme.spacing.sm,
    },
    guidelineText: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.text,
      marginLeft: theme.spacing.sm,
      flex: 1,
      lineHeight: 18,
    },
    navigation: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.lg,
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
    },
    navButton: {
      flexDirection: "row",
      alignItems: "center",
      padding: theme.spacing.sm,
    },
    navButtonDisabled: {
      opacity: 0.5,
    },
    navButtonText: {
      fontSize: theme.typography.fontSize.md,
      color: theme.colors.primary,
      marginLeft: theme.spacing.sm,
    },
    navButtonTextDisabled: {
      color: theme.colors.textSecondary,
    },
  });
