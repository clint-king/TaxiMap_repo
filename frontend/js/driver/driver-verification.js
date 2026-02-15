// Driver Verification JavaScript
import { verifyPassengerOrParcelCode } from '../api/bookingApi.js';
import { BASE_URL } from '../AddressSelection.js';
import * as trackingAPi from '../api/trackingAPi.js';

let currentStream = null;
let scanningInterval = null;
let currentTrip = null;
let currentBookingId = null; // Store bookingId from URL parameter

document.addEventListener('DOMContentLoaded', function() {
    // Check driver authentication
    checkDriverAuthentication();
    
    // Get bookingId from URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const bookingId = urlParams.get('bookingId');
    
    if (bookingId) {
        currentBookingId = Number(bookingId);
        console.log('Booking ID from URL:', currentBookingId);
    }
    
    // Load current trip
    loadCurrentTrip();
    
    // Set up periodic refresh of verification codes
    //setInterval(refreshVerificationCodes, 30000); // Check every 30 seconds
   refreshVerificationCodes
});

function checkDriverAuthentication() {
    const userProfile = localStorage.getItem('userProfile');
    
    if (!userProfile) {
        window.location.href = '/pages/authentication/login.html';
        return;
    }
    
    const user = JSON.parse(userProfile);
    
    // Check if user is a driver - allow access for now (can be restricted later)
    // For now, let any logged-in user access the driver portal
    // In production, you would check: user.userType === 'driver' || user.user_type === 'driver'
    
    // Show driver navigation
    const driverNav = document.getElementById('driverNav');
    const logoutBtn = document.getElementById('logoutBtn');
    
    if (driverNav) driverNav.style.display = 'flex';
    if (logoutBtn) logoutBtn.style.display = 'block';
}

function loadCurrentTrip() {
    // If bookingId is in URL, use it directly
    if (currentBookingId) {
        // Create a trip object from bookingId for compatibility
        currentTrip = {
            id: currentBookingId,
            status: 'active',
            bookingId: currentBookingId
        };
        
        // Update trip info display
        updateTripInfo();
        
        // Generate trip-specific verification codes
        generateTripVerificationCodes();
        
        return;
    }
    
    // Get trip ID from URL parameters (legacy support)
    const urlParams = new URLSearchParams(window.location.search);
    const tripId = urlParams.get('trip');
    
    if (tripId) {
        // Load specific trip
        const trips = JSON.parse(localStorage.getItem('driverTrips') || '[]');
        currentTrip = trips.find(trip => trip.id === tripId);
    } else {
        // Load current active trip
        const currentTripData = localStorage.getItem('currentDriverTrip');
        if (currentTripData) {
            currentTrip = JSON.parse(currentTripData);
        }
    }
    
    if (currentTrip) {
        // Check if trip is still active
        if (currentTrip.status !== 'active') {
            showErrorMessage('This trip is no longer active. Verification codes have been cleared.');
            clearVerificationCodes();
            return;
        }
        
        // Update trip info display
        updateTripInfo();
        
        // Generate trip-specific verification codes
        generateTripVerificationCodes();
        
        // Load package photos if applicable
        loadPackagePhotos();
    } else {
        showErrorMessage('No active trip found. Please start a trip to access verification.');
        clearVerificationCodes();
    }
}

function loadPackagePhotos() {
    if (!currentTrip || currentTrip.tripType !== 'package') return;
    
    const packagePhotos = document.getElementById('packagePhotos');
    if (!packagePhotos) return;
    
    // Simulate package photos (in real app, these would come from the trip data)
    const photos = [
        'https://via.placeholder.com/150x150/FF6B6B/FFFFFF?text=Package+1',
        'https://via.placeholder.com/150x150/4ECDC4/FFFFFF?text=Package+2',
        'https://via.placeholder.com/150x150/45B7D1/FFFFFF?text=Package+3'
    ];
    
    packagePhotos.innerHTML = photos.map((photo, index) => `
        <img src="${photo}" alt="Package Photo ${index + 1}" class="package-photo" onclick="openPhotoModal('${photo}')" />
    `).join('');
}

