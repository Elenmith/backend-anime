const express = require("express");
const path = require("path");
const PORT = process.env.PORT || 5000;
const mongoose = require("mongoose");
const Anime = require("./models/Anime");
const cors = require("cors");
const moodsRouter = require("./routes/moods");
const app = express();
const animeRouter = require("./routes/anime");
const featuredAnimeRouter = require("./routes/featuredAnime");
const categoriesRouter = require("./routes/categories");

app.use(cors());
app.use(express.json());
app.use("/api/moods", moodsRouter);
app.use("/api/anime", animeRouter);
app.use("/api/featured-anime", featuredAnimeRouter);
app.use("/api/categories", categoriesRouter);
app.use(express.static(path.join(__dirname, "build")));

const mongoURI =
  "mongodb+srv://admin:ZaEpU6JjfWVoRaQk@animemood.hezaf.mongodb.net/?retryWrites=true&w=majority&appName=AnimeMood";

mongoose
  .connect(mongoURI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log("Połączono z MongoDB!"))
  .catch((err) => console.error("Błąd połączenia z MongoDB:", err));

app.get("/", (req, res) => {
  res.send("Backend działa!");
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

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
      { new: true }
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

// Obsługa innych tras
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "build", "index.html"));
});

app.use((req, res) => {
  res.status(404).send("Endpoint not found");
});
