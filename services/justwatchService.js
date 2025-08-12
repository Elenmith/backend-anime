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

  // Wyszukaj anime na JustWatch
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
      
      console.log(`🔍 Searching JustWatch for: ${title}`);
      
      const response = await axios.get(`${this.baseUrl}/titles/locale/en_US/popular`, {
        params: {
          body: JSON.stringify({
            query: title,
            content_types: ['movie', 'show'],
            monetization_types: ['flatrate', 'free'],
            page: 1,
            page_size: 5
          })
        }),
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Mood4Anime/1.0 (Educational Project)'
        },
        timeout: 10000
      });

      const results = response.data?.items || [];
      
      // Znajdź najlepsze dopasowanie
      const bestMatch = this.findBestMatch(title, results);
      
      if (bestMatch) {
        const streamingData = await this.getStreamingInfo(bestMatch.id);
        const result = {
          title: bestMatch.title,
          justwatchId: bestMatch.id,
          streamingPlatforms: streamingData
        };
        
        this.setCache(cacheKey, result);
        return result;
      }
      
      return null;
      
    } catch (error) {
      console.error(`❌ JustWatch search error for ${title}:`, error.message);
      
      if (error.message.includes('Rate limit')) {
        throw error;
      }
      
      // W przypadku błędu, zwróć null zamiast rzucać wyjątek
      return null;
    }
  }

  // Znajdź najlepsze dopasowanie
  findBestMatch(searchTitle, results) {
    const searchLower = searchTitle.toLowerCase();
    
    // Najpierw szukaj dokładnego dopasowania
    const exactMatch = results.find(item => 
      item.title.toLowerCase() === searchLower
    );
    
    if (exactMatch) return exactMatch;
    
    // Potem szukaj częściowego dopasowania
    const partialMatch = results.find(item => 
      item.title.toLowerCase().includes(searchLower) ||
      searchLower.includes(item.title.toLowerCase())
    );
    
    return partialMatch || results[0];
  }

  // Pobierz informacje o streaming
  async getStreamingInfo(justwatchId) {
    try {
      this.checkRateLimit();
      
      const response = await axios.get(`${this.baseUrl}/titles/locale/en_US/popular`, {
        params: {
          body: JSON.stringify({
            content_id: justwatchId,
            content_types: ['movie', 'show']
          })
        }),
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Mood4Anime/1.0 (Educational Project)'
        },
        timeout: 10000
      });

      const offers = response.data?.offers || [];
      
      // Mapuj platformy
      const platformMap = {
        'nfx': { name: 'Netflix', url: 'https://www.netflix.com' },
        'crn': { name: 'Crunchyroll', url: 'https://www.crunchyroll.com' },
        'fum': { name: 'Funimation', url: 'https://www.funimation.com' },
        'hbm': { name: 'HBO Max', url: 'https://play.hbomax.com' },
        'dsn': { name: 'Disney+', url: 'https://www.disneyplus.com' },
        'prv': { name: 'Prime Video', url: 'https://www.amazon.com/Prime-Video' },
        'hst': { name: 'Hulu', url: 'https://www.hulu.com' }
      };

      const streamingPlatforms = [];
      
      offers.forEach(offer => {
        const platform = platformMap[offer.package_short_name];
        if (platform && !streamingPlatforms.find(p => p.name === platform.name)) {
          streamingPlatforms.push({
            name: platform.name,
            url: platform.url,
            monetization: offer.monetization_type
          });
        }
      });

      return streamingPlatforms;
      
    } catch (error) {
      console.error(`❌ JustWatch streaming info error:`, error.message);
      return [];
    }
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
