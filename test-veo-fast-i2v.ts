// Test script for Veo 3.1 Fast Image-to-Video
import { veo31FastImageToVideoFlow } from './src/index';

async function testImageToVideo() {
  console.log('🎬 Testing Veo 3.1 Fast Image-to-Video...\n');

  const result = await veo31FastImageToVideoFlow({
    imagePath: './test-input-files/agent-claude-banner.png',
    prompt: 'The digital streams and circuit patterns pulse with energy, the AI figure\'s visor glows brighter, holographic data flows around the scene, camera slowly zooms in, cyberpunk atmosphere intensifies',
    aspectRatio: '16:9',
    personGeneration: 'allow_adult' // Veo 3.1 Fast doesn't support 'allow_all'
  });

  console.log('\n✅ Result:', result);

  if (result.videoPath) {
    console.log(`\n🎥 Video saved to: ${result.videoPath}`);
  }

  if (result.error) {
    console.error(`\n❌ Error: ${result.error}`);
  }
}

testImageToVideo().catch(console.error);
