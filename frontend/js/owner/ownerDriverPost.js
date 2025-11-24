// Owner Driver Post - Main JavaScript Module
// Handles driver registration form, file uploads, and submission

import { createDriver } from '../api/driverApi.js';
import { getOwnerDrivers } from '../api/driverApi.js';

// ============================================
// GLOBAL VARIABLES
// ============================================

// Make createDriver available globally for functions called from HTML onclick
window.createDriverAPI = createDriver;

// ============================================
// NAVIGATION FUNCTIONS
// ============================================

/**
 * Toggle mobile menu visibility
 */
function toggleMobileMenu() {
    const mobileMenu = document.getElementById('mobileMenu');
    mobileMenu.classList.toggle('show');
}

/**
 * Function for navigation link clicks
 */
function topNavZIndexDecrease() {
    // Function for navigation link clicks
}

// ============================================
// INITIALIZATION
// ============================================

/**
 * Initialize page on DOMContentLoaded
 * - Checks authentication status
 * - Updates navigation visibility
 * - Loads driver data if editing
 */
document.addEventListener('DOMContentLoaded', function() {
    const authButtons = document.getElementById('authButtons');
    const fullNav = document.getElementById('fullNav');
    
    // Check if user is logged in
    const isLoggedIn = localStorage.getItem('userProfile') || sessionStorage.getItem('userProfile') || 
                      localStorage.getItem('currentUser') || sessionStorage.getItem('currentUser');
    
    if (isLoggedIn) {
        // User is logged in - show full navigation
        if (authButtons) authButtons.style.display = 'none';
        if (fullNav) fullNav.style.display = 'flex';
    } else {
        // User is not logged in - show auth buttons
        if (authButtons) authButtons.style.display = 'flex';
        if (fullNav) fullNav.style.display = 'none';
    }

    // Check if editing existing driver
    const urlParams = new URLSearchParams(window.location.search);
    const driverId = urlParams.get('id');
    
    if (driverId) {
        // Load driver data for editing (async function)
        loadDriverForEdit(driverId).catch(error => {
            console.error('Error loading driver for edit:', error);
        });
    }
});

// ============================================
// PHOTO PREVIEW FUNCTIONS
// ============================================

/**
 * Preview driver photo when file is selected
 * @param {Event} event - File input change event
 */
function previewDriverPhoto(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const preview = document.getElementById('driverPhotoPreview');
            if (preview) {
                preview.innerHTML = `<img src="${e.target.result}" alt="Driver Photo">`;
            }
        };
        reader.readAsDataURL(file);
    }
}

/**
 * Preview license photo when file is selected
 * @param {Event} event - File input change event
 */
function previewLicensePhoto(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const preview = document.getElementById('driverLicensePhotoPreview');
            if (preview) {
                preview.innerHTML = `<img src="${e.target.result}" alt="License Photo" style="max-width: 100%; max-height: 200px; border-radius: 8px;">`;
            }
        };
        reader.readAsDataURL(file);
    }
}

// ============================================
// DRIVER FORM SUBMISSION
// ============================================

/**
 * Handle driver form submission
 * Validates form data and creates driver via API
 * @param {Event} event - Form submit event
 */
