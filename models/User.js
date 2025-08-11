const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: 3,
    maxlength: 30,
    index: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
    index: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  avatar: {
    type: String,
    default: null
  },
  bio: {
    type: String,
    maxlength: 500,
    default: ""
  },
  preferences: {
    favoriteGenres: [{
      type: String,
      default: []
    }],
    favoriteMoods: [{
      type: String,
      default: []
    }],
    notifications: {
      email: { type: Boolean, default: true },
      push: { type: Boolean, default: true },
      newAnime: { type: Boolean, default: true },
      recommendations: { type: Boolean, default: true }
    }
  },
  watchlist: [{
    animeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Anime'
    },
    status: {
      type: String,
      enum: ['plan_to_watch', 'watching', 'completed', 'dropped'],
      default: 'plan_to_watch'
    },
    rating: {
      type: Number,
      min: 1,
      max: 10
    },
    review: {
      type: String,
      maxlength: 1000
    },
    addedAt: {
      type: Date,
      default: Date.now
    },
    completedAt: Date
  }],
  watchedHistory: [{
    animeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Anime'
    },
    watchedAt: {
      type: Date,
      default: Date.now
    },
    episode: Number
  }],
  isAdmin: {
    type: Boolean,
    default: false
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  lastLogin: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Get user stats
userSchema.methods.getStats = function() {
  const completed = this.watchlist.filter(item => item.status === 'completed').length;
  const watching = this.watchlist.filter(item => item.status === 'watching').length;
  const planToWatch = this.watchlist.filter(item => item.status === 'plan_to_watch').length;
  
  return {
    completed,
    watching,
    planToWatch,
    total: this.watchlist.length
  };
};

// Add anime to watchlist
userSchema.methods.addToWatchlist = function(animeId, status = 'plan_to_watch') {
  const existingIndex = this.watchlist.findIndex(item => 
    item.animeId.toString() === animeId.toString()
  );
  
  if (existingIndex >= 0) {
    this.watchlist[existingIndex].status = status;
  } else {
    this.watchlist.push({ animeId, status });
  }
  
  return this.save();
};

// Remove from watchlist
userSchema.methods.removeFromWatchlist = function(animeId) {
  this.watchlist = this.watchlist.filter(item => 
    item.animeId.toString() !== animeId.toString()
  );
  return this.save();
};

// Rate anime
userSchema.methods.rateAnime = function(animeId, rating, review = '') {
  const watchlistItem = this.watchlist.find(item => 
    item.animeId.toString() === animeId.toString()
  );
  
  if (watchlistItem) {
    watchlistItem.rating = rating;
    watchlistItem.review = review;
    return this.save();
  }
  
  throw new Error('Anime not found in watchlist');
};

// Indexes for performance
userSchema.index({ username: 1 });
userSchema.index({ email: 1 });
userSchema.index({ 'watchlist.animeId': 1 });
userSchema.index({ 'preferences.favoriteGenres': 1 });
userSchema.index({ 'preferences.favoriteMoods': 1 });

module.exports = mongoose.model("User", userSchema);
