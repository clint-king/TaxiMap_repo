import axios from 'axios';
import { BASE_URL } from '../AddressSelection.js';

// Use cookie-based authentication (same as client-side APIs)
axios.defaults.withCredentials = true;

let allVehicles = [];
let filteredVehicles = [];
let currentVehicle = null;
let allOwners = [];
let allRoutes = [];

/**
 * Load all vehicles from the API
 */
export async function loadVehicles() {
    try {
        const response = await axios.get(`${BASE_URL}/api/vehicles/admin/all`);

        if (response.data.success) {
            allVehicles = response.data.vehicles;
            filteredVehicles = allVehicles;
            renderVehicles();
        } else {
            console.error('Failed to load vehicles:', response.data.message);
            showError('Failed to load vehicles');
        }
    } catch (error) {
        console.error('Error loading vehicles:', error);
        showError('Error loading vehicles. Please try again.');
    }
}

/**
 * Render vehicles in the table
 */
function renderVehicles() {
    const tbody = document.getElementById('vehiclesTableBody');
    
    if (filteredVehicles.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="9" style="text-align: center; padding: 2rem;">
                    No vehicles found
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = filteredVehicles.map(vehicle => {
        // route_types is SET, so it comes as comma-separated string or array
        let routeTypes = vehicle.route_types;
        if (typeof routeTypes === 'string') {
            // If it's a comma-separated string, split it
            if (routeTypes.includes(',')) {
                routeTypes = routeTypes.split(',').map(rt => rt.trim());
            } else if (routeTypes) {
                // Single value
                routeTypes = [routeTypes];
            } else {
                routeTypes = [];
            }
        } else if (!routeTypes) {
            routeTypes = [];
        }

        return `
            <tr>
                <td>${vehicle.ID || vehicle.id}</td>
                <td>${escapeHtml(vehicle.registration_number || 'N/A')}</td>
                <td>${escapeHtml(vehicle.make || '')} ${escapeHtml(vehicle.model || '')}</td>
                <td>${escapeHtml(vehicle.owner_name || 'N/A')}</td>
                <td>${escapeHtml(vehicle.driver_name || 'Not Assigned')}</td>
                <td>${escapeHtml(vehicle.route_name || 'N/A')}</td>
                <td>
                    <span class="status-badge ${getAdminStatusClass(vehicle.admin_status)}">
                        ${vehicle.admin_status || 'pending'}
                    </span>
                </td>
                <td>
                    <span class="status-badge ${vehicle.vehicle_status === 'active' ? 'active' : 'inactive'}">
                        ${vehicle.vehicle_status || 'inactive'}
                    </span>
                </td>
                <td>
                    <a href="admin-vehicle-details.html?id=${vehicle.ID || vehicle.id}" class="btn btn-sm btn-primary" title="View Details">
                        <i class="fas fa-eye"></i> View Details
                    </a>
                </td>
            </tr>
        `;
    }).join('');
}

/**
 * Get CSS class for admin status
 */
function getAdminStatusClass(status) {
    switch(status) {
        case 'approve': return 'approved';
        case 'reject': return 'rejected';
        case 'suspended': return 'inactive';
        case 'pending': return 'pending';
        default: return 'pending';
    }
}

/**
 * View vehicle details
 */
export async function viewVehicleDetails(vehicleId) {
    try {
        // Get vehicle details
        const vehicleResponse = await axios.get(
            `${BASE_URL}/api/vehicles/${vehicleId}`
        );

        if (!vehicleResponse.data.success) {
            showError('Failed to load vehicle details');
            return;
        }

        currentVehicle = vehicleResponse.data.vehicle;
        
        // Get vehicle documents
        let documents = [];
        try {
            const docsResponse = await axios.get(
                `${BASE_URL}/api/documents/vehicle/${vehicleId}`
            );
            if (docsResponse.data.success) {
                documents = docsResponse.data.documents || [];
            }
        } catch (error) {
            console.error('Error loading documents:', error);
        }

        // route_types is SET, so it comes as comma-separated string or array
        let routeTypes = currentVehicle.route_types;
        if (typeof routeTypes === 'string') {
            // If it's a comma-separated string, split it
            if (routeTypes.includes(',')) {
                routeTypes = routeTypes.split(',').map(rt => rt.trim());
            } else if (routeTypes) {
                // Single value
                routeTypes = [routeTypes];
            } else {
                routeTypes = [];
            }
        } else if (!routeTypes) {
            routeTypes = [];
        }

        let images = currentVehicle.images;
        if (typeof images === 'string') {
            try {
                images = JSON.parse(images);
            } catch (e) {
                images = [];
            }
        }

        // Render modal content
        const modalBody = document.getElementById('vehicleModalBody');
        modalBody.innerHTML = `
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem;">
                <div>
                    <h3 style="margin-bottom: 1rem; color: #193148;">Vehicle Information</h3>
                    <div class="info-group">
                        <label>Registration Number:</label>
                        <p>${escapeHtml(currentVehicle.registration_number || 'N/A')}</p>
                    </div>
                    <div class="info-group">
                        <label>License Plate:</label>
                        <p>${escapeHtml(currentVehicle.license_plate || 'N/A')}</p>
                    </div>
                    <div class="info-group">
                        <label>Make & Model:</label>
                        <p>${escapeHtml(currentVehicle.make || '')} ${escapeHtml(currentVehicle.model || '')}</p>
                    </div>
                    <div class="info-group">
                        <label>Color:</label>
                        <p>${escapeHtml(currentVehicle.color || 'N/A')}</p>
                    </div>
                    <div class="info-group">
                        <label>Vehicle Type:</label>
                        <p>${escapeHtml(currentVehicle.vehicle_type || 'N/A')}</p>
                    </div>
                    <div class="info-group">
                        <label>Capacity:</label>
                        <p>${currentVehicle.capacity || 'N/A'} seats</p>
                    </div>
                    <div class="info-group">
                        <label>Route Types:</label>
                        <p>${Array.isArray(routeTypes) ? routeTypes.join(', ') : 'N/A'}</p>
                    </div>
                </div>
                <div>
                    <h3 style="margin-bottom: 1rem; color: #193148;">Owner & Driver</h3>
                    <div class="info-group">
                        <label>Owner:</label>
                        <p>${escapeHtml(currentVehicle.owner_name || 'N/A')}</p>
                        <small>${escapeHtml(currentVehicle.owner_email || '')}</small>
                    </div>
                    <div class="info-group">
                        <label>Driver:</label>
                        <p>${escapeHtml(currentVehicle.driver_name || 'Not Assigned')}</p>
                        <small>${escapeHtml(currentVehicle.driver_email || '')}</small>
                    </div>
                    <div class="info-group">
                        <label>Route:</label>
                        <p>${escapeHtml(currentVehicle.route_name || 'N/A')}</p>
                        ${currentVehicle.location_1 && currentVehicle.location_2 ? 
                            `<small>${escapeHtml(currentVehicle.location_1)} → ${escapeHtml(currentVehicle.location_2)}</small>` : ''}
                    </div>
                    <div class="info-group">
                        <label>Admin Status:</label>
                        <p><span class="status-badge ${getAdminStatusClass(currentVehicle.admin_status)}">${currentVehicle.admin_status || 'pending'}</span></p>
                    </div>
                    <div class="info-group">
                        <label>Vehicle Status:</label>
                        <p><span class="status-badge ${currentVehicle.vehicle_status === 'active' ? 'active' : 'inactive'}">${currentVehicle.vehicle_status || 'inactive'}</span></p>
                    </div>
                </div>
            </div>
            
            ${images && images.length > 0 ? `
                <div style="margin-top: 2rem;">
                    <h3 style="margin-bottom: 1rem; color: #193148;">Vehicle Images</h3>
                    <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 1rem;">
                        ${images.map(img => `
                            <img src="${escapeHtml(img)}" alt="Vehicle Image" style="width: 100%; height: 150px; object-fit: cover; border-radius: 8px; border: 1px solid #ddd;">
                        `).join('')}
                    </div>
                </div>
            ` : ''}
            
            <div style="margin-top: 2rem;">
                <h3 style="margin-bottom: 1rem; color: #193148;">Documents (${documents.length})</h3>
                ${documents.length > 0 ? `
                    <div style="display: grid; gap: 1rem;">
                        ${documents.map(doc => `
                            <div class="card" style="padding: 1rem;">
                                <div style="display: flex; justify-content: space-between; align-items: start;">
                                    <div>
                                        <strong>${escapeHtml(doc.document_type || 'N/A')}</strong>
                                        ${doc.reference_number ? `<p style="margin: 0.5rem 0 0 0; color: #666;">Ref: ${escapeHtml(doc.reference_number)}</p>` : ''}
                                        ${doc.expiry_date ? `<p style="margin: 0.5rem 0 0 0; color: #666;">Expires: ${escapeHtml(doc.expiry_date)}</p>` : ''}
                                        <p style="margin: 0.5rem 0 0 0;">
                                            <span class="status-badge ${doc.status === 'verified' ? 'verified' : doc.status === 'rejected' ? 'rejected' : 'pending'}">
                                                ${doc.status || 'pending'}
                                            </span>
                                        </p>
                                    </div>
                                    ${doc.image_url ? `
                                        <a href="${escapeHtml(doc.image_url)}" target="_blank" class="btn btn-sm btn-primary">
                                            <i class="fas fa-eye"></i> View
                                        </a>
                                    ` : ''}
                                </div>
                            </div>
                        `).join('')}
                    </div>
                ` : '<p style="color: #666;">No documents uploaded</p>'}
            </div>
        `;

        // Render action buttons
        const modalFooter = document.getElementById('vehicleModalFooter');
        const isPending = currentVehicle.admin_status === 'pending' || !currentVehicle.admin_status;
        modalFooter.innerHTML = `
            <button type="button" class="btn btn-secondary" onclick="closeVehicleModal()">Close</button>
            ${isPending ? `
                <button type="button" class="btn btn-success" onclick="approveVehicle(${vehicleId})">
                    <i class="fas fa-check"></i> Approve
                </button>
                <button type="button" class="btn btn-danger" onclick="rejectVehicle(${vehicleId})">
                    <i class="fas fa-times"></i> Reject
                </button>
            ` : currentVehicle.admin_status === 'approve' ? `
                <button type="button" class="btn btn-warning" onclick="suspendVehicle(${vehicleId})">
                    <i class="fas fa-ban"></i> Suspend
                </button>
            ` : ''}
        `;

        // Show modal
        const modal = document.getElementById('vehicleModal');
        modal.style.display = 'flex';
        modal.classList.add('show');
    } catch (error) {
        console.error('Error loading vehicle details:', error);
        showError('Failed to load vehicle details');
    }
}

/**
 * Approve vehicle
 */
export async function approveVehicle(vehicleId) {
    if (!confirm('Are you sure you want to approve this vehicle?')) {
        return;
    }

    try {
        const response = await axios.put(
            `${BASE_URL}/api/vehicles/${vehicleId}/admin/approve`,
            { admin_status: 'approve' }
        );

        if (response.data.success) {
            showSuccess('Vehicle approved successfully');
            closeVehicleModal();
            loadVehicles();
        } else {
            showError(response.data.message || 'Failed to approve vehicle');
        }
    } catch (error) {
        console.error('Error approving vehicle:', error);
        const errorMessage = error.response?.data?.message || error.message || 'Failed to approve vehicle';
        showError(errorMessage);
    }
}

/**
 * Reject vehicle
 */
export async function rejectVehicle(vehicleId) {
    if (!confirm('Are you sure you want to reject this vehicle?')) {
        return;
    }

    try {
        const response = await axios.put(
            `${BASE_URL}/api/vehicles/${vehicleId}/admin/approve`,
            { admin_status: 'reject' }
        );

        if (response.data.success) {
            showSuccess('Vehicle rejected successfully');
            closeVehicleModal();
            loadVehicles();
        } else {
            showError(response.data.message || 'Failed to reject vehicle');
        }
    } catch (error) {
        console.error('Error rejecting vehicle:', error);
        const errorMessage = error.response?.data?.message || error.message || 'Failed to reject vehicle';
        showError(errorMessage);
    }
}

/**
 * Suspend vehicle
 */
export async function suspendVehicle(vehicleId) {
    if (!confirm('Are you sure you want to suspend this vehicle?')) {
        return;
    }

    try {
        const response = await axios.put(
            `${BASE_URL}/api/vehicles/${vehicleId}/admin/approve`,
            { admin_status: 'suspended' }
        );

        if (response.data.success) {
            showSuccess('Vehicle suspended successfully');
            closeVehicleModal();
            loadVehicles();
        } else {
            showError(response.data.message || 'Failed to suspend vehicle');
        }
    } catch (error) {
        console.error('Error suspending vehicle:', error);
        const errorMessage = error.response?.data?.message || error.message || 'Failed to suspend vehicle';
        showError(errorMessage);
    }
}

/**
 * Close vehicle modal
 */
export function closeVehicleModal() {
    const modal = document.getElementById('vehicleModal');
    modal.style.display = 'none';
    modal.classList.remove('show');
    currentVehicle = null;
}

/**
 * Filter vehicles
 */
export function filterVehicles() {
    const adminStatus = document.getElementById('statusFilter').value;
    const vehicleStatus = document.getElementById('vehicleStatusFilter').value;

    filteredVehicles = allVehicles.filter(vehicle => {
        const matchesAdminStatus = adminStatus === 'all' || vehicle.admin_status === adminStatus;
        const matchesVehicleStatus = vehicleStatus === 'all' || vehicle.vehicle_status === vehicleStatus;
        return matchesAdminStatus && matchesVehicleStatus;
    });

    renderVehicles();
}

/**
 * Refresh vehicles list
 */
export function refreshVehicles() {
    loadVehicles();
}

/**
 * Show success message
 */
function showSuccess(message) {
    alert(message);
}

/**
 * Show error message
 */
function showError(message) {
    alert('Error: ' + message);
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
    if (text === null || text === undefined) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Open modal for adding a new vehicle
 */
export async function openAddVehicleModal() {
    const modal = document.getElementById('addVehicleModal');
    document.getElementById('addVehicleForm').reset();
    
    // Load owners and routes
    await loadOwners();
    await loadRoutes();
    
    modal.style.display = 'flex';
    modal.classList.add('show');
}

/**
 * Close add vehicle modal
 */
export function closeAddVehicleModal() {
    const modal = document.getElementById('addVehicleModal');
    modal.style.display = 'none';
    modal.classList.remove('show');
    document.getElementById('addVehicleForm').reset();
}

/**
 * Load all owners for dropdown
 */
async function loadOwners() {
    try {
        const response = await axios.get(`${BASE_URL}/api/owners/admin/all`);

        if (response.data.success) {
            allOwners = response.data.owners || [];
            const ownerSelect = document.getElementById('add_owner_id');
            ownerSelect.innerHTML = '<option value="">Select Owner</option>' +
                allOwners.map(owner => 
                    `<option value="${owner.ID || owner.id}">${escapeHtml(owner.name || owner.email)} (${escapeHtml(owner.email)})</option>`
                ).join('');
        }
    } catch (error) {
        console.error('Error loading owners:', error);
        document.getElementById('add_owner_id').innerHTML = '<option value="">Error loading owners</option>';
    }
}

/**
 * Load all routes for dropdown
 */
async function loadRoutes() {
    try {
        const response = await axios.get(`${BASE_URL}/admin/existing-routes`);

        if (response.data.success) {
            allRoutes = response.data.routes || [];
            const routeSelect = document.getElementById('add_existing_route_id');
            routeSelect.innerHTML = '<option value="">None (Custom routes only)</option>' +
                allRoutes.map(route => 
                    `<option value="${route.id}">${escapeHtml(route.route_name)} (${escapeHtml(route.location_1)} → ${escapeHtml(route.location_2)})</option>`
                ).join('');
        }
    } catch (error) {
        console.error('Error loading routes:', error);
        document.getElementById('add_existing_route_id').innerHTML = '<option value="">Error loading routes</option>';
    }
}

/**
 * Handle add vehicle form submission
 */
export async function handleAddVehicleSubmit(event) {
    event.preventDefault();
    
    const formData = {
        owner_id: document.getElementById('add_owner_id').value,
        registration_number: document.getElementById('add_registration_number').value.trim(),
        license_plate: document.getElementById('add_license_plate').value.trim(),
        make: document.getElementById('add_make').value.trim(),
        model: document.getElementById('add_model').value.trim(),
        color: document.getElementById('add_color').value.trim() || null,
        vehicle_type: document.getElementById('add_vehicle_type').value,
        capacity: parseInt(document.getElementById('add_capacity').value),
        extraspace_parcel_sp: parseInt(document.getElementById('add_extraspace_parcel_sp').value),
        existing_route_id: document.getElementById('add_existing_route_id').value || null,
        description: document.getElementById('add_description').value.trim() || null
    };

    // Get route types from checkboxes
    const routeTypesCheckboxes = document.querySelectorAll('input[name="route_types"]:checked');
    formData.route_types = Array.from(routeTypesCheckboxes).map(cb => cb.value);

    // Parse JSON fields
    try {
        const imagesText = document.getElementById('add_images').value.trim();
        formData.images = imagesText ? JSON.parse(imagesText) : [];
    } catch (e) {
        showError('Invalid JSON format for images');
        return;
    }

    try {
        const videosText = document.getElementById('add_videos').value.trim();
        formData.videos = videosText ? JSON.parse(videosText) : [];
    } catch (e) {
        showError('Invalid JSON format for videos');
        return;
    }

    try {
        const featuresText = document.getElementById('add_features').value.trim();
        formData.features = featuresText ? JSON.parse(featuresText) : [];
    } catch (e) {
        showError('Invalid JSON format for features');
        return;
    }

    // Validate extraspace_parcel_sp
    if (isNaN(formData.extraspace_parcel_sp) || formData.extraspace_parcel_sp < 4 || formData.extraspace_parcel_sp > 16) {
        showError('Extra Space Parcel (SP) must be a valid number between 4 and 16');
        return;
    }
    if (formData.extraspace_parcel_sp % 4 !== 0) {
        showError('Extra Space Parcel (SP) must be a multiple of 4 (4, 8, 12, or 16)');
        return;
    }

    try {
        const response = await axios.post(
            `${BASE_URL}/api/vehicles`,
            formData
        );

        if (response.data.success) {
            showSuccess('Vehicle created successfully');
            closeAddVehicleModal();
            loadVehicles();
        } else {
            showError(response.data.message || 'Failed to create vehicle');
        }
    } catch (error) {
        console.error('Error creating vehicle:', error);
        const errorMessage = error.response?.data?.message || error.message || 'Failed to create vehicle';
        showError(errorMessage);
    }
}

// Close modal when clicking outside
window.onclick = function(event) {
    const vehicleModal = document.getElementById('vehicleModal');
    const addVehicleModal = document.getElementById('addVehicleModal');
    
    if (event.target === vehicleModal) {
        closeVehicleModal();
    }
    if (event.target === addVehicleModal) {
        closeAddVehicleModal();
    }
}

