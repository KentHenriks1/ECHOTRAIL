import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Switch,
  Alert,
  TouchableOpacity,
  Modal,
  ScrollView,
} from "react-native";
import { logger } from "../utils/logger";
import { useTranslation } from "react-i18next";
import { createTheme } from "../ui";
import { useColorScheme } from "react-native";
import { useAuth } from "../contexts/AuthContext";
import { MaterialIcons } from "@expo/vector-icons";
import OpenAITTSService from "../services/OpenAITTSService";
import { OpenAISetup } from "../components/OpenAISetup";
import OpenAISettings from "../components/settings/OpenAISettings";
import {
  ModernCard,
  ModernButton,
  StatusIndicator,
} from "../components/modern";

export function SettingsScreen() {
  const { t, i18n } = useTranslation();
  const { user, logout } = useAuth();
  const colorScheme = useColorScheme();
  const theme = createTheme(colorScheme || "light");
  const styles = createStyles(theme);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [showOpenAISetup, setShowOpenAISetup] = useState(false);
  const [showOpenAISettings, setShowOpenAISettings] = useState(false);
  const [hasOpenAITTS, setHasOpenAITTS] = useState(false);
  const [preferredVoice, setPreferredVoice] = useState<string>("nova");
  const [audioQuality, setAudioQuality] = useState<string>("tts-1-hd");
  const [backgroundMusic, setBackgroundMusic] = useState(true);
  const [audioVolume, setAudioVolume] = useState(0.8);

  useEffect(() => {
    checkTTSSettings();
  }, []);

  const checkTTSSettings = async () => {
    try {
      const isAvailable = await OpenAITTSService.isAvailable();
      setHasOpenAITTS(isAvailable);

      if (isAvailable) {
        const voice = await OpenAITTSService.getPreferredVoice();
        setPreferredVoice(voice || "nova");
      }
    } catch (error) {
      logger.error("Error checking TTS settings:", error);
    }
  };

  const toggleLanguage = () => {
    const newLang = i18n.language === "en" ? "nb" : "en";
    i18n.changeLanguage(newLang);
  };

  const handleLogout = () => {
    Alert.alert("Logout", "Are you sure you want to logout?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout",
        style: "destructive",
        onPress: async () => {
          setIsLoggingOut(true);
          try {
            await logout();
          } catch (error) {
            Alert.alert("Error", "Failed to logout");
          } finally {
            setIsLoggingOut(false);
          }
        },
      },
    ]);
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <Text style={styles.title}>{t("settings.title")}</Text>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Profile</Text>
        <ModernCard theme={theme} variant="default" style={styles.profileCard}>
          <View style={styles.profileHeader}>
            <MaterialIcons
              name="account-circle"
              size={48}
              color={theme.colors.primary}
            />
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>{user?._name}</Text>
              <Text style={styles.profileEmail}>{user?._email}</Text>
            </View>
            <StatusIndicator status="success" theme={theme} size={20} />
          </View>
        </ModernCard>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t("settings.language")}</Text>
        <ModernCard theme={theme} variant="default" style={styles.languageCard}>
          <ModernButton
            title={`${t("settings.language")}: ${i18n.language === "en" ? "English" : "Norsk"}`}
            onPress={toggleLanguage}
            variant="secondary"
            theme={theme}
            icon="language"
            size="medium"
          />
        </ModernCard>
      </View>

      {/* OpenAI TTS Settings */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🎤 OpenAI TTS & Audio</Text>

        <ModernCard theme={theme} variant="elevated" style={styles.ttsCard}>
          <TouchableOpacity
            style={styles.ttsSettingRow}
            onPress={() => setShowOpenAISettings(true)}
          >
            <View style={styles.ttsSettingInfo}>
              <StatusIndicator
                status={hasOpenAITTS ? "success" : "idle"}
                theme={theme}
                size={24}
              />
              <View style={styles.ttsTextContainer}>
                <Text style={styles.settingLabel}>
                  {hasOpenAITTS
                    ? "🌟 OpenAI TTS (Høykvalitet)"
                    : "⚠️ System TTS (Lav kvalitet)"}
                </Text>
                {hasOpenAITTS ? (
                  <>
                    <Text style={styles.ttsSubtext}>
                      Stemme:{" "}
                      {OpenAITTSService.getAvailableVoices().find(
                        (v) => v.id === preferredVoice
                      )?.name || "Nova"}
                      {" • "}
                      {audioQuality.toUpperCase()}
                    </Text>
                    <Text style={styles.successNote}>
                      ✅ Krystallklar lyd med AI-stemmer
                    </Text>
                  </>
                ) : (
                  <Text style={styles.warningNote}>
                    Sett opp OpenAI API-nøkkel for høykvalitets TTS
                  </Text>
                )}
              </View>
            </View>
            <MaterialIcons name="tune" size={24} color={theme.colors.primary} />
          </TouchableOpacity>
        </ModernCard>
      </View>

      {/* Audio & Music Settings */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🎵 Lyd & Musikk</Text>

        <ModernCard theme={theme} variant="default" style={styles.audioCard}>
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Bakgrunnsmusikk</Text>
              <Text style={styles.settingDescription}>
                Atmosfærisk musikk under historiefortelling
              </Text>
            </View>
            <Switch
              value={backgroundMusic}
              onValueChange={setBackgroundMusic}
              trackColor={{
                false: theme.colors.border,
                true: theme.colors.primary + "40",
              }}
              thumbColor={
                backgroundMusic
                  ? theme.colors.primary
                  : theme.colors.textSecondary
              }
            />
          </View>

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Lydvolum</Text>
              <Text style={styles.settingDescription}>
                {Math.round(audioVolume * 100)}% - Justér systemvolum
              </Text>
            </View>
            <MaterialIcons
              name={
                audioVolume > 0.5
                  ? "volume-up"
                  : audioVolume > 0
                    ? "volume-down"
                    : "volume-off"
              }
              size={24}
              color={theme.colors.primary}
            />
          </View>

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Lydkvalitet</Text>
              <Text style={styles.settingDescription}>
                {hasOpenAITTS
                  ? "HD (tts-1-hd) - Høyeste kvalitet"
                  : "Standard (system TTS)"}
              </Text>
            </View>
            <StatusIndicator
              status={hasOpenAITTS ? "success" : "idle"}
              theme={theme}
              size={20}
            />
          </View>
        </ModernCard>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t("settings.privacy")}</Text>

        <ModernCard theme={theme} variant="default" style={styles.privacyCard}>
          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>
              {t("settings.backgroundRecording")}
            </Text>
            <Switch value={false} onValueChange={() => {}} />
          </View>

          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>{t("settings.offlineMaps")}</Text>
            <Switch value={true} onValueChange={() => {}} />
          </View>

          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>{t("settings.analytics")}</Text>
            <Switch value={false} onValueChange={() => {}} />
          </View>
        </ModernCard>
      </View>

      <View style={styles.section}>
        <ModernButton
          title={isLoggingOut ? "Logging out..." : "Logout"}
          onPress={handleLogout}
          variant="danger"
          theme={theme}
          disabled={isLoggingOut}
          loading={isLoggingOut}
          icon="logout"
          size="large"
        />
      </View>

      <OpenAISetup
        visible={showOpenAISetup}
        onClose={() => setShowOpenAISetup(false)}
        onApiKeySet={() => {
          checkTTSSettings();
          Alert.alert("Suksess", "OpenAI TTS innstillinger er oppdatert!");
        }}
      />

      {/* OpenAI Settings Modal */}
      <Modal
        visible={showOpenAISettings}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <OpenAISettings
          onClose={() => {
            setShowOpenAISettings(false);
            checkTTSSettings(); // Refresh settings after change
          }}
        />
      </Modal>
    </ScrollView>
  );
}

