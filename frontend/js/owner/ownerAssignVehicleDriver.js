// Owner Assign Vehicle to Driver Page
// Handles assigning vehicles to drivers with one-to-one relationship

import axios from 'axios';
import { BASE_URL } from '../AddressSelection.js';

// Use cookie-based authentication
axios.defaults.withCredentials = true;

let availableVehicles = [];
let availableDrivers = [];
let currentAssignments = [];

// ============================================
// INITIALIZATION
// ============================================

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

    loadData();
    loadCurrentAssignments();
    setupEventListeners();
});

// ============================================
// DATA LOADING
// ============================================

/**
 * Loads available vehicles and drivers
 */
async function loadData() {
    try {
        showLoading();
        
        // Load vehicles and drivers in parallel
        const [vehiclesResponse, driversResponse] = await Promise.all([
            axios.get(`${BASE_URL}/api/vehicles/owner/available-for-assignment`),
            axios.get(`${BASE_URL}/api/drivers/owner/available-for-assignment`)
        ]);

        if (!vehiclesResponse.data.success || !driversResponse.data.success) {
            throw new Error('Failed to load data');
        }

        availableVehicles = vehiclesResponse.data.vehicles || [];
        availableDrivers = driversResponse.data.drivers || [];

        if (availableVehicles.length === 0 && availableDrivers.length === 0) {
            showEmptyState();
        } else {
            hideLoading();
            renderForm();
        }
    } catch (error) {
        console.error('Error loading data:', error);
        showError(error.response?.data?.message || error.message || 'Failed to load data');
    }
}

/**
 * Loads current vehicle-driver assignments
 */
