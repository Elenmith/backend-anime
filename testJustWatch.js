require('dotenv').config();
const mongoose = require('mongoose');
const justwatchService = require('./services/justwatchService');

// Test popular anime titles
const testAnime = [
  'Attack on Titan',
  'Death Note',
  'Naruto',
  'One Piece',
  'Demon Slayer',
  'My Hero Academia',
  'Fullmetal Alchemist',
  'Dragon Ball Z',
  'Spirited Away',
  'Your Name'
];

async function testJustWatchAPI() {
  try {
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to MongoDB');

    console.log('\n🧪 Testing JustWatch API...\n');

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
        
        // Rate limiting - 3 sekundy między testami
        await new Promise(resolve => setTimeout(resolve, 3000));
        
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
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run test if called directly
if (require.main === module) {
  testJustWatchAPI();
}

module.exports = { testJustWatchAPI };
