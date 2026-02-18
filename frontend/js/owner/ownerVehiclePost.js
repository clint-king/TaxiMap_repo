// Owner Vehicle Post - Main JavaScript Module
// Handles vehicle registration form, file uploads, route selection, and submission

import { BASE_URL } from '../AddressSelection.js';

// ============================================
// GLOBAL VARIABLES
// ============================================
let map;
let uploadedImages = [];
let mainImage = null;
let uploadedVideo = null;
let roadworthyDocument = null;
let routePermitDocument = null;

// Get axios from global scope (loaded via script tag)
const axios = window.axios;

// Verify axios is available
if (!axios || typeof axios.get !== 'function') {
    console.error('Axios not found. Please ensure axios is loaded.');
    throw new Error('Axios library is required but not loaded.');
}

// Make BASE_URL and axios available globally for confirmSubmission
window.BASE_URL = BASE_URL;
window.axios = axios;

// Use cookie-based authentication (same as client-side APIs)
axios.defaults.withCredentials = true;

// Store routes in memory for formatRoute function
window.availableRoutes = [];

// ============================================
// INITIALIZATION
// ============================================
document.addEventListener('DOMContentLoaded', function() {
    setupTaxiTypeSelection();
    setupDocumentUploads();
    setupImageUpload();
    setupFormValidation();
    setupOtherOptions(); // Handle "Other" option for make, model, color
    
    // Check authentication status and update navigation
    const authButtons = document.getElementById('authButtons');
    const fullNav = document.getElementById('fullNav');
    
    // Check if user is logged in
    const isLoggedIn = localStorage.getItem('userProfile') || sessionStorage.getItem('userProfile');
    
    if (isLoggedIn) {
        // User is logged in - show full navigation
        if (authButtons) authButtons.style.display = 'none';
        if (fullNav) fullNav.style.display = 'flex';
    } else {
        // User is not logged in - show auth buttons
        if (authButtons) authButtons.style.display = 'flex';
        if (fullNav) fullNav.style.display = 'none';
    }

    // Load routes when page loads
    loadExistingRoutes();
});

// ============================================
// TAXI TYPE SELECTION
// ============================================

// Setup taxi type selection handlers
function setupTaxiTypeSelection() {
    const taxiTypeRadios = document.querySelectorAll('input[name="taxiServiceType"]');
    const isPrivateCheckbox = document.getElementById('isPrivateTaxi');
    const noneRadio = document.getElementById('taxiType_none');
    
    // Handle taxi type change
    taxiTypeRadios.forEach(radio => {
        radio.addEventListener('change', function() {
            // If "None (Private only)" is selected, automatically check private checkbox
            if (radio.id === 'taxiType_none' && radio.checked) {
                isPrivateCheckbox.checked = true;
            }
            updateSectionVisibility();
        });
    });
    
    // Handle private taxi checkbox change
    isPrivateCheckbox.addEventListener('change', updateSectionVisibility);
    
    // Initial update
    updateSectionVisibility();
}

// Update section visibility based on taxi type
function updateSectionVisibility() {
    const selectedTaxiType = document.querySelector('input[name="taxiServiceType"]:checked')?.value;
    const isPrivate = document.getElementById('isPrivateTaxi').checked;
    
    // Sections for long-distance
    const routePermitSection = document.getElementById('routePermitSection');
    const routeSelectionSection = document.getElementById('routeSelectionSection');
    const longDistanceRoutes = document.getElementById('longDistanceRoutes');
    const directionSelectionGroup = document.getElementById('directionSelectionGroup');
    
    // Sections for private only
    const amenitiesSection = document.getElementById('amenitiesSection');
    const coverageSection = document.getElementById('coverageSection');
    const videoSection = document.getElementById('videoSection');
    const descriptionSection = document.getElementById('descriptionSection');
    
    // Show route selection and route permit only for long-distance (not for private-only)
    if (selectedTaxiType === 'long-distance') {
        routeSelectionSection.style.display = 'block';
        routePermitSection.style.display = 'block';
        longDistanceRoutes.style.display = 'block';
        if (directionSelectionGroup) {
            directionSelectionGroup.style.display = 'none'; // Hide until route is selected
        }
    } else {
        routeSelectionSection.style.display = 'none';
        routePermitSection.style.display = 'none';
        longDistanceRoutes.style.display = 'none';
        if (directionSelectionGroup) {
            directionSelectionGroup.style.display = 'none';
        }
    }
    
    // Show private sections if private is selected OR if no service type is selected (private-only registration)
    if (isPrivate || !selectedTaxiType || selectedTaxiType === '') {
        amenitiesSection.style.display = 'block';
        coverageSection.style.display = 'block';
        videoSection.style.display = 'block';
        descriptionSection.style.display = 'block';
        
        // Initialize map if not already initialized (for coverage areas)
        if (!map && coverageSection.style.display === 'block') {
            initializeMap();
        }
    } else {
        amenitiesSection.style.display = 'none';
        coverageSection.style.display = 'none';
        videoSection.style.display = 'none';
        descriptionSection.style.display = 'none';
    }
}

// ============================================
// DOCUMENT UPLOADS
// ============================================

