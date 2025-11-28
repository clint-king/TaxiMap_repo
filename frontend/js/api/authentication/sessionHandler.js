import axios from 'axios';

// Create axios instance with default configuration
const axiosInstance = axios.create({
  withCredentials: true,
  timeout: 10000,
});

// Add response interceptor for session expiration
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && (error.response.status === 401 || error.response.status === 403)) {
      console.log('Session expired detected by interceptor');
      handleSessionExpiration();
    }
    return Promise.reject(error);
  }
);

// Handle session expiration
function handleSessionExpiration() {
  // Clear local storage
  localStorage.removeItem('userProfile');
  localStorage.removeItem('activityLog');
  
  // Show message to user
  const messageContainer = document.getElementById('messageContainer');
  if (messageContainer) {
    const messageElement = document.createElement('div');
    messageElement.className = 'message error';
    messageElement.textContent = 'Session expired. Redirecting to home page...';
    messageContainer.appendChild(messageElement);
  }
  
  // Redirect to home page after a short delay
  setTimeout(() => {
    window.location.href = '/index.html';
  }, 2000);
}

// Export the configured axios instance and handler
export { axiosInstance as axios, handleSessionExpiration };
