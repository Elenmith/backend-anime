const { body, param, query, validationResult } = require('express-validator');

// Helper function to handle validation errors
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors.array().map(err => ({
        field: err.path,
        message: err.msg,
        value: err.value
      }))
    });
  }
  next();
};

// Validation rules for anime search
const validateAnimeSearch = [
  query('title')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Title must be between 1 and 100 characters')
    .escape(),
  handleValidationErrors
];

// Validation rules for mood filtering
const validateMoodFilter = [
  param('mood')
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Mood must be between 1 and 50 characters')
    .escape(),
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  handleValidationErrors
];

// Validation rules for genre filtering
const validateGenreFilter = [
  param('genre')
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Genre must be between 1 and 50 characters')
    .escape(),
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  handleValidationErrors
];

// Validation rules for anime ID
const validateAnimeId = [
  param('id')
    .isMongoId()
    .withMessage('Invalid anime ID format'),
  handleValidationErrors
];

// Validation rules for creating anime
const validateCreateAnime = [
  body('title')
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('Title must be between 1 and 200 characters')
    .escape(),
  body('rating')
    .optional()
    .isFloat({ min: 0, max: 10 })
    .withMessage('Rating must be between 0 and 10'),
  body('genres')
    .optional()
    .isArray()
    .withMessage('Genres must be an array'),
  body('genres.*')
    .optional()
    .isString()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Each genre must be between 1 and 50 characters')
    .escape(),
  body('moods')
    .optional()
    .isArray()
    .withMessage('Moods must be an array'),
  body('moods.*')
    .optional()
    .isString()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Each mood must be between 1 and 50 characters')
    .escape(),
  body('imageUrl')
    .optional()
    .isURL()
    .withMessage('Image URL must be a valid URL'),
  body('synopsis')
    .optional()
    .isLength({ max: 2000 })
    .withMessage('Synopsis must be less than 2000 characters')
    .escape(),
  handleValidationErrors
];

// Sanitization middleware for general use
const sanitizeInput = (req, res, next) => {
  // Sanitize query parameters
  if (req.query) {
    Object.keys(req.query).forEach(key => {
      if (typeof req.query[key] === 'string') {
        req.query[key] = req.query[key].trim();
      }
    });
  }

  // Sanitize body parameters
  if (req.body) {
    Object.keys(req.body).forEach(key => {
      if (typeof req.body[key] === 'string') {
        req.body[key] = req.body[key].trim();
      }
    });
  }

  next();
};

// Rate limiting configuration
const rateLimitConfig = {
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting for health checks
    return req.path === '/health';
  }
};

// Specific rate limiting for search endpoints
const searchRateLimit = {
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 30, // limit each IP to 30 search requests per 5 minutes
  message: {
    error: 'Too many search requests, please try again later.',
    retryAfter: '5 minutes'
  }
};

module.exports = {
  handleValidationErrors,
  validateAnimeSearch,
  validateMoodFilter,
  validateGenreFilter,
  validateAnimeId,
  validateCreateAnime,
  sanitizeInput,
  rateLimitConfig,
  searchRateLimit
}; 