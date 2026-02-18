// Admin Vehicle Details Page - Main JavaScript Module
// Handles displaying vehicle details, documents, and admin actions (approve/reject/suspend)

import axios from 'axios';
import { BASE_URL } from '../AddressSelection.js';

// Use cookie-based authentication
axios.defaults.withCredentials = true;

let currentVehicle = null;
let currentVehicleId = null;
// Document modal state
let currentDocuments = [];
let currentDocumentIndex = 0;

// ============================================
// INITIALIZATION
// ============================================

/**
 * Initialize page on DOMContentLoaded
 * - Gets vehicle ID from URL
 * - Loads vehicle details and documents
 */
document.addEventListener('DOMContentLoaded', function() {
    // Get vehicle ID from URL query parameter
    const urlParams = new URLSearchParams(window.location.search);
    const vehicleId = urlParams.get('id');

    if (!vehicleId) {
        showError('Vehicle ID is required');
        return;
    }

    currentVehicleId = vehicleId;
    loadVehicleDetails(vehicleId);
});

// ============================================
// LOAD VEHICLE DATA
// ============================================

/**
 * Loads vehicle details from API
 * @param {string|number} vehicleId - Vehicle ID
 */
async function loadVehicleDetails(vehicleId) {
    try {
        showLoading();

        // Load vehicle details
        const vehicleResponse = await axios.get(`${BASE_URL}/api/vehicles/${vehicleId}`);
        
        if (!vehicleResponse.data.success) {
            throw new Error(vehicleResponse.data.message || 'Failed to load vehicle details');
        }

        currentVehicle = vehicleResponse.data.vehicle;

        // Load vehicle documents
        let documents = [];
        try {
            const docsResponse = await axios.get(`${BASE_URL}/api/documents/vehicle/${vehicleId}`);
            if (docsResponse.data.success) {
                documents = docsResponse.data.documents || [];
            }
        } catch (error) {
            console.error('Error loading documents:', error);
        }

        // Render vehicle details
        renderVehicleDetails(currentVehicle, documents);

    } catch (error) {
        console.error('Error loading vehicle details:', error);
        const errorMessage = error.response?.data?.message || error.message || 'Failed to load vehicle details';
        showError(errorMessage);
    }
}

// ============================================
// RENDER VEHICLE DETAILS
// ============================================

/**
 * Renders vehicle details and documents on the page
 * @param {Object} vehicle - Vehicle data from API
 * @param {Array} documents - Vehicle documents array
 */
