import FAQModel from '../models/faqModel.js';
import UserQuestionModel from '../models/userQuestionModel.js';
import UserModel from '../models/userModel.js';

// Get all active FAQs
const getFAQs = async (req, res) => {
  try {
    const { category } = req.query;
    
    const faqs = await FAQModel.getAllFAQs(category === 'all' ? null : category);

    res.json({ faqs });
  } catch (error) {
    console.error('Error fetching FAQs:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get FAQ categories
const getFAQCategories = async (req, res) => {
  try {
    const categories = await FAQModel.getFAQCategories();
    res.json({ categories });
  } catch (error) {
    console.error('Error fetching FAQ categories:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Submit a new question
const submitQuestion = async (req, res) => {
  try {
    const { question, email } = req.body;
    const user_id = req.user.id;

    // Validate required fields
    if (!question || !email) {
      return res.status(400).json({ error: 'Question and email are required' });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    // Create user question
    const questionId = await UserQuestionModel.createUserQuestion({
      user_id,
      question,
      email
    });

    res.status(201).json({
      message: 'Question submitted successfully',
      question: {
        id: questionId,
        question: question,
        status: 'pending',
        created_at: new Date()
      }
    });
  } catch (error) {
    console.error('Error submitting question:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get user's question history
const getUserQuestions = async (req, res) => {
  try {
    const user_id = req.user.id;
    const questions = await UserQuestionModel.getUserQuestions(user_id);

    res.json({ questions });
  } catch (error) {
    console.error('Error fetching user questions:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get question by ID
const getQuestionById = async (req, res) => {
  try {
    const { id } = req.params;
    const user_id = req.user.id;

    const question = await UserQuestionModel.getQuestionById(id, user_id);

    if (!question) {
      return res.status(404).json({ error: 'Question not found' });
    }

    res.json({ question });
  } catch (error) {
    console.error('Error fetching question:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export default {
  getFAQs,
  getFAQCategories,
  submitQuestion,
  getUserQuestions,
  getQuestionById
};
