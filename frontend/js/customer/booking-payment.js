// Booking Payment JavaScript

let selectedPaymentMethod = null;
let bookingData = null;

// Check if user is authenticated
function isUserAuthenticated() {
    const userProfile = localStorage.getItem('userProfile');
    return userProfile !== null;
}

// Load booking data from localStorage and sessionStorage
function loadBookingData() {
    // Check if user is authenticated first
    if (!isUserAuthenticated()) {
        console.log('User not authenticated, storing booking data...');
        // Store current booking data temporarily for after login
        const currentBooking = sessionStorage.getItem('currentBooking');
        console.log('Current booking data:', currentBooking);
        if (currentBooking) {
            // Store booking data temporarily
            sessionStorage.setItem('pendingBookingData', currentBooking);
            console.log('Stored pending booking data for authentication');
        } else {
            console.log('No current booking data found to store');
        }
        
        // Show authentication required message
        showAuthenticationRequired();
        return;
    }
    
    // First check sessionStorage for current booking
    const currentBooking = sessionStorage.getItem('currentBooking');
    if (currentBooking) {
        try {
            bookingData = JSON.parse(currentBooking);
            displayBookingSummary();
            return;
        } catch (error) {
            console.error('Error loading current booking from sessionStorage:', error);
        }
    }
    
    // Then check localStorage for payment data
    const paymentData = localStorage.getItem('paymentData');
    if (paymentData) {
        try {
            bookingData = JSON.parse(paymentData);
            displayBookingSummary();
            return;
        } catch (error) {
            console.error('Error loading booking data:', error);
            alert('Unable to load booking information. Please try again.');
            window.location.href = '/pages/customer/booking-public.html';
        }
    }
    
    // If no payment data, check for active trip data
    const tripData = localStorage.getItem('activeTripData');
    if (tripData) {
        try {
            const parsedData = JSON.parse(tripData);
            bookingData = {
                routeName: parsedData.routeName,
                passengers: parsedData.passengers,
                pricePerPerson: parsedData.pricePerPerson || 450,
                pickupPoints: parsedData.pickupPoints?.map(p => p.address) || [],
                dropoffPoints: parsedData.dropoffPoints?.map(p => p.address) || []
            };
            displayBookingSummary();
            return;
        } catch (error) {
            console.error('Error loading trip data:', error);
            alert('Unable to load booking information.');
            window.location.href = '/pages/customer/booking-type-selection.html';
        }
    }
    
    // If no data found anywhere
    alert('No booking information found. Please start a new booking.');
    window.location.href = '/pages/customer/booking-type-selection.html';
}

// Show authentication required message
function showAuthenticationRequired() {
    // Hide payment content
    const paymentContent = document.getElementById('payment-content');
    const paymentSuccess = document.getElementById('payment-success');
    
    if (paymentContent) paymentContent.style.display = 'none';
    if (paymentSuccess) paymentSuccess.style.display = 'none';
    
    // Show authentication required message
    const authRequiredDiv = document.getElementById('auth-required');
    if (authRequiredDiv) {
        authRequiredDiv.style.display = 'block';
    }
}

// Display booking summary
function displayBookingSummary() {
    if (!bookingData) return;
    
    const pricePerPerson = bookingData.pricePerPerson || 450;
    const passengers = bookingData.passengers || 1;
    const totalAmount = pricePerPerson * passengers;
    
    document.getElementById('summary-route').textContent = bookingData.routeName || '-';
    document.getElementById('summary-passengers').textContent = passengers;
    document.getElementById('summary-price-per').textContent = `R${pricePerPerson}`;
    document.getElementById('summary-total').textContent = `R${totalAmount}`;
    
    // Generate payment reference
    const reference = 'TKS' + Date.now().toString().slice(-8);
    const referenceInput = document.getElementById('payment-reference');
    if (referenceInput) {
        referenceInput.value = reference;
    }
}

// Select payment method
function selectPaymentMethod(method) {
    selectedPaymentMethod = method;
    
    // Remove selection from all cards
    document.querySelectorAll('.payment-method-card').forEach(card => {
        card.classList.remove('selected');
    });
    
    // Hide all forms
    document.querySelectorAll('.payment-form').forEach(form => {
        form.classList.remove('show');
    });
    
    // Select the chosen method
    document.querySelector('.payment-method-card[onclick*="' + method + '"]').classList.add('selected');
    
    // Show the corresponding form
    const formId = method + '-form';
    const form = document.getElementById(formId);
    if (form) {
        form.classList.add('show');
    }
    
    // Enable pay button
    document.getElementById('pay-button').disabled = false;
}

