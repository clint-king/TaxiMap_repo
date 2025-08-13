# Social Authentication Setup Guide

This guide will help you set up social media authentication (Google, Facebook, Twitter/X, and Instagram) for your TeksiMap application.

## 🚀 Features Implemented

- ✅ Google OAuth 2.0 Authentication
- ✅ Facebook OAuth Authentication  
- ✅ Twitter/X OAuth Authentication (Simplified)
- ✅ Instagram OAuth Authentication
- ✅ Automatic user registration/login
- ✅ Profile picture import from social accounts
- ✅ JWT token-based session management
- ✅ Responsive UI with social login buttons

## 📋 Prerequisites

1. **Node.js** (v14 or higher)
2. **MySQL** database
3. **Social Media Developer Accounts**:
   - Google Cloud Console
   - Facebook Developers
   - Twitter Developer Portal
   - Instagram Basic Display API

## 🔧 Backend Setup

### 1. Install Dependencies

```bash
cd backend
npm install
```

### 2. Database Migration

Run the SQL migration to add social authentication fields:

```sql
-- Run this in your MySQL database
ALTER TABLE users 
ADD COLUMN social_id VARCHAR(255) NULL,
ADD COLUMN social_provider VARCHAR(50) NULL,
ADD COLUMN profile_picture TEXT NULL,
ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;

-- Add indexes for better performance
CREATE INDEX idx_social_id_provider ON users(social_id, social_provider);
CREATE INDEX idx_email ON users(email);

-- Add unique constraint for social authentication
ALTER TABLE users 
ADD CONSTRAINT unique_social_user UNIQUE (social_id, social_provider);

-- Update existing users to have default user_type if not set
UPDATE users SET user_type = 'client' WHERE user_type IS NULL;
```

### 3. Environment Variables

Create a `.env` file in the backend directory:

```env
# Database
DB_HOST=localhost
DB_USER=your_db_user
DB_PASSWORD=your_db_password
DB_NAME=your_db_name

# JWT Secret
JWT_SECRET=your_jwt_secret_key

# Social Authentication Credentials
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI=http://localhost:3000/auth/google/callback

FACEBOOK_APP_ID=your_facebook_app_id
FACEBOOK_APP_SECRET=your_facebook_app_secret
FACEBOOK_REDIRECT_URI=http://localhost:3000/auth/facebook/callback

TWITTER_CONSUMER_KEY=your_twitter_consumer_key
TWITTER_CONSUMER_SECRET=your_twitter_consumer_secret
TWITTER_CALLBACK_URL=http://localhost:3000/auth/twitter/callback

INSTAGRAM_CLIENT_ID=your_instagram_client_id
INSTAGRAM_CLIENT_SECRET=your_instagram_client_secret
INSTAGRAM_REDIRECT_URI=http://localhost:3000/auth/instagram/callback
```

## 🔑 Social Media API Setup

### Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable Google+ API and Google OAuth2 API
4. Go to "Credentials" → "Create Credentials" → "OAuth 2.0 Client IDs"
5. Set application type to "Web application"
6. Add authorized redirect URIs:
   - `http://localhost:3000/auth/google/callback`
   - `http://localhost:5174/auth/google/callback` (for development)
7. Copy the Client ID and Client Secret

### Facebook OAuth Setup

1. Go to [Facebook Developers](https://developers.facebook.com/)
2. Create a new app or select existing one
3. Add Facebook Login product
4. Go to "Settings" → "Basic"
5. Add your domain to "App Domains"
6. Go to "Facebook Login" → "Settings"
7. Add Valid OAuth Redirect URIs:
   - `http://localhost:3000/auth/facebook/callback`
   - `http://localhost:5174/auth/facebook/callback`
8. Copy the App ID and App Secret

### Twitter OAuth Setup

1. Go to [Twitter Developer Portal](https://developer.twitter.com/)
2. Create a new app
3. Go to "Keys and Tokens"
4. Generate "Consumer Keys" (API Key and API Secret)
5. Set up OAuth 1.0a settings
6. Add callback URLs:
   - `http://localhost:3000/auth/twitter/callback`
   - `http://localhost:5174/auth/twitter/callback`

### Instagram OAuth Setup

1. Go to [Facebook Developers](https://developers.facebook.com/)
2. Create a new app or use existing Facebook app
3. Add Instagram Basic Display product
4. Go to "Instagram Basic Display" → "Basic Display"
5. Add your domain to "Valid OAuth Redirect URIs"
6. Copy the Instagram App ID and App Secret

## 🎨 Frontend Setup

### 1. Update Configuration

Update the social authentication configuration in `frontend/js/Auth.js`:

```javascript
const SOCIAL_CONFIG = {
  google: {
    clientId: 'YOUR_GOOGLE_CLIENT_ID', // Replace with your actual Google Client ID
    scope: 'email profile'
  },
  facebook: {
    appId: 'YOUR_FACEBOOK_APP_ID', // Replace with your actual Facebook App ID
    scope: 'email,public_profile'
  },
  // ... other configurations
};
```

### 2. Test the Implementation

1. Start your backend server:
   ```bash
   cd backend
   npm start
   ```

2. Start your frontend development server:
   ```bash
   cd frontend
   npm run dev
   ```

3. Navigate to `http://localhost:5174/login.html` or `http://localhost:5174/signup.html`

4. Test each social login button

## 🔒 Security Considerations

1. **HTTPS in Production**: Always use HTTPS in production for secure cookie transmission
2. **Environment Variables**: Never commit API keys to version control
3. **Token Validation**: Always validate tokens on the server side
4. **Rate Limiting**: Implement rate limiting for authentication endpoints
5. **Error Handling**: Implement proper error handling for failed authentications

## 🐛 Troubleshooting

### Common Issues

1. **CORS Errors**: Ensure your backend CORS settings include your frontend domain
2. **Invalid Redirect URI**: Double-check redirect URIs in social media developer consoles
3. **API Key Issues**: Verify API keys are correct and have proper permissions
4. **Database Connection**: Ensure database migration has been run successfully

### Debug Mode

Enable debug logging by setting:

```javascript
// In backend/controllers/socialAuthController.js
console.log('Debug info:', { user, socialId, provider });
```

## 📱 Mobile Considerations

For mobile applications, you may need to:

1. Use deep linking for OAuth callbacks
2. Implement platform-specific authentication flows
3. Handle app-to-web authentication transitions

## 🔄 API Endpoints

The following endpoints are now available:

- `POST /auth/google` - Google OAuth authentication
- `POST /auth/facebook` - Facebook OAuth authentication  
- `POST /auth/twitter` - Twitter OAuth authentication
- `POST /auth/instagram` - Instagram OAuth authentication
- `POST /auth/social` - Generic social authentication handler

## 📝 Notes

- Twitter OAuth implementation is simplified due to OAuth 1.0a complexity
- Instagram Basic Display API has limited profile information
- All social users are automatically assigned 'client' user type
- Profile pictures from social accounts are automatically imported
- JWT tokens are used for session management with 1-hour expiration

## 🆘 Support

If you encounter issues:

1. Check browser console for JavaScript errors
2. Check server logs for backend errors
3. Verify all environment variables are set correctly
4. Ensure database migration has been completed
5. Test with a fresh browser session

---

**Happy Coding! 🚀** 