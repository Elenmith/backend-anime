const redis = require('redis');
require('dotenv').config();

class CacheService {
  constructor() {
    this.client = null;
    this.isConnected = false;
    this.init();
  }

  async init() {
    try {
      // Użyj Redis URL z Heroku lub localhost dla development
      const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
      
      this.client = redis.createClient({
        url: redisUrl,
        retry_strategy: (options) => {
          if (options.error && options.error.code === 'ECONNREFUSED') {
            console.log('❌ Redis server refused connection');
            return new Error('Redis server refused connection');
          }
          if (options.total_retry_time > 1000 * 60 * 60) {
            console.log('❌ Redis retry time exhausted');
            return new Error('Redis retry time exhausted');
          }
          if (options.attempt > 10) {
            console.log('❌ Redis max retry attempts reached');
            return undefined;
          }
          return Math.min(options.attempt * 100, 3000);
        }
      });

      this.client.on('connect', () => {
        console.log('✅ Connected to Redis');
        this.isConnected = true;
      });

      this.client.on('error', (err) => {
        console.log('❌ Redis Client Error:', err);
        this.isConnected = false;
      });

      this.client.on('end', () => {
        console.log('🔌 Redis connection ended');
        this.isConnected = false;
      });

      await this.client.connect();
    } catch (error) {
      console.log('⚠️ Redis not available, running without cache:', error.message);
      this.isConnected = false;
    }
  }

  async get(key) {
    if (!this.isConnected || !this.client) {
      return null;
    }

    try {
      const value = await this.client.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error('❌ Cache get error:', error);
      return null;
    }
  }

  async set(key, value, ttl = 3600) { // default 1 hour
    if (!this.isConnected || !this.client) {
      return false;
    }

    try {
      await this.client.setEx(key, ttl, JSON.stringify(value));
      return true;
    } catch (error) {
      console.error('❌ Cache set error:', error);
      return false;
    }
  }

  async del(key) {
    if (!this.isConnected || !this.client) {
      return false;
    }

    try {
      await this.client.del(key);
      return true;
    } catch (error) {
      console.error('❌ Cache del error:', error);
      return false;
    }
  }

  async flush() {
    if (!this.isConnected || !this.client) {
      return false;
    }

    try {
      await this.client.flushAll();
      return true;
    } catch (error) {
      console.error('❌ Cache flush error:', error);
      return false;
    }
  }

  // Helper method to generate cache keys
  generateKey(prefix, params) {
    const sortedParams = Object.keys(params)
      .sort()
      .map(key => `${key}:${params[key]}`)
      .join('|');
    return `${prefix}:${sortedParams}`;
  }

  // Cache middleware for Express routes
  cacheMiddleware(prefix, ttl = 3600) {
    return async (req, res, next) => {
      if (!this.isConnected) {
        return next();
      }

      const cacheKey = this.generateKey(prefix, {
        ...req.params,
        ...req.query,
        path: req.path
      });

      try {
        const cachedData = await this.get(cacheKey);
        if (cachedData) {
          console.log(`📦 Cache hit: ${cacheKey}`);
          return res.json(cachedData);
        }

        // Store original send method
        const originalSend = res.json;
        
        // Override send method to cache response
        res.json = function(data) {
          this.set(cacheKey, data, ttl);
          return originalSend.call(this, data);
        }.bind(this);

        console.log(`💾 Cache miss: ${cacheKey}`);
        next();
      } catch (error) {
        console.error('❌ Cache middleware error:', error);
        next();
      }
    };
  }
}

// Export singleton instance
module.exports = new CacheService(); 