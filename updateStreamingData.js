require('dotenv').config();
const mongoose = require('mongoose');
const justwatchService = require('./services/justwatchService');
const Anime = require('./models/Anime');

async function updateAllAnimeStreamingData() {
  try {
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to MongoDB');

    // Pobierz wszystkie anime z mock data lub bez danych streaming
    const animeToUpdate = await Anime.find({
      $or: [
        { streamingPlatforms: { $exists: false } },
        { streamingPlatforms: { $size: 0 } },
        { 'streamingPlatforms.name': { $in: ['Crunchyroll', 'Funimation', 'Netflix'] } }
      ]
    });

    console.log(`📊 Found ${animeToUpdate.length} anime to update`);
    console.log('🎬 Starting streaming data update...\n');

    const results = {
      success: 0,
      failed: 0,
      rateLimited: 0,
      skipped: 0
    };

    for (let i = 0; i < animeToUpdate.length; i++) {
      const anime = animeToUpdate[i];
      
      try {
        console.log(`[${i + 1}/${animeToUpdate.length}] 🔍 Processing: ${anime.title}`);
        
        // Sprawdź czy to nie jest już mock data
        const hasMockData = anime.streamingPlatforms && 
                           anime.streamingPlatforms.some(p => 
                             p.name === 'Crunchyroll' && p.url === 'https://www.crunchyroll.com'
                           );

        if (hasMockData) {
          console.log(`   ⏭️ Skipping (has mock data)`);
          results.skipped++;
          continue;
        }

        const streamingData = await justwatchService.updateAnimeStreamingData(anime._id);
        
        if (streamingData && streamingData.length > 0) {
          console.log(`   ✅ Updated: ${streamingData.map(p => p.name).join(', ')}`);
          results.success++;
        } else {
          console.log(`   ❌ No streaming data found`);
          results.failed++;
        }
        
        // Rate limiting - 5 sekund między requestami
        if (i < animeToUpdate.length - 1) {
          console.log(`   ⏳ Waiting 5 seconds...`);
          await new Promise(resolve => setTimeout(resolve, 5000));
        }
        
      } catch (error) {
        if (error.message.includes('Rate limit')) {
          console.log(`   🚫 Rate limit reached! Stopping update.`);
          results.rateLimited++;
          break;
        } else {
          console.log(`   ❌ Error: ${error.message}`);
          results.failed++;
        }
      }
    }

    console.log('\n📈 Update Summary:');
    console.log(`✅ Success: ${results.success}`);
    console.log(`❌ Failed: ${results.failed}`);
    console.log(`⏭️ Skipped: ${results.skipped}`);
    console.log(`🚫 Rate Limited: ${results.rateLimited}`);
    console.log(`📊 Total Processed: ${results.success + results.failed + results.skipped}`);

    // Pokaż przykłady zaktualizowanych anime
    if (results.success > 0) {
      console.log('\n🎬 Examples of updated anime:');
      const updatedAnime = await Anime.find({
        'streamingPlatforms.name': { $nin: ['Crunchyroll', 'Funimation', 'Netflix'] }
      }).limit(5);
      
      updatedAnime.forEach(anime => {
        console.log(`   • ${anime.title}: ${anime.streamingPlatforms.map(p => p.name).join(', ')}`);
      });
    }

  } catch (error) {
    console.error('❌ Update error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run update if called directly
if (require.main === module) {
  updateAllAnimeStreamingData();
}

module.exports = { updateAllAnimeStreamingData };
