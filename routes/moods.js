const express = require("express");
const router = express.Router();

const moods = [
  "adventurous",
  "aggressive",
  "angry",
  "anxious",
  "calm",
  "cheerful",
  "dark",
  "depressed",
  "dramatic",
  "dreamy",
  "energic",
  "epic",
  "envious",
  "excited",
  "frustrated",
  "focused",
  "happy",
  "heartbroken",
  "inspirational",
  "irritated",
  "joyful",
  "lonely",
  "magical",
  "melancholic",
  "motivated",
  "motivational",
  "mythical",
  "optimistic",
  "peaceful",
  "playful",
  "reflective",
  "relaxed",
  "relaxing",
  "romantic",
  "sad",
  "serious",
  "spontaneous",
  "surreal",
  "suspenseful",
  "tense",
  "thoughtful",
  "uplifting",
  "whimisical",
];

router.get("/", (req, res) => {
  res.json(moods);
});

module.exports = router;
