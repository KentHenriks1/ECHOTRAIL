# 🎙️ EchoTrail OpenAI TTS Setup Guide

This guide explains how to set up and use real OpenAI Text-to-Speech (TTS) in the EchoTrail mobile app.

## 🌟 Features

- **Real OpenAI TTS Audio**: High-quality MP3 audio generation and playback
- **Smart Caching**: Local file caching to reduce API calls and improve performance
- **Fallback System**: Automatic fallback to system TTS if API key is unavailable
- **Voice Selection**: Choose from 6 OpenAI voices (Alloy, Echo, Fable, Onyx, Nova, Shimmer)
- **Usage Tracking**: Monitor API costs and cache statistics

## ⚠️ Requirements

### Development Build Required
**Important**: Real OpenAI TTS with audio playback requires a **development build**, not Expo Go. This is because:

- Expo Go has limitations with playing audio buffers from network requests
- Local file caching and playback requires `expo-av` and `expo-file-system` native dependencies
- Audio mode configuration needs native module access

### Dependencies
The following packages are already installed:
- `expo-av@~16.0.7` - Audio playback
- `expo-file-system@~19.0.14` - File caching
- `@react-native-async-storage/async-storage` - Secure storage for API keys

## 🚀 Quick Setup

### 1. Create Development Build

```bash
# Create development build for iOS simulator
npx expo run:ios

# OR create development build for Android emulator
npx expo run:android

# OR create development build for physical device
npx eas build --platform ios --profile development
npx eas build --platform android --profile development
```

### 2. Get OpenAI API Key