function renderVehicleDetails(vehicle, documents) {
    hideLoading();

    // Parse route_types (SET type from database)
    let routeTypes = vehicle.route_types;
    if (typeof routeTypes === 'string') {
        routeTypes = routeTypes.split(',').map(rt => rt.trim()).filter(rt => rt);
    } else if (!Array.isArray(routeTypes)) {
        routeTypes = [];
    }

    // Parse images (JSON field)
    let images = vehicle.images;
    console.log('Raw images from API:', images); // Debug log
    if (typeof images === 'string') {
        try {
            images = JSON.parse(images);
        } catch (e) {
            console.error('Error parsing images string:', e);
            images = [];
        }
    } else if (!Array.isArray(images)) {
        images = [];
    }
    console.log('Parsed images array:', images); // Debug log

    // Basic Details
    document.getElementById('registrationNumber').textContent = vehicle.registration_number || 'N/A';
    document.getElementById('licensePlate').textContent = vehicle.license_plate || 'N/A';
    document.getElementById('makeModel').textContent = `${vehicle.make || ''} ${vehicle.model || ''}`.trim() || 'N/A';
    document.getElementById('color').textContent = vehicle.color || 'N/A';
    document.getElementById('vehicleType').textContent = vehicle.vehicle_type || 'N/A';
    document.getElementById('capacity').textContent = vehicle.capacity ? `${vehicle.capacity} seats` : 'N/A';
    document.getElementById('extraSpaceParcel').textContent = vehicle.extraspace_parcel_sp ? `${vehicle.extraspace_parcel_sp} SP` : 'N/A';

    // Owner & Driver Information
    document.getElementById('ownerName').textContent = vehicle.owner_name || 'N/A';
    document.getElementById('ownerEmail').textContent = vehicle.owner_email || '';
    document.getElementById('driverName').textContent = vehicle.driver_name || 'Not Assigned';
    document.getElementById('driverEmail').textContent = vehicle.driver_email || '';
    document.getElementById('routeName').textContent = vehicle.route_name || 'N/A';
    
    // Route details
    if (vehicle.location_1 && vehicle.location_2) {
        document.getElementById('routeDetails').textContent = `${vehicle.location_1} → ${vehicle.location_2}`;
    } else {
        document.getElementById('routeDetails').textContent = '';
    }

    document.getElementById('routeTypes').textContent = routeTypes.length > 0 ? routeTypes.join(', ') : 'N/A';

    // Status badges
    const vehicleStatus = vehicle.vehicle_status || 'inactive';
    const adminStatus = vehicle.admin_status || 'pending';
    
    const vehicleStatusBadge = document.getElementById('vehicleStatusBadge');
    vehicleStatusBadge.textContent = vehicleStatus;
    vehicleStatusBadge.className = `status-badge ${vehicleStatus === 'active' ? 'active' : 'inactive'}`;

    const adminStatusBadge = document.getElementById('adminStatusBadge');
    adminStatusBadge.textContent = adminStatus;
    adminStatusBadge.className = `status-badge ${getAdminStatusClass(adminStatus)}`;

    const adminStatusBadge2 = document.getElementById('adminStatusBadge2');
    adminStatusBadge2.textContent = adminStatus;
    adminStatusBadge2.className = `status-badge ${getAdminStatusClass(adminStatus)}`;

    // Description
    if (vehicle.description) {
        document.getElementById('descriptionSection').style.display = 'block';
        document.getElementById('description').textContent = vehicle.description;
    } else {
        document.getElementById('descriptionSection').style.display = 'none';
    }

    // Images - Handle both string URLs and objects with url property
    if (images && images.length > 0) {
        // Filter out null/undefined images and extract URL from objects if needed
        const validImages = images.filter(img => img !== null && img !== undefined).map(img => {
            // If image is an object with url property, extract the URL
            if (typeof img === 'object' && img !== null && img.url) {
                return img.url;
            }
            // If image is already a string (URL), use it directly
            if (typeof img === 'string') {
                return img;
            }
            // If image is an object but no url property, log it for debugging
            if (typeof img === 'object' && img !== null) {
                console.warn('Image object without url property:', img);
            }
            return null;
        }).filter(url => url !== null && url !== undefined && url !== ''); // Remove any null/undefined/empty values
        
        console.log('Valid images URLs:', validImages); // Debug log
        
        if (validImages.length > 0) {
            const imagesGrid = document.getElementById('imagesGrid');
            imagesGrid.innerHTML = validImages.map(imgUrl => {
                // Ensure the URL is properly escaped
                const escapedUrl = escapeHtml(imgUrl);
                return `
                    <div style="position: relative; border-radius: 8px; overflow: hidden; border: 1px solid #ddd;">
                        <img src="${escapedUrl}" alt="Vehicle Image" 
                             style="width: 100%; height: 200px; object-fit: cover; display: block; cursor: pointer;"
                             onerror="this.onerror=null; this.src='data:image/svg+xml,%3Csvg xmlns=\\'http://www.w3.org/2000/svg\\' width=\\'200\\' height=\\'200\\'%3E%3Crect fill=\\'%23ddd\\' width=\\'200\\' height=\\'200\\'/%3E%3Ctext x=\\'50%25\\' y=\\'50%25\\' text-anchor=\\'middle\\' dy=\\'0.3em\\' font-family=\\'sans-serif\\' font-size=\\'14\\' fill=\\'%23999\\'%3EImage not found%3C/text%3E%3C/svg%3E';"
                             onclick="window.open('${escapedUrl}', '_blank')">
                    </div>
                `;
            }).join('');
            document.getElementById('imagesSection').style.display = 'block';
        } else {
            console.warn('No valid images found after processing. Original images:', images);
            document.getElementById('imagesSection').style.display = 'none';
        }
    } else {
        console.log('No images found in vehicle data');
        document.getElementById('imagesSection').style.display = 'none';
    }

    // Documents
    renderDocuments(documents);

    // Admin Actions
    renderAdminActions(adminStatus);

    // Show content
    document.getElementById('vehicleDetailsContent').style.display = 'block';
}

