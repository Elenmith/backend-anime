require('dotenv').config();
const justwatchService = require('./services/justwatchService');

// Test popular anime titles
const testAnime = [
  'Attack on Titan',
  'Death Note',
  'Naruto',
  'One Piece',
  'Demon Slayer'
];

async function testStreamingData() {
  try {
    console.log('🧪 Testing streaming data retrieval...\n');

    for (const title of testAnime) {
      try {
        console.log(`🔍 Testing: ${title}`);
        const result = await justwatchService.searchAnime(title);
        
        if (result) {
          console.log(`✅ Found: ${result.title}`);
          console.log(`   Platforms: ${result.streamingPlatforms.map(p => p.name).join(', ')}`);
          console.log(`   JustWatch ID: ${result.justwatchId}`);
        } else {
          console.log(`❌ Not found: ${title}`);
        }
        
        console.log('---');
        
        // Rate limiting - 10 sekund między testami
        await new Promise(resolve => setTimeout(resolve, 10000));
        
      } catch (error) {
        if (error.message.includes('Rate limit')) {
          console.log(`🚫 Rate limit reached! Stopping tests.`);
          break;
        } else {
          console.log(`❌ Error testing ${title}: ${error.message}`);
        }
      }
    }

    console.log('\n🎉 Testing completed!');

  } catch (error) {
    console.error('❌ Test error:', error);
  }
}

// Run test if called directly
if (require.main === module) {
  testStreamingData();
}

module.exports = { testStreamingData };
