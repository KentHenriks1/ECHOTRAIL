import React from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { useTranslation } from "react-i18next";
import { createModernTheme } from "../ui/modernTheme";
import { useColorScheme } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { logger } from "../utils/logger";
import {
  GradientButton,
  HeroCard,
  StatusBadge,
  FloatingActionButton,
} from "../components/modern/EnhancedComponents";

export function HomeScreen() {
  const { t } = useTranslation();
  const colorScheme = useColorScheme();
  const theme = createModernTheme(colorScheme || "light");
  const styles = createStyles(theme);

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[
          theme.colors.background,
          theme.colors.muted || theme.colors.surface,
        ]}
        style={styles.backgroundGradient}
      >
        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Hero Section */}
          <View style={styles.heroSection}>
            <View style={styles.welcomeHeader}>
              <MaterialIcons
                name="explore"
                size={32}
                color={theme.colors.primary}
                style={styles.headerIcon}
              />
              <View style={styles.headerText}>
                <Text style={styles.welcomeTitle}>Velkommen til EchoTrail</Text>
                <Text style={styles.welcomeSubtitle}>
                  Oppdag historien rundt deg
                </Text>
              </View>
            </View>
          </View>

          {/* Main Action Card */}
          <HeroCard
            title="Start din reise"
            subtitle="Oppdag skjulte historier"
            description="Begynn å utforske historiske steder og opplevelser i nærheten av deg"
            theme={theme}
            icon="near-me"
            backgroundType="forest"
            onPress={() => {
              logger.debug("Start recording from hero card");
              // Navigate to recording or discovery
            }}
          />

          {/* Quick Actions */}
          <View style={styles.quickActions}>
            <Text style={styles.sectionTitle}>Hurtighandlinger</Text>
            <View style={styles.actionGrid}>
              <GradientButton
                title="Start opptak"
                icon="mic"
                variant="nature"
                size="medium"
                theme={theme}
                onPress={() => logger.debug("Start recording")}
                style={styles.actionButton}
              />

              <GradientButton
                title="Utforsk kart"
                icon="map"
                variant="gold"
                size="medium"
                theme={theme}
                onPress={() => logger.debug("Open map")}
                style={styles.actionButton}
              />
            </View>
          </View>

          {/* Recent Activity */}
          <View style={styles.recentSection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Nylige aktiviteter</Text>
              <StatusBadge status="new" theme={theme} size="small" />
            </View>

            <View style={styles.emptyState}>
              <MaterialIcons
                name="history"
                size={48}
                color={theme.colors.textSecondary}
                style={styles.emptyIcon}
              />
              <Text style={styles.emptyTitle}>Ingen aktivitet ennå</Text>
              <Text style={styles.emptyText}>
                Start din første utforskning og se den dukke opp her
              </Text>
            </View>
          </View>

          {/* Discovery Preview */}
          <View style={styles.discoverySection}>
            <Text style={styles.sectionTitle}>Oppdag i nærheten</Text>
            <HeroCard
              title="Historiske steder"
              description="3 interessante steder innen 5 km fra deg"
              theme={theme}
              icon="place"
              backgroundType="treasure"
              onPress={() => logger.debug("Open nearby places")}
            />
          </View>
        </ScrollView>
      </LinearGradient>

      {/* Floating Action Button */}
      <FloatingActionButton
        icon="add-location"
        variant="primary"
        theme={theme}
        onPress={() => logger.debug("Add new trail")}
      />
    </View>
  );
}

const createStyles = (theme: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
    },
    backgroundGradient: {
      flex: 1,
    },
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      paddingBottom: 100, // Space for FAB
    },
    heroSection: {
      paddingHorizontal: theme.spacing._lg,
      paddingTop: theme.spacing.xxl || 32,
      paddingBottom: theme.spacing._xl,
    },
    welcomeHeader: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: theme.spacing._xl,
    },
    headerIcon: {
      marginRight: theme.spacing._md,
    },
    headerText: {
      flex: 1,
    },
    welcomeTitle: {
      fontSize: 28,
      fontFamily: theme.typography.fontFamily.bold,
      color: theme.colors.text,
      marginBottom: 4,
    },
    welcomeSubtitle: {
      fontSize: 16,
      fontFamily: theme.typography.fontFamily.medium,
      color: theme.colors.textSecondary,
    },
    quickActions: {
      paddingHorizontal: theme.spacing._lg,
      marginBottom: theme.spacing._xl,
    },
    actionGrid: {
      flexDirection: "row",
      justifyContent: "space-between",
      gap: theme.spacing._md,
    },
    actionButton: {
      flex: 1,
    },
    recentSection: {
      paddingHorizontal: theme.spacing._lg,
      marginBottom: theme.spacing._xl,
    },
    sectionHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: theme.spacing._lg,
    },
    sectionTitle: {
      fontSize: theme.typography.fontSize._xl,
      fontFamily: theme.typography.fontFamily.semiBold,
      color: theme.colors.text,
    },
    emptyState: {
      alignItems: "center",
      paddingVertical: theme.spacing.xxl || 32,
      paddingHorizontal: theme.spacing._lg,
    },
    emptyIcon: {
      marginBottom: theme.spacing._lg,
    },
    emptyTitle: {
      fontSize: theme.typography.fontSize._lg,
      fontFamily: theme.typography.fontFamily.semiBold,
      color: theme.colors.text,
      marginBottom: theme.spacing._sm,
      textAlign: "center",
    },
    emptyText: {
      fontSize: theme.typography.fontSize._md,
      color: theme.colors.textSecondary,
      textAlign: "center",
      lineHeight: 22,
    },
    discoverySection: {
      paddingHorizontal: theme.spacing._lg,
      marginBottom: theme.spacing._xl,
    },
  });

export default HomeScreen;