function openPhotoModal(imageSrc) {
    const modal = document.getElementById('photoModal');
    const modalImage = document.getElementById('modalImage');
    
    if (modal && modalImage) {
        modalImage.src = imageSrc;
        modal.classList.add('active');
    }
}

function startQRScan() {
    const scanner = document.getElementById('unifiedScanner');
    const video = document.getElementById('unifiedVideo');
    const canvas = document.getElementById('unifiedCanvas');
    const placeholder = document.getElementById('unifiedPlaceholder');
    
    if (!scanner || !video || !canvas || !placeholder) return;
    
    // Hide placeholder and show video
    placeholder.style.display = 'none';
    video.style.display = 'block';
    canvas.style.display = 'block';
    scanner.classList.add('active');
    
    // Start camera
    navigator.mediaDevices.getUserMedia({ 
        video: { 
            facingMode: 'environment' // Use back camera
        } 
    })
    .then(function(stream) {
        currentStream = stream;
        video.srcObject = stream;
        video.play();
        
        // Start scanning for QR codes
        startQRCodeDetection(video, canvas);
    })
    .catch(function(error) {
        console.error('Error accessing camera:', error);
        showErrorMessage('Unable to access camera. Please check permissions.');
        stopScanning();
    });
}

function startQRCodeDetection(video, canvas) {
    const context = canvas.getContext('2d');
    
    scanningInterval = setInterval(function() {
        if (video.readyState === video.HAVE_ENOUGH_DATA) {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            context.drawImage(video, 0, 0, canvas.width, canvas.height);
            
            const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
            const code = jsQR(imageData.data, imageData.width, imageData.height);
            
            if (code) {
                console.log('QR Code detected:', code.data);
                handleQRCodeDetected(code.data);
            }
        }
    }, 100);
}

function handleQRCodeDetected(data) {
    stopScanning();
    
    // Parse QR code data (assuming it contains verification code)
    const verificationCode = data;
    
    verifyUnifiedCode(verificationCode);
}

function stopScanning() {
    if (scanningInterval) {
        clearInterval(scanningInterval);
        scanningInterval = null;
    }
    
    if (currentStream) {
        currentStream.getTracks().forEach(track => track.stop());
        currentStream = null;
    }
    
    // Reset scanner UI
    const scanners = document.querySelectorAll('.qr-scanner');
    scanners.forEach(scanner => {
        scanner.classList.remove('active');
        const video = scanner.querySelector('video');
        const canvas = scanner.querySelector('canvas');
        const placeholder = scanner.querySelector('[id$="Placeholder"]');
        
        if (video) video.style.display = 'none';
        if (canvas) canvas.style.display = 'none';
        if (placeholder) placeholder.style.display = 'block';
    });
}

