// routes/authRoutes.js
import express from "express";
import  { body } from 'express-validator';
import config from "../config/configurations.js";

//controller
import {signup , login, verifyEmail, resendVerificationEmail, getProfile, updateProfile, changePassword, changeEmail, forgotPassword, resetPassword, getUserActivities, getUserActivityStats, createUserActivity} from "../controllers/AuthController.js";
import authenticateUser from "../Middleware/authenticateUser.js";
import { validateSignup, validateLogin, validateProfileUpdate } from '../middleware/validation.js';

const router = express.Router();

// POST /api/auth/signup
router.post('/signup', validateSignup, signup);

router.post("/login", validateLogin, login);



// Email Verification Routes
router.get("/verify/:token", verifyEmail);
router.post("/resend-verification", resendVerificationEmail);

// Profile Routes (protected)
router.get("/profile", authenticateUser, getProfile);
router.put("/profile", authenticateUser, validateProfileUpdate, updateProfile);

// Password and Email Change Routes (protected)
router.put("/change-password", authenticateUser, changePassword);
router.put("/change-email", authenticateUser, changeEmail);

// Logout route
router.post("/logout", (req, res) => {
  res.clearCookie('token', {
    httpOnly: config.cookies.httpOnly,
    secure: config.cookies.secure,
    sameSite: config.cookies.sameSite
  });
  res.json({ message: 'Logged out successfully' });
});

// Forgot password route
router.post("/forgot-password", forgotPassword);

// Reset password route
router.post("/reset-password", resetPassword);

// User activities routes (protected)
router.get("/activities", authenticateUser, getUserActivities);
router.get("/activities/stats", authenticateUser, getUserActivityStats);
router.post("/activities", authenticateUser, createUserActivity);

export default router;