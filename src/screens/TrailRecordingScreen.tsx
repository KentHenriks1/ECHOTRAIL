import React from "react";
import { View, Text } from "react-native";

interface TrailRecordingScreenProps {}

export function TrailRecordingScreen(_props: TrailRecordingScreenProps) {
  return (
    <View testID="trail-recording-screen">
      <Text testID="trail-name-input">Trail Recording</Text>
      <Text>Start Recording</Text>
      <Text testID="recording-timer">00:00:00</Text>
      <View testID="recording-stats">
        <Text>Distance</Text>
        <Text>Duration</Text>
        <Text>Speed</Text>
        <Text>Elevation</Text>
      </View>
    </View>
  );
}

export default TrailRecordingScreen;
