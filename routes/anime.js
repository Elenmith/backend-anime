const express = require("express");
const router = express.Router();
const Anime = require("../models/Anime");
const FeaturedAnime = require("../models/FeaturedAnime");

router.get("/", (req, res) => {
  res.json({ message: "✅ Anime API is working" });
});

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

// Pobierz anime dla danego nastroju
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

router.get("/genre/:genre", async (req, res) => {
  try {
    const genre = req.params.genre.toLowerCase();
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 16;
    const skip = (page - 1) * limit;

    const totalCount = await Anime.countDocuments({
      genres: { $regex: new RegExp(`^${genre}$`, "i") },
    });

    const animeList = await Anime.find({
      genres: { $regex: new RegExp(`^${genre}$`, "i") },
    })
      .sort({ rating: -1 })
      .skip(skip)
      .limit(limit);

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

// Nowy endpoint dla zróżnicowanej karuzeli
router.get("/random-categories", async (req, res) => {
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
});

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
    console.error("❌ Błąd przy pobieraniu anime po ID:", err);
    res.status(500).json({ error: "Error fetching anime details" });
  }
});

module.exports = router;
