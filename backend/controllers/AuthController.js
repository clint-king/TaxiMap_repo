import User from '../models/userModel.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { generateVerificationToken, sendVerificationEmail, sendPasswordResetEmail } from '../services/emailService.js';
import config from "../config/configurations.js";


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

    // Check if email is verified
    if (!user.email_verified) {
      return res.status(403).json({ 
        message: 'Please verify your email address before logging in. Check your inbox for a verification link.',
        emailNotVerified: true
      });
    }

    // Generate JWT token
    const token = jwt.sign({ id: user.ID, user_type: user.user_type }, config.jwt.secret, { expiresIn: '1h' });

    res.cookie('token', token, {
      httpOnly: config.cookies.httpOnly,
      secure: config.cookies.secure,
      sameSite: config.cookies.sameSite,
      maxAge: config.cookies.maxAge
    });

    // Log successful login activity
    await User.logUserActivity(user.ID, {
      activity_type: 'login',
      activity_title: 'Login successful',
      activity_description: `User logged in successfully from ${getDeviceInfo(req.get('User-Agent'))}`,
      ip_address: req.ip || req.connection.remoteAddress,
      user_agent: req.get('User-Agent'),
      device_info: getDeviceInfo(req.get('User-Agent')),
      location_info: null
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
      email_verified: user.email_verified
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
        email_verified: user.email_verified
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
      // Log profile update activity
      await User.logUserActivity(user.ID, {
        activity_type: 'profile',
        activity_title: 'Profile information updated',
        activity_description: 'User updated their profile information',
        ip_address: req.ip || req.connection.remoteAddress,
        user_agent: req.get('User-Agent'),
        device_info: getDeviceInfo(req.get('User-Agent')),
        location_info: null
      });

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
        email_verified: updatedUser.email_verified
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
      // Log password change activity
      await User.logUserActivity(user.ID, {
        activity_type: 'security',
        activity_title: 'Password changed successfully',
        activity_description: 'User changed their account password',
        ip_address: req.ip || req.connection.remoteAddress,
        user_agent: req.get('User-Agent'),
        device_info: getDeviceInfo(req.get('User-Agent')),
        location_info: null
      });

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
          // Log email change activity
          await User.logUserActivity(user.ID, {
            activity_type: 'security',
            activity_title: 'Email change requested',
            activity_description: `Email change requested from ${user.email} to ${newEmail}`,
            ip_address: req.ip || req.connection.remoteAddress,
            user_agent: req.get('User-Agent'),
            device_info: getDeviceInfo(req.get('User-Agent')),
            location_info: null
          });

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

// Forgot password
export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    // Check if user exists
    const user = await User.getUserByEmail(email);
    if (!user) {
      return res.status(404).json({ message: 'Email address not found' });
    }

    // Generate reset token
    const resetToken = generateVerificationToken();
    const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now

    // Save reset token to database
    const success = await User.saveResetToken(user.ID, resetToken, resetTokenExpiry);
    
    if (!success) {
      return res.status(500).json({ message: 'Failed to generate reset token' });
    }

    // Check if email configuration is properly set up
    const isEmailConfigured = process.env.EMAIL_USER && 
                             process.env.EMAIL_PASS && 
                             process.env.EMAIL_USER !== 'your-email@gmail.com' &&
                             process.env.EMAIL_PASS !== 'your-app-password';

    if (!isEmailConfigured) {
      // Development mode: Return token directly
      const resetUrl = `${config.frontend.url}/reset-password.html?token=${resetToken}`;
      res.json({ 
        success: true, 
        message: 'Password reset link generated successfully!',
        resetUrl: resetUrl,
        emailSent: false,
        developmentMode: true
      });
    } else {
      // Production mode: Send email
      const resetUrl = `${config.frontend.url}/reset-password.html?token=${resetToken}`;
      const emailResult = await sendPasswordResetEmail(email, user.name, resetUrl);
      
      if (emailResult.success) {
        res.json({ 
          success: true, 
          message: 'Password reset link sent to your email',
          emailSent: true
        });
      } else {
        res.status(500).json({ message: 'Failed to send reset email' });
      }
    }
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ message: 'Failed to process forgot password request', error: error.message });
  }
};