// Process payment
function processPayment() {
    if (!selectedPaymentMethod) {
        alert('Please select a payment method');
        return;
    }
    
    // Validate form inputs based on selected method
    if (selectedPaymentMethod === 'card') {
        const cardNumber = document.getElementById('card-number').value;
        const cardName = document.getElementById('card-name').value;
        const cardExpiry = document.getElementById('card-expiry').value;
        const cardCVV = document.getElementById('card-cvv').value;
        
        if (!cardNumber || !cardName || !cardExpiry || !cardCVV) {
            alert('Please fill in all card details');
            return;
        }
        
        // Basic validation
        if (cardNumber.replace(/\s/g, '').length < 15) {
            alert('Please enter a valid card number');
            return;
        }
    } else if (selectedPaymentMethod === 'mobile') {
        const mobileNumber = document.getElementById('mobile-number').value;
        
        if (!mobileNumber) {
            alert('Please enter your mobile number');
            return;
        }
    }
    
    // Show processing state
    const payButton = document.getElementById('pay-button');
    payButton.disabled = true;
    payButton.innerHTML = '<i class="ri-loader-4-line"></i> Processing Payment...';
    
    // Simulate payment processing
    setTimeout(() => {
        completePayment();
    }, 2000);
}

// Complete payment
function completePayment() {
    // Hide payment content
    document.getElementById('payment-content').style.display = 'none';
    
    // Show success message
    document.getElementById('payment-success').classList.add('show');
    
    // Reveal vehicle information
    revealVehicleInfo();
    
    // Update booking status to 'paid'
    if (bookingData && bookingData.bookingId) {
        const userBookings = JSON.parse(localStorage.getItem('userBookings') || '[]');
        const bookingIndex = userBookings.findIndex(b => b.id === bookingData.bookingId);
        
        if (bookingIndex !== -1) {
            userBookings[bookingIndex].status = 'paid';
            userBookings[bookingIndex].paymentMethod = selectedPaymentMethod;
            userBookings[bookingIndex].paymentDate = new Date().toISOString();
            localStorage.setItem('userBookings', JSON.stringify(userBookings));
        }
    }
    
    // Remove both active trip and payment data from localStorage (payment completed)
    localStorage.removeItem('activeTripData');
    localStorage.removeItem('paymentData');
    
    // Store completed booking for confirmation page
    const completedBooking = {
        ...bookingData,
        paymentMethod: selectedPaymentMethod,
        paymentDate: new Date().toISOString(),
        bookingReference: 'TKS' + Date.now().toString().slice(-8)
    };
    localStorage.setItem('completedBooking', JSON.stringify(completedBooking));
    
    // ALSO store in sessionStorage for confirmation page
    sessionStorage.setItem('currentBooking', JSON.stringify(completedBooking));
    
    // Redirect to confirmation page after a short delay
    setTimeout(() => {
        window.location.href = 'booking-confirmation.html';
    }, 3000);
    
    // In production, this would:
    // 1. Process actual payment
    // 2. Save booking to database
    // 3. Send confirmation email
    // 4. Notify driver/owner
}

// Reveal vehicle information
function revealVehicleInfo() {
    const imageContainer = document.getElementById('vehicle-image-container');
    const blurOverlay = document.getElementById('blur-overlay');
    const vehicleDetails = document.getElementById('vehicle-details');
    
    // Reveal image
    imageContainer.classList.add('revealed');
    blurOverlay.classList.add('hidden');
    
    // Reveal details
    vehicleDetails.classList.add('revealed');
}

// Format card number input
document.addEventListener('DOMContentLoaded', function() {
    const cardNumberInput = document.getElementById('card-number');
    
    if (cardNumberInput) {
        cardNumberInput.addEventListener('input', function(e) {
            let value = e.target.value.replace(/\s/g, '');
            let formattedValue = value.match(/.{1,4}/g)?.join(' ') || value;
            e.target.value = formattedValue;
        });
    }
    
    const cardExpiryInput = document.getElementById('card-expiry');
    
    if (cardExpiryInput) {
        cardExpiryInput.addEventListener('input', function(e) {
            let value = e.target.value.replace(/\D/g, '');
            if (value.length >= 2) {
                value = value.slice(0, 2) + '/' + value.slice(2, 4);
            }
            e.target.value = value;
        });
    }
    
    // Load booking data
    loadBookingData();
});

// Navigation functions
function toggleMobileMenu() {
    const mobileMenu = document.getElementById('mobileMenu');
    mobileMenu.classList.toggle('show');
}

function topNavZIndexDecrease() {
    // Function for navigation link clicks
}

// Make functions globally accessible
window.selectPaymentMethod = selectPaymentMethod;
window.processPayment = processPayment;
window.toggleMobileMenu = toggleMobileMenu;
window.topNavZIndexDecrease = topNavZIndexDecrease;

