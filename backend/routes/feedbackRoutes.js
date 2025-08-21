import express from 'express';
import feedbackController from '../controllers/feedbackController.js';
import authenticateUser from '../Middleware/authenticateUser.js';

const router = express.Router();

// All routes require authentication
router.use(authenticateUser);

// Submit feedback
router.post('/submit', feedbackController.submitFeedback);

// Get user's feedback history
router.get('/history', feedbackController.getUserFeedback);

// Get specific feedback by ID
router.get('/:id', feedbackController.getFeedbackById);

export default router;
