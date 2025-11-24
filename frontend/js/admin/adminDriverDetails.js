// Admin Driver Details Page - Main JavaScript Module
// Handles displaying driver details, documents, and admin actions (verify/reject/suspend)

import axios from 'axios';
import { BASE_URL } from '../AddressSelection.js';

// Use cookie-based authentication
axios.defaults.withCredentials = true;

let currentDriver = null;
let currentDriverId = null;
// Document modal state
let currentDocuments = [];
let currentDocumentIndex = 0;

// ============================================
// INITIALIZATION
// ============================================

/**
 * Initialize page on DOMContentLoaded
 * - Gets driver ID from URL
 * - Loads driver details and documents
 */
document.addEventListener('DOMContentLoaded', function() {
    // Get driver ID from URL query parameter
    const urlParams = new URLSearchParams(window.location.search);
    const driverId = urlParams.get('id');

    if (!driverId) {
        showError('Driver ID is required');
        return;
    }

    currentDriverId = driverId;
    loadDriverDetails(driverId);
});

// ============================================
// LOAD DRIVER DATA
// ============================================

/**
 * Loads driver details from API
 * @param {string|number} driverId - Driver user ID
 */
async function loadDriverDetails(driverId) {
    try {
        showLoading();

        // Load driver details (uses admin endpoint)
        const driverResponse = await axios.get(`${BASE_URL}/api/drivers/admin/${driverId}`);
        
        if (!driverResponse.data.success) {
            throw new Error(driverResponse.data.message || 'Failed to load driver details');
        }

        currentDriver = driverResponse.data.driver;

        // Driver documents are already included in the response
        const documents = currentDriver.documents || [];

        // Render driver details
        renderDriverDetails(currentDriver, documents);

    } catch (error) {
        console.error('Error loading driver details:', error);
        const errorMessage = error.response?.data?.message || error.message || 'Failed to load driver details';
        showError(errorMessage);
    }
}

// ============================================
// RENDER DRIVER DETAILS
// ============================================

/**
 * Renders driver details and documents on the page
 * @param {Object} driver - Driver data from API
 * @param {Array} documents - Driver documents array
 */
function renderDriverDetails(driver, documents) {
    hideLoading();

    // Personal Details
    document.getElementById('driverName').textContent = driver.name || 'N/A';
    document.getElementById('driverEmail').textContent = driver.email || 'N/A';
    document.getElementById('driverPhone').textContent = driver.phone || 'N/A';
    document.getElementById('driverLocation').textContent = driver.location || 'N/A';
    document.getElementById('idNumber').textContent = driver.id_number || 'N/A';

    // Driver Information
    document.getElementById('licenseNumber').textContent = driver.license_number || 'N/A';
    document.getElementById('licenseExpiry').textContent = driver.license_expiry || 'N/A';
    document.getElementById('vehicleCount').textContent = driver.vehicle_count || 0;
    
    // Owner Information
    document.getElementById('ownerName').textContent = driver.owner_name || 'N/A';
    document.getElementById('ownerEmail').textContent = driver.owner_email || '';

    // Rating
    const rating = driver.rating || 0;
    const totalRatings = driver.total_ratings || 0;
    if (totalRatings > 0) {
        document.getElementById('rating').textContent = `${rating.toFixed(1)} (${totalRatings} ratings)`;
    } else {
        document.getElementById('rating').textContent = 'No ratings yet';
    }

    // Status badges
    const driverStatus = driver.status || 'pending';
    const verificationStatus = driver.verification_status || 'pending';
    
    const driverStatusBadge = document.getElementById('driverStatusBadge');
    driverStatusBadge.textContent = driverStatus;
    driverStatusBadge.className = `status-badge ${getDriverStatusClass(driverStatus)}`;

    const verificationStatusBadge = document.getElementById('verificationStatusBadge');
    verificationStatusBadge.textContent = verificationStatus;
    verificationStatusBadge.className = `status-badge ${getVerificationStatusClass(verificationStatus)}`;

    const verificationStatusBadge2 = document.getElementById('verificationStatusBadge2');
    verificationStatusBadge2.textContent = verificationStatus;
    verificationStatusBadge2.className = `status-badge ${getVerificationStatusClass(verificationStatus)}`;

    // Verification Notes
    if (driver.verification_notes) {
        document.getElementById('verificationNotesSection').style.display = 'block';
        document.getElementById('verificationNotes').textContent = driver.verification_notes;
    } else {
        document.getElementById('verificationNotesSection').style.display = 'none';
    }

    // Documents
    renderDocuments(documents);

    // Assigned Vehicles
    if (driver.vehicles && driver.vehicles.length > 0) {
        renderVehicles(driver.vehicles);
    } else {
        document.getElementById('vehiclesSection').style.display = 'none';
    }

    // Admin Actions
    renderAdminActions(verificationStatus, driverStatus);

    // Show content
    document.getElementById('driverDetailsContent').style.display = 'block';
}

