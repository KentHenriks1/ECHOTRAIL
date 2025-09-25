// Les API-nøkkel fra miljøvariabel for sikkerhet
const apiKey = process.env.OPENAI_API_KEY;

if (!apiKey) {
  console.error('❌ OPENAI_API_KEY miljøvariabel ikke satt.');
  console.log('Sett nøkkelen med: export OPENAI_API_KEY=sk-...');
  process.exit(1);
}
const fs = require("fs");

async function testOpenAITTS() {
  console.log("🧪 Testing OpenAI TTS API...");

  try {
    const response = await fetch("https://api.openai.com/v1/audio/speech", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "tts-1",
        input:
          "Hei! Dette er en test av OpenAI TTS i EchoTrail-appen. Lyder dette bra?",
        voice: "alloy",
        speed: 1.0,
        response_format: "mp3",
      }),
    });

    console.log(`📡 Response status: ${response.status}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ API Error: ${response.status} - ${errorText}`);
      return;
    }

    const audioBuffer = await response.arrayBuffer();
    console.log(`🎵 Audio data received: ${audioBuffer.byteLength} bytes`);

    // Save test audio file
    const uint8Array = new Uint8Array(audioBuffer);
    fs.writeFileSync("test-tts-output.mp3", uint8Array);
    console.log("✅ Test audio saved as test-tts-output.mp3");
    console.log("🎉 OpenAI TTS test successful!");
  } catch (error) {
    console.error("❌ Test failed:", error.message);
  }
}

testOpenAITTS();
