# AI/TTS Integration for EchoTrail

## Overview

The EchoTrail mobile app now includes advanced AI story generation and Text-to-Speech (TTS) capabilities powered by OpenAI's GPT-4o-mini and TTS-1-HD models. This integration provides context-aware, location-based storytelling that enhances the user's trail experience.

## Features

### ✨ AI Story Generation
- **Context-Aware**: Stories are generated based on actual GPS trail data, location context, and nearby points of interest
- **Multi-language Support**: Norwegian (primary) and English supported
- **User Preferences**: Customizable story length, voice style, and interest topics
- **Historical Accuracy**: Stories include contextual historical information when available

### 🔊 Text-to-Speech
- **High-Quality Audio**: Uses OpenAI TTS-1-HD model for natural-sounding speech
- **Norwegian Language Optimized**: Special pronunciation optimizations for Norwegian place names and years
- **Multiple Voice Styles**: Different voices matched to user preferences (friendly, mysterious, enthusiastic, calm)
- **Seamless Playback**: Integrated audio player with play/pause/stop controls

### 📊 Performance & Cost Tracking
- **Token Usage Monitoring**: Tracks API usage and estimates costs
- **Performance Metrics**: Monitors generation time and audio quality
- **Rate Limiting**: Built-in protection against excessive API usage

## Setup

### 1. API Key Configuration

Add your OpenAI API key to the environment configuration:

```bash
# Copy the example file
cp .env.example .env

# Edit .env and add your OpenAI API key
EXPO_PUBLIC_OPENAI_API_KEY=sk-your-openai-api-key-here
```

### 2. Install Dependencies

The required dependencies should already be installed:
- `openai` - OpenAI API client
- `expo-av` - Audio playback
- Other dependencies are already part of the project

### 3. Test the Integration

Use the built-in **AI Test Screen** (available in the app's tab navigation during development):

1. Launch the app
2. Navigate to the "AI Test" tab (🤖)
3. Review the mock location and preferences
4. Tap "✨ Generate AI Story" to test story generation
5. If audio is generated, tap "🔊 Play Story" to test TTS

## Usage in Code

### Generating Stories

```typescript
import { ApiServices } from '../services/api';

const locationContext: LocationContext = {
  latitude: 59.9139,
  longitude: 10.7522,
  address: 'Karl Johans gate, Oslo, Norway',
  nearbyPlaces: ['Royal Palace', 'Parliament'],
  trail: {
    id: 'trail-123',
    name: 'Oslo City Walk',
    trackPoints: [...],
    distance: 1500,
    duration: 900,
  }
};

const preferences: UserPreferences = {
  interests: ['history', 'architecture'],
  language: 'nb',
  storyLength: 'medium',
  voiceStyle: 'vennlig',
};

const story = await ApiServices.ai.generateTrailStory(
  locationContext,
  preferences
);
```

### Playing Audio

```typescript
import { Audio } from 'expo-av';

// If story has audio
if (story.audioUrl) {
  const sound = await ApiServices.ai.playAudio(story.audioUrl);
  
  // Set up playback status listener
  sound.setOnPlaybackStatusUpdate((status) => {
    if (status.isLoaded && status.didJustFinish) {
      console.log('Audio finished playing');
    }
  });
}
```

## Configuration

The AI system is configured through `src/config/ai.ts`:

```typescript
export const AIConfig = {
  openai: {
    models: {
      chat: 'gpt-4o-mini',    // Story generation model
      tts: 'tts-1-hd',        // Text-to-Speech model
    },
    defaults: {
      temperature: 0.7,       // Story creativity (0-2)
      maxTokens: 2000,        // Max story length
      ttsVoice: 'nova',       // Default TTS voice
      ttsSpeed: 1.0,          // Speech speed
    },
  },
  features: {
    storyGeneration: true,    // Enable/disable story generation
    textToSpeech: true,       // Enable/disable TTS
    contextAwareness: true,   // Use trail context in stories
    costTracking: true,       // Track API costs
  },
  // ... rate limits and cost estimation
};
```

## API Costs

Estimated costs (as of 2024):
- **GPT-4o-mini**: ~$0.0002-0.0006 per story
- **TTS-1-HD**: ~$0.03 per 1000 characters of audio

The system tracks usage and provides cost estimates in the generated story metadata.

## Integration Points

### TrailRecordingScreen
The main integration is in `TrailRecordingScreen.tsx`, which includes:
- Story generation button
- Audio playback controls  
- Status indicators and loading states
- Error handling and user feedback

### AITestScreen
A dedicated testing interface for:
- Testing story generation with mock data
- Verifying TTS functionality
- Monitoring performance and costs
- Development and debugging

## Error Handling

The system includes comprehensive error handling for:
- **Network Issues**: Graceful fallbacks and retry logic
- **API Rate Limits**: Built-in rate limiting and queuing
- **Invalid Responses**: Fallback to demo stories
- **Audio Playback**: Error recovery and user notification
- **Configuration Issues**: Clear error messages for missing API keys

## Norwegian Language Support

Special optimizations for Norwegian:
- **Pronunciation**: Year numbers (1800 → "atten hundre")
- **Units**: "km" → "kilometer", "m" → "meter"
- **Voice Selection**: Optimized voice mapping for Norwegian styles
- **Cultural Context**: Norwegian historical and cultural references

## Future Enhancements

Planned improvements:
- **Offline Mode**: Cached stories for offline use
- **Voice Cloning**: Custom voice options
- **Multiple Languages**: Extended language support
- **Story Personalization**: Learning from user feedback
- **Background Generation**: Pre-generate stories for planned routes

## Development Tools

### Logging
All AI operations are logged with performance metrics:
```bash
🤖 AI Configuration Status: { status: 'configured', features: {...} }
🤖 Testing AI story generation...
✅ AI story generated: "The Royal Path"
🔊 Playing AI-generated audio...
```

### Configuration Validation
Use `validateAIConfig()` and `getAIServiceStatus()` to check setup:
```typescript
import { validateAIConfig, logAIConfigStatus } from '../config/ai';

const status = validateAIConfig();
if (!status.isValid) {
  console.log('Missing keys:', status.missingKeys);
  console.log('Warnings:', status.warnings);
}

logAIConfigStatus(); // Logs current status in development
```

## Troubleshooting

### Common Issues

**"AI Generation Failed"**
- Check your OpenAI API key is correctly set in `.env`
- Verify the API key starts with `sk-`
- Check network connectivity
- Review console logs for detailed error messages

**"No Audio Available"**
- TTS generation may have failed
- Check the OpenAI TTS service status
- Verify text content is not empty
- Audio generation can be disabled in config

**Stories in Wrong Language**
- Check the `language` preference setting
- Default is Norwegian ('nb')
- System prompt adapts to selected language

**High API Costs**
- Monitor token usage in story metadata
- Adjust `maxTokens` in configuration
- Use shorter stories ('kort' length setting)
- Disable TTS if audio is not needed

### Debug Mode

Enable verbose logging in development:
```typescript
// In development, detailed logs are automatically enabled
if (__DEV__) {
  logAIConfigStatus();
}
```

## Support

For issues related to:
- **OpenAI API**: Check OpenAI's status page and documentation
- **Audio Playback**: Verify expo-av installation and permissions
- **Configuration**: Review environment variables and config files
- **Integration**: Check the AITestScreen for diagnostic information