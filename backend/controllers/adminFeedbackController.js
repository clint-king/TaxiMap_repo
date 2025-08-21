import FeedbackModel from '../models/feedbackModel.js';
import FAQModel from '../models/faqModel.js';
import UserQuestionModel from '../models/userQuestionModel.js';
import UserModel from '../models/userModel.js';

// Get all feedback for admin
const getAllFeedback = async (req, res) => {
  try {
    const feedback = await FeedbackModel.getAllFeedback();
    res.json({ feedback });
  } catch (error) {
    console.error('Error fetching feedback:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Update feedback status
const updateFeedbackStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, admin_response } = req.body;

    const success = await FeedbackModel.updateFeedbackStatus(id, status, admin_response);
    if (!success) {
      return res.status(404).json({ error: 'Feedback not found' });
    }

    res.json({ message: 'Feedback updated successfully' });
  } catch (error) {
    console.error('Error updating feedback:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get all FAQs for admin
const getAllFAQs = async (req, res) => {
  try {
    const faqs = await FAQModel.getAllFAQs();
    res.json({ faqs });
  } catch (error) {
    console.error('Error fetching FAQs:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Create new FAQ
const createFAQ = async (req, res) => {
  try {
    const { question, answer, category } = req.body;

    if (!question || !answer) {
      return res.status(400).json({ error: 'Question and answer are required' });
    }

    const faqId = await FAQModel.createFAQ({ question, answer, category });
    if (!faqId) {
      return res.status(500).json({ error: 'Failed to create FAQ' });
    }

    res.status(201).json({ message: 'FAQ created successfully', faqId });
  } catch (error) {
    console.error('Error creating FAQ:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Update FAQ
const updateFAQ = async (req, res) => {
  try {
    const { id } = req.params;
    const { question, answer, category, is_active } = req.body;

    const success = await FAQModel.updateFAQ(id, { question, answer, category, is_active });
    if (!success) {
      return res.status(404).json({ error: 'FAQ not found' });
    }

    res.json({ message: 'FAQ updated successfully' });
  } catch (error) {
    console.error('Error updating FAQ:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Delete FAQ
const deleteFAQ = async (req, res) => {
  try {
    const { id } = req.params;

    const success = await FAQModel.deleteFAQ(id);
    if (!success) {
      return res.status(404).json({ error: 'FAQ not found' });
    }

    res.json({ message: 'FAQ deleted successfully' });
  } catch (error) {
    console.error('Error deleting FAQ:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get all user questions for admin
const getAllUserQuestions = async (req, res) => {
  try {
    const questions = await UserQuestionModel.getAllUserQuestions();
    res.json({ questions });
  } catch (error) {
    console.error('Error fetching user questions:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Answer user question
const answerUserQuestion = async (req, res) => {
  try {
    const { id } = req.params;
    const { admin_answer, status } = req.body;

    const success = await UserQuestionModel.answerUserQuestion(id, admin_answer, status);
    if (!success) {
      return res.status(404).json({ error: 'Question not found' });
    }

    res.json({ message: 'Question answered successfully' });
  } catch (error) {
    console.error('Error answering question:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export default {
  getAllFeedback,
  updateFeedbackStatus,
  getAllFAQs,
  createFAQ,
  updateFAQ,
  deleteFAQ,
  getAllUserQuestions,
  answerUserQuestion
};
