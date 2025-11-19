import axios from 'axios';
import { BASE_URL } from '../AddressSelection.js';

let allDrivers = [];
let filteredDrivers = [];
let currentDriver = null;

/**
 * Load all drivers from the API
 */
export async function loadDrivers() {
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            console.error('No authentication token found');
            return;
        }

        const response = await axios.get(`${BASE_URL}/api/drivers/admin/all`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
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
 * View driver details
 */
export async function viewDriverDetails(driverId) {
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            showError('Authentication required');
            return;
        }

        // Get driver from admin all list (since profile endpoint requires driver to be logged in)
        const allDriversResponse = await axios.get(
            `${BASE_URL}/api/drivers/admin/all`,
            {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            }
        );
        
        if (allDriversResponse.data.success) {
            currentDriver = allDriversResponse.data.drivers.find(d => (d.ID || d.id) == driverId);
        }

        if (!currentDriver) {
            showError('Driver not found');
            return;
        }
        
        // Get driver documents
        let documents = [];
        try {
            const docsResponse = await axios.get(
                `${BASE_URL}/api/drivers/documents`,
                {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    },
                    params: {
                        driverId: driverId
                    }
                }
            );
            if (docsResponse.data.success) {
                documents = docsResponse.data.documents || [];
            }
        } catch (error) {
            console.error('Error loading documents:', error);
            // Fallback to documents in driver object if available
            if (currentDriver.documents) {
                documents = Array.isArray(currentDriver.documents) ? currentDriver.documents : [];
            }
        }

        // Render modal content
        const modalBody = document.getElementById('driverModalBody');
        modalBody.innerHTML = `
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem;">
                <div>
                    <h3 style="margin-bottom: 1rem; color: #193148;">Personal Information</h3>
                    <div class="info-group">
                        <label>Name:</label>
                        <p>${escapeHtml(currentDriver.name || 'N/A')}</p>
                    </div>
                    <div class="info-group">
                        <label>Email:</label>
                        <p>${escapeHtml(currentDriver.email || 'N/A')}</p>
                    </div>
                    <div class="info-group">
                        <label>Phone:</label>
                        <p>${escapeHtml(currentDriver.phone || 'N/A')}</p>
                    </div>
                    <div class="info-group">
                        <label>ID Number:</label>
                        <p>${escapeHtml(currentDriver.id_number || 'N/A')}</p>
                    </div>
                </div>
                <div>
                    <h3 style="margin-bottom: 1rem; color: #193148;">Driver Information</h3>
                    <div class="info-group">
                        <label>License Number:</label>
                        <p>${escapeHtml(currentDriver.license_number || 'N/A')}</p>
                    </div>
                    <div class="info-group">
                        <label>License Expiry:</label>
                        <p>${currentDriver.license_expiry || 'N/A'}</p>
                    </div>
                    <div class="info-group">
                        <label>Verification Status:</label>
                        <p>
                            <span class="status-badge ${getVerificationStatusClass(currentDriver.verification_status)}">
                                ${currentDriver.verification_status || 'pending'}
                            </span>
                        </p>
                    </div>
                    <div class="info-group">
                        <label>Driver Status:</label>
                        <p>
                            <span class="status-badge ${getDriverStatusClass(currentDriver.status)}">
                                ${currentDriver.status || 'pending'}
                            </span>
                        </p>
                    </div>
                    ${currentDriver.verification_notes ? `
                        <div class="info-group">
                            <label>Verification Notes:</label>
                            <p style="color: #666; font-style: italic;">${escapeHtml(currentDriver.verification_notes)}</p>
                        </div>
                    ` : ''}
                    <div class="info-group">
                        <label>Assigned Vehicles:</label>
                        <p>${currentDriver.vehicle_count || 0}</p>
                    </div>
                </div>
            </div>
            
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
                                        ${doc.issue_date ? `<p style="margin: 0.5rem 0 0 0; color: #666;">Issued: ${escapeHtml(doc.issue_date)}</p>` : ''}
                                        ${doc.issuing_authority ? `<p style="margin: 0.5rem 0 0 0; color: #666;">Authority: ${escapeHtml(doc.issuing_authority)}</p>` : ''}
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
        const modalFooter = document.getElementById('driverModalFooter');
        const isPending = currentDriver.verification_status === 'pending' || !currentDriver.verification_status;
        const isVerified = currentDriver.verification_status === 'verified';
        const isRejected = currentDriver.verification_status === 'rejected';
        const isSuspended = currentDriver.verification_status === 'suspended';
        
        modalFooter.innerHTML = `
            <button type="button" class="btn btn-secondary" onclick="closeDriverModal()">Close</button>
            ${isPending ? `
                <button type="button" class="btn btn-success" onclick="verifyDriver(${driverId})">
                    <i class="fas fa-check"></i> Verify
                </button>
                <button type="button" class="btn btn-danger" onclick="rejectDriver(${driverId})">
                    <i class="fas fa-times"></i> Reject
                </button>
            ` : isVerified ? `
                <button type="button" class="btn btn-warning" onclick="suspendDriver(${driverId})">
                    <i class="fas fa-ban"></i> Suspend
                </button>
            ` : isRejected || isSuspended ? `
                <button type="button" class="btn btn-success" onclick="verifyDriver(${driverId})">
                    <i class="fas fa-check"></i> Verify
                </button>
            ` : ''}
            ${currentDriver.status !== 'active' ? `
                <button type="button" class="btn btn-primary" onclick="activateDriver(${driverId})">
                    <i class="fas fa-check-circle"></i> Activate
                </button>
            ` : ''}
        `;

        // Show modal
        const modal = document.getElementById('driverModal');
        modal.style.display = 'flex';
        modal.classList.add('show');
    } catch (error) {
        console.error('Error loading driver details:', error);
        showError('Failed to load driver details');
    }
}

/**
 * Verify driver
 */
export async function verifyDriver(driverId) {
    const notes = prompt('Enter verification notes (optional):');
    
    try {
        const token = localStorage.getItem('token');
        const response = await axios.put(
            `${BASE_URL}/api/drivers/${driverId}/verify`,
            { 
                verification_status: 'verified',
                verification_notes: notes || null
            },
            {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        if (response.data.success) {
            showSuccess('Driver verified successfully');
            closeDriverModal();
            loadDrivers();
        } else {
            showError(response.data.message || 'Failed to verify driver');
        }
    } catch (error) {
        console.error('Error verifying driver:', error);
        const errorMessage = error.response?.data?.message || error.message || 'Failed to verify driver';
        showError(errorMessage);
    }
}

/**
 * Reject driver
 */
export async function rejectDriver(driverId) {
    const notes = prompt('Enter rejection reason (required):');
    if (!notes) {
        showError('Rejection reason is required');
        return;
    }

    try {
        const token = localStorage.getItem('token');
        const response = await axios.put(
            `${BASE_URL}/api/drivers/${driverId}/verify`,
            { 
                verification_status: 'rejected',
                verification_notes: notes
            },
            {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        if (response.data.success) {
            showSuccess('Driver rejected successfully');
            closeDriverModal();
            loadDrivers();
        } else {
            showError(response.data.message || 'Failed to reject driver');
        }
    } catch (error) {
        console.error('Error rejecting driver:', error);
        const errorMessage = error.response?.data?.message || error.message || 'Failed to reject driver';
        showError(errorMessage);
    }
}

/**
 * Suspend driver
 */
export async function suspendDriver(driverId) {
    const notes = prompt('Enter suspension reason (required):');
    if (!notes) {
        showError('Suspension reason is required');
        return;
    }

    try {
        const token = localStorage.getItem('token');
        const response = await axios.put(
            `${BASE_URL}/api/drivers/${driverId}/verify`,
            { 
                verification_status: 'suspended',
                verification_notes: notes
            },
            {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        if (response.data.success) {
            showSuccess('Driver suspended successfully');
            closeDriverModal();
            loadDrivers();
        } else {
            showError(response.data.message || 'Failed to suspend driver');
        }
    } catch (error) {
        console.error('Error suspending driver:', error);
        const errorMessage = error.response?.data?.message || error.message || 'Failed to suspend driver';
        showError(errorMessage);
    }
}

/**
 * Activate driver
 */
export async function activateDriver(driverId) {
    try {
        const token = localStorage.getItem('token');
        const response = await axios.put(
            `${BASE_URL}/api/drivers/${driverId}/status`,
            { status: 'active' },
            {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        if (response.data.success) {
            showSuccess('Driver activated successfully');
            closeDriverModal();
            loadDrivers();
        } else {
            showError(response.data.message || 'Failed to activate driver');
        }
    } catch (error) {
        console.error('Error activating driver:', error);
        const errorMessage = error.response?.data?.message || error.message || 'Failed to activate driver';
        showError(errorMessage);
    }
}

/**
 * Close driver modal
 */
export function closeDriverModal() {
    const modal = document.getElementById('driverModal');
    modal.style.display = 'none';
    modal.classList.remove('show');
    currentDriver = null;
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

// Close modal when clicking outside
window.onclick = function(event) {
    const modal = document.getElementById('driverModal');
    if (event.target === modal) {
        closeDriverModal();
    }
}

