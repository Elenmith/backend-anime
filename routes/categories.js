const express = require("express");
const router = express.Router();
const Anime = require("../models/Anime");

// Pobiera unikalne gatunki z bazy danych
router.get("/", async (req, res) => {
  try {
    const categories = await Anime.distinct("genres");
    if (!categories || categories.length === 0) {
      return res.status(404).json({ message: "No categories found" });
    }
    res.status(200).json(categories);
  } catch (error) {
    console.error("Błąd pobierania kategorii:", error);
    res.status(500).json({ message: "Błąd serwera" });
  }
});

module.exports = router;
