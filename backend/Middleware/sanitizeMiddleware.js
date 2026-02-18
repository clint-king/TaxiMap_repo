/**
 * Middleware to sanitize all incoming request data
 */
import { sanitizeObject, sanitizeString } from '../utils/sanitize.js';

/**
 * Sanitize request body, query, and params
 */
export const sanitizeInput = (req, res, next) => {
  // Sanitize request body
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeObject(req.body);
  }

  // Sanitize query parameters
  if (req.query && typeof req.query === 'object') {
    req.query = sanitizeObject(req.query);
  }

  // Sanitize route parameters
  if (req.params && typeof req.params === 'object') {
    req.params = sanitizeObject(req.params);
  }

  next();
};

/**
 * Sanitize specific fields in request body
 * @param {string[]} fields - Array of field names to sanitize
 */
export const sanitizeFields = (fields) => {
  return (req, res, next) => {
    if (req.body && typeof req.body === 'object') {
      fields.forEach(field => {
        if (req.body[field] && typeof req.body[field] === 'string') {
          req.body[field] = sanitizeString(req.body[field]);
        }
      });
    }
    next();
  };
};

