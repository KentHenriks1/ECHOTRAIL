/**
 * Story Marker Clustering Component
 * Custom clustering solution for story markers on maps
 * Created by: Kent Rune Henriksen
 */

import React, { useMemo } from 'react';
import { Text, View, StyleSheet } from 'react-native';
import { Marker } from 'react-native-maps';
import type { GeneratedStory } from '../../services/ai';

export interface StoryMarkerProps {
  story: GeneratedStory;
  onPress: (story: GeneratedStory) => void;
}

export interface ClusterData {
  id: string;
  coordinate: {
    latitude: number;
    longitude: number;
  };
  stories: GeneratedStory[];
  isCluster: boolean;
}

interface StoryMarkerClusterProps {
  stories: GeneratedStory[];
  onStoryPress: (story: GeneratedStory) => void;
  onClusterPress: (stories: GeneratedStory[]) => void;
  clusterRadius?: number; // in meters
  minClusterSize?: number;
  maxZoom?: number;
}

export function StoryMarkerCluster({
  stories,
  onStoryPress,
  onClusterPress,
  clusterRadius = 500,
  minClusterSize = 2,
  // maxZoom = 15 // Unused but kept for future reference
}: StoryMarkerClusterProps): React.ReactElement {

  // Calculate clusters based on proximity
  const clusters = useMemo(() => {
    if (stories.length === 0) return [];

    // Filter stories that have location context
    const validStories = stories.filter(story => story.locationContext);
    if (validStories.length === 0) return [];

    const clusteredData: ClusterData[] = [];
    const processed = new Set<string>();

    for (const story of validStories) {
      if (processed.has(story.id) || !story.locationContext) continue;

      const nearbyStories = validStories.filter(otherStory => {
        if (processed.has(otherStory.id) || story.id === otherStory.id || !otherStory.locationContext) return false;
        
        const distance = calculateDistance(
          story.locationContext!.latitude,
          story.locationContext!.longitude,
          otherStory.locationContext!.latitude,
          otherStory.locationContext!.longitude
        );
        
        return distance <= clusterRadius;
      });

      // Mark all nearby stories as processed
      nearbyStories.forEach(nearbyStory => processed.add(nearbyStory.id));
      processed.add(story.id);

      if (nearbyStories.length + 1 >= minClusterSize) {
        // Create cluster
        const allStories = [story, ...nearbyStories];
        const centerLat = allStories.reduce((sum, s) => sum + s.locationContext!.latitude, 0) / allStories.length;
        const centerLng = allStories.reduce((sum, s) => sum + s.locationContext!.longitude, 0) / allStories.length;

        clusteredData.push({
          id: `cluster-${story.id}`,
          coordinate: {
            latitude: centerLat,
            longitude: centerLng
          },
          stories: allStories,
          isCluster: true
        });
      } else {
        // Single story
        clusteredData.push({
          id: story.id,
          coordinate: {
            latitude: story.locationContext!.latitude,
            longitude: story.locationContext!.longitude
          },
          stories: [story],
          isCluster: false
        });
      }
    }

    return clusteredData;
  }, [stories, clusterRadius, minClusterSize]);

  // Render individual story marker
  const renderStoryMarker = (cluster: ClusterData) => {
    const story = cluster.stories[0];
    return (
      <Marker
        key={cluster.id}
        coordinate={cluster.coordinate}
        title={story.title || "AI-generert historie"}
        description={story.content.substring(0, 100) + "..."}
        pinColor="#10b981"
        onPress={() => onStoryPress(story)}
      >
        <View style={styles.singleMarker}>
          <Text style={styles.singleMarkerText}>📖</Text>
        </View>
      </Marker>
    );
  };

  // Render cluster marker
  const renderClusterMarker = (cluster: ClusterData) => {
    const storyCount = cluster.stories.length;
    return (
      <Marker
        key={cluster.id}
        coordinate={cluster.coordinate}
        title={`${storyCount} historier`}
        description={`Klikk for å se alle ${storyCount} historier i området`}
        onPress={() => onClusterPress(cluster.stories)}
      >
        <View style={[
          styles.clusterMarker, 
          getClusterStyle(storyCount)
        ]}>
          <Text style={styles.clusterText}>{storyCount}</Text>
        </View>
      </Marker>
    );
  };

  return (
    <>
      {clusters.map(cluster => 
        cluster.isCluster 
          ? renderClusterMarker(cluster)
          : renderStoryMarker(cluster)
      )}
    </>
  );
}

// Helper function to calculate distance between two points
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

// Get cluster styling based on story count
function getClusterStyle(count: number) {
  if (count < 5) {
    return {
      backgroundColor: '#10b981',
      width: 35,
      height: 35
    };
  } else if (count < 10) {
    return {
      backgroundColor: '#059669',
      width: 40,
      height: 40
    };
  } else {
    return {
      backgroundColor: '#047857',
      width: 45,
      height: 45
    };
  }
}

const styles = StyleSheet.create({
  singleMarker: {
    backgroundColor: '#10b981',
    borderRadius: 15,
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 5,
  },
  singleMarkerText: {
    fontSize: 14,
  },
  clusterMarker: {
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 8,
  },
  clusterText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center'
  }
});

export default StoryMarkerCluster;