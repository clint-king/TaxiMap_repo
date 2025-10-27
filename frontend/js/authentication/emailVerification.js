import { axios, handleSessionExpiration } from './sessionHandler.js';
import { BASE_URL } from '../AddressSelection.js';

// DOM elements
const loading = document.getElementById('loading');
const errorMessage = document.getElementById('errorMessage');
const successMessage = document.getElementById('successMessage');
const actionButtons = document.getElementById('actionButtons');
const resendSection = document.getElementById('resendSection');
const verificationTitle = document.getElementById('verificationTitle');
const verificationText = document.getElementById('verificationText');

// Get token from URL parameters         
const urlParams = new URLSearchParams(window.location.search);
const token = urlParams.get('token');

// Initialize verification process
document.addEventListener('DOMContentLoaded', () => {
  if (token) {
    verifyEmail(token);
  } else {
    showError('No verification token found. Please check your email for the correct verification link.');
    showResendSection();
  }
});

// Verify email function
async function verifyEmail(token) {
  try {
    showLoading(true);
    
    const response = await axios.get(`${BASE_URL}/auth/verify/${token}`);
    
    showLoading(false);
    showSuccess(response.data.message);
    showActionButtons();
    
  } catch (error) {
    showLoading(false);
    
    if (error.response) {
      const errorMsg = error.response.data.message || 'Verification failed';
      showError(errorMsg);
    } else {
      showError('Network error. Please check your internet connection and try again.');
    }
    
    showResendSection();
  }
}

// Resend verification email
async function resendVerification() {
  const emailInput = document.getElementById('resendEmail');
  const email = emailInput.value.trim();
  
  if (!email) {
    showError('Please enter your email address.');
    return;
  }
  
  if (!isValidEmail(email)) {
    showError('Please enter a valid email address.');
    return;
  }
  
  try {
    showLoading(true);
    
    const response = await axios.post(`${BASE_URL}/auth/resend-verification`, {
      email: email
    });
    
    showLoading(false);
    showSuccess(response.data.message);
    
    // Clear the email input
    emailInput.value = '';
    
  } catch (error) {
    showLoading(false);
    
    if (error.response) {
      const errorMsg = error.response.data.message || 'Failed to resend verification email';
      showError(errorMsg);
    } else {
      showError('Network error. Please check your internet connection and try again.');
    }
  }
}

// Email validation function
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Show loading state
function showLoading(show) {
  if (show) {
    loading.classList.add('show');
    errorMessage.style.display = 'none';
    successMessage.style.display = 'none';
    actionButtons.style.display = 'none';
  } else {
    loading.classList.remove('show');
  }
}

// Show error message
function showError(message) {
  errorMessage.textContent = message;
  errorMessage.style.display = 'block';
  successMessage.style.display = 'none';
  actionButtons.style.display = 'none';
}

// Show success message
function showSuccess(message) {
  successMessage.textContent = message;
  successMessage.style.display = 'block';
  errorMessage.style.display = 'none';
}

// Show action buttons
function showActionButtons() {
  actionButtons.style.display = 'block';
  resendSection.style.display = 'none';
}

// Show resend section
function showResendSection() {
  resendSection.style.display = 'block';
  actionButtons.style.display = 'none';
}

// Make resendVerification function globally available
window.resendVerification = resendVerification; 