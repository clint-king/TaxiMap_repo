import express from 'express';
import contactController from '../controllers/contactController.js';

const router = express.Router();

// Contact form submission (public route)
router.post('/send', contactController.sendContactEmail);

export default router;
