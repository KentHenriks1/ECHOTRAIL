/**
 * Authentication Actions Hook for LoginScreen
 * Handles login, registration, demo login, and password reset actions
 */

import { useState, useCallback, useMemo } from 'react';
import { Alert } from 'react-native';
import { useAuth } from '../../providers/AuthProvider';
import { Logger, PerformanceMonitor } from '../../core/utils';
import type { LoginForm, LoginErrors } from './useAuthForm';

export interface AuthActionsData {
  isLoading: boolean;
  handleLogin: (form: LoginForm, validateForm: () => boolean) => Promise<void>;
  handleDemoLogin: () => Promise<void>;
  handleForgotPassword: (email: string) => void;
  handleRegistration: (form: LoginForm) => Promise<void>;
  handleCreateAccount: (email: string, onRegistration: () => Promise<void>) => void;
  setErrors: (errors: LoginErrors) => void;
}

export const useAuthActions = (): AuthActionsData => {
  const { login, register } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  
  const logger = useMemo(() => new Logger('LoginScreen'), []);

  // Handle login
  const handleLogin = useCallback(async (
    form: LoginForm, 
    validateForm: () => boolean
  ) => {
    if (!validateForm()) return;

    try {
      setIsLoading(true);

      logger.info('Attempting user login', { email: form.email });

      await login({ email: form.email, password: form.password });

      // Track successful login
      PerformanceMonitor.trackCustomMetric(
        'user_login_success',
        1,
        'count',
        undefined,
        {
          email: form.email,
          loginMethod: 'email_password',
        }
      );

      logger.info('User login successful', { email: form.email });
    } catch (err) {
      const errorMessage = (err as Error).message;
      logger.error('Login failed', undefined, err as Error);

      // Track failed login
      PerformanceMonitor.trackCustomMetric(
        'user_login_failure',
        1,
        'count',
        undefined,
        {
          email: form.email,
          error: errorMessage,
          loginMethod: 'email_password',
        }
      );

      throw err; // Re-throw to let caller handle error display
    } finally {
      setIsLoading(false);
    }
  }, [login, logger]);

  // Handle demo login
  const handleDemoLogin = useCallback(async () => {
    try {
      setIsLoading(true);

      logger.info('Demo login initiated');

      // Use demo credentials
      await login({ email: 'demo@echotrail.com', password: 'demo123' });

      // Track demo login
      PerformanceMonitor.trackCustomMetric(
        'user_demo_login',
        1,
        'count',
        undefined,
        { loginMethod: 'demo' }
      );

      logger.info('Demo login successful');
    } catch (err) {
      const errorMessage = (err as Error).message;
      logger.error('Demo login failed', undefined, err as Error);

      Alert.alert(
        'Demo Login Failed',
        `Demo login is currently unavailable: ${errorMessage}`,
        [{ text: 'OK', style: 'default' }]
      );
    } finally {
      setIsLoading(false);
    }
  }, [login, logger]);

  // Handle forgot password
  const handleForgotPassword = useCallback((email: string) => {
    if (!email.trim()) {
      Alert.alert(
        'Email Required',
        'Please enter your email address first to reset your password.',
        [{ text: 'OK' }]
      );
      return;
    }

    Alert.alert(
      'Password Reset',
      `A password reset link has been sent to: ${email}\n\nCheck your email and follow the instructions to reset your password.`,
      [{ text: 'OK', style: 'default' }]
    );

    // Log the attempt
    logger.info('Password reset requested', { email });
  }, [logger]);

  // Handle registration
  const handleRegistration = useCallback(async (form: LoginForm) => {
    // Use current form data or demo data if empty
    const email = form.email.trim() || 'newuser@echotrail.com';
    const password = form.password || 'password123';
    const name = 'New User';

    if (!form.email.trim()) {
      Alert.alert(
        'Registration',
        'Please enter your email address first, then click Create Account again.',
        [{ text: 'OK' }]
      );
      return;
    }

    try {
      setIsLoading(true);

      logger.info('Attempting user registration', { email });

      await register({
        email,
        password,
        name,
      });

      // Track successful registration
      PerformanceMonitor.trackCustomMetric(
        'user_registration_success',
        1,
        'count',
        undefined,
        {
          email,
          registrationMethod: 'email_password',
        }
      );

      logger.info('User registration successful', { email });

      Alert.alert(
        'Welcome to EchoTrail!',
        'Your account has been created successfully. You are now logged in.',
        [{ text: 'Get Started', style: 'default' }]
      );
    } catch (err) {
      const errorMessage = (err as Error).message;
      logger.error('Registration failed', undefined, err as Error);

      Alert.alert(
        'Registration Failed',
        errorMessage.includes('already exists')
          ? 'An account with this email already exists. Please try logging in instead.'
          : `Registration failed: ${errorMessage}`,
        [{ text: 'OK' }]
      );

      // Track failed registration
      PerformanceMonitor.trackCustomMetric(
        'user_registration_failure',
        1,
        'count',
        undefined,
        {
          email,
          error: errorMessage,
          registrationMethod: 'email_password',
        }
      );

      throw err; // Re-throw to let caller handle
    } finally {
      setIsLoading(false);
    }
  }, [register, logger]);

  // Handle create account
  const handleCreateAccount = useCallback((email: string, onRegistration: () => Promise<void>) => {
    if (!email.trim()) {
      Alert.alert(
        'Email Required',
        'Please enter your email address first to create an account.',
        [{ text: 'OK' }]
      );
      return;
    }

    Alert.alert(
      'Create Account',
      `Create a new EchoTrail account for: ${email}`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Create Account',
          style: 'default',
          onPress: () => onRegistration(),
        },
      ]
    );
  }, []);

  // Placeholder setErrors function - should be handled by form hook
  const setErrors = useCallback((_errors: LoginErrors) => {
    // This will be overridden by the main component
  }, []);

  return {
    isLoading,
    handleLogin,
    handleDemoLogin,
    handleForgotPassword,
    handleRegistration,
    handleCreateAccount,
    setErrors,
  };
};