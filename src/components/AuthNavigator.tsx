import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { createTheme, Button } from "../ui";
import { useColorScheme } from "react-native";
import { useAuth } from "../contexts/AuthContext";

export const AuthNavigator: React.FC = () => {
  const colorScheme = useColorScheme();
  const theme = createTheme(colorScheme || "light");
  const styles = createStyles(theme);
  const { login } = useAuth();

  const handleDemoLogin = async () => {
    await login("demo@echotrail.app", "demo");
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Velkommen til EchoTrail</Text>

      <Text style={styles.subtitle}>
        AI-dreven historiefortelling for moderne oppdagere
      </Text>

      <Button title="Start Demo" onPress={handleDemoLogin} theme={theme} />
    </View>
  );
};

const createStyles = (theme: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: theme.colors.background,
      padding: theme.spacing.lg,
    },
    title: {
      fontSize: theme.typography.fontSize.xxl,
      fontFamily: theme.typography.fontFamily.bold,
      color: theme.colors.text,
      marginBottom: theme.spacing.md,
      textAlign: "center",
    },
    subtitle: {
      fontSize: theme.typography.fontSize.md,
      color: theme.colors.textSecondary,
      marginBottom: theme.spacing.xl,
      textAlign: "center",
    },
  });
