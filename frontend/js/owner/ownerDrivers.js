// Owner Drivers Page - Main JavaScript Module
// Handles loading and displaying drivers from the database

import { getOwnerDrivers, updateDriverStatusByOwner } from '../api/driverApi.js';

// ============================================
// NAVIGATION FUNCTIONS
// ============================================

/**
 * Toggles the mobile menu visibility
 */
function toggleMobileMenu() {
    const mobileMenu = document.getElementById('mobileMenu');
    mobileMenu.classList.toggle('show');
}

/**
 * Function for navigation link clicks (placeholder)
 */
function topNavZIndexDecrease() {
    // Function for navigation link clicks
}

// ============================================
// INITIALIZATION
// ============================================

/**
 * Initialize the page when DOM is loaded
 * Sets up authentication UI and loads drivers
 */
document.addEventListener('DOMContentLoaded', function() {
    const authButtons = document.getElementById('authButtons');
    const fullNav = document.getElementById('fullNav');
    
    const isLoggedIn = localStorage.getItem('userProfile') || sessionStorage.getItem('userProfile') || 
                      localStorage.getItem('currentUser') || sessionStorage.getItem('currentUser');
    
    if (isLoggedIn) {
        if (authButtons) authButtons.style.display = 'none';
        if (fullNav) fullNav.style.display = 'flex';
    } else {
        if (authButtons) authButtons.style.display = 'flex';
        if (fullNav) fullNav.style.display = 'none';
    }

    loadDrivers();
});

// ============================================
// DRIVER LOADING FUNCTIONS
// ============================================

/**
 * Loads drivers from the API and displays them in the grid
 * Shows loading state, handles errors, and displays empty state if no drivers found
 */
