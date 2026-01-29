import * as bookingApi from '../../js/api/bookingApi.js';

// Booking card creation and detail view functions
// Note: These functions rely on global variables: allBookings



// Store bookings globally
let allBookings = [];
let autoSettings = {
    routeLocal: 'manual',
    routeLong: 'manual',
    custom: 'manual'
};

// Load auto settings from localStorage
function loadAutoSettings() {
    const saved = localStorage.getItem('ownerAutoSettings');
    if (saved) {
        autoSettings = JSON.parse(saved);
        // Update radio buttons
        document.getElementById('routeLocalAccept').checked = autoSettings.routeLocal === 'auto-accept';
        document.getElementById('routeLocalReject').checked = autoSettings.routeLocal === 'auto-reject';
        document.getElementById('routeLocalManual').checked = autoSettings.routeLocal === 'manual';
        document.getElementById('routeLongAccept').checked = autoSettings.routeLong === 'auto-accept';
        document.getElementById('routeLongReject').checked = autoSettings.routeLong === 'auto-reject';
        document.getElementById('routeLongManual').checked = autoSettings.routeLong === 'manual';
        document.getElementById('customAccept').checked = autoSettings.custom === 'auto-accept';
        document.getElementById('customReject').checked = autoSettings.custom === 'auto-reject';
        document.getElementById('customManual').checked = autoSettings.custom === 'manual';
    }
}

// Save auto settings
function saveAutoSettings() {
    autoSettings.routeLocal = document.querySelector('input[name="routeLocalAuto"]:checked').value;
    autoSettings.routeLong = document.querySelector('input[name="routeLongAuto"]:checked').value;
    autoSettings.custom = document.querySelector('input[name="customAuto"]:checked').value;
    localStorage.setItem('ownerAutoSettings', JSON.stringify(autoSettings));
    alert('Auto-settings saved successfully!');
}
// Navigation functions
function toggleMobileMenu() {
    const mobileMenu = document.getElementById('mobileMenu');
    mobileMenu.classList.toggle('show');
}

function topNavZIndexDecrease() {
    // Function for navigation link clicks
}

// Check authentication status
document.addEventListener('DOMContentLoaded', async function() {
    const authButtons = document.getElementById('authButtons');
    const fullNav = document.getElementById('fullNav');
    
    const isLoggedIn = localStorage.getItem('userProfile') || sessionStorage.getItem('userProfile') || 
                      localStorage.getItem('currentUser') || sessionStorage.getItem('currentUser');
    
    if (isLoggedIn) {
        if (authButtons) authButtons.style.display = 'none';
        if (fullNav) fullNav.style.display = 'flex';
    } else {
        if (authButtons) authButtons.style.display = 'flex';
        if (fullNav) fullNav.style.display = 'none';
    }

    await loadBookings();
});

