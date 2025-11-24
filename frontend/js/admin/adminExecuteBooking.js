// Admin Execute Booking Page
// Allows admin to execute bookings and see next vehicle in queue

import axios from 'axios';
import { BASE_URL } from '../AddressSelection.js';

// Use cookie-based authentication
axios.defaults.withCredentials = true;

let availableRoutes = [];
let selectedRoute = null;
let nextVehicle = null;

// ============================================
// INITIALIZATION
// ============================================

document.addEventListener('DOMContentLoaded', function() {
    loadRoutes();
    setupEventListeners();
});

// ============================================
// DATA LOADING
// ============================================

/**
 * Loads all active existing routes
 */
async function loadRoutes() {
    try {
        showLoading();
        
        const response = await axios.get(`${BASE_URL}/admin/existing-routes`, {
            params: { status: 'active' }
        });

        if (!response.data.success) {
            throw new Error('Failed to load routes');
        }

        availableRoutes = response.data.routes || [];
        renderRoutes();
        hideLoading();
    } catch (error) {
        console.error('Error loading routes:', error);
        showError(error.response?.data?.message || error.message || 'Failed to load routes');
    }
}

/**
 * Renders routes in the select dropdown
 */
function renderRoutes() {
    const routeSelect = document.getElementById('routeSelect');
    routeSelect.innerHTML = '<option value="">-- Select a Route --</option>';

    if (availableRoutes.length === 0) {
        routeSelect.innerHTML = '<option value="">No active routes available</option>';
        routeSelect.disabled = true;
        return;
    }

    availableRoutes.forEach(route => {
        const option = document.createElement('option');
        option.value = route.ID;
        option.textContent = `${route.route_name} (${route.location_1} → ${route.location_2})`;
        routeSelect.appendChild(option);
    });
}

/**
 * Loads the next vehicle in queue for the selected route
 */
async function loadNextVehicle() {
    const routeId = document.getElementById('routeSelect').value;
    
    if (!routeId) {
        alert('Please select a route first');
        return;
    }

    try {
        const loadBtn = document.getElementById('loadVehicleBtn');
        loadBtn.disabled = true;
        loadBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Loading...';

        const response = await axios.get(`${BASE_URL}/api/vehicles/queue/next`, {
            params: { route_id: routeId }
        });

        if (!response.data.success) {
            throw new Error(response.data.message || 'Failed to load next vehicle');
        }

        selectedRoute = response.data.route;
        nextVehicle = response.data.next_vehicle;

        if (!nextVehicle) {
            alert('No vehicle available at position 1 for this route. Please try again later.');
            hideNextVehicleSection();
            return;
        }

        displayNextVehicle();
        showBookingDetailsSection();
    } catch (error) {
        console.error('Error loading next vehicle:', error);
        const errorMessage = error.response?.data?.message || error.message || 'Failed to load next vehicle';
        alert(`Error: ${errorMessage}`);
        hideNextVehicleSection();
    } finally {
        const loadBtn = document.getElementById('loadVehicleBtn');
        loadBtn.disabled = false;
        loadBtn.innerHTML = '<i class="fas fa-search"></i> View Next Vehicle in Queue';
    }
}

/**
 * Displays the next vehicle information
 */
function displayNextVehicle() {
    const nextVehicleInfo = document.getElementById('nextVehicleInfo');
    const vehicle = nextVehicle;

    nextVehicleInfo.innerHTML = `
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 2rem;">
            <div>
                <h3 style="color: #01386A; margin-bottom: 1rem;">
                    <i class="fas fa-car"></i> Vehicle Information
                </h3>
                <div class="info-group">
                    <label>Registration Number:</label>
                    <p>${escapeHtml(vehicle.registration_number)}</p>
                </div>
                <div class="info-group">
                    <label>License Plate:</label>
                    <p>${escapeHtml(vehicle.license_plate || 'N/A')}</p>
                </div>
                <div class="info-group">
                    <label>Make/Model:</label>
                    <p>${escapeHtml(vehicle.make)} ${escapeHtml(vehicle.model)}</p>
                </div>
                <div class="info-group">
                    <label>Vehicle Type:</label>
                    <p>${escapeHtml(vehicle.vehicle_type)}</p>
                </div>
                <div class="info-group">
                    <label>Capacity:</label>
                    <p>${vehicle.capacity} seats</p>
                </div>
                <div class="info-group">
                    <label>Status:</label>
                    <p>
                        <span class="status-badge ${vehicle.vehicle_status === 'active' ? 'active' : 'inactive'}">
                            ${vehicle.vehicle_status}
                        </span>
                        <span class="status-badge ${vehicle.admin_status === 'approve' ? 'verified' : 'pending'}" style="margin-left: 0.5rem;">
                            ${vehicle.admin_status}
                        </span>
                    </p>
                </div>
            </div>
            <div>
                <h3 style="color: #01386A; margin-bottom: 1rem;">
                    <i class="fas fa-user-tie"></i> Driver Information
                </h3>
                <div class="info-group">
                    <label>Name:</label>
                    <p>${escapeHtml(vehicle.driver_name || 'N/A')}</p>
                </div>
                <div class="info-group">
                    <label>Email:</label>
                    <p>${escapeHtml(vehicle.driver_email || 'N/A')}</p>
                </div>
                <div class="info-group">
                    <label>Phone:</label>
                    <p>${escapeHtml(vehicle.driver_phone || 'N/A')}</p>
                </div>
                <div class="info-group">
                    <label>License Number:</label>
                    <p>${escapeHtml(vehicle.driver_license_number || 'N/A')}</p>
                </div>
                <div class="info-group">
                    <label>Driver Status:</label>
                    <p>
                        <span class="status-badge ${vehicle.driver_status === 'active' ? 'active' : 'inactive'}">
                            ${vehicle.driver_status}
                        </span>
                        <span class="status-badge ${vehicle.driver_verification_status === 'verified' ? 'verified' : 'pending'}" style="margin-left: 0.5rem;">
                            ${vehicle.driver_verification_status}
                        </span>
                    </p>
                </div>
            </div>
        </div>
        <div style="margin-top: 1.5rem; padding: 1rem; background: #e7f3ff; border-left: 4px solid #01386A; border-radius: 8px;">
            <p style="margin: 0; color: #01386A;">
                <i class="fas fa-info-circle"></i> 
                <strong>This vehicle is at position 1 in the queue.</strong> After executing the booking, it will automatically move to the end of the queue.
            </p>
        </div>
    `;

    document.getElementById('nextVehicleSection').style.display = 'block';
}