const createStyles = (theme: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      padding: theme.spacing.lg,
      backgroundColor: theme.colors.background,
    },
    title: {
      fontSize: theme.typography.fontSize.xl,
      fontFamily: theme.typography.fontFamily.bold,
      color: theme.colors.text,
      marginBottom: theme.spacing.lg,
    },
    section: {
      marginBottom: theme.spacing.xl,
    },
    sectionTitle: {
      fontSize: theme.typography.fontSize.lg,
      fontFamily: theme.typography.fontFamily.semiBold,
      color: theme.colors.text,
      marginBottom: theme.spacing.md,
    },
    settingRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingVertical: theme.spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    settingLabel: {
      fontSize: theme.typography.fontSize.md,
      color: theme.colors.text,
    },
    profileCard: {
      marginBottom: theme.spacing.md,
    },
    profileHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.md,
    },
    profileInfo: {
      flex: 1,
    },
    profileName: {
      fontSize: theme.typography.fontSize.lg,
      fontFamily: theme.typography.fontFamily.semiBold,
      color: theme.colors.text,
      marginBottom: 4,
    },
    profileEmail: {
      fontSize: theme.typography.fontSize.md,
      color: theme.colors.textSecondary,
    },
    languageCard: {
      marginBottom: theme.spacing.md,
    },
    ttsCard: {
      marginBottom: theme.spacing.md,
    },
    ttsSettingRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingVertical: theme.spacing.md,
    },
    ttsSettingInfo: {
      flexDirection: "row",
      alignItems: "center",
      flex: 1,
    },
    ttsTextContainer: {
      marginLeft: theme.spacing.sm,
      flex: 1,
    },
    privacyCard: {
      marginBottom: theme.spacing.md,
    },
    ttsSubtext: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.textSecondary,
      marginTop: 2,
    },
    adminNote: {
      fontSize: theme.typography.fontSize.xs,
      color: theme.colors.warning,
      marginTop: 4,
      fontStyle: "italic",
    },
    successNote: {
      fontSize: theme.typography.fontSize.xs,
      color: theme.colors.success,
      marginTop: 4,
      fontWeight: "500",
    },
    warningNote: {
      fontSize: theme.typography.fontSize.xs,
      color: theme.colors.warning,
      marginTop: 4,
      fontStyle: "italic",
    },
    audioCard: {
      marginBottom: theme.spacing.md,
    },
    settingInfo: {
      flex: 1,
    },
    settingDescription: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.textSecondary,
      marginTop: 2,
      lineHeight: 18,
    },
  });

export default SettingsScreen;