// Setup document uploads
function setupDocumentUploads() {
    // Roadworthy document
    const roadworthyUploadArea = document.getElementById('roadworthyUploadArea');
    const roadworthyFileInput = document.getElementById('roadworthyDocument');
    const roadworthyPreview = document.getElementById('roadworthyPreview');

    roadworthyUploadArea.addEventListener('click', () => roadworthyFileInput.click());
    roadworthyFileInput.addEventListener('change', (e) => {
        handleDocumentUpload(e.target.files[0], 'roadworthy');
    });

    roadworthyUploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        roadworthyUploadArea.classList.add('dragover');
    });

    roadworthyUploadArea.addEventListener('dragleave', () => {
        roadworthyUploadArea.classList.remove('dragover');
    });

    roadworthyUploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        roadworthyUploadArea.classList.remove('dragover');
        handleDocumentUpload(e.dataTransfer.files[0], 'roadworthy');
    });

    // Route permit document
    const routePermitUploadArea = document.getElementById('routePermitUploadArea');
    const routePermitFileInput = document.getElementById('routePermitDocument');
    const routePermitPreview = document.getElementById('routePermitPreview');

    routePermitUploadArea.addEventListener('click', () => routePermitFileInput.click());
    routePermitFileInput.addEventListener('change', (e) => {
        handleDocumentUpload(e.target.files[0], 'routePermit');
    });

    routePermitUploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        routePermitUploadArea.classList.add('dragover');
    });

    routePermitUploadArea.addEventListener('dragleave', () => {
        routePermitUploadArea.classList.remove('dragover');
    });

    routePermitUploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        routePermitUploadArea.classList.remove('dragover');
        handleDocumentUpload(e.dataTransfer.files[0], 'routePermit');
    });
}

// Handle document upload
function handleDocumentUpload(file, type) {
    if (!file) return;
    
    // Check if it's PDF or image
    const isPDF = file.type === 'application/pdf';
    const isImage = file.type.startsWith('image/');
    
    if (!isPDF && !isImage) {
        alert('Please upload a PDF, JPG, JPEG, or PNG file.');
        return;
    }
    
    const reader = new FileReader();
    reader.onload = (e) => {
        const documentData = {
            file: file,
            url: e.target.result,
            name: file.name
        };
        
        if (type === 'roadworthy') {
            roadworthyDocument = documentData;
            displayDocumentPreview(documentData, 'roadworthyPreview');
        } else if (type === 'routePermit') {
            routePermitDocument = documentData;
            displayDocumentPreview(documentData, 'routePermitPreview');
        }
    };
    reader.readAsDataURL(file);
}

// Display document preview
function displayDocumentPreview(documentData, previewId) {
    const preview = document.getElementById(previewId);
    const isPDF = documentData.file.type === 'application/pdf';
    
    if (isPDF) {
        preview.innerHTML = `
            <div class="preview-item">
                <div style="width: 100%; height: 150px; background: #f8f9fa; display: flex; flex-direction: column; align-items: center; justify-content: center; border-radius: 8px; padding: 1rem;">
                    <i class="fas fa-file-pdf" style="font-size: 3rem; color: #dc3545; margin-bottom: 0.5rem;"></i>
                    <div style="font-weight: 600; color: #333; text-align: center; word-break: break-word;">${documentData.name}</div>
                    <div style="font-size: 0.8rem; color: #6c757d; margin-top: 0.25rem;">${(documentData.file.size / (1024 * 1024)).toFixed(2)} MB</div>
                </div>
                <button class="preview-remove" onclick="removeDocument('${previewId.replace('Preview', '')}')">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;
    } else {
        preview.innerHTML = `
            <div class="preview-item">
                <img src="${documentData.url}" alt="${documentData.name}" style="width: 100%; height: 150px; object-fit: contain; background: #f8f9fa;">
                <button class="preview-remove" onclick="removeDocument('${previewId.replace('Preview', '')}')">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;
    }
}

// Remove document (exposed globally for onclick handlers)
window.removeDocument = function(type) {
    if (type === 'roadworthy') {
        roadworthyDocument = null;
        document.getElementById('roadworthyPreview').innerHTML = '';
        document.getElementById('roadworthyDocument').value = '';
    } else if (type === 'routePermit') {
        routePermitDocument = null;
        document.getElementById('routePermitPreview').innerHTML = '';
        document.getElementById('routePermitDocument').value = '';
    }
};

// ============================================
// MAP INITIALIZATION (for coverage areas)
// ============================================

// Initialize map for coverage areas (only for private taxis)
function initializeMap() {
    const coverageSection = document.getElementById('coverageSection');
    if (!coverageSection || coverageSection.style.display === 'none') {
        return; // Don't initialize if coverage section is hidden
    }
    
    if (map) {
        return; // Already initialized
    }
    
    map = new mapboxgl.Map({
        container: 'coverageMap',
        style: 'mapbox://styles/mapbox/streets-v12',
        center: [-26.2041, 28.0473], // Johannesburg
        zoom: 10
    });
    
    map.on('load', function() {
        // Add coverage area visualization
        addCoverageVisualization();
    });
}

