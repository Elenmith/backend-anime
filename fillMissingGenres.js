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

// const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// const fetchGenresFromJikan = async (malId) => {
//   try {
//     const response = await axios.get(`https://api.jikan.moe/v4/anime/${malId}`);
//     return response.data.data.genres.map((genre) => genre.name);
//   } catch (err) {
//     console.error(`❌ Błąd pobierania dla MAL ID ${malId}:`, err.message);
//     return [];
//   }
// };

// const fillMissingGenres = async () => {
//   const animeList = await Anime.find({
//     $or: [{ genres: { $exists: false } }, { genres: { $size: 0 } }],
//     mal_id: { $type: "number" },
//   });

//   console.log(
//     `🔍 Znaleziono ${animeList.length} anime bez genres, ale z MAL ID`
//   );

//   let updatedCount = 0;

//   for (const anime of animeList) {
//     const genres = await fetchGenresFromJikan(anime.mal_id);

//     if (genres.length) {
//       anime.genres = genres;
//       await anime.save();
//       updatedCount++;
//       console.log(`✅ Uzupełniono genres dla: ${anime.title}`);
//     } else {
//       console.log(`⚠️ Brak genres dla: ${anime.title}`);
//     }

//     await delay(1000); // Limit 30 req/min – spokojnie
//   }

//   console.log(`🎯 Uzupełniono genres dla ${updatedCount} anime.`);
//   mongoose.disconnect();
// };

// fillMissingGenres();
