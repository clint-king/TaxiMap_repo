import { axios, handleSessionExpiration } from "./sessionHandler.js";
import { BASE_URL } from "./AddressSelection.js";

class ResetPasswordManager {
  constructor() {
    this.token = this.getTokenFromURL();
    this.init();
  }

  getTokenFromURL() {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    console.log('Extracted token from URL:', token);
    return token;
  }

  init() {
    if (!this.token) {
      this.showError('Invalid or missing reset token. Please request a new password reset link.');
      return;
    }

    this.setupEventListeners();
    this.setupPasswordStrength();
  }

  setupEventListeners() {
    const form = document.getElementById('resetPasswordForm');
    if (form) {
      form.addEventListener('submit', (e) => this.handleResetPassword(e));
    }
  }

  setupPasswordStrength() {
    const newPasswordInput = document.getElementById('newPassword');
    if (newPasswordInput) {
      newPasswordInput.addEventListener('input', (e) => {
        const strength = this.checkPasswordStrength(e.target.value);
        const strengthFill = document.getElementById('strengthFill');
        const strengthText = document.getElementById('strengthText');

        if (strengthFill && strengthText) {
          strengthFill.className = `strength-fill ${strength}`;
          strengthText.textContent = strength.charAt(0).toUpperCase() + strength.slice(1);
        }
      });
    }
  }

  checkPasswordStrength(password) {
    const hasLower = /[a-z]/.test(password);
    const hasUpper = /[A-Z]/.test(password);
    const hasNumber = /\d/.test(password);
    const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);
    const isLongEnough = password.length >= 8;

    const score = [hasLower, hasUpper, hasNumber, hasSpecial, isLongEnough].filter(Boolean).length;

    if (score < 3) return 'weak';
    if (score < 4) return 'fair';
    if (score < 5) return 'good';
    return 'strong';
  }

  async handleResetPassword(event) {
    event.preventDefault();
    
    const form = event.target;
    const newPassword = form.newPassword.value;
    const confirmPassword = form.confirmPassword.value;
    const errorDiv = document.getElementById('resetError');
    const submitBtn = document.getElementById('resetBtn');
    const loadingDiv = document.getElementById('loading');
    const successDiv = document.getElementById('successMessage');
    
    // Clear previous errors
    errorDiv.textContent = '';
    
    // Validate passwords
    if (newPassword !== confirmPassword) {
      errorDiv.textContent = 'Passwords do not match';
      return;
    }
    
    const strength = this.checkPasswordStrength(newPassword);
    if (strength === 'weak') {
      errorDiv.textContent = 'Password is too weak. Please choose a stronger password.';
      return;
    }
    
    // Show loading state
    submitBtn.disabled = true;
    submitBtn.textContent = 'Resetting...';
    loadingDiv.style.display = 'block';
    
    try {
      console.log('Sending reset password request with token:', this.token);
      console.log('Password length:', newPassword.length);
      
      // Ensure we're sending just the token, not the full URL
      const cleanToken = this.token && this.token.includes('token=') 
        ? this.token.split('token=')[1] 
        : this.token;
      
      console.log('Clean token being sent:', cleanToken);
      
      const response = await axios.post(`${BASE_URL}/auth/reset-password`, {
        token: cleanToken,
        newPassword: newPassword
      });
      
      if (response.data.success) {
        // Show success message
        form.style.display = 'none';
        loadingDiv.style.display = 'none';
        successDiv.style.display = 'block';
        
        // Redirect to login after 3 seconds
        setTimeout(() => {
          window.location.href = '/login.html';
        }, 3000);
      } else {
        errorDiv.textContent = response.data.message || 'Failed to reset password';
      }
    } catch (error) {
      console.error('Reset password error:', error);
      
      if (error.response?.status === 400) {
        errorDiv.textContent = error.response.data.message || 'Invalid reset token or password';
      } else if (error.response?.status === 410) {
        errorDiv.textContent = 'Reset token has expired. Please request a new password reset link.';
      } else {
        errorDiv.textContent = error.response?.data?.message || 'Failed to reset password. Please try again.';
      }
    } finally {
      // Reset button state
      submitBtn.disabled = false;
      submitBtn.textContent = 'Reset Password';
      loadingDiv.style.display = 'none';
    }
  }

  showError(message) {
    const errorDiv = document.getElementById('resetError');
    const form = document.getElementById('resetPasswordForm');
    const successDiv = document.getElementById('successMessage');
    
    if (errorDiv) {
      errorDiv.textContent = message;
    }
    
    if (form) {
      form.style.display = 'none';
    }
    
    if (successDiv) {
      successDiv.style.display = 'none';
    }
  }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new ResetPasswordManager();
});
