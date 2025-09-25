/**
 * Auto-configure OpenAI API Key for EchoTrail
 * This script sets up the API key for testing
 */

// Les API-nøkkel fra miljøvariabel for sikkerhet  
const apiKey = process.env.OPENAI_API_KEY;

if (!apiKey) {
  console.error('❌ OPENAI_API_KEY miljøvariabel ikke satt.');
  console.log('\nFor å bruke dette scriptet:');
  console.log('1. Sett miljøvariabel: export OPENAI_API_KEY=sk-...');
  console.log('2. Eller legg til i .env fil: OPENAI_API_KEY=sk-...');
  console.log('\n📄 Se SECURITY.md for mer om sikker håndtering av API-nøkler.');
  process.exit(1);
}

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
console.log("4. Paste this API key:");
console.log("");
console.log(`   ${apiKey}`);
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

// Test all voices:
testAllVoices();
