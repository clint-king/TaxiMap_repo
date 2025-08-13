import User from '../models/userModel.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { generateVerificationToken, sendVerificationEmail } from '../services/emailService.js';


export const signup = async (req, res) => {
  const { name, email, password } = req.body;

  try {
    const existingUser = await User.getUserByEmail(email);
    if (existingUser) return res.status(400).json({ message: 'User already exists' });

    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Check if email configuration is properly set up
    const isEmailConfigured = process.env.EMAIL_USER && 
                             process.env.EMAIL_PASS && 
                             process.env.EMAIL_USER !== 'your-email@gmail.com' &&
                             process.env.EMAIL_PASS !== 'your-app-password';

    console.log("Email configuration:", process.env.EMAIL_USER," and Password:", process.env.EMAIL_PASS);
    console.log("Is Email configured:", isEmailConfigured);
    
    if (!isEmailConfigured) {
      // Development mode: Skip email verification
      const userId = await User.createUser(name, email, hashedPassword, null);
      
      if (userId) {
        // Auto-verify email for development
        await User.verifyUserEmail(userId);
        
        res.status(201).json({ 
          message: 'User registered successfully! Email verification skipped for development.',
          userId,
          emailSent: false,
          autoVerified: true
        });
      } else {
        res.status(500).json({ message: 'Failed to create user' });
      }
    } else {
      // Production mode: Use email verification
      const verificationToken = generateVerificationToken();
      console.log("Verification token:", verificationToken);

      const userId = await User.createUser(name, email, hashedPassword, verificationToken);
      console.log("User ID after creation:", userId);

      if (userId) {
        // Send verification email
        const emailResult = await sendVerificationEmail(email, name, verificationToken);
        console.log("Email result:", emailResult);
        if (emailResult.success) {
          res.status(201).json({ 
            message: 'User registered successfully. Please check your email to verify your account.',
            userId,
            emailSent: true
          });
        } else {
          // User created but email failed to send
          res.status(201).json({ 
            message: 'User registered successfully, but verification email could not be sent. Please contact support.',
            userId,
            emailSent: false
          });
        }
      } else {
        res.status(500).json({ message: 'Failed to create user' });
      }
    }
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ error: error.message });
  }
};

export const login = async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.getUserByEmail(email);
    if (!user) return res.status(400).json({ message: 'User not found' });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ message: 'Incorrect password' });

    // Check if email is verified (only for manual registration, not social auth)
    if (user.social_provider === null && !user.email_verified) {
      return res.status(403).json({ 
        message: 'Please verify your email address before logging in. Check your inbox for a verification link.',
        emailNotVerified: true
      });
    }

    // Generate JWT token
    const token = jwt.sign({ id: user.id, user_type: user.user_type }, 'secret_key', { expiresIn: '1h' });

    res.cookie('token', token, {
      httpOnly: true,
      secure: true, // set to true in production (requires HTTPS)
      sameSite: 'None',
      maxAge: 3600000
    });
  
    return res.json({ message: 'Login successful', user_type: user.user_type });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: error.message });
  }
};

// Verify email endpoint
export const verifyEmail = async (req, res) => {
  const { token } = req.params;

  try {
    const user = await User.getUserByVerificationToken(token);
    
    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired verification token' });
    }

    const success = await User.verifyUserEmail(user.ID);
    
    if (success) {
      res.json({ message: 'Email verified successfully! You can now log in to your account.' });
    } else {
      res.status(500).json({ message: 'Failed to verify email' });
    }
  } catch (error) {
    console.error('Email verification error:', error);
    res.status(500).json({ error: error.message });
  }
};

// Resend verification email
export const resendVerificationEmail = async (req, res) => {
  const { email } = req.body;

  try {
    const user = await User.getUserByEmail(email);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.email_verified) {
      return res.status(400).json({ message: 'Email is already verified' });
    }

    if (user.social_provider) {
      return res.status(400).json({ message: 'Social media users do not need email verification' });
    }

    // Generate new verification token
    const newToken = generateVerificationToken();
    const tokenUpdated = await User.updateVerificationToken(user.id, newToken);

    if (tokenUpdated) {
      const emailResult = await sendVerificationEmail(user.email, user.name, newToken);
      
      if (emailResult.success) {
        res.json({ message: 'Verification email sent successfully' });
      } else {
        res.status(500).json({ message: 'Failed to send verification email' });
      }
    } else {
      res.status(500).json({ message: 'Failed to update verification token' });
    }
  } catch (error) {
    console.error('Resend verification error:', error);
    res.status(500).json({ error: error.message });
  }
};

