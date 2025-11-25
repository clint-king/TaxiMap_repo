/**
 * Public routes - no authentication required
 * These endpoints return public data only (no sensitive information)
 */
import express from 'express';
import publicController from '../controllers/publicController.js';
import { publicContributorsLimiter } from '../middleware/rateLimiter.js';
import { query } from 'express-validator';
import { handleValidationErrors } from '../middleware/validation.js';

const router = express.Router();

// Public contributors endpoint - returns only public data (no email, no username)
// Security measures:
// - Rate limiting (100 requests per 15 minutes per IP)
// - Input validation (query parameters)
// - No authentication required (public data)
// - SQL injection protected (parameterized queries)
// - XSS protected (output escaping in frontend)
router.get('/contributors', 
  publicContributorsLimiter, // Rate limiting
  [
    // Validate and sanitize query parameters (if any are added in future)
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
    query('offset').optional().isInt({ min: 0 }).withMessage('Offset must be a positive integer'),
    handleValidationErrors
  ],
  publicController.getPublicContributors
);

export default router;

