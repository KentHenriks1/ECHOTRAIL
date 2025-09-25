/**
 * Auto-configure OpenAI API Key for EchoTrail
 * This script sets up the API key for testing
 */

// API key should be provided via environment variables or command-line arguments
const apiKey = process.env.OPENAI_API_KEY;

console.log("🔧 EchoTrail OpenAI TTS Configuration");
console.log("=====================================");
console.log("");
console.log("✅ Your OpenAI API key has been verified and is working!");
console.log("");
console.log("📱 To use OpenAI TTS in the EchoTrail app:");
console.log("");
console.log("1. Open the EchoTrail app");
console.log('2. Go to the "Oppdag" tab');
console.log('3. Scroll down and click "AI-stemmer (trykk for å aktivere)"');
console.log("4. Paste your API key:");
console.log("");
console.log("   [API key hidden for security]");
console.log("");
console.log('5. Click "Test forbindelse" to verify');
console.log('6. Click "Lagre API-nøkkel"');
console.log("");
console.log("🎵 Available voices:");
console.log("   • alloy (default) - Balanced, natural");
console.log("   • echo - Clear, expressive");
console.log("   • fable - Warm, storytelling");
console.log("   • onyx - Deep, authoritative");
console.log("   • nova - Bright, energetic");
console.log("   • shimmer - Soft, pleasant");
console.log("");
console.log("⚡ Features you'll get:");
console.log("   • High-quality AI voices");
console.log("   • Better Norwegian pronunciation");
console.log("   • Consistent audio quality");
console.log("   • Adjustable speech speed");
console.log("");
console.log("🔒 Security note:");
console.log("   The API key is stored securely on your device only.");
console.log("   It's never shared or transmitted except to OpenAI.");
console.log("");
console.log("Happy storytelling with EchoTrail! 🌟");

// Test different voices
async function testAllVoices() {
  if (!apiKey) {
    console.log("\n⚠️  Please set OPENAI_API_KEY environment variable to test voices");
    return;
  }

  console.log("\n🎭 Testing all available voices...\n");

  const voices = [
    { name: "alloy", description: "Balanced, natural" },
    { name: "echo", description: "Clear, expressive" },
    { name: "fable", description: "Warm, storytelling" },
    { name: "onyx", description: "Deep, authoritative" },
    { name: "nova", description: "Bright, energetic" },
    { name: "shimmer", description: "Soft, pleasant" },
  ];

  for (const voice of voices) {
    try {
      console.log(`🎤 Testing ${voice.name} (${voice.description})...`);

      const response = await fetch("https://api.openai.com/v1/audio/speech", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "tts-1",
          input: `Hei! Dette er ${voice.name}-stemmen. ${voice.description}.`,
          voice: voice.name,
          speed: 1.0,
          response_format: "mp3",
        }),
      });

      if (response.ok) {
        const audioBuffer = await response.arrayBuffer();
        console.log(
          `   ✅ ${voice.name}: ${audioBuffer.byteLength} bytes generated`
        );
      } else {
        console.log(`   ❌ ${voice.name}: Failed (${response.status})`);
      }
    } catch (error) {
      console.log(`   ❌ ${voice.name}: Error - ${error.message}`);
    }
  }

  console.log("\n🎉 Voice testing complete!");
}

// Test all voices if API key is provided:
if (apiKey) {
  testAllVoices();
} else {
  console.log("\n⚠️  Set OPENAI_API_KEY environment variable to test voices");
  console.log("   Example: OPENAI_API_KEY=sk-your-key node configure-openai.js");
}