function saveDriver(event) {
    event.preventDefault();
    
    // Validate password
    const urlParams = new URLSearchParams(window.location.search);
    const driverId = urlParams.get('id');
    const password = document.getElementById('driverPassword').value;
    const passwordConfirm = document.getElementById('driverPasswordConfirm').value;
    
    // For new drivers, password is required
    if (!driverId) {
        if (!password || password.length < 6) {
            alert('Password is required and must be at least 6 characters long.');
            document.getElementById('driverPassword').focus();
            return;
        }
        
        if (password !== passwordConfirm) {
            alert('Passwords do not match. Please try again.');
            document.getElementById('driverPasswordConfirm').focus();
            return;
        }
    } else {
        // For editing, if password is provided, validate it
        if (password || passwordConfirm) {
            if (password.length < 6) {
                alert('Password must be at least 6 characters long.');
                document.getElementById('driverPassword').focus();
                return;
            }
            
            if (password !== passwordConfirm) {
                alert('Passwords do not match. Please try again.');
                document.getElementById('driverPasswordConfirm').focus();
                return;
            }
        }
    }
    
    // Validate license photo is uploaded
    const licensePhotoInput = document.getElementById('driverLicensePhoto');
    const licensePhotoPreview = document.getElementById('driverLicensePhotoPreview');
    
    // Validate license photo for new drivers
    if (!driverId && (!licensePhotoInput.files || licensePhotoInput.files.length === 0)) {
        alert('Please upload a photo of the driver\'s license.');
        licensePhotoInput.focus();
        return false;
    }
    
    // Get license photo data - handle async file reading
    const getLicensePhotoData = () => {
        return new Promise((resolve) => {
            if (licensePhotoInput.files && licensePhotoInput.files[0]) {
                // New upload - read the file
                const reader = new FileReader();
                reader.onload = function(e) {
                    resolve(e.target.result);
                };
                reader.onerror = function() {
                    alert('Error reading license photo. Please try again.');
                    resolve(null);
                };
                reader.readAsDataURL(licensePhotoInput.files[0]);
            } else if (driverId) {
                // Editing - use existing photo from preview or stored data
                const existingDriver = JSON.parse(localStorage.getItem('ownerDrivers') || '[]').find(d => d.id === driverId);
                const previewImg = licensePhotoPreview ? licensePhotoPreview.querySelector('img') : null;
                resolve(existingDriver?.licensePhoto || (previewImg ? previewImg.src : null) || null);
            } else {
                resolve(null);
            }
        });
    };
    
    // Handle async file reading
    getLicensePhotoData().then(async (licensePhotoData) => {
        // For new drivers, call the API
        if (!driverId) {
            // Show loading state
            const submitBtn = document.querySelector('button[type="submit"]');
            const originalBtnText = submitBtn ? submitBtn.textContent : '';
            
            try {
                // Get driver photo (if uploaded)
                const driverPhotoPreview = document.getElementById('driverPhotoPreview');
                const driverPhotoImg = driverPhotoPreview ? driverPhotoPreview.querySelector('img') : null;
                const driverPhoto = driverPhotoImg ? driverPhotoImg.src : null;

                // Prepare driver data for API
                const driverData = {
                    firstName: document.getElementById('driverFirstName').value.trim(),
                    surname: document.getElementById('driverSurname').value.trim(),
                    email: document.getElementById('driverEmail').value.trim(),
                    password: document.getElementById('driverPassword').value,
                    phone: document.getElementById('driverPhone').value.trim(),
                    address: document.getElementById('driverAddress').value.trim(),
                    id_number: document.getElementById('driverIdNumber').value.trim(),
                    license_number: document.getElementById('driverLicenseNumber').value.trim(),
                    license_expiry: document.getElementById('driverLicenseExpiry').value,
                    license_photo: licensePhotoData || null,
                    photo: driverPhoto || null
                };

                if (submitBtn) {
                    submitBtn.disabled = true;
                    submitBtn.textContent = 'Creating Driver...';
                }

                // Call API to create driver
                const response = await window.createDriverAPI(driverData);

                if (response.success) {
                    alert('Driver created successfully!');
                    // Redirect back to dashboard
                    window.location.href = 'owner-dashboard.html';
                } else {
                    throw new Error(response.message || 'Failed to create driver');
                }
            } catch (error) {
                console.error('Error creating driver:', error);
                const errorMessage = error.response?.data?.message || error.message || 'Failed to create driver. Please try again.';
                alert(`Error: ${errorMessage}`);
                
                // Re-enable button
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.textContent = originalBtnText || 'Save Driver';
                }
            }
        } else {
            // Editing existing driver - for now, show message that editing is not yet implemented
            alert('Editing drivers is not yet implemented. Please create a new driver.');
        }
    }).catch(error => {
        console.error('Error processing license photo:', error);
        alert('Error processing license photo. Please try again.');
    });
    
    return false; // Prevent form submission until async operation completes
}

// ============================================
// DRIVER EDITING FUNCTIONS
// ============================================

/**
 * Load driver data for editing from API
 * Fetches all owner's drivers and finds the one with matching ID
 * @param {string|number} driverId - Driver ID (user ID) to load
 */
