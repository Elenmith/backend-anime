const express = require('express');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const { authenticateToken, requireAdmin, generateToken } = require('../middleware/auth');
const router = express.Router();

// Validation middleware
const validateRegistration = [
  body('username')
    .isLength({ min: 3, max: 30 })
    .withMessage('Username must be between 3 and 30 characters')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username can only contain letters, numbers, and underscores'),
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number')
];

const validateLogin = [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty()
];

// @route   POST /api/users/register
// @desc    Register a new user
// @access  Public
router.post('/register', validateRegistration, async (req, res) => {
  try {
    console.log('Registration request body:', req.body);
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('Validation errors:', errors.array());
      return res.status(400).json({ 
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { username, email, password } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [{ email }, { username }]
    });

    if (existingUser) {
      return res.status(400).json({
        error: 'User already exists',
        message: existingUser.email === email 
          ? 'Email is already registered' 
          : 'Username is already taken'
      });
    }

    // Create new user
    const user = new User({
      username,
      email,
      password
    });

    await user.save();

    // Generate token
    const token = generateToken(user._id);

    // Return user data (without password)
    const userResponse = {
      _id: user._id,
      username: user.username,
      email: user.email,
      avatar: user.avatar,
      bio: user.bio,
      preferences: user.preferences,
      isAdmin: user.isAdmin,
      isVerified: user.isVerified,
      createdAt: user.createdAt
    };

    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: userResponse
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      error: 'Registration failed',
      message: 'Internal server error'
    });
  }
});

// @route   POST /api/users/login
// @desc    Login user
// @access  Public
router.post('/login', validateLogin, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { email, password } = req.body;

    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({
        error: 'Invalid credentials',
        message: 'Email or password is incorrect'
      });
    }

    // Check password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({
        error: 'Invalid credentials',
        message: 'Email or password is incorrect'
      });
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Generate token
    const token = generateToken(user._id);

    // Return user data (without password)
    const userResponse = {
      _id: user._id,
      username: user.username,
      email: user.email,
      avatar: user.avatar,
      bio: user.bio,
      preferences: user.preferences,
      isAdmin: user.isAdmin,
      isVerified: user.isVerified,
      lastLogin: user.lastLogin,
      createdAt: user.createdAt
    };

    res.json({
      message: 'Login successful',
      token,
      user: userResponse
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      error: 'Login failed',
      message: 'Internal server error'
    });
  }
});

// @route   GET /api/users/profile
// @desc    Get current user profile
// @access  Private
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .select('-password')
      .populate('watchlist.animeId', 'title imageUrl rating genres');

    if (!user) {
      return res.status(404).json({
        error: 'User not found',
        message: 'User profile not found'
      });
    }

    // Get user stats
    const stats = user.getStats();

    res.json({
      user,
      stats
    });

  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      error: 'Failed to get profile',
      message: 'Internal server error'
    });
  }
});

// @route   PUT /api/users/profile
// @desc    Update user profile
// @access  Private
router.put('/profile', authenticateToken, [
  body('username')
    .optional()
    .isLength({ min: 3, max: 30 })
    .withMessage('Username must be between 3 and 30 characters'),
  body('bio')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Bio must be less than 500 characters'),
  body('avatar')
    .optional()
    .isURL()
    .withMessage('Avatar must be a valid URL')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { username, bio, avatar, preferences } = req.body;
    const updateData = {};

    if (username) updateData.username = username;
    if (bio !== undefined) updateData.bio = bio;
    if (avatar) updateData.avatar = avatar;
    if (preferences) updateData.preferences = { ...req.user.preferences, ...preferences };

    // Check if username is already taken (if changing)
    if (username && username !== req.user.username) {
      const existingUser = await User.findOne({ username });
      if (existingUser) {
        return res.status(400).json({
          error: 'Username already taken',
          message: 'This username is already in use'
        });
      }
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      updateData,
      { new: true, runValidators: true }
    ).select('-password');

    res.json({
      message: 'Profile updated successfully',
      user: updatedUser
    });

  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      error: 'Failed to update profile',
      message: 'Internal server error'
    });
  }
});

