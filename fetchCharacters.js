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

// Funkcja do wyszukiwania MAL ID przez title
const findMalIdByTitle = async (title) => {
  try {
    const searchResponse = await axios.get(
      `https://api.jikan.moe/v4/anime?q=${encodeURIComponent(title)}&limit=1`
    );
    
    if (searchResponse.data.data && searchResponse.data.data.length > 0) {
      return searchResponse.data.data[0].mal_id;
    }
    
    return null;
  } catch (error) {
    console.error(`❌ Błąd wyszukiwania dla "${title}":`, error.message);
    return null;
  }
};

const fetchCharactersAndVoiceCast = async (limit = 100) => {
  try {
    // Pobierz anime bez characters/voice cast
    const animeWithoutCharacters = await Anime.find({
      $or: [
        { characters: { $exists: false } },
        { characters: { $size: 0 } },
        { voiceCast: { $exists: false } },
        { voiceCast: { $size: 0 } }
      ]
    }).limit(limit);

    console.log(`🚀 Znaleziono ${animeWithoutCharacters.length} anime do uzupełnienia...`);

    let processed = 0;
    let successCount = 0;
    let errorCount = 0;

    for (const anime of animeWithoutCharacters) {
      try {
        console.log(`📄 Przetwarzam: ${anime.title} (${processed + 1}/${animeWithoutCharacters.length})`);

        // Najpierw znajdź MAL ID
        const malId = await findMalIdByTitle(anime.title);
        
        if (!malId) {
          console.log(`⚠️ Nie znaleziono MAL ID dla: ${anime.title}`);
          errorCount++;
          processed++;
          continue;
        }

        console.log(`🔍 Znaleziono MAL ID: ${malId} dla: ${anime.title}`);

        // Pobierz characters
        const charactersResponse = await axios.get(
          `https://api.jikan.moe/v4/anime/${malId}/characters`
        );

        // Pobierz staff (voice actors)
        const staffResponse = await axios.get(
          `https://api.jikan.moe/v4/anime/${malId}/staff`
        );

        const characters = charactersResponse.data.data || [];
        const staff = staffResponse.data.data || [];

        // Przygotuj dane characters
        const charactersData = characters
          .filter(char => char.role === "Main" || char.role === "Supporting")
          .slice(0, 10) // Maksymalnie 10 głównych postaci
          .map(char => ({
            name: char.character.name,
            role: char.role,
            image: char.character.images?.jpg?.image_url || null
          }));

        // Przygotuj dane voice cast
        const voiceCastData = staff
          .filter(person => person.positions?.some(pos => pos.includes("Voice")))
          .slice(0, 10) // Maksymalnie 10 voice actors
          .map(person => ({
            character: person.character?.name || "Unknown Character",
            actor: person.person.name,
            role: person.positions?.find(pos => pos.includes("Voice")) || "Voice Actor"
          }));

        // Przygotuj streaming platforms (mock data)
        const streamingPlatforms = [
          { name: "Crunchyroll", url: "https://www.crunchyroll.com" },
          { name: "Funimation", url: "https://www.funimation.com" },
          { name: "Netflix", url: "https://www.netflix.com" }
        ];

        // Aktualizuj anime w bazie
        await Anime.findByIdAndUpdate(anime._id, {
          characters: charactersData,
          voiceCast: voiceCastData,
          streamingPlatforms: streamingPlatforms,
          malId: malId // Zapisz MAL ID dla przyszłego użycia
        });

        console.log(`✅ Zaktualizowano: ${anime.title} (${charactersData.length} characters, ${voiceCastData.length} voice actors)`);
        successCount++;

        // Czekaj 1 sekundę między requestami (rate limiting)
        await delay(1000);

      } catch (error) {
        console.error(`❌ Błąd przy ${anime.title}:`, error.message);
        errorCount++;
        
        // Jeśli to błąd 404 (anime nie istnieje w MAL), pomiń
        if (error.response?.status === 404) {
          console.log(`⚠️ Anime nie znalezione w MAL: ${anime.title}`);
          continue;
        }
        
        // Czekaj dłużej przy błędzie
        await delay(2000);
      }

      processed++;
    }

    console.log(`🎉 Zakończono!`);
    console.log(`✅ Udało się: ${successCount}`);
    console.log(`❌ Błędy: ${errorCount}`);
    console.log(`📊 Przetworzono: ${processed}/${animeWithoutCharacters.length}`);

    return { successCount, errorCount, processed, total: animeWithoutCharacters.length };

  } catch (error) {
    console.error("❌ Błąd podczas pobierania characters:", error);
    throw error;
  }
};

// Eksportuj funkcję
module.exports = { fetchCharactersAndVoiceCast };

// Jeśli skrypt jest uruchamiany bezpośrednio, uruchom funkcję
if (require.main === module) {
  require("dotenv").config();
  mongoose.set("strictQuery", false);

  mongoose
    .connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    })
    .then(() => {
      console.log("✅ Połączono z MongoDB");
      return fetchCharactersAndVoiceCast(20); // Pobierz dla 20 anime (test)
    })
    .then(() => {
      mongoose.disconnect();
      console.log("🔌 Zamknięto połączenie z MongoDB.");
    })
    .catch((err) => {
      console.error("❌ Błąd połączenia:", err);
      process.exit(1);
    });
} 