import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, ScrollView, Alert } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { createTheme } from "../ui";
import { useColorScheme } from "react-native";
import OpenAITTSService, { TTSOptions } from "../services/OpenAITTSService";
import { VoiceCard, ModernCard } from "./modern";
import { logger } from "../utils/logger";

interface Voice {
  id: TTSOptions["voice"];
  name: string;
  description: string;
}

interface VoiceSelectorProps {
  onVoiceChange?: (voice: TTSOptions["voice"]) => void;
  showTitle?: boolean;
  testText?: string;
}

export const VoiceSelector: React.FC<VoiceSelectorProps> = ({
  onVoiceChange,
  showTitle = true,
  testText = "Hei! Dette er en test av denne stemmen.",
}) => {
  const colorScheme = useColorScheme();
  const theme = createTheme(colorScheme || "light");
  const styles = createStyles(theme);

  const [selectedVoice, setSelectedVoice] =
    useState<TTSOptions["voice"]>("alloy");
  const [isPlaying, setIsPlaying] = useState<string | null>(null);
  const [voices] = useState<readonly Voice[]>(
    OpenAITTSService.getAvailableVoices()
  );

  useEffect(() => {
    loadPreferredVoice();
  }, []);

  const loadPreferredVoice = async () => {
    try {
      const preferred = await OpenAITTSService.getPreferredVoice();
      setSelectedVoice(preferred);
    } catch (error) {
      logger.error("Error loading preferred voice:", error);
    }
  };

  const handleVoiceSelect = async (voice: TTSOptions["voice"]) => {
    try {
      setSelectedVoice(voice);
      await OpenAITTSService.setPreferredVoice(voice);
      onVoiceChange?.(voice);
    } catch (error) {
      logger.error("Error setting preferred voice:", error);
      Alert.alert("Feil", "Kunne ikke lagre stemmevalg");
    }
  };

  const testVoice = async (voice: TTSOptions["voice"]) => {
    if (isPlaying === voice) {
      // Stop current playback
      await OpenAITTSService.stopAudio();
      setIsPlaying(null);
      return;
    }

    try {
      setIsPlaying(voice || null);

      await OpenAITTSService.speakText(
        testText,
        {
          voice,
          speed: 1.0,
        },
        {
          onStart: () => logger.debug(`Testing voice: ${voice}`),
          onComplete: () => setIsPlaying(null),
          onError: (error) => {
            logger.error("Voice test error:", error);
            setIsPlaying(null);
            Alert.alert("Feil", `Kunne ikke teste stemme: ${error.message}`);
          },
        }
      );
    } catch (error) {
      setIsPlaying(null);
      Alert.alert(
        "Feil",
        "Kunne ikke teste stemme. Sjekk at OpenAI API-nøkkel er konfigurert."
      );
    }
  };

  return (
    <View style={styles.container}>
      {showTitle && (
        <View style={styles.header}>
          <MaterialIcons
            name="record-voice-over"
            size={24}
            color={theme.colors.primary}
          />
          <Text style={styles.title}>Velg AI-stemme</Text>
        </View>
      )}

      <ScrollView style={styles.voiceList} showsVerticalScrollIndicator={false}>
        {voices.map((voice) => (
          <VoiceCard
            key={voice.id}
            voice={{
              id: voice.id || "",
              name: voice.name,
              description: voice.description,
            }}
            selected={selectedVoice === voice.id}
            playing={isPlaying === voice.id}
            theme={theme}
            onSelect={() => handleVoiceSelect(voice.id)}
            onTest={() => testVoice(voice.id)}
          />
        ))}
      </ScrollView>

      <View style={styles.footer}>
        <ModernCard theme={theme} variant="default" style={styles.infoCard}>
          <MaterialIcons name="info" size={16} color={theme.colors.primary} />
          <Text style={styles.infoText}>
            Trykk på play-knappen for å høre stemmeprøver
          </Text>
        </ModernCard>
      </View>
    </View>
  );
};

const createStyles = (theme: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    title: {
      fontSize: theme.typography.fontSize.lg,
      fontFamily: theme.typography.fontFamily.semiBold,
      color: theme.colors.text,
      marginLeft: theme.spacing.sm,
    },
    voiceList: {
      flex: 1,
      padding: theme.spacing.lg,
    },
    footer: {
      padding: theme.spacing.lg,
      paddingTop: theme.spacing.sm,
    },
    infoCard: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: `${theme.colors.primary}20`,
    },
    infoText: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.text,
      marginLeft: theme.spacing.xs,
      flex: 1,
    },
  });
