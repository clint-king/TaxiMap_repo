// Driver Dashboard JavaScript

document.addEventListener('DOMContentLoaded', function() {
    // Check if user is logged in and is a driver
    checkDriverAuthentication();
    
    // Load driver data
    loadDriverData();
    
    // Load current trip if any
    loadCurrentTrip();
    
    // Load recent trips
    loadRecentTrips();
    
    // Set up real-time updates
    setupRealTimeUpdates();
});

function checkDriverAuthentication() {
    const userProfile = localStorage.getItem('userProfile');
    
    if (!userProfile) {
        // Redirect to login if not authenticated
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
    
    // Update driver name
    const driverNameElement = document.getElementById('driverName');
    if (driverNameElement) {
        driverNameElement.textContent = user.firstName || user.name || 'Driver';
    }
}

function loadDriverData() {
    // Load driver statistics
    const stats = {
        totalTrips: localStorage.getItem('driverTotalTrips') || 0,
        hoursWorked: localStorage.getItem('driverHoursWorked') || '0h',
        rating: localStorage.getItem('driverRating') || '4.8'
    };
    
    // Update stat elements
    document.getElementById('totalTrips').textContent = stats.totalTrips;
    document.getElementById('hoursWorked').textContent = stats.hoursWorked;
    document.getElementById('rating').textContent = stats.rating;
    
    // Initialize date/time display
    updateDateTime();
    setInterval(updateDateTime, 1000); // Update every second
}

function loadCurrentTrip() {
    let currentTrip = localStorage.getItem('currentDriverTrip');
    
    if (!currentTrip) {
        // Create a fake active trip for testing
        const fakeTrip = {
            id: 'TRP-0001',
            status: 'active',
            pickupLocation: 'Sandton City Mall',
            dropoffLocation: 'Rosebank Mall',
            estimatedTime: '25 min',
            passengerCount: 2,
            passengerName: 'John Smith',
            phoneNumber: '+27123456789',
            distance: '12.5 km',
            scheduledAt: new Date().toISOString(),
            vehicleType: 'Sedan',
            specialInstructions: 'Please call when arriving'
        };
        
        localStorage.setItem('currentDriverTrip', JSON.stringify(fakeTrip));
        currentTrip = JSON.stringify(fakeTrip);
    }
    
    if (currentTrip) {
        const trip = JSON.parse(currentTrip);
        displayCurrentTrip(trip);
    }
}

function displayCurrentTrip(trip) {
    const currentTripCard = document.getElementById('currentTripCard');
    if (!currentTripCard) return;
    
    // Update trip details
    document.getElementById('pickupLocation').textContent = trip.pickupLocation || 'Pickup Location';
    document.getElementById('dropoffLocation').textContent = trip.dropoffLocation || 'Dropoff Location';
    document.getElementById('estimatedTime').textContent = `ETA: ${trip.estimatedTime || '15 min'}`;
    document.getElementById('passengerCount').textContent = `${trip.passengerCount || 1} Passenger${trip.passengerCount > 1 ? 's' : ''}`;
    
    // Update trip status
    const tripStatus = document.getElementById('tripStatus');
    if (tripStatus) {
        tripStatus.textContent = trip.status || 'In Progress';
        tripStatus.className = `trip-status ${trip.status?.toLowerCase() || 'active'}`;
    }
    
    // Show the card
    currentTripCard.style.display = 'block';
}

function loadRecentTrips() {
    let recentTrips = JSON.parse(localStorage.getItem('recentDriverTrips') || '[]');
    const recentTripsContainer = document.getElementById('recentTrips');
    
    if (!recentTripsContainer) return;
    
    if (recentTrips.length === 0) {
        // Create fake recent trips for testing
        recentTrips = [
            {
                id: 'TRP-0002',
                status: 'completed',
                pickupLocation: 'Fourways Mall',
                dropoffLocation: 'Lanseria Airport',
                completedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
                passengerCount: 1,
                passengerName: 'Sarah Johnson'
            },
            {
                id: 'TRP-0003',
                status: 'completed',
                pickupLocation: 'Eastgate Mall',
                dropoffLocation: 'OR Tambo Airport',
                completedAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(), // 5 hours ago
                passengerCount: 2,
                passengerName: 'Mike Wilson'
            },
            {
                id: 'TRP-0004',
                status: 'completed',
                pickupLocation: 'Hyde Park Corner',
                dropoffLocation: 'Sandton CBD',
                completedAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
                passengerCount: 1,
                passengerName: 'Lisa Brown'
            }
        ];
        
        localStorage.setItem('recentDriverTrips', JSON.stringify(recentTrips));
    }
    
    // Display recent trips
    recentTripsContainer.innerHTML = recentTrips.map(trip => `
        <div class="trip-card ${trip.status}">
            <div class="trip-header">
                <div class="trip-id">Trip #${trip.id}</div>
                <div class="trip-status ${trip.status}">${trip.status}</div>
            </div>
            <div class="trip-details">
                <div class="trip-detail">
                    <i class="fas fa-map-marker-alt"></i>
                    <span>${trip.pickupLocation}</span>
                </div>
                <div class="trip-detail">
                    <i class="fas fa-flag-checkered"></i>
                    <span>${trip.dropoffLocation}</span>
                </div>
                <div class="trip-detail">
                    <i class="fas fa-clock"></i>
                    <span>${formatDateTime(trip.completedAt || trip.scheduledAt)}</span>
                </div>
                <div class="trip-detail">
                    <i class="fas fa-users"></i>
                    <span>${trip.passengerCount || 1} Passenger${(trip.passengerCount || 1) > 1 ? 's' : ''}</span>
                </div>
            </div>
        </div>
    `).join('');
}

function setupRealTimeUpdates() {
    // Simulate real-time updates every 30 seconds
    setInterval(() => {
        updateDriverStatus();
        checkForNewTrips();
    }, 30000);
}

function updateDriverStatus() {
    // Update online status, etc.
    const isOnline = localStorage.getItem('driverOnlineStatus') === 'true';
    
    if (isOnline) {
        // Update time display
        updateDateTime();
    }
}

function updateDateTime() {
    const now = new Date();
    
    // Format date (e.g., "Monday, 15 Jan 2024")
    const dateOptions = { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
    };
    const formattedDate = now.toLocaleDateString('en-ZA', dateOptions);
    
    // Format time (e.g., "14:30")
    const timeOptions = { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: false 
    };
    const formattedTime = now.toLocaleTimeString('en-ZA', timeOptions);
    
    // Update displays
    const dateElement = document.getElementById('currentDate');
    const timeElement = document.getElementById('currentTime');
    const timeLargeElement = document.getElementById('currentTimeLarge');
    
    if (dateElement) dateElement.textContent = formattedDate;
    if (timeElement) timeElement.textContent = formattedTime;
    if (timeLargeElement) timeLargeElement.textContent = formattedTime;
}

function formatDateTime(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now - date) / (1000 * 60 * 60);
    
    if (diffInHours < 1) {
        const diffInMinutes = Math.floor((now - date) / (1000 * 60));
        return `${diffInMinutes}m ago`;
    } else if (diffInHours < 24) {
        const diffInHours = Math.floor((now - date) / (1000 * 60 * 60));
        return `${diffInHours}h ago`;
    } else if (diffInHours < 48) {
        return 'Yesterday';
    } else {
        return date.toLocaleDateString('en-ZA', { 
            day: '2-digit', 
            month: 'short',
            hour: '2-digit',
            minute: '2-digit'
        });
    }
}

