const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const recommendationService = require('../services/recommendationService');
const User = require('../models/User');

// GET /api/recommendations - Pobierz rekomendacje dla zalogowanego użytkownika
router.get('/', auth, async (req, res) => {
  try {
    const { limit = 20, algorithm } = req.query;
    const userId = req.user.id;

    const recommendations = await recommendationService.getUserRecommendations(
      userId, 
      parseInt(limit),
      algorithm
    );

    // Formatuj odpowiedź
    const formattedRecommendations = recommendations.map(rec => ({
      id: rec._id,
      anime: {
        id: rec.animeId._id,
        title: rec.animeId.title,
        imageUrl: rec.animeId.imageUrl,
        rating: rec.animeId.rating,
        genres: rec.animeId.genres,
        moods: rec.animeId.moods,
        synopsis: rec.animeId.synopsis
      },
      score: rec.score,
      algorithm: rec.algorithm,
      reason: rec.reason,
      metadata: rec.metadata,
      createdAt: rec.createdAt
    }));

    res.json({
      success: true,
      data: formattedRecommendations,
      count: formattedRecommendations.length
    });

  } catch (error) {
    console.error('Error fetching recommendations:', error);
    res.status(500).json({
      success: false,
      message: 'Błąd podczas pobierania rekomendacji',
      error: error.message
    });
  }
});

// POST /api/recommendations/generate - Wygeneruj nowe rekomendacje
router.post('/generate', auth, async (req, res) => {
  try {
    const { limit = 20 } = req.body;
    const userId = req.user.id;

    // Sprawdź czy użytkownik ma wystarczająco danych
    const user = await User.findById(userId);
    if (!user || user.watchlist.length < 3) {
      return res.status(400).json({
        success: false,
        message: 'Potrzebujesz ocenić przynajmniej 3 anime, aby otrzymać rekomendacje'
      });
    }

    const recommendations = await recommendationService.generateRecommendations(
      userId, 
      parseInt(limit)
    );

    res.json({
      success: true,
      message: 'Rekomendacje zostały wygenerowane',
      count: recommendations.length
    });

  } catch (error) {
    console.error('Error generating recommendations:', error);
    res.status(500).json({
      success: false,
      message: 'Błąd podczas generowania rekomendacji',
      error: error.message
    });
  }
});

// POST /api/recommendations/:animeId/view - Oznacz rekomendację jako obejrzaną
router.post('/:animeId/view', auth, async (req, res) => {
  try {
    const { animeId } = req.params;
    const userId = req.user.id;

    await recommendationService.markRecommendationAsViewed(userId, animeId);

    res.json({
      success: true,
      message: 'Rekomendacja oznaczona jako obejrzana'
    });

  } catch (error) {
    console.error('Error marking recommendation as viewed:', error);
    res.status(500).json({
      success: false,
      message: 'Błąd podczas oznaczania rekomendacji',
      error: error.message
    });
  }
});

// GET /api/recommendations/similar/:animeId - Znajdź podobne anime
router.get('/similar/:animeId', async (req, res) => {
  try {
    const { animeId } = req.params;
    const { limit = 10 } = req.query;

    const similarAnime = await recommendationService.findSimilarAnime(
      animeId, 
      parseInt(limit)
    );

    res.json({
      success: true,
      data: similarAnime,
      count: similarAnime.length
    });

  } catch (error) {
    console.error('Error finding similar anime:', error);
    res.status(500).json({
      success: false,
      message: 'Błąd podczas wyszukiwania podobnych anime',
      error: error.message
    });
  }
});

// GET /api/recommendations/similar-users - Znajdź podobnych użytkowników
router.get('/similar-users', auth, async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    const userId = req.user.id;

    const similarUsers = await recommendationService.findSimilarUsers(
      userId, 
      parseInt(limit)
    );

    // Pobierz dane użytkowników
    const userData = await Promise.all(
      similarUsers.map(async (similar) => {
        const user = await User.findById(similar.userId).select('username avatar');
        return {
          ...similar,
          user: user
        };
      })
    );

    res.json({
      success: true,
      data: userData,
      count: userData.length
    });

  } catch (error) {
    console.error('Error finding similar users:', error);
    res.status(500).json({
      success: false,
      message: 'Błąd podczas wyszukiwania podobnych użytkowników',
      error: error.message
    });
  }
});

// GET /api/recommendations/stats - Statystyki rekomendacji
router.get('/stats', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const Recommendation = require('../models/Recommendation');

    const stats = await Recommendation.aggregate([
      { $match: { userId: require('mongoose').Types.ObjectId(userId) } },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          viewed: { $sum: { $cond: ['$isViewed', 1, 0] } },
          collaborative: { $sum: { $cond: [{ $eq: ['$algorithm', 'collaborative'] }, 1, 0] } },
          contentBased: { $sum: { $cond: [{ $eq: ['$algorithm', 'content-based'] }, 1, 0] } },
          averageScore: { $avg: '$score' }
        }
      }
    ]);

    const userStats = stats[0] || {
      total: 0,
      viewed: 0,
      collaborative: 0,
      contentBased: 0,
      averageScore: 0
    };

    res.json({
      success: true,
      data: {
        ...userStats,
        viewRate: userStats.total > 0 ? (userStats.viewed / userStats.total * 100).toFixed(1) : 0
      }
    });

  } catch (error) {
    console.error('Error fetching recommendation stats:', error);
    res.status(500).json({
      success: false,
      message: 'Błąd podczas pobierania statystyk rekomendacji',
      error: error.message
    });
  }
});

module.exports = router;
