// configurations.js
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from .env.development file in backend root
if (process.env.NODE_ENV !== "production") {
  dotenv.config({ path: path.join(__dirname, "..", ".env.development") });
}

const config = {
  // Environment
  env: process.env.NODE_ENV || "development",
  port: process.env.PORT || 3000,
  
  // Database Configuration
  database: {
    host: process.env.DB_HOST || "localhost",
    user: process.env.DB_USER || "Taxi Map database",
    password: process.env.DB_PASSWORD || "12345",
    name: process.env.DB_NAME || "taximapdb",
    port: process.env.DB_PORT || 3306
  },
  
  // JWT Configuration
  jwt: {
    secret: process.env.JWT_SECRET || "your_jwt_secret_key"
  },
  
  // Email Configuration (Gmail SMTP)
  email: {
    host: process.env.EMAIL_HOST || "smtp.gmail.com",
    port: process.env.EMAIL_PORT || 587,
    user: process.env.EMAIL_USER || "fiqaroute@gmail.com",
    pass: process.env.EMAIL_PASS || "mxnnbgoxliutdchs"
  },
  
  // Frontend URL
  frontend: {
    url: process.env.FRONTEND_URL || "http://localhost:5173"
  },

  
  // Social Authentication Credentials
  social: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID || "281004449891-d3ppc025rdoeugjnuogaoelfa2prur7q.apps.googleusercontent.com",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "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",
      redirectUri: process.env.GOOGLE_REDIRECT_URI || "http://localhost:3000/auth/google/callback"
    },
    facebook: {
      appId: process.env.FACEBOOK_APP_ID || "your_facebook_app_id",
      appSecret: process.env.FACEBOOK_APP_SECRET || "your_facebook_app_secret",
      redirectUri: process.env.FACEBOOK_REDIRECT_URI || "http://localhost:3000/auth/facebook/callback"
    },
    twitter: {
      consumerKey: process.env.TWITTER_CONSUMER_KEY || "your_twitter_consumer_key",
      consumerSecret: process.env.TWITTER_CONSUMER_SECRET || "your_twitter_consumer_secret",
      callbackUrl: process.env.TWITTER_CALLBACK_URL || "http://localhost:3000/auth/twitter/callback"
    },
    instagram: {
      clientId: process.env.INSTAGRAM_CLIENT_ID || "your_instagram_client_id",
      clientSecret: process.env.INSTAGRAM_CLIENT_SECRET || "your_instagram_client_secret",
      redirectUri: process.env.INSTAGRAM_REDIRECT_URI || "http://localhost:3000/auth/instagram/callback"
    }
  },
  
  // Cookie Configuration
  cookies: {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "None" : "Lax",
    maxAge: 3600000 // 1 hour
  }
};

// Print config values to console
console.log('🔧 BACKEND CONFIGURATION VALUES:');
console.log('================================');
console.log(`Environment: ${config.env}`);
console.log(`Port: ${config.port}`);
console.log(`Frontend URL: ${config.frontend.url}`);
console.log('');
console.log('📊 Database Configuration:');
console.log(`  Host: ${config.database.host}`);
console.log(`  User: ${config.database.user}`);
console.log(`  Database: ${config.database.name}`);
console.log(`  Port: ${config.database.port}`);
console.log(`  Password: ${config.database.password ? '***SET***' : '***NOT SET***'}`);
console.log('');
console.log('🔐 JWT Configuration:');
console.log(`  Secret: ${config.jwt.secret ? '***SET***' : '***NOT SET***'}`);
console.log('');
console.log('📧 Email Configuration:');
console.log(`  Host: ${config.email.host}`);
console.log(`  Port: ${config.email.port}`);
console.log(`  User: ${config.email.user}`);
console.log(`  Password: ${config.email.pass ? '***SET***' : '***NOT SET***'}`);
console.log('');
console.log('🍪 Cookie Configuration:');
console.log(`  HttpOnly: ${config.cookies.httpOnly}`);
console.log(`  Secure: ${config.cookies.secure}`);
console.log(`  SameSite: ${config.cookies.sameSite}`);
console.log(`  MaxAge: ${config.cookies.maxAge}ms`);
console.log('');
console.log('🔗 Social Auth Configuration:');
console.log(`  Google Client ID: ${config.social.google.clientId ? '***SET***' : '***NOT SET***'}`);
console.log(`  Google Client Secret: ${config.social.google.clientSecret ? '***SET***' : '***NOT SET***'}`);
console.log(`  Facebook App ID: ${config.social.facebook.appId ? '***SET***' : '***NOT SET***'}`);
console.log(`  Twitter Consumer Key: ${config.social.twitter.consumerKey ? '***SET***' : '***NOT SET***'}`);
console.log(`  Instagram Client ID: ${config.social.instagram.clientId ? '***SET***' : '***NOT SET***'}`);
console.log('================================');

export default config;