import axios from 'axios';
import { BASE_URL } from "./AddressSelection.js";
import { getSocialConfig, validateSocialConfig, showConfigStatus } from "./socialAuthConfig.js";
import { checkAuthStatus } from "./logout.js";

axios.defaults.withCredentials = true;

 // === DOM ELEMENTS ===
//sign up 
 const signupName = document.querySelector(".signupName");
 const signupEmail = document.querySelector(".signupEmail");
 const signupPassword = document.querySelector(".signupPassword");
 const signupConfirm = document.querySelector(".signupConfirm");
 const signupSubmit = document.querySelector(".signupSubmit");

 //log in
 const loginEmail = document.querySelector(".loginEmail");
 const loginPassword = document.querySelector(".loginPassword");
 const loginSubmit = document.querySelector(".loginSubmit");


 //=== VARIABLES ===



// === EVENT LISTENERS ===
if (signupSubmit) {
  signupSubmit.addEventListener("click", async (e) => {
    e.preventDefault();

    if (
      signupName.value.trim() === '' ||
      signupEmail.value.trim() === '' ||
      signupPassword.value.trim() === '' ||
      signupConfirm.value.trim() === ''
    ) {
      return alert("Fill in all inputs");
    }

    if (signupPassword.value !== signupConfirm.value) {
        console.log("Passwords do not match");
      return alert("Passwords do not match");
    }

    try {
      const response = await axios.post(`${BASE_URL}/auth/signup`, {
        name: signupName.value,
        email: signupEmail.value.trim(),
        password: signupPassword.value
      });
      
      // Clear form inputs
      signupName.value = '';
      signupEmail.value = '';
      signupPassword.value = '';
      signupConfirm.value = '';
      
      // Show success message and redirect
      if (response.data.autoVerified) {
        alert("Registration successful! Email verification was skipped for development. You can now log in.");
      } else if (response.data.emailSent) {
        alert("Registration successful! Please check your email to verify your account before logging in.");
      } else {
        alert("Registration successful! However, we couldn't send the verification email. Please contact support.");
      }
      
      window.location.href = '/login.html';
    } catch (err) {
      console.error(err);
      const errorMessage = err.response?.data?.message || "Signup failed. Check your details or try again.";
      alert(errorMessage);
    }
  });
}


if (loginSubmit) {
  loginSubmit.addEventListener("click", async (e) => {
    e.preventDefault();

    // Clear any previous inline error
    const errorEl = document.querySelector('.loginError');
    if (errorEl) errorEl.textContent = '';

    if (loginEmail.value.trim() === '' || loginPassword.value.trim() === '') {
      if (errorEl) errorEl.textContent = 'Please fill in all inputs';
      return;
    }

    try {
      const response = await axios.post(`${BASE_URL}/auth/login`, {
        email: loginEmail.value.trim(),
        password: loginPassword.value
      }, {
  withCredentials:true  
});

      const userType = response.data.user_type;

      // Store user data in localStorage for profile page
      if (response.data.user) {
        localStorage.setItem('userProfile', JSON.stringify(response.data.user));
      }

      // Update logout button visibility
      checkAuthStatus();

      if (userType === 'admin') {
        window.location.href = '/admin.html';
      } else if (userType === 'client') {
        window.location.href = '/client.html';
      } else {
        if (errorEl) errorEl.textContent = 'Unknown user type.';
      }

    } catch (err) {
      console.error(err);
      
      if (err?.response?.status === 403 && err?.response?.data?.emailNotVerified) {
        // Email not verified
        const message = err.response.data.message;
        if (errorEl) errorEl.textContent = message;
      } else if (err?.response?.status === 401 || err?.response?.status === 400) {
        // Wrong credentials
        if (errorEl) errorEl.textContent = 'Email or password is wrong';
      } else {
        // Other errors
        const message = err?.response?.data?.message || 'Login failed. Please try again.';
        if (errorEl) errorEl.textContent = message;
      }
    }
  });
}

// Social Authentication Functions
const initializeSocialAuth = () => {
  const config = getSocialConfig();
  
  // Check configuration validity
  const validation = validateSocialConfig();
  if (!validation.isValid) {
    console.warn('Social authentication disabled due to configuration issues');
    return;
  }
  
  // Initialize Google Identity Services
  if (typeof google !== 'undefined' && google.accounts) {
    try {
      console.log('Initializing Google Identity Services with client ID:', config.google.clientId);
      google.accounts.id.initialize({
        client_id: config.google.clientId,
        auto_select: false,
        cancel_on_tap_outside: true,
        callback: (response) => {
          console.log('Google OAuth callback received:', response);
        }
      });
      console.log('Google Identity Services initialized successfully');
    } catch (error) {
      console.error('Google Identity Services initialization error:', error);
    }
  } else {
    console.warn('Google Identity Services not available');
  }

  // Initialize Facebook SDK
  if (typeof FB !== 'undefined') {
    FB.init({
      appId: config.facebook.appId,
      cookie: true,
      xfbml: true,
      version: 'v18.0'
    });
    console.log('Facebook SDK initialized successfully');
  }
};