async function loadCurrentAssignments() {
    try {
        document.getElementById('assignmentsLoading').style.display = 'block';
        
        const response = await axios.get(`${BASE_URL}/api/vehicles/owner/current-assignments`);

        if (!response.data.success) {
            throw new Error('Failed to load assignments');
        }

        currentAssignments = response.data.assignments || [];
        renderAssignments();
    } catch (error) {
        console.error('Error loading assignments:', error);
        document.getElementById('assignmentsGrid').innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; padding: 2rem; color: #dc3545;">
                <i class="fas fa-exclamation-circle"></i>
                <p>Failed to load assignments: ${error.response?.data?.message || error.message}</p>
            </div>
        `;
    } finally {
        document.getElementById('assignmentsLoading').style.display = 'none';
    }
}

/**
 * Renders current assignments in the grid
 */
function renderAssignments() {
    const assignmentsGrid = document.getElementById('assignmentsGrid');
    const noAssignments = document.getElementById('noAssignments');

    if (currentAssignments.length === 0) {
        assignmentsGrid.style.display = 'none';
        noAssignments.style.display = 'block';
        return;
    }

    assignmentsGrid.style.display = 'grid';
    noAssignments.style.display = 'none';

    assignmentsGrid.innerHTML = currentAssignments.map(assignment => {
        const assignedDate = assignment.assigned_at ? new Date(assignment.assigned_at).toLocaleDateString() : 'N/A';
        const licenseExpiry = assignment.driver_license_expiry ? new Date(assignment.driver_license_expiry).toLocaleDateString() : 'N/A';
        
        return `
            <div class="assignment-card">
                <h4>
                    <i class="fas fa-link"></i>
                    Assignment #${assignment.assignment_id || assignment.vehicle_id}
                </h4>
                <div class="assignment-details">
                    <div>
                        <h5 style="margin: 0 0 0.75rem 0; color: #01386A; font-size: 1rem;">
                            <i class="fas fa-car"></i> Vehicle
                        </h5>
                        <div class="assignment-detail-row">
                            <span class="assignment-detail-label">Registration:</span>
                            <span class="assignment-detail-value">${escapeHtml(assignment.registration_number)}</span>
                        </div>
                        <div class="assignment-detail-row">
                            <span class="assignment-detail-label">License Plate:</span>
                            <span class="assignment-detail-value">${escapeHtml(assignment.license_plate)}</span>
                        </div>
                        <div class="assignment-detail-row">
                            <span class="assignment-detail-label">Make/Model:</span>
                            <span class="assignment-detail-value">${escapeHtml(assignment.make)} ${escapeHtml(assignment.model)}</span>
                        </div>
                        <div class="assignment-detail-row">
                            <span class="assignment-detail-label">Color:</span>
                            <span class="assignment-detail-value">${escapeHtml(assignment.color)}</span>
                        </div>
                        <div class="assignment-detail-row">
                            <span class="assignment-detail-label">Type:</span>
                            <span class="assignment-detail-value">${escapeHtml(assignment.vehicle_type)}</span>
                        </div>
                        <div class="assignment-detail-row">
                            <span class="assignment-detail-label">Capacity:</span>
                            <span class="assignment-detail-value">${assignment.capacity} seats</span>
                        </div>
                        ${assignment.route_name ? `
                        <div class="assignment-detail-row">
                            <span class="assignment-detail-label">Route:</span>
                            <span class="assignment-detail-value">${escapeHtml(assignment.route_name)}</span>
                        </div>
                        ` : ''}
                    </div>
                    
                    <div style="margin-top: 1rem; padding-top: 1rem; border-top: 2px solid #e0e0e0;">
                        <h5 style="margin: 0 0 0.75rem 0; color: #01386A; font-size: 1rem;">
                            <i class="fas fa-user-tie"></i> Driver
                        </h5>
                        <div class="assignment-detail-row">
                            <span class="assignment-detail-label">Name:</span>
                            <span class="assignment-detail-value">${escapeHtml(assignment.driver_name)}</span>
                        </div>
                        <div class="assignment-detail-row">
                            <span class="assignment-detail-label">Email:</span>
                            <span class="assignment-detail-value">${escapeHtml(assignment.driver_email)}</span>
                        </div>
                        <div class="assignment-detail-row">
                            <span class="assignment-detail-label">Phone:</span>
                            <span class="assignment-detail-value">${escapeHtml(assignment.driver_phone || 'N/A')}</span>
                        </div>
                        <div class="assignment-detail-row">
                            <span class="assignment-detail-label">License:</span>
                            <span class="assignment-detail-value">${escapeHtml(assignment.driver_license || 'N/A')}</span>
                        </div>
                        <div class="assignment-detail-row">
                            <span class="assignment-detail-label">License Expiry:</span>
                            <span class="assignment-detail-value">${licenseExpiry}</span>
                        </div>
                        <div class="assignment-detail-row">
                            <span class="assignment-detail-label">Status:</span>
                            <span class="assignment-detail-value">
                                <span style="padding: 0.25rem 0.5rem; border-radius: 4px; font-size: 0.85rem; 
                                    background: ${assignment.driver_status === 'active' ? '#28a745' : '#6c757d'}; 
                                    color: white;">
                                    ${assignment.driver_status || 'N/A'}
                                </span>
                            </span>
                        </div>
                    </div>
                    
                    <div style="margin-top: 1rem; padding-top: 1rem; border-top: 2px solid #e0e0e0;">
                        <div class="assignment-detail-row">
                            <span class="assignment-detail-label">Assigned Date:</span>
                            <span class="assignment-detail-value">${assignedDate}</span>
                        </div>
                    </div>
                </div>
                
                <div class="assignment-actions">
                    <button class="btn-danger" onclick="unassignVehicle('${assignment.vehicle_id}', '${assignment.driver_id}')">
                        <i class="fas fa-unlink"></i> Unassign
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

// ============================================
// FORM RENDERING
// ============================================

/**
 * Renders the assignment form with available vehicles and drivers
 */
function renderForm() {
    const vehicleSelect = document.getElementById('vehicleSelect');
    const driverSelect = document.getElementById('driverSelect');
    const assignmentForm = document.getElementById('assignmentForm');

    // Clear existing options (except the first one)
    vehicleSelect.innerHTML = '<option value="">-- Select a Vehicle --</option>';
    driverSelect.innerHTML = '<option value="">-- Select a Driver --</option>';

    // Populate vehicle select
    if (availableVehicles.length === 0) {
        vehicleSelect.innerHTML = '<option value="">No available vehicles</option>';
        vehicleSelect.disabled = true;
    } else {
        availableVehicles.forEach(vehicle => {
            const option = document.createElement('option');
            option.value = vehicle.ID;
            option.textContent = `${vehicle.registration_number} - ${vehicle.make} ${vehicle.model}${vehicle.route_name ? ` (${vehicle.route_name})` : ''}`;
            vehicleSelect.appendChild(option);
        });
    }

    // Populate driver select
    if (availableDrivers.length === 0) {
        driverSelect.innerHTML = '<option value="">No available drivers</option>';
        driverSelect.disabled = true;
    } else {
        availableDrivers.forEach(driver => {
            const option = document.createElement('option');
            option.value = driver.ID;
            option.textContent = `${driver.name} - ${driver.license_number || 'No License'}`;
            driverSelect.appendChild(option);
        });
    }

    assignmentForm.style.display = 'block';
}

// ============================================
// EVENT LISTENERS
// ============================================

/**
 * Sets up event listeners for form interactions
 */
function setupEventListeners() {
    const vehicleSelect = document.getElementById('vehicleSelect');
    const driverSelect = document.getElementById('driverSelect');
    const assignForm = document.getElementById('assignForm');

    // Show vehicle info when selected
    vehicleSelect.addEventListener('change', function() {
        const vehicleId = this.value;
        if (vehicleId) {
            const vehicle = availableVehicles.find(v => v.ID == vehicleId);
            if (vehicle) {
                showVehicleInfo(vehicle);
            }
        } else {
            document.getElementById('vehicleInfo').style.display = 'none';
        }
    });

    // Show driver info when selected
    driverSelect.addEventListener('change', function() {
        const driverId = this.value;
        if (driverId) {
            const driver = availableDrivers.find(d => d.ID == driverId);
            if (driver) {
                showDriverInfo(driver);
            }
        } else {
            document.getElementById('driverInfo').style.display = 'none';
        }
    });

    // Handle form submission
    assignForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        await assignVehicleToDriver();
    });
}

/**
 * Shows vehicle information when selected
 */
