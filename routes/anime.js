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
const axios = require("axios"); // Added axios for MAL API

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

// Proxy for images to avoid CORS issues
router.get("/image-proxy", async (req, res) => {
  try {
    const imageUrl = req.query.url;
    
    if (!imageUrl) {
      return res.status(400).json({ error: "Image URL is required" });
    }

    // Fetch image from external source
    const response = await fetch(imageUrl);
    
    if (!response.ok) {
      return res.status(404).json({ error: "Image not found" });
    }

    // Get image buffer
    const buffer = await response.arrayBuffer();
    
    // Set appropriate headers
    res.setHeader('Content-Type', response.headers.get('content-type') || 'image/jpeg');
    res.setHeader('Cache-Control', 'public, max-age=86400'); // Cache for 24 hours
    res.setHeader('Access-Control-Allow-Origin', '*');
    
    // Send image
    res.send(Buffer.from(buffer));
  } catch (err) {
    console.error("❌ Image proxy error:", err);
    res.status(500).json({ error: "Failed to fetch image" });
  }
});

// Random categories with cache
router.get("/random-categories", 
  // cacheService.cacheMiddleware('anime-random', 1800), // 30 minutes cache - TYMCZASOWO WYŁĄCZONE
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
      
      console.log(`✅ /random-categories: Zwrócono ${finalList.length} anime`);
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

// Endpoint to fetch characters and voice cast for anime
router.post("/fetch-characters", async (req, res) => {
  try {
    const { limit = 20 } = req.body;
    
    console.log(`🚀 Uruchamiam pobieranie characters dla ${limit} anime...`);
    
    // Import the fetch function
    const { fetchCharactersAndVoiceCast } = require('../fetchCharacters');
    
    // Run the fetch function
    await fetchCharactersAndVoiceCast(limit);
    
    res.json({ 
      success: true, 
      message: `Pobieranie characters zakończone dla ${limit} anime` 
    });
    
  } catch (error) {
    console.error("❌ Błąd podczas pobierania characters:", error);
    res.status(500).json({ 
      error: "Błąd podczas pobierania characters",
      details: error.message 
    });
  }
});

// Endpoint to clear old characters data
router.post("/clear-characters", async (req, res) => {
  try {
    console.log("🧹 Uruchamiam czyszczenie starych danych characters...");
    
    // Znajdź anime z dziwnymi danymi characters (pojedyncze litery)
    const animeWithBadData = await Anime.find({
      $or: [
        { "characters.0": { $exists: true } }, // Ma characters z indeksami numerycznymi
        { "voiceCast.0": { $exists: true } }   // Ma voice cast z indeksami numerycznymi
      ]
    });

    console.log(`📊 Znaleziono ${animeWithBadData.length} anime z zepsutymi danymi`);

    // Wyczyść characters i voice cast dla tych anime
    const updateResult = await Anime.updateMany(
      {
        $or: [
          { "characters.0": { $exists: true } },
          { "voiceCast.0": { $exists: true } }
        ]
      },
      {
        $unset: {
          characters: 1,
          voiceCast: 1,
          streamingPlatforms: 1
        }
      }
    );

    console.log(`✅ Wyczyszczono dane dla ${updateResult.modifiedCount} anime`);
    
    res.json({ 
      success: true, 
      message: `Wyczyszczono dane dla ${updateResult.modifiedCount} anime`,
      found: animeWithBadData.length,
      cleared: updateResult.modifiedCount
    });
    
  } catch (error) {
    console.error("❌ Błąd podczas czyszczenia:", error);
    res.status(500).json({ 
      error: "Błąd podczas czyszczenia danych",
      details: error.message 
    });
  }
});

// Test endpoint for MAL ID and characters
router.get("/test-mal/:title", async (req, res) => {
  try {
    const title = req.params.title;
    console.log(`🧪 Testuję MAL ID dla: "${title}"`);
    
    // Znajdź MAL ID
    const searchResponse = await axios.get(
      `https://api.jikan.moe/v4/anime?q=${encodeURIComponent(title)}&limit=1`
    );
    
    if (!searchResponse.data.data || searchResponse.data.data.length === 0) {
      return res.json({ error: "Nie znaleziono anime" });
    }
    
    const malId = searchResponse.data.data[0].mal_id;
    console.log(`✅ MAL ID: ${malId}`);
    
    // Pobierz characters
    const charactersResponse = await axios.get(
      `https://api.jikan.moe/v4/anime/${malId}/characters`
    );
    
    const characters = charactersResponse.data.data || [];
    console.log(`👥 Znaleziono ${characters.length} characters`);
    
    // Przygotuj dane characters
    const charactersData = characters
      .filter(char => char.character && char.character.name && 
                     (char.role === "Main" || char.role === "Supporting"))
      .slice(0, 5)
      .map(char => ({
        name: char.character.name,
        role: char.role,
        image: char.character.images?.jpg?.image_url || null
      }));
    
    res.json({
      title: title,
      malId: malId,
      totalCharacters: characters.length,
      characters: charactersData,
      rawCharacters: characters.slice(0, 3) // Pierwsze 3 surowe dane
    });
    
  } catch (error) {
    console.error("❌ Błąd testu:", error.message);
    res.status(500).json({ 
      error: "Błąd podczas testowania",
      details: error.message 
    });
  }
});

module.exports = router;
