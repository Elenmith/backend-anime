const express = require("express");
const router = express.Router();
const Anime = require("../models/Anime");
const FeaturedAnime = require("../models/FeaturedAnime");

// router.get("/search", async (req, res) => {
//   const { title } = req.query;

//   if (!title || title.trim() === "") {
//     return res.status(400).json({ error: "Missing title parameter" });
//   }

//   try {
//     console.log("🔥 Wyszukiwanie anime o tytule:", title);

//     const regex = new RegExp(title, "i");
//     const results = await Anime.find({ title: regex }).limit(10);

//     if (!results || results.length === 0) {
//       return res.status(404).json({ error: "No anime found" });
//     }

//     res.json(results);
//   } catch (err) {
//     console.error("❌ Błąd w /search:", err);
//     res.status(500).json({ error: err.message });
//   }
// });

// Pobierz anime dla danego nastroju
router.get("/moods/:mood", async (req, res) => {
  try {
    const mood = req.params.mood.toLowerCase();
    const animeList = await Anime.find({ moods: mood }).sort({ rating: -1 });
    res.json(animeList);
  } catch (err) {
    res.status(500).json({ error: "Error fetching featured anime" });
  }
});

// Pobierz wszystkie plakaty anime
router.get("/posters", async (req, res) => {
  try {
    const posters = await Anime.find({}, "_id title imageUrl"); // Pobieramy tylko potrzebne pola
    res.json(posters);
  } catch (err) {
    res.status(500).json({ error: "Error fetching anime posters });
  }
});

// Pobierz "anime dnia"
router.get("/featured", async (req, res) => {
  try {
    const featured = await FeaturedAnime.findOne({}).populate("anime"); // Pobierz szczegóły anime
    if (!featured) {
      return res.status(404).json({ error: "No featured anime found" });
    }
    res.json(featured.anime);
  } catch (err) {
    res.status(500).json({ error: "Error fetching featured anime" });
  }
});

// Pobiera anime na podstawie kategorii
// router.get("/genre/:genre", async (req, res) => {
//   try {
//     const genre = req.params.genre.toLowerCase();
//     const animeList = await Anime.find({ genres: genre });
//   } catch (err) {
//     res.status(500).json({ error: "Error fetching featured anime" });
//   }
// });

router.get("/:id", async (req, res) => {
  try {
    const animeId = req.params.id;
    const anime = await Anime.findById(animeId); // Znajdź anime w bazie danych

    if (!anime) {
      return res.status(404).json({ error: "Anime not found" });
    }

    // Zwróć szczegółowe informacje
    res.json({
      title: anime.title,
      imageUrl: anime.imageUrl,
      rating: anime.rating,
      duration: anime.duration, // Czas trwania
      releaseDate: anime.releaseDate, // Data powstania
      director: anime.director, // Reżyser
      characters: anime.characters, // Główne postacie
      voiceCast: anime.voiceCast, // Voice cast
      streamingPlatforms: anime.streamingPlatforms, // Gdzie obejrzeć
      genres: anime.genres, // Gatunki
      moods: anime.moods, // Nastroje
      gallery: anime.gallery, // Galeria zdjęć
      description: anime.synopsis,
    });
  } catch (err) {
    res.status(500).json({ error: "Error fetching anime details" });
  }
});

module.exports = router;