async function verifyUnifiedCode(code) {
    const resultDiv = document.getElementById('unifiedResult');
    const detailsDiv = document.getElementById('unifiedDetails');
    const imagesDiv = document.getElementById('unifiedImages');
    if (!resultDiv || !detailsDiv || !imagesDiv) return;
    
    // Get code from input if not provided
    if (!code) {
        const codeInput = document.getElementById('unifiedCode');
        if (codeInput) {
            code = codeInput.value.trim();
        }
    }
    
    if (!code) {
        showErrorMessage('Please enter a verification code');
        return;
    }
    
    // Allow simulations even without active trip
    const isSimulation = code === 'SIM-PASS-001' || code === 'DEMO-PASSENGER' || 
                         code === 'SIM-PARCEL-001' || code === 'DEMO-PARCEL';
    
    // Get booking ID - prioritize URL parameter, then currentTrip
    let bookingId = currentBookingId || (currentTrip && currentTrip.id) || (currentTrip && currentTrip.bookingId);
    
    // Get booking ID from current trip (not required for simulations)
    if (!isSimulation && !bookingId) {
        showErrorMessage('No active trip found. Please provide a bookingId in the URL or start a trip.');
        return;
    }
    
    // Reset UI
    resultDiv.style.display = 'block';
    detailsDiv.style.display = 'none';
    imagesDiv.style.display = 'none';
    detailsDiv.innerHTML = '';
    imagesDiv.innerHTML = '';
    resultDiv.className = 'verification-result';
    resultDiv.innerHTML = '<i class="fas fa-spinner fa-spin"></i> <span>Verifying code...</span>';
    
    try {
        // Check for simulation codes
        let response;

        // if (code === 'SIM-PASS-001' || code === 'DEMO-PASSENGER') {
        //     // Simulate passenger verification
        //     response = await simulatePassengerVerification(code);
        // } else if (code === 'SIM-PARCEL-001' || code === 'DEMO-PARCEL') {
        //     // Simulate parcel verification
        //     response = await simulateParcelVerification(code);
        // } else {
        //     // Call the real API
        //     response = await verifyPassengerOrParcelCode(currentTrip.id, code);
        // }

        // Use bookingId from URL parameter or currentTrip
        const bookingIdToUse = currentBookingId || (currentTrip && currentTrip.id) || (currentTrip && currentTrip.bookingId);
        response = await verifyPassengerOrParcelCode(bookingIdToUse, code);
        
        if (response.success) {
            resultDiv.className = 'verification-result success';
            resultDiv.innerHTML = `
                <i class="fas fa-check-circle"></i>
                <span>${response.type === 'parcel' ? 'Package' : 'Passenger'} verified successfully!</span>
            `;
            
            updateTripVerification(response.type === 'parcel' ? 'package' : 'passenger', true);
            showSuccessMessage(`${response.type === 'parcel' ? 'Package' : 'Passenger'} verification successful!`);
            
            // Display details based on type
            if (response.type === 'passenger' && response.values) {
                displayPassengerDetails(response.values, detailsDiv);
            } else if (response.type === 'parcel' && response.values) {
                displayParcelDetails(response.values, detailsDiv, imagesDiv);
            }

            //update markers
            // if(response.type === 'passenger'){
            //     removeMarkerByWaypointId(response.id , 'passenger');
            // }else if(response.type === 'parcel'){
            //     removeMarkerByWaypointId(response.id , 'parcel');
            // }
        } else {
            resultDiv.className = 'verification-result error';
            resultDiv.innerHTML = `
                <i class="fas fa-times-circle"></i>
                <span>${response.message || 'Invalid verification code. Please try again.'}</span>
            `;
            showErrorMessage(response.message || 'Verification failed. Please check the code and try again.');
        }
    } catch (error) {
        console.error('Verification error:', error);
        resultDiv.className = 'verification-result error';
        const errorMessage = error.response?.data?.message || error.message || 'Failed to verify code. Please try again.';
        resultDiv.innerHTML = `
            <i class="fas fa-times-circle"></i>
            <span>${errorMessage}</span>
        `;
        showErrorMessage(errorMessage);
    }
}

function displayPassengerDetails(values, detailsDiv) {
    detailsDiv.style.display = 'block';
    detailsDiv.innerHTML = `
        <h3><i class="fas fa-user"></i> Passenger Details</h3>
        <div class="verification-details-grid">
            <div class="verification-detail-item">
                <span class="verification-detail-label">First Name</span>
                <span class="verification-detail-value">${values.first_name || 'N/A'}</span>
            </div>
            <div class="verification-detail-item">
                <span class="verification-detail-label">Last Name</span>
                <span class="verification-detail-value">${values.last_name || 'N/A'}</span>
            </div>
            <div class="verification-detail-item">
                <span class="verification-detail-label">Email</span>
                <span class="verification-detail-value">${values.email || 'N/A'}</span>
            </div>
            <div class="verification-detail-item">
                <span class="verification-detail-label">Phone</span>
                <span class="verification-detail-value">${values.phone || 'N/A'}</span>
            </div>
            <div class="verification-detail-item">
                <span class="verification-detail-label">Code</span>
                <span class="verification-detail-value">${values.code || 'N/A'}</span>
            </div>
            <div class="verification-detail-item">
                <span class="verification-detail-label">Status</span>
                <span class="verification-detail-value">${values.booking_passenger_status || 'N/A'}</span>
            </div>
        </div>
    `;
}

