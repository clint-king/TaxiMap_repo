// Driver Navigation JavaScript

let map;
let directionsService;
let directionsRenderer;
let currentTrip = null;
let trafficLayer = null;
let isSatelliteView = false;

document.addEventListener('DOMContentLoaded', function() {
    // Check driver authentication
    checkDriverAuthentication();
    
    // Initialize map
    initMap();
    
    // Load current trip
    loadCurrentTrip();
    
    // Set up real-time location tracking
    setupLocationTracking();
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

function initMap() {
    // Initialize Google Maps
    directionsService = new google.maps.DirectionsService();
    directionsRenderer = new google.maps.DirectionsRenderer({
        draggable: true,
        suppressMarkers: false
    });
    
    // Create map centered on Johannesburg
    map = new google.maps.Map(document.getElementById('map'), {
        zoom: 12,
        center: { lat: -26.2041, lng: 28.0473 }, // Johannesburg
        mapTypeId: google.maps.MapTypeId.ROADMAP
    });
    
    directionsRenderer.setMap(map);
    
    // Initialize traffic layer
    trafficLayer = new google.maps.TrafficLayer();
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
        // Clear any old trip data and create new multi-stop trip
        localStorage.removeItem('currentDriverTrip');
        
        // Create fake multi-stop trip for testing navigation
        currentTrip = {
            id: 'TRP-0001',
            status: 'active',
            vehicleType: 'Taxi (14 seats)',
            totalDistance: '45.2 km',
            estimatedDuration: '2h 15min',
            stops: [
                {
                    type: 'pickup',
                    category: 'human',
                    location: 'Sandton City Mall, Sandton',
                    passengerName: 'John Smith',
                    phoneNumber: '+27123456789',
                    seatNumber: 1,
                    specialInstructions: 'Please call when arriving'
                },
                {
                    type: 'pickup',
                    category: 'package',
                    location: 'Fourways Mall, Fourways',
                    packageId: 'PKG-001',
                    weight: '2.5kg',
                    isFragile: true,
                    specialInstructions: 'Handle with care'
                },
                {
                    type: 'pickup',
                    category: 'human',
                    location: 'Eastgate Mall, Bedfordview',
                    passengerName: 'Sarah Johnson',
                    phoneNumber: '+27987654321',
                    seatNumber: 2,
                    specialInstructions: 'Wheelchair accessible'
                },
                {
                    type: 'pickup',
                    category: 'package',
                    location: 'Mall of Africa, Midrand',
                    packageId: 'PKG-002',
                    weight: '5.2kg',
                    isFragile: false,
                    specialInstructions: 'Standard delivery'
                },
                {
                    type: 'pickup',
                    category: 'human',
                    location: 'Hyde Park Corner, Sandton',
                    passengerName: 'Mike Wilson',
                    phoneNumber: '+27111222333',
                    seatNumber: 3,
                    specialInstructions: 'Business district pickup'
                },
                {
                    type: 'dropoff',
                    category: 'human',
                    location: 'Rosebank Mall, Rosebank',
                    passengerName: 'John Smith',
                    seatNumber: 1,
                    specialInstructions: 'Main entrance'
                },
                {
                    type: 'dropoff',
                    category: 'package',
                    location: 'Cresta Shopping Centre, Randburg',
                    packageId: 'PKG-001',
                    receiverName: 'Lisa Brown',
                    specialInstructions: 'Security desk'
                },
                {
                    type: 'dropoff',
                    category: 'human',
                    location: 'OR Tambo Airport, Kempton Park',
                    passengerName: 'Sarah Johnson',
                    seatNumber: 2,
                    specialInstructions: 'Terminal A, Departures'
                },
                {
                    type: 'dropoff',
                    category: 'package',
                    location: 'Lanseria Airport, Lanseria',
                    packageId: 'PKG-002',
                    receiverName: 'David Lee',
                    specialInstructions: 'Cargo terminal'
                },
                {
                    type: 'dropoff',
                    category: 'human',
                    location: 'Sandton CBD, Sandton',
                    passengerName: 'Mike Wilson',
                    seatNumber: 3,
                    specialInstructions: 'Standard Bank building'
                }
            ]
        };
        localStorage.setItem('currentDriverTrip', JSON.stringify(currentTrip));
    }
    
    if (currentTrip) {
        displayTrip(currentTrip);
        calculateRoute();
    } else {
        showNoTripMessage();
    }
}

function displayTrip(trip) {
    const navigationInfo = document.getElementById('navigationInfo');
    if (!navigationInfo) return;
    
    // Calculate capacity usage
    const humanPassengers = trip.stops.filter(stop => stop.type === 'pickup' && stop.category === 'human').length;
    const packages = trip.stops.filter(stop => stop.type === 'pickup' && stop.category === 'package').length;
    const totalCapacity = 14;
    const availableSeats = totalCapacity - humanPassengers;
    
    // Generate route steps
    let routeStepsHTML = '';
    trip.stops.forEach((stop, index) => {
        const stepNumber = index + 1;
        const isCurrent = index === 0; // First stop is current
        const isCompleted = false; // For now, no completed steps
        
        const icon = stop.category === 'package' ? 'fas fa-box' : 'fas fa-user';
        const typeLabel = stop.category === 'package' ? 'PACKAGE' : 'PASSENGER';
        const actionType = stop.type === 'pickup' ? 'pickup' : 'dropoff';
        
        let details = '';
        if (stop.category === 'human') {
            details = `Passenger: ${stop.passengerName} | Seat: ${stop.seatNumber}`;
            if (stop.phoneNumber) details += ` | Phone: ${stop.phoneNumber}`;
        } else {
            details = `Package ID: ${stop.packageId} | Weight: ${stop.weight}`;
            if (stop.receiverName) details += ` | Receiver: ${stop.receiverName}`;
        }
        
        if (stop.specialInstructions) {
            details += ` | Note: ${stop.specialInstructions}`;
        }
        
        routeStepsHTML += `
            <div class="route-step ${isCurrent ? 'current' : ''} ${isCompleted ? 'completed' : ''} ${actionType}-${stop.category}">
                <div class="step-number">${stepNumber}</div>
                <div class="step-info">
                    <div class="step-title">
                        <i class="step-icon ${stop.category} ${icon}"></i>
                        ${stop.type === 'pickup' ? 'Pickup' : 'Dropoff'}: ${stop.location}
                        <span class="step-type-badge ${stop.category}">${typeLabel}</span>
                    </div>
                    <div class="step-details">${details}</div>
                    <div class="step-time">ETA: ${Math.floor(Math.random() * 30) + 10} min</div>
                </div>
                <div class="step-actions">
                    <button class="action-btn ${isCurrent ? 'success' : 'primary'}" onclick="${isCurrent ? 'markStepComplete(' + stepNumber + ')' : 'navigateToStep(' + stepNumber + ')'}">
                        <i class="fas fa-${isCurrent ? 'check' : 'directions'}"></i>
                    </button>
                </div>
            </div>
        `;
    });
    
    navigationInfo.innerHTML = `
        <div class="trip-summary">
            <div class="trip-id">Trip #${trip.id}</div>
            <div class="trip-status active">In Progress</div>
        </div>
        
        <div class="trip-info">
            <div class="trip-details">
                <div class="detail-item">
                    <i class="fas fa-bus"></i>
                    <span>Vehicle: ${trip.vehicleType}</span>
                </div>
                <div class="detail-item">
                    <i class="fas fa-users"></i>
                    <span>Passengers: ${humanPassengers}/${totalCapacity}</span>
                </div>
                <div class="detail-item">
                    <i class="fas fa-box"></i>
                    <span>Packages: ${packages}</span>
                </div>
                <div class="detail-item">
                    <i class="fas fa-route"></i>
                    <span>Distance: ${trip.totalDistance}</span>
                </div>
                <div class="detail-item">
                    <i class="fas fa-clock"></i>
                    <span>Duration: ${trip.estimatedDuration}</span>
                </div>
            </div>
        </div>
        
        <div class="route-steps" id="routeSteps">
            ${routeStepsHTML}
        </div>
    `;
}


function calculateRoute() {
    if (!currentTrip || !directionsService || !directionsRenderer) return;
    
    const request = {
        origin: currentTrip.pickupLocation,
        destination: currentTrip.dropoffLocation,
        travelMode: google.maps.TravelMode.DRIVING,
        avoidHighways: false,
        avoidTolls: false
    };
    
    directionsService.route(request, function(result, status) {
        if (status === 'OK') {
            directionsRenderer.setDirections(result);
            
            // Update trip with actual route information
            const route = result.routes[0];
            const leg = route.legs[0];
            
            currentTrip.actualDistance = leg.distance.text;
            currentTrip.actualDuration = leg.duration.text;
            
            // Update display
            updateRouteInfo(leg);
        } else {
            console.error('Directions request failed:', status);
            showErrorMessage('Failed to calculate route. Please try again.');
        }
    });
}

function updateRouteInfo(leg) {
    const routeSteps = document.getElementById('routeSteps');
    if (!routeSteps) return;
    
    // Update step information with actual route data
    const steps = routeSteps.querySelectorAll('.route-step');
    if (steps.length >= 2) {
        const pickupStep = steps[0];
        const dropoffStep = steps[1];
        
        // Update pickup step
        const pickupTime = pickupStep.querySelector('.step-time');
        if (pickupTime) {
            pickupTime.textContent = `ETA: ${leg.duration.text}`;
        }
        
        // Update dropoff step
        const dropoffDetails = dropoffStep.querySelector('.step-details');
        const dropoffTime = dropoffStep.querySelector('.step-time');
        
        if (dropoffDetails) {
            dropoffDetails.textContent = `Distance: ${leg.distance.text}`;
        }
        if (dropoffTime) {
            dropoffTime.textContent = `ETA: ${leg.duration.text}`;
        }
    }
}

function showNoTripMessage() {
    const noTripOverlay = document.getElementById('noTripOverlay');
    if (noTripOverlay) {
        noTripOverlay.style.display = 'block';
    }
}

function markStepComplete(stepNumber) {
    const steps = document.querySelectorAll('.route-step');
    if (steps[stepNumber - 1]) {
        const step = steps[stepNumber - 1];
        step.classList.add('completed');
        step.classList.remove('current');
        
        // Update step number styling
        const stepNumberEl = step.querySelector('.step-number');
        if (stepNumberEl) {
            stepNumberEl.classList.add('completed');
        }
        
        // Move to next step
        if (steps[stepNumber]) {
            steps[stepNumber].classList.add('current');
            steps[stepNumber].classList.remove('completed');
        }
        
        showSuccessMessage(`Step ${stepNumber} completed!`);
    }
}

function navigateToStep(stepNumber) {
    const steps = document.querySelectorAll('.route-step');
    if (steps[stepNumber - 1]) {
        // Update current step
        steps.forEach(step => {
            step.classList.remove('current');
        });
        steps[stepNumber - 1].classList.add('current');
        
        showSuccessMessage(`Navigating to step ${stepNumber}`);
    }
}

function setupLocationTracking() {
    if (navigator.geolocation) {
        navigator.geolocation.watchPosition(
            function(position) {
                updateDriverLocation(position);
            },
            function(error) {
                console.error('Geolocation error:', error);
            },
            {
                enableHighAccuracy: true,
                timeout: 5000,
                maximumAge: 0
            }
        );
    }
}

function updateDriverLocation(position) {
    const driverLocation = {
        lat: position.coords.latitude,
        lng: position.coords.longitude
    };
    
    // Update map center if needed
    if (map) {
        map.setCenter(driverLocation);
    }
    
    // Store driver location for real-time updates
    localStorage.setItem('driverLocation', JSON.stringify(driverLocation));
}

// Map control functions
function centerMapOnLocation() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(function(position) {
            const location = {
                lat: position.coords.latitude,
                lng: position.coords.longitude
            };
            map.setCenter(location);
            map.setZoom(15);
        });
    }
}

function toggleTrafficLayer() {
    const trafficBtn = document.getElementById('trafficBtn');
    
    if (trafficLayer.getMap()) {
        trafficLayer.setMap(null);
        trafficBtn.classList.remove('active');
    } else {
        trafficLayer.setMap(map);
        trafficBtn.classList.add('active');
    }
}

function toggleSatelliteView() {
    const satelliteBtn = document.getElementById('satelliteBtn');
    
    if (isSatelliteView) {
        map.setMapTypeId(google.maps.MapTypeId.ROADMAP);
        isSatelliteView = false;
        satelliteBtn.classList.remove('active');
    } else {
        map.setMapTypeId(google.maps.MapTypeId.SATELLITE);
        isSatelliteView = true;
        satelliteBtn.classList.add('active');
    }
}

function refreshCurrentRoute() {
    if (currentTrip) {
        calculateRoute();
        showSuccessMessage('Route refreshed');
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

// Export functions for global access
window.centerMapOnLocation = centerMapOnLocation;
window.toggleTrafficLayer = toggleTrafficLayer;
window.toggleSatelliteView = toggleSatelliteView;
window.refreshCurrentRoute = refreshCurrentRoute;
