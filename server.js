const express = require("express");
const path = require("path");
const mongoose = require("mongoose");
const cors = require("cors");
const Anime = require("./models/Anime");
const moodsRouter = require("./routes/moods");
const animeRouter = require("./routes/anime");
const featuredAnimeRouter = require("./routes/featuredAnime");
const categoriesRouter = require("./routes/categories");

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use("/api/moods", moodsRouter);
app.use("/api/anime", animeRouter);
app.use("/api/featured-anime", featuredAnimeRouter);
app.use("/api/categories", categoriesRouter);

const mongoURI = process.env.MONGODB_URI;

// Połączenie z MongoDB
mongoose.connect(mongoURI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => {
  console.log("✅ Połączono z MongoDB!");
})
.catch((err) => {
  console.error("❌ Błąd połączenia z MongoDB:", err.message);
  process.exit(1); // Zakończ proces jeśli nie udało się połączyć
});

// Testowa trasa
app.get("/", (req, res) => {
  res.send("Backend działa!");
});

// CRUD dla Anime
app.post("/anime", async (req, res) => {
  try {
    const newAnime = new Anime(req.body);
    await newAnime.save();
    res.status(201).json(newAnime);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.get("/anime", async (req, res) => {
  try {
    const animeList = await Anime.find();
    res.status(200).json(animeList);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put("/anime/:id", async (req, res) => {
  try {
    const updatedAnime = await Anime.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
      }
    );
    res.status(200).json(updatedAnime);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.delete("/anime/:id", async (req, res) => {
  try {
    await Anime.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: "Anime deleted" });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Obsługa statycznych plików tylko jeśli frontend jest w tym samym repozytorium
if (process.env.NODE_ENV === "production") {
  app.use(express.static(path.join(__dirname, "build")));

  app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "build", "index.html"));
  });
}

// Globalna obsługa błędów
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send("Coś poszło nie tak!");
});

// Obsługa nieznalezionych tras
app.use((req, res) => {
  res.status(404).send("Endpoint not found");
});

// Start serwera
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
