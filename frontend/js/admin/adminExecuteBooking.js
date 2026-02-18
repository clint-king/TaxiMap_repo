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
    
    // Make functions globally accessible for onclick handlers
    window.loadNextVehicle = loadNextVehicle;
    window.resetForm = resetForm;
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
        // Use id (lowercase) as returned from backend, or ID (uppercase) as fallback
        option.value = route.id || route.ID;
        option.textContent = `${route.route_name} (${route.location_1} → ${route.location_2})`;
        routeSelect.appendChild(option);
    });
}

/**
 * Loads the next vehicle in queue for the selected route
 */
async function loadNextVehicle() {
    const routeId = document.getElementById('routeSelect').value;
    const directionType = document.getElementById('directionSelect').value;
    
    if (!routeId) {
        alert('Please select a route first');
        return;
    }
    
    if (!directionType) {
        alert('Please select a direction first');
        return;
    }

    try {
        const loadBtn = document.getElementById('loadVehicleBtn');
        loadBtn.disabled = true;
        loadBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Loading...';

        const response = await axios.get(`${BASE_URL}/api/vehicles/queue/next`, {
            params: { 
                route_id: routeId,
                direction_type: directionType
            }
        });

        if (!response.data.success) {
            throw new Error(response.data.message || 'Failed to load next vehicle');
        }

        // Update selectedRoute with route info from API (but preserve the original if needed)
        const routeFromApi = response.data.route;
        if (routeFromApi) {
            // Ensure we have the route ID - use the one from availableRoutes if API doesn't have it
            selectedRoute = {
                ...routeFromApi,
                id: routeFromApi.id || routeFromApi.ID || selectedRoute?.id || selectedRoute?.ID,
                ID: routeFromApi.ID || routeFromApi.id || selectedRoute?.ID || selectedRoute?.id
            };
        }
        nextVehicle = response.data.next_vehicle;

        if (!nextVehicle) {
            alert(`No vehicle available for this route with direction '${directionType}'. Please try again later.`);
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
        hideNextVehicleSection();
        nextVehicle = null;
        
        // Show/hide direction selection based on route selection
        const directionGroup = document.getElementById('directionGroup');
        const directionSelect = document.getElementById('directionSelect');
        const loadVehicleBtn = document.getElementById('loadVehicleBtn');
        
        if (routeId) {
            // Find the selected route (check both id and ID for compatibility)
            const route = availableRoutes.find(r => {
                const rId = r.id || r.ID;
                return rId == routeId;
            });
            
            console.log('Selected routeId:', routeId);
            console.log('Found route:', route);
            console.log('Available routes:', availableRoutes);
            
            if (route && route.location_1 && route.location_2) {
                // Store the selected route for later use
                selectedRoute = route;
                
                // Populate direction options
                directionSelect.innerHTML = '<option value="">-- Select Direction --</option>';
                
                // Option 1: From location1 to location2 (from_loc1)
                const option1 = document.createElement('option');
                option1.value = 'from_loc1';
                option1.textContent = `From ${route.location_1} to ${route.location_2}`;
                directionSelect.appendChild(option1);
                
                // Option 2: From location2 to location1 (from_loc2)
                const option2 = document.createElement('option');
                option2.value = 'from_loc2';
                option2.textContent = `From ${route.location_2} to ${route.location_1}`;
                directionSelect.appendChild(option2);
                
                directionGroup.style.display = 'block';
                // Disable load button until direction is selected
                loadVehicleBtn.disabled = true;
                console.log('Direction dropdown shown');
            } else {
                console.error('Route not found or missing location data:', route);
                console.error('Route location_1:', route?.location_1, 'location_2:', route?.location_2);
                selectedRoute = null;
                directionGroup.style.display = 'none';
                loadVehicleBtn.disabled = true;
            }
        } else {
            selectedRoute = null;
            directionGroup.style.display = 'none';
            directionSelect.innerHTML = '<option value="">-- Select Direction --</option>';
            loadVehicleBtn.disabled = true;
        }
    });
    
    // Also listen for direction selection changes
    const directionSelect = document.getElementById('directionSelect');
    if (directionSelect) {
        directionSelect.addEventListener('change', function() {
            const directionValue = this.value;
            const loadVehicleBtn = document.getElementById('loadVehicleBtn');
            // Enable load button only when both route and direction are selected
            loadVehicleBtn.disabled = !(selectedRoute && directionValue);
        });
    }

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

    const directionType = document.getElementById('directionSelect').value;
    if (!directionType) {
        alert('Please select a direction');
        return;
    }

    const scheduledPickup = document.getElementById('scheduledPickup').value;

    if (!scheduledPickup) {
        alert('Please select a scheduled pickup date and time');
        return;
    }

    // Get route ID from dropdown (source of truth)
    const routeSelect = document.getElementById('routeSelect');
    const routeId = routeSelect.value;
    if (!routeId) {
        alert('Error: Route ID not found. Please select the route again.');
        return;
    }

    // Get vehicle ID
    const vehicleId = nextVehicle.vehicle_id || nextVehicle.ID || nextVehicle.id;
    if (!vehicleId) {
        alert('Error: Vehicle ID not found. Please load the vehicle again.');
        return;
    }

    const routeName = selectedRoute.name || selectedRoute.route_name || 'Unknown Route';

    if (!confirm(`Execute booking for route "${routeName}"?\n\nVehicle: ${nextVehicle.registration_number}\nDriver: ${nextVehicle.driver_name}\n\nThis will move the vehicle to the end of the queue after booking creation.`)) {
        return;
    }

    try {
        const executeBtn = document.getElementById('executeBookingBtn');
        executeBtn.disabled = true;
        executeBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Executing Booking...';

        const requestData = {
            existing_route_id: parseInt(routeId),
            direction_type: directionType,
            scheduled_pickup: scheduledPickup,
            passenger_count: 0,
            parcel_count: 0,
            special_instructions: null,
            vehicle_id: parseInt(vehicleId)
        };
        
        console.log('Sending booking request:', requestData);

        const response = await axios.post(
            `${BASE_URL}/api/bookings/admin/execute`,
            requestData
        );

        if (response.data.success) {
            alert(`Booking executed successfully!\n\nBooking Reference: ${response.data.booking.booking_reference}\nVehicle has been moved to the end of the queue.`);
            resetForm();
        } else {
            throw new Error(response.data.message || 'Failed to execute booking');
        }
    } catch (error) {
        console.error('Error executing booking:', error);
        console.error('Error response:', error.response?.data);
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
    document.getElementById('directionGroup').style.display = 'none';
    document.getElementById('directionSelect').value = '';
    document.getElementById('directionSelect').innerHTML = '<option value="">-- Select Direction --</option>';
    document.getElementById('scheduledPickup').value = '';
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

