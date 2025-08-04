const mongoose = require("mongoose");

const animeSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    index: true, // Index for search performance
    text: true   // Text index for full-text search
  },
  genres: [{
    type: String,
    index: true  // Index for genre filtering
  }],
  moods: [{
    type: String,
    index: true  // Index for mood filtering
  }],
  rating: {
    type: Number,
    min: 0,
    max: 10,
    index: true  // Index for rating-based queries
  },
  imageUrl: {
    type: String,
    required: true
  },
  synopsis: {
    type: String,
    text: true   // Text index for synopsis search
  },
  duration: String,
  releaseDate: String,
  director: String,
  characters: [String],
  voiceCast: [String],
  streamingPlatforms: [String],
  gallery: [String]
}, {
  timestamps: true
});

// Compound indexes for common query patterns
animeSchema.index({ rating: -1, title: 1 }); // For sorting by rating
animeSchema.index({ genres: 1, rating: -1 }); // For genre filtering with rating sort
animeSchema.index({ moods: 1, rating: -1 }); // For mood filtering with rating sort
animeSchema.index({ title: 'text', synopsis: 'text' }); // For full-text search

// Pre-save middleware to ensure data consistency
animeSchema.pre('save', function(next) {
  // Ensure genres and moods are unique and lowercase
  if (this.genres) {
    this.genres = [...new Set(this.genres.map(g => g.toLowerCase().trim()))];
  }
  if (this.moods) {
    this.moods = [...new Set(this.moods.map(m => m.toLowerCase().trim()))];
  }
  next();
});

// Static method for search
animeSchema.statics.searchByTitle = function(searchTerm, limit = 10) {
  return this.find({
    title: { $regex: searchTerm, $options: 'i' }
  })
  .sort({ rating: -1 })
  .limit(limit);
};

// Static method for mood filtering
animeSchema.statics.findByMood = function(mood, page = 1, limit = 9) {
  const skip = (page - 1) * limit;
  return this.find({ moods: mood.toLowerCase() })
    .sort({ rating: -1 })
    .skip(skip)
    .limit(limit);
};

// Static method for genre filtering
animeSchema.statics.findByGenre = function(genre, page = 1, limit = 16) {
  const skip = (page - 1) * limit;
  return this.find({
    genres: { $regex: new RegExp(`^${genre}$`, "i") }
  })
    .sort({ rating: -1 })
    .skip(skip)
    .limit(limit);
};

// Static method for high-rated anime
animeSchema.statics.findHighRated = function(minRating = 8.5) {
  return this.find({ rating: { $gt: minRating } })
    .sort({ rating: -1 });
};

module.exports = mongoose.model("Anime", animeSchema);
