const express = require("express");
const router = express.Router();
const Anime = require("../models/Anime"); // Model Anime zdefiniowany w MongoDB

// Endpoint do obsługi żądań dla kategorii
router.get("/:genre", async (req, res) => {
  try {
    const { genre } = req.params;
    console.log(`Received request for genre: ${genre}`);

    // Sprawdź, jakie dane są w bazie
    const animeList = await Anime.find();
    console.log("All anime in DB:", animeList);

    // Sprawdź, co dokładnie zwraca zapytanie
    const matchedAnime = await Anime.find({
      genres: { $regex: new RegExp(genre, "i") },
    });
    console.log("Matching anime:", matchedAnime);

    if (!matchedAnime.length) {
      return res
        .status(404)
        .json({ message: `No anime found for genre: ${genre}` });
    }

    res.status(200).json(matchedAnime);
  } catch (error) {
    console.error("Error fetching anime by genre:", error);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