// Google Authentication using Google Identity Services
const googleSignIn = async () => {
  try {
    const config = getSocialConfig();
    console.log("=== GOOGLE OAUTH DEBUG ===");
    console.log("Current origin:", window.location.origin);
    console.log("Current URL:", window.location.href);
    console.log("Client ID:", config.google.clientId);
    console.log("Client ID length:", config.google.clientId.length);
    console.log("==========================");
    
    if (config.google.clientId === 'YOUR_GOOGLE_CLIENT_ID') {
      showError('Google authentication is not configured. Please contact the administrator.');
      return;
    }
    
    // Check if Google Identity Services is available
    if (typeof google === 'undefined' || !google.accounts) {
      throw new Error('Google Identity Services not loaded');
    }

    // Initialize Google Identity Services
    google.accounts.id.initialize({
      client_id: config.google.clientId,
      callback: async (response) => {
        try {
          const accessToken = response.credential;
          
          const authResponse = await axios.post(`${BASE_URL}/auth/google`, {
            accessToken
          });

          handleSocialAuthSuccess(authResponse);
        } catch (error) {
          console.error('Google authentication callback error:', error);
          showError('Google authentication failed');
        }
      }
    });

    // Prompt the user to sign in
    google.accounts.id.prompt();
    
  } catch (error) {
    console.error('Google sign-in error:', error);
    showError('Google authentication failed');
  }
};

// Facebook Authentication
const facebookSignIn = async () => {
  try {
    const config = getSocialConfig();
    
    if (config.facebook.appId === 'YOUR_FACEBOOK_APP_ID') {
      showError('Facebook authentication is not configured. Please contact the administrator.');
      return;
    }
    
    if (typeof FB === 'undefined') {
      throw new Error('Facebook SDK not loaded');
    }

    const response = await new Promise((resolve, reject) => {
      FB.login((response) => {
        if (response.authResponse) {
          resolve(response.authResponse.accessToken);
        } else {
          reject(new Error('Facebook login failed'));
        }
      }, { scope: config.facebook.scope });
    });

    const authResponse = await axios.post(`${BASE_URL}/auth/facebook`, {
      accessToken: response
    });

    handleSocialAuthSuccess(authResponse);
  } catch (error) {
    console.error('Facebook sign-in error:', error);
    showError('Facebook authentication failed');
  }
};

// Twitter Authentication (Simplified)
const twitterSignIn = async () => {
  try {
    // For Twitter, we'll use a simplified approach
    // In a real implementation, you'd need OAuth 1.0a server-side flow
    const userData = prompt('Enter your Twitter username:');
    const email = prompt('Enter your email:');
    const name = prompt('Enter your name:');
    
    if (!userData || !email || !name) {
      throw new Error('Please provide all required information');
    }

    const response = await axios.post(`${BASE_URL}/auth/twitter`, {
      email,
      name,
      profilePicture: null
    });

    handleSocialAuthSuccess(response);
  } catch (error) {
    console.error('Twitter sign-in error:', error);
    showError('Twitter authentication failed');
  }
};

// Instagram Authentication
const instagramSignIn = async () => {
  try {
    const config = getSocialConfig();
    // Instagram Basic Display API requires server-side OAuth flow
    // For now, we'll redirect to Instagram OAuth
    const instagramAuthUrl = `https://api.instagram.com/oauth/authorize?client_id=${config.instagram.clientId}&redirect_uri=${encodeURIComponent(window.location.origin + '/auth/instagram/callback')}&scope=${config.instagram.scope}&response_type=code`;
    
    window.location.href = instagramAuthUrl;
  } catch (error) {
    console.error('Instagram sign-in error:', error);
    showError('Instagram authentication failed');
  }
};

// Handle successful social authentication
const handleSocialAuthSuccess = (response) => {
  const userType = response.data.user_type;
  
  // Store user data in localStorage for profile page
  if (response.data.user) {
    localStorage.setItem('userProfile', JSON.stringify(response.data.user));
  }

  // Update logout button visibility
  checkAuthStatus();

  // Redirect based on user type
  if (userType === 'admin') {
    window.location.href = '/admin.html';
  } else if (userType === 'client') {
    window.location.href = '/client.html';
  } else {
    showError('Unknown user type');
  }
};

// Show error message
const showError = (message) => {
  const errorEl = document.querySelector('.loginError') || document.querySelector('.signupError');
  if (errorEl) {
    errorEl.textContent = message;
  } else {
    alert(message);
  }
};

// Show resend verification option
const showResendVerification = () => {
  const verificationHelp = document.querySelector('.verification-help');
  if (verificationHelp) {
    verificationHelp.classList.add('show');
  }
};

// Make function globally available
window.showResendVerification = showResendVerification;

// Initialize social authentication when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  // Show configuration status in console
  showConfigStatus();
  
  // Test Google OAuth configuration
  testGoogleOAuthConfig();
  
  // Initialize social authentication
  initializeSocialAuth();
  
  // Add event listeners for social buttons
  const googleBtn = document.querySelector('.google-signin');
  const facebookBtn = document.querySelector('.facebook-signin');
  const twitterBtn = document.querySelector('.twitter-signin');
  const instagramBtn = document.querySelector('.instagram-signin');

  if (googleBtn) googleBtn.addEventListener('click', googleSignIn);
  if (facebookBtn) facebookBtn.addEventListener('click', facebookSignIn);
  if (twitterBtn) twitterBtn.addEventListener('click', twitterSignIn);
  if (instagramBtn) instagramBtn.addEventListener('click', instagramSignIn);
});

// Test Google OAuth configuration
const testGoogleOAuthConfig = () => {
  console.log("=== GOOGLE OAUTH CONFIGURATION TEST ===");
  console.log("Window location origin:", window.location.origin);
  console.log("Window location href:", window.location.href);
  console.log("Window location protocol:", window.location.protocol);
  console.log("Window location hostname:", window.location.hostname);
  console.log("Window location port:", window.location.port);
  
  const config = getSocialConfig();
  console.log("Google Client ID:", config.google.clientId);
  console.log("Google Client ID valid:", config.google.clientId && config.google.clientId !== 'YOUR_GOOGLE_CLIENT_ID');
  
  // Check if Google Identity Services is loaded
  console.log("Google Identity Services available:", typeof google !== 'undefined' && !!google.accounts);
  
  console.log("=====================================");
};


 //=== FUNCTIONS ===