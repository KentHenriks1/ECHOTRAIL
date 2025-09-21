import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  Appearance,
} from "react-native";
import { logger } from "../utils/logger";
import Slider from "@react-native-community/slider";
import { useTranslation } from "react-i18next";
import { createTheme, Button } from "../ui";
import { createModernTheme } from "../ui/modernTheme";
import { useColorScheme } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Speech from "expo-speech";
import { useAuth } from "../contexts/AuthContext";

interface SettingsData {
  voiceSettings: {
    selectedVoice: string;
    speechRate: number;
    pitch: number;
  };
  musicSettings: {
    _backgroundMusicEnabled: boolean;
    musicVolume: number;
    selectedTheme: string;
  };
  privacySettings: {
    _shareLocation: boolean;
    _saveMemories: boolean;
    _analyticsEnabled: boolean;
  };
  movementSettings: {
    _adaptiveSpeed: boolean;
    minWalkingSpeed: number;
    _pauseOnStop: boolean;
  };
  arSettings: {
    _arGlassesEnabled: boolean;
    _visualOverlays: boolean;
    _gestureControls: boolean;
  };
  appearanceSettings: {
    themeMode: "light" | "dark" | "system";
    useModernTheme: boolean;
  };
}

export function NewSettingsScreen() {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const systemColorScheme = useColorScheme();
  const [currentThemeMode, setCurrentThemeMode] = useState<
    "light" | "dark" | "system"
  >("system");
  const [useModern, setUseModern] = useState(true);

  // Determine effective color scheme
  const effectiveColorScheme =
    currentThemeMode === "system" ? systemColorScheme : currentThemeMode;
  const theme = useModern
    ? createModernTheme(effectiveColorScheme || "light")
    : createTheme(effectiveColorScheme || "light");
  const styles = createStyles(theme);

  const [settings, setSettings] = useState<SettingsData>({
    voiceSettings: {
      selectedVoice: "nb-NO-female",
      speechRate: 0.8,
      pitch: 1.0,
    },
    musicSettings: {
      _backgroundMusicEnabled: true,
      musicVolume: 0.6,
      selectedTheme: "adaptive",
    },
    privacySettings: {
      _shareLocation: true,
      _saveMemories: true,
      _analyticsEnabled: false,
    },
    movementSettings: {
      _adaptiveSpeed: true,
      minWalkingSpeed: 2.0,
      _pauseOnStop: true,
    },
    arSettings: {
      _arGlassesEnabled: false,
      _visualOverlays: true,
      _gestureControls: false,
    },
    appearanceSettings: {
      themeMode: "system",
      useModernTheme: true,
    },
  });

  const [availableVoices, setAvailableVoices] = useState([
    { id: "nb-NO-female", name: "Norsk kvinne" },
    { id: "nb-NO-male", name: "Norsk mann" },
    { id: "en-US-female", name: "Engelsk kvinne" },
    { id: "en-US-male", name: "Engelsk mann" },
  ]);

  const [musicThemes] = useState([
    { id: "adaptive", name: "Tilpasset til historie" },
    { id: "classical", name: "Klassisk" },
    { id: "nature", name: "Naturlåter" },
    { id: "ambient", name: "Ambient" },
    { id: "silence", name: "Ingen musikk" },
  ]);

  useEffect(() => {
    loadSettings();
  }, []);

  useEffect(() => {
    // Sync local theme state with settings
    setCurrentThemeMode(settings.appearanceSettings.themeMode);
    setUseModern(settings.appearanceSettings.useModernTheme);
  }, [settings.appearanceSettings]);

  const loadSettings = async () => {
    try {
      const savedSettings = await AsyncStorage.getItem("echotrail_settings");
      if (savedSettings) {
        setSettings(JSON.parse(savedSettings));
      }
    } catch (error) {
      logger.error("Error loading settings:", error);
    }
  };

  const saveSettings = async (newSettings: SettingsData) => {
    try {
      await AsyncStorage.setItem(
        "echotrail_settings",
        JSON.stringify(newSettings)
      );
      setSettings(newSettings);
    } catch (error) {
      logger.error("Error saving settings:", error);
    }
  };

  const updateVoiceSettings = (
    key: keyof SettingsData["voiceSettings"],
    value: any
  ) => {
    const newSettings = {
      ...settings,
      voiceSettings: {
        ...settings.voiceSettings,
        [key]: value,
      },
    };
    saveSettings(newSettings);
  };

  const updateMusicSettings = (
    key: keyof SettingsData["musicSettings"],
    value: any
  ) => {
    const newSettings = {
      ...settings,
      musicSettings: {
        ...settings.musicSettings,
        [key]: value,
      },
    };
    saveSettings(newSettings);
  };

  const updatePrivacySettings = (
    key: keyof SettingsData["privacySettings"],
    value: any
  ) => {
    const newSettings = {
      ...settings,
      privacySettings: {
        ...settings.privacySettings,
        [key]: value,
      },
    };
    saveSettings(newSettings);
  };

  const updateMovementSettings = (
    key: keyof SettingsData["movementSettings"],
    value: any
  ) => {
    const newSettings = {
      ...settings,
      movementSettings: {
        ...settings.movementSettings,
        [key]: value,
      },
    };
    saveSettings(newSettings);
  };

  const updateARSettings = (
    key: keyof SettingsData["arSettings"],
    value: any
  ) => {
    const newSettings = {
      ...settings,
      arSettings: {
        ...settings.arSettings,
        [key]: value,
      },
    };
    saveSettings(newSettings);
  };

  const updateAppearanceSettings = (
    key: keyof SettingsData["appearanceSettings"],
    value: any
  ) => {
    const newSettings = {
      ...settings,
      appearanceSettings: {
        ...settings.appearanceSettings,
        [key]: value,
      },
    };
    saveSettings(newSettings);
  };

  const [themeOptions] = useState([
    { id: "system", name: "Følg system" },
    { id: "light", name: "Lys modus" },
    { id: "dark", name: "Mørk modus" },
  ]);

  const testVoice = () => {
    Speech.speak(
      "Hei! Dette er hvordan stemmen min høres ut med dine nåværende innstillinger.",
      {
        language: settings.voiceSettings.selectedVoice.includes("nb")
          ? "nb-NO"
          : "en-US",
        rate: settings.voiceSettings.speechRate,
        pitch: settings.voiceSettings.pitch,
      }
    );
  };

  const resetSettings = () => {
    Alert.alert(
      "Tilbakestill innstillinger",
      "Er du sikker på at du vil tilbakestille alle innstillinger til standardverdier?",
      [
        { text: "Avbryt", style: "cancel" },
        {
          text: "Tilbakestill",
          style: "destructive",
          onPress: () => {
            const defaultSettings: SettingsData = {
              voiceSettings: {
                selectedVoice: "nb-NO-female",
                speechRate: 0.8,
                pitch: 1.0,
              },
              musicSettings: {
                _backgroundMusicEnabled: true,
                musicVolume: 0.6,
                selectedTheme: "adaptive",
              },
              privacySettings: {
                _shareLocation: true,
                _saveMemories: true,
                _analyticsEnabled: false,
              },
              movementSettings: {
                _adaptiveSpeed: true,
                minWalkingSpeed: 2.0,
                _pauseOnStop: true,
              },
              arSettings: {
                _arGlassesEnabled: false,
                _visualOverlays: true,
                _gestureControls: false,
              },
              appearanceSettings: {
                themeMode: "system",
                useModernTheme: true,
              },
            };
            saveSettings(defaultSettings);
          },
        },
      ]
    );
  };

  const renderSectionHeader = (
    title: string,
    icon: keyof typeof MaterialIcons.glyphMap
  ) => (
    <View style={styles.sectionHeader}>
      <MaterialIcons name={icon} size={24} color={theme.colors.primary} />
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
  );

  const renderSettingRow = (
    title: string,
    subtitle: string,
    rightComponent: React.ReactNode
  ) => (
    <View style={styles.settingRow}>
      <View style={styles.settingContent}>
        <Text style={styles.settingTitle}>{title}</Text>
        <Text style={styles.settingSubtitle}>{subtitle}</Text>
      </View>
      {rightComponent}
    </View>
  );

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <MaterialIcons
          name="settings"
          size={48}
          color={theme.colors.primary}
          style={styles.headerIcon}
        />
        <Text style={styles.title}>AI Innstillinger</Text>
        <Text style={styles.subtitle}>
          Personaliser din EchoTrail-opplevelse
        </Text>
      </View>

      {/* Voice Settings */}
      <View style={styles.section}>
        {renderSectionHeader("Stemmeinnstillinger", "record-voice-over")}

        <View style={styles.settingCard}>
          {renderSettingRow(
            "AI-stemme",
            "Velg hvilken stemme som skal fortelle historiene",
            <TouchableOpacity
              style={styles.voiceSelector}
              onPress={() => {
                const currentIndex = availableVoices.findIndex(
                  (v) => v.id === settings.voiceSettings.selectedVoice
                );
                const nextIndex = (currentIndex + 1) % availableVoices.length;
                updateVoiceSettings(
                  "selectedVoice",
                  availableVoices[nextIndex].id
                );
              }}
            >
              <Text style={styles.voiceSelectorText}>
                {
                  availableVoices.find(
                    (v) => v.id === settings.voiceSettings.selectedVoice
                  )?.name
                }
              </Text>
              <MaterialIcons
                name="keyboard-arrow-down"
                size={20}
                color={theme.colors.text}
              />
            </TouchableOpacity>
          )}

          {renderSettingRow(
            "Talehastighet",
            `${Math.round(settings.voiceSettings.speechRate * 100)}% av normal hastighet`,
            <TouchableOpacity
              style={styles.valueButton}
              onPress={() => {
                const newValue =
                  settings.voiceSettings.speechRate >= 2.0
                    ? 0.5
                    : settings.voiceSettings.speechRate + 0.1;
                updateVoiceSettings(
                  "speechRate",
                  Math.round(newValue * 10) / 10
                );
              }}
            >
              <Text style={styles.valueButtonText}>Justér</Text>
            </TouchableOpacity>
          )}

          {renderSettingRow(
            "Tonehøyde",
            `${Math.round(settings.voiceSettings.pitch * 100)}% av normal tonhøyde`,
            <TouchableOpacity
              style={styles.valueButton}
              onPress={() => {
                const newValue =
                  settings.voiceSettings.pitch >= 2.0
                    ? 0.5
                    : settings.voiceSettings.pitch + 0.1;
                updateVoiceSettings("pitch", Math.round(newValue * 10) / 10);
              }}
            >
              <Text style={styles.valueButtonText}>Justér</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity style={styles.testButton} onPress={testVoice}>
            <MaterialIcons
              name="play-arrow"
              size={20}
              color={theme.colors.primary}
            />
            <Text style={styles.testButtonText}>Test stemme</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Music Settings */}
      <View style={styles.section}>
        {renderSectionHeader("Musikk og lyd", "music-note")}

        <View style={styles.settingCard}>
          {renderSettingRow(
            "Bakgrunnsmusikk",
            "Spill atmosfærisk musikk under historiefortelling",
            <Switch
              value={settings.musicSettings._backgroundMusicEnabled}
              onValueChange={(value) =>
                updateMusicSettings("_backgroundMusicEnabled", value)
              }
              trackColor={{
                false: theme.colors.border,
                true: theme.colors.primary,
              }}
              thumbColor={theme.colors.surface}
            />
          )}

          {settings.musicSettings._backgroundMusicEnabled && (
            <>
              {renderSettingRow(
                "Musikkvolum",
                `${Math.round(settings.musicSettings.musicVolume * 100)}% volum`,
                <TouchableOpacity
                  style={styles.valueButton}
                  onPress={() => {
                    const newValue =
                      settings.musicSettings.musicVolume >= 1.0
                        ? 0
                        : settings.musicSettings.musicVolume + 0.1;
                    updateMusicSettings(
                      "musicVolume",
                      Math.round(newValue * 10) / 10
                    );
                  }}
                >
                  <Text style={styles.valueButtonText}>Justér</Text>
                </TouchableOpacity>
              )}

              {renderSettingRow(
                "Musikktema",
                "Velg type bakgrunnsmusikk",
                <TouchableOpacity
                  style={styles.voiceSelector}
                  onPress={() => {
                    const currentIndex = musicThemes.findIndex(
                      (t) => t.id === settings.musicSettings.selectedTheme
                    );
                    const nextIndex = (currentIndex + 1) % musicThemes.length;
                    updateMusicSettings(
                      "selectedTheme",
                      musicThemes[nextIndex].id
                    );
                  }}
                >
                  <Text style={styles.voiceSelectorText}>
                    {
                      musicThemes.find(
                        (t) => t.id === settings.musicSettings.selectedTheme
                      )?.name
                    }
                  </Text>
                  <MaterialIcons
                    name="keyboard-arrow-down"
                    size={20}
                    color={theme.colors.text}
                  />
                </TouchableOpacity>
              )}
            </>
          )}
        </View>
      </View>

      {/* Appearance Settings */}
      <View style={styles.section}>
        {renderSectionHeader("Utseende", "palette")}

        <View style={styles.settingCard}>
          {renderSettingRow(
            "Tema",
            "Velg lys eller mørk modus for appen",
            <TouchableOpacity
              style={styles.voiceSelector}
              onPress={() => {
                const currentIndex = themeOptions.findIndex(
                  (t) => t.id === settings.appearanceSettings.themeMode
                );
                const nextIndex = (currentIndex + 1) % themeOptions.length;
                const newThemeMode = themeOptions[nextIndex].id as
                  | "light"
                  | "dark"
                  | "system";
                updateAppearanceSettings("themeMode", newThemeMode);
              }}
            >
              <Text style={styles.voiceSelectorText}>
                {
                  themeOptions.find(
                    (t) => t.id === settings.appearanceSettings.themeMode
                  )?.name
                }
              </Text>
              <MaterialIcons
                name="keyboard-arrow-down"
                size={20}
                color={theme.colors.text}
              />
            </TouchableOpacity>
          )}

          {renderSettingRow(
            "Moderne design",
            "Bruk det nye 2025 EchoTrail-designet",
            <Switch
              value={settings.appearanceSettings.useModernTheme}
              onValueChange={(value) =>
                updateAppearanceSettings("useModernTheme", value)
              }
              trackColor={{
                false: theme.colors.border,
                true: theme.colors.primary,
              }}
              thumbColor={theme.colors.surface}
            />
          )}
        </View>
      </View>

      {/* Privacy Settings */}
      <View style={styles.section}>
        {renderSectionHeader("Personvern", "privacy-tip")}

        <View style={styles.settingCard}>
          {renderSettingRow(
            "Del posisjonsdata",
            "Tillat EchoTrail å bruke GPS for stedsspesifikke historier",
            <Switch
              value={settings.privacySettings._shareLocation}
              onValueChange={(value) =>
                updatePrivacySettings("_shareLocation", value)
              }
              trackColor={{
                false: theme.colors.border,
                true: theme.colors.primary,
              }}
              thumbColor={theme.colors.surface}
            />
          )}

          {renderSettingRow(
            "Lagre minner",
            "Automatisk lagre turer og historier i minnealbumet",
            <Switch
              value={settings.privacySettings._saveMemories}
              onValueChange={(value) =>
                updatePrivacySettings("_saveMemories", value)
              }
              trackColor={{
                false: theme.colors.border,
                true: theme.colors.primary,
              }}
              thumbColor={theme.colors.surface}
            />
          )}

          {renderSettingRow(
            "Anonyme analyser",
            "Hjelp til med å forbedre appen ved å dele anonyme bruksdata",
            <Switch
              value={settings.privacySettings._analyticsEnabled}
              onValueChange={(value) =>
                updatePrivacySettings("_analyticsEnabled", value)
              }
              trackColor={{
                false: theme.colors.border,
                true: theme.colors.primary,
              }}
              thumbColor={theme.colors.surface}
            />
          )}
        </View>
      </View>

      {/* Movement Settings */}
      <View style={styles.section}>
        {renderSectionHeader("Bevegelsestilpasning", "directions-walk")}

        <View style={styles.settingCard}>
          {renderSettingRow(
            "Adaptiv hastighet",
            "Tilpass AI-guide til din ganghastighet",
            <Switch
              value={settings.movementSettings._adaptiveSpeed}
              onValueChange={(value) =>
                updateMovementSettings("_adaptiveSpeed", value)
              }
              trackColor={{
                false: theme.colors.border,
                true: theme.colors.primary,
              }}
              thumbColor={theme.colors.surface}
            />
          )}

          {renderSettingRow(
            "Pause ved stopp",
            "Automatisk pause AI-guide når du stopper opp",
            <Switch
              value={settings.movementSettings._pauseOnStop}
              onValueChange={(value) =>
                updateMovementSettings("_pauseOnStop", value)
              }
              trackColor={{
                false: theme.colors.border,
                true: theme.colors.primary,
              }}
              thumbColor={theme.colors.surface}
            />
          )}

          {renderSettingRow(
            "Minimum ganghastighet",
            `${settings.movementSettings.minWalkingSpeed} km/t`,
            <TouchableOpacity
              style={styles.valueButton}
              onPress={() => {
                const newValue =
                  settings.movementSettings.minWalkingSpeed >= 6.0
                    ? 1.0
                    : settings.movementSettings.minWalkingSpeed + 0.5;
                updateMovementSettings("minWalkingSpeed", newValue);
              }}
            >
              <Text style={styles.valueButtonText}>Justér</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* AR Settings */}
      <View style={styles.section}>
        {renderSectionHeader("AR og Fremtidige funksjoner", "view-in-ar")}

        <View style={styles.settingCard}>
          {renderSettingRow(
            "AR-briller support",
            "Forbered for fremtidige AR-briller integrasjoner",
            <Switch
              value={settings.arSettings._arGlassesEnabled}
              onValueChange={(value) =>
                updateARSettings("_arGlassesEnabled", value)
              }
              trackColor={{
                false: theme.colors.border,
                true: theme.colors.primary,
              }}
              thumbColor={theme.colors.surface}
            />
          )}

          {renderSettingRow(
            "Visuelle overlays",
            "Vis informasjon direkte i synsfeltet (fremtidig funksjon)",
            <Switch
              value={settings.arSettings._visualOverlays}
              onValueChange={(value) =>
                updateARSettings("_visualOverlays", value)
              }
              trackColor={{
                false: theme.colors.border,
                true: theme.colors.primary,
              }}
              thumbColor={theme.colors.surface}
            />
          )}

          {renderSettingRow(
            "Bevegelseskontroll",
            "Styr appen med håndbevegelser (fremtidig funksjon)",
            <Switch
              value={settings.arSettings._gestureControls}
              onValueChange={(value) =>
                updateARSettings("_gestureControls", value)
              }
              trackColor={{
                false: theme.colors.border,
                true: theme.colors.primary,
              }}
              thumbColor={theme.colors.surface}
            />
          )}
        </View>
      </View>

      {/* Admin Section */}
      {user?._role === "admin" && (
        <View style={styles.section}>
          {renderSectionHeader("Administrator", "admin-panel-settings")}

          <View style={styles.settingCard}>
            <TouchableOpacity
              style={styles.adminButton}
              onPress={() =>
                Alert.alert("Admin", "Admin-funksjoner kommer snart!")
              }
            >
              <View style={styles.adminButtonContent}>
                <MaterialIcons
                  name="analytics"
                  size={24}
                  color={theme.colors.warning}
                />
                <View style={styles.adminButtonText}>
                  <Text style={styles.settingTitle}>Analytics Dashboard</Text>
                  <Text style={styles.settingSubtitle}>
                    Se detaljerte brukerstatistikker
                  </Text>
                </View>
                <MaterialIcons
                  name="chevron-right"
                  size={20}
                  color={theme.colors.textSecondary}
                />
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.adminButton}
              onPress={() =>
                Alert.alert("Admin", "Brukerhåndtering kommer snart!")
              }
            >
              <View style={styles.adminButtonContent}>
                <MaterialIcons
                  name="people"
                  size={24}
                  color={theme.colors.warning}
                />
                <View style={styles.adminButtonText}>
                  <Text style={styles.settingTitle}>Brukerhåndtering</Text>
                  <Text style={styles.settingSubtitle}>
                    Administrer brukere og tilganger
                  </Text>
                </View>
                <MaterialIcons
                  name="chevron-right"
                  size={20}
                  color={theme.colors.textSecondary}
                />
              </View>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Action Buttons */}
      <View style={styles.actionSection}>
        <Button
          title="Tilbakestill alle innstillinger"
          onPress={resetSettings}
          theme={theme}
          variant="secondary"
          style={styles.resetButton}
        />

        <Button
          title={`Logg ut ${user?._name ? `(${user._name})` : ""}`}
          onPress={() =>
            Alert.alert(
              "Logg ut",
              `Vil du logge ut ${user?._name || "brukeren"}?`,
              [
                { text: "Avbryt", style: "cancel" },
                {
                  text: "Logg ut",
                  style: "destructive",
                  onPress: () => {
                    logout();
                    logger.info(`User ${user?._email} logged out`);
                  },
                },
              ]
            )
          }
          theme={theme}
          variant="outline"
          style={styles.logoutButton}
        />
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>EchoTrail v1.0.0</Text>
        <Text style={styles.footerSubtext}>
          AI-dreven historiefortelling for moderne oppdagere
        </Text>
      </View>
    </ScrollView>
  );
}

const createStyles = (theme: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    header: {
      alignItems: "center",
      paddingVertical: theme.spacing.lg,
      paddingHorizontal: theme.spacing.lg,
    },
    headerIcon: {
      marginBottom: theme.spacing.md,
    },
    title: {
      fontSize: theme.typography.fontSize.xxl,
      fontFamily: theme.typography.fontFamily.bold,
      color: theme.colors.text,
      textAlign: "center",
      marginBottom: theme.spacing.sm,
    },
    subtitle: {
      fontSize: theme.typography.fontSize.md,
      fontFamily: theme.typography.fontFamily.medium,
      color: theme.colors.textSecondary,
      textAlign: "center",
      lineHeight: 20,
    },
    section: {
      marginBottom: theme.spacing.lg,
    },
    sectionHeader: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: theme.spacing.lg,
      marginBottom: theme.spacing.md,
    },
    sectionTitle: {
      fontSize: theme.typography.fontSize.lg,
      fontFamily: theme.typography.fontFamily.semiBold,
      color: theme.colors.text,
      marginLeft: theme.spacing.sm,
    },
    settingCard: {
      backgroundColor: theme.colors.surface,
      marginHorizontal: theme.spacing.lg,
      borderRadius: theme.borderRadius.md,
      padding: theme.spacing.md,
    },
    settingRow: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: theme.spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    settingContent: {
      flex: 1,
      marginRight: theme.spacing.md,
    },
    settingTitle: {
      fontSize: theme.typography.fontSize.md,
      fontFamily: theme.typography.fontFamily.medium,
      color: theme.colors.text,
      marginBottom: theme.spacing.xs,
    },
    settingSubtitle: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.textSecondary,
      lineHeight: 18,
    },
    voiceSelector: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: theme.colors.background,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      borderRadius: theme.borderRadius.sm,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    voiceSelectorText: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.text,
      marginRight: theme.spacing.sm,
    },
    valueButton: {
      backgroundColor: theme.colors.background,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      borderRadius: theme.borderRadius.sm,
      borderWidth: 1,
      borderColor: theme.colors.primary,
    },
    valueButtonText: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.primary,
      fontFamily: theme.typography.fontFamily.medium,
    },
    testButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.colors.background,
      paddingVertical: theme.spacing.md,
      paddingHorizontal: theme.spacing.lg,
      borderRadius: theme.borderRadius.md,
      marginTop: theme.spacing.md,
      borderWidth: 1,
      borderColor: theme.colors.primary,
    },
    testButtonText: {
      fontSize: theme.typography.fontSize.md,
      color: theme.colors.primary,
      marginLeft: theme.spacing.sm,
      fontFamily: theme.typography.fontFamily.medium,
    },
    actionSection: {
      paddingHorizontal: theme.spacing.lg,
      marginBottom: theme.spacing.xl,
    },
    resetButton: {
      marginBottom: theme.spacing.md,
    },
    logoutButton: {
      marginTop: theme.spacing.sm,
    },
    adminButton: {
      paddingVertical: theme.spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    adminButtonContent: {
      flexDirection: "row",
      alignItems: "center",
    },
    adminButtonText: {
      flex: 1,
      marginLeft: theme.spacing.md,
    },
    footer: {
      alignItems: "center",
      paddingHorizontal: theme.spacing.lg,
      paddingBottom: theme.spacing.xl,
    },
    footerText: {
      fontSize: theme.typography.fontSize.sm,
      fontFamily: theme.typography.fontFamily.semiBold,
      color: theme.colors.textSecondary,
      marginBottom: theme.spacing.xs,
    },
    footerSubtext: {
      fontSize: theme.typography.fontSize.xs,
      color: theme.colors.textSecondary,
      textAlign: "center",
    },
  });
