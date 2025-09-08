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
export function requireAuth() {
    const userProfile = localStorage.getItem('userProfile');
    
    if (!userProfile) {
        // User is not logged in, redirect to home page
        console.log('User not authenticated, redirecting to home page');
        window.location.href = '/index.html';
        return false;
    }
    
    return true;
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
