// routes/authRoutes.js
import express from "express";
import  { body } from 'express-validator';


//controller
import {signup , login, verifyEmail, resendVerificationEmail, getProfile, updateProfile, changePassword, changeEmail} from "../controllers/AuthController.js";
import { googleAuth, facebookAuth, twitterAuth, instagramAuth, socialAuth } from "../controllers/socialAuthController.js";
import authenticateUser from "../Middleware/authenticateUser.js";

const router = express.Router();


// POST /api/auth/signup
router.post(
  '/signup',
  [
    body('name').notEmpty().withMessage('Name is required'),
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
  ] , signup);


router.post("/login" , 
  [
    body('email').isEmail().withMessage('Valid email is required')
  ] ,
  login
);

// Social Authentication Routes
router.post("/google", googleAuth);
router.post("/facebook", facebookAuth);
router.post("/twitter", twitterAuth);
router.post("/instagram", instagramAuth);
router.post("/social", socialAuth);

// Email Verification Routes
router.get("/verify/:token", verifyEmail);
router.post("/resend-verification", resendVerificationEmail);

// Profile Routes (protected)
router.get("/profile", authenticateUser, getProfile);
router.put("/profile", authenticateUser, updateProfile);

// Password and Email Change Routes (protected)
router.put("/change-password", authenticateUser, changePassword);
router.put("/change-email", authenticateUser, changeEmail);

// Logout route
router.post("/logout", (req, res) => {
  res.clearCookie('token');
  res.json({ message: 'Logged out successfully' });
});

export default router;