function displayParcelDetails(values, detailsDiv, imagesDiv) {
    detailsDiv.style.display = 'block';
    
    // Display sender information
    let detailsHTML = `
        <h3><i class="fas fa-box"></i> Parcel Details</h3>
        <div class="verification-details-grid">
            <div class="verification-detail-item">
                <span class="verification-detail-label">Sender Name</span>
                <span class="verification-detail-value">${values.sender_name || 'N/A'}</span>
            </div>
            <div class="verification-detail-item">
                <span class="verification-detail-label">Sender Email</span>
                <span class="verification-detail-value">${values.sender_email || 'N/A'}</span>
            </div>
            <div class="verification-detail-item">
                <span class="verification-detail-label">Sender Phone</span>
                <span class="verification-detail-value">${values.sender_phone || 'N/A'}</span>
            </div>
            <div class="verification-detail-item">
                <span class="verification-detail-label">Sender Code</span>
                <span class="verification-detail-value">${values.sender_code || 'N/A'}</span>
            </div>
            <div class="verification-detail-item">
                <span class="verification-detail-label">Status</span>
                <span class="verification-detail-value">${values.booking_parcel_status || 'N/A'}</span>
            </div>
        </div>
    `;
    
    // Display parcels grouped by ID
    if (values.parcels && values.parcels.length > 0) {
        values.parcels.forEach((parcel, index) => {
            detailsHTML += `
                <div class="parcel-group">
                    <h4><i class="fas fa-box-open"></i> Parcel #${parcel.id || index + 1}</h4>
                    <div class="parcel-info">
                        <div class="verification-details-grid">
                            <div class="verification-detail-item">
                                <span class="verification-detail-label">Parcel Number</span>
                                <span class="verification-detail-value">${parcel.parcel_number || 'N/A'}</span>
                            </div>
                            <div class="verification-detail-item">
                                <span class="verification-detail-label">Size</span>
                                <span class="verification-detail-value">${parcel.size || 'N/A'}</span>
                            </div>
                            <div class="verification-detail-item">
                                <span class="verification-detail-label">Quantity</span>
                                <span class="verification-detail-value">${parcel.quantity_compared_to_sp || 'N/A'}</span>
                            </div>
                            <div class="verification-detail-item">
                                <span class="verification-detail-label">Description</span>
                                <span class="verification-detail-value">${parcel.description || 'N/A'}</span>
                            </div>
                        </div>
                    </div>
                    <div class="parcel-images-container" data-parcel-id="${parcel.id || index}">
                        <h5 style="margin: 0.5rem 0; color: #01386A;">Images for Parcel #${parcel.id || index + 1}</h5>
                        <div class="package-photos" id="parcel-images-${parcel.id || index}"></div>
                    </div>
                </div>
            `;
        });
    }
    
    detailsDiv.innerHTML = detailsHTML;
    
    // Display images for each parcel separately
    if (values.parcels && values.parcels.length > 0) {
        values.parcels.forEach((parcel, index) => {
            const parcelImagesContainer = document.getElementById(`parcel-images-${parcel.id || index}`);
            if (parcelImagesContainer && parcel.images) {
                // Parse images if they're stored as JSON string
                let images = parcel.images;
                if (typeof images === 'string') {
                    try {
                        images = JSON.parse(images);
                    } catch (e) {
                        // If parsing fails, treat as single image URL
                        images = [images];
                    }
                }
                
                // Ensure images is an array
                if (!Array.isArray(images)) {
                    images = [images];
                }
                
                // Filter out null/undefined/empty images
                images = images.filter(img => {
                    if (!img) return false;
                    // Handle string images
                    if (typeof img === 'string') {
                        return img.trim().length > 0;
                    }
                    // Handle object images (if image is an object with url property)
                    if (typeof img === 'object' && img.url) {
                        return typeof img.url === 'string' && img.url.trim().length > 0;
                    }
                    return false;
                }).map(img => {
                    // Convert object images to string URLs
                    if (typeof img === 'object' && img.url) {
                        return img.url;
                    }
                    return img;
                });
                
                if (images.length > 0) {
                    parcelImagesContainer.innerHTML = images.map((img, imgIdx) => {
                        // Construct full URL if it's a relative path
                        const imageUrl = img.startsWith('http') ? img : `${BASE_URL}/${img}`;
                        return `
                            <img src="${imageUrl}" 
                                 alt="Parcel #${parcel.id || index + 1} - Image ${imgIdx + 1}" 
                                 class="package-photo" 
                                 onclick="openPhotoModal('${imageUrl}')" />
                        `;
                    }).join('');
                } else {
                    parcelImagesContainer.innerHTML = '<p style="color: #6c757d; font-style: italic;">No images available for this parcel</p>';
                }
            }
        });
    }
}

