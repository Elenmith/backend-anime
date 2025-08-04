const express = require("express");
const router = express.Router();
const FeaturedAnime = require("../models/FeaturedAnime");
const Anime = require("../models/Anime");
const { setFeaturedAnime } = require("../scheduler");

// Pobierz "anime dnia"
router.get("/", async (req, res) => {
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

// Ręczne uruchomienie skryptu zmiany anime dnia (tylko dla admina)
router.post("/update", async (req, res) => {
  try {
    // Sprawdź czy to jest request z Heroku (dodaj lepsze zabezpieczenia w przyszłości)
    const userAgent = req.get('User-Agent');
    if (!userAgent || !userAgent.includes('Heroku')) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    await setFeaturedAnime();
    res.json({ message: "Featured anime updated successfully" });
  } catch (err) {
    console.error("Error in manual update:", err);
    res.status(500).json({ error: "Error updating featured anime" });
  }
});

// Losowe anime z wysokim ratingiem (> 8.50)
router.get("/random/high-rated", async (req, res) => {
  try {
    const animeCount = await Anime.countDocuments({ rating: { $gt: 8.5 } });
    if (animeCount === 0) {
      return res.status(404).json({ error: "No high-rated anime found" });
    }

    const randomIndex = Math.floor(Math.random() * animeCount);
    const randomAnime = await Anime.findOne({ rating: { $gt: 8.5 } }).skip(
      randomIndex
    );
    res.json(randomAnime);
  } catch (err) {
    res.status(500).json({ error: "Error fetching random anime" });
  }
});

module.exports = router;
