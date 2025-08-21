import express from 'express';
import helpController from '../controllers/helpController.js';
import authenticateUser from '../Middleware/authenticateUser.js';

const router = express.Router();

// Public routes (no authentication required)
router.get('/faqs', helpController.getFAQs);
router.get('/faq-categories', helpController.getFAQCategories);

// Protected routes (authentication required)
router.use(authenticateUser);

// Submit a new question
router.post('/submit-question', helpController.submitQuestion);

// Get user's question history
router.get('/my-questions', helpController.getUserQuestions);

// Get specific question by ID
router.get('/question/:id', helpController.getQuestionById);

export default router;