/**
 * Renders driver documents with inline viewing capability
 * @param {Array} documents - Documents array
 */
function renderDocuments(documents) {
    const documentsList = document.getElementById('documentsList');
    const documentsCount = document.getElementById('documentsCount');

    documentsCount.textContent = documents.length;
    currentDocuments = documents; // Store for modal navigation

    if (documents.length === 0) {
        documentsList.innerHTML = '<p style="text-align: center; color: #666; padding: 2rem;">No documents uploaded</p>';
        return;
    }

    documentsList.innerHTML = documents.map((doc, index) => {
        // Check if image_url is base64 or a URL
        const isBase64 = doc.image_url && (doc.image_url.startsWith('data:') || doc.image_url.startsWith('/9j/') || doc.image_url.length > 1000);
        const imageUrl = isBase64 ? 
            (doc.image_url.startsWith('data:') ? doc.image_url : `data:image/jpeg;base64,${doc.image_url}`) : 
            doc.image_url;

        return `
        <div class="card" style="padding: 1.5rem; border: 1px solid #e0e0e0;">
            <div style="display: flex; flex-direction: column; gap: 1rem;">
                <!-- Document Info -->
                <div style="display: flex; justify-content: space-between; align-items: start; flex-wrap: wrap; gap: 1rem;">
                    <div style="flex: 1; min-width: 200px;">
                        <h4 style="margin: 0 0 0.5rem 0; color: #193148;">
                            <i class="fas fa-file-alt"></i> ${escapeHtml(doc.document_type || 'Document')}
                        </h4>
                        ${doc.reference_number ? `
                            <p style="margin: 0.5rem 0; color: #666;">
                                <strong>Reference:</strong> ${escapeHtml(doc.reference_number)}
                            </p>
                        ` : ''}
                        ${doc.expiry_date ? `
                            <p style="margin: 0.5rem 0; color: #666;">
                                <strong>Expires:</strong> ${escapeHtml(doc.expiry_date)}
                            </p>
                        ` : ''}
                        ${doc.issue_date ? `
                            <p style="margin: 0.5rem 0; color: #666;">
                                <strong>Issue Date:</strong> ${escapeHtml(doc.issue_date)}
                            </p>
                        ` : ''}
                        ${doc.issuing_authority ? `
                            <p style="margin: 0.5rem 0; color: #666;">
                                <strong>Issuing Authority:</strong> ${escapeHtml(doc.issuing_authority)}
                            </p>
                        ` : ''}
                        <p style="margin: 0.5rem 0;">
                            <span class="status-badge ${doc.status === 'verified' ? 'verified' : doc.status === 'rejected' ? 'rejected' : 'pending'}">
                                ${doc.status || 'pending'}
                            </span>
                        </p>
                    </div>
                </div>
                
                <!-- Document Preview -->
                ${doc.image_url ? `
                    <div style="border: 1px solid #ddd; border-radius: 8px; overflow: hidden; background: #f9f9f9;">
                        <div style="max-height: 400px; overflow-y: auto; overflow-x: auto; text-align: center; padding: 1rem;">
                            <img src="${escapeHtml(imageUrl)}" 
                                 alt="${escapeHtml(doc.document_type || 'Document')}" 
                                 style="max-width: 100%; height: auto; border-radius: 4px; cursor: zoom-in;"
                                 onerror="this.onerror=null; this.src='data:image/svg+xml,%3Csvg xmlns=\\'http://www.w3.org/2000/svg\\' width=\\'400\\' height=\\'400\\'%3E%3Crect fill=\\'%23ddd\\' width=\\'400\\' height=\\'400\\'/%3E%3Ctext x=\\'50%25\\' y=\\'50%25\\' text-anchor=\\'middle\\' dy=\\'0.3em\\' font-family=\\'sans-serif\\' font-size=\\'16\\' fill=\\'%23999\\'%3EDocument not found%3C/text%3E%3C/svg%3E';"
                                 onclick="openDocumentModal(${index})">
                            </img>
                        </div>
                        <div style="padding: 0.75rem; background: white; border-top: 1px solid #ddd; display: flex; justify-content: space-between; align-items: center;">
                            <small style="color: #666;">Click image to view full screen</small>
                            <button onclick="openDocumentModal(${index})" 
                                    class="btn btn-primary" style="padding: 0.5rem 1rem; font-size: 0.9rem;">
                                <i class="fas fa-expand"></i> Full Screen
                            </button>
                        </div>
                    </div>
                ` : `
                    <p style="text-align: center; color: #999; padding: 2rem;">No document image available</p>
                `}
            </div>
        </div>
    `;
    }).join('');
}