// Simulation functions for demo purposes
function simulatePassengerVerification(code) {
    // Simulate a delay to make it feel real
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve({
                success: true,
                type: 'passenger',
                message: 'Code verified successfully',
                values: {
                    first_name: 'John',
                    last_name: 'Doe',
                    email: 'john.doe@example.com',
                    phone: '+27 82 123 4567',
                    code: code,
                    booking_passenger_status: 'confirmed'
                }
            });
        }, 1000); // 1 second delay
    });
}

function simulateParcelVerification(code) {
    // Simulate a delay to make it feel real
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve({
                success: true,
                type: 'parcel',
                message: 'Code verified successfully',
                values: {
                    sender_name: 'Sarah Johnson',
                    sender_email: 'sarah.johnson@example.com',
                    sender_phone: '+27 83 987 6543',
                    sender_code: code,
                    booking_parcel_status: 'confirmed',
                    parcels: [
                        {
                            id: 101,
                            parcel_number: 'PKG-2024-001',
                            size: 'Medium',
                            quantity_compared_to_sp: '2',
                            description: 'Electronics - Laptop and accessories',
                            images: [
                                'https://via.placeholder.com/400x300/4ECDC4/FFFFFF?text=Parcel+101+Image+1',
                                'https://via.placeholder.com/400x300/45B7D1/FFFFFF?text=Parcel+101+Image+2'
                            ]
                        },
                        {
                            id: 102,
                            parcel_number: 'PKG-2024-002',
                            size: 'Small',
                            quantity_compared_to_sp: '1',
                            description: 'Documents - Legal papers',
                            images: [
                                'https://via.placeholder.com/400x300/FF6B6B/FFFFFF?text=Parcel+102+Image+1',
                                'https://via.placeholder.com/400x300/FFA07A/FFFFFF?text=Parcel+102+Image+2',
                                'https://via.placeholder.com/400x300/98D8C8/FFFFFF?text=Parcel+102+Image+3'
                            ]
                        },
                        {
                            id: 103,
                            parcel_number: 'PKG-2024-003',
                            size: 'Large',
                            quantity_compared_to_sp: '3',
                            description: 'Clothing - Winter collection',
                            images: [
                                'https://via.placeholder.com/400x300/F7DC6F/FFFFFF?text=Parcel+103+Image+1'
                            ]
                        }
                    ]
                }
            });
        }, 1000); // 1 second delay
    });
}

function updateTripVerification(type, verified) {
    if (!currentTrip) return;
    
    // Update trip verification status
    if (!currentTrip.verifications) {
        currentTrip.verifications = {};
    }
    
    currentTrip.verifications[type] = {
        verified: verified,
        timestamp: new Date().toISOString()
    };
    
    // Update localStorage
    const trips = JSON.parse(localStorage.getItem('driverTrips') || '[]');
    const tripIndex = trips.findIndex(trip => trip.id === currentTrip.id);
    if (tripIndex !== -1) {
        trips[tripIndex] = currentTrip;
        localStorage.setItem('driverTrips', JSON.stringify(trips));
    }
    
    // Update current trip
    localStorage.setItem('currentDriverTrip', JSON.stringify(currentTrip));
}

