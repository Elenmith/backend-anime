const express = require("express");
const router = express.Router();

// Lista kategorii (statyczna)
const categories = [
  "action",
  "adventure",
  "comedy",
  "drama",
  "fantasy",
  "sci-Fi",
  "slice of Life",
  "sports",
  "mystery",
  "romance",
  "thriller",
  "supernatural",
  "horror",
  "historical",
  "music",
  "military",
  "parody",
  "psychological",
  "martial Arts",
  "mecha",
  "shounen",
  "seinen",
  "josei",
  "shoujo",
  "kids",
];


/**
 * Funkcja sprawdzająca, czy kategoria istnieje i filtrująca anime.
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

    // Pobiera anime, które mają daną kategorię w tablicy `genres`
    const animeList = await Anime.find({
      genres: { $in: [categoryFormatted] } // Szuka wartości w tablicy genres
    });

    console.log(`✅ Znaleziono ${animeList.length} anime dla kategorii '${categoryFormatted}'`);
    return animeList;
  } catch (error) {
    console.error("❌ Błąd w filterAnimeByCategory:", error);
    return null;
  }
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
