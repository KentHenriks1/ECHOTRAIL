/**
 * App Context Service
 * Handles differentiation between EchoTrail and Zentric users
 */

import { Request } from 'express';
import { Logger } from '../utils/logger';

const logger = new Logger('AppContext');

export interface AppContextConfig {
  name: string;
  displayName: string;
  baseUrl: string;
  apiUrl: string;
  features: string[];
  branding: {
    primaryColor: string;
    logo: string;
    favicon: string;
  };
  redirectUrls: {
    success: string;
    error: string;
    logout: string;
  };
}

/**
 * App configurations for different contexts
 */
export const APP_CONTEXTS: Record<string, AppContextConfig> = {
  echotrail: {
    name: 'echotrail',
    displayName: 'EchoTrail',
    baseUrl: process.env.NODE_ENV === 'production' 
      ? 'https://app.echotrail.com' 
      : 'http://localhost:8081',
    apiUrl: process.env.NODE_ENV === 'production' 
      ? 'https://api.echotrail.com' 
      : 'http://localhost:3001',
    features: [
      'trails',
      'stories', 
      'gps_tracking',
      'location_sharing',
      'offline_maps',
      'social_features'
    ],
    branding: {
      primaryColor: '#2563eb',
      logo: '/assets/echotrail-logo.png',
      favicon: '/assets/echotrail-favicon.ico',
    },
    redirectUrls: {
      success: '/auth/success',
      error: '/auth/error',
      logout: '/auth/logout',
    }
  },
  zentric: {
    name: 'zentric',
    displayName: 'Zentric',
    baseUrl: process.env.NODE_ENV === 'production' 
      ? 'https://app.zentric.no' 
      : 'http://localhost:3000',
    apiUrl: process.env.NODE_ENV === 'production' 
      ? 'https://api.zentric.no' 
      : 'http://localhost:3001',
    features: [
      'industrial_automation',
      'ai_analysis',
      'predictive_maintenance',
      'data_visualization',
      'enterprise_dashboard',
      'team_collaboration'
    ],
    branding: {
      primaryColor: '#059669',
      logo: '/assets/zentric-logo.png',
      favicon: '/assets/zentric-favicon.ico',
    },
    redirectUrls: {
      success: '/auth/success',
      error: '/auth/error', 
      logout: '/auth/logout',
    }
  }
};

/**
 * Get app context configuration
 */
export function getAppContext(appName: string): AppContextConfig | null {
  const context = APP_CONTEXTS[appName.toLowerCase()];
  if (!context) {
    logger.warn('Unknown app context requested', { appName });
    return null;
  }
  return context;
}

/**
 * Validate app context from request
 */
export function validateAppContext(req: Request): string {
  // Try to get app context from various sources
  const appContext = 
    req.query.app as string ||
    req.body.app as string ||
    req.headers['x-app-context'] as string ||
    req.get('Origin')?.includes('zentric') ? 'zentric' : 'echotrail';

  // Normalize and validate
  const normalizedContext = appContext.toLowerCase().trim();
  
  if (!APP_CONTEXTS[normalizedContext]) {
    logger.warn('Invalid app context, defaulting to echotrail', { 
      providedContext: appContext,
      ip: req.ip 
    });
    return 'echotrail';
  }

  return normalizedContext;
}

/**
 * Check if user has access to specific app features
 */
export function hasFeatureAccess(userAppContext: string, requiredFeature: string): boolean {
  const context = getAppContext(userAppContext);
  if (!context) {
    return false;
  }

  return context.features.includes(requiredFeature);
}

/**
 * Get appropriate redirect URL for app context
 */
export function getRedirectUrl(appContext: string, type: 'success' | 'error' | 'logout', params?: Record<string, string>): string {
  const context = getAppContext(appContext);
  if (!context) {
    logger.error('Cannot get redirect URL for unknown app context', { appContext });
    const fallback = APP_CONTEXTS.echotrail;
    if (fallback) {
      return fallback.baseUrl + fallback.redirectUrls.error;
    }
    return 'http://localhost:8081/auth/error';
  }

  let url = context.baseUrl + context.redirectUrls[type];
  
  // Add query parameters if provided
  if (params && Object.keys(params).length > 0) {
    const searchParams = new URLSearchParams(params);
    url += '?' + searchParams.toString();
  }

  return url;
}

/**
 * Get app-specific user data formatting
 */
export function formatUserForApp(user: any, appContext: string): any {
  const context = getAppContext(appContext);
  if (!context) {
    return user;
  }

  const baseUser = {
    id: user.id,
    email: user.email,
    name: user.name,
    avatar: user.avatar,
    provider: user.provider?.toLowerCase() || 'local',
    appContext: user.appContext,
    createdAt: user.createdAt?.toISOString(),
    updatedAt: user.updatedAt?.toISOString(),
    lastLoginAt: user.lastLoginAt?.toISOString(),
  };

  // App-specific formatting
  switch (appContext) {
    case 'echotrail':
      return {
        ...baseUser,
        preferences: {
          units: user.units?.toLowerCase() || 'metric',
          language: user.language?.toLowerCase() || 'en',
          mapStyle: user.mapStyle || 'standard',
          privacyLevel: user.privacyLevel?.toLowerCase() || 'public',
        },
        features: context.features,
        branding: context.branding,
      };

    case 'zentric':
      return {
        ...baseUser,
        preferences: {
          theme: user.theme || 'light',
          language: user.language?.toLowerCase() || 'en',
          dashboardLayout: user.dashboardLayout || 'default',
          notifications: user.notifications || true,
        },
        features: context.features,
        branding: context.branding,
        role: user.role?.toLowerCase() || 'user',
      };

    default:
      return baseUser;
  }
}

/**
 * Get app-specific API response structure
 */
export function formatApiResponse(data: any, appContext: string, success: boolean = true): any {
  const context = getAppContext(appContext);
  const timestamp = new Date().toISOString();

  const baseResponse = {
    success,
    timestamp,
    data: success ? data : undefined,
    error: !success ? data : undefined,
  };

  // App-specific response formatting
  switch (appContext) {
    case 'zentric':
      return {
        ...baseResponse,
        meta: {
          app: 'Zentric',
          version: process.env.npm_package_version || '1.0.0',
          environment: process.env.NODE_ENV || 'development',
        },
      };

    case 'echotrail':
    default:
      return baseResponse;
  }
}

/**
 * Log app context events
 */
export function logAppContextEvent(event: string, appContext: string, data?: any): void {
  logger.info(`App Context Event: ${event}`, {
    appContext,
    event,
    ...data,
  });
}

export default {
  APP_CONTEXTS,
  getAppContext,
  validateAppContext,
  hasFeatureAccess,
  getRedirectUrl,
  formatUserForApp,
  formatApiResponse,
  logAppContextEvent,
};