async function updateTripInfo() {
    if (!currentTrip) {
        // Show no trip message
        const tripInfoElement = document.getElementById('tripInfo');
        if (tripInfoElement) {
            tripInfoElement.innerHTML = `
                <div class="no-trip-message">
                    <i class="fas fa-exclamation-triangle" style="font-size: 2rem; margin-bottom: 1rem;"></i>
                    <h3>No Active Trip</h3>
                    <p>Please start a trip to access verification codes</p>
                </div>
            `;
        }
        return;
    }
    
    // Use dummy data to prevent undefined values
    // If bookingId is from URL, use it as the trip ID
    const tripId = currentBookingId || currentTrip.id || currentTrip.bookingId ;

    let response_bookingDetails = await trackingAPi.getBookingDetails(tripId);
    if(response_bookingDetails.success == false || response_bookingDetails == null){
      console.error("Error loading current trip: booking details not found");
      return;
    }
    const bookingDetails = response_bookingDetails.bookingDetails;

    let startingLocation;
    let destinationLocation;
    if(bookingDetails.direction_type == "from_loc1"){
      startingLocation = bookingDetails.location_1;
      destinationLocation = bookingDetails.location_2;
    }else{
      startingLocation = bookingDetails.location_2;
      destinationLocation = bookingDetails.location_1;
    }
    
    const tripData = {
        id: tripId,
        bookingId: currentBookingId || currentTrip.bookingId,
        pickupLocation: startingLocation || 'No location found',
        dropoffLocation: destinationLocation || 'No location found',
        vehicleType: bookingDetails.vehicle_make + ' ' + bookingDetails.vehicle_model || 'No vehicle type found',
        estimatedDuration: bookingDetails.typical_duration_hours + ' hours' || 'No estimated duration found',
        distance: bookingDetails.distance_km || 'No distance found',
        scheduledAt: bookingDetails.scheduled_pickup || 'No scheduled time found',
        status: bookingDetails.booking_status || 'No status found'
    };
    
    // Format scheduled time
    let scheduledTime = null;
    if(tripData.scheduledAt && tripData.scheduledAt !== 'No scheduled time found'){
      try {
        const date = new Date(tripData.scheduledAt);
        scheduledTime = date.toLocaleString("en-ZA", {
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
          hour12: false
        });
      } catch (error) {
        console.error("Error formatting scheduled time:", error);
        scheduledTime = tripData.scheduledAt;
      }
    }
    
    // Update trip info display
    const tripInfoElement = document.getElementById('tripInfo');
    if (tripInfoElement) {
        tripInfoElement.innerHTML = `
            <div class="trip-info-card">
                <h4><i class="fas fa-route"></i> ${currentBookingId ? 'Booking' : 'Trip'} #${tripData.id}</h4>
                
                <div class="trip-info-grid">
                    <div class="trip-info-item">
                        <span class="trip-info-label">From</span>
                        <span class="trip-info-value">${tripData.pickupLocation}</span>
                    </div>
                    
                    <div class="trip-info-item">
                        <span class="trip-info-label">To</span>
                        <span class="trip-info-value">${tripData.dropoffLocation}</span>
                    </div>
                    
                    <div class="trip-info-item">
                        <span class="trip-info-label">Vehicle</span>
                        <span class="trip-info-value">${tripData.vehicleType}</span>
                    </div>
                    
                    <div class="trip-info-item">
                        <span class="trip-info-label">Duration</span>
                        <span class="trip-info-value">${tripData.estimatedDuration}</span>
                    </div>
                    
                    <div class="trip-info-item">
                        <span class="trip-info-label">Distance</span>
                        <span class="trip-info-value">${tripData.distance}</span>
                    </div>
                    
                    <div class="trip-info-item">
                        <span class="trip-info-label">Scheduled</span>
                        <span class="trip-info-value">${scheduledTime || 'Not scheduled'}</span>
                    </div>
                </div>
                
                <div class="trip-status-badge">
                    <div class="status-dot"></div>
                    <span>Active Trip</span>
                </div>
            </div>
        `;
    }
}

