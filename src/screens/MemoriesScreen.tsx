import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  Modal,
  FlatList,
  Dimensions,
} from "react-native";
import { logger } from "../utils/logger";
import { useTranslation } from "react-i18next";
import { createTheme, Button } from "../ui";
import { useColorScheme } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import * as MediaLibrary from "expo-media-library";
// Audio functionality with OpenAI TTS
import AsyncStorage from "@react-native-async-storage/async-storage";
import EchoTrailSoundService from "../services/EchoTrailSoundService";
import OpenAITTSService from "../services/OpenAITTSService";

interface Memory {
  id: string;
  title: string;
  date: string;
  location: {
    latitude: number;
    longitude: number;
    address?: string;
  };
  photos: string[];
  story: string;
  musicTrack: string;
  _duration: number;
  weather?: string;
  mood?: string;
}

const { width } = Dimensions.get("window");

export function MemoriesScreen() {
  const { t } = useTranslation();
  const colorScheme = useColorScheme();
  const theme = createTheme(colorScheme || "light");
  const styles = createStyles(theme);

  const [memories, setMemories] = useState<Memory[]>([]);
  const [selectedMemory, setSelectedMemory] = useState<Memory | null>(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentAudio, setCurrentAudio] = useState<any | null>(null);

  useEffect(() => {
    getPermissions();
    return () => {
      if (currentAudio) {
        // Cleanup audio if needed
        setCurrentAudio(null);
      }
    };
  }, [currentAudio]);

  const getPermissions = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Tillatelse nødvendig",
        "Vi trenger tilgang til fotobiblioteket for å lagre minner."
      );
    }

    const mediaLibraryStatus = await MediaLibrary.requestPermissionsAsync();
    if (mediaLibraryStatus.status !== "granted") {
      Alert.alert(
        "Tillatelse nødvendig",
        "Vi trenger tilgang til mediebiblioteket for å organisere minner."
      );
    }
  };

  const loadMemories = useCallback(async () => {
    try {
      const storedMemories = await AsyncStorage.getItem("echotrail_memories");
      if (storedMemories) {
        setMemories(JSON.parse(storedMemories));
      } else {
        // Load sample memories for demonstration
        const sampleMemories = await createSampleMemories();
        setMemories(sampleMemories);
        await AsyncStorage.setItem(
          "echotrail_memories",
          JSON.stringify(sampleMemories)
        );
      }
    } catch (error) {
      logger.error("Error loading memories:", error);
    }
  }, []);

  // Load memories after function is declared
  useEffect(() => {
    loadMemories();
  }, [loadMemories]);

  const createSampleMemories = async (): Promise<Memory[]> => {
    return [
      {
        id: "1",
        title: "Tur til Bygdøy",
        date: "2024-01-15",
        location: {
          latitude: 59.9066,
          longitude: 10.6845,
          address: "Bygdøy, Oslo",
        },
        photos: [],
        story:
          "En fantastisk tur til Bygdøy med familie. Vi besøkte Vikingskipshuset og lærte om Norges maritime historie. Vikingskipene var imponerende og vi kunne nesten høre historiene fra fortiden.",
        musicTrack: "nordic_ambient",
        _duration: 180,
        weather: "Solskinn",
        mood: "Inspirert",
      },
      {
        id: "2",
        title: "Frognerparken opplevelse",
        date: "2024-01-20",
        location: {
          latitude: 59.9206,
          longitude: 10.7014,
          address: "Frognerparken, Oslo",
        },
        photos: [],
        story:
          "En fredelig wandring gjennom Frognerparken. Vigelandsanlegget var spektakulært, og vi fikk høre fascinerende historier om Gustav Vigeland og hans kunstneriske visjon.",
        musicTrack: "classical_strings",
        _duration: 150,
        weather: "Delvis overskyet",
        mood: "Rolig",
      },
      {
        id: "3",
        title: "Akershus festning",
        date: "2024-01-25",
        location: {
          latitude: 59.9068,
          longitude: 10.7369,
          address: "Akershus festning, Oslo",
        },
        photos: [],
        story:
          "En historisk reise tilbake til middelalderen på Akershus festning. Vi utforsket de gamle murene og fikk høre dramatiske fortellinger om konger, krig og romantikk gjennom århundrene.",
        musicTrack: "medieval_theme",
        _duration: 200,
        weather: "Regn",
        mood: "Mystisk",
      },
    ];
  };

  const addNewMemory = async () => {
    Alert.alert(
      "Ny tur",
      "Vil du starte en ny AI-guidet tur for å skape nye minner?",
      [
        {
          text: "Avbryt",
          style: "cancel",
        },
        {
          text: "Start tur",
          onPress: () => {
            Alert.alert(
              "Tur startet",
              "Din nye tur er startet! Gå til Oppdag-siden for å få AI-guidede historier som blir lagt til minnealbumet ditt."
            );
          },
        },
      ]
    );
  };

  const takePhoto = async () => {
    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 1,
      });

      if (!result.canceled && result.assets[0]) {
        const uri = result.assets[0].uri;
        Alert.alert(
          "Bilde tatt",
          "Bildet vil bli automatisk lagt til ditt nåværende minne når turen er ferdig."
        );
      }
    } catch (error) {
      logger.error("Error taking photo:", error);
    }
  };

  const playMemoryAudio = async (memory: Memory) => {
    try {
      if (currentAudio) {
        // Stop current audio if playing
        await OpenAITTSService.stopAudio();
        setCurrentAudio(null);
      }

      if (isPlaying && selectedMemory?.id === memory.id) {
        setIsPlaying(false);
        setSelectedMemory(null);
        return;
      }

      // Play contextual audio cue first
      await EchoTrailSoundService.playContextualCue("memory_saved");

      logger.debug(`Playing TTS audio for memory: ${memory.title}`);
      setSelectedMemory(memory);
      setIsPlaying(true);

      // Create narrated memory story
      const narratedStory = `Minne fra ${memory.title}. 
      ${memory.story}
      Dette minnet ble lagret ${new Date(memory.date).toLocaleDateString(
        "nb-NO",
        {
          day: "numeric",
          month: "long",
          year: "numeric",
        }
      )} i ${memory.location.address}.`;

      // Use OpenAI TTS for high-quality narration
      await OpenAITTSService.speakText(
        narratedStory,
        {
          voice: "nova", // Use high-quality voice
          speed: 0.85, // Slightly slower for storytelling
          model: "tts-1-hd",
        },
        {
          onStart: () => logger.debug("Memory narration started"),
          onComplete: () => {
            setIsPlaying(false);
            setSelectedMemory(null);
            logger.debug("Memory narration completed");
          },
          onError: (error) => {
            logger.error("Memory TTS error:", error);
            setIsPlaying(false);
            setSelectedMemory(null);
          },
        }
      );
    } catch (error) {
      logger.error("Error playing memory audio:", error);
      setIsPlaying(false);
      setSelectedMemory(null);
    }
  };

  const openMemoryDetails = (memory: Memory) => {
    setSelectedMemory(memory);
    setIsModalVisible(true);
  };

  const renderMemoryCard = ({ item }: { item: Memory }) => (
    <TouchableOpacity
      style={styles.memoryCard}
      onPress={() => openMemoryDetails(item)}
    >
      <View style={styles.memoryHeader}>
        <View style={styles.memoryInfo}>
          <Text style={styles.memoryTitle}>{item.title}</Text>
          <Text style={styles.memoryDate}>
            {new Date(item.date).toLocaleDateString("nb-NO")}
          </Text>
          <Text style={styles.memoryLocation}>{item.location.address}</Text>
        </View>
        <View style={styles.memoryMeta}>
          {item.weather && (
            <View style={styles.metaItem}>
              <MaterialIcons
                name="wb-sunny"
                size={16}
                color={theme.colors.primary}
              />
              <Text style={styles.metaText}>{item.weather}</Text>
            </View>
          )}
          {item.mood && (
            <View style={styles.metaItem}>
              <MaterialIcons
                name="mood"
                size={16}
                color={theme.colors.primary}
              />
              <Text style={styles.metaText}>{item.mood}</Text>
            </View>
          )}
        </View>
      </View>

      <Text style={styles.memoryStory} numberOfLines={3}>
        {item.story}
      </Text>

      <View style={styles.memoryActions}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => playMemoryAudio(item)}
        >
          <MaterialIcons
            name={
              isPlaying && selectedMemory?.id === item.id
                ? "pause"
                : "play-arrow"
            }
            size={24}
            color={theme.colors.primary}
          />
          <Text style={styles.actionText}>
            {isPlaying && selectedMemory?.id === item.id ? "Pause" : "Spill av"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton}>
          <MaterialIcons
            name="photo-library"
            size={24}
            color={theme.colors.primary}
          />
          <Text style={styles.actionText}>Bilder ({item.photos.length})</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.durationContainer}>
        <MaterialIcons
          name="access-time"
          size={16}
          color={theme.colors.textSecondary}
        />
        <Text style={styles.durationText}>
          {Math.floor(item._duration / 60)}:
          {(item._duration % 60).toString().padStart(2, "0")}
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <MaterialIcons
          name="photo-album"
          size={48}
          color={theme.colors.primary}
          style={styles.headerIcon}
        />
        <Text style={styles.title}>Mitt Minnealbum</Text>
        <Text style={styles.subtitle}>
          Personlige historier og opplevelser guidet av kunstig intelligens
        </Text>
      </View>

      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{memories.length}</Text>
          <Text style={styles.statLabel}>Minner</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>
            {memories.reduce(
              (total, memory) => total + memory.photos.length,
              0
            )}
          </Text>
          <Text style={styles.statLabel}>Bilder</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>
            {Math.floor(
              memories.reduce((total, memory) => total + memory._duration, 0) /
                60
            )}
          </Text>
          <Text style={styles.statLabel}>Timer</Text>
        </View>
      </View>

      <View style={styles.actionButtonsContainer}>
        <Button
          title="Start ny tur"
          onPress={addNewMemory}
          theme={theme}
          style={styles.primaryButton}
        />
        <TouchableOpacity style={styles.cameraButton} onPress={takePhoto}>
          <MaterialIcons
            name="camera-alt"
            size={24}
            color={theme.colors.primary}
          />
        </TouchableOpacity>
      </View>

      <FlatList
        data={memories}
        renderItem={renderMemoryCard}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.memoriesContainer}
      />

      <Modal
        visible={isModalVisible}
        animationType="slide"
        onRequestClose={() => setIsModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setIsModalVisible(false)}
            >
              <MaterialIcons name="close" size={28} color={theme.colors.text} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>{selectedMemory?.title}</Text>
          </View>

          {selectedMemory && (
            <ScrollView
              style={styles.modalContent}
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.modalMeta}>
                <Text style={styles.modalDate}>
                  {new Date(selectedMemory.date).toLocaleDateString("nb-NO", {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </Text>
                <Text style={styles.modalLocation}>
                  {selectedMemory.location.address}
                </Text>
                {selectedMemory.weather && (
                  <Text style={styles.modalWeather}>
                    Vær: {selectedMemory.weather}
                  </Text>
                )}
                {selectedMemory.mood && (
                  <Text style={styles.modalMood}>
                    Stemning: {selectedMemory.mood}
                  </Text>
                )}
              </View>

              <Text style={styles.modalStory}>{selectedMemory.story}</Text>

              <View style={styles.modalActions}>
                <Button
                  title={isPlaying ? "Pause historie" : "Spill av historie"}
                  onPress={() => playMemoryAudio(selectedMemory)}
                  theme={theme}
                  variant={isPlaying ? "secondary" : "primary"}
                />
              </View>

              <View style={styles.photosSection}>
                <Text style={styles.photosSectionTitle}>Bilder fra turen</Text>
                {selectedMemory.photos.length === 0 ? (
                  <View style={styles.noPhotos}>
                    <MaterialIcons
                      name="photo"
                      size={48}
                      color={theme.colors.textSecondary}
                    />
                    <Text style={styles.noPhotosText}>
                      Ingen bilder lagt til ennå. Ta bilder under neste tur!
                    </Text>
                  </View>
                ) : (
                  <FlatList
                    data={selectedMemory.photos}
                    horizontal
                    renderItem={({ item }) => (
                      <Image source={{ uri: item }} style={styles.photo} />
                    )}
                    keyExtractor={(item, index) => index.toString()}
                    showsHorizontalScrollIndicator={false}
                  />
                )}
              </View>
            </ScrollView>
          )}
        </View>
      </Modal>
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
    statsContainer: {
      flexDirection: "row",
      justifyContent: "space-around",
      paddingVertical: theme.spacing.lg,
      marginHorizontal: theme.spacing.lg,
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.md,
      marginBottom: theme.spacing.lg,
    },
    statItem: {
      alignItems: "center",
    },
    statNumber: {
      fontSize: theme.typography.fontSize.xl,
      fontFamily: theme.typography.fontFamily.bold,
      color: theme.colors.primary,
    },
    statLabel: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.textSecondary,
      marginTop: theme.spacing.xs,
    },
    actionButtonsContainer: {
      flexDirection: "row",
      paddingHorizontal: theme.spacing.lg,
      marginBottom: theme.spacing.lg,
      alignItems: "center",
    },
    primaryButton: {
      flex: 1,
      marginRight: theme.spacing.md,
    },
    cameraButton: {
      backgroundColor: theme.colors.surface,
      padding: theme.spacing.md,
      borderRadius: theme.borderRadius.md,
      borderWidth: 2,
      borderColor: theme.colors.primary,
    },
    memoriesContainer: {
      paddingHorizontal: theme.spacing.lg,
      paddingBottom: theme.spacing.xl,
    },
    memoryCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.md,
      padding: theme.spacing.lg,
      marginBottom: theme.spacing.md,
      shadowColor: theme.colors.text,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    memoryHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginBottom: theme.spacing.md,
    },
    memoryInfo: {
      flex: 1,
    },
    memoryTitle: {
      fontSize: theme.typography.fontSize.lg,
      fontFamily: theme.typography.fontFamily.semiBold,
      color: theme.colors.text,
      marginBottom: theme.spacing.xs,
    },
    memoryDate: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.textSecondary,
      marginBottom: theme.spacing.xs,
    },
    memoryLocation: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.primary,
    },
    memoryMeta: {
      alignItems: "flex-end",
    },
    metaItem: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: theme.spacing.xs,
    },
    metaText: {
      fontSize: theme.typography.fontSize.xs,
      color: theme.colors.textSecondary,
      marginLeft: theme.spacing.xs,
    },
    memoryStory: {
      fontSize: theme.typography.fontSize.md,
      color: theme.colors.text,
      lineHeight: 20,
      marginBottom: theme.spacing.md,
    },
    memoryActions: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginBottom: theme.spacing.md,
    },
    actionButton: {
      flexDirection: "row",
      alignItems: "center",
      flex: 1,
      marginHorizontal: theme.spacing.xs,
    },
    actionText: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.primary,
      marginLeft: theme.spacing.xs,
    },
    durationContainer: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "flex-end",
    },
    durationText: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.textSecondary,
      marginLeft: theme.spacing.xs,
    },
    modalContainer: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    modalHeader: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: theme.spacing.lg,
      paddingHorizontal: theme.spacing.lg,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    closeButton: {
      marginRight: theme.spacing.md,
    },
    modalTitle: {
      fontSize: theme.typography.fontSize.lg,
      fontFamily: theme.typography.fontFamily.semiBold,
      color: theme.colors.text,
      flex: 1,
    },
    modalContent: {
      flex: 1,
      paddingHorizontal: theme.spacing.lg,
    },
    modalMeta: {
      paddingVertical: theme.spacing.lg,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    modalDate: {
      fontSize: theme.typography.fontSize.md,
      fontFamily: theme.typography.fontFamily.medium,
      color: theme.colors.text,
      marginBottom: theme.spacing.sm,
    },
    modalLocation: {
      fontSize: theme.typography.fontSize.md,
      color: theme.colors.primary,
      marginBottom: theme.spacing.sm,
    },
    modalWeather: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.textSecondary,
      marginBottom: theme.spacing.xs,
    },
    modalMood: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.textSecondary,
    },
    modalStory: {
      fontSize: theme.typography.fontSize.md,
      color: theme.colors.text,
      lineHeight: 22,
      paddingVertical: theme.spacing.lg,
    },
    modalActions: {
      paddingVertical: theme.spacing.lg,
    },
    photosSection: {
      paddingVertical: theme.spacing.lg,
    },
    photosSectionTitle: {
      fontSize: theme.typography.fontSize.lg,
      fontFamily: theme.typography.fontFamily.semiBold,
      color: theme.colors.text,
      marginBottom: theme.spacing.md,
    },
    noPhotos: {
      alignItems: "center",
      paddingVertical: theme.spacing.xl,
    },
    noPhotosText: {
      fontSize: theme.typography.fontSize.md,
      color: theme.colors.textSecondary,
      textAlign: "center",
      marginTop: theme.spacing.md,
    },
    photo: {
      width: 120,
      height: 80,
      borderRadius: theme.borderRadius.sm,
      marginRight: theme.spacing.sm,
    },
  });

export default MemoriesScreen;