async function loadDriverForEdit(driverId) {
    try {
        // Fetch all owner's drivers from API
        const response = await getOwnerDrivers();
        
        if (!response.success) {
            throw new Error(response.message || 'Failed to fetch drivers');
        }
        
        const drivers = response.drivers || [];
        
        // Find the driver with matching ID (convert both to numbers for comparison)
        const driver = drivers.find(d => (d.ID || d.id) == driverId);
        
        if (!driver) {
            alert('Driver not found! Redirecting to dashboard...');
            window.location.href = 'owner-dashboard.html';
            return;
        }
        
        // Parse driver name (format: "FirstName Surname")
        const nameParts = (driver.name || '').split(' ');
        const firstName = nameParts[0] || '';
        const surname = nameParts.slice(1).join(' ') || '';
        
        // Fill form with driver data from API response
        const firstNameInput = document.getElementById('driverFirstName');
        const surnameInput = document.getElementById('driverSurname');
        const idNumberInput = document.getElementById('driverIdNumber');
        const phoneInput = document.getElementById('driverPhone');
        const emailInput = document.getElementById('driverEmail');
        const addressInput = document.getElementById('driverAddress');
        const licenseNumberInput = document.getElementById('driverLicenseNumber');
        const licenseExpiryInput = document.getElementById('driverLicenseExpiry');
        const licenseClassInput = document.getElementById('driverLicenseClass');
        
        if (firstNameInput) firstNameInput.value = firstName;
        if (surnameInput) surnameInput.value = surname;
        if (idNumberInput) idNumberInput.value = driver.id_number || '';
        if (phoneInput) phoneInput.value = driver.phone || '';
        if (emailInput) emailInput.value = driver.email || '';
        if (addressInput) addressInput.value = driver.location || '';
        if (licenseNumberInput) licenseNumberInput.value = driver.license_number || '';
        if (licenseExpiryInput) licenseExpiryInput.value = driver.license_expiry || '';
        // Note: license_class is not in the API response, so we'll leave it empty
        
        // Load profile picture if it exists
        if (driver.profile_picture) {
            const preview = document.getElementById('driverPhotoPreview');
            if (preview) {
                preview.innerHTML = `<img src="${driver.profile_picture}" alt="Driver Photo">`;
            }
        }
        
        // Load license photo from documents (if available)
        // Note: This would require fetching driver documents separately
        // For now, we'll just make the license photo optional when editing
        const licensePhotoInput = document.getElementById('driverLicensePhoto');
        if (licensePhotoInput) {
            licensePhotoInput.required = false;
        }
        
        // Password fields - optional for editing
        const passwordInput = document.getElementById('driverPassword');
        const passwordConfirmInput = document.getElementById('driverPasswordConfirm');
        
        if (passwordInput) {
            passwordInput.required = false;
            passwordInput.placeholder = 'Leave blank to keep current password';
        }
        if (passwordConfirmInput) {
            passwordConfirmInput.required = false;
            passwordConfirmInput.placeholder = 'Leave blank to keep current password';
        }
        
        // Make photo optional when editing
        const driverPhotoInput = document.getElementById('driverPhoto');
        if (driverPhotoInput) {
            driverPhotoInput.removeAttribute('required');
        }
        
        // Update page title if editing
        const pageTitle = document.getElementById('pageTitle');
        if (pageTitle) {
            pageTitle.textContent = 'Edit Driver';
        }
        
    } catch (error) {
        console.error('Error loading driver for edit:', error);
        alert('Failed to load driver data. Please try again.');
        window.location.href = 'owner-drivers.html';
    }
}

// ============================================
// EXPORT FUNCTIONS FOR GLOBAL ACCESS
// ============================================

// Make functions globally accessible for onclick handlers in HTML
window.toggleMobileMenu = toggleMobileMenu;
window.topNavZIndexDecrease = topNavZIndexDecrease;
window.previewDriverPhoto = previewDriverPhoto;
window.previewLicensePhoto = previewLicensePhoto;
window.saveDriver = saveDriver;
window.loadDriverForEdit = loadDriverForEdit;

