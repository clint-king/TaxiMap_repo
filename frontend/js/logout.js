// Shared Logout Functionality
import axios from 'axios';
import { BASE_URL } from "./AddressSelection.js";

axios.defaults.withCredentials = true;

// Global logout function
export async function handleLogout() {
    try {
        // Call backend logout endpoint
        await axios.post(`${BASE_URL}/auth/logout`);
    } catch (error) {
        console.error('Error during logout:', error);
    } finally {
        // Clear local storage
        localStorage.removeItem('userProfile');
        localStorage.removeItem('activityLog');
        
        // Redirect to home page
        window.location.href = '/index.html';
    }
}

// Add logout button to navigation
export function addLogoutButtonToNav() {
    // Find the navigation links container (try both nav-links and nav_group)
    const navLinks = document.querySelector('.nav-links') || document.querySelector('.nav_group');
    
    if (navLinks && !document.getElementById('logoutBtn')) {
        // Create logout button
        const logoutBtn = document.createElement('a');
        logoutBtn.id = 'logoutBtn';
        logoutBtn.className = 'nav-logout-btn';
        logoutBtn.innerHTML = '<i class="fas fa-sign-out-alt"></i> Logout';
        logoutBtn.href = '#';
        logoutBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            await handleLogout();
        });
        
        // Add to navigation
        navLinks.appendChild(logoutBtn);
    }
}

// Check if user is logged in and show/hide logout button accordingly
export function checkAuthStatus() {
    const userProfile = localStorage.getItem('userProfile');
    const logoutBtn = document.getElementById('logoutBtn');
    
    if (userProfile) {
        // User is logged in, show logout button
        if (!logoutBtn) {
            addLogoutButtonToNav();
        }
    } else {
        // User is not logged in, hide logout button
        if (logoutBtn) {
            logoutBtn.remove();
        }
    }
}

// Check if user is authenticated and redirect to home if not
// For admin pages - requires admin user_type
export async function requireAuth() {
    const userProfile = localStorage.getItem('userProfile');
    
    // First check: if no userProfile in localStorage, redirect immediately
    if (!userProfile) {
        console.log('User not authenticated, redirecting to home page');
        window.location.href = '/index.html';
        return false;
    }
    
    // Second check: verify authentication with backend (with retry for cookie timing)
    return await verifyAuthWithRetry(true); // true = admin required
}

// Check if user is authenticated (for client pages - allows client user_type)
// Has retry logic to handle cookie timing issues after login redirect
export async function requireClientAuth() {
    const userProfile = localStorage.getItem('userProfile');
    
    // First check: if no userProfile in localStorage, redirect immediately
    if (!userProfile) {
        console.log('User not authenticated, redirecting to home page');
        window.location.href = '/index.html';
        return false;
    }
    
    // Second check: verify authentication with backend (with retry for cookie timing)
    return await verifyAuthWithRetry(false); // false = client allowed
}

// Helper function to verify auth with retry logic
async function verifyAuthWithRetry(requireAdmin = false, retryCount = 0) {
    const maxRetries = 3;
    
    try {
        const response = await axios.get(`${BASE_URL}/auth/profile`, {
            withCredentials: true
        });
        
        if (!response.data.success) {
            throw new Error('Authentication failed');
        }
        
        // Check if user is admin (for admin pages)
        const user = response.data.user;
        if (requireAdmin && user && user.user_type !== 'admin') {
            console.log('User is not an admin, redirecting to home page');
            localStorage.removeItem('userProfile');
            localStorage.removeItem('activityLog');
            localStorage.removeItem('token');
            window.location.href = '/index.html';
            return false;
        }
        
        return true;
    } catch (error) {
        // If it's an auth error and we haven't retried too many times, wait and retry
        // This handles the case where cookie isn't ready yet after login redirect
        if (error.response && (error.response.status === 401 || error.response.status === 403) && retryCount < maxRetries) {
            console.log(`Auth check failed (cookie may not be ready), retrying... (${retryCount + 1}/${maxRetries})`);
            // Wait and retry (cookie might not be ready yet after redirect)
            await new Promise(resolve => setTimeout(resolve, 1500)); // Wait 1.5 seconds
            return await verifyAuthWithRetry(requireAdmin, retryCount + 1);
        }
        
        // After all retries failed, or it's a different error
        console.log('Authentication verification failed after retries, redirecting to home page');
        // Clear local storage on authentication failure
        localStorage.removeItem('userProfile');
        localStorage.removeItem('activityLog');
        localStorage.removeItem('token');
        // Redirect to home page
        window.location.href = '/index.html';
        return false;
    }
}

// Highlight current page in navigation
function highlightCurrentPage() {
    const currentPath = window.location.pathname;
    const navLinks = document.querySelectorAll('.nav-links a, .nav_group a');
    
    navLinks.forEach(link => {
        // Remove any existing active class
        link.classList.remove('active');
        
        // Check if this link matches the current page
        const linkHref = link.getAttribute('href');
        if (linkHref) {
            // Handle different link formats and page variations
            const currentPageName = currentPath.split('/').pop(); // Get just the filename
            const linkPageName = linkHref.split('/').pop(); // Get just the filename from href
            
            if (linkHref === currentPath || 
                linkPageName === currentPageName ||
                (linkHref.includes('client.html') && currentPath.includes('client') && !currentPath.includes('clientCrowdSource')) ||
                (linkHref.includes('clientCrowdSource.html') && currentPath.includes('clientCrowdSource')) ||
                (linkHref.includes('profile.html') && currentPath.includes('profile')) ||
                (linkHref.includes('index.html') && currentPath.includes('index'))) {
                link.classList.add('active');
            }
        }
    });
}

// Initialize logout functionality when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    checkAuthStatus();
    highlightCurrentPage();
});
