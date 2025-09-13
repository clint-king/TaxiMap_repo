// Feedback Page JavaScript

// Mobile menu toggle
function toggleMobileMenu() {
  const mobileMenu = document.getElementById('mobileMenu');
  const burger = document.querySelector('.burger');
  
  mobileMenu.classList.toggle('show');
  burger.classList.toggle('active');
}

// Z-index management for navigation
function topNavZIndexDecrease() {
  const navbar = document.querySelector(".topnav");
  if (navbar) {
    navbar.style.zIndex = "3";
  }
}

// Close mobile menu when clicking outside
document.addEventListener('click', (event) => {
  const mobileMenu = document.getElementById('mobileMenu');
  const burger = document.querySelector('.burger');
  
  if (!mobileMenu.contains(event.target) && !burger.contains(event.target)) {
    mobileMenu.classList.remove('show');
    burger.classList.remove('active');
  }
});

// Form handling
document.addEventListener('DOMContentLoaded', function() {
  const feedbackForm = document.getElementById('feedbackForm');
  const successMessage = document.getElementById('successMessage');
  
  // Form submission
  feedbackForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const submitBtn = document.querySelector('.submit-btn');
    const originalText = submitBtn.innerHTML;
    
    // Show loading state
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';
    
    try {
      // Get form data
      const formData = new FormData(feedbackForm);
      const feedbackData = {
        name: formData.get('name'),
        email: formData.get('email'),
        feedbackType: formData.get('feedbackType'),
        subject: formData.get('subject'),
        message: formData.get('message'),
        rating: formData.get('rating') || null,
        timestamp: new Date().toISOString()
      };
      
      // Simulate API call (replace with actual API endpoint)
      await submitFeedback(feedbackData);
      
      // Show success message
      showSuccessMessage();
      
    } catch (error) {
      console.error('Error submitting feedback:', error);
      alert('There was an error submitting your feedback. Please try again.');
    } finally {
      // Reset button state
      submitBtn.disabled = false;
      submitBtn.innerHTML = originalText;
    }
  });
  
  // Real-time form validation
  const inputs = feedbackForm.querySelectorAll('input, textarea');
  inputs.forEach(input => {
    input.addEventListener('blur', validateField);
    input.addEventListener('input', clearFieldError);
  });
  
  // Feedback type selection animation
  const feedbackTypeOptions = document.querySelectorAll('.feedback-type-option');
  feedbackTypeOptions.forEach(option => {
    option.addEventListener('click', function() {
      // Remove active class from all options
      feedbackTypeOptions.forEach(opt => {
        opt.classList.remove('selected');
      });
      // Add active class to selected option
      this.classList.add('selected');
    });
  });
  
  // Star rating interaction
  const ratingStars = document.querySelectorAll('.rating-stars input[type="radio"]');
  ratingStars.forEach(star => {
    star.addEventListener('change', function() {
      const rating = this.value;
      const ratingText = document.querySelector('.rating-text');
      const ratingMessages = {
        '1': 'Poor - We need to improve significantly',
        '2': 'Fair - Room for improvement',
        '3': 'Good - Decent experience',
        '4': 'Very Good - Almost perfect',
        '5': 'Excellent - Outstanding experience'
      };
      ratingText.textContent = ratingMessages[rating] || 'Rate your experience with TeksiMap';
    });
  });
});

// Submit feedback function (replace with actual API call)
async function submitFeedback(feedbackData) {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Here you would make an actual API call to your backend
  // Example:
  /*
  const response = await fetch('/api/feedback', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(feedbackData)
  });
  
  if (!response.ok) {
    throw new Error('Failed to submit feedback');
  }
  
  return response.json();
  */
  
  console.log('Feedback submitted:', feedbackData);
  return { success: true };
}

// Show success message
function showSuccessMessage() {
  const feedbackForm = document.getElementById('feedbackForm');
  const successMessage = document.getElementById('successMessage');
  
  feedbackForm.style.display = 'none';
  successMessage.style.display = 'block';
  
  // Scroll to top
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Show form again
function showForm() {
  const feedbackForm = document.getElementById('feedbackForm');
  const successMessage = document.getElementById('successMessage');
  
  successMessage.style.display = 'none';
  feedbackForm.style.display = 'block';
  
  // Scroll to top
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Clear form
function clearForm() {
  const feedbackForm = document.getElementById('feedbackForm');
  
  // Reset form
  feedbackForm.reset();
  
  // Clear any validation errors
  const errorElements = feedbackForm.querySelectorAll('.error');
  errorElements.forEach(element => {
    element.classList.remove('error');
  });
  
  // Reset feedback type selection
  const feedbackTypeOptions = document.querySelectorAll('.feedback-type-option');
  feedbackTypeOptions.forEach(option => {
    option.classList.remove('selected');
  });
  
  // Reset rating text
  const ratingText = document.querySelector('.rating-text');
  ratingText.textContent = 'Rate your experience with TeksiMap';
  
  // Focus on first input
  const firstInput = feedbackForm.querySelector('input[type="text"]');
  if (firstInput) {
    firstInput.focus();
  }
}

// Field validation
function validateField(event) {
  const field = event.target;
  const value = field.value.trim();
  
  // Remove existing error
  clearFieldError(event);
  
  // Validate based on field type
  if (field.hasAttribute('required') && !value) {
    showFieldError(field, 'This field is required');
    return false;
  }
  
  if (field.type === 'email' && value) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value)) {
      showFieldError(field, 'Please enter a valid email address');
      return false;
    }
  }
  
  if (field.type === 'text' && value && value.length < 2) {
    showFieldError(field, 'This field must be at least 2 characters long');
    return false;
  }
  
  if (field.tagName === 'TEXTAREA' && value && value.length < 10) {
    showFieldError(field, 'Please provide more detailed feedback (at least 10 characters)');
    return false;
  }
  
  return true;
}

// Show field error
function showFieldError(field, message) {
  field.classList.add('error');
  
  // Remove existing error message
  const existingError = field.parentNode.querySelector('.error-message');
  if (existingError) {
    existingError.remove();
  }
  
  // Add error message
  const errorDiv = document.createElement('div');
  errorDiv.className = 'error-message';
  errorDiv.textContent = message;
  errorDiv.style.color = '#dc3545';
  errorDiv.style.fontSize = '0.85rem';
  errorDiv.style.marginTop = '0.25rem';
  
  field.parentNode.appendChild(errorDiv);
}

// Clear field error
function clearFieldError(event) {
  const field = event.target;
  field.classList.remove('error');
  
  const errorMessage = field.parentNode.querySelector('.error-message');
  if (errorMessage) {
    errorMessage.remove();
  }
}

// Add CSS for error states
const style = document.createElement('style');
style.textContent = `
  .form-group input.error,
  .form-group textarea.error {
    border-color: #dc3545;
    box-shadow: 0 0 0 3px rgba(220, 53, 69, 0.1);
  }
  
  .feedback-type-option.selected .option-card {
    border-color: #01386A;
    background: rgba(1, 56, 106, 0.05);
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(1, 56, 106, 0.2);
  }
  
  .feedback-type-option.selected .option-card i {
    color: #01386A;
  }
`;
document.head.appendChild(style);