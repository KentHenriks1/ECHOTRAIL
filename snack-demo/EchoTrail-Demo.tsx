// 🍿 Expo Snack Demo - EchoTrail Components
// Kopier denne koden til https://snack.expo.dev

import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";

// Mock data for demo
const mockTrail = {
  id: "1",
  name: "Nordmarka Rundtur",
  description:
    "En fantastisk tur gjennom Nordmarkas vakre skog med AI-guidet historiefortelling",
  distance: 8200,
  estimatedDuration: 120,
  difficulty: "moderate" as const,
  category: "hiking" as const,
  rating: 4.6,
  elevationGain: 320,
  hasAudioGuide: true,
};

// TrailCard Component (Simplified for Snack)
const TrailCard: React.FC<{ trail: any }> = ({ trail }) => {
  const formatDistance = (meters: number): string => {
    if (meters < 1000) return `${Math.round(meters)}m`;
    return `${(meters / 1000).toFixed(1)}km`;
  };

  const formatDuration = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) return `${hours}t ${mins}min`;
    return `${mins}min`;
  };

  const getDifficultyColor = (difficulty: string): string => {
    switch (difficulty) {
      case "easy":
        return "#22c55e";
      case "moderate":
        return "#f59e0b";
      case "hard":
        return "#ef4444";
      case "extreme":
        return "#dc2626";
      default:
        return "#6b7280";
    }
  };

  const getDifficultyLabel = (difficulty: string): string => {
    switch (difficulty) {
      case "easy":
        return "Lett";
      case "moderate":
        return "Moderat";
      case "hard":
        return "Vanskelig";
      case "extreme":
        return "Ekstrem";
      default:
        return "Ukjent";
    }
  };

  return (
    <TouchableOpacity style={styles.card} activeOpacity={0.7}>
      <View style={styles.cardHeader}>
        <Text style={styles.trailName}>{trail.name}</Text>
        <View
          style={[
            styles.difficultyBadge,
            { backgroundColor: getDifficultyColor(trail.difficulty) },
          ]}
        >
          <Text style={styles.difficultyText}>
            {getDifficultyLabel(trail.difficulty)}
          </Text>
        </View>
      </View>

      <Text style={styles.description} numberOfLines={2}>
        {trail.description}
      </Text>

      <View style={styles.stats}>
        <View style={styles.statItem}>
          <MaterialIcons name="straighten" size={16} color="#6b7280" />
          <Text style={styles.statText}>{formatDistance(trail.distance)}</Text>
        </View>

        <View style={styles.statItem}>
          <MaterialIcons name="schedule" size={16} color="#6b7280" />
          <Text style={styles.statText}>
            {formatDuration(trail.estimatedDuration)}
          </Text>
        </View>

        <View style={styles.statItem}>
          <MaterialIcons name="trending-up" size={16} color="#6b7280" />
          <Text style={styles.statText}>{trail.elevationGain}m</Text>
        </View>

        <View style={styles.statItem}>
          <MaterialIcons name="star" size={16} color="#fbbf24" />
          <Text style={styles.statText}>{trail.rating}</Text>
        </View>
      </View>

      {trail.hasAudioGuide && (
        <View style={styles.audioGuide}>
          <MaterialIcons name="headphones" size={16} color="#2563eb" />
          <Text style={styles.audioGuideText}>AI-guidet tur tilgjengelig</Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

// Main App Component
export default function EchoTrailDemo() {
  const trails = [
    mockTrail,
    {
      ...mockTrail,
      id: "2",
      name: "Bygdøy Kultursti",
      difficulty: "easy",
      distance: 3200,
      estimatedDuration: 45,
    },
    {
      ...mockTrail,
      id: "3",
      name: "Holmenkollen Ridge",
      difficulty: "hard",
      distance: 12500,
      estimatedDuration: 180,
    },
  ];

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>🎯 EchoTrail Demo</Text>
        <Text style={styles.subtitle}>AI-guidede turer i Norge</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Populære Turer</Text>
        {trails.map((trail) => (
          <TrailCard key={trail.id} trail={trail} />
        ))}
      </View>

      <View style={styles.features}>
        <Text style={styles.sectionTitle}>Features i EchoTrail</Text>
        <View style={styles.featureGrid}>
          <View style={styles.featureCard}>
            <MaterialIcons name="location-on" size={24} color="#2563eb" />
            <Text style={styles.featureTitle}>GPS Sporing</Text>
            <Text style={styles.featureText}>Nøyaktig posisjonering</Text>
          </View>

          <View style={styles.featureCard}>
            <MaterialIcons name="auto-awesome" size={24} color="#2563eb" />
            <Text style={styles.featureTitle}>AI Historier</Text>
            <Text style={styles.featureText}>Personlige opplevelser</Text>
          </View>

          <View style={styles.featureCard}>
            <MaterialIcons name="camera-alt" size={24} color="#2563eb" />
            <Text style={styles.featureTitle}>Foto Album</Text>
            <Text style={styles.featureText}>Lagre minner</Text>
          </View>

          <View style={styles.featureCard}>
            <MaterialIcons name="offline-bolt" size={24} color="#2563eb" />
            <Text style={styles.featureTitle}>Offline Modus</Text>
            <Text style={styles.featureText}>Fungerer uten nett</Text>
          </View>
        </View>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          🚀 Dette er en demo av EchoTrail-komponenter i Expo Snack
        </Text>
        <Text style={styles.footerSubtext}>
          Prosjektet bruker Expo SDK 54 med TypeScript og React Navigation
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  header: {
    padding: 20,
    paddingTop: 60,
    backgroundColor: "#2563eb",
    alignItems: "center",
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "white",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: "rgba(255, 255, 255, 0.8)",
  },
  section: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1f2937",
    marginBottom: 16,
  },
  card: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  trailName: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1f2937",
    flex: 1,
    marginRight: 12,
  },
  difficultyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  difficultyText: {
    fontSize: 12,
    fontWeight: "600",
    color: "white",
  },
  description: {
    fontSize: 14,
    color: "#6b7280",
    lineHeight: 20,
    marginBottom: 12,
  },
  stats: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  statItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  statText: {
    fontSize: 14,
    color: "#6b7280",
    fontWeight: "500",
  },
  audioGuide: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#eff6ff",
    padding: 8,
    borderRadius: 8,
  },
  audioGuideText: {
    fontSize: 14,
    color: "#2563eb",
    fontWeight: "500",
  },
  features: {
    padding: 20,
    backgroundColor: "white",
  },
  featureGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  featureCard: {
    width: "48%",
    backgroundColor: "#f8fafc",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  featureTitle: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#1f2937",
    marginTop: 8,
    marginBottom: 4,
  },
  featureText: {
    fontSize: 12,
    color: "#6b7280",
    textAlign: "center",
  },
  footer: {
    padding: 20,
    alignItems: "center",
  },
  footerText: {
    fontSize: 16,
    color: "#1f2937",
    textAlign: "center",
    marginBottom: 8,
  },
  footerSubtext: {
    fontSize: 14,
    color: "#6b7280",
    textAlign: "center",
  },
});
