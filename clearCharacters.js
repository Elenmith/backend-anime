const mongoose = require("mongoose");
const Anime = require("./models/Anime");

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

const clearCharactersData = async () => {
  try {
    console.log("🧹 Czyszczę stare dane characters i voice cast...");
    
    // Znajdź anime z dziwnymi danymi characters (pojedyncze litery)
    const animeWithBadData = await Anime.find({
      $or: [
        { "characters.0": { $exists: true } }, // Ma characters z indeksami numerycznymi
        { "voiceCast.0": { $exists: true } }   // Ma voice cast z indeksami numerycznymi
      ]
    });

    console.log(`📊 Znaleziono ${animeWithBadData.length} anime z zepsutymi danymi`);

    // Wyczyść characters i voice cast dla tych anime
    const updateResult = await Anime.updateMany(
      {
        $or: [
          { "characters.0": { $exists: true } },
          { "voiceCast.0": { $exists: true } }
        ]
      },
      {
        $unset: {
          characters: 1,
          voiceCast: 1,
          streamingPlatforms: 1
        }
      }
    );

    console.log(`✅ Wyczyszczono dane dla ${updateResult.modifiedCount} anime`);
    
    // Sprawdź ile anime zostało bez characters
    const animeWithoutCharacters = await Anime.find({
      $or: [
        { characters: { $exists: false } },
        { characters: { $size: 0 } },
        { voiceCast: { $exists: false } },
        { voiceCast: { $size: 0 } }
      ]
    });

    console.log(`📊 Teraz ${animeWithoutCharacters.length} anime potrzebuje characters`);

  } catch (error) {
    console.error("❌ Błąd podczas czyszczenia:", error);
  } finally {
    mongoose.disconnect();
    console.log("🔌 Zamknięto połączenie z MongoDB.");
  }
};

// Uruchom skrypt
clearCharactersData(); 