// Reset password
export const resetPassword = async (req, res) => {
  try {
    console.log('Reset password request body:', req.body);
    const { token, newPassword } = req.body;
    
    console.log('Token:', token);
    console.log('New password length:', newPassword ? newPassword.length : 'undefined');
    
    if (!token || !newPassword) {
      console.log('Missing token or password');
      return res.status(400).json({ message: 'Token and new password are required' });
    }

    // Validate password strength
    if (newPassword.length < 6) {
      console.log('Password too short');
      return res.status(400).json({ message: 'Password must be at least 6 characters long' });
    }

    // Find user by reset token
    console.log('Looking for user with reset token:', token);
    const user = await User.getUserByResetToken(token);
    console.log('User found:', user ? 'Yes' : 'No');
    
    if (!user) {
      console.log('No user found with this reset token');
      return res.status(400).json({ message: 'Invalid or expired reset token' });
    }

    // Check if token is expired
    console.log('Token expiry:', user.reset_token_expiry);
    console.log('Current time:', new Date());
    if (new Date() > new Date(user.reset_token_expiry)) {
      console.log('Token has expired');
      return res.status(410).json({ message: 'Reset token has expired' });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password and clear reset token
    const success = await User.resetPassword(user.ID, hashedPassword);
    console.log('Password reset success:', success);
    
    if (success) {
      // Log the password reset activity
      await User.logUserActivity(user.ID, {
        activity_type: 'security',
        activity_title: 'Password reset successfully',
        activity_description: 'User reset their password using forgot password link',
        ip_address: req.ip || req.connection.remoteAddress,
        user_agent: req.get('User-Agent'),
        device_info: getDeviceInfo(req.get('User-Agent')),
        location_info: null
      });
      
      res.json({ success: true, message: 'Password reset successfully' });
    } else {
      res.status(500).json({ message: 'Failed to reset password' });
    }
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ message: 'Failed to reset password', error: error.message });
  }
};

// Get user activities
export const getUserActivities = async (req, res) => {
  try {
    const userId = req.user.id;
    const { limit = 50, offset = 0, type } = req.query;
    
    // Ensure limit and offset are valid numbers
    const parsedLimit = parseInt(limit) || 50;
    const parsedOffset = parseInt(offset) || 0;
    
    console.log('Getting activities for user:', userId);
    console.log('Limit:', parsedLimit, 'Offset:', parsedOffset);
    
    let activities = await User.getUserActivities(userId, parsedLimit, parsedOffset);
    
    // Filter by type if specified
    if (type && type !== 'all') {
      activities = activities.filter(activity => activity.activity_type === type);
    }
    
    res.json({ success: true, activities });
  } catch (error) {
    console.error('Get user activities error:', error);
    res.status(500).json({ message: 'Failed to get user activities', error: error.message });
  }
};

// Get user activity stats
export const getUserActivityStats = async (req, res) => {
  try {
    const userId = req.user.id;
    const stats = await User.getUserActivityStats(userId);
    
    res.json({ success: true, stats });
  } catch (error) {
    console.error('Get user activity stats error:', error);
    res.status(500).json({ message: 'Failed to get user activity stats', error: error.message });
  }
};

// Create user activity
export const createUserActivity = async (req, res) => {
  try {
    const userId = req.user.id;
    const { activity_type, activity_title, activity_description, ip_address, user_agent, device_info, location_info } = req.body;
    
    const activityId = await User.logUserActivity(userId, {
      activity_type,
      activity_title,
      activity_description,
      ip_address: ip_address || req.ip || req.connection.remoteAddress,
      user_agent: user_agent || req.get('User-Agent'),
      device_info: device_info || getDeviceInfo(req.get('User-Agent')),
      location_info
    });
    
    if (activityId) {
      res.json({ success: true, activityId });
    } else {
      res.status(500).json({ message: 'Failed to log activity' });
    }
  } catch (error) {
    console.error('Create user activity error:', error);
    res.status(500).json({ message: 'Failed to create activity', error: error.message });
  }
};

// Helper function to get device info from user agent
const getDeviceInfo = (userAgent) => {
  if (!userAgent) return 'Unknown';
  
  if (userAgent.includes('Mobile')) {
    if (userAgent.includes('iPhone')) return 'iPhone';
    if (userAgent.includes('Android')) return 'Android';
    return 'Mobile Device';
  }
  
  if (userAgent.includes('Windows')) return 'Windows';
  if (userAgent.includes('Mac')) return 'Mac';
  if (userAgent.includes('Linux')) return 'Linux';
  
  return 'Desktop';
};

