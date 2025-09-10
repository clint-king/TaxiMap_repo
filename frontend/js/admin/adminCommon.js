// Common admin functionality and utilities
import {BASE_URL} from "../AddressSelection.js";

// Admin mobile menu toggle
export function toggleAdminMobileMenu() {
  const menu = document.getElementById('adminMobileMenu');
  menu.classList.toggle('show');
}

// Logout function
export function logout() {
  if (confirm('Are you sure you want to logout?')) {
    localStorage.removeItem('token');
    window.location.href = 'login.html';
  }
}

// Common API request function
export async function makeAdminRequest(endpoint, options = {}) {
  const defaultOptions = {
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('token')}`,
      'Content-Type': 'application/json'
    }
  };

  const response = await fetch(`${BASE_URL}/admin/${endpoint}`, {
    ...defaultOptions,
    ...options
  });

  if (!response.ok) {
    throw new Error(`API request failed: ${response.status}`);
  }

  return response;
}

// Show loading spinner
export function showLoading(containerId) {
  const container = document.getElementById(containerId);
  if (container) {
    container.innerHTML = `
      <div class="loading-spinner"></div>
      <p>Loading...</p>
    `;
  }
}

// Show error message
export function showError(containerId, message) {
  const container = document.getElementById(containerId);
  if (container) {
    container.innerHTML = `<p style="color: red;">Error: ${message}</p>`;
  }
}

// Format date for display
export function formatDate(dateString) {
  return new Date(dateString).toLocaleDateString();
}

// Format currency
export function formatCurrency(amount) {
  return `R${amount.toFixed(2)}`;
}

// Create status badge HTML
export function createStatusBadge(status, type = 'status') {
  const className = type === 'status' ? 'status-badge' : 'type-badge';
  return `<span class="${className} ${status.toLowerCase()}">${status}</span>`;
}

// Debounce function for search inputs
export function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Export BASE_URL for use in other admin modules
export { BASE_URL };
