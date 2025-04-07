const axios = require("axios");
const mongoose = require("mongoose");
const Anime = require("./models/Anime");
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

require("dotenv").config();
mongoose.set("strictQuery", false);

mongoose
  .connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
  })
  .then(() => console.log("✅ Połączono z MongoDB"))
  .catch((err) => {
    console.error("❌ Błąd połączenia:", err);
    process.exit(1);
  });

const fetchAnimeData = async (limit = 1000, startPage = 1105) => {
  try {
    let page = startPage;
    let totalFetched = 0;

    console.log(`🚀 Rozpoczynam pobieranie od strony ${page}...`);

    while (totalFetched < limit) {
      console.log(`📄 Pobieranie strony ${page}...`);
      const response = await axios.get(
        `https://api.jikan.moe/v4/anime?page=${page}`
      );
      const animeList = response.data.data;

      if (!animeList || animeList.length === 0) {
        console.log("❌ Brak więcej danych do pobrania.");
        break;
      }

      for (const anime of animeList) {
        const exists = await Anime.findOne({ title: anime.title });
        if (exists) {
          console.log(`⏩ Pomijam (istnieje): ${anime.title}`);
          continue;
        }

        const newAnime = new Anime({
          title: anime.title,
          genres: anime.genres.map((g) => g.name),
          rating: anime.score || 0,
          imageUrl: anime.images.jpg.large_image_url,
          duration: anime.duration || "Unknown",
          releaseDate: anime.aired?.string || "Unknown",
          synopsis: anime.synopsis || "No synopsis available",
          moods: [],
          page: page,
        });

        await newAnime.save();
        totalFetched++;
        console.log(`✅ Dodano anime: ${anime.title}`);

        if (totalFetched >= limit) break;
      }

      page++;
      console.log("⏳ Czekam 2 sekundy przed kolejnym żądaniem...");
      await delay(2000);
    }

    console.log(`🎉 Pobrano ${totalFetched} anime!`);
  } catch (error) {
    console.error("❌ Błąd podczas pobierania danych:", error);
  } finally {
    mongoose.disconnect();
    console.log("🔌 Zamknięto połączenie z MongoDB.");
  }
};

// Dwa parametry - pierwszy to liczba pozycji do pobrania, drugi to strona rozpoczęcia pobierania
fetchAnimeData();
