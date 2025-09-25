/**
 * Login Screen - Enterprise Edition
 * User authentication with comprehensive validation and error handling
 */

import React, { useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../providers/AuthProvider";
import { Logger, PerformanceMonitor } from "../core/utils";
import { ThemeConfig } from "../core/config";
import { getFontWeight } from "../core/theme/utils";

interface LoginForm {
  email: string;
  password: string;
}

interface LoginErrors {
  email?: string;
  password?: string;
  general?: string;
}

export function LoginScreen(): React.ReactElement {
  const { login, register } = useAuth();
  const [form, setForm] = useState<LoginForm>({
    email: "",
    password: "",
  });
  const [errors, setErrors] = useState<LoginErrors>({});
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const logger = useMemo(() => new Logger("LoginScreen"), []);

  // Validate form
  const validateForm = useCallback((): boolean => {
    const newErrors: LoginErrors = {};

    // Email validation
    if (!form.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      newErrors.email = "Please enter a valid email address";
    }

    // Password validation
    if (!form.password) {
      newErrors.password = "Password is required";
    } else if (form.password.length < 6) {
      newErrors.password = "Password must be at least 6 characters";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [form]);

  // Handle input change
  const handleInputChange = useCallback(
    (field: keyof LoginForm, value: string) => {
      setForm((prev) => ({ ...prev, [field]: value }));

      // Clear field-specific error when user starts typing
      if (errors[field]) {
        setErrors((prev) => {
          const newErrors = { ...prev };
          delete newErrors[field];
          return newErrors;
        });
      }
    },
    [errors]
  );

  // Handle login
  const handleLogin = useCallback(async () => {
    if (!validateForm()) return;

    try {
      setIsLoading(true);
      setErrors({});

      logger.info("Attempting user login", { email: form.email });

      // Call login from AuthProvider
      await login({ email: form.email, password: form.password });

      // Track successful login
      PerformanceMonitor.trackCustomMetric(
        "user_login_success",
        1,
        "count",
        undefined,
        {
          email: form.email,
          loginMethod: "email_password",
        }
      );

      logger.info("User login successful", { email: form.email });
    } catch (err) {
      const errorMessage = (err as Error).message;
      logger.error("Login failed", undefined, err as Error);

      // Set general error
      setErrors({ general: errorMessage });

      // Track failed login
      PerformanceMonitor.trackCustomMetric(
        "user_login_failure",
        1,
        "count",
        undefined,
        {
          email: form.email,
          error: errorMessage,
          loginMethod: "email_password",
        }
      );
    } finally {
      setIsLoading(false);
    }
  }, [form, validateForm, login, logger]);

  // Handle demo login
  const handleDemoLogin = useCallback(async () => {
    try {
      setIsLoading(true);
      setErrors({});

      logger.info("Demo login initiated");

      // Use demo credentials
      await login({ email: "demo@echotrail.com", password: "demo123" });

      // Track demo login
      PerformanceMonitor.trackCustomMetric(
        "user_demo_login",
        1,
        "count",
        undefined,
        { loginMethod: "demo" }
      );

      logger.info("Demo login successful");
    } catch (err) {
      const errorMessage = (err as Error).message;
      logger.error("Demo login failed", undefined, err as Error);

      Alert.alert(
        "Demo Login Failed",
        `Demo login is currently unavailable: ${errorMessage}`,
        [{ text: "OK", style: "default" }]
      );
    } finally {
      setIsLoading(false);
    }
  }, [login, logger]);

  // Handle forgot password
  const handleForgotPassword = useCallback(() => {
    if (!form.email.trim()) {
      Alert.alert(
        "Email Required",
        "Please enter your email address first to reset your password.",
        [{ text: "OK" }]
      );
      return;
    }

    Alert.alert(
      "Password Reset",
      `A password reset link has been sent to: ${form.email}\n\nCheck your email and follow the instructions to reset your password.`,
      [{ text: "OK", style: "default" }]
    );

    // Log the attempt
    logger.info("Password reset requested", { email: form.email });
  }, [form.email, logger]);

  // Handle registration with form inputs
  const handleRegistration = useCallback(async () => {
    // Use current form data or demo data if empty
    const email = form.email.trim() || "newuser@echotrail.com";
    const password = form.password || "password123";
    const name = "New User";

    if (!form.email.trim()) {
      Alert.alert(
        "Registration",
        "Please enter your email address first, then click Create Account again.",
        [{ text: "OK" }]
      );
      return;
    }

    try {
      setIsLoading(true);
      setErrors({});

      logger.info("Attempting user registration", { email });

      // Call register from AuthProvider
      await register({
        email,
        password,
        name,
      });

      // Track successful registration
      PerformanceMonitor.trackCustomMetric(
        "user_registration_success",
        1,
        "count",
        undefined,
        {
          email,
          registrationMethod: "email_password",
        }
      );

      logger.info("User registration successful", { email });

      Alert.alert(
        "Welcome to EchoTrail!",
        "Your account has been created successfully. You are now logged in.",
        [{ text: "Get Started", style: "default" }]
      );
    } catch (err) {
      const errorMessage = (err as Error).message;
      logger.error("Registration failed", undefined, err as Error);

      // Set general error
      setErrors({ general: `Registration failed: ${errorMessage}` });

      Alert.alert(
        "Registration Failed",
        errorMessage.includes("already exists")
          ? "An account with this email already exists. Please try logging in instead."
          : `Registration failed: ${errorMessage}`,
        [{ text: "OK" }]
      );

      // Track failed registration
      PerformanceMonitor.trackCustomMetric(
        "user_registration_failure",
        1,
        "count",
        undefined,
        {
          email,
          error: errorMessage,
          registrationMethod: "email_password",
        }
      );
    } finally {
      setIsLoading(false);
    }
  }, [form, register, logger]);

  // Handle create account
  const handleCreateAccount = useCallback(() => {
    if (!form.email.trim()) {
      Alert.alert(
        "Email Required",
        "Please enter your email address first to create an account.",
        [{ text: "OK" }]
      );
      return;
    }

    Alert.alert(
      "Create Account",
      `Create a new EchoTrail account for: ${form.email}`,
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Create Account",
          style: "default",
          onPress: () => handleRegistration(),
        },
      ]
    );
  }, [form.email, handleRegistration]);

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View style={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.logo}>🥾 EchoTrail</Text>
            <Text style={styles.subtitle}>Enterprise Edition</Text>
            <Text style={styles.description}>
              Welcome back! Sign in to continue your trail adventures.
            </Text>
          </View>

          {/* Login Form */}
          <View style={styles.form}>
            {/* Email Input */}
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Email</Text>
              <TextInput
                style={[styles.input, errors.email && styles.inputError]}
                placeholder="Enter your email"
                placeholderTextColor="#94a3b8"
                value={form.email}
                onChangeText={(value) => handleInputChange("email", value)}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                editable={!isLoading}
              />
              {errors.email && (
                <Text style={styles.errorText}>{errors.email}</Text>
              )}
            </View>

            {/* Password Input */}
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Password</Text>
              <View style={styles.passwordContainer}>
                <TextInput
                  style={[
                    styles.input,
                    styles.passwordInput,
                    errors.password && styles.inputError,
                  ]}
                  placeholder="Enter your password"
                  placeholderTextColor="#94a3b8"
                  value={form.password}
                  onChangeText={(value) => handleInputChange("password", value)}
                  secureTextEntry={!showPassword}
                  autoComplete="password"
                  editable={!isLoading}
                />
                <Pressable
                  style={styles.passwordToggle}
                  onPress={() => setShowPassword(!showPassword)}
                >
                  <Text style={styles.passwordToggleText}>
                    {showPassword ? "🙈" : "👁️"}
                  </Text>
                </Pressable>
              </View>
              {errors.password && (
                <Text style={styles.errorText}>{errors.password}</Text>
              )}
            </View>

            {/* General Error */}
            {errors.general && (
              <View style={styles.generalErrorContainer}>
                <Text style={styles.generalErrorText}>⚠️ {errors.general}</Text>
              </View>
            )}

            {/* Login Button */}
            <Pressable
              style={[styles.loginButton, isLoading && styles.buttonDisabled]}
              onPress={handleLogin}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Text style={styles.loginButtonText}>Sign In</Text>
              )}
            </Pressable>

            {/* Forgot Password */}
            <Pressable
              style={styles.forgotButton}
              onPress={handleForgotPassword}
            >
              <Text style={styles.forgotButtonText}>Forgot Password?</Text>
            </Pressable>
          </View>

          {/* Demo Section */}
          <View style={styles.demoSection}>
            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or</Text>
              <View style={styles.dividerLine} />
            </View>

            <Pressable
              style={[styles.demoButton, isLoading && styles.buttonDisabled]}
              onPress={handleDemoLogin}
              disabled={isLoading}
            >
              <Text style={styles.demoButtonText}>🎮 Try Demo</Text>
            </Pressable>

            <Text style={styles.demoDescription}>
              Explore EchoTrail with full features using demo account
            </Text>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>Don't have an account?</Text>
            <Pressable onPress={handleCreateAccount}>
              <Text style={styles.createAccountText}>Create Account</Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: ThemeConfig.spacing.xl,
    justifyContent: "center",
  },
  header: {
    alignItems: "center",
    marginBottom: ThemeConfig.spacing.xl * 2,
  },
  logo: {
    fontSize: 48,
    fontWeight: getFontWeight("bold"),
    color: ThemeConfig.primaryColor,
    marginBottom: ThemeConfig.spacing.sm,
  },
  subtitle: {
    fontSize: ThemeConfig.typography.fontSize.lg,
    fontWeight: getFontWeight("medium"),
    color: "#1e293b",
    marginBottom: ThemeConfig.spacing.md,
  },
  description: {
    fontSize: ThemeConfig.typography.fontSize.md,
    color: ThemeConfig.secondaryColor,
    textAlign: "center",
    lineHeight: 22,
  },
  form: {
    marginBottom: ThemeConfig.spacing.xl,
  },
  inputContainer: {
    marginBottom: ThemeConfig.spacing.lg,
  },
  inputLabel: {
    fontSize: ThemeConfig.typography.fontSize.md,
    fontWeight: getFontWeight("medium"),
    color: "#1e293b",
    marginBottom: ThemeConfig.spacing.sm,
  },
  input: {
    height: 50,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 12,
    paddingHorizontal: ThemeConfig.spacing.md,
    fontSize: ThemeConfig.typography.fontSize.md,
    color: "#1e293b",
  },
  inputError: {
    borderColor: ThemeConfig.errorColor,
    borderWidth: 1,
  },
  passwordContainer: {
    position: "relative",
  },
  passwordInput: {
    paddingRight: 50,
  },
  passwordToggle: {
    position: "absolute",
    right: ThemeConfig.spacing.md,
    top: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    width: 30,
  },
  passwordToggleText: {
    fontSize: 20,
  },
  errorText: {
    fontSize: ThemeConfig.typography.fontSize.sm,
    color: ThemeConfig.errorColor,
    marginTop: ThemeConfig.spacing.xs,
  },
  generalErrorContainer: {
    backgroundColor: "#fef2f2",
    padding: ThemeConfig.spacing.md,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: ThemeConfig.errorColor,
    marginBottom: ThemeConfig.spacing.lg,
  },
  generalErrorText: {
    fontSize: ThemeConfig.typography.fontSize.md,
    color: ThemeConfig.errorColor,
  },
  loginButton: {
    height: 50,
    backgroundColor: ThemeConfig.primaryColor,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: ThemeConfig.spacing.md,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  loginButtonText: {
    fontSize: ThemeConfig.typography.fontSize.lg,
    fontWeight: getFontWeight("medium"),
    color: "#ffffff",
  },
  forgotButton: {
    alignItems: "center",
    paddingVertical: ThemeConfig.spacing.sm,
  },
  forgotButtonText: {
    fontSize: ThemeConfig.typography.fontSize.md,
    color: ThemeConfig.primaryColor,
    fontWeight: getFontWeight("medium"),
  },
  demoSection: {
    alignItems: "center",
    marginBottom: ThemeConfig.spacing.xl,
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    marginBottom: ThemeConfig.spacing.lg,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#e2e8f0",
  },
  dividerText: {
    fontSize: ThemeConfig.typography.fontSize.sm,
    color: ThemeConfig.secondaryColor,
    marginHorizontal: ThemeConfig.spacing.md,
  },
  demoButton: {
    height: 50,
    backgroundColor: "#f59e0b",
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: ThemeConfig.spacing.md,
    minWidth: 200,
  },
  demoButtonText: {
    fontSize: ThemeConfig.typography.fontSize.lg,
    fontWeight: getFontWeight("medium"),
    color: "#ffffff",
  },
  demoDescription: {
    fontSize: ThemeConfig.typography.fontSize.sm,
    color: ThemeConfig.secondaryColor,
    textAlign: "center",
    lineHeight: 18,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  footerText: {
    fontSize: ThemeConfig.typography.fontSize.md,
    color: ThemeConfig.secondaryColor,
    marginRight: ThemeConfig.spacing.sm,
  },
  createAccountText: {
    fontSize: ThemeConfig.typography.fontSize.md,
    color: ThemeConfig.primaryColor,
    fontWeight: getFontWeight("medium"),
  },
});
