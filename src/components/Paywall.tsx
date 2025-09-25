import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { createTheme } from "../ui";
import { useColorScheme } from "react-native";
import SubscriptionService, {
  SubscriptionStatus,
} from "../services/SubscriptionService";
import { logger } from "../utils/logger";

interface PaywallProps {
  visible: boolean;
  onClose: () => void;
  onSubscribed?: (tier: string) => void;
}

interface PricingPlan {
  id: string;
  name: string;
  price: string;
  period: string;
  description: string;
  features: string[];
  isPopular?: boolean;
  color: string;
}

export function Paywall({ visible, onClose, onSubscribed }: PaywallProps) {
  const colorScheme = useColorScheme();
  const theme = createTheme(colorScheme || "light");
  const styles = createStyles(theme);

  const [isLoading, setIsLoading] = useState(false);
  const [subscriptionStatus, setSubscriptionStatus] =
    useState<SubscriptionStatus | null>(null);

  const pricingPlans: PricingPlan[] = [
    {
      id: "premium_monthly",
      name: "Premium",
      price: "49",
      period: "måned",
      description: "Perfekt for vanlige utforskere",
      color: theme.colors.primary,
      features: [
        "Ubegrensede AI-guidede turer",
        "Alle 6 OpenAI premium stemmer",
        "Offline-lagring for 20 områder",
        "HD-kvalitet historier med bakgrunnsmusikk",
        "Ingen annonser",
        "Eksport og backup av minner",
        "Prioritert OpenAI API-tilgang",
      ],
    },
    {
      id: "pro_monthly",
      name: "Pro",
      price: "99",
      period: "måned",
      description: "For entusiaster og familier",
      color: theme.colors.warning,
      isPopular: true,
      features: [
        "Alt fra Premium",
        "Dedikert OpenAI API-kapasitet",
        "Ubegrenset offline-lagring",
        "Team/familie-deling (5 brukere)",
        "Tilpassede stemme-profiler",
        "Premium support og beta-tilgang",
        "Avanserte audio-effekter",
      ],
    },
  ];

  useEffect(() => {
    if (visible) {
      loadSubscriptionStatus();
    }
  }, [visible]);

  const loadSubscriptionStatus = async () => {
    try {
      const status = await SubscriptionService.getSubscriptionStatus();
      setSubscriptionStatus(status);
    } catch (error) {
      logger.error("Failed to load subscription status:", error);
    }
  };

  const handlePurchase = async (planId: string) => {
    setIsLoading(true);

    try {
      const success = await SubscriptionService.purchaseSubscription(planId);

      if (success) {
        Alert.alert(
          "Takk for kjøpet! 🎉",
          "Ditt abonnement er nå aktivt. Du kan nå nyte ubegrensede AI-guidede turer!"
        );
        onSubscribed?.(planId);
        onClose();
      } else {
        Alert.alert(
          "Kjøp mislyktes",
          "Noe gikk galt med kjøpet. Prøv igjen eller kontakt support."
        );
      }
    } catch (error) {
      Alert.alert(
        "Feil",
        "Kunne ikke fullføre kjøpet. Sjekk internetttilkoblingen og prøv igjen."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleRestore = async () => {
    setIsLoading(true);

    try {
      const success = await SubscriptionService.restorePurchases();

      if (success) {
        Alert.alert(
          "Kjøp gjenopprettet! ✅",
          "Dine tidligere kjøp er gjenopprettet og aktivert."
        );
        onClose();
      } else {
        Alert.alert(
          "Ingen kjøp funnet",
          "Kunne ikke finne tidligere kjøp på denne kontoen."
        );
      }
    } catch (error) {
      Alert.alert(
        "Gjenoppretting mislyktes",
        "Kunne ikke gjenopprette kjøp. Prøv igjen senere."
      );
    } finally {
      setIsLoading(false);
    }
  };

  if (!visible) return null;

  return (
    <View style={styles.overlay}>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <MaterialIcons name="close" size={24} color={theme.colors.text} />
          </TouchableOpacity>

          <Text style={styles.title}>Oppgrader til Premium</Text>
          <Text style={styles.subtitle}>
            Få tilgang til ubegrensede AI-guidede opplevelser
          </Text>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Current Status */}
          {subscriptionStatus && (
            <View style={styles.currentStatus}>
              <MaterialIcons
                name={subscriptionStatus.isActive ? "verified" : "info"}
                size={20}
                color={
                  subscriptionStatus.isActive
                    ? theme.colors.success
                    : theme.colors.warning
                }
              />
              <Text style={styles.statusText}>
                {subscriptionStatus.isActive
                  ? `${subscriptionStatus.tier.toUpperCase()} aktiv`
                  : `${subscriptionStatus.monthlyToursUsed}/${subscriptionStatus.monthlyToursLimit} turer brukt denne måneden`}
              </Text>
            </View>
          )}

          {/* Free Tier Info */}
          <View style={styles.freeTier}>
            <Text style={styles.freeTierTitle}>🆓 Free Tier (Nåværende)</Text>
            <Text style={styles.freeTierText}>
              • 5 AI-guidede turer per måned
            </Text>
            <Text style={styles.freeTierText}>
              • OpenAI premium stemmer (subsidiert)
            </Text>
            <Text style={styles.freeTierText}>• 3 offline områder</Text>
            <Text style={styles.freeTierText}>• Annonser inkludert</Text>
            <Text style={styles.freeTierText}>• EchoTrail signaturlyd</Text>
          </View>

          {/* Pricing Plans */}
          {pricingPlans.map((plan) => (
            <View
              key={plan.id}
              style={[styles.planCard, plan.isPopular && styles.popularPlan]}
            >
              {plan.isPopular && (
                <View style={styles.popularBadge}>
                  <Text style={styles.popularText}>MEST POPULÆR</Text>
                </View>
              )}

              <View style={styles.planHeader}>
                <Text style={styles.planName}>{plan.name}</Text>
                <View style={styles.priceContainer}>
                  <Text style={styles.price}>{plan.price} NOK</Text>
                  <Text style={styles.period}>/{plan.period}</Text>
                </View>
                <Text style={styles.description}>{plan.description}</Text>
              </View>

              <View style={styles.featuresList}>
                {plan.features.map((feature, index) => (
                  <View key={index} style={styles.feature}>
                    <MaterialIcons
                      name="check-circle"
                      size={18}
                      color={plan.color}
                    />
                    <Text style={styles.featureText}>{feature}</Text>
                  </View>
                ))}
              </View>

              <TouchableOpacity
                style={[
                  styles.subscribeButton,
                  { backgroundColor: plan.color },
                ]}
                onPress={() => handlePurchase(plan.id)}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text style={styles.subscribeButtonText}>
                    Start {plan.name}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          ))}

          {/* Benefits Overview */}
          <View style={styles.benefits}>
            <Text style={styles.benefitsTitle}>Hvorfor oppgradere?</Text>

            <View style={styles.benefit}>
              <MaterialIcons
                name="explore"
                size={24}
                color={theme.colors.primary}
              />
              <View style={styles.benefitText}>
                <Text style={styles.benefitTitle}>Ubegrensede Opplevelser</Text>
                <Text style={styles.benefitDescription}>
                  Opplev så mange AI-guidede turer du ønsker, når du ønsker det
                </Text>
              </View>
            </View>

            <View style={styles.benefit}>
              <MaterialIcons
                name="record-voice-over"
                size={24}
                color={theme.colors.primary}
              />
              <View style={styles.benefitText}>
                <Text style={styles.benefitTitle}>Premium Stemmer</Text>
                <Text style={styles.benefitDescription}>
                  Tilgang til alle OpenAI-stemmer for mest realistisk opplevelse
                </Text>
              </View>
            </View>

            <View style={styles.benefit}>
              <MaterialIcons
                name="offline-pin"
                size={24}
                color={theme.colors.primary}
              />
              <View style={styles.benefitText}>
                <Text style={styles.benefitTitle}>Offline Tilgang</Text>
                <Text style={styles.benefitDescription}>
                  Last ned områder for bruk uten internettforbindelse
                </Text>
              </View>
            </View>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <TouchableOpacity onPress={handleRestore} disabled={isLoading}>
              <Text style={styles.restoreText}>Gjenopprett kjøp</Text>
            </TouchableOpacity>

            <Text style={styles.terms}>
              Ved å abonnere godtar du våre vilkår og betingelser. Abonnementet
              fornyes automatisk.
            </Text>
          </View>
        </ScrollView>
      </View>
    </View>
  );
}

const createStyles = (theme: any) =>
  StyleSheet.create({
    overlay: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: "rgba(0, 0, 0, 0.8)",
      zIndex: 1000,
    },
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
      marginTop: 40,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
    },
    header: {
      padding: 20,
      alignItems: "center",
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    closeButton: {
      position: "absolute",
      top: 20,
      right: 20,
      zIndex: 10,
    },
    title: {
      fontSize: 24,
      fontWeight: "bold",
      color: theme.colors.text,
      marginBottom: 8,
    },
    subtitle: {
      fontSize: 16,
      color: theme.colors.textSecondary,
      textAlign: "center",
    },
    content: {
      flex: 1,
      padding: 20,
    },
    currentStatus: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: theme.colors.surface,
      padding: 12,
      borderRadius: 8,
      marginBottom: 20,
    },
    statusText: {
      marginLeft: 8,
      fontSize: 14,
      color: theme.colors.text,
    },
    freeTier: {
      backgroundColor: theme.colors.surface,
      padding: 16,
      borderRadius: 12,
      marginBottom: 20,
    },
    freeTierTitle: {
      fontSize: 16,
      fontWeight: "600",
      color: theme.colors.text,
      marginBottom: 8,
    },
    freeTierText: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      marginBottom: 4,
    },
    planCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: 16,
      padding: 20,
      marginBottom: 16,
      borderWidth: 2,
      borderColor: "transparent",
    },
    popularPlan: {
      borderColor: theme.colors.warning,
      borderWidth: 2,
    },
    popularBadge: {
      position: "absolute",
      top: -1,
      left: 20,
      right: 20,
      backgroundColor: theme.colors.warning,
      paddingVertical: 4,
      paddingHorizontal: 12,
      borderTopLeftRadius: 14,
      borderTopRightRadius: 14,
      alignItems: "center",
    },
    popularText: {
      color: "white",
      fontSize: 12,
      fontWeight: "bold",
    },
    planHeader: {
      alignItems: "center",
      marginBottom: 20,
      marginTop: 10,
    },
    planName: {
      fontSize: 20,
      fontWeight: "bold",
      color: theme.colors.text,
      marginBottom: 8,
    },
    priceContainer: {
      flexDirection: "row",
      alignItems: "baseline",
      marginBottom: 8,
    },
    price: {
      fontSize: 32,
      fontWeight: "bold",
      color: theme.colors.primary,
    },
    period: {
      fontSize: 16,
      color: theme.colors.textSecondary,
    },
    description: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      textAlign: "center",
    },
    featuresList: {
      marginBottom: 20,
    },
    feature: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 8,
    },
    featureText: {
      marginLeft: 8,
      fontSize: 14,
      color: theme.colors.text,
    },
    subscribeButton: {
      paddingVertical: 16,
      borderRadius: 12,
      alignItems: "center",
    },
    subscribeButtonText: {
      color: "white",
      fontSize: 16,
      fontWeight: "600",
    },
    benefits: {
      marginTop: 20,
      marginBottom: 20,
    },
    benefitsTitle: {
      fontSize: 18,
      fontWeight: "bold",
      color: theme.colors.text,
      marginBottom: 16,
    },
    benefit: {
      flexDirection: "row",
      alignItems: "flex-start",
      marginBottom: 16,
    },
    benefitText: {
      marginLeft: 12,
      flex: 1,
    },
    benefitTitle: {
      fontSize: 16,
      fontWeight: "600",
      color: theme.colors.text,
      marginBottom: 4,
    },
    benefitDescription: {
      fontSize: 14,
      color: theme.colors.textSecondary,
    },
    footer: {
      alignItems: "center",
      paddingVertical: 20,
    },
    restoreText: {
      fontSize: 16,
      color: theme.colors.primary,
      marginBottom: 12,
    },
    terms: {
      fontSize: 12,
      color: theme.colors.textSecondary,
      textAlign: "center",
      paddingHorizontal: 20,
    },
  });