/**
 * Shows the booking details form
 */
function showBookingDetailsSection() {
    document.getElementById('bookingDetailsSection').style.display = 'block';
    
    // Set default scheduled pickup to current date/time
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    document.getElementById('scheduledPickup').value = now.toISOString().slice(0, 16);
}

/**
 * Hides the next vehicle section
 */
function hideNextVehicleSection() {
    document.getElementById('nextVehicleSection').style.display = 'none';
    document.getElementById('bookingDetailsSection').style.display = 'none';
}

// ============================================
// EVENT LISTENERS
// ============================================

function setupEventListeners() {
    const routeSelect = document.getElementById('routeSelect');
    const executeForm = document.getElementById('executeBookingForm');

    routeSelect.addEventListener('change', function() {
        const routeId = this.value;
        document.getElementById('loadVehicleBtn').disabled = !routeId;
        hideNextVehicleSection();
        selectedRoute = null;
        nextVehicle = null;
    });

    executeForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        await executeBooking();
    });
}

// ============================================
// BOOKING EXECUTION
// ============================================

/**
 * Executes the booking
 */
async function executeBooking() {
    if (!selectedRoute || !nextVehicle) {
        alert('Please select a route and load the next vehicle first');
        return;
    }

    const scheduledPickup = document.getElementById('scheduledPickup').value;
    const passengerCount = parseInt(document.getElementById('passengerCount').value) || 0;
    const parcelCount = parseInt(document.getElementById('parcelCount').value) || 0;
    const specialInstructions = document.getElementById('specialInstructions').value.trim() || null;

    if (!scheduledPickup) {
        alert('Please select a scheduled pickup date and time');
        return;
    }

    if (!confirm(`Execute booking for route "${selectedRoute.name}"?\n\nVehicle: ${nextVehicle.registration_number}\nDriver: ${nextVehicle.driver_name}\n\nThis will move the vehicle to the end of the queue after booking creation.`)) {
        return;
    }

    try {
        const executeBtn = document.getElementById('executeBookingBtn');
        executeBtn.disabled = true;
        executeBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Executing Booking...';

        const response = await axios.post(
            `${BASE_URL}/api/bookings/admin/execute`,
            {
                existing_route_id: selectedRoute.id,
                scheduled_pickup: scheduledPickup,
                passenger_count: passengerCount,
                parcel_count: parcelCount,
                special_instructions: specialInstructions,
                vehicle_id: nextVehicle.vehicle_id // For verification
            }
        );

        if (response.data.success) {
            alert(`Booking executed successfully!\n\nBooking Reference: ${response.data.booking.booking_reference}\nVehicle has been moved to the end of the queue.`);
            resetForm();
        } else {
            throw new Error(response.data.message || 'Failed to execute booking');
        }
    } catch (error) {
        console.error('Error executing booking:', error);
        const errorMessage = error.response?.data?.message || error.message || 'Failed to execute booking';
        alert(`Error: ${errorMessage}`);
    } finally {
        const executeBtn = document.getElementById('executeBookingBtn');
        executeBtn.disabled = false;
        executeBtn.innerHTML = '<i class="fas fa-check-circle"></i> Execute Booking';
    }
}

/**
 * Resets the form
 */
function resetForm() {
    document.getElementById('routeSelect').value = '';
    document.getElementById('loadVehicleBtn').disabled = true;
    document.getElementById('scheduledPickup').value = '';
    document.getElementById('passengerCount').value = '0';
    document.getElementById('parcelCount').value = '0';
    document.getElementById('specialInstructions').value = '';
    hideNextVehicleSection();
    selectedRoute = null;
    nextVehicle = null;
}

// ============================================
// UI STATE MANAGEMENT
// ============================================

function showLoading() {
    document.getElementById('loadingState').style.display = 'block';
    document.getElementById('bookingForm').style.display = 'none';
    document.getElementById('errorState').style.display = 'none';
}

function hideLoading() {
    document.getElementById('loadingState').style.display = 'none';
    document.getElementById('bookingForm').style.display = 'block';
}

function showError(message) {
    document.getElementById('loadingState').style.display = 'none';
    document.getElementById('bookingForm').style.display = 'none';
    document.getElementById('errorState').style.display = 'block';
    document.getElementById('errorMessage').textContent = message;
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

