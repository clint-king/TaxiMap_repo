import User from '../models/userModel.js';
import jwt from 'jsonwebtoken';
import axios from 'axios';

// Google OAuth
export const googleAuth = async (req, res) => {
  try {
    const { accessToken } = req.body;
    
    // Get user info from Google
    const googleResponse = await axios.get('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    
    const { id, email, name, picture } = googleResponse.data;
    
    // Check if user exists
    let user = await User.getUserByEmail(email);
    
    if (!user) {
      // Create new user
      const userId = await User.createSocialUser({
        name,
        email,
        socialId: id,
        socialProvider: 'google',
        profilePicture: picture
      });
      user = await User.getUserById(userId);
    }
    
    // Generate JWT token
    const token = jwt.sign(
      { id: user.id, user_type: user.user_type }, 
      'secret_key', 
      { expiresIn: '1h' }
    );
    
    res.cookie('token', token, {
      httpOnly: true,
      secure: true,
      sameSite: 'None',
      maxAge: 3600000
    });
    
    res.json({ 
      message: 'Google login successful', 
      user_type: user.user_type,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        profilePicture: user.profile_picture
      }
    });
    
  } catch (error) {
    console.error('Google auth error:', error);
    res.status(500).json({ error: 'Google authentication failed' });
  }
};

// Facebook OAuth
export const facebookAuth = async (req, res) => {
  try {
    const { accessToken } = req.body;
    
    // Get user info from Facebook
    const facebookResponse = await axios.get(`https://graph.facebook.com/me?fields=id,name,email,picture&access_token=${accessToken}`);
    
    const { id, email, name, picture } = facebookResponse.data;
    
    // Check if user exists
    let user = await User.getUserByEmail(email);
    
    if (!user) {
      // Create new user
      const userId = await User.createSocialUser({
        name,
        email,
        socialId: id,
        socialProvider: 'facebook',
        profilePicture: picture?.data?.url
      });
      user = await User.getUserById(userId);
    }
    
    // Generate JWT token
    const token = jwt.sign(
      { id: user.id, user_type: user.user_type }, 
      'secret_key', 
      { expiresIn: '1h' }
    );
    
    res.cookie('token', token, {
      httpOnly: true,
      secure: true,
      sameSite: 'None',
      maxAge: 3600000
    });
    
    res.json({ 
      message: 'Facebook login successful', 
      user_type: user.user_type,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        profilePicture: user.profile_picture
      }
    });
    
  } catch (error) {
    console.error('Facebook auth error:', error);
    res.status(500).json({ error: 'Facebook authentication failed' });
  }
};

// Twitter/X OAuth
export const twitterAuth = async (req, res) => {
  try {
    const { accessToken, accessTokenSecret } = req.body;
    
    // Note: Twitter API v2 requires more complex OAuth 1.0a implementation
    // For now, we'll use a simplified approach with user-provided info
    const { email, name, profilePicture } = req.body;
    
    // Check if user exists
    let user = await User.getUserByEmail(email);
    
    if (!user) {
      // Create new user
      const userId = await User.createSocialUser({
        name,
        email,
        socialId: `twitter_${Date.now()}`, // Generate unique ID
        socialProvider: 'twitter',
        profilePicture
      });
      user = await User.getUserById(userId);
    }
    
    // Generate JWT token
    const token = jwt.sign(
      { id: user.id, user_type: user.user_type }, 
      'secret_key', 
      { expiresIn: '1h' }
    );
    
    res.cookie('token', token, {
      httpOnly: true,
      secure: true,
      sameSite: 'None',
      maxAge: 3600000
    });
    
    res.json({ 
      message: 'Twitter login successful', 
      user_type: user.user_type,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        profilePicture: user.profile_picture
      }
    });
    
  } catch (error) {
    console.error('Twitter auth error:', error);
    res.status(500).json({ error: 'Twitter authentication failed' });
  }
};

// Instagram OAuth
export const instagramAuth = async (req, res) => {
  try {
    const { accessToken } = req.body;
    
    // Get user info from Instagram
    const instagramResponse = await axios.get(`https://graph.instagram.com/me?fields=id,username,account_type&access_token=${accessToken}`);
    
    const { id, username, account_type } = instagramResponse.data;
    
    // Get additional user info
    const userInfoResponse = await axios.get(`https://graph.instagram.com/me?fields=id,username,account_type,media_count&access_token=${accessToken}`);
    
    // For Instagram, we might not have email, so we'll use username
    const email = `${username}@instagram.user`;
    
    // Check if user exists
    let user = await User.getUserByEmail(email);
    
    if (!user) {
      // Create new user
      const userId = await User.createSocialUser({
        name: username,
        email,
        socialId: id,
        socialProvider: 'instagram',
        profilePicture: null // Instagram doesn't provide profile picture in basic API
      });
      user = await User.getUserById(userId);
    }
    
    // Generate JWT token
    const token = jwt.sign(
      { id: user.id, user_type: user.user_type }, 
      'secret_key', 
      { expiresIn: '1h' }
    );
    
    res.cookie('token', token, {
      httpOnly: true,
      secure: true,
      sameSite: 'None',
      maxAge: 3600000
    });
    
    res.json({ 
      message: 'Instagram login successful', 
      user_type: user.user_type,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        profilePicture: user.profile_picture
      }
    });
    
  } catch (error) {
    console.error('Instagram auth error:', error);
    res.status(500).json({ error: 'Instagram authentication failed' });
  }
};

// Generic social auth handler
export const socialAuth = async (req, res) => {
  try {
    const { provider, accessToken, userData } = req.body;
    
    let user;
    
    switch (provider) {
      case 'google':
        return await googleAuth(req, res);
      case 'facebook':
        return await facebookAuth(req, res);
      case 'twitter':
        return await twitterAuth(req, res);
      case 'instagram':
        return await instagramAuth(req, res);
      default:
        return res.status(400).json({ error: 'Unsupported provider' });
    }
    
  } catch (error) {
    console.error('Social auth error:', error);
    res.status(500).json({ error: 'Social authentication failed' });
  }
}; 