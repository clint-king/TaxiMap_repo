import express from 'express';
import contactController from '../controllers/contactController.js';
import { validateContact } from '../middleware/validation.js';

const router = express.Router();

// Contact form submission (public route)
router.post('/send', validateContact, contactController.sendContactEmail);

export default router;