function checkForNewTrips() {
    // Check for new trip assignments
    const newTrips = JSON.parse(localStorage.getItem('newDriverTrips') || '[]');
    
    if (newTrips.length > 0) {
        showNewTripNotification(newTrips[0]);
        // Remove the notification after showing
        localStorage.removeItem('newDriverTrips');
    }
}

function showNewTripNotification(trip) {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = 'notification success';
    notification.innerHTML = `
        <h4>New Trip Assigned!</h4>
        <p>Trip #${trip.id} - ${trip.pickupLocation} to ${trip.dropoffLocation}</p>
        <button class="btn btn-primary" onclick="acceptTrip('${trip.id}')">Accept Trip</button>
        <button class="btn btn-secondary" onclick="dismissNotification(this)">Dismiss</button>
    `;
    
    document.body.appendChild(notification);
    
    // Auto-remove after 10 seconds
    setTimeout(() => {
        if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
        }
    }, 10000);
}

function acceptTrip(tripId) {
    // Accept the trip
    const newTrips = JSON.parse(localStorage.getItem('newDriverTrips') || '[]');
    const trip = newTrips.find(t => t.id === tripId);
    
    if (trip) {
        // Move to current trip
        localStorage.setItem('currentDriverTrip', JSON.stringify(trip));
        
        // Remove from new trips
        const updatedTrips = newTrips.filter(t => t.id !== tripId);
        localStorage.setItem('newDriverTrips', JSON.stringify(updatedTrips));
        
        // Update display
        loadCurrentTrip();
        
        // Show success message
        showSuccessMessage('Trip accepted successfully!');
    }
    
    // Remove notification
    const notification = event.target.closest('.notification');
    if (notification) {
        notification.remove();
    }
}

function dismissNotification(button) {
    const notification = button.closest('.notification');
    if (notification) {
        notification.remove();
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

// Export functions for global access
window.acceptTrip = acceptTrip;
window.dismissNotification = dismissNotification;