function showBookingTab(tabName) {
    // Hide all tab content sections
    document.querySelectorAll('.tab-content-section').forEach(section => {
        section.classList.remove('active');
    });

    // Remove active class from all buttons
    document.querySelectorAll('.booking-tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });

    // Show selected tab content
    document.getElementById(`${tabName}-bookings`).classList.add('active');

    // Add active class to clicked button
    event.target.classList.add('active');
}

// {
//     id: 'BK-2025-001',
//     status: 'pending',
//     type: 'route-based',
//     routeType: 'local',
//     tripName: 'Johannesburg Local',
//     collectionDelivery: 'collection',
//     date: 'Today, 2:30 PM',
//     time: '14:30',
//     distance: '28.5 km',
//     passengers: 3,
//     parcels: 2,
//     amount: 'R 516.75',
//     timeAgo: '2 hours ago',
//     customer: {
//         name: 'Sarah Mthembu',
//         phone: '082 123 4567',
//         email: 'sarah@example.com'
//     },
//     passengerDetails: [
//         { name: 'Sarah Mthembu', id: '850101 5800 08 5', phone: '082 123 4567', pickup: 'Sandton City Mall, Sandton', dropoff: 'OR Tambo Airport' },
//         { name: 'John Mthembu', id: '920315 5800 08 6', phone: '082 123 4568', pickup: 'Sandton City Mall, Sandton', dropoff: 'OR Tambo Airport' },
//         { name: 'Mary Mthembu', id: '950520 5800 08 7', phone: '082 123 4569', pickup: 'Sandton City Mall, Sandton', dropoff: 'OR Tambo Airport' }
//     ],
//     parcelDetails: [
//         { size: 'Medium', weight: '12kg', sender: 'Sarah Mthembu', receiver: 'John Doe', secretCode: 'ABC123', image: '../../assets/images/default-avatar.png', pickup: 'Sandton City Mall, Sandton', dropoff: '123 Main St, Tzaneen' },
//         { size: 'Small', weight: '4kg', sender: 'Sarah Mthembu', receiver: 'Jane Smith', secretCode: 'XYZ789', image: '../../assets/images/default-avatar.png', pickup: 'Sandton City Mall, Sandton', dropoff: '456 Oak Ave, Tzaneen' }
//     ],
//     waitingPoints: [
//         { type: 'waiting', location: 'Sandton City Mall Parking, Sandton', description: 'Drop-off point for passengers and parcels' }
//     ],
//     pickupLocations: [
//         { type: 'pickup', location: 'Sandton City Mall, Sandton', description: 'Collect passengers and parcels' }
//     ],
//     dropoffLocations: [
//         { type: 'dropoff', location: 'OR Tambo Airport, Kempton Park', description: 'Drop-off passengers' },
//         { type: 'dropoff', location: '123 Main St, Tzaneen', description: 'Drop-off parcel for John Doe' },
//         { type: 'dropoff', location: '456 Oak Ave, Tzaneen', description: 'Drop-off parcel for Jane Smith' }
//     ],
//     route: 'Via N1 Highway'
// }


async function loadBookings() {
    // Load comprehensive bookings

    const allBookingsData = await bookingApi.getAllBookingsOwner();
    console.log('allBookingsData:', allBookingsData);


    allBookings = createComprehensiveBookings();
    
    // Apply auto-settings
    allBookings.forEach(booking => {
        if (booking.status === 'pending') {
            let autoAction = null;
            if (booking.type === 'route-based') {
                if (booking.routeType === 'local') {
                    autoAction = autoSettings.routeLocal;
                } else if (booking.routeType === 'long-distance') {
                    autoAction = autoSettings.routeLong;
                }
            } else if (booking.type === 'custom-trip') {
                autoAction = autoSettings.custom;
            }
            
            if (autoAction === 'auto-accept') {
                booking.status = 'confirmed';
            } else if (autoAction === 'auto-reject') {
                booking.status = 'cancelled';
            }
        }
    });

    displayBookings(allBookings);
}

function displayBookings(bookings) {
    const pending = bookings.filter(b => b.status === 'pending');
    const upcoming = bookings.filter(b => b.status === 'confirmed');
    const historical = bookings.filter(b => b.status === 'completed' || b.status === 'cancelled');

    displayBookingList('pendingBookingsList', pending);
    displayBookingList('upcomingBookingsList', upcoming);
    displayBookingList('historicalBookingsList', historical);
}

function displayBookingList(containerId, bookings) {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (bookings.length === 0) {
        container.innerHTML = `
            <div class="no-bookings">
                <i class="fas fa-calendar-times"></i>
                <p>No bookings found in this category.</p>
            </div>
        `;
        return;
    }

    container.innerHTML = bookings.map(booking => createBookingCard(booking)).join('');
}



function createBookingCard(booking) {
    const statusClass = `status-${booking.status}`;
    const statusText = booking.status === 'pending' ? 'Pending' :
                     booking.status === 'confirmed' ? 'Confirmed' :
                     booking.status === 'completed' ? 'Completed' : 'Cancelled';
    
    const bookingType = booking.type || 'route-based';
    const typeClass = bookingType === 'route-based' ? 'booking-type-route' : 'booking-type-custom';
    const typeText = bookingType === 'route-based' ? 'Route-Based' : 'Custom Trip';
    const typeIcon = bookingType === 'route-based' ? 'fa-route' : 'fa-map-marked-alt';
    
    // Determine card CSS classes for visual differentiation
    let cardClass = bookingType === 'route-based' ? 'route-based' : 'custom-trip';
    if (bookingType === 'route-based' && booking.routeType) {
        if (booking.routeType === 'local') {
            cardClass += ' local';
        } else if (booking.routeType === 'long-distance') {
            cardClass += ' long-distance';
        }
    }

    let actionsHTML = '';
    if (booking.status === 'pending') {
        actionsHTML = `
            <button class="btn-action btn-accept" onclick="acceptBooking('${booking.id}')">
                <i class="fas fa-check"></i> Accept
            </button>
            <button class="btn-action btn-view" onclick="viewBookingDetails('${booking.id}')">
                <i class="fas fa-eye"></i> View Details
            </button>
            <button class="btn-action btn-decline" onclick="declineBooking('${booking.id}')">
                <i class="fas fa-times"></i> Decline
            </button>
        `;
    } else if (booking.status === 'confirmed') {
        actionsHTML = `
            <button class="btn-action btn-view" onclick="viewBookingDetails('${booking.id}')">
                <i class="fas fa-eye"></i> View Details
            </button>
            <button class="btn-action btn-contact" onclick="contactCustomer('${escapeHtml(booking.customer.name)}')">
                <i class="fas fa-phone"></i> Contact
            </button>
            <button class="btn-action btn-cancel" onclick="cancelBooking('${booking.id}')">
                <i class="fas fa-ban"></i> Cancel
            </button>
        `;
    } else {
        actionsHTML = `
            <button class="btn-action btn-view" onclick="viewBookingDetails('${booking.id}')">
                <i class="fas fa-eye"></i> View Details
            </button>
            <button class="btn-action btn-contact" onclick="contactCustomer('${escapeHtml(booking.customer.name)}')">
                <i class="fas fa-phone"></i> Contact
            </button>
        `;
    }

    let bookingInfoHTML = '';
    
    if (booking.type === 'route-based') {
        // Route-Based Booking Display
        bookingInfoHTML = `
            <div class="route-info">
                <div class="route-from">
                    <strong>Trip:</strong> ${escapeHtml(booking.tripName)}
                </div>
                <div class="route-to">
                    <strong>Date & Time:</strong> ${escapeHtml(booking.date)}
                </div>
            </div>
            <div class="booking-info">
                <div class="info-item">
                    <span class="label">Distance:</span>
                    <span class="value">${escapeHtml(booking.distance)}</span>
                </div>
                <div class="info-item">
                    <span class="label">Passengers:</span>
                    <span class="value">${booking.passengers || 0}</span>
                </div>
                <div class="info-item">
                    <span class="label">Parcels:</span>
                    <span class="value">${booking.parcels || 0}</span>
                </div>
                <div class="info-item">
                    <span class="label">Total Amount:</span>
                    <span class="value amount">${escapeHtml(booking.amount)}</span>
                </div>
            </div>
        `;
    } else {
        // Custom Trip Display
        const returnTripInfo = booking.returnTrip 
            ? `<div class="return-trip-info">
                <i class="fas fa-undo"></i> Return Trip - Taxi stays for ${booking.stayDays || 0} days
               </div>`
            : `<div class="one-way-info">
                <i class="fas fa-arrow-right"></i> One Way Trip
               </div>`;
        
        bookingInfoHTML = `
            <div class="route-info">
                <div class="route-from">
                    <strong>From:</strong> ${escapeHtml(booking.from)}
                </div>
                <div class="route-to">
                    <strong>To:</strong> ${escapeHtml(booking.to)}
                </div>
            </div>
            <div class="booking-info">
                <div class="info-item">
                    <span class="label">Date & Time:</span>
                    <span class="value">${escapeHtml(booking.departureDate || booking.date)}</span>
                </div>
                ${returnTripInfo}
                <div class="info-item">
                    <span class="label">Customer:</span>
                    <span class="value">${escapeHtml(booking.customer.name)}</span>
                </div>
                <div class="info-item">
                    <span class="label">Contact:</span>
                    <span class="value">${escapeHtml(booking.customer.phone)}</span>
                </div>
                <div class="info-item">
                    <span class="label">Passengers:</span>
                    <span class="value">${booking.passengers || 0}</span>
                </div>
                <div class="info-item">
                    <span class="label">Distance:</span>
                    <span class="value">${escapeHtml(booking.distance)}</span>
                </div>
            </div>
        `;
    }

    return `
        <div class="booking-card ${cardClass}">
            <div class="booking-header">
                <div style="display: flex; align-items: center; gap: 0.75rem; flex-wrap: wrap;">
                    <div class="booking-id">#${booking.id}</div>
                    <span class="booking-type-badge ${typeClass}">
                        <i class="fas ${typeIcon}"></i> ${typeText}
                    </span>
                </div>
                <div style="display: flex; align-items: center; gap: 0.75rem; flex-wrap: wrap;">
                    <div class="booking-status ${statusClass}">${statusText}</div>
                    <div class="booking-time">${escapeHtml(booking.timeAgo || booking.time || '')}</div>
                </div>
            </div>
            <div class="booking-details">
                ${bookingInfoHTML}
            </div>
            <div class="booking-actions">
                ${actionsHTML}
            </div>
        </div>
    `;
}

function viewBookingDetails(bookingId) {
    const booking = allBookings.find(b => b.id === bookingId);
    if (!booking) {
        alert('Booking not found!');
        return;
    }

    const modal = document.getElementById('bookingModal');
    const modalTitle = document.getElementById('modalTitle');
    const modalBody = document.getElementById('modalBody');

    modalTitle.innerHTML = `<i class="fas fa-calendar-check"></i> Booking #${booking.id}`;

    let modalContent = '';

    if (booking.type === 'route-based') {
        // Route-Based Booking Detail View
        modalContent = `
            <div class="trip-info-header">
                <h2 style="margin: 0 0 1rem 0; color: #01386A;">
                    ${escapeHtml(booking.tripName)}
                </h2>
                <div class="trip-info-grid">
                    <div class="trip-info-item">
                        <span class="trip-info-label">Date & Time</span>
                        <span class="trip-info-value">${escapeHtml(booking.date)}</span>
                    </div>
                    <div class="trip-info-item">
                        <span class="trip-info-label">Distance</span>
                        <span class="trip-info-value">${escapeHtml(booking.distance)}</span>
                    </div>
                    <div class="trip-info-item">
                        <span class="trip-info-label">Passengers</span>
                        <span class="trip-info-value">${booking.passengers || 0}</span>
                    </div>
                    <div class="trip-info-item">
                        <span class="trip-info-label">Parcels</span>
                        <span class="trip-info-value">${booking.parcels || 0}</span>
                    </div>
                    <div class="trip-info-item">
                        <span class="trip-info-label">Amount</span>
                        <span class="trip-info-value" style="color: #28a745;">${escapeHtml(booking.amount)}</span>
                    </div>
                </div>
            </div>

            <!-- Passenger Details -->
            <div class="detail-section">
                <h3><i class="fas fa-users"></i> Passenger Details</h3>
                <div class="passenger-list">
                    ${(booking.passengerDetails || []).map(passenger => `
                        <div class="passenger-card">
                            <h4>${escapeHtml(passenger.name)}</h4>
                            <div class="passenger-detail-item">
                                <span class="detail-label">ID Number:</span>
                                <span class="detail-value">${escapeHtml(passenger.id)}</span>
                            </div>
                            <div class="passenger-detail-item">
                                <span class="detail-label">Phone:</span>
                                <span class="detail-value">${escapeHtml(passenger.phone)}</span>
                            </div>
                            <div class="passenger-detail-item">
                                <span class="detail-label">Pickup:</span>
                                <span class="detail-value">${escapeHtml(passenger.pickup)}</span>
                            </div>
                            <div class="passenger-detail-item">
                                <span class="detail-label">Drop-off:</span>
                                <span class="detail-value">${escapeHtml(passenger.dropoff)}</span>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>

            <!-- Parcel Details -->
            ${(booking.parcelDetails && booking.parcelDetails.length > 0) ? `
            <div class="detail-section">
                <h3><i class="fas fa-box"></i> Parcel Details</h3>
                <div class="parcel-list">
                    ${booking.parcelDetails.map(parcel => `
                        <div class="parcel-card">
                            <h4>${escapeHtml(parcel.size)} Parcel - ${escapeHtml(parcel.weight)}</h4>
                            <div class="parcel-detail-item">
                                <span class="detail-label">Sender:</span>
                                <span class="detail-value">${escapeHtml(parcel.sender)}</span>
                            </div>
                            <div class="parcel-detail-item">
                                <span class="detail-label">Receiver:</span>
                                <span class="detail-value">${escapeHtml(parcel.receiver)}</span>
                            </div>
                            <div class="parcel-detail-item">
                                <span class="detail-label">Secret Code:</span>
                                <span class="detail-value" style="font-weight: 700; color: #01386A;">${escapeHtml(parcel.secretCode)}</span>
                            </div>
                            <div class="parcel-detail-item">
                                <span class="detail-label">Pickup:</span>
                                <span class="detail-value">${escapeHtml(parcel.pickup)}</span>
                            </div>
                            <div class="parcel-detail-item">
                                <span class="detail-label">Drop-off:</span>
                                <span class="detail-value">${escapeHtml(parcel.dropoff)}</span>
                            </div>
                            ${parcel.image ? `<img src="${parcel.image}" alt="Parcel" class="parcel-image">` : ''}
                        </div>
                    `).join('')}
                </div>
            </div>
            ` : ''}

            <!-- Map and Route Information -->
            <div class="detail-section">
                <h3><i class="fas fa-map-marked-alt"></i> Route & Locations</h3>
                ${booking.routeType === 'local' ? `
                    <div class="route-info-display">
                        <h4 style="margin-bottom: 1rem; color: #01386A;">Waiting Points</h4>
                        ${(booking.waitingPoints || []).map(point => `
                            <div class="location-point waiting">
                                <i class="fas fa-clock"></i>
                                <div>
                                    <strong>${escapeHtml(point.location)}</strong>
                                    <div style="font-size: 0.9rem; color: #6c757d;">${escapeHtml(point.description)}</div>
                                </div>
                            </div>
                        `).join('')}
                        
                        <h4 style="margin-top: 1.5rem; margin-bottom: 1rem; color: #01386A;">Pickup Locations</h4>
                        ${(booking.pickupLocations || []).map(point => `
                            <div class="location-point pickup">
                                <i class="fas fa-map-marker-alt"></i>
                                <div>
                                    <strong>${escapeHtml(point.location)}</strong>
                                    <div style="font-size: 0.9rem; color: #6c757d;">${escapeHtml(point.description)}</div>
                                </div>
                            </div>
                        `).join('')}
                        
                        <h4 style="margin-top: 1.5rem; margin-bottom: 1rem; color: #01386A;">Drop-off Locations</h4>
                        ${(booking.dropoffLocations || []).map(point => `
                            <div class="location-point dropoff">
                                <i class="fas fa-flag"></i>
                                <div>
                                    <strong>${escapeHtml(point.location)}</strong>
                                    <div style="font-size: 0.9rem; color: #6c757d;">${escapeHtml(point.description)}</div>
                                </div>
                            </div>
                        `).join('')}
                        
                        <div class="route-info-item" style="margin-top: 1rem; padding-top: 1rem; border-top: 2px solid #e9ecef;">
                            <i class="fas fa-route"></i>
                            <strong>Route:</strong> ${escapeHtml(booking.route || 'TBD')}
                        </div>
                    </div>
                ` : `
                    <div class="route-info-display">
                        <div class="route-info-item">
                            <i class="fas fa-map-marker-alt"></i>
                            <strong>Starting Point:</strong> ${escapeHtml(booking.startingPoint)}
                        </div>
                        <div class="route-info-item">
                            <i class="fas fa-flag"></i>
                            <strong>Ending Point:</strong> ${escapeHtml(booking.endingPoint)}
                        </div>
                        <div class="route-info-item" style="margin-top: 1rem; padding-top: 1rem; border-top: 2px solid #e9ecef;">
                            <i class="fas fa-route"></i>
                            <strong>Route:</strong> ${escapeHtml(booking.route || 'TBD')}
                        </div>
                    </div>
                `}
                <div class="map-container">
                    <i class="fas fa-map" style="font-size: 3rem; color: #6c757d;"></i>
                    <div style="margin-top: 1rem; color: #6c757d;">Map integration will display route here</div>
                </div>
            </div>
        `;
    } else {
        // Custom Trip Detail View
        const returnTripHTML = booking.returnTrip 
            ? `
                <div class="return-trip-info">
                    <i class="fas fa-undo"></i> 
                    <strong>Return Trip:</strong> Taxi will stay at destination for ${booking.stayDays || 0} days
                    <br>
                    <strong>Return Date:</strong> ${escapeHtml(booking.returnDate || 'TBD')}
                </div>
            `
            : `
                <div class="one-way-info">
                    <i class="fas fa-arrow-right"></i> 
                    <strong>One Way Trip</strong>
                </div>
            `;

        modalContent = `
            <div class="trip-info-header">
                <h2 style="margin: 0 0 1rem 0; color: #01386A;">
                    Custom Trip Booking
                </h2>
                <div class="trip-info-grid">
                    <div class="trip-info-item">
                        <span class="trip-info-label">From</span>
                        <span class="trip-info-value">${escapeHtml(booking.from)}</span>
                    </div>
                    <div class="trip-info-item">
                        <span class="trip-info-label">To</span>
                        <span class="trip-info-value">${escapeHtml(booking.to)}</span>
                    </div>
                    <div class="trip-info-item">
                        <span class="trip-info-label">Departure Date</span>
                        <span class="trip-info-value">${escapeHtml(booking.departureDate || booking.date)}</span>
                    </div>
                    <div class="trip-info-item">
                        <span class="trip-info-label">Distance</span>
                        <span class="trip-info-value">${escapeHtml(booking.distance)}</span>
                    </div>
                    <div class="trip-info-item">
                        <span class="trip-info-label">Passengers</span>
                        <span class="trip-info-value">${booking.passengers || 0}</span>
                    </div>
                    <div class="trip-info-item">
                        <span class="trip-info-label">Amount</span>
                        <span class="trip-info-value" style="color: #28a745;">${escapeHtml(booking.amount)}</span>
                    </div>
                </div>
                ${returnTripHTML}
            </div>

            <!-- Customer Information -->
            <div class="detail-section">
                <h3><i class="fas fa-user"></i> Customer Information</h3>
                <div class="passenger-list">
                    <div class="passenger-card">
                        <h4>${escapeHtml(booking.customer.name)}</h4>
                        <div class="passenger-detail-item">
                            <span class="detail-label">Phone:</span>
                            <span class="detail-value">${escapeHtml(booking.customer.phone)}</span>
                        </div>
                        <div class="passenger-detail-item">
                            <span class="detail-label">Email:</span>
                            <span class="detail-value">${escapeHtml(booking.customer.email || 'N/A')}</span>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Passenger Details -->
            <div class="detail-section">
                <h3><i class="fas fa-users"></i> Passenger Details</h3>
                <div class="passenger-list">
                    ${(booking.passengerDetails || []).map(passenger => `
                        <div class="passenger-card">
                            <h4>${escapeHtml(passenger.name)}</h4>
                            <div class="passenger-detail-item">
                                <span class="detail-label">ID Number:</span>
                                <span class="detail-value">${escapeHtml(passenger.id)}</span>
                            </div>
                            <div class="passenger-detail-item">
                                <span class="detail-label">Phone:</span>
                                <span class="detail-value">${escapeHtml(passenger.phone)}</span>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>

            <!-- Route Information -->
            <div class="detail-section">
                <h3><i class="fas fa-map-marked-alt"></i> Route & Locations</h3>
                <div class="route-info-display">
                    <div class="route-info-item">
                        <i class="fas fa-map-marker-alt"></i>
                        <strong>Pickup Location:</strong> ${escapeHtml(booking.pickupLocation)}
                    </div>
                    <div class="route-info-item">
                        <i class="fas fa-flag"></i>
                        <strong>Destination:</strong> ${escapeHtml(booking.destination)}
                    </div>
                    <div style="margin-top: 1rem; padding-top: 1rem; border-top: 2px solid #e9ecef;">
                        <strong style="color: #01386A;">Route Driving Options:</strong>
                        <ul style="margin-top: 0.5rem; padding-left: 1.5rem;">
                            ${(booking.routeOptions || []).map(option => `
                                <li style="margin: 0.5rem 0; color: #333;">${escapeHtml(option)}</li>
                            `).join('')}
                        </ul>
                    </div>
                </div>
                <div class="map-container">
                    <i class="fas fa-map" style="font-size: 3rem; color: #6c757d;"></i>
                    <div style="margin-top: 1rem; color: #6c757d;">Map integration will display route here</div>
                </div>
            </div>
        `;
    }

    modalBody.innerHTML = modalContent;
    modal.style.display = 'block';
}

function closeBookingModal() {
    document.getElementById('bookingModal').style.display = 'none';
}

// Close modal when clicking outside
window.onclick = function(event) {
    const modal = document.getElementById('bookingModal');
    if (event.target === modal) {
        modal.style.display = 'none';
    }
}

async function acceptBooking(bookingId) {
    const booking = allBookings.find(b => b.id === bookingId);
    if (booking) {
        booking.status = 'confirmed';
        alert(`Booking ${bookingId} accepted!`);
        await loadBookings();
    }
}

async function declineBooking(bookingId) {
    if (confirm('Are you sure you want to decline this booking?')) {
        const booking = allBookings.find(b => b.id === bookingId);
        if (booking) {
            booking.status = 'cancelled';
            alert(`Booking ${bookingId} declined.`);
            await loadBookings();
        }
    }
}

async function cancelBooking(bookingId) {
    if (confirm('Are you sure you want to cancel this booking?')) {
        const booking = allBookings.find(b => b.id === bookingId);
        if (booking) {
            booking.status = 'cancelled';
            alert(`Booking ${bookingId} cancelled.`);
            await loadBookings();
        }
    }
}

function contactCustomer(customerName) {
    const booking = allBookings.find(b => b.customer.name === customerName);
    if (booking) {
        alert(`Contacting ${customerName}\nPhone: ${booking.customer.phone}\nEmail: ${booking.customer.email || 'N/A'}`);
    } else {
        alert(`Contacting ${customerName}...`);
    }
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

     // Make functions globally accessible
     window.toggleMobileMenu = toggleMobileMenu;
     window.topNavZIndexDecrease = topNavZIndexDecrease;
     window.showBookingTab = showBookingTab;
     window.saveAutoSettings = saveAutoSettings;
     window.acceptBooking = async (bookingId) => {
        await acceptBooking(bookingId);
     };
     window.declineBooking = async (bookingId) => {
        await declineBooking(bookingId);
     };
     window.cancelBooking = async (bookingId) => {
        await cancelBooking(bookingId);
     };
     window.viewBookingDetails = viewBookingDetails;
     window.contactCustomer = contactCustomer;
     window.closeBookingModal = closeBookingModal;