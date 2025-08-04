const cron = require('node-cron');
const mongoose = require("mongoose");
const Anime = require("./models/Anime");
const FeaturedAnime = require("./models/FeaturedAnime");
require("dotenv").config();

// Funkcja do ustawiania nowego "anime dnia"
const setFeaturedAnime = async () => {
  try {
    console.log("🔄 Starting daily featured anime update...");
    
    // Użyj nowej static method
    const highRatedAnime = await Anime.findHighRated(8.5);
    
    if (!highRatedAnime || highRatedAnime.length === 0) {
      console.log("❌ No high-rated anime found");
      return;
    }

    const randomIndex = Math.floor(Math.random() * highRatedAnime.length);
    const randomAnime = highRatedAnime[randomIndex];

    if (!randomAnime) {
      console.log("❌ Failed to find random anime");
      return;
    }

    // Usuń poprzednie "anime dnia"
    await FeaturedAnime.deleteMany({});
    
    // Ustaw nowe "anime dnia"
    const featuredAnime = new FeaturedAnime({
      anime: randomAnime._id,
      date: new Date(),
    });

    await featuredAnime.save();
    console.log("✅ Featured anime updated:", randomAnime.title);
  } catch (err) {
    console.error("❌ Error setting featured anime:", err);
  }
};

// Funkcja do sprawdzenia czy istnieje featured anime
const checkAndSetFeaturedAnime = async () => {
  try {
    console.log("🚀 Checking if featured anime exists...");
    const existingFeatured = await FeaturedAnime.findOne({});
    if (!existingFeatured) {
      console.log("📝 No featured anime found, setting one...");
      await setFeaturedAnime();
    } else {
      console.log("✅ Featured anime already exists:", existingFeatured.date);
    }
  } catch (err) {
    console.error("❌ Error checking featured anime:", err);
  }
};

// Funkcja do inicjalizacji schedulera
const initScheduler = () => {
  // Sprawdź i ustaw featured anime przy starcie serwera
  checkAndSetFeaturedAnime();

  // Uruchom codziennie o 00:00 (północ) - polski czas
  cron.schedule('0 0 * * *', async () => {
    console.log("⏰ Daily cron job triggered - updating featured anime");
    await setFeaturedAnime();
  }, {
    timezone: "Europe/Warsaw"
  });

  console.log("📅 Scheduler initialized - featured anime will update daily at 00:00 (Warsaw time)");
};

module.exports = { initScheduler, setFeaturedAnime, checkAndSetFeaturedAnime }; 