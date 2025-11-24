import axios from 'axios';
import { BASE_URL } from '../AddressSelection.js';

// Use cookie-based authentication (same as client-side APIs)
axios.defaults.withCredentials = true;

let allDrivers = [];
let filteredDrivers = [];
let currentDriver = null;

/**
 * Load all drivers from the API
 */
export async function loadDrivers() {
    try {
        const response = await axios.get(`${BASE_URL}/api/drivers/admin/all`, {
        });

        if (response.data.success) {
            allDrivers = response.data.drivers;
            filteredDrivers = allDrivers;
            renderDrivers();
        } else {
            console.error('Failed to load drivers:', response.data.message);
            showError('Failed to load drivers');
        }
    } catch (error) {
        console.error('Error loading drivers:', error);
        showError('Error loading drivers. Please try again.');
    }
}

/**
 * Render drivers in the table
 */
function renderDrivers() {
    const tbody = document.getElementById('driversTableBody');
    
    if (filteredDrivers.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="9" style="text-align: center; padding: 2rem;">
                    No drivers found
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = filteredDrivers.map(driver => `
        <tr>
            <td>${driver.ID || driver.id}</td>
            <td>${escapeHtml(driver.name || 'N/A')}</td>
            <td>${escapeHtml(driver.email || 'N/A')}</td>
            <td>${escapeHtml(driver.license_number || 'N/A')}</td>
            <td>${driver.license_expiry || 'N/A'}</td>
            <td>
                <span class="status-badge ${getVerificationStatusClass(driver.verification_status)}">
                    ${driver.verification_status || 'pending'}
                </span>
            </td>
            <td>
                <span class="status-badge ${getDriverStatusClass(driver.status)}">
                    ${driver.status || 'pending'}
                </span>
            </td>
            <td>${driver.vehicle_count || 0}</td>
            <td>
                <button class="btn btn-sm btn-primary" onclick="viewDriverDetails(${driver.ID || driver.id})" title="View Details">
                    <i class="fas fa-eye"></i> View
                </button>
            </td>
        </tr>
    `).join('');
}

/**
 * Get CSS class for verification status
 */
function getVerificationStatusClass(status) {
    switch(status) {
        case 'verified': return 'verified';
        case 'rejected': return 'rejected';
        case 'suspended': return 'inactive';
        case 'pending': return 'pending';
        default: return 'pending';
    }
}

/**
 * Get CSS class for driver status
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
 * View driver details - Navigate to driver details page
 */
export async function viewDriverDetails(driverId) {
    // Navigate to driver details page
    window.location.href = `admin-driver-details.html?id=${driverId}`;
}

/**
 * Filter drivers
 */
export function filterDrivers() {
    const verificationStatus = document.getElementById('verificationFilter').value;
    const driverStatus = document.getElementById('statusFilter').value;

    filteredDrivers = allDrivers.filter(driver => {
        const matchesVerification = verificationStatus === 'all' || driver.verification_status === verificationStatus;
        const matchesStatus = driverStatus === 'all' || driver.status === driverStatus;
        return matchesVerification && matchesStatus;
    });

    renderDrivers();
}

/**
 * Refresh drivers list
 */
export function refreshDrivers() {
    loadDrivers();
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


