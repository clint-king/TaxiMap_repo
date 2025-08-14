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
    const token = jwt.sign({ id: user.ID, user_type: user.user_type }, 'secret_key', { expiresIn: '1h' });

    res.cookie('token', token, {
      httpOnly: true,
      secure: true, // set to true in production (requires HTTPS)
      sameSite: 'None',
      maxAge: 3600000
    });

    // Split name into firstName and lastName
    const nameParts = user.name ? user.name.split(' ') : ['', ''];
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';

    const userData = {
      id: user.ID,
      firstName,
      lastName,
      username: user.username,
      email: user.email,
      phone: user.phone,
      location: user.location,
      profilePicture: user.profile_picture,
      user_type: user.user_type,
      email_verified: user.email_verified,
      social_provider: user.social_provider
    };
  
    return res.json({ message: 'Login successful', user_type: user.user_type, user: userData });
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
    const tokenUpdated = await User.updateVerificationToken(user.ID, newToken);

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

// Get user profile
export const getProfile = async (req, res) => {
  try {
    // Get user from authentication middleware
    console.log("req.user:", req.user);
    console.log("Getting profile for user ID:", req.user.id);
    
    // Check if user ID exists in JWT
    if (!req.user.id) {
      console.error('No user ID found in JWT token');
      return res.status(401).json({ message: 'Invalid authentication token' });
    }
    
    const user = await User.getUserById(req.user.id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Split name into firstName and lastName
    const nameParts = user.name ? user.name.split(' ') : ['', ''];
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';

    const profileData = {
      id: user.ID,
      firstName,
      lastName,
      username: user.username,
      email: user.email,
      phone: user.phone,
      location: user.location,
      profilePicture: user.profile_picture,
      user_type: user.user_type,
      email_verified: user.email_verified,
      social_provider: user.social_provider
    };

    res.json({ success: true, user: profileData });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ message: 'Failed to get profile', error: error.message });
  }
};

// Update user profile
export const updateProfile = async (req, res) => {
  try {
    console.log("req.user:", req.user);
    console.log("Getting profile for user ID:", req.user.id);
    
    // Check if user ID exists in JWT
    if (!req.user.id) {
      console.error('No user ID found in JWT token');
      return res.status(401).json({ message: 'Invalid authentication token' });
    }
    
    // Get user from authentication middleware
    const user = await User.getUserById(req.user.id);
  
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const { name, username, phone, location, profile_picture } = req.body;

    // Check if username is already taken by another user
    if (username && username !== user.username) {
      const existingUser = await User.getUserByUsername(username);
      if (existingUser && existingUser.ID !== user.ID) {
        return res.status(400).json({ message: 'Username is already taken' });
      }
    }

    // Update profile
    const success = await User.updateUserProfile(user.ID, {
      name,
      username,
      phone,
      location,
      profile_picture
    });

    if (success) {
      // Get updated user data
      const updatedUser = await User.getUserById(user.ID);
      const nameParts = updatedUser.name ? updatedUser.name.split(' ') : ['', ''];
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';

      const profileData = {
        id: updatedUser.ID,
        firstName,
        lastName,
        username: updatedUser.username,
        email: updatedUser.email,
        phone: updatedUser.phone,
        location: updatedUser.location,
        profilePicture: updatedUser.profile_picture,
        user_type: updatedUser.user_type,
        email_verified: updatedUser.email_verified,
        social_provider: updatedUser.social_provider
      };

      res.json({ success: true, user: profileData, message: 'Profile updated successfully' });
    } else {
      res.status(500).json({ message: 'Failed to update profile' });
    }
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ message: 'Failed to update profile', error: error.message });
  }
};

// Change password
export const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    // Get user from authentication middleware
    const user = await User.getUserById(req.user.id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Verify current password
    const match = await bcrypt.compare(currentPassword, user.password);
    if (!match) {
      return res.status(401).json({ message: 'Current password is incorrect' });
    }

    // Hash new password
    const hashedNewPassword = await bcrypt.hash(newPassword, 10);

    // Update password in database
    const success = await User.updatePassword(user.ID, hashedNewPassword);

    if (success) {
      res.json({ success: true, message: 'Password changed successfully' });
    } else {
      res.status(500).json({ message: 'Failed to update password' });
    }
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ message: 'Failed to change password', error: error.message });
  }
};

// Change email
export const changeEmail = async (req, res) => {
  try {
    const { newEmail, currentPassword } = req.body;
    
    // Get user from authentication middleware
    const user = await User.getUserById(req.user.id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Verify current password
    const match = await bcrypt.compare(currentPassword, user.password);
    if (!match) {
      return res.status(401).json({ message: 'Current password is incorrect' });
    }

    // Check if new email is already taken
    const existingUser = await User.getUserByEmail(newEmail);
    if (existingUser && existingUser.ID !== user.ID) {
      return res.status(400).json({ message: 'Email is already taken by another user' });
    }

    // Check if email configuration is properly set up
    const isEmailConfigured = process.env.EMAIL_USER && 
                             process.env.EMAIL_PASS && 
                             process.env.EMAIL_USER !== 'your-email@gmail.com' &&
                             process.env.EMAIL_PASS !== 'your-app-password';

    if (!isEmailConfigured) {
      // Development mode: Update email directly
      const success = await User.updateEmail(user.ID, newEmail);
      
      if (success) {
        res.json({ 
          success: true, 
          message: 'Email changed successfully! Email verification skipped for development.',
          emailSent: false,
          autoVerified: true
        });
      } else {
        res.status(500).json({ message: 'Failed to update email' });
      }
    } else {
      // Production mode: Send verification email
      const verificationToken = generateVerificationToken();
      const success = await User.updateEmailWithVerification(user.ID, newEmail, verificationToken);
      
      if (success) {
        // Send verification email
        const emailResult = await sendVerificationEmail(newEmail, user.name, verificationToken);
        
        if (emailResult.success) {
          res.json({ 
            success: true,
            message: 'Email change request sent. Please check your new email to verify the change.',
            emailSent: true
          });
        } else {
          res.status(500).json({ message: 'Failed to send verification email' });
        }
      } else {
        res.status(500).json({ message: 'Failed to update email' });
      }
    }
  } catch (error) {
    console.error('Change email error:', error);
    res.status(500).json({ message: 'Failed to change email', error: error.message });
  }
};