function generateTripVerificationCodes() {
    if (!currentTrip) return;
    
    // Generate trip-specific verification codes
    const tripCode = `TRP-${currentTrip.id}-${Date.now().toString().slice(-6)}`;
    const driverCode = `DRV-${currentTrip.id}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
    
    // Store codes in localStorage for this trip
    const verificationData = {
        tripId: currentTrip.id,
        tripCode: tripCode,
        driverCode: driverCode,
        generatedAt: new Date().toISOString(),
        status: 'active'
    };
    
    localStorage.setItem(`verification_${currentTrip.id}`, JSON.stringify(verificationData));
    
    // Update display - wait for QRCode library if needed
    waitForQRCodeLibrary(() => {
        updateVerificationCodes(tripCode, driverCode);
    });
}

// Helper function to wait for QRCode library to load
function waitForQRCodeLibrary(callback, maxAttempts = 10, attempt = 0) {
    if (typeof QRCode !== 'undefined') {
        callback();
    } else if (attempt < maxAttempts) {
        setTimeout(() => {
            waitForQRCodeLibrary(callback, maxAttempts, attempt + 1);
        }, 100);
    } else {
        console.warn('QRCode library not loaded after waiting. Proceeding without QR codes.');
        // Still update codes, but QR generation will be skipped
        const tripCodeElement = document.getElementById('tripVerificationCode');
        const driverCodeElement = document.getElementById('driverVerificationCode');
        if (tripCodeElement && driverCodeElement) {
            const storedData = localStorage.getItem(`verification_${currentTrip.id}`);
            if (storedData) {
                const data = JSON.parse(storedData);
                tripCodeElement.textContent = data.tripCode;
                driverCodeElement.textContent = data.driverCode;
            }
        }
    }
}

function updateVerificationCodes(tripCode, driverCode) {
    // Update trip verification code
    const tripCodeElement = document.getElementById('tripVerificationCode');
    if (tripCodeElement) {
        tripCodeElement.textContent = tripCode;
    }
    
    // Update driver verification code
    const driverCodeElement = document.getElementById('driverVerificationCode');
    if (driverCodeElement) {
        driverCodeElement.textContent = driverCode;
    }
    
    // Generate QR codes
    generateTripQR(tripCode);
    generateDriverQR(driverCode);
}

function generateTripQR(code) {
    const qrDisplay = document.getElementById('tripQRCode');
    if (!qrDisplay) return;
    
    // Clear previous QR code
    qrDisplay.innerHTML = '';
    
    // Check if QRCode library is available
    if (typeof QRCode === 'undefined') {
        console.warn('QRCode library not loaded. QR code generation skipped.');
        qrDisplay.innerHTML = '<p style="color: #6c757d; font-style: italic;">QR code library not available</p>';
        return;
    }
    
    // Generate QR code
    QRCode.toCanvas(qrDisplay, code, {
        width: 200,
        height: 200,
        color: {
            dark: '#01386A',
            light: '#FFFFFF'
        }
    }, function(error) {
        if (error) {
            console.error('Trip QR Code generation error:', error);
            showErrorMessage('Failed to generate trip QR code');
        } else {
            showSuccessMessage('Trip QR code generated');
        }
    });
}

function generateDriverQR(code) {
    const qrDisplay = document.getElementById('driverQRCode');
    if (!qrDisplay) return;
    
    // Clear previous QR code
    qrDisplay.innerHTML = '';
    
    // Check if QRCode library is available
    if (typeof QRCode === 'undefined') {
        console.warn('QRCode library not loaded. QR code generation skipped.');
        qrDisplay.innerHTML = '<p style="color: #6c757d; font-style: italic;">QR code library not available</p>';
        return;
    }
    
    // Generate QR code
    QRCode.toCanvas(qrDisplay, code, {
        width: 200,
        height: 200,
        color: {
            dark: '#01386A',
            light: '#FFFFFF'
        }
    }, function(error) {
        if (error) {
            console.error('Driver QR Code generation error:', error);
            showErrorMessage('Failed to generate driver QR code');
        } else {
            showSuccessMessage('Driver QR code generated');
        }
    });
}

function clearVerificationCodes() {
    // Clear all verification codes from display
    const tripCodeElement = document.getElementById('tripVerificationCode');
    const driverCodeElement = document.getElementById('driverVerificationCode');
    const tripQRDisplay = document.getElementById('tripQRCode');
    const driverQRDisplay = document.getElementById('driverQRCode');
    
    if (tripCodeElement) tripCodeElement.textContent = 'No Active Trip';
    if (driverCodeElement) driverCodeElement.textContent = 'No Active Trip';
    if (tripQRDisplay) tripQRDisplay.innerHTML = '<div class="no-code-message"><i class="fas fa-exclamation-circle"></i><br>No active trip</div>';
    if (driverQRDisplay) driverQRDisplay.innerHTML = '<div class="no-code-message"><i class="fas fa-exclamation-circle"></i><br>No active trip</div>';
    
    // Clear trip info with better styling
    const tripInfoElement = document.getElementById('tripInfo');
    if (tripInfoElement) {
        tripInfoElement.innerHTML = `
            <div class="no-trip-message">
                <i class="fas fa-exclamation-triangle" style="font-size: 2rem; margin-bottom: 1rem;"></i>
                <h3>No Active Trip</h3>
                <p>Please start a trip to access verification codes</p>
            </div>
        `;
    }
    
    // Remove verification data from localStorage
    if (currentTrip) {
        localStorage.removeItem(`verification_${currentTrip.id}`);
    }
}

function showSuccessMessage(message) {
    const notification = document.createElement('div');
    notification.className = 'notification success';
    notification.innerHTML = `
        <i class="fas fa-check-circle"></i>
        <span>${message}</span>
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
        }
    }, 3000);
}

