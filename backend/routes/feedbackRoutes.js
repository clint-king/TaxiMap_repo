import express from 'express';
import feedbackController from '../controllers/feedbackController.js';
import authenticateUser from '../Middleware/authenticateUser.js';
import { validateFeedback, validateId } from '../Middleware/validation.js';

const router = express.Router();

// All routes require authentication
router.use(authenticateUser);

// Submit feedback
router.post('/submit', validateFeedback, feedbackController.submitFeedback);

// Get user's feedback history
router.get('/history', feedbackController.getUserFeedback);

// Get specific feedback by ID
router.get('/:id', feedbackController.getFeedbackById);

export default router;
