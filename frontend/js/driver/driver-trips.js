// Driver Trips JavaScript

let allTrips = [];
let filteredTrips = [];

document.addEventListener('DOMContentLoaded', function() {
    // Check driver authentication
    checkDriverAuthentication();
    
    // Load trips data
    loadTrips();
    
    // Set up search functionality
    setupSearch();
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

function loadTrips() {
    // Load trips from localStorage (in real app, this would be from API)
    allTrips = JSON.parse(localStorage.getItem('driverTrips') || '[]');
    
    // If no trips, create some sample data
    if (allTrips.length === 0) {
        allTrips = generateSampleTrips();
        localStorage.setItem('driverTrips', JSON.stringify(allTrips));
    }
    
    // Add the current active trip to the list if it exists
    const currentTrip = localStorage.getItem('currentDriverTrip');
    if (currentTrip) {
        const activeTrip = JSON.parse(currentTrip);
        // Check if it's already in the list
        const existingTrip = allTrips.find(trip => trip.id === activeTrip.id);
        if (!existingTrip) {
            allTrips.unshift(activeTrip);
            localStorage.setItem('driverTrips', JSON.stringify(allTrips));
        }
    }
    
    filteredTrips = [...allTrips];
    displayTrips();
}

function generateSampleTrips() {
    const statuses = ['pending', 'completed', 'cancelled'];
    const locations = [
        'Sandton City', 'Rosebank Mall', 'Fourways Mall', 'Eastgate Mall',
        'Mall of Africa', 'Cresta Shopping Centre', 'Hyde Park Corner',
        'OR Tambo Airport', 'Lanseria Airport', 'Sandton CBD'
    ];
    
    const trips = Array.from({ length: 8 }, (_, i) => ({
        id: `TRP-${String(i + 1).padStart(4, '0')}`,
        status: statuses[Math.floor(Math.random() * statuses.length)],
        pickupLocation: locations[Math.floor(Math.random() * locations.length)],
        dropoffLocation: locations[Math.floor(Math.random() * locations.length)],
        scheduledAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
        completedAt: Math.random() > 0.5 ? new Date(Date.now() - Math.random() * 3 * 24 * 60 * 60 * 1000).toISOString() : null,
        passengerCount: Math.floor(Math.random() * 4) + 1,
        passengerName: `Passenger ${i + 1}`,
        phoneNumber: `+27${Math.floor(Math.random() * 900000000) + 100000000}`,
        specialInstructions: Math.random() > 0.7 ? 'Please call when arriving' : null,
        vehicleType: ['Sedan', 'SUV', 'Van'][Math.floor(Math.random() * 3)],
        estimatedDuration: Math.floor(Math.random() * 60) + 15,
        distance: (Math.random() * 50 + 5).toFixed(1)
    }));
    
    // Add one pending trip for navigation
    trips.push({
        id: 'TRP-0009',
        status: 'pending',
        pickupLocation: 'Fourways Mall',
        dropoffLocation: 'OR Tambo Airport',
        scheduledAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // 30 minutes from now
        completedAt: null,
        passengerCount: 1,
        passengerName: 'Sarah Johnson',
        phoneNumber: '+27987654321',
        specialInstructions: 'Flight departure at 2:30 PM',
        vehicleType: 'Sedan',
        estimatedDuration: 45,
        distance: '28.3'
    });
    
    // Add exactly one active trip
    trips.push({
        id: 'TRP-0010',
        status: 'active',
        pickupLocation: 'Sandton City',
        dropoffLocation: 'Rosebank Mall',
        scheduledAt: new Date().toISOString(),
        completedAt: null,
        passengerCount: 2,
        passengerName: 'John Smith',
        phoneNumber: '+27123456789',
        specialInstructions: 'Please call when arriving',
        vehicleType: 'Sedan',
        estimatedDuration: 25,
        distance: '12.5',
        acceptedAt: new Date(Date.now() - 30 * 60 * 1000).toISOString() // 30 minutes ago
    });
    
    return trips;
}

function displayTrips() {
    const tripsList = document.getElementById('tripsList');
    const noTripsMessage = document.getElementById('noTripsMessage');
    
    if (!tripsList) return;
    
    if (filteredTrips.length === 0) {
        tripsList.style.display = 'none';
        if (noTripsMessage) noTripsMessage.style.display = 'block';
        return;
    }
    
    tripsList.style.display = 'block';
    if (noTripsMessage) noTripsMessage.style.display = 'none';
    
    tripsList.innerHTML = filteredTrips.map(trip => createTripCard(trip)).join('');
}

function createTripCard(trip) {
    const statusClass = trip.status;
    const statusText = trip.status.charAt(0).toUpperCase() + trip.status.slice(1);
    
    const scheduledDate = new Date(trip.scheduledAt).toLocaleDateString();
    const scheduledTime = new Date(trip.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    const completedDate = trip.completedAt ? new Date(trip.completedAt).toLocaleDateString() : '';
    const completedTime = trip.completedAt ? new Date(trip.completedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
    
    return `
        <div class="trip-card ${statusClass} ${trip.status === 'active' ? 'active-trip' : ''}">
            <div class="trip-header">
                <div class="trip-id">Trip #${trip.id} ${trip.status === 'active' ? '<span class="active-indicator">●</span>' : ''}</div>
                <div class="trip-status ${statusClass}">${statusText}</div>
            </div>
            
            <div class="trip-details">
                <div class="trip-detail">
                    <i class="fas fa-map-marker-alt"></i>
                    <span><strong>From:</strong> ${trip.pickupLocation}</span>
                </div>
                <div class="trip-detail">
                    <i class="fas fa-flag-checkered"></i>
                    <span><strong>To:</strong> ${trip.dropoffLocation}</span>
                </div>
                <div class="trip-detail">
                    <i class="fas fa-clock"></i>
                    <span><strong>Scheduled:</strong> ${scheduledDate} at ${scheduledTime}</span>
                </div>
                ${trip.completedAt ? `
                <div class="trip-detail">
                    <i class="fas fa-check-circle"></i>
                    <span><strong>Completed:</strong> ${completedDate} at ${completedTime}</span>
                </div>
                ` : ''}
                <div class="trip-detail">
                    <i class="fas fa-users"></i>
                    <span><strong>Passengers:</strong> ${trip.passengerCount}</span>
                </div>
                <div class="trip-detail">
                    <i class="fas fa-car"></i>
                    <span><strong>Vehicle:</strong> ${trip.vehicleType}</span>
                </div>
                <div class="trip-detail">
                    <i class="fas fa-route"></i>
                    <span><strong>Distance:</strong> ${trip.distance} km</span>
                </div>
                <div class="trip-detail">
                    <i class="fas fa-hourglass-half"></i>
                    <span><strong>Duration:</strong> ${trip.estimatedDuration} min</span>
                </div>
            </div>
            
            <div class="trip-actions">
                ${getTripActions(trip)}
            </div>
        </div>
    `;
}

function getTripActions(trip) {
    const actions = [];
    
    switch (trip.status) {
        case 'pending':
            actions.push(`
                <button class="btn btn-primary" onclick="startNavigation('${trip.id}')">
                    <i class="fas fa-directions"></i>
                    Navigate
                </button>
            `);
            break;
            
        case 'active':
            actions.push(`
                <button class="btn btn-primary" onclick="startNavigation('${trip.id}')">
                    <i class="fas fa-directions"></i>
                    Navigate
                </button>
            `);
            actions.push(`
                <button class="btn btn-warning" onclick="startVerification('${trip.id}')">
                    <i class="fas fa-qrcode"></i>
                    Verify
                </button>
            `);
            actions.push(`
                <button class="btn btn-success" onclick="completeTrip('${trip.id}')">
                    <i class="fas fa-flag-checkered"></i>
                    Complete
                </button>
            `);
            break;
            
        case 'completed':
            actions.push(`
                <button class="btn btn-secondary" onclick="viewTripDetails('${trip.id}')">
                    <i class="fas fa-eye"></i>
                    View Details
                </button>
            `);
            break;
            
        case 'cancelled':
            actions.push(`
                <button class="btn btn-secondary" onclick="viewTripDetails('${trip.id}')">
                    <i class="fas fa-eye"></i>
                    View Details
                </button>
            `);
            break;
    }
    
    return actions.join('');
}

function setupSearch() {
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', function(e) {
            searchTrips(e.target.value);
        });
    }
}

function searchTrips(query) {
    if (!query.trim()) {
        filteredTrips = [...allTrips];
    } else {
        const searchTerm = query.toLowerCase();
        filteredTrips = allTrips.filter(trip => 
            trip.id.toLowerCase().includes(searchTerm) ||
            trip.pickupLocation.toLowerCase().includes(searchTerm) ||
            trip.dropoffLocation.toLowerCase().includes(searchTerm) ||
            trip.passengerName.toLowerCase().includes(searchTerm) ||
            trip.status.toLowerCase().includes(searchTerm)
        );
    }
    
    displayTrips();
}

function filterTripsByStatus(status) {
    if (status === 'all') {
        filteredTrips = [...allTrips];
    } else {
        filteredTrips = allTrips.filter(trip => trip.status === status);
    }
    
    displayTrips();
}

// Trip action functions

function startNavigation(tripId) {
    // Redirect to navigation page
    window.location.href = `driver-navigation.html?trip=${tripId}`;
}

function startVerification(tripId) {
    // Redirect to verification page
    window.location.href = `driver-verification.html?trip=${tripId}`;
}

function completeTrip(tripId) {
    const trip = allTrips.find(t => t.id === tripId);
    if (trip) {
        trip.status = 'completed';
        trip.completedAt = new Date().toISOString();
        localStorage.setItem('driverTrips', JSON.stringify(allTrips));
        
        // Remove from current trip
        localStorage.removeItem('currentDriverTrip');
        
        // Clear verification codes for this trip
        if (window.clearTripVerificationCodes) {
            window.clearTripVerificationCodes(tripId);
        }
        
        // Add to recent trips
        const recentTrips = JSON.parse(localStorage.getItem('recentDriverTrips') || '[]');
        recentTrips.unshift(trip);
        if (recentTrips.length > 5) recentTrips.pop();
        localStorage.setItem('recentDriverTrips', JSON.stringify(recentTrips));
        
        // Update trip count
        const currentTrips = parseInt(localStorage.getItem('driverTotalTrips') || '0');
        localStorage.setItem('driverTotalTrips', (currentTrips + 1).toString());
        
        showSuccessMessage('Trip completed successfully! Verification codes cleared.');
        loadTrips();
    }
}

function viewTripDetails(tripId) {
    const trip = allTrips.find(t => t.id === tripId);
    if (trip) {
        // Show trip details modal or redirect to details page
        showTripDetailsModal(trip);
    }
}

function showTripDetailsModal(trip) {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>Trip Details - ${trip.id}</h3>
                <span class="close" onclick="closeModal(this)">&times;</span>
            </div>
            <div class="modal-body">
                <div class="trip-details">
                    <div class="trip-detail">
                        <strong>Status:</strong> ${trip.status}
                    </div>
                    <div class="trip-detail">
                        <strong>From:</strong> ${trip.pickupLocation}
                    </div>
                    <div class="trip-detail">
                        <strong>To:</strong> ${trip.dropoffLocation}
                    </div>
                    <div class="trip-detail">
                        <strong>Passenger:</strong> ${trip.passengerName}
                    </div>
                    <div class="trip-detail">
                        <strong>Phone:</strong> ${trip.phoneNumber}
                    </div>
                    <div class="trip-detail">
                        <strong>Distance:</strong> ${trip.distance} km
                    </div>
                    <div class="trip-detail">
                        <strong>Duration:</strong> ${trip.estimatedDuration} min
                    </div>
                    ${trip.specialInstructions ? `
                    <div class="trip-detail">
                        <strong>Special Instructions:</strong> ${trip.specialInstructions}
                    </div>
                    ` : ''}
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
}

function closeModal(button) {
    const modal = button.closest('.modal');
    if (modal) {
        modal.remove();
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
window.searchTrips = searchTrips;
window.filterTripsByStatus = filterTripsByStatus;
window.startNavigation = startNavigation;
window.startVerification = startVerification;
window.completeTrip = completeTrip;
window.closeModal = closeModal;
