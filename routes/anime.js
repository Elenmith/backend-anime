const express = require("express");
const router = express.Router();
const Anime = require("../models/Anime");
const FeaturedAnime = require("../models/FeaturedAnime");

// Prosty testowy endpoint
router.get("/", (req, res) => {
  res.json({ message: "✅ Anime API is working" });
});

// Wyszukiwanie anime po tytule
router.get("/search", async (req, res) => {
  const { title } = req.query;

  if (!title || title.trim() === "") {
    return res.status(400).json({ error: "Missing title parameter" });
  }

  try {
    console.log("🔥 Wyszukiwanie anime o tytule:", title);

    const regex = new RegExp(title, "i");
    const results = await Anime.find({ title: regex }).limit(10);

    if (!results || results.length === 0) {
      return res.status(404).json({ error: "No anime found" });
    }

    res.json(results);
  } catch (err) {
    console.error("❌ Błąd w /search:", err);
    res.status(500).json({ error: err.message });
  }
});

// Pobierz plakaty
router.get("/posters", async (req, res) => {
  try {
    const posters = await Anime.find({}, "_id title imageUrl");
    res.json(posters);
  } catch (err) {
    res.status(500).json({ error: "Error fetching anime posters" });
  }
});

// Pobierz anime dnia
router.get("/featured", async (req, res) => {
  try {
    const featured = await FeaturedAnime.findOne({}).populate("anime");
    if (!featured) {
      return res.status(404).json({ error: "No featured anime found" });
    }
    res.json(featured.anime);
  } catch (err) {
    res.status(500).json({ error: "Error fetching featured anime" });
  }
});

// Anime wg kategorii
router.get("/genre/:genre", async (req, res) => {
  try {
    const genre = req.params.genre.toLowerCase();
    const animeList = await Anime.find({ genres: genre });
    res.json(animeList);
  } catch (err) {
    res.status(500).json({ error: "Błąd podczas pobierania anime" });
  }
});

// Anime wg nastroju
router.get("/moods/:mood", async (req, res) => {
  try {
    const mood = req.params.mood.toLowerCase();
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 9;
    const skip = (page - 1) * limit;

    const totalCount = await Anime.countDocuments({ moods: mood });
    const animeList = await Anime.find({ moods: mood })
      .sort({ rating: -1 })
      .skip(skip)
      .limit(limit);

    res.json({
      anime: animeList,
      totalPages: Math.ceil(totalCount / limit),
      currentPage: page,
    });
  } catch (err) {
    console.error("❌ Błąd przy paginacji /moods:", err.message);
    res.status(500).json({ error: "Błąd podczas pobierania anime" });
  }
});

// Szczegóły anime po ID
router.get("/:id", async (req, res) => {
  try {
    const animeId = req.params.id;
    const anime = await Anime.findById(animeId);

    if (!anime) {
      return res.status(404).json({ error: "Anime not found" });
    }

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
});

module.exports = router;
