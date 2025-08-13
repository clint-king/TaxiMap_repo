# Social Authentication Troubleshooting Guide

## 🚨 Current Issues Fixed

### 1. Content Security Policy (CSP) Violations
**Problem**: Google Sign-In scripts were being blocked by CSP
**Solution**: Added proper CSP headers to allow Google and Facebook domains

### 2. Invalid Client IDs
**Problem**: Using placeholder values like `YOUR_GOOGLE_CLIENT_ID`
**Solution**: Created separate configuration file with validation

### 3. CORS/Origin Issues
**Problem**: Google OAuth rejecting requests due to unauthorized client ID
**Solution**: Proper configuration validation and error handling

## 🔧 Quick Fix Steps

### Step 1: Update Social Authentication Configuration

Edit `frontend/js/socialAuthConfig.js` and replace the placeholder values:

```javascript
export const SOCIAL_CONFIG = {
  google: {
    clientId: '123456789-abcdefghijklmnop.apps.googleusercontent.com', // Your actual Google Client ID
    scope: 'email profile'
  },
  facebook: {
    appId: '123456789012345', // Your actual Facebook App ID
    scope: 'email,public_profile'
  },
  // ... other configs
};
```

### Step 2: Get Your API Keys

#### Google OAuth Setup:
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable Google+ API and Google OAuth2 API
4. Go to "Credentials" → "Create Credentials" → "OAuth 2.0 Client IDs"
5. Set application type to "Web application"
6. Add authorized JavaScript origins:
   - `http://localhost:5174`
   - `http://localhost:3000`
   - `http://127.0.0.1:5174`
7. Add authorized redirect URIs:
   - `http://localhost:5174`
   - `http://localhost:3000/api/auth/google/callback`
8. Copy the Client ID

#### Facebook OAuth Setup:
1. Go to [Facebook Developers](https://developers.facebook.com/)
2. Create a new app or select existing one
3. Add Facebook Login product
4. Go to "Settings" → "Basic"
5. Copy the App ID
6. Go to "Facebook Login" → "Settings"
7. Add Valid OAuth Redirect URIs:
   - `http://localhost:5174`
   - `http://localhost:3000/api/auth/facebook/callback`

### Step 3: Test the Configuration

1. Open browser console (F12)
2. Navigate to login/signup page
3. Check for configuration status messages:
   - ✅ "Social Authentication Configuration is valid"
   - ⚠️ "Social Authentication Configuration Issues" (if not configured)

## 🐛 Common Error Messages and Solutions

### Error: "Refused to load the script... violates Content Security Policy"
**Solution**: CSP headers are now properly configured in the HTML files

### Error: "401 (Unauthorized)" from Google
**Solution**: 
1. Ensure you're using a valid Google Client ID
2. Check that your domain is in the authorized origins
3. Verify the OAuth consent screen is configured

### Error: "Social authentication is not configured"
**Solution**: Update the configuration in `frontend/js/socialAuthConfig.js`

### Error: "Google API not loaded"
**Solution**: 
1. Check internet connection
2. Ensure Google APIs are accessible
3. Check browser console for CSP violations

## 🔍 Debugging Steps

### 1. Check Configuration Status
Open browser console and look for:
```javascript
// Should show configuration status
showConfigStatus();
```

### 2. Test Individual Providers
```javascript
// Test Google configuration
console.log(getSocialConfig().google);

// Test Facebook configuration  
console.log(getSocialConfig().facebook);
```

### 3. Check Network Requests
1. Open Developer Tools → Network tab
2. Try to sign in with Google/Facebook
3. Look for failed requests and their error messages

### 4. Verify Backend Setup
Ensure your backend has the required dependencies:
```bash
cd backend
npm install
```

## 🛠️ Development vs Production

### Development (localhost)
- Use development OAuth credentials
- Add `http://localhost:5174` to authorized origins
- Use HTTP (not HTTPS)

### Production
- Use production OAuth credentials  
- Add your domain to authorized origins
- Use HTTPS
- Update `FRONTEND_URL` in backend `.env`

## 📱 Mobile Testing

For mobile testing, you may need to:
1. Add your local IP address to authorized origins
2. Use `http://192.168.x.x:5174` instead of localhost
3. Ensure mobile browser supports the OAuth flow

## 🔒 Security Considerations

1. **Never commit API keys to version control**
2. **Use environment variables in production**
3. **Implement proper CORS settings**
4. **Add rate limiting for OAuth endpoints**
5. **Validate tokens server-side**

## 🆘 Still Having Issues?

### Check These Common Problems:

1. **Browser Extensions**: Disable ad blockers and privacy extensions
2. **Network Issues**: Check if Google/Facebook APIs are accessible
3. **CORS Issues**: Ensure backend CORS settings include frontend domain
4. **SSL Issues**: Some OAuth providers require HTTPS in production

### Debug Commands:

```javascript
// Check if Google API is loaded
console.log(typeof gapi);

// Check if Facebook SDK is loaded  
console.log(typeof FB);

// Test configuration
console.log(validateSocialConfig());

// Check current domain
console.log(window.location.origin);
```

### Contact Support:

If you're still experiencing issues:
1. Check browser console for specific error messages
2. Verify all configuration steps were followed
3. Test with a different browser
4. Check if the issue is specific to your environment

---

**Remember**: Social authentication requires proper setup of OAuth applications in the respective developer consoles. The placeholder values in the configuration file must be replaced with actual API keys for the system to work. 