// Add coverage area visualization
function addCoverageVisualization() {
    // Example coverage areas
    const areas = [
        { name: 'Johannesburg CBD', center: [-26.2041, 28.0473], radius: 5 },
        { name: 'Soweto', center: [-26.2485, 27.9083], radius: 8 },
        { name: 'Sandton', center: [-26.1076, 28.0567], radius: 6 },
        { name: 'Pretoria', center: [-25.7479, 28.2293], radius: 7 }
    ];
    
    areas.forEach(area => {
        // Add circle for coverage area
        map.addSource(`coverage-${area.name}`, {
            type: 'geojson',
            data: {
                type: 'Feature',
                geometry: {
                    type: 'Point',
                    coordinates: area.center
                }
            }
        });
        
        map.addLayer({
            id: `coverage-${area.name}`,
            type: 'circle',
            source: `coverage-${area.name}`,
            paint: {
                'circle-radius': area.radius * 1000, // Convert km to meters
                'circle-color': '#01386A',
                'circle-opacity': 0.2,
                'circle-stroke-color': '#01386A',
                'circle-stroke-width': 2
            }
        });
    });
}

// ============================================
// IMAGE & VIDEO UPLOADS
// ============================================

// Setup image upload
function setupImageUpload() {
    // Main image upload
    const mainUploadArea = document.getElementById('mainImageUploadArea');
    const mainFileInput = document.getElementById('mainVehicleImage');
    const mainPreview = document.getElementById('mainImagePreview');

    mainUploadArea.addEventListener('click', () => mainFileInput.click());
    mainFileInput.addEventListener('change', (e) => {
        handleMainImage(e.target.files[0]);
    });

    // Additional images upload
    const uploadArea = document.getElementById('imageUploadArea');
    const fileInput = document.getElementById('vehicleImages');
    const preview = document.getElementById('imagePreview');

    uploadArea.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', (e) => {
        handleFiles(e.target.files);
    });

    // Video upload (only if video section is visible)
    const videoUploadArea = document.getElementById('videoUploadArea');
    if (videoUploadArea) {
        const videoFileInput = document.getElementById('vehicleVideo');
        const videoPreview = document.getElementById('videoPreview');

        videoUploadArea.addEventListener('click', () => videoFileInput.click());
        videoFileInput.addEventListener('change', (e) => {
            handleVideo(e.target.files[0]);
        });

        videoUploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            videoUploadArea.classList.add('dragover');
        });

        videoUploadArea.addEventListener('dragleave', () => {
            videoUploadArea.classList.remove('dragover');
        });

        videoUploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            videoUploadArea.classList.remove('dragover');
            handleVideo(e.dataTransfer.files[0]);
        });
    }

    // Drag and drop for image areas
    [mainUploadArea, uploadArea].forEach(area => {
        area.addEventListener('dragover', (e) => {
            e.preventDefault();
            area.classList.add('dragover');
        });

        area.addEventListener('dragleave', () => {
            area.classList.remove('dragover');
        });

        area.addEventListener('drop', (e) => {
            e.preventDefault();
            area.classList.remove('dragover');
            if (area === mainUploadArea) {
                handleMainImage(e.dataTransfer.files[0]);
            } else {
                handleFiles(e.dataTransfer.files);
            }
        });
    });
}

// Handle main image upload
function handleMainImage(file) {
    if (file && file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const imageData = {
                file: file,
                url: e.target.result,
                isMain: true
            };
            mainImage = imageData;
            displayMainImagePreview(imageData);
        };
        reader.readAsDataURL(file);
    }
}

// Handle video upload
function handleVideo(file) {
    if (file && file.type.startsWith('video/')) {
        // Check file size (50MB limit)
        if (file.size > 50 * 1024 * 1024) {
            alert('Video file is too large. Please choose a file smaller than 50MB.');
            return;
        }
        
        const reader = new FileReader();
        reader.onload = (e) => {
            const videoData = {
                file: file,
                url: e.target.result
            };
            uploadedVideo = videoData;
            displayVideoPreview(videoData);
        };
        reader.readAsDataURL(file);
    }
}

// Handle uploaded files
function handleFiles(files) {
    Array.from(files).forEach(file => {
        if (file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = (e) => {
                const imageData = {
                    file: file,
                    url: e.target.result
                };
                uploadedImages.push(imageData);
                displayImagePreview(imageData);
            };
            reader.readAsDataURL(file);
        }
    });
}

// Display main image preview
function displayMainImagePreview(imageData) {
    const preview = document.getElementById('mainImagePreview');
    preview.innerHTML = `
        <div class="preview-item">
            <img src="${imageData.url}" alt="Main vehicle image">
            <button class="preview-remove" onclick="removeMainImage()">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `;
}

// Display video preview
function displayVideoPreview(videoData) {
    const preview = document.getElementById('videoPreview');
    const fileSize = (videoData.file.size / (1024 * 1024)).toFixed(2);
    preview.innerHTML = `
        <div class="video-preview-item">
            <video controls>
                <source src="${videoData.url}" type="${videoData.file.type}">
                Your browser does not support the video tag.
            </video>
            <div class="video-info">
                <div class="video-name">${videoData.file.name}</div>
                <div class="video-size">${fileSize} MB</div>
            </div>
            <button class="preview-remove" onclick="removeVideo()">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `;
}

