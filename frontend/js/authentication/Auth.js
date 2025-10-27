import axios from 'axios';
import { BASE_URL } from "../AddressSelection.js";
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

// Check for return parameter and set pending booking data
const urlParams = new URLSearchParams(window.location.search);
const returnParam = urlParams.get('return');
console.log('Page loaded - URL return parameter:', returnParam);

if (returnParam === 'payment') {
  // User came from payment page, ensure we have pending booking data
  const currentBooking = sessionStorage.getItem('currentBooking');
  console.log('Return=payment detected, current booking:', currentBooking);
  if (currentBooking && !sessionStorage.getItem('pendingBookingData')) {
    sessionStorage.setItem('pendingBookingData', currentBooking);
    console.log('Set pending booking data from current booking');
  }
}

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

    // Show loading state for signup
    const loadingOverlay = document.getElementById('loadingOverlay');
    const submitButton = document.querySelector('.signupSubmit');
    const loadingText = document.querySelector('.loading-text');
    
    if (loadingOverlay) loadingOverlay.classList.add('show');
    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = 'Creating Account...';
    }

    // Update loading text after a short delay to show progress
    setTimeout(() => {
      if (loadingText) loadingText.textContent = 'Setting up your profile...';
    }, 1000);

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
      
      // Check if there's pending booking data
      const pendingBookingData = sessionStorage.getItem('pendingBookingData');
      if (pendingBookingData) {
        // Keep the pending data and redirect to login
        window.location.href = '/pages/authentication/login.html';
      } else {
        window.location.href = '/pages/authentication/login.html';
      }
    } catch (err) {
      // Reset signup button state and hide loading overlay
      const loadingOverlay = document.getElementById('loadingOverlay');
      const submitButton = document.querySelector('.signupSubmit');
      
      if (loadingOverlay) loadingOverlay.classList.remove('show');
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = 'Sign Up';
      }
      
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

    // Show loading state
    const loadingOverlay = document.getElementById('loadingOverlay');
    const submitButton = document.querySelector('.loginSubmit');
    const loadingText = document.querySelector('.loading-text');
    
    if (loadingOverlay) loadingOverlay.classList.add('show');
    if (submitButton) {
      submitButton.classList.add('loading');
      submitButton.disabled = true;
      submitButton.textContent = 'Logging in...';
    }

    // Update loading text after a short delay to show progress
    setTimeout(() => {
      if (loadingText) loadingText.textContent = 'Verifying credentials...';
    }, 1000);

    try {
      const response = await axios.post(`${BASE_URL}/auth/login`, {
        email: loginEmail.value.trim(),
        password: loginPassword.value
      }, {
        withCredentials: true  
      });

      const userType = response.data.user_type;

      // Store user data in localStorage for profile page
      if (response.data.user) {
        localStorage.setItem('userProfile', JSON.stringify(response.data.user));
      }

      // Update logout button visibility
      checkAuthStatus();

      // Check if there's pending booking data (user came from payment page)
      const pendingBookingData = sessionStorage.getItem('pendingBookingData');
      console.log('Login successful - checking for pending booking data:', pendingBookingData);
      console.log('URL parameters:', window.location.search);
      console.log('Return parameter:', urlParams.get('return'));
      
      if (userType === 'admin') {
        window.location.href = '/pages/admin/admin.html';
      } else if (userType === 'client') {
        if (pendingBookingData) {
          // Restore booking data and redirect to payment page
          sessionStorage.setItem('currentBooking', pendingBookingData);
          sessionStorage.removeItem('pendingBookingData');
          console.log('Redirecting to payment page with restored booking data');
          window.location.href = '/pages/customer/booking-payment.html';
        } else if (returnParam === 'payment') {
          // Fallback: if return=payment but no pending data, still redirect to payment
          console.log('Return=payment detected but no pending data, redirecting to payment page anyway');
          window.location.href = '/pages/customer/booking-payment.html';
        } else {
          console.log('No pending booking data found, redirecting to client page');
          window.location.href = '/pages/customer/client.html';
        }
      } else {
        if (errorEl) errorEl.textContent = 'Unknown user type.';
      }

    } catch (err) {
      // Hide loading state on error
      const loadingOverlay = document.getElementById('loadingOverlay');
      const submitButton = document.querySelector('.loginSubmit');
      
      if (loadingOverlay) loadingOverlay.classList.remove('show');
      if (submitButton) {
        submitButton.classList.remove('loading');
        submitButton.disabled = false;
        submitButton.textContent = 'Login';
      }
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

// Forgot Password Functions
const showForgotPassword = () => {
  const modal = document.getElementById('forgotPasswordModal');
  const form = document.getElementById('forgotPasswordForm');
  const successDiv = document.querySelector('.forgot-password-success');
  const errorDiv = document.querySelector('.forgotPasswordError');
  
  // Reset form and messages
  form.style.display = 'block';
  successDiv.style.display = 'none';
  errorDiv.textContent = '';
  form.reset();
  
  modal.style.display = 'block';
};

const closeForgotPasswordModal = () => {
  const modal = document.getElementById('forgotPasswordModal');
  modal.style.display = 'none';
};

const handleForgotPassword = async (event) => {
  event.preventDefault();
  
  const form = event.target;
  const email = form.email.value.trim();
  const errorDiv = document.querySelector('.forgotPasswordError');
  const successDiv = document.querySelector('.forgot-password-success');
  const submitBtn = form.querySelector('.reset-password-btn');
  
  // Clear previous errors
  errorDiv.textContent = '';
  
  if (!email) {
    errorDiv.textContent = 'Please enter your email address';
    return;
  }
  
  // Disable button and show loading
  submitBtn.disabled = true;
  submitBtn.textContent = 'Sending...';
  
  try {
    const response = await axios.post(`${BASE_URL}/auth/forgot-password`, {
      email: email
    });
    
    if (response.data.success) {
      // Show success message
      form.style.display = 'none';
      successDiv.style.display = 'block';
      
      // If in development mode, show the reset URL
      if (response.data.developmentMode && response.data.resetUrl) {
        const successMessage = document.querySelector('.forgot-password-success p');
        if (successMessage) {
          successMessage.innerHTML = `
            ✅ Reset link generated successfully!<br>
            <strong>Development Mode:</strong> Click the link below to reset your password:<br>
            <a href="${response.data.resetUrl}" target="_blank" style="color: #FFD737; text-decoration: underline;">
              ${response.data.resetUrl}
            </a>
          `;
        }
      }
    } else {
      errorDiv.textContent = response.data.message || 'Failed to send reset link';
    }
  } catch (error) {
    console.error('Forgot password error:', error);
    
    if (error.response?.status === 404) {
      errorDiv.textContent = 'Email address not found. Please check your email or sign up.';
    } else if (error.response?.status === 429) {
      errorDiv.textContent = 'Too many requests. Please wait a few minutes before trying again.';
    } else {
      errorDiv.textContent = error.response?.data?.message || 'Failed to send reset link. Please try again.';
    }
  } finally {
    // Re-enable button
    submitBtn.disabled = false;
    submitBtn.textContent = 'Send Reset Link';
  }
};

// Make functions globally available
window.showForgotPassword = showForgotPassword;
window.closeForgotPasswordModal = closeForgotPasswordModal;

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  // Add forgot password form event listener
  const forgotPasswordForm = document.getElementById('forgotPasswordForm');
  if (forgotPasswordForm) {
    forgotPasswordForm.addEventListener('submit', handleForgotPassword);
  }

  // Close modal when clicking outside
  const forgotPasswordModal = document.getElementById('forgotPasswordModal');
  if (forgotPasswordModal) {
    forgotPasswordModal.addEventListener('click', (event) => {
      if (event.target === forgotPasswordModal) {
        closeForgotPasswordModal();
      }
    });
  }
});

//=== FUNCTIONS ===