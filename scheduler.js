const cron = require('node-cron');
const mongoose = require("mongoose");
const Anime = require("./models/Anime");
const FeaturedAnime = require("./models/FeaturedAnime");
require("dotenv").config();

// Funkcja do ustawiania nowego "anime dnia"
const setFeaturedAnime = async () => {
  try {
    console.log("🔄 Starting daily featured anime update...");
    
    const animeCount = await Anime.countDocuments({ rating: { $gt: 8.5 } });
    if (animeCount === 0) {
      console.log("❌ No high-rated anime found");
      return;
    }

    const randomIndex = Math.floor(Math.random() * animeCount);
    const randomAnime = await Anime.findOne({ rating: { $gt: 8.5 } }).skip(randomIndex);

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

// Funkcja do inicjalizacji schedulera
const initScheduler = () => {
  // Uruchom codziennie o 00:00 (północ)
  cron.schedule('0 0 * * *', async () => {
    console.log("⏰ Daily cron job triggered - updating featured anime");
    await setFeaturedAnime();
  }, {
    timezone: "Europe/Warsaw" // Ustawienie strefy czasowej dla Polski
  });

  // Uruchom też przy starcie serwera (opcjonalnie)
  cron.schedule('0 0 * * *', async () => {
    console.log("🚀 Server startup - checking featured anime");
    const existingFeatured = await FeaturedAnime.findOne({});
    if (!existingFeatured) {
      console.log("📝 No featured anime found, setting one...");
      await setFeaturedAnime();
    } else {
      console.log("✅ Featured anime already exists:", existingFeatured.date);
    }
  }, {
    timezone: "Europe/Warsaw"
  });

  console.log("📅 Scheduler initialized - featured anime will update daily at 00:00");
};

module.exports = { initScheduler, setFeaturedAnime }; 