// Display image preview
function displayImagePreview(imageData) {
    const preview = document.getElementById('imagePreview');
    const previewItem = document.createElement('div');
    previewItem.className = 'preview-item';
    previewItem.innerHTML = `
        <img src="${imageData.url}" alt="Vehicle image">
        <button class="preview-remove" onclick="removeImage(this)">
            <i class="fas fa-times"></i>
        </button>
    `;
    preview.appendChild(previewItem);
}

// Remove main image (exposed globally for onclick handlers)
window.removeMainImage = function() {
    mainImage = null;
    document.getElementById('mainImagePreview').innerHTML = '';
};

// Remove video (exposed globally for onclick handlers)
window.removeVideo = function() {
    uploadedVideo = null;
    document.getElementById('videoPreview').innerHTML = '';
};

// Remove image (exposed globally for onclick handlers)
window.removeImage = function(button) {
    const previewItem = button.closest('.preview-item');
    const index = Array.from(document.querySelectorAll('.preview-item')).indexOf(previewItem);
    uploadedImages.splice(index, 1);
    previewItem.remove();
};

// ============================================
// FORM VALIDATION & SUBMISSION
// ============================================

// Setup form validation
function setupFormValidation() {
    const form = document.getElementById('vehiclePostForm');
    
    form.addEventListener('submit', function(e) {
        e.preventDefault();
        
        if (validateForm()) {
            submitVehicle();
        }
    });
}

// Setup "Other" option handlers for make, model, color
function setupOtherOptions() {
    // Make "Other" handler
    const makeSelect = document.getElementById('vehicleMake');
    const makeOtherInput = document.getElementById('vehicleMakeOther');
    if (makeSelect && makeOtherInput) {
        makeSelect.addEventListener('change', function() {
            if (this.value === 'Other') {
                makeOtherInput.style.display = 'block';
                makeOtherInput.required = true;
            } else {
                makeOtherInput.style.display = 'none';
                makeOtherInput.required = false;
                makeOtherInput.value = '';
            }
        });
    }
    
    // Model "Other" handler
    const modelSelect = document.getElementById('vehicleModel');
    const modelOtherInput = document.getElementById('vehicleModelOther');
    if (modelSelect && modelOtherInput) {
        modelSelect.addEventListener('change', function() {
            if (this.value === 'Other') {
                modelOtherInput.style.display = 'block';
                modelOtherInput.required = true;
            } else {
                modelOtherInput.style.display = 'none';
                modelOtherInput.required = false;
                modelOtherInput.value = '';
            }
        });
    }
    
    // Color "Other" handler
    const colorSelect = document.getElementById('vehicleColor');
    const colorOtherInput = document.getElementById('vehicleColorOther');
    if (colorSelect && colorOtherInput) {
        colorSelect.addEventListener('change', function() {
            if (this.value === 'Other') {
                colorOtherInput.style.display = 'block';
                colorOtherInput.required = true;
            } else {
                colorOtherInput.style.display = 'none';
                colorOtherInput.required = false;
                colorOtherInput.value = '';
            }
        });
    }
}

// Get vehicle make value (handles "Other" option)
function getVehicleMake() {
    const makeSelect = document.getElementById('vehicleMake');
    if (!makeSelect) return '';
    return makeSelect.value === 'Other' 
        ? document.getElementById('vehicleMakeOther').value.trim() 
        : makeSelect.value;
}

// Get vehicle model value (handles "Other" option)
function getVehicleModel() {
    const modelSelect = document.getElementById('vehicleModel');
    if (!modelSelect) return '';
    return modelSelect.value === 'Other' 
        ? document.getElementById('vehicleModelOther').value.trim() 
        : modelSelect.value;
}

// Get vehicle color value (handles "Other" option)
function getVehicleColor() {
    const colorSelect = document.getElementById('vehicleColor');
    if (!colorSelect) return '';
    return colorSelect.value === 'Other' 
        ? document.getElementById('vehicleColorOther').value.trim() 
        : colorSelect.value;
}

