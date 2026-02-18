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
  localStorage.removeItem('token');
  
  // Redirect to homepage immediately
  window.location.href = '/index.html';
}

// Export the configured axios instance and handler
export { axiosInstance as axios, handleSessionExpiration };
