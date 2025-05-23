const express = require("express");
const path = require("path");
const mongoose = require("mongoose");
const cors = require("cors");
const Anime = require("./models/Anime");
const moodsRouter = require("./routes/moods");
const animeRouter = require("./routes/anime");
const featuredAnimeRouter = require("./routes/featuredAnime");
const categoriesRouter = require("./routes/categories");
require("dotenv").config();

const app = express();

const helmet = require("helmet");
const xss = require("xss-clean");
const rateLimit = require("express-rate-limit");

app.use(helmet());
app.use(xss());

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: "Too many IP requests, please try again later",
});
app.use(limiter);

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;

const mongoURI = process.env.MONGODB_URI;
mongoose
  .connect(mongoURI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    console.log("Połączono z MongoDB!");
  })
  .catch((err) => {
    console.error("Błąd połączenia z MongoDB:", err.message);
    process.exit(1);
  });

app.use("/api/moods", moodsRouter);
app.use("/api/anime", animeRouter);
app.use("/api/featured-anime", featuredAnimeRouter);
app.use("/api/categories", categoriesRouter);


app.get("/", (req, res) => {
  res.send("Backend działa!");
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

if (process.env.NODE_ENV === "production") {
  app.use(express.static(path.join(__dirname, "build")));

  app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "build", "index.html"));
  });
}


app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send("Coś poszło nie tak!");
});

app.use((req, res) => {
  res.status(404).send("Endpoint not found");
});


app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
