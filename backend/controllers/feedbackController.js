import FeedbackModel from '../models/feedbackModel.js';
import UserModel from '../models/userModel.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = 'uploads/feedback/';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'feedback-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: function (req, file, cb) {
    const allowedTypes = /jpeg|jpg|png|gif/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'));
    }
  }
}).array('images', 5); // Allow up to 5 images

// Submit feedback
const submitFeedback = async (req, res) => {
  try {
    upload(req, res, async function (err) {
      if (err) {
        return res.status(400).json({ error: err.message });
      }

      const { feedback_type, subject, message } = req.body;
      const user_id = req.user.id;

      // Validate required fields
      if (!subject || !message) {
        return res.status(400).json({ error: 'Subject and message are required' });
      }

      // Process uploaded images
      let imageUrls = [];
      if (req.files && req.files.length > 0) {
        imageUrls = req.files.map(file => `/uploads/feedback/${file.filename}`);
      }

      // Create feedback
      const feedbackId = await FeedbackModel.createFeedback({
        user_id,
        feedback_type: feedback_type || 'general',
        subject,
        message,
        images: imageUrls.length > 0 ? imageUrls : null
      });

      res.status(201).json({
        message: 'Feedback submitted successfully',
        feedback: {
          id: feedbackId,
          subject: subject,
          status: 'pending',
          created_at: new Date()
        }
      });
    });
  } catch (error) {
    console.error('Error submitting feedback:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get user's feedback history
const getUserFeedback = async (req, res) => {
  try {
    const user_id = req.user.id;
    const feedback = await FeedbackModel.getUserFeedback(user_id);

    res.json({ feedback });
  } catch (error) {
    console.error('Error fetching user feedback:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get feedback by ID (for user to view their specific feedback)
const getFeedbackById = async (req, res) => {
  try {
    const { id } = req.params;
    const user_id = req.user.id;

    const feedback = await FeedbackModel.getFeedbackById(id, user_id);

    if (!feedback) {
      return res.status(404).json({ error: 'Feedback not found' });
    }

    res.json({ feedback });
  } catch (error) {
    console.error('Error fetching feedback:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export default {
  submitFeedback,
  getUserFeedback,
  getFeedbackById
};
