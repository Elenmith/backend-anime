const mongoose = require("mongoose");
const Anime = require("./models/Anime");
require("dotenv").config();

mongoose
  .connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(async () => {
    console.log("✅ Połączono z MongoDB");

    const missingGenres = await Anime.find({
      $or: [{ genres: { $exists: false } }, { genres: { $size: 0 } }],
    });

    console.log(
      `📦 Liczba anime bez przypisanych genres: ${missingGenres.length}`
    );

    // Jeśli chcesz, możesz wyświetlić kilka tytułów:
    missingGenres.slice(0, 5822).forEach((anime, i) => {
      console.log(`${i + 1}. ${anime.title}`);
    });

    mongoose.disconnect();
  })
  .catch((err) => {
    console.error("❌ Błąd połączenia:", err);
    process.exit(1);
  });
