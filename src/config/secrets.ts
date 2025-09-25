/**
 * Secure Configuration Manager
 * Handles all API keys, tokens, and sensitive configuration
 * 
 * SECURITY: This file ensures no hardcoded secrets exist in the codebase
 * All sensitive values must come from environment variables or secure storage
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { logger } from '../utils/logger';

export interface SecretConfig {
  // Google Maps
  googleMapsApiKey: string | null;
  
  // OpenAI
  openaiApiKey: string | null;
  
  // API Configuration
  apiBaseUrl: string;
  apiTimeout: number;
  
  // Database
  databaseUrl: string | null;
  
  // Push Notifications
  oneSignalAppId: string | null;
  
  // Sentry
  sentryDsn: string | null;
  
  // Auth0 / External Auth
  auth0Domain: string | null;
  auth0ClientId: string | null;
  
  // Development flags
  isDevelopment: boolean;
  enableDebugLogs: boolean;
  useLocalApi: boolean;
}

class SecretsManager {
  private static instance: SecretsManager;
  private cache: Map<string, any> = new Map();
  
  private constructor() {}
  
  static getInstance(): SecretsManager {
    if (!SecretsManager.instance) {
      SecretsManager.instance = new SecretsManager();
    }
    return SecretsManager.instance;
  }
  
  /**
   * Get Google Maps API Key
   * Priority: AsyncStorage > Environment Variables > Error
   */
  async getGoogleMapsApiKey(): Promise<string> {
    const cacheKey = 'googleMapsApiKey';
    
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }
    
    try {
      // 1. Check AsyncStorage (user-provided key)
      const storedKey = await AsyncStorage.getItem('@echotrail:google_maps_api_key');
      if (storedKey) {
        this.cache.set(cacheKey, storedKey);
        return storedKey;
      }
      
      // 2. Check environment variables
      const envKey = Constants.expoConfig?.extra?.echotrail?.googleMapsApiKey 
        || process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;
      
      if (envKey) {
        this.cache.set(cacheKey, envKey);
        return envKey;
      }
      
      // 3. Development fallback (REMOVED - force proper configuration)
      const errorMessage = 'Google Maps API key not configured. Please set EXPO_PUBLIC_GOOGLE_MAPS_API_KEY environment variable or configure in app settings.';
      logger.error(errorMessage);
      throw new Error(errorMessage);
      
    } catch (error) {
      logger.error('Error retrieving Google Maps API key:', error);
      throw error;
    }
  }
  
  /**
   * Store Google Maps API Key securely
   */
  async setGoogleMapsApiKey(apiKey: string): Promise<void> {
    if (!apiKey || typeof apiKey !== 'string' || apiKey.length < 30) {
      throw new Error('Invalid Google Maps API key format');
    }
    
    try {
      await AsyncStorage.setItem('@echotrail:google_maps_api_key', apiKey);
      this.cache.set('googleMapsApiKey', apiKey);
      logger.info('Google Maps API key configured successfully');
    } catch (error) {
      logger.error('Error storing Google Maps API key:', error);
      throw error;
    }
  }
  
  /**
   * Get OpenAI API Key
   */
  async getOpenAIApiKey(): Promise<string | null> {
    const cacheKey = 'openaiApiKey';
    
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }
    
    try {
      // 1. Check AsyncStorage
      const storedKey = await AsyncStorage.getItem('@echotrail:openai_api_key');
      if (storedKey) {
        this.cache.set(cacheKey, storedKey);
        return storedKey;
      }
      
      // 2. Check environment variables
      const envKey = process.env.EXPO_PUBLIC_OPENAI_API_KEY;
      if (envKey) {
        this.cache.set(cacheKey, envKey);
        return envKey;
      }
      
      // Return null if not configured (optional service)
      return null;
      
    } catch (error) {
      logger.error('Error retrieving OpenAI API key:', error);
      return null;
    }
  }
  
  /**
   * Store OpenAI API Key securely
   */
  async setOpenAIApiKey(apiKey: string): Promise<void> {
    if (!apiKey || !apiKey.startsWith('sk-')) {
      throw new Error('Invalid OpenAI API key format');
    }
    
    try {
      await AsyncStorage.setItem('@echotrail:openai_api_key', apiKey);
      this.cache.set('openaiApiKey', apiKey);
      logger.info('OpenAI API key configured successfully');
    } catch (error) {
      logger.error('Error storing OpenAI API key:', error);
      throw error;
    }
  }
  
  /**
   * Get API Base URL
   */
  getApiBaseUrl(): string {
    const envUrl = process.env.EXPO_PUBLIC_API_URL;
    if (envUrl) {
      return envUrl;
    }
    
    // Default based on environment
    if (__DEV__) {
      return 'http://localhost:3000/api';
    } else {
      return 'https://api.echotrail.app';
    }
  }
  
  /**
   * Get Database URL
   */
  getDatabaseUrl(): string {
    const envUrl = process.env.DATABASE_URL || process.env.EXPO_PUBLIC_DATABASE_URL;
    if (!envUrl) {
      throw new Error('DATABASE_URL environment variable is required');
    }
    return envUrl;
  }
  
  /**
   * Get OneSignal App ID
   */
  getOneSignalAppId(): string | null {
    return process.env.EXPO_PUBLIC_ONESIGNAL_APP_ID || null;
  }
  
  /**
   * Get Sentry DSN
   */
  getSentryDsn(): string | null {
    return process.env.EXPO_PUBLIC_SENTRY_DSN || null;
  }
  
  /**
   * Get complete configuration object
   */
  async getConfig(): Promise<SecretConfig> {
    return {
      // Google Maps
      googleMapsApiKey: await this.getGoogleMapsApiKey().catch(() => null),
      
      // OpenAI
      openaiApiKey: await this.getOpenAIApiKey(),
      
      // API Configuration
      apiBaseUrl: this.getApiBaseUrl(),
      apiTimeout: parseInt(process.env.EXPO_PUBLIC_API_TIMEOUT || '30000', 10),
      
      // Database
      databaseUrl: process.env.DATABASE_URL || null,
      
      // Push Notifications
      oneSignalAppId: this.getOneSignalAppId(),
      
      // Sentry
      sentryDsn: this.getSentryDsn(),
      
      // Auth0 / External Auth
      auth0Domain: process.env.EXPO_PUBLIC_AUTH0_DOMAIN || null,
      auth0ClientId: process.env.EXPO_PUBLIC_AUTH0_CLIENT_ID || null,
      
      // Development flags
      isDevelopment: __DEV__,
      enableDebugLogs: process.env.EXPO_PUBLIC_ENABLE_DEBUG_LOGS === 'true' || __DEV__,
      useLocalApi: process.env.EXPO_PUBLIC_USE_LOCAL_API === 'true' || __DEV__,
    };
  }
  
  /**
   * Validate all required configuration
   */
  async validateConfig(): Promise<{ isValid: boolean; errors: string[] }> {
    const errors: string[] = [];
    
    try {
      // Check Google Maps API Key (required for core functionality)
      try {
        await this.getGoogleMapsApiKey();
      } catch {
        errors.push('Google Maps API key is required but not configured');
      }
      
      // Check Database URL (required)
      try {
        this.getDatabaseUrl();
      } catch {
        errors.push('DATABASE_URL environment variable is required');
      }
      
      // OpenAI API key is optional, so we don't validate it
      
      return {
        isValid: errors.length === 0,
        errors,
      };
    } catch (error) {
      logger.error('Error validating configuration:', error);
      errors.push('Configuration validation failed');
      return { isValid: false, errors };
    }
  }
  
  /**
   * Clear all cached secrets (useful for logout/reset)
   */
  clearCache(): void {
    this.cache.clear();
  }
  
  /**
   * Remove all stored API keys (for security/logout)
   */
  async clearAllStoredKeys(): Promise<void> {
    try {
      await AsyncStorage.multiRemove([
        '@echotrail:google_maps_api_key',
        '@echotrail:openai_api_key',
      ]);
      this.clearCache();
      logger.info('All stored API keys cleared');
    } catch (error) {
      logger.error('Error clearing stored API keys:', error);
      throw error;
    }
  }
}

export const secretsManager = SecretsManager.getInstance();
export default secretsManager;