function showErrorMessage(message) {
    const notification = document.createElement('div');
    notification.className = 'notification error';
    notification.innerHTML = `
        <i class="fas fa-exclamation-circle"></i>
        <span>${message}</span>
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
        }
    }, 5000);
}

// Clean up when page is unloaded
window.addEventListener('beforeunload', function() {
    stopScanning();
});

// Function to clear verification codes when trip is completed
function clearTripVerificationCodes(tripId) {
    if (tripId) {
        localStorage.removeItem(`verification_${tripId}`);
    }
    
    // Clear all verification codes from display
    const tripCodeElement = document.getElementById('tripVerificationCode');
    const driverCodeElement = document.getElementById('driverVerificationCode');
    const tripQRDisplay = document.getElementById('tripQRCode');
    const driverQRDisplay = document.getElementById('driverQRCode');
    
    if (tripCodeElement) tripCodeElement.textContent = 'No Active Trip';
    if (driverCodeElement) driverCodeElement.textContent = 'No Active Trip';
    if (tripQRDisplay) tripQRDisplay.innerHTML = '<p class="no-code-message">No active trip</p>';
    if (driverQRDisplay) driverQRDisplay.innerHTML = '<p class="no-code-message">No active trip</p>';
}

// Function to check if trip is still active and refresh codes if needed
function refreshVerificationCodes() {
    if (currentTrip) {
        // Check if trip is still active
        const trips = JSON.parse(localStorage.getItem('driverTrips') || '[]');
        const updatedTrip = trips.find(trip => trip.id === currentTrip.id);
        
        if (!updatedTrip || updatedTrip.status !== 'active') {
            showErrorMessage('Trip is no longer active. Verification codes have been cleared.');
            clearVerificationCodes();
            currentTrip = null;
        }
    } else {
        clearVerificationCodes();
    }
}

// Backward compatibility wrapper for verifyCode
function verifyCode(type, code) {
    // Legacy function - now redirects to unified verification
    if (code) {
        verifyUnifiedCode(code);
    } else {
        verifyUnifiedCode();
    }
}

// Export functions for global access
window.startQRScan = startQRScan;
window.verifyCode = verifyCode;
window.verifyUnifiedCode = verifyUnifiedCode;
window.generateQRCode = generateDriverQR;
window.stopScanning = stopScanning;
window.clearTripVerificationCodes = clearTripVerificationCodes;
window.refreshVerificationCodes = refreshVerificationCodes;
