import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Alert,
  Modal,
  TouchableOpacity,
} from "react-native";
import { logger } from "../utils/logger";
import { MaterialIcons } from "@expo/vector-icons";
import { createTheme } from "../ui";
import { useColorScheme } from "react-native";
import OpenAITTSService from "../services/OpenAITTSService";
import { VoiceSelector } from "./VoiceSelector";
import { ModernCard, ModernButton, StatusIndicator } from "./modern";

interface OpenAISetupProps {
  visible: boolean;
  onClose: () => void;
  onApiKeySet: () => void;
}

export const OpenAISetup: React.FC<OpenAISetupProps> = ({
  visible,
  onClose,
  onApiKeySet,
}) => {
  const colorScheme = useColorScheme();
  const theme = createTheme(colorScheme || "light");
  const styles = createStyles(theme);

  const [apiKey, setApiKey] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [showVoiceSelector, setShowVoiceSelector] = useState(false);
  const [hasValidApiKey, setHasValidApiKey] = useState(false);

  useEffect(() => {
    if (visible) {
      checkExistingKey();
    }
  }, [visible]);

  const checkExistingKey = async () => {
    try {
      const existingKey = await OpenAITTSService.getApiKey();
      if (existingKey) {
        // Show masked version of existing key
        setApiKey("*".repeat(20) + existingKey.slice(-4));
        setHasValidApiKey(true);
      }
    } catch (error) {
      logger.error("Error checking existing API key:", error);
    }
  };

  const handleSaveApiKey = async () => {
    if (!apiKey.trim()) {
      Alert.alert("Feil", "Vennligst skriv inn din OpenAI API-nøkkel.");
      return;
    }

    // Skip saving if this is the masked existing key
    if (apiKey.startsWith("*")) {
      onApiKeySet();
      onClose();
      return;
    }

    setIsLoading(true);

    try {
      await OpenAITTSService.setApiKey(apiKey.trim());
      setHasValidApiKey(true);

      Alert.alert(
        "Suksess",
        "OpenAI API-nøkkel er lagret. Du kan nå velge din foretrukne stemme.",
        [
          {
            text: "Velg stemme",
            onPress: () => setShowVoiceSelector(true),
          },
          {
            text: "Ferdig",
            onPress: () => {
              onApiKeySet();
              onClose();
            },
          },
        ]
      );
    } catch (error) {
      Alert.alert("Feil", "Kunne ikke lagre API-nøkkelen. Prøv igjen.");
      logger.error("Error saving API key:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTestConnection = async () => {
    if (!apiKey.trim() || apiKey.startsWith("*")) {
      const existingKey = await OpenAITTSService.getApiKey();
      if (!existingKey) {
        Alert.alert("Feil", "Vennligst skriv inn din OpenAI API-nøkkel først.");
        return;
      }
    } else {
      await OpenAITTSService.setApiKey(apiKey.trim());
    }

    setIsLoading(true);

    try {
      await OpenAITTSService.speakText(
        "Hei! Dette er en test av OpenAI TTS.",
        {
          voice: "alloy",
          speed: 1.0,
        },
        {
          onStart: () => logger.debug("Test TTS started"),
          onComplete: () => {
            Alert.alert("Suksess", "OpenAI TTS fungerer perfekt!");
            setIsLoading(false);
          },
          onError: (error) => {
            Alert.alert("Feil", `TTS-test mislyktes: ${error.message}`);
            setIsLoading(false);
          },
        }
      );
    } catch (error) {
      Alert.alert(
        "Feil",
        "Kunne ikke teste TTS-forbindelsen. Sjekk API-nøkkelen din."
      );
      setIsLoading(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <MaterialIcons name="close" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={styles.title}>OpenAI TTS Setup</Text>
        </View>

        <View style={styles.content}>
          {!showVoiceSelector ? (
            <>
              <ModernCard
                theme={theme}
                variant="default"
                style={styles.infoCard}
              >
                <StatusIndicator status="idle" theme={theme} size={24} />
                <Text style={styles.infoText}>
                  For å bruke høykvalitets AI-stemmer fra OpenAI, trenger du en
                  API-nøkkel.
                </Text>
              </ModernCard>

              <View style={styles.steps}>
                <Text style={styles.stepsTitle}>
                  Slik får du en API-nøkkel:
                </Text>
                <Text style={styles.step}>1. Gå til platform.openai.com</Text>
                <Text style={styles.step}>2. Lag en konto eller logg inn</Text>
                <Text style={styles.step}>
                  3. Gå til API-nøkler i innstillinger
                </Text>
                <Text style={styles.step}>4. Opprett en ny nøkkel</Text>
                <Text style={styles.step}>
                  5. Kopier nøkkelen og lim den inn under
                </Text>
              </View>

              <View style={styles.inputSection}>
                <Text style={styles.inputLabel}>OpenAI API-nøkkel:</Text>
                <View style={styles.inputContainer}>
                  <TextInput
                    style={styles.input}
                    value={apiKey}
                    onChangeText={setApiKey}
                    placeholder="sk-..."
                    secureTextEntry={!showKey}
                    autoCapitalize="none"
                    autoCorrect={false}
                    multiline={false}
                  />
                  <TouchableOpacity
                    style={styles.eyeButton}
                    onPress={() => setShowKey(!showKey)}
                  >
                    <MaterialIcons
                      name={showKey ? "visibility-off" : "visibility"}
                      size={24}
                      color={theme.colors.textSecondary}
                    />
                  </TouchableOpacity>
                </View>
              </View>

              <ModernCard
                theme={theme}
                variant="default"
                style={styles.warningCard}
              >
                <StatusIndicator status="idle" theme={theme} size={20} />
                <Text style={styles.warningText}>
                  API-nøkkelen lagres sikkert på din enhet og brukes kun for
                  TTS-forespørsler.
                </Text>
              </ModernCard>

              <View style={styles.actions}>
                <ModernButton
                  title="Test forbindelse"
                  onPress={handleTestConnection}
                  theme={theme}
                  variant="secondary"
                  disabled={isLoading}
                  loading={isLoading}
                  icon="wifi"
                  size="medium"
                  style={styles.testButton}
                />
                <ModernButton
                  title={isLoading ? "Lagrer..." : "Lagre API-nøkkel"}
                  onPress={handleSaveApiKey}
                  theme={theme}
                  variant="gradient"
                  disabled={isLoading}
                  loading={isLoading}
                  icon="save"
                  size="large"
                />
                {hasValidApiKey && (
                  <ModernButton
                    title="Velg stemme"
                    onPress={() => setShowVoiceSelector(true)}
                    theme={theme}
                    variant="secondary"
                    icon="record-voice-over"
                    size="medium"
                  />
                )}
              </View>

              <TouchableOpacity style={styles.skipButton} onPress={onClose}>
                <Text style={styles.skipText}>Hopp over (bruk system TTS)</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <TouchableOpacity
                style={styles.backButton}
                onPress={() => setShowVoiceSelector(false)}
              >
                <MaterialIcons
                  name="arrow-back"
                  size={24}
                  color={theme.colors.primary}
                />
                <Text style={styles.backText}>
                  Tilbake til API-innstillinger
                </Text>
              </TouchableOpacity>

              <VoiceSelector
                showTitle={false}
                onVoiceChange={(voice) => {
                  logger.debug("Voice changed to:", voice);
                }}
              />

              <View style={styles.voiceActions}>
                <ModernButton
                  title="Ferdig"
                  onPress={() => {
                    onApiKeySet();
                    onClose();
                  }}
                  theme={theme}
                  variant="gradient"
                  icon="check"
                  size="large"
                />
              </View>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
};

const createStyles = (theme: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      padding: theme.spacing.lg,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    closeButton: {
      marginRight: theme.spacing.md,
    },
    title: {
      fontSize: theme.typography.fontSize.xl,
      fontFamily: theme.typography.fontFamily.bold,
      color: theme.colors.text,
    },
    content: {
      flex: 1,
      padding: theme.spacing.lg,
    },
    infoCard: {
      flexDirection: "row",
      alignItems: "flex-start",
      marginBottom: theme.spacing.lg,
      backgroundColor: `${theme.colors.primary}10`,
    },
    infoText: {
      flex: 1,
      fontSize: theme.typography.fontSize.md,
      color: theme.colors.text,
      marginLeft: theme.spacing.sm,
      lineHeight: 20,
    },
    steps: {
      marginBottom: theme.spacing.lg,
    },
    stepsTitle: {
      fontSize: theme.typography.fontSize.lg,
      fontFamily: theme.typography.fontFamily.semiBold,
      color: theme.colors.text,
      marginBottom: theme.spacing.sm,
    },
    step: {
      fontSize: theme.typography.fontSize.md,
      color: theme.colors.textSecondary,
      marginBottom: theme.spacing.xs,
      paddingLeft: theme.spacing.sm,
    },
    inputSection: {
      marginBottom: theme.spacing.lg,
    },
    inputLabel: {
      fontSize: theme.typography.fontSize.md,
      fontFamily: theme.typography.fontFamily.medium,
      color: theme.colors.text,
      marginBottom: theme.spacing.sm,
    },
    inputContainer: {
      flexDirection: "row",
      alignItems: "center",
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.md,
      backgroundColor: theme.colors.surface,
    },
    input: {
      flex: 1,
      padding: theme.spacing.md,
      fontSize: theme.typography.fontSize.md,
      color: theme.colors.text,
    },
    eyeButton: {
      padding: theme.spacing.md,
    },
    warningCard: {
      flexDirection: "row",
      alignItems: "flex-start",
      marginBottom: theme.spacing.xl,
      backgroundColor: `${theme.colors.warning}10`,
    },
    warningText: {
      flex: 1,
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.text,
      marginLeft: theme.spacing.sm,
      lineHeight: 18,
    },
    actions: {
      gap: theme.spacing.md,
    },
    testButton: {
      marginBottom: theme.spacing.sm,
    },
    skipButton: {
      alignItems: "center",
      padding: theme.spacing.md,
      marginTop: theme.spacing.lg,
    },
    skipText: {
      fontSize: theme.typography.fontSize.md,
      color: theme.colors.textSecondary,
      textDecorationLine: "underline",
    },
    backButton: {
      flexDirection: "row",
      alignItems: "center",
      padding: theme.spacing.md,
      marginBottom: theme.spacing.lg,
    },
    backText: {
      fontSize: theme.typography.fontSize.md,
      color: theme.colors.primary,
      marginLeft: theme.spacing.sm,
    },
    voiceActions: {
      padding: theme.spacing.lg,
      paddingTop: 0,
    },
  });
