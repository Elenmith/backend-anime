const mongoose = require("mongoose");
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

// Mapa nastrojów -> słowa kluczowe
const moodKeywords = {
  happy: ["friendship", "joy", "laugh", "fun", "school", "smile", "feel-good"],
  sad: ["death", "loss", "tragedy", "cry", "farewell", "lonely", "grief"],
  epic: ["battle", "war", "fate", "hero", "legend", "epic", "saga"],
  dark: [
    "dark",
    "gore",
    "brutal",
    "revenge",
    "apocalypse",
    "horror",
    "dystopia",
  ],
  relaxing: [
    "calm",
    "peaceful",
    "healing",
    "slow",
    "nature",
    "meditative",
    "slice of life",
  ],
  romantic: ["love", "romance", "relationship", "kiss", "date", "heart"],
  motivational: [
    "struggle",
    "train",
    "achieve",
    "overcome",
    "ambition",
    "growth",
  ],
  adventurous: ["adventure", "journey", "exploration", "travel", "wander"],
  excited: ["thrill", "action", "high-energy", "explosive", "intense"],
  cheerful: ["cheerful", "sunny", "uplifting", "optimistic", "bright"],
  optimistic: ["hope", "dream", "positive", "bright future"],
  relaxed: ["relax", "chill", "laid-back", "cozy"],
  playful: ["funny", "mischief", "teasing", "lighthearted"],
  joyful: ["joy", "celebration", "festive", "happy"],
  lonely: ["alone", "isolated", "solitude", "abandoned"],
  melancholic: ["melancholy", "nostalgia", "bittersweet", "reflective"],
  anxious: ["anxiety", "tense", "fear", "uncertain", "paranoia"],
  angry: ["anger", "rage", "furious", "hate"],
  frustrated: ["frustration", "blocked", "failure", "resentment"],
  heartbroken: ["heartbreak", "breakup", "unrequited", "loss"],
  depressed: ["depression", "hopeless", "worthless", "deep sadness"],
  envious: ["envy", "jealousy", "comparison"],
  irritated: ["annoyed", "irritated", "grumpy", "snappy"],
  thoughtful: ["philosophy", "ideas", "deep", "reflect"],
  calm: ["peace", "stillness", "tranquility", "quiet"],
  reflective: ["introspection", "thoughts", "memory", "past"],
  peaceful: ["harmony", "nature", "gentle", "non-violence"],
  focused: ["goal", "mission", "determined", "concentrated"],
  serious: ["drama", "weighty", "important", "mature"],
  motivated: ["drive", "inspired", "purpose", "vision"],
  energic: ["energetic", "vibrant", "dynamic", "electric"],
  aggressive: ["aggressive", "attack", "violent", "fury"],
  spontaneous: ["impulsive", "sudden", "unplanned", "wild"],
  tense: ["tension", "tight", "nervous", "stress"],
  dramatic: ["drama", "intense", "conflict", "emotional"],
  suspenseful: ["mystery", "thriller", "suspense", "twist"],
  magical: ["magic", "wizard", "witch", "enchantment", "sorcery"],
  inspirational: ["inspire", "moving", "heroic", "emotional growth"],
  whimisical: ["whimsy", "quirky", "eccentric", "dreamlike"],
  dreamy: ["dream", "ethereal", "floating", "fantasy"],
  mythical: ["myth", "gods", "legend", "ancient", "creatures"],
  surreal: ["surreal", "bizarre", "unreal", "distorted"],
  uplifting: ["uplift", "rise", "hopeful", "encouraging"],
};

const normalize = (text) =>
  text ? text.toLowerCase().replace(/[^a-z0-9\s]/gi, "") : "";

const assignMoods = async () => {
  const animeList = await Anime.find({});
  let updatedCount = 0;

  for (const anime of animeList) {
    const combinedText = normalize(
      (anime.synopsis || "") + " " + (anime.genres || []).join(" ")
    );

    const matchedMoods = [];

    for (const [mood, keywords] of Object.entries(moodKeywords)) {
      for (const word of keywords) {
        if (combinedText.includes(word.toLowerCase())) {
          matchedMoods.push(mood);
          break;
        }
      }
    }

    if (matchedMoods.length) {
      anime.moods = [...new Set(matchedMoods)]; // unikamy duplikatów
      await anime.save();
      updatedCount++;
      console.log(
        `✅ Zaktualizowano: ${anime.title} → [${anime.moods.join(", ")}]`
      );
    }
  }

  console.log(`🎯 Przypisano nastroje do ${updatedCount} anime.`);
  mongoose.disconnect();
};

assignMoods();