// Validate form
function validateForm() {
    const requiredFields = ['vehicleMake', 'vehicleModel', 'vehicleColor', 'vehicleType', 'registration', 'licensePlate', 'capacity'];
    let isValid = true;

    const selectedTaxiType = document.querySelector('input[name="taxiServiceType"]:checked')?.value;
    const isPrivate = document.getElementById('isPrivateTaxi').checked;
    
    // Validate that either a service type is selected OR private is checked
    if (!selectedTaxiType && !isPrivate) {
        alert('Please select Long-distance Taxi or check Private Taxi.');
        isValid = false;
    }

    requiredFields.forEach(fieldId => {
        const field = document.getElementById(fieldId);
        if (field && !field.value.trim()) {
            field.style.borderColor = '#dc3545';
            isValid = false;
        } else if (field) {
            field.style.borderColor = '#e9ecef';
        }
    });
    
    // Validate "Other" inputs if selected
    const makeSelect = document.getElementById('vehicleMake');
    if (makeSelect && makeSelect.value === 'Other') {
        const makeOther = document.getElementById('vehicleMakeOther');
        if (!makeOther || !makeOther.value.trim()) {
            makeOther.style.borderColor = '#dc3545';
            isValid = false;
        } else {
            makeOther.style.borderColor = '#e9ecef';
        }
    }
    
    const modelSelect = document.getElementById('vehicleModel');
    if (modelSelect && modelSelect.value === 'Other') {
        const modelOther = document.getElementById('vehicleModelOther');
        if (!modelOther || !modelOther.value.trim()) {
            modelOther.style.borderColor = '#dc3545';
            isValid = false;
        } else {
            modelOther.style.borderColor = '#e9ecef';
        }
    }
    
    const colorSelect = document.getElementById('vehicleColor');
    if (colorSelect && colorSelect.value === 'Other') {
        const colorOther = document.getElementById('vehicleColorOther');
        if (!colorOther || !colorOther.value.trim()) {
            colorOther.style.borderColor = '#dc3545';
            isValid = false;
        } else {
            colorOther.style.borderColor = '#e9ecef';
        }
    }

    // Validate roadworthy document
    if (!roadworthyDocument) {
        alert('Please upload a roadworthy certificate.');
        isValid = false;
    }

    // Validate route selection for long-distance
    if (selectedTaxiType === 'long-distance') {
        const longDistanceRoute = document.querySelector('input[name="longDistanceRoute"]:checked');
        if (!longDistanceRoute) {
            alert('Please select your long-distance route.');
            isValid = false;
        }
    }

    // Validate route permit only for long-distance (not required for private-only)
    if (selectedTaxiType === 'long-distance' && !routePermitDocument) {
        alert('Please upload a route permit document.');
        isValid = false;
    }

    // Validate coverage areas for private taxis (when private is checked OR when no service type is selected)
    if (isPrivate || !selectedTaxiType || selectedTaxiType === '') {
        const coverageCheckboxes = document.querySelectorAll('input[type="checkbox"][id^="jhb_"], input[type="checkbox"][id^="soweto"], input[type="checkbox"][id^="sandton"], input[type="checkbox"][id^="pretoria"], input[type="checkbox"][id^="centurion"], input[type="checkbox"][id^="midrand"], input[type="checkbox"][id^="randburg"], input[type="checkbox"][id^="roodepoort"]');
        const coverageSelected = Array.from(coverageCheckboxes).some(cb => cb.checked);
        
        if (!coverageSelected) {
            alert('Please select at least one coverage area.');
            isValid = false;
        }
    }

    return isValid;
}

