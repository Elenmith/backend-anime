const express = require("express");
const router = express.Router();
const Anime = require("../models/Anime"); // Model Anime

// Pobiera anime na podstawie kategorii
router.get("/:genre", async (req, res) => {
  try {
    const { genre } = req.params;
    console.log(`🔍 Otrzymano zapytanie dla kategorii: ${genre}`);

    // Pobierz anime pasujące do kategorii
    const matchedAnime = await Anime.find({
      genres: { $regex: new RegExp(genre, "i") },
    });

    console.log(`✅ Dopasowane anime dla '${genre}':`, matchedAnime.length);

    if (!matchedAnime.length) {
      console.log(`⚠️ Brak wyników dla '${genre}'`);
      return res.status(404).json({ message: `No anime found for genre: ${genre}` });
    }

    res.status(200).json(matchedAnime);
  } catch (error) {
    console.error("❌ Błąd pobierania anime dla kategorii:", error);
    res.status(500).json({ message: "Błąd serwera" });
  }
});

module.exports = router;