/**
 * Renders assigned vehicles
 * @param {Array} vehicles - Vehicles array
 */
function renderVehicles(vehicles) {
    const vehiclesSection = document.getElementById('vehiclesSection');
    const vehiclesList = document.getElementById('vehiclesList');
    const vehiclesCount = document.getElementById('vehiclesCount');

    vehiclesCount.textContent = vehicles.length;
    vehiclesSection.style.display = 'block';

    vehiclesList.innerHTML = vehicles.map(vehicle => `
        <div class="card" style="padding: 1.5rem;">
            <div style="display: flex; justify-content: space-between; align-items: start; flex-wrap: wrap; gap: 1rem;">
                <div style="flex: 1; min-width: 200px;">
                    <h4 style="margin: 0 0 0.5rem 0; color: #193148;">
                        <i class="fas fa-car"></i> ${escapeHtml(vehicle.registration_number || 'N/A')}
                    </h4>
                    <p style="margin: 0.5rem 0; color: #666;">
                        <strong>Make/Model:</strong> ${escapeHtml(`${vehicle.make || ''} ${vehicle.model || ''}`.trim() || 'N/A')}
                    </p>
                    ${vehicle.route_name ? `
                        <p style="margin: 0.5rem 0; color: #666;">
                            <strong>Route:</strong> ${escapeHtml(vehicle.route_name)}
                        </p>
                    ` : ''}
                    <p style="margin: 0.5rem 0;">
                        <span class="status-badge ${vehicle.vehicle_status === 'active' ? 'active' : 'inactive'}">
                            ${vehicle.vehicle_status || 'inactive'}
                        </span>
                    </p>
                </div>
                <div>
                    <a href="admin-vehicle-details.html?id=${vehicle.ID || vehicle.id}" class="btn btn-primary">
                        <i class="fas fa-eye"></i> View Vehicle
                    </a>
                </div>
            </div>
        </div>
    `).join('');
}

/**
 * Renders admin action buttons based on driver status
 * @param {string} verificationStatus - Current verification status
 * @param {string} driverStatus - Current driver status
 */
function renderAdminActions(verificationStatus, driverStatus) {
    const pendingActions = document.getElementById('pendingActions');
    const verifiedActions = document.getElementById('verifiedActions');
    const otherActions = document.getElementById('otherActions');

    // Hide all action sections
    pendingActions.style.display = 'none';
    verifiedActions.style.display = 'none';
    otherActions.style.display = 'none';

    // Show appropriate action section
    if (verificationStatus === 'pending' || !verificationStatus) {
        pendingActions.style.display = 'block';
    } else if (verificationStatus === 'verified') {
        verifiedActions.style.display = 'block';
    } else {
        otherActions.style.display = 'block';
    }
}

// ============================================
// ADMIN ACTIONS
// ============================================

/**
 * Verifies the driver
 */
async function verifyDriver() {
    const notes = prompt('Enter verification notes (optional):');
    
    if (notes === null) {
        return; // User cancelled
    }

    try {
        const response = await axios.put(
            `${BASE_URL}/api/drivers/${currentDriverId}/verify`,
            { 
                verification_status: 'verified',
                verification_notes: notes || null
            }
        );

        if (response.data.success) {
            alert('Driver verified successfully!');
            // Reload driver details to update status
            loadDriverDetails(currentDriverId);
        } else {
            throw new Error(response.data.message || 'Failed to verify driver');
        }
    } catch (error) {
        console.error('Error verifying driver:', error);
        const errorMessage = error.response?.data?.message || error.message || 'Failed to verify driver';
        alert(`Error: ${errorMessage}`);
    }
}

