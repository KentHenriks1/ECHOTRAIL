import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Switch,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import openAITTSService from "../../services/OpenAITTSService";
import { logger } from "../../utils/logger";

interface OpenAISettingsProps {
  onClose?: () => void;
}

const OpenAISettings: React.FC<OpenAISettingsProps> = ({ onClose }) => {
  const [apiKey, setApiKey] = useState("");
  const [savedApiKey, setSavedApiKey] = useState<string | null>(null);
  const [preferredVoice, setPreferredVoice] = useState<string>("alloy");
  const [isTestingTTS, setIsTestingTTS] = useState(false);
  const [cacheStats, setCacheStats] = useState({
    cachedItems: 0,
    estimatedSize: "0 KB",
  });
  const [showApiKey, setShowApiKey] = useState(false);

  useEffect(() => {
    loadSettings();
    updateCacheStats();
  }, []);

  const loadSettings = async () => {
    try {
      const storedApiKey = await openAITTSService.getApiKey();
      const voice = await openAITTSService.getPreferredVoice();

      setSavedApiKey(storedApiKey);
      setApiKey(storedApiKey || "");
      setPreferredVoice(voice || "alloy");
    } catch (error) {
      logger.error("Error loading OpenAI settings:", error);
    }
  };

  const updateCacheStats = () => {
    const stats = openAITTSService.getCacheStats();
    setCacheStats(stats);
  };

  const handleSaveApiKey = async () => {
    try {
      if (apiKey.trim()) {
        await openAITTSService.setApiKey(apiKey.trim());
        setSavedApiKey(apiKey.trim());
        Alert.alert(
          "Success",
          "OpenAI API key saved successfully! You can now use high-quality OpenAI TTS voices.",
          [{ text: "OK" }]
        );
      } else {
        await openAITTSService.setApiKey("");
        setSavedApiKey(null);
        Alert.alert(
          "API Key Removed",
          "OpenAI API key has been removed. The app will use system TTS voices.",
          [{ text: "OK" }]
        );
      }
    } catch (error) {
      logger.error("Error saving API key:", error);
      Alert.alert("Error", "Failed to save API key. Please try again.");
    }
  };

  const handleClearApiKey = async () => {
    Alert.alert(
      "Remove API Key",
      "Are you sure you want to remove your OpenAI API key? This will disable high-quality TTS voices.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            try {
              await openAITTSService.setApiKey("");
              setApiKey("");
              setSavedApiKey(null);
              Alert.alert("Success", "API key removed successfully.");
            } catch (error) {
              logger.error("Error clearing API key:", error);
              Alert.alert("Error", "Failed to remove API key.");
            }
          },
        },
      ]
    );
  };

  const handleVoiceChange = async (voiceId: string) => {
    try {
      await openAITTSService.setPreferredVoice(voiceId as any);
      setPreferredVoice(voiceId);
      logger.debug("Preferred voice updated:", voiceId);
    } catch (error) {
      logger.error("Error setting preferred voice:", error);
      Alert.alert("Error", "Failed to set preferred voice.");
    }
  };

  const handleTestTTS = async () => {
    if (isTestingTTS) return;

    setIsTestingTTS(true);
    try {
      const testText =
        "Hello from EchoTrail! This is a test of the OpenAI text-to-speech system.";

      await openAITTSService.speakText(
        testText,
        {
          voice: preferredVoice as any,
          speed: 1.0,
        },
        {
          onStart: () => logger.debug("TTS test started"),
          onComplete: () => {
            setIsTestingTTS(false);
            Alert.alert("Test Complete", "TTS test finished successfully!");
          },
          onError: (error) => {
            setIsTestingTTS(false);
            logger.error("TTS test error:", error);
            Alert.alert("Test Failed", `TTS test failed: ${error.message}`);
          },
        }
      );
    } catch (error) {
      setIsTestingTTS(false);
      logger.error("TTS test error:", error);
      Alert.alert("Test Failed", "Failed to run TTS test.");
    }
  };

  const handleClearCache = async () => {
    Alert.alert(
      "Clear TTS Cache",
      "This will delete all cached audio files. Are you sure?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear",
          style: "destructive",
          onPress: async () => {
            try {
              await openAITTSService.clearCache();
              updateCacheStats();
              Alert.alert("Success", "TTS cache cleared successfully.");
            } catch (error) {
              logger.error("Error clearing cache:", error);
              Alert.alert("Error", "Failed to clear cache.");
            }
          },
        },
      ]
    );
  };

  const availableVoices = openAITTSService.getAvailableVoices();

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>OpenAI TTS Settings</Text>
        {onClose && (
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color="#666" />
          </TouchableOpacity>
        )}
      </View>

      {/* API Key Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>API Key</Text>
        <Text style={styles.description}>
          Enter your OpenAI API key to enable high-quality TTS voices. Without
          an API key, the app will use system TTS voices.
        </Text>

        <View style={styles.apiKeyContainer}>
          <TextInput
            style={[styles.input, styles.apiKeyInput]}
            value={apiKey}
            onChangeText={setApiKey}
            placeholder="Enter your OpenAI API key"
            secureTextEntry={!showApiKey}
            autoCorrect={false}
            autoCapitalize="none"
          />
          <TouchableOpacity
            style={styles.toggleVisibilityButton}
            onPress={() => setShowApiKey(!showApiKey)}
          >
            <Ionicons
              name={showApiKey ? "eye-off" : "eye"}
              size={20}
              color="#666"
            />
          </TouchableOpacity>
        </View>

        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={[styles.button, styles.saveButton]}
            onPress={handleSaveApiKey}
          >
            <Text style={styles.buttonText}>Save</Text>
          </TouchableOpacity>

          {savedApiKey && (
            <TouchableOpacity
              style={[styles.button, styles.clearButton]}
              onPress={handleClearApiKey}
            >
              <Text style={styles.buttonText}>Remove</Text>
            </TouchableOpacity>
          )}
        </View>

        {savedApiKey && (
          <Text style={styles.statusText}>
            ✅ API key configured - OpenAI TTS enabled
          </Text>
        )}
        {!savedApiKey && (
          <Text style={styles.statusText}>
            ⚠️ No API key - Using system TTS
          </Text>
        )}
      </View>

      {/* Voice Selection */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Preferred Voice</Text>
        <Text style={styles.description}>
          Choose your preferred OpenAI TTS voice. This will be used by default
          for all audio.
        </Text>

        {availableVoices.map((voice) => (
          <TouchableOpacity
            key={voice.id}
            style={[
              styles.voiceOption,
              preferredVoice === voice.id && styles.selectedVoiceOption,
            ]}
            onPress={() => handleVoiceChange(voice.id)}
          >
            <View style={styles.voiceInfo}>
              <Text style={styles.voiceName}>{voice.name}</Text>
              <Text style={styles.voiceDescription}>{voice.description}</Text>
            </View>
            {preferredVoice === voice.id && (
              <Ionicons name="checkmark-circle" size={20} color="#007AFF" />
            )}
          </TouchableOpacity>
        ))}

        <TouchableOpacity
          style={[styles.button, styles.testButton]}
          onPress={handleTestTTS}
          disabled={isTestingTTS}
        >
          <Ionicons
            name={isTestingTTS ? "hourglass" : "play"}
            size={16}
            color="white"
          />
          <Text style={styles.buttonText}>
            {isTestingTTS ? "Testing..." : "Test Voice"}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Cache Management */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Cache Management</Text>
        <Text style={styles.description}>
          Cached audio files improve performance by storing generated speech
          locally.
        </Text>

        <View style={styles.cacheStats}>
          <Text style={styles.statText}>
            Cached files: {cacheStats.cachedItems}
          </Text>
          <Text style={styles.statText}>
            Estimated size: {cacheStats.estimatedSize}
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.button, styles.clearCacheButton]}
          onPress={handleClearCache}
        >
          <Ionicons name="trash-outline" size={16} color="white" />
          <Text style={styles.buttonText}>Clear Cache</Text>
        </TouchableOpacity>
      </View>

      {/* Help Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>How to Get OpenAI API Key</Text>
        <Text style={styles.description}>
          1. Go to platform.openai.com{"\n"}
          2. Sign up or log in to your account{"\n"}
          3. Navigate to API → API Keys{"\n"}
          4. Click "Create new secret key"{"\n"}
          5. Copy the key and paste it above{"\n"}
          {"\n"}
          Note: OpenAI charges per character for TTS usage. See their pricing
          page for current rates.
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 20,
    backgroundColor: "white",
    borderBottomWidth: 1,
    borderBottomColor: "#e1e1e1",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
  },
  closeButton: {
    padding: 5,
  },
  section: {
    backgroundColor: "white",
    marginVertical: 10,
    marginHorizontal: 15,
    padding: 20,
    borderRadius: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    marginBottom: 10,
  },
  description: {
    fontSize: 14,
    color: "#666",
    lineHeight: 20,
    marginBottom: 15,
  },
  apiKeyContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 15,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: "#fff",
  },
  apiKeyInput: {
    flex: 1,
    marginRight: 10,
    fontFamily: "monospace",
  },
  toggleVisibilityButton: {
    padding: 10,
  },
  buttonRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 10,
  },
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    gap: 8,
  },
  saveButton: {
    backgroundColor: "#007AFF",
    flex: 1,
  },
  clearButton: {
    backgroundColor: "#FF3B30",
    flex: 1,
  },
  testButton: {
    backgroundColor: "#34C759",
    marginTop: 10,
  },
  clearCacheButton: {
    backgroundColor: "#FF9500",
    marginTop: 10,
  },
  buttonText: {
    color: "white",
    fontWeight: "600",
    fontSize: 16,
  },
  statusText: {
    fontSize: 14,
    marginTop: 5,
  },
  voiceOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 12,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    marginBottom: 8,
  },
  selectedVoiceOption: {
    borderColor: "#007AFF",
    backgroundColor: "#f0f8ff",
  },
  voiceInfo: {
    flex: 1,
  },
  voiceName: {
    fontSize: 16,
    fontWeight: "500",
    color: "#333",
  },
  voiceDescription: {
    fontSize: 14,
    color: "#666",
    marginTop: 2,
  },
  cacheStats: {
    backgroundColor: "#f8f9fa",
    padding: 15,
    borderRadius: 8,
    marginBottom: 15,
  },
  statText: {
    fontSize: 14,
    color: "#333",
    marginBottom: 5,
  },
});

export default OpenAISettings;
