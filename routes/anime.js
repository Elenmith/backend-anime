const express = require("express");
const router = express.Router();
const Anime = require("../models/Anime");
const FeaturedAnime = require("../models/FeaturedAnime");
const cacheService = require("../services/cacheService");
const { 
  validateAnimeSearch, 
  validateMoodFilter, 
  validateGenreFilter, 
  validateAnimeId 
} = require("../middleware/validation");

router.get("/", (req, res) => {
  res.json({ message: "✅ Anime API is working" });
});

// Search endpoint with validation and cache
router.get("/search", 
  validateAnimeSearch,
  cacheService.cacheMiddleware('anime-search', 1800), // 30 minutes cache
  async (req, res) => {
    const { title } = req.query;

    if (!title || title.trim() === "") {
      return res.status(400).json({ error: "Missing title parameter" });
    }

    try {
      console.log("🔥 Wyszukiwanie anime o tytule:", title);

      const results = await Anime.searchByTitle(title, 10);

      if (!results || results.length === 0) {
        return res.status(404).json({ error: "No anime found" });
      }

      res.json(results);
    } catch (err) {
      console.error("❌ Błąd w /search:", err);
      res.status(500).json({ error: err.message });
    }
  }
);

// Mood filtering with validation and cache
router.get("/moods/:mood", 
  validateMoodFilter,
  cacheService.cacheMiddleware('anime-moods', 3600), // 1 hour cache
  async (req, res) => {
    try {
      const mood = req.params.mood;
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 9;

      const totalCount = await Anime.countDocuments({ moods: mood.toLowerCase() });
      const animeList = await Anime.findByMood(mood, page, limit);

      res.json({
        anime: animeList,
        totalPages: Math.ceil(totalCount / limit),
        currentPage: page,
      });
    } catch (err) {
      console.error("❌ Błąd przy paginacji /moods:", err.message);
      res.status(500).json({ error: "Błąd podczas pobierania anime" });
    }
  }
);

// Genre filtering with validation and cache
router.get("/genre/:genre", 
  validateGenreFilter,
  cacheService.cacheMiddleware('anime-genre', 3600), // 1 hour cache
  async (req, res) => {
    try {
      const genre = req.params.genre;
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 16;

      const totalCount = await Anime.countDocuments({
        genres: { $regex: new RegExp(`^${genre}$`, "i") },
      });

      const animeList = await Anime.findByGenre(genre, page, limit);

      if (!animeList || animeList.length === 0) {
        return res
          .status(404)
          .json({ message: `No anime found for category: ${genre}` });
      }

      res.json({
        anime: animeList,
        totalPages: Math.ceil(totalCount / limit),
        currentPage: page,
      });
    } catch (err) {
      console.error("❌ Błąd przy paginacji /genre:", err.message);
      res.status(500).json({ error: "Błąd podczas pobierania anime" });
    }
  }
);

// Posters endpoint with cache
router.get("/posters", 
  cacheService.cacheMiddleware('anime-posters', 7200), // 2 hours cache
  async (req, res) => {
    try {
      const posters = await Anime.find({}, "_id title imageUrl");
      res.json(posters);
    } catch (err) {
      res.status(500).json({ error: "Błąd podczas pobierania plakatów" });
    }
  }
);

// Featured anime with cache
router.get("/featured", 
  cacheService.cacheMiddleware('anime-featured', 1800), // 30 minutes cache
  async (req, res) => {
    try {
      const featured = await FeaturedAnime.findOne({}).populate("anime");
      if (!featured) {
        return res.status(404).json({ error: "No featured anime found" });
      }
      res.json(featured.anime);
    } catch (err) {
      res.status(500).json({ error: "Error fetching featured anime" });
    }
  }
);

// Random categories with cache
router.get("/random-categories", 
  cacheService.cacheMiddleware('anime-random', 1800), // 30 minutes cache
  async (req, res) => {
    try {
      const categories = [
        "Action", "Adventure", "Comedy", "Drama", 
        "Fantasy", "Sci-Fi", "Romance", "Mystery"
      ];
      
      const randomAnime = [];
      
      // Pobierz po 6-8 anime z każdej kategorii
      for (const category of categories) {
        const animeInCategory = await Anime.find({
          genres: { $regex: new RegExp(`^${category}$`, "i") }
        }).limit(8);
        
        // Dodaj losowe anime z tej kategorii
        const shuffled = animeInCategory.sort(() => Math.random() - 0.5);
        randomAnime.push(...shuffled.slice(0, 6));
      }
      
      // Przetasuj całą listę i zwróć maksymalnie 50 anime
      const finalList = randomAnime
        .sort(() => Math.random() - 0.5)
        .slice(0, 50);
      
      res.json(finalList);
    } catch (err) {
      console.error("❌ Błąd w /random-categories:", err);
      res.status(500).json({ error: "Błąd podczas pobierania zróżnicowanych anime" });
    }
  }
);

// Anime by ID with validation and cache
router.get("/:id", 
  validateAnimeId,
  cacheService.cacheMiddleware('anime-details', 3600), // 1 hour cache
  async (req, res) => {
    try {
      const animeId = req.params.id;
      const anime = await Anime.findById(animeId);

      if (!anime) {
        return res.status(404).json({ error: "Anime not found" });
      }

      // Zwróć szczegółowe informacje
      res.json({
        title: anime.title,
        imageUrl: anime.imageUrl,
        rating: anime.rating,
        duration: anime.duration,
        releaseDate: anime.releaseDate,
        director: anime.director,
        characters: anime.characters,
        voiceCast: anime.voiceCast,
        streamingPlatforms: anime.streamingPlatforms,
        genres: anime.genres,
        moods: anime.moods,
        gallery: anime.gallery,
        description: anime.synopsis,
      });
    } catch (err) {
      console.error("❌ Błąd przy pobieraniu anime po ID:", err);
      res.status(500).json({ error: "Error fetching anime details" });
    }
  }
);

module.exports = router;
