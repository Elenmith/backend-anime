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

const fetchCharactersAndVoiceCast = async (limit = null) => {
  try {
    // Pobierz anime bez characters/voice cast
    const query = {
      $or: [
        { characters: { $exists: false } },
        { characters: { $size: 0 } },
        { voiceCast: { $exists: false } },
        { voiceCast: { $size: 0 } }
      ]
    };

    const animeWithoutCharacters = limit 
      ? await Anime.find(query).limit(limit)
      : await Anime.find(query);

    console.log(`🚀 Znaleziono ${animeWithoutCharacters.length} anime do uzupełnienia...`);

    let processed = 0;
    let successCount = 0;
    let errorCount = 0;
    let rateLimitCount = 0;

    for (const anime of animeWithoutCharacters) {
      try {
        console.log(`📄 [${processed + 1}/${animeWithoutCharacters.length}] Przetwarzam: ${anime.title}`);

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

        console.log(`📊 Pobrano ${characters.length} characters i ${staff.length} staff dla ${anime.title}`);

        // Przygotuj dane characters - poprawiona logika
        const charactersData = characters
          .filter(char => {
            // Sprawdź czy char.character istnieje i ma name
            return char.character && char.character.name && 
                   (char.role === "Main" || char.role === "Supporting");
          })
          .slice(0, 10) // Maksymalnie 10 głównych postaci
          .map(char => {
            console.log(`👤 Character: ${char.character.name} (${char.role})`);
            return {
              name: char.character.name,
              role: char.role,
              image: char.character.images?.jpg?.image_url || null
            };
          });

        // Przygotuj dane voice cast - poprawiona logika
        const voiceCastData = staff
          .filter(person => {
            // Sprawdź czy person ma positions i czy zawiera "Voice"
            return person.positions && 
                   person.positions.some(pos => pos.includes("Voice")) &&
                   person.person && person.person.name;
          })
          .slice(0, 10) // Maksymalnie 10 voice actors
          .map(person => {
            const characterName = person.character?.name || "Unknown Character";
            console.log(`🎭 Voice Actor: ${person.person.name} -> ${characterName}`);
            return {
              character: characterName,
              actor: person.person.name,
              role: person.positions?.find(pos => pos.includes("Voice")) || "Voice Actor"
            };
          });

        // Przygotuj streaming platforms (mock data)
        const streamingPlatforms = [
          { name: "Crunchyroll", url: "https://www.crunchyroll.com" },
          { name: "Funimation", url: "https://www.funimation.com" },
          { name: "Netflix", url: "https://www.netflix.com" }
        ];

        console.log(`💾 Zapisuję: ${charactersData.length} characters, ${voiceCastData.length} voice actors`);

        // Aktualizuj anime w bazie
        await Anime.findByIdAndUpdate(anime._id, {
          characters: charactersData,
          voiceCast: voiceCastData,
          streamingPlatforms: streamingPlatforms,
          malId: malId // Zapisz MAL ID dla przyszłego użycia
        });

        console.log(`✅ Zaktualizowano: ${anime.title} (${charactersData.length} characters, ${voiceCastData.length} voice actors)`);
        successCount++;

        // Rate limiting - 1 sekunda między requestami
        await delay(1000);

      } catch (error) {
        console.error(`❌ Błąd przy ${anime.title}:`, error.message);
        
        // Sprawdź czy to rate limit
        if (error.response?.status === 429) {
          console.log(`🚫 Rate limit osiągnięty! Czekam 60 sekund...`);
          rateLimitCount++;
          await delay(60000); // Czekaj 1 minutę
          continue; // Spróbuj ponownie
        }
        
        // Jeśli to błąd 404 (anime nie istnieje w MAL), pomiń
        if (error.response?.status === 404) {
          console.log(`⚠️ Anime nie znalezione w MAL: ${anime.title}`);
          errorCount++;
          processed++;
          continue;
        }
        
        // Inne błędy - czekaj dłużej
        console.log(`⏳ Błąd - czekam 5 sekund przed kolejnym...`);
        await delay(5000);
        errorCount++;
      }

      processed++;
      
      // Co 10 anime, pokaż postęp
      if (processed % 10 === 0) {
        console.log(`📈 Postęp: ${processed}/${animeWithoutCharacters.length} (${Math.round(processed/animeWithoutCharacters.length*100)}%)`);
        console.log(`✅ Sukces: ${successCount}, ❌ Błędy: ${errorCount}, 🚫 Rate limits: ${rateLimitCount}`);
      }
    }

    console.log(`🎉 Zakończono!`);
    console.log(`✅ Udało się: ${successCount}`);
    console.log(`❌ Błędy: ${errorCount}`);
    console.log(`🚫 Rate limits: ${rateLimitCount}`);
    console.log(`📊 Przetworzono: ${processed}/${animeWithoutCharacters.length}`);

    return { successCount, errorCount, rateLimitCount, processed, total: animeWithoutCharacters.length };

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
      // Pobierz dla wszystkich anime (bez limitu)
      return fetchCharactersAndVoiceCast();
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