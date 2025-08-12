const User = require('../models/User');
const Anime = require('../models/Anime');
const Recommendation = require('../models/Recommendation');

class RecommendationService {
  
  // Collaborative Filtering - Znajdowanie podobnych użytkowników
  async findSimilarUsers(userId, limit = 10) {
    const user = await User.findById(userId).populate('watchlist.animeId');
    if (!user || user.watchlist.length === 0) return [];

    // Pobierz wszystkich użytkowników z ocenami
    const allUsers = await User.find({
      _id: { $ne: userId },
      'watchlist.rating': { $exists: true, $ne: null }
    }).populate('watchlist.animeId');

    const userRatings = new Map();
    user.watchlist.forEach(item => {
      if (item.rating) {
        userRatings.set(item.animeId._id.toString(), item.rating);
      }
    });

    const similarities = [];

    for (const otherUser of allUsers) {
      const otherUserRatings = new Map();
      otherUser.watchlist.forEach(item => {
        if (item.rating) {
          otherUserRatings.set(item.animeId._id.toString(), item.rating);
        }
      });

      // Znajdź wspólne anime
      const commonAnime = [];
      for (const [animeId, rating] of userRatings) {
        if (otherUserRatings.has(animeId)) {
          commonAnime.push({
            animeId,
            userRating: rating,
            otherRating: otherUserRatings.get(animeId)
          });
        }
      }

      if (commonAnime.length >= 3) { // Minimum 3 wspólne anime
        const similarity = this.calculatePearsonCorrelation(commonAnime);
        if (similarity > 0.3) { // Tylko znaczące podobieństwa
          similarities.push({
            userId: otherUser._id,
            similarity,
            commonAnime: commonAnime.length
          });
        }
      }
    }

    return similarities
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit);
  }

  // Content-Based Filtering - Podobne anime
  async findSimilarAnime(animeId, limit = 10) {
    const anime = await Anime.findById(animeId);
    if (!anime) return [];

    const similarAnime = await Anime.aggregate([
      {
        $match: {
          _id: { $ne: anime._id },
          $or: [
            { genres: { $in: anime.genres } },
            { moods: { $in: anime.moods } }
          ]
        }
      },
      {
        $addFields: {
          genreSimilarity: {
            $size: {
              $setIntersection: ['$genres', anime.genres]
            }
          },
          moodSimilarity: {
            $size: {
              $setIntersection: ['$moods', anime.moods]
            }
          },
          ratingSimilarity: {
            $abs: { $subtract: ['$rating', anime.rating] }
          }
        }
      },
      {
        $addFields: {
          totalScore: {
            $add: [
              { $multiply: ['$genreSimilarity', 0.4] },
              { $multiply: ['$moodSimilarity', 0.3] },
              { $multiply: [{ $subtract: [10, '$ratingSimilarity'] }, 0.3] }
            ]
          }
        }
      },
      {
        $sort: { totalScore: -1 }
      },
      {
        $limit: limit
      }
    ]);

    return similarAnime;
  }

  // Generowanie rekomendacji dla użytkownika
  async generateRecommendations(userId, limit = 20) {
    const user = await User.findById(userId);
    if (!user) throw new Error('User not found');

    // Wyczyść stare rekomendacje
    await Recommendation.clearOldRecommendations(userId);

    const recommendations = [];

    // 1. Collaborative Filtering
    const similarUsers = await this.findSimilarUsers(userId, 5);
    if (similarUsers.length > 0) {
      const collaborativeRecs = await this.getCollaborativeRecommendations(userId, similarUsers, limit / 2);
      recommendations.push(...collaborativeRecs);
    }

    // 2. Content-Based Filtering
    const userLikedAnime = user.watchlist
      .filter(item => item.rating && item.rating >= 7)
      .slice(0, 5);

    if (userLikedAnime.length > 0) {
      const contentBasedRecs = await this.getContentBasedRecommendations(userId, userLikedAnime, limit / 2);
      recommendations.push(...contentBasedRecs);
    }

    // 3. Fallback - Popularne anime
    if (recommendations.length < limit) {
      const popularRecs = await this.getPopularRecommendations(userId, limit - recommendations.length);
      recommendations.push(...popularRecs);
    }

    // Zapisz rekomendacje
    await Recommendation.insertMany(recommendations);

    return recommendations;
  }

  // Collaborative recommendations
  async getCollaborativeRecommendations(userId, similarUsers, limit) {
    const userAnimeIds = new Set();
    const user = await User.findById(userId);
    user.watchlist.forEach(item => userAnimeIds.add(item.animeId.toString()));

    const recommendations = [];
    const animeScores = new Map();

    for (const similarUser of similarUsers) {
      const otherUser = await User.findById(similarUser.userId).populate('watchlist.animeId');
      
      for (const item of otherUser.watchlist) {
        if (item.rating && item.rating >= 7 && !userAnimeIds.has(item.animeId._id.toString())) {
          const animeId = item.animeId._id.toString();
          const currentScore = animeScores.get(animeId) || 0;
          const newScore = currentScore + (item.rating * similarUser.similarity);
          animeScores.set(animeId, newScore);
        }
      }
    }

    // Sortuj i wybierz najlepsze
    const sortedAnime = Array.from(animeScores.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit);

    for (const [animeId, score] of sortedAnime) {
      recommendations.push({
        userId,
        animeId,
        score: Math.min(score / 10, 1), // Normalizuj do 0-1
        algorithm: 'collaborative',
        reason: 'similar_users',
        metadata: {
          similarUsers: similarUsers.slice(0, 3),
          averageRating: score / similarUsers.length
        }
      });
    }

    return recommendations;
  }

  // Content-based recommendations
  async getContentBasedRecommendations(userId, likedAnime, limit) {
    const recommendations = [];
    const animeScores = new Map();

    for (const item of likedAnime) {
      const similarAnime = await this.findSimilarAnime(item.animeId, 10);
      
      for (const anime of similarAnime) {
        const animeId = anime._id.toString();
        const currentScore = animeScores.get(animeId) || 0;
        const newScore = currentScore + anime.totalScore;
        animeScores.set(animeId, newScore);
      }
    }

    // Sprawdź czy użytkownik już ma te anime w watchlist
    const user = await User.findById(userId);
    const userAnimeIds = new Set();
    user.watchlist.forEach(item => userAnimeIds.add(item.animeId.toString()));

    const sortedAnime = Array.from(animeScores.entries())
      .filter(([animeId]) => !userAnimeIds.has(animeId))
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit);

    for (const [animeId, score] of sortedAnime) {
      const anime = await Anime.findById(animeId);
      recommendations.push({
        userId,
        animeId,
        score: Math.min(score / 10, 1),
        algorithm: 'content-based',
        reason: 'similar_genres',
        metadata: {
          commonGenres: anime.genres,
          commonMoods: anime.moods,
          averageRating: anime.rating
        }
      });
    }

    return recommendations;
  }

  // Popular recommendations
  async getPopularRecommendations(userId, limit) {
    const user = await User.findById(userId);
    const userAnimeIds = new Set();
    user.watchlist.forEach(item => userAnimeIds.add(item.animeId.toString()));

    const popularAnime = await Anime.find({
      _id: { $nin: Array.from(userAnimeIds) },
      rating: { $gte: 8.0 }
    })
    .sort({ rating: -1 })
    .limit(limit);

    return popularAnime.map(anime => ({
      userId,
      animeId: anime._id,
      score: anime.rating / 10,
      algorithm: 'content-based',
      reason: 'high_rated',
      metadata: {
        averageRating: anime.rating
      }
    }));
  }

  // Pearson correlation coefficient
  calculatePearsonCorrelation(commonAnime) {
    if (commonAnime.length < 2) return 0;

    const n = commonAnime.length;
    const sumX = commonAnime.reduce((sum, item) => sum + item.userRating, 0);
    const sumY = commonAnime.reduce((sum, item) => sum + item.otherRating, 0);
    const sumXY = commonAnime.reduce((sum, item) => sum + (item.userRating * item.otherRating), 0);
    const sumX2 = commonAnime.reduce((sum, item) => sum + (item.userRating * item.userRating), 0);
    const sumY2 = commonAnime.reduce((sum, item) => sum + (item.otherRating * item.otherRating), 0);

    const numerator = (n * sumXY) - (sumX * sumY);
    const denominator = Math.sqrt(((n * sumX2) - (sumX * sumX)) * ((n * sumY2) - (sumY * sumY)));

    return denominator === 0 ? 0 : numerator / denominator;
  }

  // Pobierz rekomendacje dla użytkownika
  async getUserRecommendations(userId, limit = 20) {
    const recommendations = await Recommendation.getUserRecommendations(userId, limit);
    
    if (recommendations.length < limit) {
      // Wygeneruj nowe rekomendacje
      await this.generateRecommendations(userId, limit);
      return await Recommendation.getUserRecommendations(userId, limit);
    }

    return recommendations;
  }

  // Oznacz rekomendację jako obejrzaną
  async markRecommendationAsViewed(userId, animeId) {
    return await Recommendation.markAsViewed(userId, animeId);
  }
}

module.exports = new RecommendationService();
