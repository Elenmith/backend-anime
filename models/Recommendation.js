const mongoose = require("mongoose");

const recommendationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  animeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Anime',
    required: true,
    index: true
  },
  score: {
    type: Number,
    required: true,
    min: 0,
    max: 1,
    index: true
  },
  algorithm: {
    type: String,
    enum: ['collaborative', 'content-based', 'hybrid'],
    required: true
  },
  reason: {
    type: String,
    enum: ['similar_users', 'similar_genres', 'similar_moods', 'high_rated', 'popular'],
    required: true
  },
  metadata: {
    similarUsers: [{
      userId: mongoose.Schema.Types.ObjectId,
      similarity: Number
    }],
    commonGenres: [String],
    commonMoods: [String],
    averageRating: Number
  },
  isViewed: {
    type: Boolean,
    default: false
  },
  viewedAt: Date,
  expiresAt: {
    type: Date,
    default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 dni
  }
}, {
  timestamps: true
});

// Compound indexes for performance
recommendationSchema.index({ userId: 1, score: -1 });
recommendationSchema.index({ userId: 1, algorithm: 1 });
recommendationSchema.index({ userId: 1, isViewed: 1 });
recommendationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL index

// Static methods
recommendationSchema.statics.getUserRecommendations = function(userId, limit = 20, algorithm = null) {
  const query = { userId, isViewed: false };
  if (algorithm) query.algorithm = algorithm;
  
  return this.find(query)
    .sort({ score: -1 })
    .limit(limit)
    .populate('animeId')
    .populate('metadata.similarUsers.userId', 'username');
};

recommendationSchema.statics.markAsViewed = function(userId, animeId) {
  return this.updateMany(
    { userId, animeId, isViewed: false },
    { isViewed: true, viewedAt: new Date() }
  );
};

recommendationSchema.statics.clearOldRecommendations = function(userId) {
  return this.deleteMany({
    userId,
    $or: [
      { isViewed: true },
      { expiresAt: { $lt: new Date() } }
    ]
  });
};

module.exports = mongoose.model("Recommendation", recommendationSchema);
