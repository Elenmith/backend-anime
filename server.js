const express = require("express");
const path = require("path");
const mongoose = require("mongoose");
const cors = require("cors");
const compression = require("compression");
const Anime = require("./models/Anime");
const moodsRouter = require("./routes/moods");
const animeRouter = require("./routes/anime");
const featuredAnimeRouter = require("./routes/featuredAnime");
const categoriesRouter = require("./routes/categories");
const { initScheduler } = require("./scheduler");
const { sanitizeInput } = require("./middleware/validation");
require("dotenv").config();

const app = express();

// Security middleware
const helmet = require("helmet");
const xss = require("xss-clean");
const rateLimit = require("express-rate-limit");

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
    },
  },
}));

app.use(xss());

// Compression middleware
app.use(compression());

// Enhanced rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    error: "Too many requests from this IP, please try again later.",
    retryAfter: "15 minutes"
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting for health checks
    return req.path === '/health';
  }
});

app.use(limiter);

// CORS configuration
const corsOptions = {
  origin: [
    'https://mood4anime.com',
    'https://www.mood4anime.com',
    'http://localhost:3000',
    'http://localhost:3001'
  ],
  credentials: true,
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Input sanitization
app.use(sanitizeInput);

const PORT = process.env.PORT || 5000;

const mongoURI = process.env.MONGODB_URI;
mongoose
  .connect(mongoURI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    console.log("Połączono z MongoDB!");
    // Inicjalizuj scheduler po połączeniu z bazą danych
    initScheduler();
  })
  .catch((err) => {
    console.error("Błąd połączenia z MongoDB:", err.message);
    process.exit(1);
  });

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "OK",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
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

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  
  // Don't leak error details in production
  const errorMessage = process.env.NODE_ENV === 'production' 
    ? 'Something went wrong!' 
    : err.message;
    
  res.status(500).json({ 
    error: errorMessage,
    timestamp: new Date().toISOString()
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ 
    error: "Endpoint not found",
    path: req.path,
    method: req.method
  });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});
