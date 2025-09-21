import React, { useRef, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Theme } from "../../ui";

interface VoiceCardProps {
  voice: {
    id: string;
    name: string;
    description: string;
  };
  selected: boolean;
  playing: boolean;
  theme: Theme;
  onSelect: () => void;
  onTest: () => void;
}

export const VoiceCard: React.FC<VoiceCardProps> = ({
  voice,
  selected,
  playing,
  theme,
  onSelect,
  onTest,
}) => {
  const styles = createStyles(theme);
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const waveAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (playing) {
      // Create continuous wave animation
      const animation = Animated.loop(
        Animated.sequence([
          Animated.timing(waveAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(waveAnim, {
            toValue: 0,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      );
      animation.start();
      return () => animation.stop();
    } else {
      waveAnim.setValue(0);
    }
    return undefined;
  }, [playing, waveAnim]);

  const handlePress = () => {
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.98,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();
    onSelect();
  };

  const waveOpacity = waveAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.8],
  });

  const cardStyle = selected ? styles.selectedCard : styles.defaultCard;

  return (
    <Animated.View style={styles.transformStyle}>
      <TouchableOpacity onPress={handlePress} style={styles.container}>
        {selected ? (
          <LinearGradient
            colors={[theme.colors.primary, theme.colors.secondary]}
            style={[styles.card, cardStyle]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <CardContent
              voice={voice}
              selected={selected}
              playing={playing}
              theme={theme}
              onTest={onTest}
              waveOpacity={waveOpacity}
              styles={styles}
            />
          </LinearGradient>
        ) : (
          <View style={[styles.card, cardStyle]}>
            <CardContent
              voice={voice}
              selected={selected}
              playing={playing}
              theme={theme}
              onTest={onTest}
              waveOpacity={waveOpacity}
              styles={styles}
            />
          </View>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
};

const CardContent: React.FC<{
  voice: { id: string; name: string; description: string };
  selected: boolean;
  playing: boolean;
  theme: Theme;
  onTest: () => void;
  waveOpacity: Animated.AnimatedAddition<number>;
  styles: any;
}> = ({ voice, selected, playing, theme, onTest, waveOpacity, styles }) => (
  <>
    <View style={styles.voiceInfo}>
      <View style={styles.voiceHeader}>
        <View style={styles.voiceNameContainer}>
          <Text
            style={[
              styles.voiceName,
              {
                color: selected ? theme.colors.surface : theme.colors.text,
                fontFamily: theme.typography.fontFamily.semiBold,
              },
            ]}
          >
            {voice.name}
          </Text>
          {selected && (
            <View
              style={[
                styles.selectedBadge,
                { backgroundColor: theme.colors.surface },
              ]}
            >
              <MaterialIcons
                name="check"
                size={16}
                color={theme.colors.primary}
              />
            </View>
          )}
        </View>

        {/* Wave animation for playing state */}
        {playing && (
          <Animated.View
            style={[styles.waveContainer, { opacity: waveOpacity }]}
          >
            {[0, 1, 2, 3].map((index) => (
              <Animated.View
                key={index}
                style={[
                  styles.waveBit,
                  {
                    backgroundColor: selected
                      ? theme.colors.surface
                      : theme.colors.primary,
                    // animationDelay would be handled differently in React Native
                  },
                ]}
              />
            ))}
          </Animated.View>
        )}
      </View>

      <Text
        style={[
          styles.voiceDescription,
          {
            color: selected
              ? `${theme.colors.surface}DD`
              : theme.colors.textSecondary,
          },
        ]}
      >
        {voice.description}
      </Text>
    </View>

    <TouchableOpacity
      style={[
        styles.testButton,
        {
          backgroundColor: selected
            ? `${theme.colors.surface}20`
            : `${theme.colors.primary}10`,
          borderColor: selected ? theme.colors.surface : theme.colors.primary,
        },
      ]}
      onPress={onTest}
    >
      <MaterialIcons
        name={playing ? "stop" : "play-arrow"}
        size={24}
        color={selected ? theme.colors.surface : theme.colors.primary}
      />
    </TouchableOpacity>
  </>
);

const createStyles = (theme: any) =>
  StyleSheet.create({
    container: {
      marginBottom: 12,
    },
    card: {
      flexDirection: "row",
      alignItems: "center",
      padding: 20,
      borderRadius: 16,
    },
    defaultCard: {
      backgroundColor: "#ffffff",
      borderWidth: 2,
      borderColor: "transparent",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 8,
      elevation: 3,
    },
    selectedCard: {
      borderWidth: 2,
      borderColor: "transparent",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 12,
      elevation: 6,
    },
    voiceInfo: {
      flex: 1,
    },
    voiceHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 6,
    },
    voiceNameContainer: {
      flexDirection: "row",
      alignItems: "center",
    },
    voiceName: {
      fontSize: 18,
      fontWeight: "600",
    },
    selectedBadge: {
      marginLeft: 8,
      width: 24,
      height: 24,
      borderRadius: 12,
      alignItems: "center",
      justifyContent: "center",
    },
    voiceDescription: {
      fontSize: 14,
      fontStyle: "italic",
    },
    waveContainer: {
      flexDirection: "row",
      alignItems: "flex-end",
      height: 20,
      gap: 2,
    },
    waveBit: {
      width: 3,
      height: 12,
      borderRadius: 2,
    },
    testButton: {
      width: 48,
      height: 48,
      borderRadius: 24,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 2,
    },
    transformStyle: {
      transform: [{ scale: 1 }],
    },
  });
