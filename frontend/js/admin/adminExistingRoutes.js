import axios from 'axios';
import { BASE_URL } from '../AddressSelection.js';

// Use cookie-based authentication (same as client-side APIs)
axios.defaults.withCredentials = true;

let currentRouteId = null;
let allRoutes = [];
let filteredRoutes = [];

/**
 * Load all existing routes from the API
 */
export async function loadRoutes() {
    try {
        const response = await axios.get(`${BASE_URL}/admin/existing-routes`);

        if (response.data.success) {
            // Debug: Log the first route to see its structure
            if (response.data.routes && response.data.routes.length > 0) {
                console.log('Sample route from API:', response.data.routes[0]);
                console.log('Route keys:', Object.keys(response.data.routes[0]));
            }
            
            // Ensure all routes have an id property (map ID to id if needed)
            allRoutes = response.data.routes.map(route => {
                // Try multiple possible ID field names
                const routeId = route.id || route.ID || route.route_id || route.routeId || null;
                
                if (!routeId) {
                    console.error('Route missing ID - full route object:', route);
                    console.error('Available keys:', Object.keys(route));
                }
                
                const normalizedRoute = {
                    ...route,
                    id: routeId
                };
                // Remove ID if we have id to avoid confusion
                if (normalizedRoute.id && normalizedRoute.ID) {
                    delete normalizedRoute.ID;
                }
                return normalizedRoute;
            });
            filteredRoutes = allRoutes;
            renderRoutes();
        } else {
            console.error('Failed to load routes:', response.data.message);
            showError('Failed to load routes');
        }
    } catch (error) {
        console.error('Error loading routes:', error);
        showError('Error loading routes. Please try again.');
    }
}

/**
 * Render routes in the table
 */