/**
 * Renders vehicle documents with inline viewing capability
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
 * Renders admin action buttons based on vehicle status
 * @param {string} adminStatus - Current admin status
 */
function renderAdminActions(adminStatus) {
    const pendingActions = document.getElementById('pendingActions');
    const approvedActions = document.getElementById('approvedActions');
    const otherActions = document.getElementById('otherActions');

    // Hide all action sections
    pendingActions.style.display = 'none';
    approvedActions.style.display = 'none';
    otherActions.style.display = 'none';

    // Show appropriate action section
    if (adminStatus === 'pending' || !adminStatus) {
        pendingActions.style.display = 'block';
    } else if (adminStatus === 'approve') {
        approvedActions.style.display = 'block';
    } else {
        otherActions.style.display = 'block';
    }
}

// ============================================
// ADMIN ACTIONS
// ============================================

/**
 * Approves the vehicle
 */
async function approveVehicle() {
    if (!confirm('Are you sure you want to approve this vehicle? This will make it active and allow it to be added to routes.')) {
        return;
    }

    try {
        const response = await axios.put(
            `${BASE_URL}/api/vehicles/${currentVehicleId}/admin/approve`,
            { admin_status: 'approve' }
        );

        if (response.data.success) {
            alert('Vehicle approved successfully!');
            // Reload vehicle details to update status
            loadVehicleDetails(currentVehicleId);
        } else {
            throw new Error(response.data.message || 'Failed to approve vehicle');
        }
    } catch (error) {
        console.error('Error approving vehicle:', error);
        const errorMessage = error.response?.data?.message || error.message || 'Failed to approve vehicle';
        alert(`Error: ${errorMessage}`);
    }
}

/**
 * Rejects the vehicle
 */
async function rejectVehicle() {
    if (!confirm('Are you sure you want to reject this vehicle? This action cannot be undone.')) {
        return;
    }

    try {
        const response = await axios.put(
            `${BASE_URL}/api/vehicles/${currentVehicleId}/admin/approve`,
            { admin_status: 'reject' }
        );

        if (response.data.success) {
            alert('Vehicle rejected successfully!');
            // Reload vehicle details to update status
            loadVehicleDetails(currentVehicleId);
        } else {
            throw new Error(response.data.message || 'Failed to reject vehicle');
        }
    } catch (error) {
        console.error('Error rejecting vehicle:', error);
        const errorMessage = error.response?.data?.message || error.message || 'Failed to reject vehicle';
        alert(`Error: ${errorMessage}`);
    }
}

/**
 * Suspends the vehicle
 */
async function suspendVehicle() {
    if (!confirm('Are you sure you want to suspend this vehicle? It will be removed from active routes.')) {
        return;
    }

    try {
        const response = await axios.put(
            `${BASE_URL}/api/vehicles/${currentVehicleId}/admin/approve`,
            { admin_status: 'suspended' }
        );

        if (response.data.success) {
            alert('Vehicle suspended successfully!');
            // Reload vehicle details to update status
            loadVehicleDetails(currentVehicleId);
        } else {
            throw new Error(response.data.message || 'Failed to suspend vehicle');
        }
    } catch (error) {
        console.error('Error suspending vehicle:', error);
        const errorMessage = error.response?.data?.message || error.message || 'Failed to suspend vehicle';
        alert(`Error: ${errorMessage}`);
    }
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Gets CSS class for admin status badge
 * @param {string} status - Admin status
 * @returns {string} CSS class name
 */
function getAdminStatusClass(status) {
    switch(status) {
        case 'approve': return 'active';
        case 'reject': return 'rejected';
        case 'suspended': return 'inactive';
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
    document.getElementById('vehicleDetailsContent').style.display = 'none';
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
    document.getElementById('vehicleDetailsContent').style.display = 'none';
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

window.approveVehicle = approveVehicle;
window.rejectVehicle = rejectVehicle;
window.suspendVehicle = suspendVehicle;
window.openDocumentModal = openDocumentModal;
window.closeDocumentModal = closeDocumentModal;
window.previousPage = previousPage;
window.nextPage = nextPage;

