// Feedback Page JavaScript
import axios from 'axios';
import {BASE_URL} from "./AddressSelection.js";

// Add global axios interceptor for session expiration
axios.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            // Session expired, redirect to login
            localStorage.removeItem('userProfile');
            window.location.href = '/login.html';
        }
        return Promise.reject(error);
    }
);

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
  
  // Initialize image upload functionality
  initializeImageUpload();
  
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
        feedback_type: formData.get('feedback_type'),
        subject: formData.get('subject'),
        message: formData.get('message'),
        rating: formData.get('rating') || null
      };
      
      // Get image files if any
      const imageInput = document.getElementById('imageInput');
      const imageFiles = imageInput ? Array.from(imageInput.files) : [];
      
      // Submit to actual backend
      await submitFeedback(feedbackData, imageFiles);
      
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

// Submit feedback function
async function submitFeedback(feedbackData, imageFiles = []) {
  try {
    // Check if user is authenticated
    const userProfile = localStorage.getItem('userProfile');
    if (!userProfile) {
      throw new Error('Please log in to submit feedback');
    }

    // Create FormData for file upload
    const formData = new FormData();
    
    // Add feedback data
    formData.append('feedback_type', feedbackData.feedback_type);
    formData.append('subject', feedbackData.subject);
    formData.append('message', feedbackData.message);
    if (feedbackData.rating) {
      formData.append('rating', feedbackData.rating);
    }
    
    // Add images if any
    if (imageFiles && imageFiles.length > 0) {
      for (let i = 0; i < imageFiles.length; i++) {
        formData.append('images', imageFiles[i]);
      }
    }

    // Submit to backend using axios
    const response = await axios.post(`${BASE_URL}/feedback/submit`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      },
      withCredentials: true // Include cookies for authentication
    });
    
    console.log('Feedback submitted successfully:', response.data);
    return response.data;
    
  } catch (error) {
    console.error('Error submitting feedback:', error);
    
    // Handle axios error response
    if (error.response) {
      const errorMessage = error.response.data?.error || error.response.statusText || 'Failed to submit feedback';
      throw new Error(errorMessage);
    } else if (error.request) {
      throw new Error('Network error. Please check your connection.');
    } else {
      throw error;
    }
  }
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

// Make functions available globally for inline event handlers
window.showForm = showForm;
window.clearForm = clearForm;
window.toggleMobileMenu = toggleMobileMenu;

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
  
  // Clear image uploads
  clearImageUploads();
  
  // Focus on first input
  const firstInput = feedbackForm.querySelector('input[type="text"]');
  if (firstInput) {
    firstInput.focus();
  }
}

// Initialize image upload functionality
function initializeImageUpload() {
  const imageUploadArea = document.getElementById('imageUploadArea');
  const imageInput = document.getElementById('imageInput');

  if (!imageUploadArea || !imageInput) {
    return; // Exit if elements don't exist
  }

  // Click to upload
  imageUploadArea.addEventListener('click', () => {
    imageInput.click();
  });

  // Drag and drop functionality
  imageUploadArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    imageUploadArea.classList.add('dragover');
  });

  imageUploadArea.addEventListener('dragleave', () => {
    imageUploadArea.classList.remove('dragover');
  });

  imageUploadArea.addEventListener('drop', (e) => {
    e.preventDefault();
    imageUploadArea.classList.remove('dragover');
    
    const files = Array.from(e.dataTransfer.files);
    handleImageFiles(files);
  });

  // File input change
  imageInput.addEventListener('change', (e) => {
    const files = Array.from(e.target.files);
    handleImageFiles(files);
  });
}

// Handle image files
function handleImageFiles(files) {
  const imagePreviewContainer = document.getElementById('imagePreviewContainer');
  const imagePreviewGrid = document.getElementById('imagePreviewGrid');
  
  if (!imagePreviewContainer || !imagePreviewGrid) {
    return; // Exit if elements don't exist
  }
  
  // Filter only image files
  const imageFiles = files.filter(file => file.type.startsWith('image/'));
  
  if (imageFiles.length === 0) {
    showImageError('Please select only image files (PNG, JPG, GIF)');
    return;
  }

  // Check file size (5MB limit)
  const oversizedFiles = imageFiles.filter(file => file.size > 5 * 1024 * 1024);
  if (oversizedFiles.length > 0) {
    showImageError('Some files are too large. Maximum size is 5MB per file.');
    return;
  }

  // Check total number of images (max 5)
  const currentImages = imagePreviewGrid.children.length;
  if (currentImages + imageFiles.length > 5) {
    showImageError('Maximum 5 images allowed. Please remove some images first.');
    return;
  }

  // Clear any existing errors
  clearImageError();

  // Process each image
  imageFiles.forEach(file => {
    const reader = new FileReader();
    reader.onload = (e) => {
      createImagePreview(e.target.result, file.name);
    };
    reader.readAsDataURL(file);
  });

  // Show preview container
  imagePreviewContainer.style.display = 'block';
}

// Create image preview
function createImagePreview(imageSrc, fileName) {
  const imagePreviewGrid = document.getElementById('imagePreviewGrid');
  
  if (!imagePreviewGrid) return;
  
  const previewItem = document.createElement('div');
  previewItem.className = 'image-preview-item';
  
  const img = document.createElement('img');
  img.src = imageSrc;
  img.alt = fileName;
  
  const removeBtn = document.createElement('button');
  removeBtn.className = 'remove-image';
  removeBtn.innerHTML = '<i class="fas fa-times"></i>';
  removeBtn.onclick = () => removeImagePreview(previewItem);
  
  previewItem.appendChild(img);
  previewItem.appendChild(removeBtn);
  imagePreviewGrid.appendChild(previewItem);
}

// Remove image preview
function removeImagePreview(previewItem) {
  previewItem.remove();
  
  const imagePreviewGrid = document.getElementById('imagePreviewGrid');
  const imagePreviewContainer = document.getElementById('imagePreviewContainer');
  
  // Hide container if no images left
  if (imagePreviewGrid && imagePreviewContainer && imagePreviewGrid.children.length === 0) {
    imagePreviewContainer.style.display = 'none';
  }
}

// Clear all image uploads
function clearImageUploads() {
  const imageInput = document.getElementById('imageInput');
  const imagePreviewContainer = document.getElementById('imagePreviewContainer');
  const imagePreviewGrid = document.getElementById('imagePreviewGrid');
  
  // Reset file input
  if (imageInput) {
    imageInput.value = '';
  }
  
  // Clear preview
  if (imagePreviewGrid) {
    imagePreviewGrid.innerHTML = '';
  }
  if (imagePreviewContainer) {
    imagePreviewContainer.style.display = 'none';
  }
  
  // Clear any errors
  clearImageError();
}

// Show image error
function showImageError(message) {
  clearImageError();
  
  const errorDiv = document.createElement('div');
  errorDiv.className = 'image-error';
  errorDiv.textContent = message;
  
  const imageUploadContainer = document.querySelector('.image-upload-container');
  if (imageUploadContainer) {
    imageUploadContainer.appendChild(errorDiv);
    
    // Auto-hide error after 5 seconds
    setTimeout(() => {
      errorDiv.remove();
    }, 5000);
  }
}

// Clear image error
function clearImageError() {
  const existingError = document.querySelector('.image-error');
  if (existingError) {
    existingError.remove();
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