function renderRoutes() {
    const tbody = document.getElementById('routesTableBody');
    
    if (filteredRoutes.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="12" style="text-align: center; padding: 2rem;">
                    No routes found
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = filteredRoutes.map(route => {
        // Get route ID (handle both id and ID cases, and check for null/undefined)
        const routeId = route.id !== null && route.id !== undefined ? route.id : 
                       (route.ID !== null && route.ID !== undefined ? route.ID : null);
        
        // Convert DECIMAL fields from database (strings) to numbers
        const baseFare = parseFloat(route.base_fare) || 0;
        const smallParcelPrice = parseFloat(route.small_parcel_price) || 0;
        const mediumParcelPrice = parseFloat(route.medium_parcel_price) || 0;
        const largeParcelPrice = parseFloat(route.large_parcel_price) || 0;
        
        // Validate routeId before rendering
        if (!routeId && routeId !== 0) {
            console.error('Route missing ID - Route object:', route);
            console.error('Route keys:', Object.keys(route));
            console.error('route.id:', route.id, 'route.ID:', route.ID);
            return ''; // Skip this route if no ID
        }
        
        return `
        <tr>
            <td>${routeId}</td>
            <td>${escapeHtml(route.route_name)}</td>
            <td>${escapeHtml(route.location_1)}</td>
            <td>${escapeHtml(route.location_2)}</td>
            <td>${route.distance_km}</td>
            <td>${route.typical_duration_hours}</td>
            <td>R${baseFare.toFixed(2)}</td>
            <td>R${smallParcelPrice.toFixed(2)}</td>
            <td>R${mediumParcelPrice.toFixed(2)}</td>
            <td>R${largeParcelPrice.toFixed(2)}</td>
            <td>
                <span class="status-badge ${route.status === 'active' ? 'active' : 'inactive'}">
                    ${route.status}
                </span>
            </td>
            <td>
                <button class="btn btn-sm btn-primary" onclick="editRoute(${routeId})" title="Edit">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn btn-sm btn-danger" onclick="deleteRoute(${routeId})" title="Delete">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        </tr>
    `;
    }).join('');
}

/**
 * Open modal for adding a new route
 */
export function openAddRouteModal() {
    currentRouteId = null;
    document.getElementById('modalTitle').textContent = 'Add New Route';
    document.getElementById('submitBtn').textContent = 'Add Route';
    document.getElementById('routeForm').reset();
    document.getElementById('status').value = 'active';
    const modal = document.getElementById('routeModal');
    modal.style.display = 'flex';
    modal.classList.add('show');
}

/**
 * Close the route modal
 */
export function closeRouteModal() {
    const modal = document.getElementById('routeModal');
    modal.style.display = 'none';
    modal.classList.remove('show');
    currentRouteId = null;
    document.getElementById('routeForm').reset();
}

/**
 * Handle form submission (add or update route)
 */
export async function handleRouteSubmit(event) {
    event.preventDefault();
    
    const formData = {
        route_name: document.getElementById('route_name').value.trim(),
        location_1: document.getElementById('location_1').value.trim(),
        location_2: document.getElementById('location_2').value.trim(),
        distance_km: parseFloat(document.getElementById('distance_km').value),
        typical_duration_hours: parseFloat(document.getElementById('typical_duration_hours').value),
        base_fare: parseFloat(document.getElementById('base_fare').value),
        small_parcel_price: parseFloat(document.getElementById('small_parcel_price').value),
        medium_parcel_price: parseFloat(document.getElementById('medium_parcel_price').value),
        large_parcel_price: parseFloat(document.getElementById('large_parcel_price').value),
        status: document.getElementById('status').value
    };

    try {
        let response;
        if (currentRouteId) {
            // Update existing route
            response = await axios.put(
                `${BASE_URL}/admin/existing-routes/${currentRouteId}`,
                formData
            );
        } else {
            // Create new route
            response = await axios.post(
                `${BASE_URL}/admin/existing-routes`,
                formData
            );
        }

        if (response.data.success) {
            showSuccess(currentRouteId ? 'Route updated successfully' : 'Route created successfully');
            closeRouteModal();
            loadRoutes();
        } else {
            showError(response.data.message || 'Failed to save route');
        }
    } catch (error) {
        console.error('Error saving route:', error);
        const errorMessage = error.response?.data?.message || error.message || 'Failed to save route';
        showError(errorMessage);
    }
}

/**
 * Edit a route
 */
export async function editRoute(routeId) {
    // Validate routeId
    if (!routeId || routeId === 'undefined' || routeId === 'null') {
        console.error('Invalid route ID:', routeId);
        showError('Invalid route ID. Please try again.');
        return;
    }
    
    try {
        const response = await axios.get(
            `${BASE_URL}/admin/existing-routes/${routeId}`
        );

        if (response.data.success) {
            const route = response.data.route;
            currentRouteId = route.id || route.ID;
            
            document.getElementById('modalTitle').textContent = 'Edit Route';
            document.getElementById('submitBtn').textContent = 'Update Route';
            document.getElementById('route_name').value = route.route_name;
            document.getElementById('location_1').value = route.location_1;
            document.getElementById('location_2').value = route.location_2;
            document.getElementById('distance_km').value = route.distance_km;
            document.getElementById('typical_duration_hours').value = route.typical_duration_hours;
            document.getElementById('base_fare').value = route.base_fare;
            document.getElementById('small_parcel_price').value = route.small_parcel_price;
            document.getElementById('medium_parcel_price').value = route.medium_parcel_price;
            document.getElementById('large_parcel_price').value = route.large_parcel_price;
            document.getElementById('status').value = route.status;
            
            const modal = document.getElementById('routeModal');
            modal.style.display = 'flex';
            modal.classList.add('show');
        } else {
            showError('Failed to load route details');
        }
    } catch (error) {
        console.error('Error loading route:', error);
        showError('Failed to load route details');
    }
}

/**
 * Delete a route
 */
export async function deleteRoute(routeId) {
    if (!confirm('Are you sure you want to delete this route? This action cannot be undone.')) {
        return;
    }

    try {
        const response = await axios.delete(
            `${BASE_URL}/admin/existing-routes/${routeId}`
        );

        if (response.data.success) {
            showSuccess('Route deleted successfully');
            loadRoutes();
        } else {
            showError(response.data.message || 'Failed to delete route');
        }
    } catch (error) {
        console.error('Error deleting route:', error);
        const errorMessage = error.response?.data?.message || error.message || 'Failed to delete route';
        showError(errorMessage);
    }
}

/**
 * Filter routes by status
 */
export function filterRoutes() {
    const status = document.getElementById('statusFilter').value;
    
    if (status === 'all') {
        filteredRoutes = allRoutes;
    } else {
        filteredRoutes = allRoutes.filter(route => route.status === status);
    }
    
    renderRoutes();
}

/**
 * Refresh routes list
 */
export function refreshRoutes() {
    loadRoutes();
}

/**
 * Show success message
 */
function showSuccess(message) {
    // You can implement a toast notification here
    alert(message);
}

/**
 * Show error message
 */
function showError(message) {
    // You can implement a toast notification here
    alert('Error: ' + message);
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Close modal when clicking outside
window.onclick = function(event) {
    const modal = document.getElementById('routeModal');
    if (event.target === modal) {
        closeRouteModal();
    }
}

