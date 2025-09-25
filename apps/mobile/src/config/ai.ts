/**
 * AI Configuration
 * Configuration for AI services including OpenAI API settings
 */

// Environment variables for AI services
export const AIConfig = {
  // OpenAI Configuration
  openai: {
    apiKey: process.env.EXPO_PUBLIC_OPENAI_API_KEY || '',
    baseURL: process.env.EXPO_PUBLIC_OPENAI_BASE_URL || 'https://api.openai.com/v1',
    organization: process.env.EXPO_PUBLIC_OPENAI_ORG_ID || undefined,
    
    // Model settings
    models: {
      chat: 'gpt-4o-mini',
      tts: 'tts-1-hd',
    },
    
    // Default settings
    defaults: {
      temperature: 0.7,
      maxTokens: 2000,
      ttsVoice: 'nova' as const,
      ttsSpeed: 1.0,
    },
  },
  
  // Feature flags
  features: {
    storyGeneration: true,
    textToSpeech: true,
    contextAwareness: true,
    costTracking: true,
  },
  
  // Rate limiting
  rateLimit: {
    requestsPerMinute: 10,
    tokensPerMinute: 50000,
  },
  
  // Cost estimation (approximate USD per 1K tokens)
  costs: {
    'gpt-4o-mini': {
      input: 0.00015,
      output: 0.0006,
    },
    'tts-1-hd': {
      audio: 0.03, // per 1K characters
    },
  },
} as const;

/**
 * Validate AI configuration
 */
export function validateAIConfig(): {
  isValid: boolean;
  missingKeys: string[];
  warnings: string[];
} {
  const missingKeys: string[] = [];
  const warnings: string[] = [];
  
  // Check required OpenAI API key
  if (!AIConfig.openai.apiKey) {
    missingKeys.push('EXPO_PUBLIC_OPENAI_API_KEY');
  }
  
  // Validate API key format (starts with sk-)
  if (AIConfig.openai.apiKey && !AIConfig.openai.apiKey.startsWith('sk-')) {
    warnings.push('OpenAI API key format appears invalid (should start with "sk-")');
  }
  
  // Check if features are properly configured
  if (AIConfig.features.storyGeneration && !AIConfig.openai.apiKey) {
    warnings.push('Story generation is enabled but OpenAI API key is missing');
  }
  
  if (AIConfig.features.textToSpeech && !AIConfig.openai.apiKey) {
    warnings.push('Text-to-Speech is enabled but OpenAI API key is missing');
  }
  
  const isValid = missingKeys.length === 0;
  
  return {
    isValid,
    missingKeys,
    warnings,
  };
}

/**
 * Get AI service status
 */
export function getAIServiceStatus() {
  const config = validateAIConfig();
  
  return {
    status: config.isValid ? 'configured' : 'missing_config',
    features: {
      storyGeneration: AIConfig.features.storyGeneration && config.isValid,
      textToSpeech: AIConfig.features.textToSpeech && config.isValid,
      contextAwareness: AIConfig.features.contextAwareness,
      costTracking: AIConfig.features.costTracking,
    },
    config,
  };
}

/**
 * Development helper to log AI configuration status
 */
export function logAIConfigStatus() {
  if (__DEV__) {
    const status = getAIServiceStatus();
    console.log('🤖 AI Configuration Status:', {
      status: status.status,
      features: status.features,
      hasApiKey: !!AIConfig.openai.apiKey,
      apiKeyPrefix: AIConfig.openai.apiKey ? 
        AIConfig.openai.apiKey.substring(0, 7) + '...' : 
        'not configured',
      missingKeys: status.config.missingKeys,
      warnings: status.config.warnings,
    });
  }
}