/**
 * Rejects the driver
 */
async function rejectDriver() {
    const notes = prompt('Enter rejection notes (required):');
    
    if (!notes || notes.trim() === '') {
        alert('Rejection notes are required');
        return;
    }

    if (!confirm('Are you sure you want to reject this driver? This action cannot be undone.')) {
        return;
    }

    try {
        const response = await axios.put(
            `${BASE_URL}/api/drivers/${currentDriverId}/verify`,
            { 
                verification_status: 'rejected',
                verification_notes: notes
            }
        );

        if (response.data.success) {
            alert('Driver rejected successfully!');
            // Reload driver details to update status
            loadDriverDetails(currentDriverId);
        } else {
            throw new Error(response.data.message || 'Failed to reject driver');
        }
    } catch (error) {
        console.error('Error rejecting driver:', error);
        const errorMessage = error.response?.data?.message || error.message || 'Failed to reject driver';
        alert(`Error: ${errorMessage}`);
    }
}

/**
 * Suspends the driver
 */
async function suspendDriver() {
    const notes = prompt('Enter suspension notes (optional):');
    
    if (notes === null) {
        return; // User cancelled
    }

    if (!confirm('Are you sure you want to suspend this driver?')) {
        return;
    }

    try {
        const response = await axios.put(
            `${BASE_URL}/api/drivers/${currentDriverId}/verify`,
            { 
                verification_status: 'suspended',
                verification_notes: notes || null
            }
        );

        if (response.data.success) {
            alert('Driver suspended successfully!');
            // Reload driver details to update status
            loadDriverDetails(currentDriverId);
        } else {
            throw new Error(response.data.message || 'Failed to suspend driver');
        }
    } catch (error) {
        console.error('Error suspending driver:', error);
        const errorMessage = error.response?.data?.message || error.message || 'Failed to suspend driver';
        alert(`Error: ${errorMessage}`);
    }
}

/**
 * Activates the driver (sets status to active)
 */
