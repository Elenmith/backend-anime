const mongoose = require("mongoose");
const axios = require("axios");
const Anime = require("./models/Anime");
require("dotenv").config();

mongoose
  .connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("✅ Połączono z MongoDB"))
  .catch((err) => {
    console.error("❌ Błąd połączenia:", err);
    process.exit(1);
  });

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const fetchMalId = async (title) => {
  const url = `https://api.jikan.moe/v4/anime?q=${encodeURIComponent(
    title
  )}&limit=1`;

  try {
    const response = await axios.get(url);
    if (response.data.data && response.data.data.length > 0) {
      return response.data.data[0].mal_id;
    } else {
      console.warn(`⚠️ Nie znaleziono MAL ID dla: ${title}`);
      return null;
    }
  } catch (error) {
    console.error(
      `❌ Błąd przy pobieraniu MAL ID dla "${title}":`,
      error.message
    );
    return null;
  }
};

const updateMissingMalIds = async () => {
  const animeList = await Anime.find({
    $or: [{ mal_id: { $exists: false } }, { mal_id: null }],
  });

  console.log(`🔍 Znaleziono ${animeList.length} anime bez MAL ID`);

  let updatedCount = 0;

  for (const anime of animeList) {
    const malId = await fetchMalId(anime.title);

    if (malId) {
      anime.mal_id = malId;
      await anime.save();
      updatedCount++;
      console.log(`✅ Zaktualizowano MAL ID dla: ${anime.title} → ${malId}`);
    }

    await delay(1000); // Rate limit
  }

  console.log(`🎯 Uzupełniono MAL ID dla ${updatedCount} anime`);
  mongoose.disconnect();
};

updateMissingMalIds();
