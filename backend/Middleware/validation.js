/**
 * Validation middleware using express-validator
 */
import { body, param, query, validationResult } from 'express-validator';
import { sanitizeEmail, sanitizeString, sanitizeInteger } from '../utils/sanitize.js';

/**
 * Handle validation errors
 */
export const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors.array()
    });
  }
  next();
};

/**
 * Validation rules for user registration
 */
export const validateSignup = [
  body('name')
    .trim()
    .notEmpty().withMessage('Name is required')
    .isLength({ min: 2, max: 100 }).withMessage('Name must be between 2 and 100 characters')
    .customSanitizer(value => sanitizeString(value)),
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Valid email is required')
    .normalizeEmail()
    .customSanitizer(value => sanitizeEmail(value)),
  body('password')
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/).withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number')
    .optional(),
  body('username')
    .optional()
    .trim()
    .isLength({ min: 3, max: 30 }).withMessage('Username must be between 3 and 30 characters')
    .matches(/^[a-zA-Z0-9_]+$/).withMessage('Username can only contain letters, numbers, and underscores')
    .customSanitizer(value => sanitizeString(value)),
  body('phone')
    .optional()
    .trim()
    .matches(/^[0-9+\-\s()]+$/).withMessage('Invalid phone number format')
    .customSanitizer(value => sanitizeString(value)),
  handleValidationErrors
];

/**
 * Validation rules for login
 */
export const validateLogin = [
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Valid email is required')
    .normalizeEmail()
    .customSanitizer(value => sanitizeEmail(value)),
  body('password')
    .notEmpty().withMessage('Password is required'),
  handleValidationErrors
];

/**
 * Validation rules for feedback submission
 */
export const validateFeedback = [
  body('subject')
    .trim()
    .notEmpty().withMessage('Subject is required')
    .isLength({ min: 3, max: 200 }).withMessage('Subject must be between 3 and 200 characters')
    .customSanitizer(value => sanitizeString(value)),
  body('message')
    .trim()
    .notEmpty().withMessage('Message is required')
    .isLength({ min: 10, max: 5000 }).withMessage('Message must be between 10 and 5000 characters')
    .customSanitizer(value => sanitizeString(value)),
  body('feedback_type')
    .optional()
    .isIn(['bug', 'feature', 'general', 'other']).withMessage('Invalid feedback type')
    .customSanitizer(value => sanitizeString(value)),
  body('rating')
    .optional()
    .isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5')
    .customSanitizer(value => sanitizeInteger(value, 1, 5)),
  handleValidationErrors
];

/**
 * Validation rules for contact form
 */
export const validateContact = [
  body('name')
    .trim()
    .notEmpty().withMessage('Name is required')
    .isLength({ min: 2, max: 100 }).withMessage('Name must be between 2 and 100 characters')
    .customSanitizer(value => sanitizeString(value)),
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Valid email is required')
    .normalizeEmail()
    .customSanitizer(value => sanitizeEmail(value)),
  body('message')
    .trim()
    .notEmpty().withMessage('Message is required')
    .isLength({ min: 10, max: 2000 }).withMessage('Message must be between 10 and 2000 characters')
    .customSanitizer(value => sanitizeString(value)),
  handleValidationErrors
];

/**
 * Validation rules for profile update
 */
export const validateProfileUpdate = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 }).withMessage('Name must be between 2 and 100 characters')
    .customSanitizer(value => sanitizeString(value)),
  body('username')
    .optional()
    .trim()
    .isLength({ min: 3, max: 30 }).withMessage('Username must be between 3 and 30 characters')
    .matches(/^[a-zA-Z0-9_]+$/).withMessage('Username can only contain letters, numbers, and underscores')
    .customSanitizer(value => sanitizeString(value)),
  body('phone')
    .optional()
    .trim()
    .matches(/^[0-9+\-\s()]+$/).withMessage('Invalid phone number format')
    .customSanitizer(value => sanitizeString(value)),
  body('location')
    .optional()
    .trim()
    .isLength({ max: 200 }).withMessage('Location must be less than 200 characters')
    .customSanitizer(value => sanitizeString(value)),
  handleValidationErrors
];

/**
 * Validation for ID parameters
 */
export const validateId = [
  param('id')
    .isInt({ min: 1 }).withMessage('Invalid ID')
    .customSanitizer(value => sanitizeInteger(value, 1)),
  handleValidationErrors
];

