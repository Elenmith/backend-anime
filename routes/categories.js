const express = require("express");
const router = express.Router();
const Anime = require("../models/Anime"); 

// Lista kategorii (statyczna)
const categories = [
  "Action", "Adventure", "Comedy", "Drama", "Fantasy", "Sci-Fi",
  "Slice of Life", "Sports", "Mystery", "Romance", "Thriller",
  "Supernatural", "Horror", "Historical", "Music", "Military",
  "Parody", "Psychological", "Martial Arts", "Mecha", "Shounen",
  "Seinen", "Josei", "Shoujo", "Kids"
];

/**
 * Wyszukuje anime w MongoDB na podstawie kategorii
 * @param {string} category - Nazwa kategorii z URL
 * @returns {Promise<Array>} - Tablica anime pasujących do kategorii
 */
async function filterAnimeByCategory(category) {
  try {
    const categoryFormatted = category.charAt(0).toUpperCase() + category.slice(1).toLowerCase();

    if (!categories.includes(categoryFormatted)) {
      console.log(`❌ Kategoria '${categoryFormatted}' nie istnieje`);
      return null;
    }

    console.log(`🔍 Szukam anime w kategorii: ${categoryFormatted}`);

    // Pobierz anime, które mają daną kategorię w tablicy `genres`
    const animeList = await Anime.find({ genres: { $in: [categoryFormatted] } });

    console.log(`✅ Znaleziono ${animeList.length} anime dla kategorii '${categoryFormatted}'`);
    return animeList;
  } catch (error) {
    console.error("❌ Błąd w filterAnimeByCategory:", error);
    return null;
  }
}

// Endpoint: Pobierz anime dla kategorii
router.get("/:genre", async (req, res) => {
  try {
    const genre = req.params.genre.toLowerCase();

    // Wyszukaj anime dla danej kategorii
    const animeList = await filterAnimeByCategory(genre);

    if (!animeList || animeList.length === 0) {
      return res.status(404).json({ message: `No anime found for category: ${genre}` });
    }

    res.status(200).json(animeList);
  } catch (err) {
    console.error("❌ Błąd w /api/categories/:genre:", err);
    res.status(500).json({ error: "Błąd serwera", details: err.toString() });
  }
});



// Endpoint: Pobierz listę kategorii
router.get("/", (req, res) => {
  res.json(categories);
});

module.exports = router;
