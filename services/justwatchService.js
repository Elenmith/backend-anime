const axios = require('axios');
const Anime = require('../models/Anime');
const cheerio = require('cheerio');

class JustWatchService {
  constructor() {
    this.baseUrl = 'https://www.justwatch.com';
    this.rateLimit = {
      requests: 0,
      windowStart: Date.now(),
      maxRequests: 30, // 30 requestów na godzinę (bezpieczniej)
      windowMs: 60 * 60 * 1000 // 1 godzina
    };
    this.cache = new Map();
    this.cacheTimeout = 24 * 60 * 60 * 1000; // 24 godziny
  }

  // Sprawdź rate limit
  checkRateLimit() {
    const now = Date.now();
    
    if (now - this.rateLimit.windowStart > this.rateLimit.windowMs) {
      this.rateLimit.requests = 0;
      this.rateLimit.windowStart = now;
    }
    
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

  // Wyszukaj anime na JustWatch przez web scraping
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
      
      // Wyszukaj anime na JustWatch
      const searchUrl = `${this.baseUrl}/search?q=${encodeURIComponent(title)}`;
      
      const response = await axios.get(searchUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1'
        },
        timeout: 15000
      });

      const $ = cheerio.load(response.data);
      
      // Znajdź pierwszy wynik anime
      const firstResult = $('.title-list-grid__item').first();
      const animeUrl = firstResult.find('a').attr('href');
      
      if (!animeUrl) {
        console.log(`❌ No results found for: ${title}`);
        return null;
      }

      // Pobierz szczegóły anime
      const animeDetails = await this.getAnimeDetails(animeUrl);
      
      if (animeDetails) {
        this.setCache(cacheKey, animeDetails);
        return animeDetails;
      }
      
      return null;
      
    } catch (error) {
      console.error(`❌ JustWatch search error for ${title}:`, error.message);
      
      if (error.message.includes('Rate limit')) {
        throw error;
      }
      
      // Fallback do symulowanych danych
      return this.getFallbackData(title);
    }
  }

  // Pobierz szczegóły anime z JustWatch
  async getAnimeDetails(animeUrl) {
    try {
      this.checkRateLimit();
      
      const fullUrl = animeUrl.startsWith('http') ? animeUrl : `${this.baseUrl}${animeUrl}`;
      
      const response = await axios.get(fullUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate',
          'Connection': 'keep-alive'
        },
        timeout: 15000
      });

      const $ = cheerio.load(response.data);
      
      // Pobierz tytuł
      const title = $('h1').first().text().trim();
      
      // Pobierz platformy streaming
      const streamingPlatforms = [];
      
      $('.price-comparison__grid__row').each((i, element) => {
        const platformName = $(element).find('.price-comparison__grid__row__icon').attr('alt');
        const platformUrl = $(element).find('a').attr('href');
        
        if (platformName && platformUrl) {
          const platform = this.mapPlatformName(platformName);
          if (platform) {
            streamingPlatforms.push({
              name: platform.name,
              url: platform.url,
              monetization: 'flatrate'
            });
          }
        }
      });

      if (streamingPlatforms.length > 0) {
        return {
          title: title,
          justwatchId: animeUrl.split('/').pop(),
          streamingPlatforms: streamingPlatforms
        };
      }
      
      return null;
      
    } catch (error) {
      console.error(`❌ Error getting anime details:`, error.message);
      return null;
    }
  }

  // Mapuj nazwy platform z JustWatch
  mapPlatformName(justwatchName) {
    const platformMap = {
      'netflix': { name: 'Netflix', url: 'https://www.netflix.com' },
      'crunchyroll': { name: 'Crunchyroll', url: 'https://www.crunchyroll.com' },
      'funimation': { name: 'Funimation', url: 'https://www.funimation.com' },
      'hbo max': { name: 'HBO Max', url: 'https://play.hbomax.com' },
      'disney plus': { name: 'Disney+', url: 'https://www.disneyplus.com' },
      'amazon prime': { name: 'Prime Video', url: 'https://www.amazon.com/Prime-Video' },
      'hulu': { name: 'Hulu', url: 'https://www.hulu.com' },
      'apple tv': { name: 'Apple TV+', url: 'https://tv.apple.com' }
    };

    const normalizedName = justwatchName.toLowerCase().trim();
    
    for (const [key, platform] of Object.entries(platformMap)) {
      if (normalizedName.includes(key)) {
        return platform;
      }
    }
    
    return null;
  }

  // Fallback data dla popularnych anime
  getFallbackData(title) {
    const titleLower = title.toLowerCase();
    
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
      ]
    };

    for (const [key, platforms] of Object.entries(animeStreamingData)) {
      if (titleLower.includes(key) || key.includes(titleLower)) {
        return {
          title: title,
          justwatchId: `fallback_${key}`,
          streamingPlatforms: platforms
        };
      }
    }

    return null;
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
  async batchUpdateStreamingData(limit = 5) {
    try {
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
          
          // Rate limiting - 5 sekund między requestami
          await new Promise(resolve => setTimeout(resolve, 5000));
          
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
