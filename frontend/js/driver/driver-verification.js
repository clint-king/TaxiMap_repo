// Driver Verification JavaScript

let currentStream = null;
let scanningInterval = null;
let currentTrip = null;

document.addEventListener('DOMContentLoaded', function() {
    // Check driver authentication
    checkDriverAuthentication();
    
    // Load current trip
    loadCurrentTrip();
    
    // Set up periodic refresh of verification codes
    setInterval(refreshVerificationCodes, 30000); // Check every 30 seconds
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
    // Get trip ID from URL parameters
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

function startQRScan(type) {
    const scannerId = type === 'passenger' ? 'passengerScanner' : 'packageScanner';
    const videoId = type === 'passenger' ? 'passengerVideo' : 'packageVideo';
    const canvasId = type === 'passenger' ? 'passengerCanvas' : 'packageCanvas';
    const placeholderId = type === 'passenger' ? 'scannerPlaceholder' : 'packageScannerPlaceholder';
    
    const scanner = document.getElementById(scannerId);
    const video = document.getElementById(videoId);
    const canvas = document.getElementById(canvasId);
    const placeholder = document.getElementById(placeholderId);
    
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
        startQRCodeDetection(video, canvas, type);
    })
    .catch(function(error) {
        console.error('Error accessing camera:', error);
        showErrorMessage('Unable to access camera. Please check permissions.');
        stopScanning();
    });
}

function startQRCodeDetection(video, canvas, type) {
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
                handleQRCodeDetected(code.data, type);
            }
        }
    }, 100);
}

function handleQRCodeDetected(data, type) {
    stopScanning();
    
    // Parse QR code data (assuming it contains verification code)
    const verificationCode = data;
    
    if (type === 'passenger') {
        verifyPassengerCode(verificationCode);
    } else if (type === 'package') {
        verifyReceiverCode(verificationCode);
    }
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

function verifyCode(type, code) {
    if (type === 'passenger') {
        verifyPassengerCode(code);
    } else if (type === 'package') {
        verifyReceiverCode(code);
    }
}

function verifyPassengerCode(code) {
    const resultDiv = document.getElementById('passengerResult');
    if (!resultDiv) return;
    
    // Simulate verification (in real app, this would call an API)
    const isValid = simulateVerification(code, 'passenger');
    
    if (isValid) {
        resultDiv.className = 'verification-result success';
        resultDiv.innerHTML = `
            <i class="fas fa-check-circle"></i>
            <span>Passenger verified successfully!</span>
        `;
        resultDiv.style.display = 'block';
        
        // Update trip status
        updateTripVerification('passenger', true);
        
        showSuccessMessage('Passenger verification successful!');
    } else {
        resultDiv.className = 'verification-result error';
        resultDiv.innerHTML = `
            <i class="fas fa-times-circle"></i>
            <span>Invalid verification code. Please try again.</span>
        `;
        resultDiv.style.display = 'block';
        
        showErrorMessage('Verification failed. Please check the code and try again.');
    }
}

function verifyReceiverCode(code) {
    const resultDiv = document.getElementById('packageResult');
    if (!resultDiv) return;
    
    // Simulate verification (in real app, this would call an API)
    const isValid = simulateVerification(code, 'receiver');
    
    if (isValid) {
        resultDiv.className = 'verification-result success';
        resultDiv.innerHTML = `
            <i class="fas fa-check-circle"></i>
            <span>Receiver verified successfully!</span>
        `;
        resultDiv.style.display = 'block';
        
        // Update trip status
        updateTripVerification('receiver', true);
        
        showSuccessMessage('Receiver verification successful!');
    } else {
        resultDiv.className = 'verification-result error';
        resultDiv.innerHTML = `
            <i class="fas fa-times-circle"></i>
            <span>Invalid verification code. Please try again.</span>
        `;
        resultDiv.style.display = 'block';
        
        showErrorMessage('Verification failed. Please check the code and try again.');
    }
}

function simulateVerification(code, type) {
    // Simulate verification logic
    // In a real app, this would make an API call to verify the code
    
    // For demo purposes, accept codes that start with 'PASS' for passengers
    // and 'RECV' for receivers
    if (type === 'passenger') {
        return code.startsWith('PASS') || code.length >= 6;
    } else if (type === 'receiver') {
        return code.startsWith('RECV') || code.length >= 6;
    }
    
    return false;
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

function updateTripInfo() {
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
    const tripData = {
        id: currentTrip.id || 'TRP-0001',
        pickupLocation: currentTrip.pickupLocation || 'Sandton City Mall',
        dropoffLocation: currentTrip.dropoffLocation || 'Rosebank Mall',
        passengerName: currentTrip.passengerName || 'John Smith',
        phoneNumber: currentTrip.phoneNumber || '+27123456789',
        vehicleType: currentTrip.vehicleType || 'Sedan',
        estimatedDuration: currentTrip.estimatedDuration || '25 min',
        distance: currentTrip.distance || '12.5 km',
        scheduledAt: currentTrip.scheduledAt || new Date().toISOString(),
        status: currentTrip.status || 'active'
    };
    
    // Format scheduled time
    const scheduledTime = new Date(tripData.scheduledAt).toLocaleTimeString([], { 
        hour: '2-digit', 
        minute: '2-digit' 
    });
    
    // Update trip info display
    const tripInfoElement = document.getElementById('tripInfo');
    if (tripInfoElement) {
        tripInfoElement.innerHTML = `
            <div class="trip-info-card">
                <h4><i class="fas fa-route"></i> Trip #${tripData.id}</h4>
                
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
                        <span class="trip-info-label">Passenger</span>
                        <span class="trip-info-value">${tripData.passengerName}</span>
                    </div>
                    
                    <div class="trip-info-item">
                        <span class="trip-info-label">Phone</span>
                        <span class="trip-info-value">${tripData.phoneNumber}</span>
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
                        <span class="trip-info-value">${scheduledTime}</span>
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
    
    // Update display
    updateVerificationCodes(tripCode, driverCode);
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

// Export functions for global access
window.startQRScan = startQRScan;
window.verifyCode = verifyCode;
window.generateQRCode = generateDriverQR;
window.stopScanning = stopScanning;
window.clearTripVerificationCodes = clearTripVerificationCodes;
window.refreshVerificationCodes = refreshVerificationCodes;
