import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { useAuth } from "../contexts/AuthContext";
import { createTheme } from "@echotrail/ui";
import { useColorScheme } from "react-native";

interface LoginScreenProps {
  onSwitchToRegister: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({
  onSwitchToRegister,
}) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const { login } = useAuth();
  const colorScheme = useColorScheme();
  const theme = createTheme(colorScheme || "light");
  const styles = createStyles(theme);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }

    setIsLoading(true);
    try {
      await login(email.trim(), password);
      // Navigation will be handled automatically by App.tsx when auth state changes
    } catch (error) {
      Alert.alert(
        "Login Failed",
        error instanceof Error ? error.message : "An unexpected error occurred"
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleDemoLogin = () => {
    setEmail("test@echotrail.no");
    setPassword("TestPassord123!");
  };

  const handleAdminLogin = () => {
    setEmail("kent@zentric.no");
    setPassword("ZentricAdmin2024!");
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.content}>
          <Text style={styles.title}>Welcome to EchoTrail</Text>
          <Text style={styles.subtitle}>Track your adventures</Text>

          <View style={styles.form}>
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Email</Text>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="Enter your email"
                placeholderTextColor={theme.colors.textSecondary}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                editable={!isLoading}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Password</Text>
              <TextInput
                style={styles.input}
                value={password}
                onChangeText={setPassword}
                placeholder="Enter your password"
                placeholderTextColor={theme.colors.textSecondary}
                secureTextEntry
                editable={!isLoading}
              />
            </View>

            <TouchableOpacity
              style={[styles.button, styles.loginButton]}
              onPress={handleLogin}
              disabled={isLoading}
            >
              <Text style={styles.loginButtonText}>
                {isLoading ? "Logging in..." : "Login"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.demoButton]}
              onPress={handleDemoLogin}
              disabled={isLoading}
            >
              <Text style={styles.demoButtonText}>Demo Bruker</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.adminButton]}
              onPress={handleAdminLogin}
              disabled={isLoading}
            >
              <Text style={styles.adminButtonText}>Admin Login</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.switchButton}
              onPress={onSwitchToRegister}
              disabled={isLoading}
            >
              <Text style={styles.switchButtonText}>
                Don't have an account? Register
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const createStyles = (theme: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    scrollContainer: {
      flexGrow: 1,
      justifyContent: "center",
      padding: 20,
    },
    content: {
      alignItems: "center",
    },
    title: {
      fontSize: 32,
      fontWeight: "bold",
      color: theme.colors.text,
      marginBottom: 8,
    },
    subtitle: {
      fontSize: 16,
      color: theme.colors.textSecondary,
      marginBottom: 32,
    },
    form: {
      width: "100%",
      maxWidth: 400,
    },
    inputContainer: {
      marginBottom: 16,
    },
    inputLabel: {
      fontSize: 14,
      fontWeight: "600",
      color: theme.colors.text,
      marginBottom: 4,
    },
    input: {
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: 8,
      padding: 12,
      fontSize: 16,
      color: theme.colors.text,
      backgroundColor: theme.colors.surface,
    },
    button: {
      borderRadius: 8,
      padding: 16,
      alignItems: "center",
      marginBottom: 12,
    },
    loginButton: {
      backgroundColor: theme.colors.primary,
      marginTop: 8,
    },
    loginButtonText: {
      color: "white",
      fontSize: 16,
      fontWeight: "600",
    },
    demoButton: {
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    demoButtonText: {
      color: theme.colors.text,
      fontSize: 16,
      fontWeight: "600",
    },
    adminButton: {
      backgroundColor: theme.colors.warning,
      borderWidth: 1,
      borderColor: theme.colors.warning,
    },
    adminButtonText: {
      color: "white",
      fontSize: 16,
      fontWeight: "600",
    },
    switchButton: {
      padding: 12,
      alignItems: "center",
      marginTop: 8,
    },
    switchButtonText: {
      color: theme.colors.primary,
      fontSize: 16,
    },
  });

export default LoginScreen;
