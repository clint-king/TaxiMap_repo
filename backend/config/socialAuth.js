// Social Authentication Configuration
// Replace these with your actual API keys and secrets

export const socialAuthConfig = {
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID || 'YOUR_GOOGLE_CLIENT_ID',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || 'YOUR_GOOGLE_CLIENT_SECRET',
    redirectUri: process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/auth/google/callback'
  },
  
  facebook: {
    appId: process.env.FACEBOOK_APP_ID || 'YOUR_FACEBOOK_APP_ID',
    appSecret: process.env.FACEBOOK_APP_SECRET || 'YOUR_FACEBOOK_APP_SECRET',
    redirectUri: process.env.FACEBOOK_REDIRECT_URI || 'http://localhost:3000/auth/facebook/callback'
  },
  
  twitter: {
    consumerKey: process.env.TWITTER_CONSUMER_KEY || 'YOUR_TWITTER_CONSUMER_KEY',
    consumerSecret: process.env.TWITTER_CONSUMER_SECRET || 'YOUR_TWITTER_CONSUMER_SECRET',
    callbackUrl: process.env.TWITTER_CALLBACK_URL || 'http://localhost:3000/auth/twitter/callback'
  },
  
  instagram: {
    clientId: process.env.INSTAGRAM_CLIENT_ID || 'YOUR_INSTAGRAM_CLIENT_ID',
    clientSecret: process.env.INSTAGRAM_CLIENT_SECRET || 'YOUR_INSTAGRAM_CLIENT_SECRET',
    redirectUri: process.env.INSTAGRAM_REDIRECT_URI || 'http://localhost:3000/auth/instagram/callback'
  }
};

// Frontend configuration (for client-side SDKs)
export const frontendConfig = {
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID || 'YOUR_GOOGLE_CLIENT_ID',
    scope: 'email profile'
  },
  
  facebook: {
    appId: process.env.FACEBOOK_APP_ID || 'YOUR_FACEBOOK_APP_ID',
    scope: 'email,public_profile'
  },
  
  instagram: {
    clientId: process.env.INSTAGRAM_CLIENT_ID || 'YOUR_INSTAGRAM_CLIENT_ID',
    scope: 'user_profile,user_media'
  }
}; 