async function loadDrivers() {
    const driversGrid = document.getElementById('driversGrid');
    
    if (!driversGrid) return;
    
    // Show loading state
    driversGrid.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 2rem; color: #6c757d;">
            <i class="fas fa-spinner fa-spin" style="font-size: 2rem; margin-bottom: 1rem;"></i>
            <p>Loading drivers...</p>
        </div>
    `;
    
    try {
        const response = await getOwnerDrivers();
        console.log('API Response:', response); // Debug log
        
        if (!response.success) {
            throw new Error(response.message || 'Failed to fetch drivers');
        }
        
        const drivers = response.drivers || [];
        console.log('Drivers found:', drivers.length); // Debug log
        
        if (drivers.length === 0) {
            driversGrid.innerHTML = `
                <div class="no-drivers">
                    <i class="fas fa-user-tie"></i>
                    <p>No drivers found for your account.</p>
                    <p style="font-size: 0.9rem; color: #6c757d; margin-top: 0.5rem;">
                        Note: Drivers must have an owner_id set in the database to appear here.
                    </p>
                    <a href="owner-driver-post.html" class="add-driver-btn" style="display: inline-flex;">
                        <i class="fas fa-plus"></i>
                        Add Your First Driver
                    </a>
                </div>
            `;
            return;
        }
        
        driversGrid.innerHTML = drivers.map(driver => createDriverCard(driver)).join('');
    } catch (error) {
        console.error('Error loading drivers:', error);
        console.error('Error details:', {
            message: error.message,
            response: error.response?.data,
            status: error.response?.status
        });
        
        const errorMessage = error.response?.data?.message || error.message || 'Unknown error';
        driversGrid.innerHTML = `
            <div class="no-drivers" style="color: #dc3545;">
                <i class="fas fa-exclamation-circle"></i>
                <p><strong>Failed to load drivers:</strong></p>
                <p style="font-size: 0.9rem; margin-top: 0.5rem;">${escapeHtml(errorMessage)}</p>
                <button class="add-driver-btn" onclick="location.reload()" style="display: inline-flex; background: #01386A; margin-top: 1rem;">
                    <i class="fas fa-sync-alt"></i> Retry
                </button>
            </div>
        `;
    }
}

// ============================================
// DRIVER CARD CREATION
// ============================================

/**
 * Creates HTML for a driver card
 * Maps API response fields to display format and generates card HTML
 * 
 * @param {Object} driver - Driver object from API response
 * @returns {string} HTML string for the driver card
 */
function createDriverCard(driver) {
    // Map API response fields to display format
    // Use driver_profile_id for API calls (driver_profiles.ID), use user ID for display
    const driverProfileId = driver.driver_profile_id || driver.ID || driver.id; // driver_profiles.ID for API
    const driverUserId = driver.ID || driver.id; // users.ID for display/editing
    const driverName = driver.name || 'Unknown Driver';
    const driverPhone = driver.phone || 'N/A';
    const driverEmail = driver.email || 'N/A';
    const licenseNumber = driver.license_number || 'N/A';
    const licenseExpiry = driver.license_expiry || null;
    const driverStatus = driver.status || 'inactive'; // Owner-controlled status
    const verificationStatus = driver.verification_status || 'pending'; // Admin-controlled status
    const profilePicture = driver.profile_picture || null;
    
    // Verification status mapping (admin-controlled)
    const verificationStatusClass = verificationStatus === 'verified' ? 'verified' :
                                   verificationStatus === 'pending' ? 'pending' :
                                   verificationStatus === 'rejected' ? 'rejected' :
                                   verificationStatus === 'suspended' ? 'suspended' : 'pending';
    const verificationStatusText = verificationStatus === 'verified' ? 'Verified' :
                                  verificationStatus === 'pending' ? 'Pending Verification' :
                                  verificationStatus === 'rejected' ? 'Rejected' :
                                  verificationStatus === 'suspended' ? 'Suspended' : 'Pending';
    
    // Owner status mapping
    const statusClass = `driver-status-${driverStatus}`;
    const statusText = driverStatus === 'active' ? 'Active' : 'Inactive';
    
    // Check if owner can change status (only if verified)
    const canChangeStatus = verificationStatus === 'verified';
    const isActive = driverStatus === 'active';
    
    // Photo handling
    const photoHtml = profilePicture ? 
        `<img src="${escapeHtml(profilePicture)}" alt="${escapeHtml(driverName)}" class="driver-photo">` :
        `<div class="driver-photo-placeholder"><i class="fas fa-user"></i></div>`;
    
    // License expiry formatting
    let licenseExpiryText = 'N/A';
    if (licenseExpiry) {
        try {
            licenseExpiryText = new Date(licenseExpiry).toLocaleDateString('en-ZA');
        } catch (e) {
            licenseExpiryText = licenseExpiry;
        }
    }
    
    return `
        <div class="driver-card" data-driver-id="${driverProfileId}" data-user-id="${driverUserId}">
            <div class="driver-photo-container">
                ${photoHtml}
            </div>
            <div class="driver-info">
                <h3 class="driver-name">${escapeHtml(driverName)}</h3>
                <div class="driver-details">
                    <div class="driver-detail-item">
                        <i class="fas fa-phone"></i>
                        <span class="driver-detail-label">Phone:</span>
                        <span class="driver-detail-value">${escapeHtml(driverPhone)}</span>
                    </div>
                    <div class="driver-detail-item">
                        <i class="fas fa-envelope"></i>
                        <span class="driver-detail-label">Email:</span>
                        <span class="driver-detail-value">${escapeHtml(driverEmail)}</span>
                    </div>
                    <div class="driver-detail-item">
                        <i class="fas fa-id-badge"></i>
                        <span class="driver-detail-label">License:</span>
                        <span class="driver-detail-value">${escapeHtml(licenseNumber)}</span>
                    </div>
                    <div class="driver-detail-item">
                        <i class="fas fa-calendar-alt"></i>
                        <span class="driver-detail-label">License Expiry:</span>
                        <span class="driver-detail-value">${licenseExpiryText}</span>
                    </div>
                </div>
                
                <!-- Status Section -->
                <div style="margin: 1rem 0; padding: 0.75rem; background: #f8f9fa; border-radius: 8px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
                        <span style="font-weight: 600; color: #495057;">Admin Verification:</span>
                        <span class="driver-status-badge ${verificationStatusClass}" style="font-size: 0.85rem;">
                            ${verificationStatusText}
                        </span>
                    </div>
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <span style="font-weight: 600; color: #495057;">Driver Status:</span>
                        <span class="driver-status-badge ${statusClass}" style="font-size: 0.85rem;">
                            ${statusText}
                        </span>
                    </div>
                </div>
                
                <!-- Status Toggle (only if verified) -->
                ${canChangeStatus ? `
                    <div style="margin: 1rem 0;">
                        <button class="btn-action ${isActive ? 'btn-inactive' : 'btn-active'}" 
                                onclick="toggleDriverStatus('${driverProfileId}', '${isActive ? 'inactive' : 'active'}')"
                                style="width: 100%; padding: 0.75rem; font-weight: 600;">
                            <i class="fas fa-${isActive ? 'ban' : 'check-circle'}"></i>
                            ${isActive ? 'Set Inactive' : 'Set Active'}
                        </button>
                    </div>
                ` : `
                    <div style="margin: 1rem 0; padding: 0.75rem; background: #fff3cd; border-radius: 8px; text-align: center;">
                        <small style="color: #856404;">
                            <i class="fas fa-info-circle"></i> Driver must be verified by admin before status can be changed
                        </small>
                    </div>
                `}
                
                <div class="driver-actions">
                    <a href="owner-driver-post.html?id=${driverUserId}" class="btn-action btn-edit">
                        <i class="fas fa-edit"></i> Edit
                    </a>
                    <button class="btn-action btn-delete" onclick="deleteDriver('${driverProfileId}')">
                        <i class="fas fa-trash"></i> Delete
                    </button>
                </div>
            </div>
        </div>
    `;
}

// ============================================
// DRIVER MANAGEMENT FUNCTIONS
// ============================================

/**
 * Toggles driver status (active/inactive)
 * Only works if driver is verified by admin
 * 
 * @param {string|number} driverId - The ID of the driver (driver_profiles.ID)
 * @param {string} newStatus - The new status ('active' or 'inactive')
 */
async function toggleDriverStatus(driverId, newStatus) {
    const statusText = newStatus === 'active' ? 'active' : 'inactive';
    
    if (!confirm(`Are you sure you want to set this driver to ${statusText}?`)) {
        return;
    }
    
    try {
        const response = await updateDriverStatusByOwner(driverId, newStatus);
        
        if (response.success) {
            alert(`Driver status updated to ${statusText} successfully!`);
            // Reload drivers to refresh the list
            loadDrivers();
        } else {
            throw new Error(response.message || 'Failed to update driver status');
        }
    } catch (error) {
        console.error('Error updating driver status:', error);
        const errorMessage = error.response?.data?.message || error.message || 'Failed to update driver status';
        alert(`Error: ${errorMessage}`);
    }
}

/**
 * Deletes a driver (currently shows a message that deletion is not yet implemented)
 * 
 * @param {string|number} driverId - The ID of the driver to delete
 */
async function deleteDriver(driverId) {
    if (!confirm('Are you sure you want to delete this driver? This action cannot be undone.')) {
        return;
    }
    
    // TODO: Implement delete driver API endpoint
    // For now, show a message that deletion is not yet implemented
    alert('Driver deletion is not yet implemented. Please contact the administrator.');
    // Reload drivers to refresh the list
    loadDrivers();
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Escapes HTML special characters to prevent XSS attacks
 * 
 * @param {string} text - Text to escape
 * @returns {string} Escaped HTML string
 */
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ============================================
// EXPORT FUNCTIONS TO GLOBAL SCOPE
// ============================================
// Make functions globally accessible for onclick handlers in HTML

window.deleteDriver = deleteDriver;
window.toggleDriverStatus = toggleDriverStatus;
window.toggleMobileMenu = toggleMobileMenu;
window.topNavZIndexDecrease = topNavZIndexDecrease;

