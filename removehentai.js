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

    const result = await Anime.deleteMany({
      genres: { $in: ["Ecchi"] },
    });

    console.log(`🧹 Usunięto ${result.deletedCount} anime z gatunkiem 'Ecchi'`);

    mongoose.disconnect();
  })
  .catch((err) => {
    console.error("❌ Błąd połączenia:", err);
    process.exit(1);
  });
