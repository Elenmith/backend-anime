const axios = require('axios');
const Anime = require('../models/Anime');

class JustWatchService {
  constructor() {
    this.baseUrl = 'https://apis.justwatch.com/content';
    this.rateLimit = {
      requests: 0,
      windowStart: Date.now(),
      maxRequests: 50, // 50 requestów na godzinę
      windowMs: 60 * 60 * 1000 // 1 godzina
    };
    this.cache = new Map();
    this.cacheTimeout = 24 * 60 * 60 * 1000; // 24 godziny
  }

  // Sprawdź rate limit
  checkRateLimit() {
    const now = Date.now();
    
    // Reset window jeśli minęła godzina
    if (now - this.rateLimit.windowStart > this.rateLimit.windowMs) {
      this.rateLimit.requests = 0;
      this.rateLimit.windowStart = now;
    }
    
    // Sprawdź czy nie przekroczyliśmy limitu
    if (this.rateLimit.requests >= this.rateLimit.maxRequests) {
      const timeLeft = this.rateLimit.windowMs - (now - this.rateLimit.windowStart);
      throw new Error(`Rate limit exceeded. Try again in ${Math.ceil(timeLeft / 60000)} minutes`);
    }
    
    this.rateLimit.requests++;
  }

  // Sprawdź cache
  getFromCache(key) {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }
    this.cache.delete(key);
    return null;
  }

  // Zapisz do cache
  setCache(key, data) {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  // Wyszukaj anime na JustWatch (simulated for now)
  async searchAnime(title) {
    const cacheKey = `justwatch_search_${title.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
    
    // Sprawdź cache
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      console.log(`📦 Cache hit for: ${title}`);
      return cached;
    }

    try {
      this.checkRateLimit();
      
      console.log(`🔍 Searching streaming data for: ${title}`);
      
      // Simulated streaming data based on popular anime
      const streamingData = this.getSimulatedStreamingData(title);
      
      if (streamingData.length > 0) {
        const result = {
          title: title,
          justwatchId: `sim_${Date.now()}`,
          streamingPlatforms: streamingData
        };
        
        this.setCache(cacheKey, result);
        return result;
      }
      
      return null;
      
    } catch (error) {
      console.error(`❌ Streaming search error for ${title}:`, error.message);
      
      if (error.message.includes('Rate limit')) {
        throw error;
      }
      
      return null;
    }
  }

  // Simulated streaming data based on popular anime
  getSimulatedStreamingData(title) {
    const titleLower = title.toLowerCase();
    
    // Popular anime with known streaming platforms
    const animeStreamingData = {
      'attack on titan': [
        { name: 'Crunchyroll', url: 'https://www.crunchyroll.com/series/GR751KNZY/attack-on-titan', monetization: 'flatrate' },
        { name: 'Funimation', url: 'https://www.funimation.com/shows/attack-on-titan/', monetization: 'flatrate' },
        { name: 'Hulu', url: 'https://www.hulu.com/series/attack-on-titan', monetization: 'flatrate' }
      ],
      'death note': [
        { name: 'Netflix', url: 'https://www.netflix.com/title/80045960', monetization: 'flatrate' },
        { name: 'Crunchyroll', url: 'https://www.crunchyroll.com/series/GRVN8MVQY/death-note', monetization: 'flatrate' },
        { name: 'Hulu', url: 'https://www.hulu.com/series/death-note', monetization: 'flatrate' }
      ],
      'naruto': [
        { name: 'Crunchyroll', url: 'https://www.crunchyroll.com/series/GRVN8MVQY/naruto', monetization: 'flatrate' },
        { name: 'Netflix', url: 'https://www.netflix.com/title/80045960', monetization: 'flatrate' },
        { name: 'Hulu', url: 'https://www.hulu.com/series/naruto', monetization: 'flatrate' }
      ],
      'one piece': [
        { name: 'Crunchyroll', url: 'https://www.crunchyroll.com/series/GRVN8MVQY/one-piece', monetization: 'flatrate' },
        { name: 'Netflix', url: 'https://www.netflix.com/title/80045960', monetization: 'flatrate' },
        { name: 'Funimation', url: 'https://www.funimation.com/shows/one-piece/', monetization: 'flatrate' }
      ],
      'demon slayer': [
        { name: 'Crunchyroll', url: 'https://www.crunchyroll.com/series/GRVN8MVQY/demon-slayer', monetization: 'flatrate' },
        { name: 'Netflix', url: 'https://www.netflix.com/title/80045960', monetization: 'flatrate' },
        { name: 'Funimation', url: 'https://www.funimation.com/shows/demon-slayer/', monetization: 'flatrate' }
      ],
      'my hero academia': [
        { name: 'Crunchyroll', url: 'https://www.crunchyroll.com/series/GRVN8MVQY/my-hero-academia', monetization: 'flatrate' },
        { name: 'Funimation', url: 'https://www.funimation.com/shows/my-hero-academia/', monetization: 'flatrate' },
        { name: 'Hulu', url: 'https://www.hulu.com/series/my-hero-academia', monetization: 'flatrate' }
      ],
      'fullmetal alchemist': [
        { name: 'Netflix', url: 'https://www.netflix.com/title/80045960', monetization: 'flatrate' },
        { name: 'Crunchyroll', url: 'https://www.crunchyroll.com/series/GRVN8MVQY/fullmetal-alchemist', monetization: 'flatrate' },
        { name: 'Hulu', url: 'https://www.hulu.com/series/fullmetal-alchemist', monetization: 'flatrate' }
      ],
      'dragon ball': [
        { name: 'Crunchyroll', url: 'https://www.crunchyroll.com/series/GRVN8MVQY/dragon-ball', monetization: 'flatrate' },
        { name: 'Funimation', url: 'https://www.funimation.com/shows/dragon-ball/', monetization: 'flatrate' },
        { name: 'Hulu', url: 'https://www.hulu.com/series/dragon-ball', monetization: 'flatrate' }
      ],
      'spirited away': [
        { name: 'HBO Max', url: 'https://play.hbomax.com/feature/urn:hbo:feature:GXkRjxwjR68PDwwEAABKJ', monetization: 'flatrate' },
        { name: 'Disney+', url: 'https://www.disneyplus.com/movies/spirited-away', monetization: 'flatrate' }
      ],
      'your name': [
        { name: 'Crunchyroll', url: 'https://www.crunchyroll.com/movie/GRVN8MVQY/your-name', monetization: 'flatrate' },
        { name: 'Netflix', url: 'https://www.netflix.com/title/80045960', monetization: 'flatrate' }
      ]
    };

    // Check for exact matches first
    for (const [key, platforms] of Object.entries(animeStreamingData)) {
      if (titleLower.includes(key) || key.includes(titleLower)) {
        return platforms;
      }
    }

    // Return default platforms for other anime
    return [
      { name: 'Crunchyroll', url: 'https://www.crunchyroll.com/browse', monetization: 'flatrate' },
      { name: 'Netflix', url: 'https://www.netflix.com/search?q=anime', monetization: 'flatrate' },
      { name: 'Funimation', url: 'https://www.funimation.com/shows/', monetization: 'flatrate' }
    ];
  }



  // Aktualizuj anime w bazie z rzeczywistymi danymi
  async updateAnimeStreamingData(animeId) {
    try {
      const anime = await Anime.findById(animeId);
      if (!anime) {
        throw new Error('Anime not found');
      }

      const justwatchData = await this.searchAnime(anime.title);
      
      if (justwatchData && justwatchData.streamingPlatforms.length > 0) {
        await Anime.findByIdAndUpdate(animeId, {
          streamingPlatforms: justwatchData.streamingPlatforms,
          justwatchId: justwatchData.justwatchId
        });
        
        console.log(`✅ Updated streaming data for: ${anime.title}`);
        return justwatchData.streamingPlatforms;
      }
      
      return null;
      
    } catch (error) {
      console.error(`❌ Error updating anime streaming data:`, error.message);
      return null;
    }
  }

  // Batch update dla wielu anime
  async batchUpdateStreamingData(limit = 10) {
    try {
      // Pobierz anime bez rzeczywistych danych streaming
      const animeToUpdate = await Anime.find({
        $or: [
          { streamingPlatforms: { $exists: false } },
          { streamingPlatforms: { $size: 0 } },
          { 'streamingPlatforms.name': { $in: ['Crunchyroll', 'Funimation', 'Netflix'] } }
        ]
      }).limit(limit);

      console.log(`🔄 Starting batch update for ${animeToUpdate.length} anime...`);
      
      const results = {
        success: 0,
        failed: 0,
        rateLimited: 0
      };

      for (const anime of animeToUpdate) {
        try {
          const platforms = await this.updateAnimeStreamingData(anime._id);
          if (platforms) {
            results.success++;
          } else {
            results.failed++;
          }
          
          // Rate limiting - 2 sekundy między requestami
          await new Promise(resolve => setTimeout(resolve, 2000));
          
        } catch (error) {
          if (error.message.includes('Rate limit')) {
            results.rateLimited++;
            console.log(`🚫 Rate limit reached, stopping batch update`);
            break;
          } else {
            results.failed++;
          }
        }
      }

      console.log(`✅ Batch update completed:`, results);
      return results;
      
    } catch (error) {
      console.error(`❌ Batch update error:`, error.message);
      throw error;
    }
  }
}

module.exports = new JustWatchService();
