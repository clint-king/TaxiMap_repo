// routes/authRoutes.js
import express from "express";
import  { body } from 'express-validator';


//controller
import {signup , login} from "../controllers/AuthController.js";

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

  export default router;