function showVehicleInfo(vehicle) {
    const vehicleInfo = document.getElementById('vehicleInfo');
    vehicleInfo.innerHTML = `
        <h4>Selected Vehicle</h4>
        <p><strong>Registration:</strong> ${escapeHtml(vehicle.registration_number)}</p>
        <p><strong>License Plate:</strong> ${escapeHtml(vehicle.license_plate)}</p>
        <p><strong>Make/Model:</strong> ${escapeHtml(vehicle.make)} ${escapeHtml(vehicle.model)}</p>
        <p><strong>Color:</strong> ${escapeHtml(vehicle.color)}</p>
        <p><strong>Type:</strong> ${escapeHtml(vehicle.vehicle_type)}</p>
        <p><strong>Capacity:</strong> ${vehicle.capacity} seats</p>
        ${vehicle.route_name ? `<p><strong>Route:</strong> ${escapeHtml(vehicle.route_name)}</p>` : ''}
    `;
    vehicleInfo.style.display = 'block';
}

/**
 * Shows driver information when selected
 */
function showDriverInfo(driver) {
    const driverInfo = document.getElementById('driverInfo');
    driverInfo.innerHTML = `
        <h4>Selected Driver</h4>
        <p><strong>Name:</strong> ${escapeHtml(driver.name)}</p>
        <p><strong>Email:</strong> ${escapeHtml(driver.email)}</p>
        <p><strong>Phone:</strong> ${escapeHtml(driver.phone || 'N/A')}</p>
        <p><strong>License Number:</strong> ${escapeHtml(driver.license_number || 'N/A')}</p>
        ${driver.license_expiry ? `<p><strong>License Expiry:</strong> ${new Date(driver.license_expiry).toLocaleDateString()}</p>` : ''}
    `;
    driverInfo.style.display = 'block';
}

// ============================================
// ASSIGNMENT
// ============================================

/**
 * Assigns the selected vehicle to the selected driver
 */
async function assignVehicleToDriver() {
    const vehicleId = document.getElementById('vehicleSelect').value;
    const driverId = document.getElementById('driverSelect').value;
    const assignBtn = document.getElementById('assignBtn');

    if (!vehicleId || !driverId) {
        alert('Please select both a vehicle and a driver');
        return;
    }

    if (!confirm('Are you sure you want to assign this vehicle to this driver? This will unassign any existing assignments (one-to-one relationship).')) {
        return;
    }

    try {
        assignBtn.disabled = true;
        assignBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Assigning...';

        const response = await axios.put(
            `${BASE_URL}/api/vehicles/${vehicleId}/assign-driver`,
            { driver_id: driverId }
        );

        if (response.data.success) {
            alert('Vehicle assigned to driver successfully!');
            // Reload data to refresh the lists and assignments
            loadData();
            loadCurrentAssignments();
        } else {
            throw new Error(response.data.message || 'Failed to assign vehicle');
        }
    } catch (error) {
        console.error('Error assigning vehicle:', error);
        const errorMessage = error.response?.data?.message || error.message || 'Failed to assign vehicle';
        alert(`Error: ${errorMessage}`);
    } finally {
        assignBtn.disabled = false;
        assignBtn.innerHTML = '<i class="fas fa-link"></i> Assign Vehicle to Driver';
    }
}

// ============================================
// UI STATE MANAGEMENT
// ============================================

function showLoading() {
    document.getElementById('loadingState').style.display = 'block';
    document.getElementById('assignmentForm').style.display = 'none';
    document.getElementById('emptyState').style.display = 'none';
    document.getElementById('errorState').style.display = 'none';
}

function hideLoading() {
    document.getElementById('loadingState').style.display = 'none';
}

function showEmptyState() {
    document.getElementById('loadingState').style.display = 'none';
    document.getElementById('assignmentForm').style.display = 'none';
    document.getElementById('emptyState').style.display = 'block';
    document.getElementById('errorState').style.display = 'none';
}

function showError(message) {
    document.getElementById('loadingState').style.display = 'none';
    document.getElementById('assignmentForm').style.display = 'none';
    document.getElementById('emptyState').style.display = 'none';
    document.getElementById('errorState').style.display = 'block';
    document.getElementById('errorMessage').textContent = message;
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Unassigns a vehicle from a driver
 */
async function unassignVehicle(vehicleId, driverId) {
    if (!confirm('Are you sure you want to unassign this vehicle from the driver?')) {
        return;
    }

    try {
        const response = await axios.put(
            `${BASE_URL}/api/vehicles/${vehicleId}/unassign-driver`
        );

        if (response.data.success) {
            alert('Vehicle unassigned from driver successfully!');
            // Reload data to refresh the lists and assignments
            loadData();
            loadCurrentAssignments();
        } else {
            throw new Error(response.data.message || 'Failed to unassign vehicle');
        }
    } catch (error) {
        console.error('Error unassigning vehicle:', error);
        const errorMessage = error.response?.data?.message || error.message || 'Failed to unassign vehicle';
        alert(`Error: ${errorMessage}`);
    }
}

/**
 * Escapes HTML special characters to prevent XSS
 */
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Export functions to global scope
window.unassignVehicle = unassignVehicle;

