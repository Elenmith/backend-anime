const express = require("express");
const router = express.Router();
const Anime = require("../models/Anime");
const FeaturedAnime = require("../models/FeaturedAnime");

// Pobierz anime dla danego nastroju
router.get("/moods/:mood", async (req, res) => {
  try {
    const mood = req.params.mood.toLowerCase();
    const animeList = await Anime.find({ moods: mood });
    res.json(animeList);
  } catch (err) {
    res.status(500).json({ error: "Błąd podczas pobierania anime" });
  }
});

// Pobierz wszystkie plakaty anime
router.get("/posters", async (req, res) => {
  try {
    const posters = await Anime.find({}, "_id title imageUrl"); // Pobieramy tylko potrzebne pola
    res.json(posters);
  } catch (err) {
    res.status(500).json({ error: "Błąd podczas pobierania plakatów" });
  }
});

// Pobierz szczegóły anime na podstawie ID
// router.get("/:id", async (req, res) => {
//   try {
//     const anime = await Anime.findById(req.params.id); // Znajdź anime po ID
//     if (!anime) {
//       return res.status(404).json({ error: "Anime not found" });
//     }
//     res.json(anime);
//   } catch (err) {
//     res.status(500).json({ error: "Błąd podczas pobierania szczegółów anime" });
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

router.get("/search", async (req, res) => {
  try {
    const animeId = req.params.id;
    const anime = await Anime.findById(animeId); // Pobieranie ID z zapytania
    if (!animeId) {
      return res
        .status(400)
        .json({ error: "Query parameter 'id' is required" });
    }

    console.log("Received search ID:", animeId);

    // Konwersja `id` na ObjectId
    // if (!mongoose.Types.ObjectId.isValid(animeId)) {
    //   return res.status(400).json({ error: "Invalid ID format" });
    // }

    const result = await Anime.findById(animeId, {
      title: 1,
      _id: 1,
      imageUrl: 1,
    });
    if (!result) {
      return res.status(404).json({ error: "Anime not found" });
    }

    console.log("Search result:", result);
    res.json(result);
  } catch (error) {
    console.error("Error in /search endpoint:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
});
// Pobiera anime na podstawie kategorii
router.get("/:genre", async (req, res) => {
  try {
    const genre = req.params.genre.toLowerCase();
    console.log(`🔍 Otrzymano zapytanie dla kategorii: ${genre}`);

    // Pobierz anime pasujące do kategorii
    const animeList = await Anime.find({
      genres: { $regex: new RegExp(`^${genre}$`, "i") } // Obsługuje wielkość liter
    });

    console.log(`✅ Znaleziono ${animeList.length} anime dla kategorii '${genre}'`);

    // Jeśli nie ma wyników, zwróć 404
    if (animeList.length === 0) {
      console.log(`⚠️ Brak wyników dla '${genre}'`);
      return res.status(404).json({ message: `No anime found for genre: ${genre}` });
    }

    // Zwróć znalezione anime
    res.status(200).json(animeList);
  } catch (err) {
    console.error("❌ Błąd podczas pobierania anime:", err);
    res.status(500).json({ error: "Błąd podczas pobierania anime", details: err.toString() });
  }
});

module.exports = router;
