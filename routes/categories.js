const express = require("express");
const router = express.Router();
const Anime = require("../models/Anime"); 

const categories = [
  "Action",
  "Adventure",
  "Comedy",
  "Drama",
  "Fantasy",
  "Sci-Fi",
  "Slice of Life",
  "Sports",
  "Mystery",
  "Romance",
  "Supernatural",
  "Horror",
];

/**
 * Wyszukuje anime w MongoDB na podstawie kategorii
 * @param {string} category - Nazwa kategorii z URL
 * @returns {Promise<Array>} - Tablica anime pasujących do kategorii
 */
async function filterAnimeByCategory(category) {
  try {
    const categoryFormatted =
      category.charAt(0).toUpperCase() + category.slice(1).toLowerCase();

    if (!categories.includes(categoryFormatted)) {
      console.log(`❌ Kategoria '${categoryFormatted}' nie istnieje`);
      return null;
    }

    console.log(`🔍 Szukam anime w kategorii: ${categoryFormatted}`);

    const animeList = await Anime.find({
      genres: { $in: [categoryFormatted] },
    });

    console.log(
      `✅ Znaleziono ${animeList.length} anime dla kategorii '${categoryFormatted}'`
    );
    return animeList;
  } catch (error) {
    console.error("❌ Błąd w filterAnimeByCategory:", error);
    return null;
  }
}

router.get("/", (req, res) => {
  res.json(categories);
});

module.exports = router;