// @route   GET /api/users/watchlist
// @desc    Get user's watchlist
// @access  Private
router.get('/watchlist', authenticateToken, async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;

    let query = { _id: req.user._id };
    if (status) {
      query['watchlist.status'] = status;
    }

    const user = await User.findById(req.user._id)
      .populate({
        path: 'watchlist.animeId',
        select: 'title imageUrl rating genres moods synopsis duration releaseDate'
      })
      .select('watchlist');

    if (!user) {
      return res.status(404).json({
        error: 'User not found'
      });
    }

    let watchlist = user.watchlist;
    if (status) {
      watchlist = watchlist.filter(item => item.status === status);
    }

    // Pagination
    const total = watchlist.length;
    const paginatedWatchlist = watchlist.slice(skip, skip + parseInt(limit));

    res.json({
      watchlist: paginatedWatchlist,
      pagination: {
        current: parseInt(page),
        total: Math.ceil(total / limit),
        hasNext: skip + parseInt(limit) < total,
        hasPrev: page > 1
      }
    });

  } catch (error) {
    console.error('Get watchlist error:', error);
    res.status(500).json({
      error: 'Failed to get watchlist',
      message: 'Internal server error'
    });
  }
});

// @route   POST /api/users/watchlist
// @desc    Add anime to watchlist
// @access  Private
router.post('/watchlist', authenticateToken, [
  body('animeId').isMongoId().withMessage('Valid anime ID required'),
  body('status')
    .optional()
    .isIn(['plan_to_watch', 'watching', 'completed', 'dropped'])
    .withMessage('Invalid status')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { animeId, status = 'plan_to_watch' } = req.body;

    await req.user.addToWatchlist(animeId, status);

    res.json({
      message: 'Anime added to watchlist successfully'
    });

  } catch (error) {
    console.error('Add to watchlist error:', error);
    res.status(500).json({
      error: 'Failed to add to watchlist',
      message: 'Internal server error'
    });
  }
});

// @route   DELETE /api/users/watchlist/:animeId
// @desc    Remove anime from watchlist
// @access  Private
router.delete('/watchlist/:animeId', authenticateToken, async (req, res) => {
  try {
    const { animeId } = req.params;

    await req.user.removeFromWatchlist(animeId);

    res.json({
      message: 'Anime removed from watchlist successfully'
    });

  } catch (error) {
    console.error('Remove from watchlist error:', error);
    res.status(500).json({
      error: 'Failed to remove from watchlist',
      message: 'Internal server error'
    });
  }
});

// @route   POST /api/users/rate
// @desc    Rate an anime
// @access  Private
router.post('/rate', authenticateToken, [
  body('animeId').isMongoId().withMessage('Valid anime ID required'),
  body('rating').isInt({ min: 1, max: 10 }).withMessage('Rating must be between 1 and 10'),
  body('review').optional().isLength({ max: 1000 }).withMessage('Review too long')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { animeId, rating, review = '' } = req.body;

    await req.user.rateAnime(animeId, rating, review);

    res.json({
      message: 'Anime rated successfully'
    });

  } catch (error) {
    console.error('Rate anime error:', error);
    if (error.message === 'Anime not found in watchlist') {
      return res.status(400).json({
        error: 'Anime not in watchlist',
        message: 'Add anime to watchlist before rating'
      });
    }
    res.status(500).json({
      error: 'Failed to rate anime',
      message: 'Internal server error'
    });
  }
});

// @route   GET /api/users/recommendations
// @desc    Get personalized anime recommendations
// @access  Private
router.get('/recommendations', authenticateToken, async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    
    // Get user's favorite genres and moods
    const { favoriteGenres, favoriteMoods } = req.user.preferences;
    
    // Get user's watchlist to exclude already watched
    const watchedAnimeIds = req.user.watchlist.map(item => item.animeId);
    
    // Build query for recommendations
    let query = {
      _id: { $nin: watchedAnimeIds }
    };
    
    if (favoriteGenres.length > 0 || favoriteMoods.length > 0) {
      query.$or = [];
      
      if (favoriteGenres.length > 0) {
        query.$or.push({ genres: { $in: favoriteGenres } });
      }
      
      if (favoriteMoods.length > 0) {
        query.$or.push({ moods: { $in: favoriteMoods } });
      }
    }
    
    const Anime = require('../models/Anime');
    const recommendations = await Anime.find(query)
      .sort({ rating: -1 })
      .limit(parseInt(limit))
      .select('title imageUrl rating genres moods synopsis');
    
    res.json({
      recommendations,
      basedOn: {
        genres: favoriteGenres,
        moods: favoriteMoods
      }
    });
    
  } catch (error) {
    console.error('Get recommendations error:', error);
    res.status(500).json({
      error: 'Failed to get recommendations',
      message: 'Internal server error'
    });
  }
});

module.exports = router;