async function activateDriver() {
    if (!confirm('Are you sure you want to activate this driver?')) {
        return;
    }

    try {
        const response = await axios.put(
            `${BASE_URL}/api/drivers/${currentDriverId}/status`,
            { status: 'active' }
        );

        if (response.data.success) {
            alert('Driver activated successfully!');
            // Reload driver details to update status
            loadDriverDetails(currentDriverId);
        } else {
            throw new Error(response.data.message || 'Failed to activate driver');
        }
    } catch (error) {
        console.error('Error activating driver:', error);
        const errorMessage = error.response?.data?.message || error.message || 'Failed to activate driver';
        alert(`Error: ${errorMessage}`);
    }
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Gets CSS class for verification status badge
 * @param {string} status - Verification status
 * @returns {string} CSS class name
 */
function getVerificationStatusClass(status) {
    switch(status) {
        case 'verified': return 'active';
        case 'rejected': return 'rejected';
        case 'suspended': return 'inactive';
        case 'pending': return 'pending';
        default: return 'pending';
    }
}

/**
 * Gets CSS class for driver status badge
 * @param {string} status - Driver status
 * @returns {string} CSS class name
 */
function getDriverStatusClass(status) {
    switch(status) {
        case 'active': return 'active';
        case 'inactive': return 'inactive';
        case 'pending': return 'pending';
        default: return 'pending';
    }
}

/**
 * Escapes HTML special characters to prevent XSS
 * @param {string} text - Text to escape
 * @returns {string} Escaped text
 */
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Shows loading state
 */
function showLoading() {
    document.getElementById('loadingState').style.display = 'block';
    document.getElementById('errorState').style.display = 'none';
    document.getElementById('driverDetailsContent').style.display = 'none';
}

/**
 * Hides loading state
 */
function hideLoading() {
    document.getElementById('loadingState').style.display = 'none';
}

/**
 * Shows error state
 * @param {string} message - Error message
 */
function showError(message) {
    document.getElementById('loadingState').style.display = 'none';
    document.getElementById('errorState').style.display = 'block';
    document.getElementById('errorMessage').textContent = message;
    document.getElementById('driverDetailsContent').style.display = 'none';
}

// ============================================
// DOCUMENT VIEWER MODAL
// ============================================

/**
 * Opens the document viewer modal
 * @param {number} index - Index of the document to display
 */
function openDocumentModal(index) {
    currentDocumentIndex = index;
    const doc = currentDocuments[index];
    
    if (!doc || !doc.image_url) {
        alert('Document not available');
        return;
    }

    // Prepare image URL
    const isBase64 = doc.image_url && (doc.image_url.startsWith('data:') || doc.image_url.startsWith('/9j/') || doc.image_url.length > 1000);
    const imageUrl = isBase64 ? 
        (doc.image_url.startsWith('data:') ? doc.image_url : `data:image/jpeg;base64,${doc.image_url}`) : 
        doc.image_url;

    // Update modal content
    document.getElementById('modalDocumentTitle').textContent = doc.document_type || 'Document';
    document.getElementById('modalDocumentContent').innerHTML = `
        <img src="${escapeHtml(imageUrl)}" 
             alt="${escapeHtml(doc.document_type || 'Document')}" 
             style="max-width: 100%; height: auto; border-radius: 4px;"
             onerror="this.onerror=null; this.src='data:image/svg+xml,%3Csvg xmlns=\\'http://www.w3.org/2000/svg\\' width=\\'800\\' height=\\'600\\'%3E%3Crect fill=\\'%23ddd\\' width=\\'800\\' height=\\'600\\'/%3E%3Ctext x=\\'50%25\\' y=\\'50%25\\' text-anchor=\\'middle\\' dy=\\'0.3em\\' font-family=\\'sans-serif\\' font-size=\\'20\\' fill=\\'%23999\\'%3EDocument not found%3C/text%3E%3C/svg%3E';">
    `;

    // Update page counter
    updatePageCounter();

    // Show/hide navigation buttons
    document.getElementById('prevPageBtn').style.display = currentDocuments.length > 1 && index > 0 ? 'block' : 'none';
    document.getElementById('nextPageBtn').style.display = currentDocuments.length > 1 && index < currentDocuments.length - 1 ? 'block' : 'none';

    // Show modal
    const modal = document.getElementById('documentModal');
    modal.style.display = 'flex';
    modal.style.alignItems = 'center';
    modal.style.justifyContent = 'center';
    document.body.style.overflow = 'hidden'; // Prevent background scrolling
}

/**
 * Closes the document viewer modal
 */
function closeDocumentModal() {
    const modal = document.getElementById('documentModal');
    modal.style.display = 'none';
    document.body.style.overflow = ''; // Restore scrolling
}

/**
 * Navigate to previous document
 */
function previousPage() {
    if (currentDocumentIndex > 0) {
        openDocumentModal(currentDocumentIndex - 1);
    }
}

/**
 * Navigate to next document
 */
function nextPage() {
    if (currentDocumentIndex < currentDocuments.length - 1) {
        openDocumentModal(currentDocumentIndex + 1);
    }
}

/**
 * Updates the page counter in the modal
 */
function updatePageCounter() {
    const counter = document.getElementById('pageCounter');
    if (currentDocuments.length > 1) {
        counter.textContent = `Document ${currentDocumentIndex + 1} of ${currentDocuments.length}`;
        counter.style.display = 'block';
    } else {
        counter.style.display = 'none';
    }
}

/**
 * Close modal when clicking outside
 */
document.addEventListener('DOMContentLoaded', function() {
    const modal = document.getElementById('documentModal');
    if (modal) {
        modal.addEventListener('click', function(e) {
            if (e.target === modal) {
                closeDocumentModal();
            }
        });

        // Close on Escape key
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape' && modal.style.display === 'flex') {
                closeDocumentModal();
            }
        });
    }
});

// ============================================
// EXPORT FUNCTIONS TO GLOBAL SCOPE
// ============================================
// Make functions globally accessible for onclick handlers

window.verifyDriver = verifyDriver;
window.rejectDriver = rejectDriver;
window.suspendDriver = suspendDriver;
window.activateDriver = activateDriver;
window.openDocumentModal = openDocumentModal;
window.closeDocumentModal = closeDocumentModal;
window.previousPage = previousPage;
window.nextPage = nextPage;

