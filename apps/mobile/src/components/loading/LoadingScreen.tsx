import React from "react";
import { View, Text } from "react-native";

export function LoadingScreen(): React.ReactElement {
  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
      <Text>Loading EchoTrail...</Text>
    </View>
  );
}
