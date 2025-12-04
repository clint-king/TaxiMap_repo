// Trip Status Page JavaScript

import * as bookingApi from '../api/bookingApi.js';

// Generate secret code (same function as booking-public.js)
function generateSecretCode() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

// Routes data (same as booking-public.js)
const routes = {
    'pta-tzn': {
        name: 'Pretoria → Tzaneen',
        distance: '450',
        duration: '5.5',
        price: 450,
        coordinates: {
            start: [28.2294, -25.7479],
            end: [30.1403, -23.8336]
        },
        departure: {
            date: '2025-11-14',
            time: '10:00 am'
        }
    },
    'tzn-pta': {
        name: 'Tzaneen → Pretoria',
        distance: '450',
        duration: '5.5',
        price: 450,
        coordinates: {
            start: [30.1403, -23.8336],
            end: [28.2294, -25.7479]
        },
        departure: {
            date: '2025-11-14',
            time: '10:00 am'
        }
    }
};

// Load trip data from database or localStorage
async function loadTripData() {
    // Check for bookingId in URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const bookingId = urlParams.get('bookingId');
    
    // If bookingId is provided, fetch from database
    if (bookingId) {
        try {
            const response = await bookingApi.getBookingDetails(bookingId);
            if (response.success && response.booking) {
                populateTripStatusFromDatabase(response.booking);
                return;
            }
        } catch (error) {
            console.error('Error fetching booking details:', error);
            // Fall through to localStorage handling
        }
    }
    
    // Fallback to localStorage if no bookingId or API call failed
    const activeTripData = localStorage.getItem('activeTripData');
    const currentBooking = sessionStorage.getItem('currentBooking') || localStorage.getItem('completedBooking');
    
    if (!activeTripData && !currentBooking) {
        // No trip data found - create dummy parcel booking for demo
        const dummyBooking = {
            id: 'BK' + Date.now(),
            reference: 'TKS' + Date.now().toString().slice(-8),
            routeId: 'pta-tzn',
            routeName: 'Pretoria → Tzaneen',
            bookingType: 'parcels',
            passengers: 0,
            parcels: 2,
            totalAmount: 900, // 2 parcels * 450
            pricePerPerson: 450,
            parcelData: {
                1: {
                    senderName: 'John Doe',
                    senderPhone: '071 234 5678',
                    receiverName: 'Jane Smith',
                    receiverPhone: '082 345 6789',
                    secretCode: generateSecretCode(),
                    size: 'medium',
                    images: []
                },
                2: {
                    senderName: 'John Doe',
                    senderPhone: '071 234 5678',
                    receiverName: 'Mike Johnson',
                    receiverPhone: '083 456 7890',
                    secretCode: generateSecretCode(),
                    size: 'large',
                    images: []
                }
            },
            pickupPoints: [
                { address: '123 Main Street, Pretoria', lat: -25.7479, lng: 28.2294 }
            ],
            dropoffPoints: [
                { address: '456 Oak Avenue, Tzaneen', lat: -23.8336, lng: 30.1403 }
            ],
            tripDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            bookingDate: new Date().toISOString(),
            status: 'paid',
            paymentMethod: 'card',
            paymentDate: new Date().toISOString()
        };
        
        // Use dummy booking for display
        const data = dummyBooking;
        const route = routes['pta-tzn'];
        
        // Update trip details
        document.getElementById('trip-route-display').textContent = data.routeName || '-';
        document.getElementById('trip-current-passengers').textContent = '0';
        document.getElementById('trip-seats-available').textContent = '15';
        document.getElementById('trip-capacity-text').textContent = '0 / 15';
        document.getElementById('trip-capacity-fill').style.width = '0%';
        document.getElementById('trip-capacity-fill').textContent = '0%';
        
        // Update departure time
        const departureTime = route.departure?.time || '10:00 am';
        document.getElementById('trip-departure-time').textContent = departureTime;
        
        // Update pickup and dropoff locations
        const pickupList = document.getElementById('trip-pickup-list');
        const dropoffList = document.getElementById('trip-dropoff-list');
        
        pickupList.innerHTML = '';
        dropoffList.innerHTML = '';
        
        if (data.pickupPoints && data.pickupPoints.length > 0) {
            data.pickupPoints.forEach(point => {
                const li = document.createElement('li');
                li.textContent = point.address || `${point.lat}, ${point.lng}`;
                pickupList.appendChild(li);
            });
        }
        
        if (data.dropoffPoints && data.dropoffPoints.length > 0) {
            data.dropoffPoints.forEach(point => {
                const li = document.createElement('li');
                li.textContent = point.address || `${point.lat}, ${point.lng}`;
                dropoffList.appendChild(li);
            });
        }
        
        // Show parcel banner for dummy booking
        const passengerBanner = document.getElementById('active-passenger-trip-banner');
        const parcelBanner = document.getElementById('active-parcel-trip-banner');
        
        if (passengerBanner) passengerBanner.style.display = 'none';
        if (parcelBanner) {
            parcelBanner.style.display = 'block';
            document.getElementById('active-parcel-trip-route').textContent = data.routeName;
            document.getElementById('active-parcel-trip-count').textContent = data.parcels;
            document.getElementById('active-parcel-trip-route-name').textContent = data.routeName;
        }
        
        // Update trip status for parcel booking
        document.getElementById('trip-full-alert').style.display = 'none';
        document.getElementById('trip-waiting-alert').style.display = 'none';
        document.getElementById('trip-status-badge').textContent = 'Active';
        
        // Hide share trip section for parcel bookings
        const shareTripCard = document.querySelector('.share-trip-card');
        if (shareTripCard) shareTripCard.style.display = 'none';
        
        // Initialize map with pickup and dropoff points
        initializeTripMap(data, route);
        
        // Display booking details (parcels)
        displayBookingDetails(data);
        
        // Display payment info and refund button
        displayPaymentInfo(data);
        
        return;
    }
    
    let tripData = null;
    let bookingData = null;
    
    if (activeTripData) {
        tripData = JSON.parse(activeTripData);
    }
    
    if (currentBooking) {
        bookingData = JSON.parse(currentBooking);
    }
    
    // Use trip data if available, otherwise use booking data
    const data = tripData || bookingData;
    if (!data) return;
    
    // Determine booking type
    const bookingType = data.bookingType || (data.parcels > 0 ? 'parcels' : 'passengers');
    
    // Show appropriate banner based on booking type
    const passengerBanner = document.getElementById('active-passenger-trip-banner');
    const parcelBanner = document.getElementById('active-parcel-trip-banner');
    
    if (bookingType === 'parcels') {
        // Show parcel banner
        if (passengerBanner) passengerBanner.style.display = 'none';
        if (parcelBanner) {
            parcelBanner.style.display = 'block';
            // Update parcel banner info
            const routeName = data.routeName || 'Pretoria → Tzaneen';
            const parcelCount = data.parcels || 0;
            document.getElementById('active-parcel-trip-route').textContent = routeName;
            document.getElementById('active-parcel-trip-count').textContent = parcelCount;
            document.getElementById('active-parcel-trip-route-name').textContent = routeName;
        }
    } else {
        // Show passenger banner
        if (parcelBanner) parcelBanner.style.display = 'none';
        if (passengerBanner) {
            passengerBanner.style.display = 'block';
            // Update passenger banner info
            const routeName = data.routeName || 'Pretoria → Tzaneen';
            const passengerCount = data.passengers || 1;
            const seatsAvailable = Math.max(15 - passengerCount, 0);
            document.getElementById('active-passenger-trip-route').textContent = routeName;
            document.getElementById('active-passenger-trip-passengers').textContent = passengerCount;
            document.getElementById('active-passenger-trip-seats').textContent = seatsAvailable;
        }
    }
    
    // Get route information
    const routeId = data.routeId || (data.routeName === 'Pretoria → Tzaneen' ? 'pta-tzn' : 'tzn-pta');
    const route = routes[routeId] || routes['pta-tzn'];
    
    // Get passenger count (for passenger bookings)
    const passengerCount = data.passengers || tripData?.passengers || bookingData?.passengers || (bookingType === 'passengers' ? 1 : 0);
    const seatsAvailable = Math.max(15 - passengerCount, 0);
    const capacityPercentage = (passengerCount / 15) * 100;
    
    // Update trip details - show passenger info only for passenger bookings
    if (bookingType === 'passengers') {
        document.getElementById('trip-route-display').textContent = route.name || data.routeName || '-';
        document.getElementById('trip-current-passengers').textContent = passengerCount;
        document.getElementById('trip-seats-available').textContent = seatsAvailable;
        document.getElementById('trip-capacity-text').textContent = `${passengerCount} / 15`;
        document.getElementById('trip-capacity-fill').style.width = `${capacityPercentage}%`;
        document.getElementById('trip-capacity-fill').textContent = `${Math.round(capacityPercentage)}%`;
        
        // Update trip status for passenger bookings
        if (passengerCount >= 15) {
            document.getElementById('trip-full-alert').style.display = 'flex';
            document.getElementById('trip-waiting-alert').style.display = 'none';
            document.getElementById('trip-status-badge').textContent = 'Full';
            document.getElementById('trip-status-badge').style.background = 'linear-gradient(135deg, #28a745 0%, #20c997 100%)';
        } else {
            document.getElementById('trip-full-alert').style.display = 'none';
            document.getElementById('trip-waiting-alert').style.display = 'flex';
            document.getElementById('trip-status-badge').textContent = 'Published';
        }
        
        // Simulate passengers joining (for demo purposes)
        simulatePassengersJoining(passengerCount);
    } else {
        // For parcel bookings, hide passenger-specific elements
        document.getElementById('trip-route-display').textContent = route.name || data.routeName || '-';
        document.getElementById('trip-current-passengers').textContent = '0';
        document.getElementById('trip-seats-available').textContent = '15';
        document.getElementById('trip-capacity-text').textContent = '0 / 15';
        document.getElementById('trip-capacity-fill').style.width = '0%';
        document.getElementById('trip-capacity-fill').textContent = '0%';
        
        // Hide passenger-specific alerts for parcel bookings
        document.getElementById('trip-full-alert').style.display = 'none';
        document.getElementById('trip-waiting-alert').style.display = 'none';
        document.getElementById('trip-status-badge').textContent = 'Active';
    }
    
    // Update departure time
    const departureTime = route.departure?.time || data.tripTime || 'Flexible';
    document.getElementById('trip-departure-time').textContent = departureTime;
    
    // Update pickup and dropoff locations
    const pickupList = document.getElementById('trip-pickup-list');
    const dropoffList = document.getElementById('trip-dropoff-list');
    
    pickupList.innerHTML = '';
    dropoffList.innerHTML = '';
    
    if (data.pickupPoints && data.pickupPoints.length > 0) {
        data.pickupPoints.forEach(point => {
            const li = document.createElement('li');
            li.textContent = point.address || `${point.lat}, ${point.lng}`;
            pickupList.appendChild(li);
        });
    } else {
        pickupList.innerHTML = '<li>No pickup points specified</li>';
    }
    
    if (data.dropoffPoints && data.dropoffPoints.length > 0) {
        data.dropoffPoints.forEach(point => {
            const li = document.createElement('li');
            li.textContent = point.address || `${point.lat}, ${point.lng}`;
            dropoffList.appendChild(li);
        });
    } else {
        dropoffList.innerHTML = '<li>No dropoff points specified</li>';
    }
    
    // Generate and display share link (only for passenger trips)
    const shareTripCard = document.querySelector('.share-trip-card');
    if (bookingType === 'passengers') {
        generateTripShareLink(data);
        if (shareTripCard) shareTripCard.style.display = 'block';
    } else {
        // Hide share trip section for parcel bookings
        if (shareTripCard) shareTripCard.style.display = 'none';
    }
    
    // Hide passenger-specific alerts for parcel bookings
    if (bookingType === 'parcels') {
        const tripFullAlert = document.getElementById('trip-full-alert');
        const tripWaitingAlert = document.getElementById('trip-waiting-alert');
        if (tripFullAlert) tripFullAlert.style.display = 'none';
        if (tripWaitingAlert) tripWaitingAlert.style.display = 'none';
    }
    
    // Initialize map with pickup and dropoff points
    initializeTripMap(data, route);
    
    // Display booking details (seat or parcels)
    displayBookingDetails(data);
    
    // Display payment info and refund button
    displayPaymentInfo(data);
}