// Show review section
function submitVehicle() {
    const selectedTaxiType = document.querySelector('input[name="taxiServiceType"]:checked')?.value;
    const isPrivate = document.getElementById('isPrivateTaxi').checked;
    
    // Get route selection
    let selectedRoute = null;
    if (selectedTaxiType === 'long-distance') {
        const longDistanceRoute = document.querySelector('input[name="longDistanceRoute"]:checked');
        selectedRoute = longDistanceRoute ? longDistanceRoute.value : null;
    }

        const formData = {
        make: getVehicleMake(),
        model: getVehicleModel(),
        color: getVehicleColor(),
        vehicleType: document.getElementById('vehicleType').value,
        registration: document.getElementById('registration').value,
        licensePlate: document.getElementById('licensePlate').value,
        capacity: document.getElementById('capacity').value,
        taxiServiceType: selectedTaxiType,
        selectedRoute: selectedRoute,
        directionType: directionType,
        isPrivateTaxi: isPrivate,
        amenities: isPrivate ? getSelectedAmenities() : [],
        coverageAreas: isPrivate ? getSelectedCoverageAreas() : [],
        maxDistance: isPrivate ? (document.getElementById('maxDistance')?.value || '') : '',
        description: isPrivate ? (document.getElementById('description')?.value || '') : '',
        mainImage: mainImage,
        images: uploadedImages,
        video: isPrivate ? uploadedVideo : null,
        roadworthyDocument: roadworthyDocument,
        routePermitDocument: routePermitDocument
    };

    // Store form data temporarily for review
    window.tempFormData = formData;

    // Hide form and show review section
    document.getElementById('vehiclePostForm').style.display = 'none';
    document.getElementById('reviewSection').style.display = 'block';
    document.getElementById('step2').classList.add('active');
    
    // Populate review sections
    populateReview(formData);
    
    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Populate review section with form data
function populateReview(formData) {
    // Vehicle Information
    const vehicleInfoHTML = `
        <div class="review-item">
            <div class="review-item-label">Make</div>
            <div class="review-item-value">${escapeHtml(formData.make)}</div>
        </div>
        <div class="review-item">
            <div class="review-item-label">Model</div>
            <div class="review-item-value">${escapeHtml(formData.model)}</div>
        </div>
        <div class="review-item">
            <div class="review-item-label">Color</div>
            <div class="review-item-value">${escapeHtml(formData.color)}</div>
        </div>
        <div class="review-item">
            <div class="review-item-label">Vehicle Type</div>
            <div class="review-item-value">${escapeHtml(formData.vehicleType)}</div>
        </div>
        <div class="review-item">
            <div class="review-item-label">Registration Number</div>
            <div class="review-item-value">${escapeHtml(formData.registration)}</div>
        </div>
        <div class="review-item">
            <div class="review-item-label">License Plate</div>
            <div class="review-item-value">${escapeHtml(formData.licensePlate)}</div>
        </div>
        <div class="review-item">
            <div class="review-item-label">Seating Capacity</div>
            <div class="review-item-value">${escapeHtml(formData.capacity)} seats</div>
        </div>
    `;
    document.getElementById('reviewVehicleInfo').innerHTML = vehicleInfoHTML;

    // Service Type & Routes
    if (formData.taxiServiceType || formData.isPrivateTaxi) {
        let serviceTypeHTML = '';
        if (formData.taxiServiceType === 'long-distance') {
            serviceTypeHTML = `
                <div class="review-item">
                    <div class="review-item-label">Service Type</div>
                    <div class="review-item-value"><i class="fas fa-route"></i> Long-distance Taxi</div>
                </div>
                <div class="review-item">
                    <div class="review-item-label">Route</div>
                    <div class="review-item-value">${formatRoute(formData.selectedRoute)}</div>
                </div>
            `;
        }
        
        if (formData.isPrivateTaxi) {
            serviceTypeHTML += `
                <div class="review-item">
                    <div class="review-item-label">Also Available As</div>
                    <div class="review-item-value"><i class="fas fa-key"></i> Private Taxi</div>
                </div>
            `;
            if (formData.coverageAreas && formData.coverageAreas.length > 0) {
                serviceTypeHTML += `
                    <div class="review-item">
                        <div class="review-item-label">Coverage Areas</div>
                        <div class="review-item-value">${formData.coverageAreas.join(', ')}</div>
                    </div>
                `;
            }
            if (formData.maxDistance) {
                serviceTypeHTML += `
                    <div class="review-item">
                        <div class="review-item-label">Maximum Distance</div>
                        <div class="review-item-value">${formData.maxDistance} km</div>
                    </div>
                `;
            }
        }

        document.getElementById('reviewTaxiType').innerHTML = serviceTypeHTML;
        document.getElementById('reviewTaxiTypeCard').style.display = 'block';
    }

    // Documents
    const documentsHTML = `
        <div class="review-item">
            <div class="review-item-label">Roadworthy Certificate</div>
            <div class="review-item-value"><i class="fas fa-check-circle" style="color: #28a745;"></i> ${formData.roadworthyDocument ? 'Uploaded' : 'Not uploaded'}</div>
        </div>
        ${formData.routePermitDocument ? `
        <div class="review-item">
            <div class="review-item-label">Route Permit</div>
            <div class="review-item-value"><i class="fas fa-check-circle" style="color: #28a745;"></i> Uploaded</div>
        </div>
        ` : ''}
        ${formData.mainImage ? `
        <div class="review-item">
            <div class="review-item-label">Main Image</div>
            <div class="review-item-value"><i class="fas fa-check-circle" style="color: #28a745;"></i> Uploaded</div>
        </div>
        ` : ''}
        ${formData.images && formData.images.length > 0 ? `
        <div class="review-item">
            <div class="review-item-label">Additional Images</div>
            <div class="review-item-value"><i class="fas fa-check-circle" style="color: #28a745;"></i> ${formData.images.length} image(s) uploaded</div>
        </div>
        ` : ''}
    `;
    document.getElementById('reviewDocuments').innerHTML = documentsHTML;
}

// Format route for display
function formatRoute(routeId) {
    if (!routeId) return 'N/A';
    
    // If routeId is a number (route ID), find the route name from availableRoutes
    const routeIdNum = parseInt(routeId);
    if (!isNaN(routeIdNum) && window.availableRoutes && window.availableRoutes.length > 0) {
        const route = window.availableRoutes.find(r => (r.id || r.ID) == routeIdNum);
        if (route) {
            return route.route_name || `${route.location_1} ↔ ${route.location_2}`;
        }
    }
    
    // Fallback: if it's still a string like "pretoria-tzaneen", handle it
    if (typeof routeId === 'string') {
        const routeMap = {
            'pretoria-tzaneen': 'Pretoria ↔ Tzaneen',
            'jhb-tzaneen': 'Johannesburg ↔ Tzaneen'
        };
        return routeMap[routeId] || routeId;
    }
    
    return routeId;
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return String(text).replace(/[&<>"']/g, m => map[m]);
}

// Go back to form (exposed globally for onclick handlers)
window.goBackToForm = function() {
    document.getElementById('reviewSection').style.display = 'none';
    document.getElementById('vehiclePostForm').style.display = 'block';
    document.getElementById('step2').classList.remove('active');
    window.scrollTo({ top: 0, behavior: 'smooth' });
};

// Confirm submission (exposed globally for onclick handlers)
window.confirmSubmission = async function() {
    if (!window.tempFormData) {
        alert('Error: Form data not found. Please try again.');
        return;
    }

    // Check if user is authenticated (check for userProfile in localStorage)
    const userProfile = localStorage.getItem('userProfile');
    if (!userProfile) {
        alert('You must be logged in to submit a vehicle. Please log in and try again.');
        window.location.href = '../../pages/authentication/login.html';
        return;
    }

    // Show loading state
    const submitBtn = document.querySelector('#reviewSection button.btn-primary');
    const originalBtnText = submitBtn ? submitBtn.textContent : '';
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Submitting...';
    }

    try {
        const formData = window.tempFormData;

        // Map form data to API format
        const routeTypes = [];
        if (formData.taxiServiceType === 'long-distance') {
            routeTypes.push('long-distance');
        }
        if (formData.isPrivateTaxi) {
            routeTypes.push('custom');
        }
        // Default to long-distance if nothing selected
        if (routeTypes.length === 0) {
            routeTypes.push('long-distance');
        }

        // Get existing_route_id directly from the selected radio button
        // The radio button value is now the route ID
        let existingRouteId = null;
        if (formData.taxiServiceType === 'long-distance' && formData.selectedRoute) {
            // The selectedRoute is now the route ID (not a string like "pretoria-tzaneen")
            existingRouteId = parseInt(formData.selectedRoute);
            if (isNaN(existingRouteId)) {
                console.warn('Invalid route ID:', formData.selectedRoute);
                existingRouteId = null;
            }
        }

        // Process direction_type for SET field
        let directionTypeValue = 'from_loc1,from_loc2'; // Default: both directions
        if (formData.directionType && Array.isArray(formData.directionType) && formData.directionType.length > 0) {
            // Convert array to SET format (comma-separated string)
            const validDirections = formData.directionType.filter(d => ['from_loc1', 'from_loc2'].includes(d));
            directionTypeValue = validDirections.length > 0 ? validDirections.join(',') : 'from_loc1,from_loc2';
        }

        // Prepare API payload
        const apiPayload = {
            registration_number: formData.registration,
            license_plate: formData.licensePlate,
            make: formData.make,
            model: formData.model,
            color: formData.color || null,
            capacity: parseInt(formData.capacity),
            extraspace_parcel_sp: 12, // Default value, can be made configurable
            vehicle_type: formData.vehicleType,
            route_types: routeTypes,
            existing_route_id: existingRouteId,
            direction_type: directionTypeValue,
            description: formData.description || null,
            images: formData.images || [],
            videos: formData.video ? [formData.video] : [],
            features: formData.amenities || []
        };

        console.log('Submitting vehicle to API:', apiPayload);

        // Submit to backend API
        const response = await window.axios.post(
            `${window.BASE_URL}/api/vehicles`,
            apiPayload
        );

        if (response.data.success) {
            console.log('Vehicle submitted successfully:', response.data);

            // Hide review section and show success message
            document.getElementById('reviewSection').style.display = 'none';
            document.getElementById('successMessage').style.display = 'block';
            document.getElementById('step2').classList.remove('active');
            document.getElementById('step2').classList.add('completed');
            
            // Scroll to top
            window.scrollTo({ top: 0, behavior: 'smooth' });

            // Clear temp data
            window.tempFormData = null;
        } else {
            throw new Error(response.data.message || 'Failed to submit vehicle');
        }
    } catch (error) {
        console.error('Error submitting vehicle:', error);
        
        // Re-enable button
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = originalBtnText;
        }

        // Show error message
        const errorMessage = error.response?.data?.message || error.message || 'Failed to submit vehicle. Please try again.';
        alert(`Error: ${errorMessage}`);
    }
};

// Go to dashboard (exposed globally for onclick handlers)
window.goToDashboard = function() {
    window.location.href = 'owner-dashboard.html';
};

// Get selected amenities
function getSelectedAmenities() {
    const amenities = [];
    document.querySelectorAll('input[type="checkbox"][id^="ac"], input[type="checkbox"][id^="music"], input[type="checkbox"][id^="wifi"], input[type="checkbox"][id^="charging"], input[type="checkbox"][id^="luggage"], input[type="checkbox"][id^="wheelchair"]').forEach(cb => {
        if (cb.checked) {
            amenities.push(cb.value);
        }
    });
    return amenities;
}

// Get selected coverage areas
function getSelectedCoverageAreas() {
    const areas = [];
    document.querySelectorAll('input[type="checkbox"][id^="jhb_"], input[type="checkbox"][id^="soweto"], input[type="checkbox"][id^="sandton"], input[type="checkbox"][id^="pretoria"], input[type="checkbox"][id^="centurion"], input[type="checkbox"][id^="midrand"], input[type="checkbox"][id^="randburg"], input[type="checkbox"][id^="roodepoort"]').forEach(cb => {
        if (cb.checked) {
            areas.push(cb.value);
        }
    });
    return areas;
}

// Save as draft (exposed globally for onclick handlers)
window.saveDraft = function() {
    const selectedTaxiType = document.querySelector('input[name="taxiServiceType"]:checked')?.value;
    const isPrivate = document.getElementById('isPrivateTaxi').checked;
    
    // Get route selection
    let selectedRoute = null;
    if (selectedTaxiType === 'long-distance') {
        const longDistanceRoute = document.querySelector('input[name="longDistanceRoute"]:checked');
        selectedRoute = longDistanceRoute ? longDistanceRoute.value : null;
    }
    
    const formData = {
        make: getVehicleMake(),
        model: getVehicleModel(),
        color: getVehicleColor(),
        vehicleType: document.getElementById('vehicleType').value,
        registration: document.getElementById('registration').value,
        licensePlate: document.getElementById('licensePlate').value,
        capacity: document.getElementById('capacity').value,
        taxiServiceType: selectedTaxiType,
        selectedRoute: selectedRoute,
        isPrivateTaxi: isPrivate,
        amenities: isPrivate ? getSelectedAmenities() : [],
        coverageAreas: isPrivate ? getSelectedCoverageAreas() : [],
        maxDistance: isPrivate ? (document.getElementById('maxDistance')?.value || '') : '',
        description: isPrivate ? (document.getElementById('description')?.value || '') : '',
        ownerName: document.getElementById('ownerName').value,
        phoneNumber: document.getElementById('phoneNumber').value,
        email: document.getElementById('email').value,
        whatsapp: document.getElementById('whatsapp').value,
        images: uploadedImages,
        video: isPrivate ? uploadedVideo : null,
        roadworthyDocument: roadworthyDocument,
        routePermitDocument: routePermitDocument,
        status: 'draft'
    };

    // In real app, save to backend
    console.log('Draft saved:', formData);
    alert('Draft saved successfully!');
};

// ============================================
// ROUTE LOADING
// ============================================

/**
 * Load existing routes from the database and populate the route selection
 */
async function loadExistingRoutes() {
    try {
        const routeCheckboxGroup = document.getElementById('routeCheckboxGroup');
        if (!routeCheckboxGroup) return;

        const response = await axios.get(`${BASE_URL}/admin/existing-routes`);

        if (response.data.success && response.data.routes && response.data.routes.length > 0) {
            const routes = response.data.routes;
            window.availableRoutes = routes; // Store for formatRoute function
            
            // Clear loading message
            routeCheckboxGroup.innerHTML = '';

            // Render each route as a radio button option
            routes.forEach(route => {
                const routeId = route.id || route.ID;
                if (!routeId) {
                    console.warn('Route missing ID, skipping:', route);
                    return;
                }

                const routeItem = document.createElement('div');
                routeItem.className = 'checkbox-item';
                
                const radioId = `route_${routeId}`;
                routeItem.innerHTML = `
                    <input type="radio" id="${radioId}" name="longDistanceRoute" value="${routeId}" data-route-id="${routeId}" data-location1="${escapeHtml(route.location_1)}" data-location2="${escapeHtml(route.location_2)}">
                    <label for="${radioId}" style="margin-left: 0.5rem; cursor: pointer;">${escapeHtml(route.route_name || `${route.location_1} ↔ ${route.location_2}`)}</label>
                `;
                
                routeCheckboxGroup.appendChild(routeItem);
            });

            // Add event listeners to route radio buttons to update direction labels
            const routeRadios = document.querySelectorAll('input[name="longDistanceRoute"]');
            routeRadios.forEach(radio => {
                radio.addEventListener('change', function() {
                    updateDirectionLabels(this);
                    showDirectionSelection();
                });
            });

            if (routes.length === 0) {
                routeCheckboxGroup.innerHTML = '<div style="padding: 1rem; text-align: center; color: #666;">No routes available</div>';
            }
        } else {
            routeCheckboxGroup.innerHTML = '<div style="padding: 1rem; text-align: center; color: #666;">No routes available</div>';
        }
    } catch (error) {
        console.error('Error loading existing routes:', error);
        const routeCheckboxGroup = document.getElementById('routeCheckboxGroup');
        if (routeCheckboxGroup) {
            routeCheckboxGroup.innerHTML = '<div style="padding: 1rem; text-align: center; color: #dc3545;">Error loading routes. Please refresh the page.</div>';
        }
    }
}

/**
 * Updates direction labels based on selected route
 */
function updateDirectionLabels(selectedRouteRadio) {
    const location1 = selectedRouteRadio.getAttribute('data-location1');
    const location2 = selectedRouteRadio.getAttribute('data-location2');
    
    const loc1Label = document.getElementById('direction_loc1_label');
    const loc2Label = document.getElementById('direction_loc2_label');
    
    if (loc1Label && location1 && location2) {
        loc1Label.textContent = `From ${location1} to ${location2}`;
    }
    
    if (loc2Label && location1 && location2) {
        loc2Label.textContent = `From ${location2} to ${location1}`;
    }
}

/**
 * Shows direction selection when a route is selected
 */
function showDirectionSelection() {
    const directionGroup = document.getElementById('directionSelectionGroup');
    const selectedRoute = document.querySelector('input[name="longDistanceRoute"]:checked');
    
    if (directionGroup && selectedRoute) {
        directionGroup.style.display = 'block';
    } else if (directionGroup) {
        directionGroup.style.display = 'none';
    }
}

// ============================================
// MOBILE MENU
// ============================================

// Mobile menu toggle function (exposed globally for onclick handlers)
window.toggleMobileMenu = function() {
    const menu = document.getElementById("mobileMenu");
    const isShown = menu.classList.toggle("show");

    if (isShown) {
        topNavZIndexIncrease();
    } else {
        topNavZIndexDecrease();
    }
};

function topNavZIndexIncrease() {
    const navbar = document.querySelector(".topnav");
    if (navbar) {
        navbar.style.zIndex = "3001";
    }
}

function topNavZIndexDecrease() {
    const navbar = document.querySelector(".topnav");
    if (navbar) {
        navbar.style.zIndex = "3";
    }
}