1. Visit [platform.openai.com](https://platform.openai.com)
2. Sign up or log in to your account
3. Navigate to **API** → **API Keys**
4. Click **"Create new secret key"**
5. Copy the key (starts with `sk-`)

### 3. Add API Key to App

1. Open the EchoTrail app on your device/simulator
2. Navigate to **Settings** (or wherever OpenAISettings component is integrated)
3. Paste your API key in the **OpenAI TTS Settings** section
4. Tap **Save**
5. Test the voice using the **Test Voice** button

## 🔧 Integration Guide

### Adding OpenAI Settings to Your App

```tsx
import React from 'react';
import { Modal } from 'react-native';
import OpenAISettings from '../components/settings/OpenAISettings';

// In your settings screen or component
const [showOpenAISettings, setShowOpenAISettings] = useState(false);

// Render the settings modal
<Modal 
  visible={showOpenAISettings}
  animationType="slide"
  presentationStyle="pageSheet"
>
  <OpenAISettings onClose={() => setShowOpenAISettings(false)} />
</Modal>
```

### Using TTS in Your Components

```tsx
import openAITTSService from '../services/OpenAITTSService';

// Simple text-to-speech
await openAITTSService.speakText('Welcome to EchoTrail!');

// With options and callbacks
await openAITTSService.speakText(
  'This is a test message', 
  {
    voice: 'alloy',
    speed: 1.0,
  },
  {
    onStart: () => console.log('TTS started'),
    onComplete: () => console.log('TTS finished'),
    onError: (error) => console.error('TTS error:', error),
  }
);

// Check if API key is configured
const hasApiKey = await openAITTSService.getApiKey();
if (hasApiKey) {
  console.log('OpenAI TTS enabled');
} else {
  console.log('Using system TTS fallback');
}
```

## 🎛️ Available Voices

| Voice ID | Name | Description | Gender | Premium |
|----------|------|-------------|--------|---------|
| `alloy` | Alloy | Balanced and natural | Neutral | Free |
| `echo` | Echo | Masculine and powerful | Male | Free |
| `fable` | Fable | British accent | Male | Premium |
| `onyx` | Onyx | Deep and dramatic | Male | Premium |
| `nova` | Nova | Young and energetic | Female | Premium |
| `shimmer` | Shimmer | Feminine and soft | Female | Premium |

## 📊 Cost Estimation

OpenAI TTS pricing (as of 2024):
- **Model**: tts-1 (standard)
- **Cost**: ~$0.015 per 1,000 characters
- **Example**: A 100-word tour narration (~500 characters) costs ~$0.0075

### Usage Tracking
The service includes built-in cost estimation:

```tsx
const cost = openAITTSService.getEstimatedCost('Your text here');
console.log(`Estimated cost: $${cost.toFixed(4)}`);
```

## 🗄️ Caching System

### How It Works
- Audio files are cached locally after first generation
- Cache key based on: `text + voice + speed + model`
- Automatic cleanup of files older than 24 hours
- Manual cache clearing available in settings

### Cache Statistics
```tsx
const stats = openAITTSService.getCacheStats();
console.log(`Cached items: ${stats.cachedItems}`);
console.log(`Estimated size: ${stats.estimatedSize}`);
```

### Cache Management
```tsx
// Clear all cached files
await openAITTSService.clearCache();

// Get cache statistics
const stats = openAITTSService.getCacheStats();
```

## 🔄 Fallback Behavior

The service automatically handles fallbacks:

1. **With API Key**: Uses OpenAI TTS with caching
2. **Without API Key**: Falls back to system TTS
3. **API Error**: Gracefully falls back to system TTS
4. **Network Issues**: Uses cached version if available, otherwise system TTS

## 🛠️ Development Tips

### Testing Different Scenarios

```tsx
// Test without API key (system TTS)
await openAITTSService.clearApiKey();
await openAITTSService.speakText('Testing system TTS');

// Test with API key (OpenAI TTS)
await openAITTSService.setApiKey('your-api-key-here');
await openAITTSService.speakText('Testing OpenAI TTS');

// Test caching
await openAITTSService.speakText('Same text'); // First call - API request
await openAITTSService.speakText('Same text'); // Second call - cached
```

### Debugging

```tsx
// Check service health
const health = await openAITTSService.healthCheck();
console.log('TTS Health:', health);

// Monitor audio mode
console.log('Audio initialized:', openAITTSService.isInitialized);
```

### Error Handling

```tsx
await openAITTSService.speakText('Hello world', {}, {
  onError: (error) => {
    if (error.message.includes('API key')) {
      // Handle API key issues
      console.log('Please configure your OpenAI API key');
    } else if (error.message.includes('network')) {
      // Handle network issues
      console.log('Network error, using cached version');
    }
  }
});
```

## 🐛 Troubleshooting

### Common Issues

**1. "No audio playing"**
- Ensure you're using a development build, not Expo Go
- Check that `expo-av` is properly installed
- Verify audio permissions on device

**2. "API key not working"**
- Verify the API key starts with `sk-`
- Check OpenAI account has credits
- Ensure API key has TTS permissions

**3. "Cache not working"**
- Check that `expo-file-system` is installed
- Verify write permissions for cache directory
- Try clearing cache and regenerating

**4. "TypeScript errors"**
- Ensure all dependencies are at correct versions
- Run `npx expo install --fix` to update packages
- Check that types are properly imported

### Debug Commands

```bash
# Check dependencies
npx expo doctor

# Clear Metro cache
npx expo start --clear

# Rebuild development build
npx expo run:ios --clear

# Check bundle analysis
npx expo export --public-url https://example.com
```

## 📱 Platform Differences

### iOS
- Uses iOS-specific audio interruption handling
- Respects silent mode settings
- Better audio quality in most cases

### Android
- Uses Android-specific audio ducking
- May require additional permissions for audio
- Performance varies by device

## 🔒 Security Considerations

- API keys are stored securely in AsyncStorage
- No API keys are logged or exposed in production
- Audio files are stored locally and cleaned up automatically
- Network requests use HTTPS only

## 🎯 Production Deployment

### Before Release
1. Remove any test API keys from code
2. Ensure proper error handling for network failures
3. Test cache cleanup and storage limits
4. Verify audio permissions are requested appropriately
5. Test on low-end devices for performance

### Monitoring
- Track API usage and costs
- Monitor cache hit rates
- Log TTS errors for debugging
- Monitor audio playback completion rates

---

## 🆘 Need Help?

If you encounter issues:
1. Check this guide for common solutions
2. Verify you're using a development build
3. Test with a simple text example first
4. Check logs for specific error messages
5. Ensure your OpenAI account has sufficient credits

**Remember**: The beauty of this implementation is that it gracefully falls back to system TTS, so users will always hear audio even if OpenAI TTS isn't configured! 🎉