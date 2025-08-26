// Contact form functionality
import { BASE_URL } from './AddressSelection.js';

class ContactForm {
  constructor() {
    this.form = document.getElementById('contact-form');
    this.init();
  }

  init() {
    if (this.form) {
      this.form.addEventListener('submit', (e) => this.handleSubmit(e));
    }
  }

  async handleSubmit(e) {
    e.preventDefault();
    
    const formData = new FormData(this.form);
    const data = {
      name: formData.get('name') || document.getElementById('name').value,
      email: formData.get('email') || document.getElementById('email').value,
      message: formData.get('message') || document.getElementById('message').value
    };

    // Validate form
    if (!this.validateForm(data)) {
      return;
    }

    // Show loading state
    this.showLoading();

    try {
      const response = await fetch(`${BASE_URL}/contact/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data)
      });

      const result = await response.json();

      if (response.ok) {
        this.showSuccess(result.message);
        this.form.reset();
      } else {
        this.showError(result.error || 'Failed to send message');
      }
    } catch (error) {
      console.error('Error sending contact form:', error);
      this.showError('Network error. Please try again.');
    } finally {
      this.hideLoading();
    }
  }

  validateForm(data) {
    if (!data.name || data.name.trim().length < 2) {
      this.showError('Please enter a valid name (at least 2 characters)');
      return false;
    }

    if (!data.email || !this.isValidEmail(data.email)) {
      this.showError('Please enter a valid email address');
      return false;
    }

    if (!data.message || data.message.trim().length < 10) {
      this.showError('Please enter a message (at least 10 characters)');
      return false;
    }

    return true;
  }

  isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  showLoading() {
    const submitBtn = this.form.querySelector('button[type="submit"]');
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<i class="ri-loader-4-line animate-spin mr-2"></i>Sending...';
    }
  }

  hideLoading() {
    const submitBtn = this.form.querySelector('button[type="submit"]');
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = 'Send';
    }
  }

  showSuccess(message) {
    this.showMessage(message, 'success');
  }

  showError(message) {
    this.showMessage(message, 'error');
  }

  showMessage(message, type) {
    // Remove existing messages
    const existingMessage = document.querySelector('.contact-message');
    if (existingMessage) {
      existingMessage.remove();
    }

    // Create message element
    const messageDiv = document.createElement('div');
    messageDiv.className = `contact-message fixed top-4 right-4 p-4 rounded-lg shadow-lg z-50 max-w-sm ${
      type === 'success' 
        ? 'bg-green-100 border border-green-400 text-green-700' 
        : 'bg-red-100 border border-red-400 text-red-700'
    }`;
    
    messageDiv.innerHTML = `
      <div class="flex items-center">
        <i class="ri-${type === 'success' ? 'check-line' : 'error-warning-line'} mr-2"></i>
        <span>${message}</span>
      </div>
    `;

    // Add to page
    document.body.appendChild(messageDiv);

    // Auto remove after 5 seconds
    setTimeout(() => {
      if (messageDiv.parentNode) {
        messageDiv.remove();
      }
    }, 5000);
  }
}

// Initialize contact form when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new ContactForm();
});
