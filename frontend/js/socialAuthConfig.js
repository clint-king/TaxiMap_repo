// Social Authentication Configuration
// IMPORTANT: Replace these placeholder values with your actual API keys and secrets
// You can get these from the respective developer consoles

// Environment variables (you can set these in your .env file or directly here)
const GOOGLE_CLIENT_ID = '281004449891-d3ppc025rdoeugjnuogaoelfa2prur7q.apps.googleusercontent.com'; // Replace with your actual Google Client ID
const FACEBOOK_APP_ID = 'DEMO_FACEBOOK_APP_ID'; // Replace with your actual Facebook App ID
const INSTAGRAM_CLIENT_ID = 'DEMO_INSTAGRAM_CLIENT_ID'; // Replace with your actual Instagram Client ID

export const SOCIAL_CONFIG = {
  google: {
    clientId: GOOGLE_CLIENT_ID,
    scope: 'email profile'
  },
  facebook: {
    appId: FACEBOOK_APP_ID,
    scope: 'email,public_profile'
  },
  twitter: {
    // Twitter OAuth 1.0a requires server-side implementation
    // For now, we'll use a simplified approach
    consumerKey: 'DEMO_TWITTER_CONSUMER_KEY',
    consumerSecret: 'DEMO_TWITTER_CONSUMER_SECRET'
  },
  instagram: {
    clientId: INSTAGRAM_CLIENT_ID,
    scope: 'user_profile,user_media'
  }
};

// Development vs Production configuration
export const getSocialConfig = () => {
  const isDevelopment = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
 
  if (isDevelopment) {
    // Development configuration
    // NOTE: Make sure your Google OAuth client ID is configured to allow these origins:
    // - http://localhost:5173 (Vite default port)
    // - http://localhost:5174 (Vite alternative port)
    // - http://localhost:3000 (Common dev port)
    // - http://localhost:8080 (Common dev port)
    // - http://127.0.0.1:5173
    // - http://127.0.0.1:5174
    // - http://127.0.0.1:3000
    // - http://127.0.0.1:8080
    return {
      ...SOCIAL_CONFIG,
      // You can override specific values for development here
      // google: { ...SOCIAL_CONFIG.google, clientId: 'dev-google-client-id' }
    };
  } else {
    // Production configuration
    return SOCIAL_CONFIG;
  }
};

// Validation function to check if configuration is properly set
export const validateSocialConfig = () => {
  const config = getSocialConfig();
  const errors = [];
  
  // Only validate Google OAuth since that's what we're using
  if (!config.google.clientId || config.google.clientId === 'YOUR_GOOGLE_CLIENT_ID' || config.google.clientId === 'DEMO_GOOGLE_CLIENT_ID') {
    errors.push('Google Client ID not configured');
  }
  
  // Facebook and Instagram are optional for now
  // if (!config.facebook.appId || config.facebook.appId === 'YOUR_FACEBOOK_APP_ID' || config.facebook.appId === 'DEMO_FACEBOOK_APP_ID') {
  //   errors.push('Facebook App ID not configured');
  // }
  
  // if (!config.instagram.clientId || config.instagram.clientId === 'YOUR_INSTAGRAM_CLIENT_ID' || config.instagram.clientId === 'DEMO_INSTAGRAM_CLIENT_ID') {
  //   errors.push('Instagram Client ID not configured');
  // }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

// Helper function to show configuration status
export const showConfigStatus = () => {
  const validation = validateSocialConfig();
  
  if (!validation.isValid) {
    console.warn('⚠️ Social Authentication Configuration Issues:');
    validation.errors.forEach(error => {
      console.warn(`  - ${error}`);
    });
    console.warn('Please update the configuration in frontend/js/socialAuthConfig.js');
    return false;
  }
  
  console.log('✅ Social Authentication Configuration is valid');
  return true;
}; 