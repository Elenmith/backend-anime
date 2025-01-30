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

// Endpoint: Pobierz listę kategorii
router.get("/", (req, res) => {
  res.json(categories);
});

module.exports = router;