// Populate trip status page from database booking data
function populateTripStatusFromDatabase(booking) {
    const userPassenger = booking.userPassenger;
    const passengers = booking.passengers || [];
    
    // ===== TRIP DETAILS CARD =====
    // Route: Use direction_type, location_1, location_2 from bookings/existing_routes
    let routeDisplay = '-';
    if (booking.location_1 && booking.location_2) {
        if (booking.direction_type === 'from_loc2') {
            routeDisplay = `${booking.location_2} → ${booking.location_1}`;
        } else {
            routeDisplay = `${booking.location_1} → ${booking.location_2}`;
        }
    }
    const routeDisplayEl = document.getElementById('trip-route-display');
    if (routeDisplayEl) routeDisplayEl.textContent = routeDisplay;
    
    // Current Passengers: passenger_count from bookings
    const passengerCount = booking.passenger_count || 0;
    const currentPassengersEl = document.getElementById('trip-current-passengers');
    if (currentPassengersEl) currentPassengersEl.textContent = passengerCount;
    
    // Seats Available: total_seats_available from bookings
    const totalSeatsAvailable = booking.total_seats_available || 15;
    const seatsAvailableEl = document.getElementById('trip-seats-available');
    if (seatsAvailableEl) seatsAvailableEl.textContent = totalSeatsAvailable;
    
    // Departure Time: scheduled_pickup from bookings
    const departureTimeEl = document.getElementById('trip-departure-time');
    if (departureTimeEl) {
        if (booking.scheduled_pickup) {
            const departureDate = new Date(booking.scheduled_pickup);
            const departureTime = departureDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            departureTimeEl.textContent = departureTime;
        } else {
            departureTimeEl.textContent = 'Flexible';
        }
    }
    
    // Trip Capacity: passenger_count / (passenger_count + total_seats_available)
    const totalCapacity = passengerCount + totalSeatsAvailable;
    const capacityPercentage = totalCapacity > 0 ? (passengerCount / totalCapacity) * 100 : 0;
    const capacityTextEl = document.getElementById('trip-capacity-text');
    if (capacityTextEl) capacityTextEl.textContent = `${passengerCount} / ${totalCapacity}`;
    const capacityFillEl = document.getElementById('trip-capacity-fill');
    if (capacityFillEl) {
        capacityFillEl.style.width = `${capacityPercentage}%`;
        capacityFillEl.textContent = `${Math.round(capacityPercentage)}%`;
    }
    
    // Pickup and Dropoff Points: Use userPassenger pickup_point and dropoff_point for map
    const pickupPoints = [];
    const dropoffPoints = [];
    
    if (userPassenger) {
        if (userPassenger.pickup_point) {
            pickupPoints.push(userPassenger.pickup_point);
        }
        if (userPassenger.dropoff_point) {
            dropoffPoints.push(userPassenger.dropoff_point);
        }
    }
    
    // Populate pickup/dropoff address lists
    const pickupList = document.getElementById('trip-pickup-list');
    const dropoffList = document.getElementById('trip-dropoff-list');
    
    if (pickupList) {
        pickupList.innerHTML = '';
        if (userPassenger && userPassenger.pickup_address) {
            const li = document.createElement('li');
            li.textContent = userPassenger.pickup_address;
            pickupList.appendChild(li);
        } else {
            pickupList.innerHTML = '<li>No pickup point specified</li>';
        }
    }
    
    if (dropoffList) {
        dropoffList.innerHTML = '';
        if (userPassenger && userPassenger.dropoff_address) {
            const li = document.createElement('li');
            li.textContent = userPassenger.dropoff_address;
            dropoffList.appendChild(li);
        } else {
            dropoffList.innerHTML = '<li>No dropoff point specified</li>';
        }
    }
    
    // Initialize map with pickup and dropoff points
    if (pickupPoints.length > 0 || dropoffPoints.length > 0) {
        const mapData = {
            pickupPoints: pickupPoints,
            dropoffPoints: dropoffPoints,
            routeName: routeDisplay
        };
        initializeTripMap(mapData, null);
    }
    
    // ===== YOUR BOOKING CARD =====
    // Code: from booking_passengers.code - display in parcel-secret-code class
    if (userPassenger && userPassenger.code) {
        const bookingCode = userPassenger.code;
        
        // Set code in element with class "parcel-secret-code"
        const secretCodeElements = document.querySelectorAll('.parcel-secret-code');
        secretCodeElements.forEach(el => {
            el.textContent = bookingCode;
        });
        
        // Also try other possible locations
        const bookingCodeElements = document.querySelectorAll('[data-booking-code], .booking-code, #booking-code');
        bookingCodeElements.forEach(el => {
            el.textContent = bookingCode;
        });
        
        // Generate QR code using the code (using QR server API like existing code)
        // The QR code should use the same code from parcel-secret-code
        const qrContainers = document.querySelectorAll('.parcel-qr-code, #qr-code-container, .qr-code-container, .booking-qr-code');
        qrContainers.forEach(qrContainer => {
            const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(bookingCode)}`;
            qrContainer.innerHTML = `<img src="${qrCodeUrl}" alt="Booking QR Code" style="width: 100%; max-width: 250px; height: auto;">`;
        });
        
        // If booking details content exists, populate it with the code and QR
        const bookingDetailsContent = document.getElementById('booking-details-content');
        if (bookingDetailsContent && bookingDetailsContent.children.length === 0) {
            // Create the booking details HTML similar to displayBookingDetails for seat bookings
            const passengerCount = booking.passenger_count || 1;
            bookingDetailsContent.innerHTML = `
                <div class="booking-type-seat">
                    <i class="ri-user-line"></i>
                    <h4>Seat Booking</h4>
                    <p>You have booked <strong>${passengerCount}</strong> seat${passengerCount > 1 ? 's' : ''} for this trip.</p>
                    
                    <div class="parcel-code-section" style="margin-top: 2rem;">
                        <h5><i class="ri-qr-code-line"></i> Booking Confirmation Code</h5>
                        <p style="color: #666; font-size: 0.9rem; margin-bottom: 0.75rem;">Keep this code for your records. You may be asked to verify this code when boarding.</p>
                        <div class="parcel-secret-code">${bookingCode}</div>
                        <div class="parcel-qr-code">
                            <img src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(bookingCode)}" alt="Booking QR Code">
                        </div>
                    </div>
                </div>
            `;
        }
    }
    
    // ===== PAYMENT INFORMATION CARD =====
    // Get the most recent payment
    const payments = booking.payments || [];
    
    // Check if payment info section already exists, remove it to recreate
    const existingPaymentInfo = document.querySelector('.payment-info-section');
    if (existingPaymentInfo) {
        existingPaymentInfo.remove();
    }
    
    // Get the container where payment info should be added (after booking details card)
    const bookingDetailsCard = document.getElementById('booking-details-card');
    if (bookingDetailsCard && payments.length > 0) {
        const payment = payments[0]; // Most recent payment (already sorted DESC)
        
        const paymentMethod = payment.payment_method || 'card';
        const paymentDate = payment.created_at ? new Date(payment.created_at) : new Date();
        const amountPaid = parseFloat(payment.amount || 0);
        
        // Create payment info section HTML
        const paymentInfoHTML = `
            <div class="trip-details-card payment-info-section" style="margin-top: 2rem;">
                <div class="trip-card-header">
                    <h3><i class="ri-money-dollar-circle-line"></i> Payment Information</h3>
                </div>
                <div class="trip-info-grid">
                    <div class="trip-info-item">
                        <i class="ri-bank-card-line"></i>
                        <div>
                            <strong>Payment Method</strong>
                            <p>${paymentMethod.charAt(0).toUpperCase() + paymentMethod.slice(1)}</p>
                        </div>
                    </div>
                    <div class="trip-info-item">
                        <i class="ri-calendar-check-line"></i>
                        <div>
                            <strong>Payment Date</strong>
                            <p>${paymentDate.toLocaleDateString()} ${paymentDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                        </div>
                    </div>
                    <div class="trip-info-item">
                        <i class="ri-money-cny-circle-line"></i>
                        <div>
                            <strong>Amount Paid</strong>
                            <p>R${amountPaid.toFixed(2)}</p>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Insert payment info section after booking details card
        bookingDetailsCard.insertAdjacentHTML('afterend', paymentInfoHTML);
    } else if (payments.length === 0) {
        // If no payments, we can optionally show a message or hide the section
        console.log('No payment information available for this booking');
    }
    
    // Update trip status badge
    const statusBadge = document.getElementById('trip-status-badge');
    if (statusBadge) {
        if (booking.booking_status === 'paid') {
            statusBadge.textContent = 'Paid';
        } else if (booking.booking_status === 'pending') {
            statusBadge.textContent = 'Pending';
        } else if (booking.booking_status === 'confirmed') {
            statusBadge.textContent = 'Confirmed';
        } else {
            statusBadge.textContent = booking.booking_status || 'Active';
        }
    }
}

// Generate trip share link
function generateTripShareLink(tripData) {
    const tripId = tripData.tripId || 'TRP' + Date.now().toString(36) + Math.random().toString(36).substr(2, 5).toUpperCase();
    const baseUrl = window.location.origin;
    const shareLink = `${baseUrl}/pages/customer/booking-public.html?join=${tripId}`;
    
    const linkInput = document.getElementById('trip-share-link');
    if (linkInput) {
        linkInput.value = shareLink;
    }
}

// Copy trip link to clipboard
function copyTripLink() {
    const linkInput = document.getElementById('trip-share-link');
    const feedback = document.getElementById('copy-feedback');
    
    if (!linkInput || !linkInput.value) {
        alert('No trip link available');
        return;
    }
    
    linkInput.select();
    linkInput.setSelectionRange(0, 99999); // For mobile devices
    
    navigator.clipboard.writeText(linkInput.value).then(() => {
        feedback.style.display = 'flex';
        setTimeout(() => {
            feedback.style.display = 'none';
        }, 3000);
    }).catch(err => {
        console.error('Failed to copy:', err);
        alert('Failed to copy link. Please copy manually.');
    });
}

// Share via WhatsApp
function shareViaWhatsApp() {
    const link = document.getElementById('trip-share-link').value;
    const routeName = document.getElementById('trip-route-display').textContent;
    const seatsAvailable = document.getElementById('trip-seats-available').textContent;
    const message = `🚖 Join my trip on TeksiMap!\n\nRoute: ${routeName}\nSeats Available: ${seatsAvailable}\n\nOnly logged-in users can join. Click the link below:\n${link}`;
    
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
}

// Share via Email
function shareViaEmail() {
    const link = document.getElementById('trip-share-link').value;
    const routeName = document.getElementById('trip-route-display').textContent;
    const seatsAvailable = document.getElementById('trip-seats-available').textContent;
    const subject = `Join my trip: ${routeName}`;
    const body = `Hi!\n\nI've created a trip on TeksiMap and I'd like to invite you to join.\n\nRoute: ${routeName}\nSeats Available: ${seatsAvailable}\n\nNote: You need to be logged in to TeksiMap to join this trip.\n\nJoin here: ${link}\n\nSee you on the trip!`;
    
    const mailtoUrl = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.href = mailtoUrl;
}

// Share via SMS
function shareViaSMS() {
    const link = document.getElementById('trip-share-link').value;
    const routeName = document.getElementById('trip-route-display').textContent;
    const seatsAvailable = document.getElementById('trip-seats-available').textContent;
    const message = `Join my trip on TeksiMap! Route: ${routeName}. ${seatsAvailable} seats available. Login required: ${link}`;
    
    const smsUrl = `sms:?body=${encodeURIComponent(message)}`;
    window.location.href = smsUrl;
}

// Show QR Code
function showQRCode() {
    const link = document.getElementById('trip-share-link').value;
    const qrModal = document.getElementById('qr-modal');
    const qrContainer = document.getElementById('qr-code-container');
    
    if (!link) {
        alert('No trip link available');
        return;
    }
    
    qrContainer.innerHTML = '';
    
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(link)}`;
    
    const qrImage = document.createElement('img');
    qrImage.src = qrCodeUrl;
    qrImage.alt = 'Trip QR Code';
    qrImage.style.width = '250px';
    qrImage.style.height = '250px';
    qrImage.style.borderRadius = '12px';
    
    qrContainer.appendChild(qrImage);
    qrModal.style.display = 'flex';
}

// Close QR Modal
function closeQRModal() {
    document.getElementById('qr-modal').style.display = 'none';
}

// Simulate passengers joining (for demo)
function simulatePassengersJoining(currentPassengers) {
    const joinedPassengersList = document.getElementById('joined-passengers-list');
    const joinedPassengersCard = document.getElementById('joined-passengers-card');
    
    // Return early if cards have been removed
    if (!joinedPassengersList || !joinedPassengersCard) {
        return;
    }
    
    if (currentPassengers < 15) {
        const sampleJoiners = [
            { name: 'John Doe', passengers: 2, time: '5 minutes ago' },
            { name: 'Sarah Smith', passengers: 3, time: '15 minutes ago' }
        ];
        
        joinedPassengersList.innerHTML = '';
        sampleJoiners.forEach((joiner) => {
            joinedPassengersList.innerHTML += `
                <div class="passenger-joined-item">
                    <div class="passenger-joined-info">
                        <div class="passenger-avatar">${joiner.name.charAt(0)}</div>
                        <div class="passenger-joined-details">
                            <strong>${joiner.name}</strong>
                            <span>Joined ${joiner.time}</span>
                        </div>
                    </div>
                    <div class="passenger-count-badge">${joiner.passengers} passenger${joiner.passengers > 1 ? 's' : ''}</div>
                </div>
            `;
        });
        
        joinedPassengersCard.style.display = 'block';
    } else {
        joinedPassengersCard.style.display = 'none';
    }
}

// Initialize Google Map for trip route
let tripRouteMap = null;
let pickupMarkers = [];
let dropoffMarkers = [];
let routePolyline = null;

function initializeTripMap(data, route) {
    const mapContainer = document.getElementById('trip-route-map');
    if (!mapContainer) return;
    
    // Wait for Google Maps API to load
    if (typeof google === 'undefined' || !google.maps) {
        setTimeout(() => initializeTripMap(data, route), 100);
        return;
    }
    
    // Get center point (average of all pickup/dropoff points or route center)
    let centerLat = 0;
    let centerLng = 0;
    let bounds = new google.maps.LatLngBounds();
    
    // Add pickup points to bounds
    if (data.pickupPoints && data.pickupPoints.length > 0) {
        data.pickupPoints.forEach(point => {
            if (point.lat && point.lng) {
                const latlng = new google.maps.LatLng(point.lat, point.lng);
                bounds.extend(latlng);
                centerLat += point.lat;
                centerLng += point.lng;
            }
        });
    }
    
    // Add dropoff points to bounds
    if (data.dropoffPoints && data.dropoffPoints.length > 0) {
        data.dropoffPoints.forEach(point => {
            if (point.lat && point.lng) {
                const latlng = new google.maps.LatLng(point.lat, point.lng);
                bounds.extend(latlng);
                centerLat += point.lat;
                centerLng += point.lng;
            }
        });
    }
    
    // Calculate center
    const totalPoints = (data.pickupPoints?.length || 0) + (data.dropoffPoints?.length || 0);
    if (totalPoints > 0) {
        centerLat /= totalPoints;
        centerLng /= totalPoints;
    } else {
        // Use route center as fallback
        centerLat = (route.coordinates.start[1] + route.coordinates.end[1]) / 2;
        centerLng = (route.coordinates.start[0] + route.coordinates.end[0]) / 2;
    }
    
    // Initialize map
    tripRouteMap = new google.maps.Map(mapContainer, {
        center: { lat: centerLat, lng: centerLng },
        zoom: 12,
        mapTypeId: 'roadmap',
        styles: [
            {
                featureType: 'poi',
                elementType: 'labels',
                stylers: [{ visibility: 'off' }]
            }
        ]
    });
    
    // Clear existing markers
    pickupMarkers.forEach(marker => marker.setMap(null));
    dropoffMarkers.forEach(marker => marker.setMap(null));
    pickupMarkers = [];
    dropoffMarkers = [];
    
    if (routePolyline) {
        routePolyline.setMap(null);
    }
    
    // Add pickup markers
    if (data.pickupPoints && data.pickupPoints.length > 0) {
        data.pickupPoints.forEach((point, index) => {
            if (point.lat && point.lng) {
                const marker = new google.maps.Marker({
                    position: { lat: point.lat, lng: point.lng },
                    map: tripRouteMap,
                    title: point.address || `Pickup ${index + 1}`,
                    icon: {
                        path: google.maps.SymbolPath.CIRCLE,
                        scale: 10,
                        fillColor: '#28a745',
                        fillOpacity: 1,
                        strokeColor: '#ffffff',
                        strokeWeight: 3
                    },
                    label: {
                        text: `${index + 1}`,
                        color: '#ffffff',
                        fontSize: '12px',
                        fontWeight: 'bold'
                    }
                });
                
                const infoWindow = new google.maps.InfoWindow({
                    content: `<div style="padding: 0.5rem;"><strong>Pickup ${index + 1}</strong><br>${point.address || ''}</div>`
                });
                
                marker.addListener('click', () => {
                    infoWindow.open(tripRouteMap, marker);
                });
                
                pickupMarkers.push(marker);
            }
        });
    }
    
    // Add dropoff markers
    if (data.dropoffPoints && data.dropoffPoints.length > 0) {
        data.dropoffPoints.forEach((point, index) => {
            if (point.lat && point.lng) {
                const marker = new google.maps.Marker({
                    position: { lat: point.lat, lng: point.lng },
                    map: tripRouteMap,
                    title: point.address || `Dropoff ${index + 1}`,
                    icon: {
                        path: google.maps.SymbolPath.CIRCLE,
                        scale: 10,
                        fillColor: '#dc3545',
                        fillOpacity: 1,
                        strokeColor: '#ffffff',
                        strokeWeight: 3
                    },
                    label: {
                        text: `${index + 1}`,
                        color: '#ffffff',
                        fontSize: '12px',
                        fontWeight: 'bold'
                    }
                });
                
                const infoWindow = new google.maps.InfoWindow({
                    content: `<div style="padding: 0.5rem;"><strong>Dropoff ${index + 1}</strong><br>${point.address || ''}</div>`
                });
                
                marker.addListener('click', () => {
                    infoWindow.open(tripRouteMap, marker);
                });
                
                dropoffMarkers.push(marker);
            }
        });
    }
    
    // Fit bounds to show all markers
    if (pickupMarkers.length > 0 || dropoffMarkers.length > 0) {
        tripRouteMap.fitBounds(bounds);
        // Add some padding
        const listener = google.maps.event.addListener(tripRouteMap, 'bounds_changed', () => {
            if (tripRouteMap.getZoom() > 15) tripRouteMap.setZoom(15);
            google.maps.event.removeListener(listener);
        });
    }
}

// Display booking details (seat or parcels)
function displayBookingDetails(data) {
    const bookingDetailsContent = document.getElementById('booking-details-content');
    if (!bookingDetailsContent) return;
    
    const bookingType = data.bookingType || (data.parcels > 0 ? 'parcels' : 'passengers');
    
    if (bookingType === 'parcels' && data.parcelData) {
        // Display parcel details
        let parcelsHTML = '<div class="parcel-details-grid">';
        
        Object.keys(data.parcelData).forEach((key, index) => {
            const parcel = data.parcelData[key];
            const parcelNum = parseInt(key);
            
            // Generate code if it doesn't exist
            const parcelCode = parcel.secretCode || generateSecretCode();
            
            parcelsHTML += `
                <div class="parcel-card-status">
                    <div class="parcel-header-status">
                        <h4><i class="ri-box-3-line"></i> Parcel ${parcelNum}</h4>
                        <span class="parcel-size-badge">${parcel.size || 'small'}</span>
                    </div>
                    
                    ${parcel.images && parcel.images.length > 0 ? `
                        <div class="parcel-images-status">
                            ${Array.from(parcel.images).map((img, imgIndex) => {
                                let imgSrc = '';
                                if (img instanceof File) {
                                    imgSrc = URL.createObjectURL(img);
                                } else if (typeof img === 'string') {
                                    imgSrc = img; // Already base64 or URL
                                }
                                return imgSrc ? `<img src="${imgSrc}" alt="Parcel ${parcelNum} Image ${imgIndex + 1}" class="parcel-image-status">` : '';
                            }).join('')}
                        </div>
                    ` : '<p style="color: #999; text-align: center; padding: 1rem;">No images available</p>'}
                    
                    <div class="parcel-info-item">
                        <strong><i class="ri-user-line"></i> Sender</strong>
                        <span>${parcel.senderName || 'N/A'}</span>
                    </div>
                    
                    <div class="parcel-info-item">
                        <strong><i class="ri-phone-line"></i> Sender Phone</strong>
                        <span>${parcel.senderPhone || 'N/A'}</span>
                    </div>
                    
                    <div class="parcel-info-item">
                        <strong><i class="ri-user-received-line"></i> Receiver</strong>
                        <span>${parcel.receiverName || 'N/A'}</span>
                    </div>
                    
                    <div class="parcel-info-item">
                        <strong><i class="ri-phone-line"></i> Receiver Phone</strong>
                        <span>${parcel.receiverPhone || 'N/A'}</span>
                    </div>
                    
                    <div class="parcel-code-section">
                        <h5><i class="ri-lock-line"></i> Delivery Confirmation Code</h5>
                        <div class="parcel-secret-code">${parcelCode}</div>
                        <p style="color: #666; font-size: 0.9rem; margin: 0.5rem 0;">Share this code with the receiver. The driver will ask for this code upon delivery.</p>
                        <div class="parcel-qr-code">
                            <img src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(parcelCode)}" alt="Parcel QR Code">
                        </div>
                    </div>
                </div>
            `;
        });
        
        parcelsHTML += '</div>';
        bookingDetailsContent.innerHTML = parcelsHTML;
    } else {
        // Display seat booking with code and QR code
        const seatsBooked = data.passengers || 1;
        // Generate code if it doesn't exist
        const seatCode = data.seatSecretCode || generateSecretCode();
        
        bookingDetailsContent.innerHTML = `
            <div class="booking-type-seat">
                <i class="ri-user-line"></i>
                <h4>Seat Booking</h4>
                <p>You have booked <strong>${seatsBooked}</strong> seat${seatsBooked > 1 ? 's' : ''} for this trip.</p>
                
                <div class="parcel-code-section" style="margin-top: 2rem;">
                    <h5><i class="ri-qr-code-line"></i> Booking Confirmation Code</h5>
                    <p style="color: #666; font-size: 0.9rem; margin-bottom: 0.75rem;">Keep this code for your records. You may be asked to verify this code when boarding.</p>
                    <div class="parcel-secret-code">${seatCode}</div>
                    <div class="parcel-qr-code">
                        <img src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(seatCode)}" alt="Booking QR Code">
                    </div>
                </div>
            </div>
        `;
    }
}

// Display payment information and refund button
function displayPaymentInfo(data) {
    // Check if payment info already exists
    const existingPaymentInfo = document.querySelector('.payment-info-section');
    if (existingPaymentInfo) {
        existingPaymentInfo.remove();
    }
    
    const bookingDetailsCard = document.getElementById('booking-details-card');
    if (!bookingDetailsCard) return;
    
    // Get payment amount
    const totalAmount = data.totalAmount || (data.pricePerPerson || 450) * (data.passengers || data.parcels || 1);
    const paymentMethod = data.paymentMethod || 'card';
    const paymentDate = data.paymentDate ? new Date(data.paymentDate).toLocaleDateString() : new Date().toLocaleDateString();
    
    // Create payment info section
    const paymentInfoHTML = `
        <div class="trip-details-card payment-info-section" style="margin-top: 2rem;">
            <div class="trip-card-header">
                <h3><i class="ri-money-dollar-circle-line"></i> Payment Information</h3>
            </div>
            <div class="trip-info-grid">
                <div class="trip-info-item">
                    <i class="ri-money-cny-circle-line"></i>
                    <div>
                        <strong>Amount Paid</strong>
                        <p>R${totalAmount.toFixed(2)}</p>
                    </div>
                </div>
                <div class="trip-info-item">
                    <i class="ri-bank-card-line"></i>
                    <div>
                        <strong>Payment Method</strong>
                        <p>${paymentMethod.charAt(0).toUpperCase() + paymentMethod.slice(1)}</p>
                    </div>
                </div>
                <div class="trip-info-item">
                    <i class="ri-calendar-check-line"></i>
                    <div>
                        <strong>Payment Date</strong>
                        <p>${paymentDate}</p>
                    </div>
                </div>
            </div>
            <div style="margin-top: 1.5rem; padding-top: 1.5rem; border-top: 2px solid #f0f0f0;">
                <button class="btn btn-secondary" onclick="requestRefund('${data.id || data.bookingId || ''}', ${totalAmount})" style="width: 100%; background: linear-gradient(135deg, #dc3545 0%, #c82333 100%); color: white; border: none;">
                    <i class="ri-refund-2-line"></i> Request Refund
                </button>
            </div>
        </div>
    `;
    
    // Insert payment info after booking details
    bookingDetailsCard.insertAdjacentHTML('afterend', paymentInfoHTML);
}

// Request refund function
function requestRefund(bookingId, amount) {
    if (!confirm(`Are you sure you want to request a refund for R${amount.toFixed(2)}?`)) {
        return;
    }
    
    // In production, this would call an API endpoint
    alert(`Refund request submitted for R${amount.toFixed(2)}. You will receive a confirmation email shortly.`);
    
    // Simulate refund processing
    console.log('Refund requested for booking:', bookingId, 'Amount:', amount);
}

// Initialize page when DOM is loaded
document.addEventListener('DOMContentLoaded', async () => {
    await loadTripData();
    
    // Refresh trip data every 30 seconds (in production, this would be WebSocket updates)
    setInterval(() => {
        loadTripData();
    }, 30000);
});

