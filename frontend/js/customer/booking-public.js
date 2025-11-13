// Booking Public - Route-Based Booking JavaScript

// Get Mapbox token from environment variable
const accessToken = import.meta.env.VITE_MAPBOX_TOKEN;

// State variables
let selectedRoute = null;
let passengerCount = 1;
let parcelCount = 0;
const MAX_TOTAL_CAPACITY = 15;
let currentStep = 1;
let map = null;
let tripOption = 'create'; // default to creating a new trip flow
let selectedTrip = null;
let selectedTripInfo = null;
let tripLocationsMap = null;
let pickupPoints = [];
let dropoffPoints = [];
let pickupCounter = 1;
let dropoffCounter = 1;
let parcelData = {}; // Store parcel data by unique ID
let desiredTripDate = '';
let lastLoadedTrips = [];
let bookingType = 'passengers'; // 'passengers' or 'parcels'
let deliveryWindow = null;
let notifyEarlyDelivery = false; // Whether user wants to be notified of earlier delivery

const PARCEL_FEATURE_ENABLED = true;

function sanitizeFieldValue(value) {
    if (value === null || value === undefined) {
        return '';
    }

    if (typeof value === 'string') {
        const trimmed = value.trim();
        if (trimmed.length === 0) {
            return '';
        }

        const lower = trimmed.toLowerCase();
        if (lower === 'null' || lower === 'undefined') {
            return '';
        }
        return trimmed;
    }

    return value;
}

function escapeAttribute(value) {
    if (value === null || value === undefined) {
        return '';
    }

    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

if (!PARCEL_FEATURE_ENABLED) {
    try {
        if (sessionStorage.getItem('bookingType') === 'parcels') {
            sessionStorage.setItem('bookingType', 'passengers');
        }
        sessionStorage.removeItem('parcelCount');
        sessionStorage.removeItem('parcelData');
        sessionStorage.removeItem('notifyEarlyDelivery');
        sessionStorage.removeItem('deliveryWindow');
        localStorage.removeItem('pendingParcelBookings');
    } catch (error) {
        console.warn('Parcel state reset skipped:', error);
    }
}

// Extra-space policy (guaranteed parcel zone): total capacity equivalent to 4 Large + 1 Medium
// Equivalences: 1 Large = 2 Medium = 4 Small => totals: 4L + 1M = 9M = 18S
const EXTRA_SPACE_BASE = { large: 4, medium: 1, mediumEquivalent: 9, smallEquivalent: 18 };

// Calculate remaining extra space after usage
function calculateRemainingExtraSpace(usedLarge = 0, usedMedium = 0, usedSmall = 0) {
    // Convert everything to medium equivalent for calculation
    // Total capacity: 4L + 1M = 8M + 1M = 9M
    const totalMedium = EXTRA_SPACE_BASE.mediumEquivalent; // 9
    
    // Convert used space to medium equivalent
    // 1 Large = 2 Medium, 1 Small = 0.5 Medium
    const usedMediumEquivalent = (usedLarge * 2) + usedMedium + (usedSmall * 0.5);
    
    // Calculate remaining
    let remainingMedium = totalMedium - usedMediumEquivalent;
    
    if (remainingMedium <= 0) {
        return { large: 0, medium: 0, small: 0, mediumEquivalent: 0, smallEquivalent: 0 };
    }
    
    // Convert back to Large, Medium, Small
    // First, get the integer part for Large
    let remainingL = Math.floor(remainingMedium / 2);
    let remainingAfterLarge = remainingMedium - (remainingL * 2);
    
    // Handle remaining medium (could be fractional)
    let remainingM = Math.floor(remainingAfterLarge);
    let remainingS = 0;
    
    // If there's a fractional part, convert to small
    const fractionalPart = remainingAfterLarge % 1;
    if (fractionalPart > 0) {
        // 0.5 Medium = 1 Small
        remainingS = Math.round(fractionalPart * 2);
    }
    
    return {
        large: remainingL,
        medium: remainingM,
        small: remainingS,
        mediumEquivalent: Math.round(remainingMedium * 2) / 2, // Round to 0.5 for display
        smallEquivalent: Math.round(remainingMedium * 2)
    };
}

// Sample route data
const routes = {
    'jhb-ct': {
        name: 'Johannesburg → Cape Town',
        distance: 1400,
        duration: 14,
        price: 450,
        capacity: 20,
        occupied: 4,
        departure: 'Flexible timing',
        coordinates: {
            start: [28.0475, -26.2041],
            end: [18.4241, -33.9249]
        }
    },
    'jhb-dbn': {
        name: 'Johannesburg → Durban',
        distance: 560,
        duration: 6,
        price: 280,
        capacity: 16,
        occupied: 8,
        departure: 'Flexible timing',
        coordinates: {
            start: [28.0475, -26.2041],
            end: [31.0292, -29.8587]
        }
    },
    'ct-dbn': {
        name: 'Cape Town → Durban',
        distance: 1650,
        duration: 16,
        price: 520,
        capacity: 20,
        occupied: 8,
        departure: 'Flexible timing',
        coordinates: {
            start: [18.4241, -33.9249],
            end: [31.0292, -29.8587]
        }
    },
    'jhb-pe': {
        name: 'Johannesburg → Port Elizabeth',
        distance: 1050,
        duration: 11,
        price: 380,
        capacity: 16,
        occupied: 10,
        departure: 'Flexible timing',
        coordinates: {
            start: [28.0475, -26.2041],
            end: [25.6173, -33.9608]
        }
    }
};

// Initialize map
function initializeMap() {
    mapboxgl.accessToken = accessToken;
    
    map = new mapboxgl.Map({
        container: 'route-map',
        style: 'mapbox://styles/mapbox/streets-v12',
        center: [28.0475, -26.2041],
        zoom: 6
    });

    map.on('load', () => {
        // Add default markers
        addRouteMarkers();
    });
}

function addRouteMarkers() {
    if (!map) return;

    // Clear existing markers
    document.querySelectorAll('.mapboxgl-marker').forEach(marker => marker.remove());

    if (selectedRoute && routes[selectedRoute]) {
        const route = routes[selectedRoute];
        
        // Add start marker
        new mapboxgl.Marker({ color: '#FFD52F' })
            .setLngLat(route.coordinates.start)
            .addTo(map);

        // Add end marker
        new mapboxgl.Marker({ color: '#01386A' })
            .setLngLat(route.coordinates.end)
            .addTo(map);

        // Fit map to show both points
        const bounds = new mapboxgl.LngLatBounds();
        bounds.extend(route.coordinates.start);
        bounds.extend(route.coordinates.end);
        map.fitBounds(bounds, { padding: 50 });
    }
}

function selectRoute(routeId) {
    // Remove previous selection
    document.querySelectorAll('.route-card').forEach(card => {
        card.classList.remove('selected');
    });

    // Select new route
    document.querySelector(`[data-route="${routeId}"]`).classList.add('selected');
    selectedRoute = routeId;
    tripOption = 'create';

    // Update map
    addRouteMarkers();

    // Check for early delivery notification BEFORE proceeding
    // If notification needs to be shown, don't proceed yet
    const shouldProceed = checkForEarlyDeliveryAndWait(routeId);
    
    if (shouldProceed) {
        // Enable next step after a delay
        setTimeout(() => {
            nextStep();
        }, 500);
    }
}

// Check for early delivery and wait for user response
function checkForEarlyDeliveryAndWait(routeId) {
    const savedBookingType = sessionStorage.getItem('bookingType');
    const savedNotifyEarly = sessionStorage.getItem('notifyEarlyDelivery') === 'true';
    const savedDeliveryWindow = sessionStorage.getItem('deliveryWindow');
    const savedParcelData = sessionStorage.getItem('parcelData');
    const pendingParcelBookings = JSON.parse(localStorage.getItem('pendingParcelBookings') || '[]');
    
    let matchingBooking = null;
    
    if (savedBookingType === 'parcels' && savedNotifyEarly && savedDeliveryWindow && savedParcelData) {
        matchingBooking = pendingParcelBookings.find(booking => 
            booking.routeId === routeId && 
            booking.deliveryWindow === savedDeliveryWindow &&
            booking.status === 'pending_early_delivery'
        );
    }
    
    if (!matchingBooking) {
        matchingBooking = pendingParcelBookings.find(booking => 
            booking.routeId === routeId && 
            booking.status === 'pending_early_delivery' &&
            booking.earlierTrip
        );
    }
    
    if (matchingBooking && matchingBooking.earlierTrip) {
        showEarlyDeliveryNotification(matchingBooking.earlierTrip, matchingBooking.deliveryWindow || savedDeliveryWindow, routeId);
        return false;
    }
    
    return true;
}

// Simulate background checking for earlier delivery trips
function simulateBackgroundEarlyDeliveryCheck() {
    const pendingParcelBookings = JSON.parse(localStorage.getItem('pendingParcelBookings') || '[]');
    const now = new Date();
    
    const sampleEarlierTrip = {
        id: 'TRIP_' + Date.now(),
        date: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000).toLocaleDateString(),
        time: '08:00',
        parcelSpace: 'Available',
        routeId: null,
        availableSpace: {
            large: 2,
            medium: 5,
            small: 12
        }
    };
    
    pendingParcelBookings.forEach((booking, index) => {
        if (booking.status === 'pending_early_delivery' && !booking.earlierTrip) {
            if (Math.random() < 0.3) {
                booking.earlierTrip = {
                    ...sampleEarlierTrip,
                    routeId: booking.routeId,
                    id: 'TRIP_' + Date.now() + '_' + index
                };
                booking.status = 'pending_early_delivery';
            }
        }
    });
    
    localStorage.setItem('pendingParcelBookings', JSON.stringify(pendingParcelBookings));
}

// Show early delivery notification
function showEarlyDeliveryNotification(earlierTrip, originalWindow, routeId) {
    const notificationBanner = document.getElementById('early-delivery-notification');
    if (!notificationBanner) return;
    
    let routeName = 'Selected Route';
    if (typeof routes !== 'undefined' && routes[routeId]) {
        routeName = routes[routeId].name;
    } else {
        const routeNames = {
            'jhb-ct': 'Johannesburg → Cape Town',
            'jhb-dbn': 'Johannesburg → Durban',
            'ct-dbn': 'Cape Town → Durban',
            'jhb-pe': 'Johannesburg → Port Elizabeth'
        };
        routeName = routeNames[routeId] || routeId || 'Selected Route';
    }
    
    const windowText = originalWindow === 'tuesday' ? 'Tuesday' : originalWindow === 'friday' ? 'Friday' : originalWindow || 'Your chosen date';
    
    let parcelSpaceText = earlierTrip.parcelSpace || 'Sufficient';
    if (earlierTrip.availableSpace) {
        const space = earlierTrip.availableSpace;
        parcelSpaceText = `Large: ${space.large || 0} | Medium: ${space.medium || 0} | Small: ${space.small || 0}`;
    }
    
    document.getElementById('early-delivery-route').textContent = routeName;
    document.getElementById('early-delivery-date').textContent = earlierTrip.date || 'Available Soon';
    document.getElementById('early-delivery-time').textContent = earlierTrip.time || 'To be confirmed';
    document.getElementById('early-delivery-space').textContent = parcelSpaceText;
    document.getElementById('original-delivery-window').textContent = windowText;
    
    window.pendingEarlyDelivery = {
        trip: earlierTrip,
        routeId: routeId,
        originalWindow: originalWindow
    };
    
    notificationBanner.style.display = 'block';
    
    setTimeout(() => {
        notificationBanner.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
}

// Accept early delivery
function acceptEarlyDelivery() {
    if (!window.pendingEarlyDelivery) {
        alert('Error: Early delivery information not found.');
        return;
    }
    
    const { trip, routeId, originalWindow } = window.pendingEarlyDelivery;
    
    sessionStorage.setItem('selectedEarlyDeliveryTrip', JSON.stringify(trip));
    sessionStorage.setItem('deliveryWindow', 'early');
    sessionStorage.setItem('originalDeliveryWindow', originalWindow);
    
    const pendingParcelBookings = JSON.parse(localStorage.getItem('pendingParcelBookings') || '[]');
    const bookingIndex = pendingParcelBookings.findIndex(booking => 
        booking.routeId === routeId && 
        booking.deliveryWindow === originalWindow &&
        booking.status === 'pending_early_delivery'
    );
    
    if (bookingIndex !== -1) {
        pendingParcelBookings[bookingIndex].status = 'accepted_early_delivery';
        pendingParcelBookings[bookingIndex].acceptedTrip = trip;
        localStorage.setItem('pendingParcelBookings', JSON.stringify(pendingBookings));
    }
    
    document.getElementById('early-delivery-notification').style.display = 'none';
    window.pendingEarlyDelivery = null;
    
    alert('Early delivery accepted! Proceeding to payment...');
    proceedToPayment();
}

// Decline early delivery
function declineEarlyDelivery() {
    if (!window.pendingEarlyDelivery) {
        return;
    }
    
    document.getElementById('early-delivery-notification').style.display = 'none';
    
    const { routeId, originalWindow } = window.pendingEarlyDelivery;
    const pendingParcelBookings = JSON.parse(localStorage.getItem('pendingParcelBookings') || '[]');
    const bookingIndex = pendingParcelBookings.findIndex(booking => 
        booking.routeId === routeId && 
        booking.deliveryWindow === originalWindow &&
        booking.status === 'pending_early_delivery'
    );
    
    if (bookingIndex !== -1) {
        pendingParcelBookings[bookingIndex].status = 'declined_early_delivery';
        localStorage.setItem('pendingParcelBookings', JSON.stringify(pendingBookings));
    }
    
    window.pendingEarlyDelivery = null;
}

// Make functions globally accessible
window.acceptEarlyDelivery = acceptEarlyDelivery;
window.declineEarlyDelivery = declineEarlyDelivery;

function nextStep() {
    if (currentStep < 3) {
        const activeStepEl = document.querySelector(`#step${currentStep}`);
        if (activeStepEl) {
            activeStepEl.classList.remove('active');
            activeStepEl.classList.add('completed');
        }

        const activeContent = document.querySelector('.booking-content.active');
        if (activeContent) {
            activeContent.classList.remove('active');
        }

        currentStep++;

        const nextStepEl = document.querySelector(`#step${currentStep}`);
        if (nextStepEl) {
            nextStepEl.classList.add('active');
        }
        
        if (currentStep === 2) {
            const passengerContent = document.getElementById('passenger-selection');
            if (passengerContent) {
                passengerContent.classList.add('active');
            }

            updatePassengerInfo();

            const dateInput = document.getElementById('desired-trip-date');
            if (dateInput && !dateInput.dataset.bound) {
                dateInput.addEventListener('change', () => {
                    if (bookingType === 'passengers') {
                        desiredTripDate = dateInput.value;
                    }
                });
                dateInput.dataset.bound = 'true';
            }
            
            if (!bookingType) {
                bookingType = 'passengers';
            }
                } else if (currentStep === 3) {
            const confirmationContent = document.getElementById('booking-confirmation');
            if (confirmationContent) {
                confirmationContent.classList.add('active');
            }
            updateBookingSummary();
        }
    }
}

function goBack() {
    if (currentStep > 1) {
        const activeStep = document.querySelector(`#step${currentStep}`);
        const activeContent = document.querySelector('.booking-content.active');
        if (activeStep) {
            activeStep.classList.remove('active');
        }
        if (activeContent) {
            activeContent.classList.remove('active');
        }
        currentStep--;

        const targetStep = document.querySelector(`#step${currentStep}`);
        if (targetStep) {
            targetStep.classList.remove('completed');
            targetStep.classList.add('active');
        }
        
        // Show the correct booking content by ID
        if (currentStep === 1) {
            const routeContent = document.getElementById('route-selection');
            if (routeContent) {
                routeContent.classList.add('active');
            }
        } else if (currentStep === 2) {
            const passengerContent = document.getElementById('passenger-selection');
            if (passengerContent) {
                passengerContent.classList.add('active');
            }
        } else if (currentStep === 3) {
            const confirmationContent = document.getElementById('booking-confirmation');
            if (confirmationContent) {
                confirmationContent.classList.add('active');
            updateBookingSummary();
            }
        }
    }
}

// Trip Selection Functions
function selectTripOption(option) {
    // Don't allow selecting join if user has 15 passengers
    if (option === 'join' && passengerCount >= 15) {
        return;
    }
    
    tripOption = option;
    
    // Remove selection from both cards
    document.getElementById('create-trip-option').classList.remove('selected');
    document.getElementById('join-trip-option').classList.remove('selected');
    
    // Select the chosen option
    if (option === 'create') {
        document.getElementById('create-trip-option').classList.add('selected');
        document.getElementById('available-trips-section').style.display = 'none';
        document.getElementById('create-trip-section').style.display = 'block';
        document.getElementById('continue-trip-btn').style.display = 'inline-flex';
        
        // Set city names based on route
        const route = routes[selectedRoute];
        const cities = route.name.split(' → ');
        document.getElementById('origin-city').textContent = cities[0];
        document.getElementById('destination-city').textContent = cities[1];
        document.getElementById('origin-city-pickup').textContent = cities[0];
        document.getElementById('destination-city-dropoff').textContent = cities[1];
        
        // Initialize trip locations map with slight delay to ensure DOM is ready
        setTimeout(() => {
            initializeTripLocationsMap();
        }, 100);
        
    } else if (option === 'join') {
        document.getElementById('join-trip-option').classList.add('selected');
        document.getElementById('create-trip-section').style.display = 'none';
        document.getElementById('continue-trip-btn').style.display = 'none';
        loadAvailableTrips();

        // Attempt auto-selection based on preferred date and capacity
        setTimeout(() => {
            autoSelectTripIfPossible();
        }, 0);
    }
}

// Initialize Trip Locations Map
function initializeTripLocationsMap() {
    if (tripLocationsMap) {
        tripLocationsMap.remove();
    }

    mapboxgl.accessToken = accessToken;
    
    const route = routes[selectedRoute];
    
    tripLocationsMap = new mapboxgl.Map({
        container: 'trip-locations-map',
        style: 'mapbox://styles/mapbox/streets-v11',
        center: route.coordinates.start,
        zoom: 12,
        pitch: 0,
        bearing: 0,
        interactive: true,
        dragRotate: false,
        touchZoomRotate: false,
        pitchWithRotate: false
    });

    // Disable pitch/rotation
    tripLocationsMap.touchZoomRotate.disableRotation();
    tripLocationsMap.dragRotate.disable();

    // Add navigation controls
    tripLocationsMap.addControl(new mapboxgl.NavigationControl(), 'top-right');
    
    // Add scale control
    tripLocationsMap.addControl(new mapboxgl.ScaleControl(), 'bottom-left');

    // Clear existing points
    pickupPoints = [];
    dropoffPoints = [];

    // Setup geocoding for all input fields after map loads
    tripLocationsMap.on('load', () => {
        setupLocationInputs();
        
        // Resize map to ensure proper rendering
        tripLocationsMap.resize();
        
        // Add initial marker for origin city
        new mapboxgl.Marker({ color: '#FFD52F', scale: 0.8 })
            .setLngLat(route.coordinates.start)
            .setPopup(new mapboxgl.Popup().setHTML(`
                <div style="padding: 8px;">
                    <strong>Origin: ${route.name.split(' → ')[0]}</strong>
                </div>
            `))
            .addTo(tripLocationsMap);
    });

    // Resize map after a short delay to ensure container is fully rendered
    setTimeout(() => {
        if (tripLocationsMap) {
            tripLocationsMap.resize();
        }
    }, 500);
}

// Setup location inputs with geocoding and autocomplete
function setupLocationInputs() {
    const route = routes[selectedRoute];
    const cities = route.name.split(' → ');
    
    // Setup autocomplete for all pickup inputs
    document.querySelectorAll('.pickup-input').forEach(input => {
        setupAutocomplete(input, 'pickup', cities[0]);
    });

    // Setup autocomplete for all dropoff inputs
    document.querySelectorAll('.dropoff-input').forEach(input => {
        setupAutocomplete(input, 'dropoff', cities[1]);
    });
}

// Setup autocomplete for a single input
function setupAutocomplete(input, type, city) {
    const index = input.dataset.index;
    const suggestionsId = `suggestions-${type}-${index}`;
    let suggestionsList = document.getElementById(suggestionsId);
    
    let debounceTimer;

    input.addEventListener('input', function() {
        clearTimeout(debounceTimer);
        const query = this.value.trim();

        if (query.length < 3) {
            suggestionsList.classList.remove('show');
            return;
        }

        debounceTimer = setTimeout(async () => {
            await fetchSuggestions(query, city, type, index);
        }, 300);
    });

    // Close suggestions when clicking outside
    document.addEventListener('click', function(e) {
        if (!input.contains(e.target) && !suggestionsList.contains(e.target)) {
            suggestionsList.classList.remove('show');
        }
    });
}

// Fetch suggestions from Mapbox API
async function fetchSuggestions(query, city, type, index) {
    const suggestionsId = `suggestions-${type}-${index}`;
    const suggestionsList = document.getElementById(suggestionsId);
    
    if (!suggestionsList) return;

    try {
        const response = await fetch(
            `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query + ' ' + city)}.json?access_token=${accessToken}&limit=5&country=ZA`
        );
        const data = await response.json();

        if (data.features && data.features.length > 0) {
            displaySuggestions(data.features, type, index, city);
        } else {
            suggestionsList.classList.remove('show');
        }
    } catch (error) {
        console.error('Error fetching suggestions:', error);
    }
}

// Display suggestions dropdown
function displaySuggestions(features, type, index, requiredCity) {
    const suggestionsId = `suggestions-${type}-${index}`;
    const suggestionsList = document.getElementById(suggestionsId);
    
    if (!suggestionsList) return;

    suggestionsList.innerHTML = '';

    features.forEach(feature => {
        const addressText = feature.place_name.toLowerCase();
        const isCorrectCity = addressText.includes(requiredCity.toLowerCase());

        if (isCorrectCity) {
            const suggestionItem = document.createElement('div');
            suggestionItem.className = 'suggestion-item';
            suggestionItem.innerHTML = `
                <i class="ri-map-pin-line"></i>
                <div class="suggestion-text">
                    <div class="main-text">${feature.text}</div>
                    <div class="sub-text">${feature.place_name}</div>
                </div>
            `;

            suggestionItem.addEventListener('click', () => {
                selectSuggestion(feature, type, index);
            });

            suggestionsList.appendChild(suggestionItem);
        }
    });

    if (suggestionsList.children.length > 0) {
        suggestionsList.classList.add('show');
    } else {
        suggestionsList.classList.remove('show');
    }
}

// Select a suggestion
function selectSuggestion(feature, type, index) {
    const input = document.querySelector(`.${type}-input[data-index="${index}"]`);
    const suggestionsId = `suggestions-${type}-${index}`;
    const suggestionsList = document.getElementById(suggestionsId);

    if (input) {
        input.value = feature.place_name;
        suggestionsList.classList.remove('show');

        // Add marker to map
        addMarkerToMap(feature, type, index);
    }
}

// Add marker to map from selected suggestion
function addMarkerToMap(feature, type, index) {
    const [lng, lat] = feature.center;
    const markerColor = type === 'pickup' ? '#FFD52F' : '#01386A';
    
    const marker = new mapboxgl.Marker({ color: markerColor })
        .setLngLat([lng, lat])
        .setPopup(new mapboxgl.Popup().setHTML(`
            <div style="padding: 8px; min-width: 200px;">
                <strong style="color: ${type === 'pickup' ? '#FFD52F' : '#01386A'};">${type === 'pickup' ? 'Pickup' : 'Drop-off'} Point</strong><br>
                <span style="font-size: 0.9rem;">${feature.place_name}</span>
            </div>
        `))
        .addTo(tripLocationsMap);

    // Store the point
    const point = {
        index: index,
        address: feature.place_name,
        coordinates: [lng, lat],
        marker: marker
    };

    if (type === 'pickup') {
        // Remove old marker if exists
        const existingIndex = pickupPoints.findIndex(p => p.index == index);
        if (existingIndex !== -1) {
            pickupPoints[existingIndex].marker.remove();
            pickupPoints[existingIndex] = point;
        } else {
            pickupPoints.push(point);
        }
    } else {
        // Remove old marker if exists
        const existingIndex = dropoffPoints.findIndex(p => p.index == index);
        if (existingIndex !== -1) {
            dropoffPoints[existingIndex].marker.remove();
            dropoffPoints[existingIndex] = point;
        } else {
            dropoffPoints.push(point);
        }
    }

    // Fit map to show all points
    fitMapToPoints();
}

// Fit map to show all points
function fitMapToPoints() {
    if (!tripLocationsMap) return;

    const allPoints = [...pickupPoints, ...dropoffPoints];
    if (allPoints.length === 0) return;

    const bounds = new mapboxgl.LngLatBounds();
    allPoints.forEach(point => {
        bounds.extend(point.coordinates);
    });

    tripLocationsMap.fitBounds(bounds, {
        padding: 100,
        maxZoom: 12
    });
}

// Add Pickup Point
function addPickupPoint() {
    const pickupList = document.getElementById('pickup-points-list');
    const newIndex = pickupCounter++;
    
    const newPickupHTML = `
        <div class="location-input-item" data-index="${newIndex}">
            <div class="location-input-container">
                <div class="location-input-wrapper">
                    <i class="ri-map-pin-fill location-input-icon"></i>
                    <input type="text" class="location-input pickup-input" placeholder="Enter pickup address in origin city..." data-index="${newIndex}" autocomplete="off">
                    <button class="remove-location-btn" onclick="removeLocation('pickup', ${newIndex})">
                        <i class="ri-close-circle-line"></i>
                    </button>
                </div>
                <div class="suggestions-list" id="suggestions-pickup-${newIndex}"></div>
            </div>
        </div>
    `;
    
    pickupList.insertAdjacentHTML('beforeend', newPickupHTML);
    updateRemoveButtons();
    
    // Setup autocomplete for the new input
    const route = routes[selectedRoute];
    const cities = route.name.split(' → ');
    const newInput = pickupList.querySelector(`input[data-index="${newIndex}"]`);
    setupAutocomplete(newInput, 'pickup', cities[0]);
}

// Add Drop-off Point
function addDropoffPoint() {
    const dropoffList = document.getElementById('dropoff-points-list');
    const newIndex = dropoffCounter++;
    
    const newDropoffHTML = `
        <div class="location-input-item" data-index="${newIndex}">
            <div class="location-input-container">
                <div class="location-input-wrapper">
                    <i class="ri-map-pin-fill location-input-icon"></i>
                    <input type="text" class="location-input dropoff-input" placeholder="Enter drop-off address in destination city..." data-index="${newIndex}" autocomplete="off">
                    <button class="remove-location-btn" onclick="removeLocation('dropoff', ${newIndex})">
                        <i class="ri-close-circle-line"></i>
                    </button>
                </div>
                <div class="suggestions-list" id="suggestions-dropoff-${newIndex}"></div>
            </div>
        </div>
    `;
    
    dropoffList.insertAdjacentHTML('beforeend', newDropoffHTML);
    updateRemoveButtons();
    
    // Setup autocomplete for the new input
    const route = routes[selectedRoute];
    const cities = route.name.split(' → ');
    const newInput = dropoffList.querySelector(`input[data-index="${newIndex}"]`);
    setupAutocomplete(newInput, 'dropoff', cities[1]);
}

// Remove Location
function removeLocation(type, index) {
    const listId = type === 'pickup' ? 'pickup-points-list' : 'dropoff-points-list';
    const item = document.querySelector(`#${listId} .location-input-item[data-index="${index}"]`);
    
    if (item) {
        // Remove marker from map
        if (type === 'pickup') {
            const pointIndex = pickupPoints.findIndex(p => p.index == index);
            if (pointIndex !== -1) {
                pickupPoints[pointIndex].marker.remove();
                pickupPoints.splice(pointIndex, 1);
            }
        } else {
            const pointIndex = dropoffPoints.findIndex(p => p.index == index);
            if (pointIndex !== -1) {
                dropoffPoints[pointIndex].marker.remove();
                dropoffPoints.splice(pointIndex, 1);
            }
        }

        item.remove();
        updateRemoveButtons();
        fitMapToPoints();
    }
}

// Update Remove Buttons Visibility
function updateRemoveButtons() {
    // Show/hide remove buttons for pickup points
    const pickupItems = document.querySelectorAll('#pickup-points-list .location-input-item');
    pickupItems.forEach((item, index) => {
        const removeBtn = item.querySelector('.remove-location-btn');
        if (pickupItems.length > 1) {
            removeBtn.style.display = 'flex';
        } else {
            removeBtn.style.display = 'none';
        }
    });

    // Show/hide remove buttons for drop-off points
    const dropoffItems = document.querySelectorAll('#dropoff-points-list .location-input-item');
    dropoffItems.forEach((item, index) => {
        const removeBtn = item.querySelector('.remove-location-btn');
        if (dropoffItems.length > 1) {
            removeBtn.style.display = 'flex';
        } else {
            removeBtn.style.display = 'none';
        }
    });
}

function loadAvailableTrips() {
    const availableTripsSection = document.getElementById('available-trips-section');
    const availableTripsList = document.getElementById('available-trips-list');
    const dateFilterInput = document.getElementById('trip-date-filter');
    
    if (!selectedRoute || !passengerCount) return;
    
    const route = routes[selectedRoute];
    // Calculate seats needed for passengers only
    const totalNeeded = passengerCount;
    
    // Update filter info
    document.getElementById('filter-route').textContent = route.name;
    document.getElementById('filter-passengers').textContent = passengerCount;
    document.getElementById('filter-seats-needed').textContent = Math.max(15 - passengerCount, 0);
    
    // Sample available trips (in production, this would come from an API)
    // Use dynamic dates so filters like "tomorrow" match the user's selected date
    const today = new Date();
    const toISO = (d) => {
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${dd}`;
    };
    const addDaysISO = (base, days) => {
        const d = new Date(base);
        d.setDate(d.getDate() + days);
        return toISO(d);
    };

    const availableTrips = [
        {
            id: 'trip-001',
            route: selectedRoute,
            organizer: 'John M.',
            currentPassengers: 5,
            seatsAvailable: 9,
            departureTime: 'Tomorrow 08:00 AM',
            departureDate: addDaysISO(today, 1),
            pricePerPerson: route.price,
            // Used extra space: 1 Medium + 1 Small (as per example)
            usedExtraSpace: { large: 0, medium: 1, small: 1 }
        },
        {
            id: 'trip-002',
            route: selectedRoute,
            organizer: 'Sarah K.',
            currentPassengers: 6,
            seatsAvailable: 8,
            departureTime: '10:00 AM',
            departureDate: addDaysISO(today, 5),
            pricePerPerson: route.price,
            // Used extra space: 2 Large (full large capacity used)
            usedExtraSpace: { large: 2, medium: 0, small: 0 }
        },
        {
            id: 'trip-003',
            route: selectedRoute,
            organizer: 'Mike T.',
            currentPassengers: 8,
            seatsAvailable: 6,
            departureTime: '2:00 PM',
            departureDate: addDaysISO(today, 7),
            pricePerPerson: route.price,
            // No extra space used (full capacity available)
            usedExtraSpace: { large: 0, medium: 0, small: 0 }
        }
    ];
    
    // Prefill date filter with preferred date if available and empty
    if (dateFilterInput && desiredTripDate && !dateFilterInput.value) {
        dateFilterInput.value = desiredTripDate;
    }

    // Filter trips that have enough seats
    let matchingTrips = availableTrips.filter(trip => 
        trip.route === selectedRoute && trip.seatsAvailable >= totalNeeded
    );

    // Apply date filter if provided
    const selectedDate = dateFilterInput && dateFilterInput.value ? dateFilterInput.value : '';
    if (selectedDate) {
        matchingTrips = matchingTrips.filter(trip => trip.departureDate === selectedDate);
    }
    
    // Save for later lookups
    lastLoadedTrips = matchingTrips;

    // Display trips
    availableTripsList.innerHTML = '';
    
    if (matchingTrips.length === 0) {
        // Build similar trips list based on closest date and capacity proximity
        const selectedDateStr = (dateFilterInput && dateFilterInput.value) ? dateFilterInput.value : desiredTripDate;
        const selectedDateObj = selectedDateStr ? new Date(selectedDateStr + 'T00:00:00') : null;

        const onRouteTrips = availableTrips.filter(t => t.route === selectedRoute);

        const scoredTrips = onRouteTrips.map(t => {
            const tDate = new Date(t.departureDate + 'T00:00:00');
            const dayDiff = selectedDateObj ? Math.abs(Math.round((tDate - selectedDateObj) / (1000*60*60*24))) : 9999;
            const hasCapacity = t.seatsAvailable >= totalNeeded;
            return { trip: t, dayDiff, hasCapacity };
        });

        // Prefer trips that meet capacity, then closest date
        scoredTrips.sort((a, b) => {
            if (a.hasCapacity !== b.hasCapacity) return a.hasCapacity ? -1 : 1;
            return a.dayDiff - b.dayDiff;
        });

        const suggestions = scoredTrips.slice(0, 5);

        let suggestionsHTML = `
            <div class="no-trips-message">
                <i class="ri-error-warning-line"></i>
                <h4>No Exact Match Found</h4>
                <p>We couldn't find a trip on ${selectedDateStr || 'your selected date'}. Here are the closest alternatives on this route${totalNeeded ? ` (needing ${totalNeeded} seats)` : ''}:</p>
            </div>
        `;

        if (suggestions.length === 0) {
            suggestionsHTML += `
                <div class="no-trips-message">
                    <p>No similar trips are available right now. You can create a new trip instead.</p>
                </div>
            `;
        } else {
            suggestions.forEach(({ trip, hasCapacity, dayDiff }) => {
                // Calculate remaining extra space
                const used = trip.usedExtraSpace || { large: 0, medium: 0, small: 0 };
                const remaining = calculateRemainingExtraSpace(used.large, used.medium, used.small);
                
                suggestionsHTML += `
                    <div class="available-trip-card" data-trip-id="${trip.id}" onclick="selectTrip('${trip.id}')">
                        <div class="available-trip-header">
                            <h4><i class="ri-map-pin-user-line"></i>Trip by ${trip.organizer}</h4>
                            <div style="display: flex; flex-direction: column; gap: 0.5rem; margin-top: 0.75rem;">
                                <div style="display: flex; align-items: center; gap: 0.5rem; padding: 0.5rem; background: #e3f2fd; border-radius: 6px;">
                                    <i class="ri-user-line" style="color: #01386A;"></i>
                                    <strong style="color: #01386A;">Seats available:</strong>
                                    <span style="font-weight: 700; color: #01386A; font-size: 1.1rem;">${trip.seatsAvailable}</span>
                                </div>
                                <div style="display: flex; align-items: center; gap: 0.5rem; padding: 0.5rem; background: #f3e5f5; border-radius: 6px; flex-wrap: wrap;">
                                    <i class="ri-box-3-line" style="color: #7b1fa2;"></i>
                                    <strong style="color: #7b1fa2;">Extra space available:</strong>
                                    <span style="color: #7b1fa2;">Large ${remaining.large} | Medium ${(remaining.large * 2) + remaining.medium} | Small ${(remaining.large * 4) + (remaining.medium * 2) + remaining.small}</span>
                                </div>
                            </div>
                        </div>
                        <div class="available-trip-details">
                            <div class="trip-detail-item">
                                <i class="ri-calendar-line"></i>
                                <span><strong>Date:</strong> ${trip.departureDate}${selectedDateObj ? ` (±${dayDiff} day${dayDiff===1?'':'s'})` : ''}</span>
                            </div>
                            <div class="trip-detail-item">
                                <i class="ri-time-line"></i>
                                <span><strong>Time:</strong> ${trip.departureTime}</span>
                            </div>
                            <div class="trip-detail-item">
                                <i class="ri-user-line"></i>
                                <span><strong>Capacity:</strong> ${trip.seatsAvailable} available${hasCapacity ? '' : ` (need ${totalNeeded})`}</span>
                            </div>
                            <div class="trip-detail-item">
                                <i class="ri-money-dollar-circle-line"></i>
                                <span><strong>R${trip.pricePerPerson}</strong> per person</span>
                            </div>
                        </div>
                    </div>
                `;
            });
        }

        availableTripsList.innerHTML = suggestionsHTML;
    } else {
        matchingTrips.forEach(trip => {
            // Calculate remaining extra space
            const used = trip.usedExtraSpace || { large: 0, medium: 0, small: 0 };
            const remaining = calculateRemainingExtraSpace(used.large, used.medium, used.small);
            
            const tripHTML = `
                <div class="available-trip-card" data-trip-id="${trip.id}" onclick="selectTrip('${trip.id}')">
                    <div class="available-trip-header">
                        <h4><i class="ri-map-pin-user-line"></i>Trip by ${trip.organizer}</h4>
                        <div style="display: flex; flex-direction: column; gap: 0.5rem; margin-top: 0.75rem;">
                            <div style="display: flex; align-items: center; gap: 0.5rem; padding: 0.5rem; background: #e3f2fd; border-radius: 6px;">
                                <i class="ri-user-line" style="color: #01386A;"></i>
                                <strong style="color: #01386A;">Seats available:</strong>
                                <span style="font-weight: 700; color: #01386A; font-size: 1.1rem;">${trip.seatsAvailable}</span>
                            </div>
                                <div style="display: flex; align-items: center; gap: 0.5rem; padding: 0.5rem; background: #f3e5f5; border-radius: 6px; flex-wrap: wrap;">
                                    <i class="ri-box-3-line" style="color: #7b1fa2;"></i>
                                    <strong style="color: #7b1fa2;">Extra space available:</strong>
                                    <span style="color: #7b1fa2;">Large ${remaining.large} | Medium ${(remaining.large * 2) + remaining.medium} | Small ${(remaining.large * 4) + (remaining.medium * 2) + remaining.small}</span>
                                </div>
                        </div>
                    </div>
                    <div class="available-trip-details">
                        <div class="trip-detail-item">
                            <i class="ri-user-line"></i>
                            <span><strong>${trip.currentPassengers}</strong> passengers joined</span>
                        </div>
                        <div class="trip-detail-item">
                            <i class="ri-calendar-line"></i>
                            <span><strong>Departure:</strong> ${trip.departureTime}</span>
                        </div>
                        <div class="trip-detail-item">
                            <i class="ri-money-dollar-circle-line"></i>
                            <span><strong>R${trip.pricePerPerson}</strong> per person</span>
                        </div>
                    </div>
                </div>
            `;
            availableTripsList.innerHTML += tripHTML;
        });
    }
    
    availableTripsSection.style.display = 'block';

    // Bind change handler once to re-filter on date change
    if (dateFilterInput && !dateFilterInput.dataset.bound) {
        dateFilterInput.addEventListener('change', () => {
            loadAvailableTrips();
        });
        dateFilterInput.dataset.bound = 'true';
    }
}

// Auto-select trip for Join flow when date and capacity match
function autoSelectTripIfPossible() {
    if (tripOption !== 'join') return;

    const dateFilterInput = document.getElementById('trip-date-filter');
    const selectedDate = (dateFilterInput && dateFilterInput.value) ? dateFilterInput.value : desiredTripDate;
    if (!selectedDate || !Array.isArray(lastLoadedTrips)) return;

    const needed = passengerCount;
    const match = lastLoadedTrips.find(t => t.departureDate === selectedDate && t.seatsAvailable >= needed);
    if (match) {
        // Select trip and proceed to summary
        selectTrip(match.id);
        // Move to Booking Summary (Step 4)
        nextStep();
    }
}

function selectTrip(tripId) {
    selectedTrip = tripId;
    selectedTripInfo = lastLoadedTrips.find(t => t.id === tripId) || null;
    
    // Remove selection from all trip cards
    document.querySelectorAll('.available-trip-card').forEach(card => {
        card.classList.remove('selected');
    });
    
    // Select the chosen trip
    document.querySelector(`[data-trip-id="${tripId}"]`).classList.add('selected');
    
    // Show continue button
    document.getElementById('continue-trip-btn').style.display = 'inline-flex';
}

function continueTripSelection() {
    if (!tripOption) {
        alert('Please select a trip option: Create New Trip or Join Existing Trip');
        return;
    }
    
    if (tripOption === 'join' && !selectedTrip) {
        alert('Please select a trip to join');
        return;
    }

    if (tripOption === 'create') {
        // Validate that at least one pickup and one dropoff point is entered
        if (pickupPoints.length === 0) {
            alert('Please add at least one pickup point for your trip.');
            return;
        }
        
        if (dropoffPoints.length === 0) {
            alert('Please add at least one drop-off point for your trip.');
            return;
        }
    }
    
    // Validate parcel information if parcels are added
    if (PARCEL_FEATURE_ENABLED && parcelCount > 0) {
        const parcelValidation = validateParcelInformation();
        if (!parcelValidation.valid) {
            alert(parcelValidation.message);
            return;
        }
    }
    
    // Proceed to next step
    nextStep();
}

// Validate South African phone number
function validateSAPhoneNumber(phoneNumber) {
    // Remove spaces, dashes, and other formatting characters
    const cleanedNumber = phoneNumber.replace(/[\s\-()]/g, '');
    
    // South African phone number patterns:
    // Mobile: 0XX XXX XXXX (10 digits starting with 0)
    // International: +27XX XXX XXXX or 27XX XXX XXXX
    // Landline: 0XX XXX XXXX
    
    const patterns = [
        /^0[1-8]\d{8}$/,           // Local format: 0XX XXX XXXX (10 digits)
        /^\+27[1-8]\d{8}$/,        // International: +27XX XXX XXXX
        /^27[1-8]\d{8}$/,          // International without +: 27XX XXX XXXX
        /^0[6-8]\d{8}$/            // Mobile: 06X, 07X, 08X
    ];
    
    return patterns.some(pattern => pattern.test(cleanedNumber));
}

// Real-time phone number validation with visual feedback
function validatePhoneInputPublic(input) {
    const phoneNumber = input.value;
    
    // Only validate if user has entered something
    if (phoneNumber.trim() === '') {
        input.style.borderColor = '#e0e0e0';
        return;
    }
    
    if (validateSAPhoneNumber(phoneNumber)) {
        input.style.borderColor = '#28a745'; // Green for valid
        input.style.boxShadow = '0 0 0 3px rgba(40, 167, 69, 0.1)';
    } else {
        input.style.borderColor = '#dc3545'; // Red for invalid
        input.style.boxShadow = '0 0 0 3px rgba(220, 53, 69, 0.1)';
    }
}

// Validate parcel information
function validateParcelInformation() {
    for (let i = 1; i <= parcelCount; i++) {
        const parcel = parcelData[i];
        
        if (!parcel) {
            return {
                valid: false,
                message: `Parcel ${i}: Missing parcel information. Please provide details for all parcels.`
            };
        }
        
        if (!parcel.senderName || parcel.senderName.trim() === '') {
            return {
                valid: false,
                message: `Parcel ${i}: Please enter the sender's name.`
            };
        }
        
        if (!parcel.senderPhone || parcel.senderPhone.trim() === '') {
            return {
                valid: false,
                message: `Parcel ${i}: Please enter the sender's phone number.`
            };
        }
        
        if (!validateSAPhoneNumber(parcel.senderPhone)) {
            return {
                valid: false,
                message: `Parcel ${i}: Sender's phone number is invalid. Please enter a valid South African phone number (e.g., 071 234 5678 or +27 71 234 5678).`
            };
        }
        
        if (!parcel.receiverName || parcel.receiverName.trim() === '') {
            return {
                valid: false,
                message: `Parcel ${i}: Please enter the receiver's name.`
            };
        }
        
        if (!parcel.receiverPhone || parcel.receiverPhone.trim() === '') {
            return {
                valid: false,
                message: `Parcel ${i}: Please enter the receiver's phone number.`
            };
        }
        
        if (!validateSAPhoneNumber(parcel.receiverPhone)) {
            return {
                valid: false,
                message: `Parcel ${i}: Receiver's phone number is invalid. Please enter a valid South African phone number (e.g., 082 123 4567 or +27 82 123 4567).`
            };
        }
        
        if (!parcel.size || parcel.size.trim() === '') {
            return {
                valid: false,
                message: `Parcel ${i}: Please select a parcel size.`
            };
        }
        
        if (!parcel.images || parcel.images.length === 0) {
            return {
                valid: false,
                message: `Parcel ${i}: Please upload at least one image of the parcel.`
            };
        }
    }
    
    if (!deliveryWindow) {
        return {
            valid: false,
            message: 'Please select a delivery window (Tuesday or Friday).'
        };
    }
    
    return { valid: true };
}

// Validate passenger information
function validatePassengerInformation() {
    // Get user profile to check if email/phone exists
    const userProfileString = localStorage.getItem('userProfile') || sessionStorage.getItem('userProfile');
    let userProfile = null;
    if (userProfileString) {
        try {
            userProfile = JSON.parse(userProfileString);
        } catch (e) {
            console.error('Error parsing user profile:', e);
        }
    }
    
    const userEmail = userProfile?.email || '';
    const userPhone = userProfile?.phone || '';
    
    // Validate passenger (user) information
    for (let i = 1; i <= passengerCount; i++) {
        const firstName = document.getElementById(`passenger-firstName-${i}`)?.value?.trim() || '';
        const lastName = document.getElementById(`passenger-lastName-${i}`)?.value?.trim() || '';
        const email = document.getElementById(`passenger-email-${i}`)?.value?.trim() || '';
        const phone = document.getElementById(`passenger-phone-${i}`)?.value?.trim() || '';
        
        // Check first name and last name
        if (!firstName || !lastName) {
            return {
                valid: false,
                message: 'Please provide your first name and last name. If they are not showing, please update your profile first.'
            };
        }
        
        // Check that user has either email or phone (from profile or form)
        const hasEmail = userEmail || email;
        const hasPhone = userPhone || phone;
        
        if (!hasEmail && !hasPhone) {
            return {
                valid: false,
                message: 'Please provide either an email address or phone number. At least one contact method is required.'
            };
        }
        
        // Validate email format if provided
        if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return {
                valid: false,
                message: 'Please provide a valid email address.'
            };
        }
        
        // Validate next of kin information
        const nokFirstName = document.getElementById(`passenger-nokFirstName-${i}`)?.value?.trim() || '';
        const nokLastName = document.getElementById(`passenger-nokLastName-${i}`)?.value?.trim() || '';
        const nokPhone = document.getElementById(`passenger-nokPhone-${i}`)?.value?.trim() || '';
        
        if (!nokFirstName) {
            return {
                valid: false,
                message: 'Please provide the next of kin first name.'
            };
        }
        
        if (!nokLastName) {
            return {
                valid: false,
                message: 'Please provide the next of kin last name.'
            };
        }
        
        if (!nokPhone) {
            return {
                valid: false,
                message: 'Please provide the next of kin phone number.'
            };
        }
        
        // Validate next of kin phone number format (basic validation)
        if (nokPhone && nokPhone.length < 10) {
            return {
                valid: false,
                message: 'Please provide a valid next of kin phone number (at least 10 digits).'
            };
        }
    }
    
    return { valid: true };
}

// Collect passenger data from form
function collectPassengerData() {
    const passengers = [];
    
    for (let i = 1; i <= passengerCount; i++) {
        const firstName = document.getElementById(`passenger-firstName-${i}`)?.value?.trim() || '';
        const lastName = document.getElementById(`passenger-lastName-${i}`)?.value?.trim() || '';
        const email = document.getElementById(`passenger-email-${i}`)?.value?.trim() || '';
        const phone = document.getElementById(`passenger-phone-${i}`)?.value?.trim() || '';
        const nokFirstName = document.getElementById(`passenger-nokFirstName-${i}`)?.value?.trim() || '';
        const nokLastName = document.getElementById(`passenger-nokLastName-${i}`)?.value?.trim() || '';
        const nokPhone = document.getElementById(`passenger-nokPhone-${i}`)?.value?.trim() || '';
        
        passengers.push({
            firstName,
            lastName,
            email,
            phone,
            nextOfKin: {
                firstName: nokFirstName,
                lastName: nokLastName,
                phone: nokPhone
            }
        });
    }
    
    return passengers;
}

// Capacity Management Functions
function updateCapacityDisplay() {
    const capacityInfoSection = document.getElementById('capacity-info-section');
    const matchingStatus = document.getElementById('matching-status');
        const capacityFill = document.getElementById('capacity-fill');
        const capacityText = document.getElementById('capacity-text');
    const totalDisplay = document.getElementById('total-capacity-display');
        
    if (bookingType === 'passengers') {
        if (capacityInfoSection) capacityInfoSection.style.display = 'none';
        if (matchingStatus) matchingStatus.style.display = 'none';
        if (capacityFill) {
            capacityFill.style.width = '0%';
            capacityFill.textContent = '';
        }
        if (capacityText) {
            capacityText.innerHTML = '<i class="ri-user-line"></i>Single passenger seat reserved';
        }
        if (totalDisplay) totalDisplay.textContent = 1;
        return;
    }

    if (capacityInfoSection) capacityInfoSection.style.display = 'block';
    if (matchingStatus) matchingStatus.style.display = 'block';

    const capacityPercentage = Math.min((parcelCount / MAX_TOTAL_CAPACITY) * 100, 100);
    const remaining = Math.max(MAX_TOTAL_CAPACITY - parcelCount, 0);

    if (capacityFill) {
        capacityFill.style.width = `${capacityPercentage}%`;
        capacityFill.textContent = `${Math.round(capacityPercentage)}%`;
    }
        
        if (totalDisplay) {
            totalDisplay.textContent = parcelCount;
        }

        if (capacityText) {
        capacityText.innerHTML = `<i class="ri-box-3-line"></i>${parcelCount} / ${MAX_TOTAL_CAPACITY} parcels selected`;
        }
        
        if (matchingStatus) {
            const timerElement = matchingStatus.querySelector('.matching-timer');
            if (timerElement) {
            timerElement.innerHTML = `<i class="ri-information-line"></i> You can add up to ${remaining} more parcel${remaining === 1 ? '' : 's'}.`;
            }
        }
}

function updateContinueButtonState() {
    const continueBtn = document.getElementById('continue-passenger-btn');
    const validationMsg = document.getElementById('parcel-validation-message');
    const validationText = document.getElementById('validation-message-text');
    
    if (!continueBtn) return;
    
    // Check validation based on booking type
    if (PARCEL_FEATURE_ENABLED && bookingType === 'parcels') {
        // Validate parcel details
        const validation = validateParcelInformation();
        if (!validation.valid) {
            // Disable button and show message
            continueBtn.disabled = true;
            continueBtn.style.opacity = '0.5';
            continueBtn.style.cursor = 'not-allowed';
            if (validationMsg) validationMsg.style.display = 'block';
            if (validationText) validationText.textContent = validation.message;
        } else {
            // Enable button and hide message
            continueBtn.disabled = false;
            continueBtn.style.opacity = '1';
            continueBtn.style.cursor = 'pointer';
            if (validationMsg) validationMsg.style.display = 'none';
        }
    } else {
        // For passengers, button is always enabled (optional info)
        continueBtn.disabled = false;
        continueBtn.style.opacity = '1';
        continueBtn.style.cursor = 'pointer';
        if (validationMsg) validationMsg.style.display = 'none';
    }
}

function validateAndProceed() {
    // Validate based on booking type
    if (PARCEL_FEATURE_ENABLED && bookingType === 'parcels') {
        // Validate parcel information
        const validation = validateParcelInformation();
        if (!validation.valid) {
            // Show error message
            const validationMsg = document.getElementById('parcel-validation-message');
            const validationText = document.getElementById('validation-message-text');
            if (validationMsg) validationMsg.style.display = 'block';
            if (validationText) validationText.textContent = validation.message;
            
            // Scroll to validation message
            validationMsg.scrollIntoView({ behavior: 'smooth', block: 'center' });
            return;
        }
    } else {
        // For passengers, check that at least 1 passenger is selected
        if (passengerCount < 1) {
            alert('Please select at least 1 passenger.');
            return;
        }
        
        // Validate passenger information
        const passengerValidation = validatePassengerInformation();
        if (!passengerValidation.valid) {
            // Show error message
            const validationMsg = document.getElementById('passenger-validation-message');
            const validationText = document.getElementById('passenger-validation-message-text');
            if (validationMsg) {
                validationMsg.style.display = 'block';
            }
            if (validationText) {
                validationText.textContent = passengerValidation.message;
            }
            
            // Scroll to passenger form
            const passengerDetails = document.getElementById('passenger-details');
            if (passengerDetails) {
                passengerDetails.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
            return;
        } else {
            // Hide validation message if validation passes
            const validationMsg = document.getElementById('passenger-validation-message');
            if (validationMsg) {
                validationMsg.style.display = 'none';
            }
            
            // Collect and save passenger data
            const passengerData = collectPassengerData();
            if (passengerData.length > 0) {
                const primaryPassenger = passengerData[0];
                try {
                    localStorage.setItem('passengerContactInfo', JSON.stringify({
                        firstName: primaryPassenger.firstName,
                        lastName: primaryPassenger.lastName,
                        email: primaryPassenger.email,
                        phone: primaryPassenger.phone
                    }));
                    if (primaryPassenger.nextOfKin) {
                        localStorage.setItem('passengerNextOfKin', JSON.stringify(primaryPassenger.nextOfKin));
                    }
                } catch (error) {
                    console.warn('Unable to persist passenger contact snapshot locally:', error);
                }
            }

            sessionStorage.setItem('passengerData', JSON.stringify(passengerData));
            sessionStorage.setItem('passengerCount', passengerCount.toString());
        }
    }
    
    // Save booking type and preferences to sessionStorage
    sessionStorage.setItem('bookingType', bookingType);
    if (PARCEL_FEATURE_ENABLED && bookingType === 'parcels') {
        sessionStorage.setItem('deliveryWindow', deliveryWindow);
        sessionStorage.setItem('notifyEarlyDelivery', notifyEarlyDelivery);
        sessionStorage.setItem('parcelCount', parcelCount);
        sessionStorage.setItem('parcelData', JSON.stringify(parcelData));
        
        // Save parcel booking to localStorage with pending status (for early delivery checking)
        if (selectedRoute) {
            const pendingParcelBooking = {
                id: 'PARCEL_' + Date.now(),
                routeId: selectedRoute,
                deliveryWindow: deliveryWindow,
                parcelCount: parcelCount,
                parcelData: parcelData,
                notifyEarlyDelivery: notifyEarlyDelivery,
                status: notifyEarlyDelivery ? 'pending_early_delivery' : 'pending',
                createdAt: new Date().toISOString(),
                earlierTrip: null // Will be populated by background checking
            };
            
            const pendingBookings = JSON.parse(localStorage.getItem('pendingParcelBookings') || '[]');
            pendingBookings.push(pendingParcelBooking);
            localStorage.setItem('pendingParcelBookings', JSON.stringify(pendingBookings));
        }
    }

    if (bookingType === 'passengers') {
        sessionStorage.setItem('desiredTripDate', desiredTripDate);
    }

        nextStep();
}

// Handle booking type change (passengers vs parcels)
function handleBookingTypeChange(type) {
    if (!PARCEL_FEATURE_ENABLED && type === 'parcels') {
        console.info('Parcel bookings are temporarily disabled.');
        type = 'passengers';
    }
    bookingType = type;
    
    // Reset counts when switching
    if (type === 'passengers') {
        // Switch to passengers - reset parcels
        parcelCount = 0;
        parcelData = {};
        passengerCount = 1; // Only allow 1 passenger - others join through links
    } else {
        // Switch to parcels - reset passengers
        passengerCount = 0;
        parcelCount = Math.max(1, parcelCount); // Ensure at least 1 parcel
        // Initialize first parcel if needed
        if (!parcelData[1]) {
            parcelData[1] = {
                senderName: '',
                senderPhone: '',
                receiverName: '',
                receiverPhone: '',
                secretCode: generateSecretCode(),
                images: [],
                size: 'small' // default parcel size
            };
        }
    }
    
    // Show/hide appropriate sections
    const passengerSection = document.getElementById('passenger-booking-section');
    const parcelSection = document.getElementById('parcel-booking-section');
    const capacityInfoSection = document.getElementById('capacity-info-section');
    const matchingStatus = document.getElementById('matching-status');
    
    if (type === 'passengers') {
        if (passengerSection) passengerSection.style.display = 'block';
        if (parcelSection) parcelSection.style.display = 'none';
        if (capacityInfoSection) capacityInfoSection.style.display = 'none'; // Hidden - not needed for passengers
        if (matchingStatus) matchingStatus.style.display = 'none';
        generatePassengerForms();
        checkAndDisableJoinOption();
    } else {
        if (passengerSection) passengerSection.style.display = 'none';
        if (parcelSection) parcelSection.style.display = 'block';
        if (capacityInfoSection) capacityInfoSection.style.display = 'block'; // Show for parcels
        if (matchingStatus) matchingStatus.style.display = 'block';
        generateParcelForms();
    }
    
    updateCapacityDisplay();
    updateCounterDisplays();
    updateContinueButtonState(); // Update button state after switching
}

// Make function globally accessible
window.handleBookingTypeChange = handleBookingTypeChange;

function incrementPassengersPublic() {
    if (bookingType !== 'passengers') return;
    
    // Only allow 1 passenger - others must join through links
    if (passengerCount < 1) {
        passengerCount = 1;
        generatePassengerForms();
        updateCapacityDisplay();
        checkAndDisableJoinOption();
        updateCounterDisplays();
        updatePassengerCounterButtons();
    }
}

function decrementPassengersPublic() {
    if (bookingType !== 'passengers') return;
    
    // Keep at least 1 passenger
    if (passengerCount > 1) {
        passengerCount--;
        generatePassengerForms();
        updateCapacityDisplay();
        checkAndDisableJoinOption();
        updateCounterDisplays();
        updatePassengerCounterButtons();
    }
}

function incrementParcelsPublic() {
    if (!PARCEL_FEATURE_ENABLED) return;
    if (bookingType !== 'parcels') return;
    
    if (parcelCount < MAX_TOTAL_CAPACITY) {
        parcelCount++;
        if (!parcelData[parcelCount]) {
            parcelData[parcelCount] = {
                senderName: '',
                senderPhone: '',
                receiverName: '',
                receiverPhone: '',
                secretCode: generateSecretCode(),
                images: [],
                size: '' // 'small', 'medium', 'large'
            };
        }
        generateParcelForms();
        updateCounterDisplays();
        updateCapacityDisplay();
    }
}

function decrementParcelsPublic() {
    if (!PARCEL_FEATURE_ENABLED) return;
    if (bookingType !== 'parcels') return;
    
    if (parcelCount > 1) { // Keep at least 1
        delete parcelData[parcelCount];
        parcelCount--;
        generateParcelForms();
        updateCounterDisplays();
        updateCapacityDisplay();
    }
}

// Update counter displays
function updateCounterDisplays() {
    const passengerDisplay = document.getElementById('passenger-count-display-public');
    const parcelDisplay = document.getElementById('parcel-count-display-public');
    
    if (passengerDisplay) {
        passengerDisplay.textContent = passengerCount;
    }
    if (parcelDisplay) {
        parcelDisplay.textContent = parcelCount;
    }
    
    // Update passenger counter buttons when displaying
    if (bookingType === 'passengers') {
        updatePassengerCounterButtons();
    }
}

// Update passenger counter buttons - disable increment when at 1 passenger
function updatePassengerCounterButtons() {
    if (bookingType !== 'passengers') return;
    
    // Find the increment button within the passenger booking section
    const passengerSection = document.getElementById('passenger-booking-section');
    if (passengerSection) {
        const counterControls = passengerSection.querySelector('.counter-controls-public');
        if (counterControls) {
            const incrementBtn = counterControls.querySelector('button[onclick="incrementPassengersPublic()"]');
            if (incrementBtn) {
                if (passengerCount >= 1) {
                    // Disable the increment button when at 1 passenger
                    incrementBtn.disabled = true;
                    incrementBtn.style.opacity = '0.5';
                    incrementBtn.style.cursor = 'not-allowed';
                    incrementBtn.title = 'Only 1 passenger allowed. Others can join through links.';
                } else {
                    incrementBtn.disabled = false;
                    incrementBtn.style.opacity = '1';
                    incrementBtn.style.cursor = 'pointer';
                    incrementBtn.title = '';
                }
            }
        }
    }
}

function generateSecretCode() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

function updatePassengerInfo() {
    // Set initial booking type based on what's checked
    const passengersRadio = document.getElementById('booking-type-passengers');
    const parcelsRadio = document.getElementById('booking-type-parcels');
    
    // Bind booking type change handlers
    if (passengersRadio) {
        passengersRadio.addEventListener('change', function() {
            if (this.checked) {
                handleBookingTypeChange('passengers');
            }
        });
    }
    
    if (parcelsRadio) {
        parcelsRadio.addEventListener('change', function() {
            if (this.checked) {
                handleBookingTypeChange('parcels');
            }
        });
    }
    
    // Initialize based on checked state
    if (passengersRadio && passengersRadio.checked) {
        bookingType = 'passengers';
        handleBookingTypeChange('passengers');
    } else if (parcelsRadio && parcelsRadio.checked) {
        bookingType = 'parcels';
        handleBookingTypeChange('parcels');
    } else {
        // Default to passengers
        bookingType = 'passengers';
        if (passengersRadio) passengersRadio.checked = true;
        handleBookingTypeChange('passengers');
    }
    
    const formsContainer = document.getElementById('passenger-forms');
    const parcelFormsContainer = document.getElementById('parcel-forms');
    if (formsContainer && bookingType === 'passengers') {
        generatePassengerForms();
    } else if (parcelFormsContainer && PARCEL_FEATURE_ENABLED && bookingType === 'parcels') {
        generateParcelForms();
    }
    
    updateCapacityDisplay();
    updateCounterDisplays();
    
    // Bind delivery window change handler
    const deliveryWindowRadios = document.querySelectorAll('input[name="deliveryWindow"]');
    deliveryWindowRadios.forEach(radio => {
        radio.addEventListener('change', function() {
            deliveryWindow = this.value;
            updateContinueButtonState(); // Re-validate when delivery window changes
        });
    });
    
    // Bind early delivery notification checkbox
    const notifyCheckbox = document.getElementById('notify-early-delivery');
    if (notifyCheckbox) {
        notifyCheckbox.addEventListener('change', function() {
            notifyEarlyDelivery = this.checked;
        });
    }
}

// Update step indicator visibility based on booking type
function updateStepIndicator() {
    const step3 = document.getElementById('step3');
        if (step3) {
            step3.classList.remove('hidden');
            step3.classList.remove('disabled');
    }
}

function generatePassengerForms() {
    const formsContainer = document.getElementById('passenger-forms');
    if (!formsContainer) return;

    formsContainer.innerHTML = '';

    const userProfileString = localStorage.getItem('userProfile') || sessionStorage.getItem('userProfile');
    let userProfile = null;

    if (userProfileString) {
        try {
            userProfile = JSON.parse(userProfileString);
        } catch (e) {
            console.error('Error parsing user profile:', e);
        }
    }

    const userFirstName = sanitizeFieldValue(userProfile?.firstName);
    const userLastName = sanitizeFieldValue(userProfile?.lastName);
    const userEmail = sanitizeFieldValue(userProfile?.email);
    const userPhone = sanitizeFieldValue(userProfile?.phone);

    const userNextOfKin = userProfile?.nextOfKin || {};
    const userNokFirstName = sanitizeFieldValue(
        userNextOfKin.firstName ??
        userProfile?.nextOfKinFirstName ??
        userProfile?.next_of_kin_first_name
    );
    const userNokLastName = sanitizeFieldValue(
        userNextOfKin.lastName ??
        userProfile?.nextOfKinLastName ??
        userProfile?.next_of_kin_last_name
    );
    const userNokPhone = sanitizeFieldValue(
        userNextOfKin.phone ??
        userProfile?.nextOfKinPhone ??
        userProfile?.next_of_kin_phone
    );

    let storedPassengerData = [];
    const storedPassengerDataString = sessionStorage.getItem('passengerData');
    if (storedPassengerDataString) {
        try {
            const parsed = JSON.parse(storedPassengerDataString);
            if (Array.isArray(parsed)) {
                storedPassengerData = parsed;
            }
        } catch (error) {
            console.warn('Unable to parse stored passenger data:', error);
        }
    }

    let storedContactInfo = null;
    const storedContactInfoString = localStorage.getItem('passengerContactInfo');
    if (storedContactInfoString) {
        try {
            storedContactInfo = JSON.parse(storedContactInfoString);
        } catch (error) {
            console.warn('Unable to parse stored passenger contact info:', error);
        }
    }

    let storedNextOfKin = null;
    const storedNextOfKinString = localStorage.getItem('passengerNextOfKin');
    if (storedNextOfKinString) {
        try {
            const parsedNok = JSON.parse(storedNextOfKinString);
            if (parsedNok && typeof parsedNok === 'object') {
                storedNextOfKin = parsedNok;
            }
        } catch (error) {
            console.warn('Unable to parse stored next of kin info:', error);
        }
    }

    if (passengerCount < 1) {
        passengerCount = 1;
    }

    for (let i = 1; i <= passengerCount; i++) {
        const storedPassenger = storedPassengerData[i - 1] || (i === 1 ? storedContactInfo : null) || {};
        const storedNextOfKinData = storedPassenger.nextOfKin || storedNextOfKin || {};

        const passengerFirstName = sanitizeFieldValue(storedPassenger.firstName) || userFirstName;
        const passengerLastName = sanitizeFieldValue(storedPassenger.lastName) || userLastName;
        const passengerEmail = sanitizeFieldValue(storedPassenger.email) || userEmail;
        const passengerPhone = sanitizeFieldValue(storedPassenger.phone) || userPhone;

        const nokFirstNameValue = sanitizeFieldValue(storedNextOfKinData.firstName) || userNokFirstName;
        const nokLastNameValue = sanitizeFieldValue(storedNextOfKinData.lastName) || userNokLastName;
        const nokPhoneValue = sanitizeFieldValue(storedNextOfKinData.phone) || userNokPhone;

        const isPrimary = i === 1;

        const firstNameAttrValue = escapeAttribute(passengerFirstName || '');
        const lastNameAttrValue = escapeAttribute(passengerLastName || '');
        const emailAttrValue = escapeAttribute(passengerEmail || '');
        const phoneAttrValue = escapeAttribute(passengerPhone || '');
        const nokFirstNameAttrValue = escapeAttribute(nokFirstNameValue || '');
        const nokLastNameAttrValue = escapeAttribute(nokLastNameValue || '');
        const nokPhoneAttrValue = escapeAttribute(nokPhoneValue || '');

        const firstNameAttr = userFirstName ? 'readonly style="background-color: #f8f9fa; cursor: not-allowed;"' : (!passengerFirstName ? 'required' : '');
        const lastNameAttr = userLastName ? 'readonly style="background-color: #f8f9fa; cursor: not-allowed;"' : (!passengerLastName ? 'required' : '');

        const emailAttributes = [];
        if (userEmail) {
            emailAttributes.push('readonly style="background-color: #f8f9fa; cursor: not-allowed;"');
        }
        if (!passengerEmail) {
            emailAttributes.push('required');
        }

        const phoneAttributes = [];
        if (userPhone) {
            phoneAttributes.push('readonly style="background-color: #f8f9fa; cursor: not-allowed;"');
        }
        if (!passengerPhone) {
            phoneAttributes.push('required');
        }

        const contactHintNeeded = !passengerEmail || !passengerPhone;

        const formHTML = `
            <div class="passenger-form-card">
                <h5 class="passenger-form-title">
                        <i class="ri-user-line"></i>
                    Passenger Information
                    </h5>
                <div class="passenger-form-grid">
                    <div class="passenger-form-group">
                        <label>
                            <i class="ri-user-3-line"></i>
                            First Name <span style="color: #dc3545;">*</span>
                        </label>
                        <input type="text" placeholder="First name" id="passenger-firstName-${i}" value="${firstNameAttrValue}" ${firstNameAttr}>
                    </div>
                    <div class="passenger-form-group">
                        <label>
                            <i class="ri-user-3-line"></i>
                            Last Name <span style="color: #dc3545;">*</span>
                        </label>
                        <input type="text" placeholder="Last name" id="passenger-lastName-${i}" value="${lastNameAttrValue}" ${lastNameAttr}>
                    </div>
                    <div class="passenger-form-group">
                        <label>
                            <i class="ri-mail-line"></i>
                            Email Address <span style="color: #dc3545;">*</span>
                        </label>
                        <input type="email" placeholder="e.g., john@example.com" id="passenger-email-${i}" value="${emailAttrValue}" ${emailAttributes.join(' ')}>
                        ${contactHintNeeded ? '<small style="color: #6c757d; display: block; margin-top: 0.25rem;">Ensure we can reach you via email or phone.</small>' : ''}
                    </div>
                    <div class="passenger-form-group">
                        <label>
                            <i class="ri-phone-line"></i>
                            Phone Number <span style="color: #dc3545;">*</span>
                        </label>
                        <input type="tel" placeholder="e.g., 0712345678" id="passenger-phone-${i}" value="${phoneAttrValue}" ${phoneAttributes.join(' ')}>
                        ${contactHintNeeded ? '<small style="color: #6c757d; display: block; margin-top: 0.25rem;">Ensure we can reach you via phone or email.</small>' : ''}
                    </div>
                </div>
            </div>
            <div class="passenger-form-card">
                <h5 class="passenger-form-title">
                    <i class="ri-user-heart-line"></i>
                    Next of Kin Information
                    </h5>
                    <div class="passenger-form-grid">
                        <div class="passenger-form-group">
                            <label>
                                <i class="ri-user-3-line"></i>
                                Next of Kin First Name <span style="color: #dc3545;">*</span>
                            </label>
                        <input type="text" placeholder="Enter first name" id="passenger-nokFirstName-${i}" value="${nokFirstNameAttrValue}" required>
                        </div>
                        <div class="passenger-form-group">
                            <label>
                                <i class="ri-user-3-line"></i>
                                Next of Kin Last Name <span style="color: #dc3545;">*</span>
                            </label>
                        <input type="text" placeholder="Enter last name" id="passenger-nokLastName-${i}" value="${nokLastNameAttrValue}" required>
                        </div>
                        <div class="passenger-form-group">
                            <label>
                                <i class="ri-phone-line"></i>
                                Next of Kin Phone Number <span style="color: #dc3545;">*</span>
                            </label>
                        <input type="tel" placeholder="e.g., 0712345678" id="passenger-nokPhone-${i}" value="${nokPhoneAttrValue}" required>
                    </div>
                </div>
            </div>
        `;
        formsContainer.innerHTML += formHTML;
    }
}

// Parcel Form Generation
function generateParcelForms() {
    if (!PARCEL_FEATURE_ENABLED) return;

    const formsContainer = document.getElementById('parcel-forms');
    if (!formsContainer) return;
    
    formsContainer.innerHTML = '';
    
    for (let i = 1; i <= parcelCount; i++) {
        if (!parcelData[i]) {
            parcelData[i] = {
                senderName: '',
                senderPhone: '',
                receiverName: '',
                receiverPhone: '',
                secretCode: generateSecretCode(),
                images: [],
                size: 'small'
            };
        }
        
        const formHTML = `
            <div class="parcel-card-public">
                <div class="passenger-form-header">
                    <h5><i class="ri-box-3-line"></i> Parcel ${i}</h5>
                    <div style="background: #01386A; color: white; padding: 0.3rem 0.8rem; border-radius: 15px; font-size: 0.9rem; font-weight: 600;">#${i}</div>
                </div>
                
                <div class="passenger-form-grid" style="margin-bottom: 1.5rem;">
                    <div class="passenger-form-group" style="grid-column: 1 / -1;">
                        <label><i class="ri-camera-line"></i> Parcel Image(s) <span style="color: #dc3545;">*</span></label>
                        <div class="parcel-image-upload-public" onclick="document.getElementById('parcelImage${i}Public').click()">
                            <i class="ri-upload-cloud-line" style="font-size: 2.5rem; color: #01386A;"></i>
                            <p style="margin-top: 0.5rem; color: #6c757d; font-size: 0.95rem;">Click to upload parcel image(s)</p>
                            <input type="file" id="parcelImage${i}Public" accept="image/*" multiple style="display: none;" 
                                onchange="handleParcelImageUploadPublic(${i}, this)">
                        </div>
                        <div id="parcelImagePreview${i}Public" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 1rem; margin-top: 1rem;">
                        </div>
                    </div>
                </div>
                
                <h5 style="color: #01386A; margin-bottom: 1rem; font-size: 1.1rem;"><i class="ri-scales-3-line"></i> Parcel Size</h5>
                <div class="passenger-form-grid" style="margin-bottom: 1.5rem;">
                    <div class="passenger-form-group">
                        <label><i class="ri-ruler-2-line"></i> Select Parcel Size <span style="color: #dc3545;">*</span></label>
                        <select id="parcelSize${i}Public" onchange="updateParcelFieldPublic(${i}, 'size', this.value)">
                            <option value="small" ${parcelData[i].size === 'small' ? 'selected' : ''}>Small (&lt; 5kg)</option>
                            <option value="medium" ${parcelData[i].size === 'medium' ? 'selected' : ''}>Medium (&lt; 15kg)</option>
                            <option value="large" ${parcelData[i].size === 'large' ? 'selected' : ''}>Large (&lt; 30kg)</option>
                        </select>
                    </div>
                </div>

                <h5 style="color: #01386A; margin-bottom: 1rem; font-size: 1.1rem;"><i class="ri-user-fill"></i> Sender Information</h5>
                <div class="passenger-form-grid" style="margin-bottom: 1.5rem;">
                    <div class="passenger-form-group">
                        <label><i class="ri-user-3-line"></i> Sender Name <span style="color: #dc3545;">*</span></label>
                        <input type="text" id="senderName${i}Public" 
                            value="${parcelData[i].senderName}" 
                            onchange="updateParcelFieldPublic(${i}, 'senderName', this.value)"
                            placeholder="Enter sender's full name">
                    </div>
                    <div class="passenger-form-group">
                        <label><i class="ri-phone-line"></i> Sender Phone <span style="color: #dc3545;">*</span></label>
                        <input type="tel" id="senderPhone${i}Public" 
                            value="${parcelData[i].senderPhone}" 
                            onchange="updateParcelFieldPublic(${i}, 'senderPhone', this.value)"
                            oninput="validatePhoneInputPublic(this)"
                            placeholder="e.g., 071 234 5678">
                        <small style="color: #6c757d; font-size: 0.85rem; margin-top: 0.25rem; display: block;">Format: 071 234 5678 or +27 71 234 5678</small>
                    </div>
                </div>
                
                <h5 style="color: #01386A; margin-bottom: 1rem; font-size: 1.1rem;"><i class="ri-user-received-line"></i> Receiver Information</h5>
                <div class="passenger-form-grid" style="margin-bottom: 1.5rem;">
                    <div class="passenger-form-group">
                        <label><i class="ri-user-3-line"></i> Receiver Name <span style="color: #dc3545;">*</span></label>
                        <input type="text" id="receiverName${i}Public" 
                            value="${parcelData[i].receiverName}" 
                            onchange="updateParcelFieldPublic(${i}, 'receiverName', this.value)"
                            placeholder="Enter receiver's full name">
                    </div>
                    <div class="passenger-form-group">
                        <label><i class="ri-phone-line"></i> Receiver Phone <span style="color: #dc3545;">*</span></label>
                        <input type="tel" id="receiverPhone${i}Public" 
                            value="${parcelData[i].receiverPhone}" 
                            onchange="updateParcelFieldPublic(${i}, 'receiverPhone', this.value)"
                            oninput="validatePhoneInputPublic(this)"
                            placeholder="e.g., 071 234 5678">
                        <small style="color: #6c757d; font-size: 0.85rem; margin-top: 0.25rem; display: block;">Format: 071 234 5678 or +27 71 234 5678</small>
                    </div>
                </div>
                
                <div style="background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%); padding: 1.2rem; border-radius: 12px; border: 2px solid #01386A;">
                    <p style="color: #01386A; font-weight: 700; margin-bottom: 0.5rem; font-size: 1rem;">
                        <i class="ri-lock-line"></i> Delivery Confirmation Code
                    </p>
                    <p style="color: #6c757d; font-size: 0.9rem; margin-bottom: 0.8rem;">
                        Share this code with the receiver. The driver will ask for this code upon delivery.
                    </p>
                    <div class="secret-code-display-public" id="secretCode${i}Public">
                        ${parcelData[i].secretCode}
                    </div>
                </div>
            </div>
        `;
        
        formsContainer.innerHTML += formHTML;
    }
}

function updateParcelFieldPublic(parcelNumber, field, value) {
    if (!PARCEL_FEATURE_ENABLED) return;
    if (parcelData[parcelNumber]) {
        parcelData[parcelNumber][field] = value;
        // Update button state after field change
        updateContinueButtonState();
    }
}

function handleParcelImageUploadPublic(parcelNumber, input) {
    if (!PARCEL_FEATURE_ENABLED) return;
    if (input.files && input.files.length > 0) {
        const previewContainer = document.getElementById(`parcelImagePreview${parcelNumber}Public`);
        previewContainer.innerHTML = '';
        
        // Store the file references
        parcelData[parcelNumber].images = Array.from(input.files);
        
        // Display previews
        Array.from(input.files).forEach((file, index) => {
            const reader = new FileReader();
            reader.onload = function(e) {
                const imgWrapper = document.createElement('div');
                imgWrapper.style.position = 'relative';
                imgWrapper.innerHTML = `
                    <img src="${e.target.result}" class="parcel-image-preview-public" alt="Parcel ${parcelNumber} Image ${index + 1}">
                    <button type="button" onclick="removeParcelImagePublic(${parcelNumber}, ${index})" 
                        style="position: absolute; top: 5px; right: 5px; background: #dc3545; color: white; border: none; border-radius: 50%; width: 28px; height: 28px; cursor: pointer; display: flex; align-items: center; justify-content: center;">
                        <i class="ri-close-line"></i>
                    </button>
                `;
                previewContainer.appendChild(imgWrapper);
            };
            reader.readAsDataURL(file);
        });
        
        // Update button state after image upload
        updateContinueButtonState();
    }
}

function removeParcelImagePublic(parcelNumber, imageIndex) {
    if (!PARCEL_FEATURE_ENABLED) return;
    if (parcelData[parcelNumber] && parcelData[parcelNumber].images) {
        parcelData[parcelNumber].images.splice(imageIndex, 1);
        generateParcelForms();
        // Update button state after removing image
        updateContinueButtonState();
    }
}

function updateBookingSummary() {
    if (!selectedRoute || !routes[selectedRoute]) return;
    
    const route = routes[selectedRoute];
    const bookingTypeFromStorage = sessionStorage.getItem('bookingType') || bookingType;
    
    let summaryHTML = '';
    
    // Handle parcel bookings
    if (bookingTypeFromStorage === 'parcels') {
        const savedParcelCount = parseInt(sessionStorage.getItem('parcelCount') || parcelCount) || parcelCount;
        const savedParcelData = JSON.parse(sessionStorage.getItem('parcelData') || JSON.stringify(parcelData)) || parcelData;
        const savedDeliveryWindow = sessionStorage.getItem('deliveryWindow') || deliveryWindow || 'standard';
        const savedNotifyEarly = sessionStorage.getItem('notifyEarlyDelivery') === 'true' || notifyEarlyDelivery;
        
        const deliveryWindowText = savedDeliveryWindow === 'early'
            ? 'Early delivery (subject to availability)'
            : 'Standard schedule (Tue & Fri dispatch)';
        
        // Calculate pricing (placeholder - in real app, this would be calculated based on parcel sizes and space usage)
        // For now, assume parcels use extra space pricing
        const baseParcelPrice = route.price * 0.6; // Parcels in extra space cost less
        const estimatedTotal = baseParcelPrice * savedParcelCount;
        
        summaryHTML = `
            <div class="summary-row">
                <span>Booking Type:</span>
                <span><strong>Parcel Delivery</strong></span>
            </div>
            <div class="summary-row">
                <span>Route:</span>
                <span>${route.name}</span>
            </div>
            <div class="summary-row">
                <span>Delivery Window:</span>
                <span><strong>${deliveryWindowText}</strong></span>
            </div>
            <div class="summary-row">
                <span>Number of Parcels:</span>
                <span>${savedParcelCount} parcel(s)</span>
            </div>
            <div class="summary-row">
                <span>Distance:</span>
                <span>${route.distance} km</span>
            </div>
            <div class="summary-row">
                <span>Duration:</span>
                <span>~${route.duration} hours</span>
            </div>
            <div class="summary-row">
                <span>Early Delivery Notification:</span>
                <span>${savedNotifyEarly ? 'Enabled' : 'Disabled'}</span>
            </div>
        `;
        
        // Add parcel details if available
        if (savedParcelData && Object.keys(savedParcelData).length > 0) {
            summaryHTML += `<div class="summary-row" style="grid-column: 1 / -1; margin-top: 1rem; padding-top: 1rem; border-top: 2px solid #e0e0e0;">
                <span><strong>Parcel Details:</strong></span>
            </div>`;
            
            Object.keys(savedParcelData).forEach(key => {
                const parcel = savedParcelData[key];
                if (parcel) {
                    summaryHTML += `
                        <div class="summary-row" style="grid-column: 1 / -1; padding-left: 2rem;">
                            <span><strong>Parcel ${key}:</strong></span>
                        </div>
                        <div class="summary-row" style="grid-column: 1 / -1; padding-left: 4rem;">
                            <span>Size:</span>
                            <span>${parcel.size || 'Not specified'}</span>
                        </div>
                        <div class="summary-row" style="grid-column: 1 / -1; padding-left: 4rem;">
                            <span>Sender:</span>
                            <span>${parcel.senderName || 'Not specified'}</span>
                        </div>
                        <div class="summary-row" style="grid-column: 1 / -1; padding-left: 4rem;">
                            <span>Receiver:</span>
                            <span>${parcel.receiverName || 'Not specified'}</span>
                        </div>
                        <div class="summary-row" style="grid-column: 1 / -1; padding-left: 4rem;">
                            <span>Verification Code:</span>
                            <span><strong>${parcel.secretCode || 'N/A'}</strong></span>
                        </div>
                    `;
                }
            });
        }
        
        summaryHTML += `
            <div class="summary-row" style="margin-top: 1rem; padding-top: 1rem; border-top: 2px solid #e0e0e0;">
                <span>Estimated Price per Parcel (Extra Space):</span>
                <span>R${baseParcelPrice.toFixed(2)}</span>
            </div>
            <div class="summary-row">
                <span><strong>Estimated Total Amount:</strong></span>
                <span><strong>R${estimatedTotal.toFixed(2)}</strong></span>
            </div>
            <div class="summary-row" style="grid-column: 1 / -1; margin-top: 0.5rem; padding: 0.75rem; background: #fff3cd; border-radius: 8px; color: #856404; font-size: 0.9rem;">
                <span><i class="ri-information-line"></i> Final pricing will be confirmed after admin review and space allocation.</span>
            </div>
        `;
    } else {
        // Handle passenger bookings (existing logic)
        const totalPrice = route.price * passengerCount;

        let tripTypeText = 'Not selected';
        if (tripOption === 'create') {
            tripTypeText = 'Create New Trip';
        } else if (tripOption === 'join') {
            tripTypeText = 'Join Existing Trip';
        }

        let pickupLocations = 'Not specified';
        if (pickupPoints.length > 0) {
            pickupLocations = pickupPoints.map(p => p.address).join('<br>');
        }

        let dropoffLocations = 'Not specified';
        if (dropoffPoints.length > 0) {
            dropoffLocations = dropoffPoints.map(p => p.address).join('<br>');
        }

        // Resolve date/time
        let tripDateDisplay = '-';
        let tripTimeDisplay = '-';
        if (tripOption === 'create') {
            tripDateDisplay = desiredTripDate || '-';
            tripTimeDisplay = 'To be confirmed';
        } else if (tripOption === 'join' && selectedTripInfo) {
            tripDateDisplay = selectedTripInfo.departureDate || '-';
            tripTimeDisplay = selectedTripInfo.departureTime || '-';
        }

        summaryHTML = `
            <div class="summary-row">
                <span>Route:</span>
                <span>${route.name}</span>
            </div>
            <div class="summary-row">
                <span>Trip Type:</span>
                <span>${tripTypeText}</span>
            </div>
            <div class="summary-row">
                <span>Trip Date:</span>
                <span>${tripDateDisplay}</span>
            </div>
            <div class="summary-row">
                <span>Trip Time:</span>
                <span>${tripTimeDisplay}</span>
            </div>
            <div class="summary-row">
                <span>Current Trip Passengers:</span>
                <span>${(tripOption === 'join' && selectedTripInfo) ? selectedTripInfo.currentPassengers : passengerCount}</span>
            </div>
            <div class="summary-row">
                <span>Distance:</span>
                <span>${route.distance} km</span>
            </div>
            <div class="summary-row">
                <span>Duration:</span>
                <span>~${route.duration} hours</span>
            </div>
            <div class="summary-row">
                <span>Passengers:</span>
                <span>${passengerCount} person(s)</span>
            </div>
        `;

        // Add pickup/dropoff points if creating a trip
        if (tripOption === 'create') {
            summaryHTML += `
                <div class="summary-row">
                    <span>Pickup Points:</span>
                    <span>${pickupLocations}</span>
                </div>
                <div class="summary-row">
                    <span>Drop-off Points:</span>
                    <span>${dropoffLocations}</span>
                </div>
            `;
        }

        summaryHTML += `
            <div class="summary-row">
                <span>Price per person:</span>
                <span>R${route.price}</span>
            </div>
            <div class="summary-row">
                <span><strong>Total Amount:</strong></span>
                <span><strong>R${totalPrice}</strong></span>
            </div>
        `;
    }

    document.getElementById('booking-summary').innerHTML = summaryHTML;
}

function confirmBooking() {
    const bookingTypeFromStorage = sessionStorage.getItem('bookingType') || bookingType;
    
    // Handle parcel bookings - go directly to payment
    if (bookingTypeFromStorage === 'parcels') {
        if (selectedRoute) {
            alert('Parcel booking confirmed! Redirecting to payment...');
            proceedToPayment();
        }
        return;
    }
    
    // Handle passenger bookings
    if (selectedRoute && passengerCount > 0) {
        if (tripOption === 'create') {
            // Check if trip is full (15 passengers)
            if (passengerCount >= 15) {
                // Trip is full, go directly to payment
                alert('Your trip is full! Redirecting to payment...');
                proceedToPayment();
            } else {
                // Trip needs more passengers, show trip monitoring page
                showTripMonitoring();
            }
        } else if (tripOption === 'join') {
            // For joining existing trip, proceed to payment
            alert('Booking confirmed! Proceeding to payment...');
            proceedToPayment();
        }
    }
}

function showTripMonitoring() {
    // Save trip to localStorage for persistence
    saveActiveTripToStorage();
    
    // Hide booking confirmation
    document.getElementById('booking-confirmation').classList.remove('active');
    
    // Show trip monitoring
    document.getElementById('trip-monitoring').classList.add('active');
    
    // Update trip status display
    const route = routes[selectedRoute];
    const seatsAvailable = 15 - passengerCount;
    const capacityPercentage = (passengerCount / 15) * 100;
    
    document.getElementById('trip-route-display').textContent = route.name;
    document.getElementById('trip-current-passengers').textContent = passengerCount;
    document.getElementById('trip-seats-available').textContent = seatsAvailable;
    document.getElementById('trip-capacity-text').textContent = `${passengerCount} / 15`;
    document.getElementById('trip-capacity-fill').style.width = `${capacityPercentage}%`;
    document.getElementById('trip-capacity-fill').textContent = `${capacityPercentage.toFixed(0)}%`;
    
    // Show pickup locations
    const pickupListEl = document.getElementById('trip-pickup-list');
    pickupListEl.innerHTML = '';
    pickupPoints.forEach(point => {
        pickupListEl.innerHTML += `<li>${point.address}</li>`;
    });
    
    // Show dropoff locations
    const dropoffListEl = document.getElementById('trip-dropoff-list');
    dropoffListEl.innerHTML = '';
    dropoffPoints.forEach(point => {
        dropoffListEl.innerHTML += `<li>${point.address}</li>`;
    });
    
    // Generate and display shareable trip link
    generateTripShareLink();
    
    // Determine trip status
    if (passengerCount >= 15) {
        document.getElementById('trip-full-alert').style.display = 'flex';
        document.getElementById('trip-waiting-alert').style.display = 'none';
        document.getElementById('payment-btn').style.display = 'inline-flex';
        document.getElementById('trip-status-badge').textContent = 'Full - Ready to Go!';
        document.getElementById('trip-status-badge').style.background = 'linear-gradient(135deg, #01386A 0%, #025aa5 100%)';
        
        // Remove from localStorage since it's full
        localStorage.removeItem('activeTripData');
    } else {
        document.getElementById('trip-full-alert').style.display = 'none';
        document.getElementById('trip-waiting-alert').style.display = 'flex';
        document.getElementById('payment-btn').style.display = 'none';
        document.getElementById('trip-status-badge').textContent = 'Waiting for Passengers';
        document.getElementById('trip-status-badge').style.background = 'linear-gradient(135deg, #FFD52F 0%, #FFC107 100%)';
    }
    
    // Simulate passengers joining (in production, this would be real-time via WebSocket)
    simulatePassengersJoining();
}

function simulatePassengersJoining() {
    // This simulates other passengers joining the trip
    // In production, this would be handled by WebSocket/real-time updates
    
    let currentPassengers = passengerCount;
    const joinedPassengersList = document.getElementById('joined-passengers-list');
    
    // Show some example passengers who "joined"
    if (currentPassengers < 15) {
        const sampleJoiners = [
            { name: 'John Doe', passengers: 2, time: '5 minutes ago' },
            { name: 'Sarah Smith', passengers: 3, time: '15 minutes ago' }
        ];
        
        joinedPassengersList.innerHTML = '';
        sampleJoiners.forEach((joiner, idx) => {
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
        
        document.getElementById('joined-passengers-card').style.display = 'block';
    }
}

// Trip Sharing Functions
function generateTripShareLink() {
    // Generate a unique trip ID (in production, this would come from the backend)
    const tripId = 'TRP' + Date.now().toString(36) + Math.random().toString(36).substr(2, 5).toUpperCase();
    
    // Store trip ID with trip data
    const activeTrip = JSON.parse(localStorage.getItem('activeTripData') || '{}');
    activeTrip.tripId = tripId;
    localStorage.setItem('activeTripData', JSON.stringify(activeTrip));
    
    // Generate the shareable link
    const baseUrl = window.location.origin;
    const shareLink = `${baseUrl}/pages/customer/booking-public.html?join=${tripId}`;
    
    // Display the link
    document.getElementById('trip-share-link').value = shareLink;
}

function copyTripLink() {
    const linkInput = document.getElementById('trip-share-link');
    const feedback = document.getElementById('copy-feedback');
    
    // Select and copy the text
    linkInput.select();
    linkInput.setSelectionRange(0, 99999); // For mobile devices
    
    navigator.clipboard.writeText(linkInput.value).then(() => {
        // Show success feedback
        feedback.style.display = 'flex';
        
        // Hide feedback after 3 seconds
        setTimeout(() => {
            feedback.style.display = 'none';
        }, 3000);
    }).catch(err => {
        console.error('Failed to copy:', err);
        alert('Failed to copy link. Please copy manually.');
    });
}

function shareViaWhatsApp() {
    const link = document.getElementById('trip-share-link').value;
    const route = routes[selectedRoute];
    const message = `🚖 Join my trip on TeksiMap!\n\nRoute: ${route.name}\nSeats Available: ${15 - passengerCount}\n\nOnly logged-in users can join. Click the link below:\n${link}`;
    
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
}

function shareViaEmail() {
    const link = document.getElementById('trip-share-link').value;
    const route = routes[selectedRoute];
    const subject = `Join my trip: ${route.name}`;
    const body = `Hi!\n\nI've created a trip on TeksiMap and I'd like to invite you to join.\n\nRoute: ${route.name}\nSeats Available: ${15 - passengerCount}\n\nNote: You need to be logged in to TeksiMap to join this trip.\n\nJoin here: ${link}\n\nSee you on the trip!`;
    
    const mailtoUrl = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.href = mailtoUrl;
}

function shareViaSMS() {
    const link = document.getElementById('trip-share-link').value;
    const route = routes[selectedRoute];
    const message = `Join my trip on TeksiMap! Route: ${route.name}. ${15 - passengerCount} seats available. Login required: ${link}`;
    
    const smsUrl = `sms:?body=${encodeURIComponent(message)}`;
    window.location.href = smsUrl;
}

function showQRCode() {
    const link = document.getElementById('trip-share-link').value;
    const qrModal = document.getElementById('qr-modal');
    const qrContainer = document.getElementById('qr-code-container');
    
    // Clear previous QR code
    qrContainer.innerHTML = '';
    
    // Generate QR code using QR Server API
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

function closeQRModal() {
    document.getElementById('qr-modal').style.display = 'none';
}

// Check if user is joining via shared link
function checkForJoinLink() {
    const urlParams = new URLSearchParams(window.location.search);
    const tripId = urlParams.get('join');
    
    if (tripId) {
        // Check if user is logged in
        const isLoggedIn = checkUserAuthentication();
        
        if (!isLoggedIn) {
            alert('Please log in to join this trip.');
            // Redirect to login page with return URL
            window.location.href = `/pages/authentication/login.html?returnUrl=${encodeURIComponent(window.location.href)}`;
            return;
        }
        
        // Show loading state
        alert(`Attempting to join trip: ${tripId}\n\nIn production, this would fetch the trip details from the backend and add you as a participant.`);
        
        // In production, you would:
        // 1. Fetch trip details from backend using tripId
        // 2. Verify trip has available seats
        // 3. Add user to trip participants
        // 4. Show trip details and confirmation
    }
}

function checkUserAuthentication() {
    // Check for auth token in localStorage/sessionStorage
    const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
    return !!token;
}

function proceedToPayment() {
    // Save payment data to localStorage (will be removed after payment)
    const route = routes[selectedRoute];
    const totalAmount = route.price * passengerCount;
    
    // Create booking with unpaid status
    const booking = {
        id: 'BK' + Date.now(),
        reference: 'TKS' + Date.now().toString().slice(-8),
        routeName: route.name,
        passengers: passengerCount,
        pricePerPerson: route.price,
        totalAmount: totalAmount,
        tripOption: tripOption,
        pickupPoints: pickupPoints.map(p => ({ address: p.address, lat: p.lat, lng: p.lng })),
        dropoffPoints: dropoffPoints.map(p => ({ address: p.address, lat: p.lat, lng: p.lng })),
        tripDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // Default to 1 week from now
        bookingDate: new Date().toISOString(),
        status: 'unpaid'
    };
    
    // Save to userBookings
    const userBookings = JSON.parse(localStorage.getItem('userBookings') || '[]');
    userBookings.push(booking);
    localStorage.setItem('userBookings', JSON.stringify(userBookings));
    
    // Store payment data for payment page
    const paymentData = {
        bookingId: booking.id,
        routeName: route.name,
        passengers: passengerCount,
        pricePerPerson: route.price,
        totalAmount: totalAmount,
        pickupPoints: pickupPoints.map(p => ({ address: p.address })),
        dropoffPoints: dropoffPoints.map(p => ({ address: p.address }))
    };
    
    localStorage.setItem('paymentData', JSON.stringify(paymentData));
    
    // Redirect to payment page
    window.location.href = '/pages/customer/booking-payment.html';
}

function cancelTrip() {
    if (confirm('Are you sure you want to cancel this trip? This action cannot be undone.')) {
        // Remove trip from localStorage
        localStorage.removeItem('activeTripData');
        
        alert('Trip cancelled successfully.');
        window.location.href = '/pages/customer/booking-type-selection.html';
    }
}

// Navigation functions
function toggleMobileMenu() {
    const mobileMenu = document.getElementById('mobileMenu');
    mobileMenu.classList.toggle('show');
}

function topNavZIndexDecrease() {
    // Function for navigation link clicks
}

// Make functions globally accessible
window.selectRoute = selectRoute;
window.nextStep = nextStep;
window.goBack = goBack;
window.selectTripOption = selectTripOption;
window.addPickupPoint = addPickupPoint;
window.addDropoffPoint = addDropoffPoint;
window.removeLocation = removeLocation;
window.selectTrip = selectTrip;
window.continueTripSelection = continueTripSelection;
window.updatePassengerInfo = updatePassengerInfo;
window.confirmBooking = confirmBooking;
window.proceedToPayment = proceedToPayment;
window.cancelTrip = cancelTrip;
window.toggleMobileMenu = toggleMobileMenu;
window.topNavZIndexDecrease = topNavZIndexDecrease;
window.incrementPassengersPublic = incrementPassengersPublic;
window.decrementPassengersPublic = decrementPassengersPublic;
window.incrementParcelsPublic = incrementParcelsPublic;
window.decrementParcelsPublic = decrementParcelsPublic;
window.updateParcelFieldPublic = updateParcelFieldPublic;
window.handleParcelImageUploadPublic = handleParcelImageUploadPublic;
window.removeParcelImagePublic = removeParcelImagePublic;
window.validatePhoneInputPublic = validatePhoneInputPublic;
window.validateAndProceed = validateAndProceed;
window.copyTripLink = copyTripLink;
window.shareViaWhatsApp = shareViaWhatsApp;
window.shareViaEmail = shareViaEmail;
window.shareViaSMS = shareViaSMS;
window.showQRCode = showQRCode;
window.closeQRModal = closeQRModal;

// Check for active trip on page load
function checkActiveTrip() {
    const activeTrip = localStorage.getItem('activeTripData');
    
    if (activeTrip) {
        try {
            const tripData = JSON.parse(activeTrip);
            
            // Only show if trip is not full
            if (tripData.passengers < 15) {
                displayActiveTripBanner(tripData);
            } else {
                // Trip is full, remove from localStorage
                localStorage.removeItem('activeTripData');
            }
        } catch (error) {
            console.error('Error parsing active trip data:', error);
            localStorage.removeItem('activeTripData');
        }
    }
}

function displayActiveTripBanner(tripData) {
    const banner = document.getElementById('active-trip-banner');
    const seatsAvailable = 15 - tripData.passengers;
    
    document.getElementById('active-trip-route').textContent = tripData.routeName;
    document.getElementById('active-trip-passengers').textContent = tripData.passengers;
    document.getElementById('active-trip-seats').textContent = seatsAvailable;
    
    banner.style.display = 'block';
}

function viewActiveTrip() {
    const activeTrip = localStorage.getItem('activeTripData');
    
    if (activeTrip) {
        try {
            const tripData = JSON.parse(activeTrip);
            
            // Restore trip state
            selectedRoute = tripData.routeId;
            passengerCount = tripData.passengers;
            tripOption = 'create';
            
            // Restore pickup and dropoff points (without markers for now)
            pickupPoints = (tripData.pickupPoints || []).map(p => ({
                ...p,
                marker: null
            }));
            dropoffPoints = (tripData.dropoffPoints || []).map(p => ({
                ...p,
                marker: null
            }));
            
            // Navigate directly to trip monitoring page
            document.getElementById('route-selection').classList.remove('active');
            document.getElementById('trip-monitoring').classList.add('active');
            
            // Display trip monitoring
            showTripMonitoring();
        } catch (error) {
            console.error('Error loading active trip:', error);
            alert('Unable to load your trip. Please try again.');
        }
    }
}

function saveActiveTripToStorage() {
    if (tripOption === 'create' && passengerCount < 15) {
        const route = routes[selectedRoute];
        
        const tripData = {
            routeId: selectedRoute,
            routeName: route.name,
            passengers: passengerCount,
            pickupPoints: pickupPoints.map(p => ({ 
                index: p.index, 
                address: p.address, 
                coordinates: p.coordinates 
            })),
            dropoffPoints: dropoffPoints.map(p => ({ 
                index: p.index, 
                address: p.address, 
                coordinates: p.coordinates 
            })),
            createdAt: new Date().toISOString()
        };
        
        localStorage.setItem('activeTripData', JSON.stringify(tripData));
    }
}

// Check if join option should be disabled
function checkAndDisableJoinOption() {
    const joinTripCard = document.getElementById('join-trip-option');
    const joinDisabledOverlay = document.getElementById('join-trip-disabled');
    
    if (!joinTripCard || !joinDisabledOverlay) {
        return;
    }
    
    if (passengerCount >= 15) {
        // Disable join existing trip option
        joinTripCard.classList.add('disabled');
        joinDisabledOverlay.style.display = 'flex';
    } else {
        // Enable join existing trip option
        joinTripCard.classList.remove('disabled');
        joinDisabledOverlay.style.display = 'none';
    }
}

// === USER BOOKINGS DISPLAY FUNCTIONALITY ===
function loadUserBookings() {
    const userBookings = JSON.parse(localStorage.getItem('userBookings') || '[]');
    
    if (userBookings.length === 0) {
        return; // Don't show the section if no bookings
    }

    const now = new Date();
    const upcoming = userBookings.filter(b => b.status === 'paid' && new Date(b.tripDate) > now);
    const unpaid = userBookings.filter(b => b.status === 'unpaid' || b.status === 'confirmed');
    const history = userBookings.filter(b => 
        (b.status === 'paid' && new Date(b.tripDate) <= now) || b.status === 'completed'
    );

    // Update counts
    document.getElementById('upcoming-count').textContent = upcoming.length;
    document.getElementById('unpaid-count').textContent = unpaid.length;
    document.getElementById('history-count').textContent = history.length;

    // Display bookings
    displayBookingsInTab('upcoming-bookings', upcoming, 'upcoming');
    displayBookingsInTab('unpaid-bookings', unpaid, 'unpaid');
    displayBookingsInTab('history-bookings', history, 'history');

    // Show the bookings section
    document.getElementById('your-bookings-section').style.display = 'block';
}

function displayBookingsInTab(containerId, bookings, type) {
    const container = document.getElementById(containerId);
    
    if (!container) return;
    
    if (bookings.length === 0) {
        container.innerHTML = getEmptyBookingsHTML(type);
        return;
    }

    container.innerHTML = bookings.map(booking => createBookingItemHTML(booking, type)).join('');
}

function getEmptyBookingsHTML(type) {
    const messages = {
        upcoming: {
            icon: 'ri-calendar-check-line',
            title: 'No Upcoming Trips',
            text: 'You don\'t have any upcoming paid trips.'
        },
        unpaid: {
            icon: 'ri-alert-line',
            title: 'No Unpaid Bookings',
            text: 'All your bookings are paid!'
        },
        history: {
            icon: 'ri-history-line',
            title: 'No Trip History',
            text: 'You haven\'t completed any trips yet.'
        }
    };

    const msg = messages[type];
    return `
        <div class="empty-bookings-message">
            <i class="${msg.icon}"></i>
            <h4>${msg.title}</h4>
            <p>${msg.text}</p>
        </div>
    `;
}

function createBookingItemHTML(booking, type) {
    const statusClass = booking.status === 'paid' ? 'paid' : booking.status === 'unpaid' || booking.status === 'confirmed' ? 'unpaid' : 'completed';
    const statusText = booking.status === 'paid' ? 'PAID' : booking.status === 'unpaid' || booking.status === 'confirmed' ? 'UNPAID' : 'COMPLETED';
    
    const tripDate = new Date(booking.tripDate);
    const bookingDate = new Date(booking.bookingDate);
    
    // Check if trip date is valid
    const tripDateDisplay = isNaN(tripDate.getTime()) ? 'Date not set' : 
        `${tripDate.toLocaleDateString()} ${tripDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`;

    return `
        <div class="booking-item ${statusClass}">
            <div class="booking-item-header" onclick="toggleBookingDetailsView('${booking.id}')">
                <div class="booking-item-title">
                    <h3><i class="ri-taxi-line"></i> ${booking.routeName || 'Taxi Booking'}</h3>
                    <div class="booking-reference">Ref: ${booking.reference}</div>
                </div>
                <div class="booking-status ${statusClass}">${statusText}</div>
            </div>
            
            <div class="booking-item-quick-info">
                <div class="quick-info-item">
                    <i class="ri-calendar-line"></i>
                    <span>${tripDate.toLocaleDateString()}</span>
                </div>
                <div class="quick-info-item">
                    <i class="ri-group-line"></i>
                    <strong>${booking.passengers}</strong> ${booking.passengers === 1 ? 'person' : 'people'}
                </div>
                <div class="quick-info-item">
                    <i class="ri-money-dollar-circle-line"></i>
                    <strong>R${booking.totalAmount}</strong>
                </div>
            </div>
            
            <div class="booking-item-details" id="booking-details-${booking.id}">
                <div class="booking-details-grid">
                    <div class="booking-detail">
                        <div class="booking-detail-label">Trip Date & Time</div>
                        <div class="booking-detail-value">
                            <i class="ri-calendar-event-line"></i>
                            ${tripDateDisplay}
                        </div>
                    </div>
                    <div class="booking-detail">
                        <div class="booking-detail-label">Number of Passengers</div>
                        <div class="booking-detail-value">
                            <i class="ri-group-line"></i>
                            ${booking.passengers} ${booking.passengers === 1 ? 'person' : 'people'}
                        </div>
                    </div>
                    <div class="booking-detail">
                        <div class="booking-detail-label">Total Amount</div>
                        <div class="booking-detail-value">
                            <i class="ri-money-dollar-circle-line"></i>
                            R${booking.totalAmount}
                        </div>
                    </div>
                    <div class="booking-detail">
                        <div class="booking-detail-label">Price per Person</div>
                        <div class="booking-detail-value">
                            <i class="ri-user-line"></i>
                            R${booking.pricePerPerson}
                        </div>
                    </div>
                    <div class="booking-detail">
                        <div class="booking-detail-label">Booking Date</div>
                        <div class="booking-detail-value">
                            <i class="ri-time-line"></i>
                            ${bookingDate.toLocaleDateString()}
                        </div>
                    </div>
                    ${booking.tripOption ? `
                        <div class="booking-detail">
                            <div class="booking-detail-label">Trip Type</div>
                            <div class="booking-detail-value">
                                <i class="ri-route-line"></i>
                                ${booking.tripOption === 'custom' ? 'Custom Trip' : booking.tripOption === 'create' ? 'Created Trip' : 'Joined Trip'}
                            </div>
                        </div>
                    ` : ''}
                </div>
                
                ${createBookingLocationsHTML(booking)}
                
                <div class="booking-item-actions">
                    ${createBookingActionsHTML(booking, type)}
                </div>
            </div>
        </div>
    `;
}

function createBookingLocationsHTML(booking) {
    let locationsHTML = '';
    
    if (booking.pickupPoints && booking.pickupPoints.length > 0) {
        locationsHTML += `
            <div class="booking-locations-section">
                <h4><i class="ri-map-pin-user-fill"></i> Pickup Points</h4>
                ${booking.pickupPoints.map(p => `
                    <div class="location-item">
                        <i class="ri-map-pin-fill"></i>
                        ${p.address || 'Location not specified'}
                    </div>
                `).join('')}
            </div>
        `;
    }
    
    if (booking.dropoffPoints && booking.dropoffPoints.length > 0) {
        locationsHTML += `
            <div class="booking-locations-section">
                <h4><i class="ri-map-pin-3-fill"></i> Drop-off Points</h4>
                ${booking.dropoffPoints.map(p => `
                    <div class="location-item">
                        <i class="ri-map-pin-fill"></i>
                        ${p.address || 'Location not specified'}
                    </div>
                `).join('')}
            </div>
        `;
    }
    
    return locationsHTML;
}

function createBookingActionsHTML(booking, type) {
    let actions = '';
    
    if (type === 'unpaid') {
        actions += `
            <button class="booking-action-btn primary" onclick="payForExistingBooking('${booking.id}')">
                <i class="ri-bank-card-line"></i> Pay Now
            </button>
            <button class="booking-action-btn danger" onclick="cancelExistingBooking('${booking.id}')">
                <i class="ri-close-line"></i> Cancel Booking
            </button>
        `;
    } else {
        actions += `
            <button class="booking-action-btn secondary" onclick="viewBookingOnMap('${booking.id}')">
                <i class="ri-map-pin-line"></i> View on Map
            </button>
        `;
    }
    
    return actions;
}

function setupBookingsTabs() {
    const tabs = document.querySelectorAll('.booking-tab-btn');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const tabName = tab.getAttribute('data-tab');
            
            // Remove active class from all tabs
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            
            // Hide all content areas
            document.querySelectorAll('.booking-tab-content-area').forEach(c => c.classList.remove('active'));
            
            // Show selected content area
            const contentArea = document.getElementById(tabName);
            if (contentArea) {
                contentArea.classList.add('active');
            }
        });
    });
}

function toggleBookingDetailsView(bookingId) {
    const details = document.getElementById(`booking-details-${bookingId}`);
    if (details) {
        details.classList.toggle('show');
    }
}

function payForExistingBooking(bookingId) {
    const userBookings = JSON.parse(localStorage.getItem('userBookings') || '[]');
    const booking = userBookings.find(b => b.id === bookingId);
    
    if (!booking) {
        alert('Booking not found');
        return;
    }

    // Store payment data
    localStorage.setItem('paymentData', JSON.stringify({
        bookingId: booking.id,
        routeName: booking.routeName,
        passengers: booking.passengers,
        pricePerPerson: booking.pricePerPerson,
        totalAmount: booking.totalAmount,
        pickupPoints: booking.pickupPoints || [],
        dropoffPoints: booking.dropoffPoints || []
    }));

    // Redirect to payment page
    window.location.href = '/pages/customer/booking-payment.html';
}

function cancelExistingBooking(bookingId) {
    if (!confirm('Are you sure you want to cancel this booking? This action cannot be undone.')) {
        return;
    }

    let userBookings = JSON.parse(localStorage.getItem('userBookings') || '[]');
    userBookings = userBookings.filter(b => b.id !== bookingId);
    localStorage.setItem('userBookings', JSON.stringify(userBookings));

    // Reload bookings
    loadUserBookings();
    alert('Booking cancelled successfully');
}

function viewBookingOnMap(bookingId) {
    const userBookings = JSON.parse(localStorage.getItem('userBookings') || '[]');
    const booking = userBookings.find(b => b.id === bookingId);
    
    if (!booking) {
        alert('Booking not found');
        return;
    }

    // Show detailed information
    alert(`Booking Details:\n\n` +
          `Reference: ${booking.reference}\n` +
          `Route: ${booking.routeName}\n` +
          `Passengers: ${booking.passengers}\n` +
          `Total: R${booking.totalAmount}\n\n` +
          `In a future update, this will show the route on an interactive map.`);
}

// Make new functions globally accessible
window.viewActiveTrip = viewActiveTrip;
window.toggleBookingDetailsView = toggleBookingDetailsView;
window.payForExistingBooking = payForExistingBooking;
window.cancelExistingBooking = cancelExistingBooking;
window.viewBookingOnMap = viewBookingOnMap;

// Check for early delivery notifications on route selection step
function checkEarlyDeliveryOnRouteStep() {
    // This function checks if user is on route selection step and has pending parcel bookings
    const routeSelectionContent = document.getElementById('route-selection');
    if (!routeSelectionContent || !routeSelectionContent.classList.contains('active')) {
        return;
    }
    
    // Check for any pending parcel bookings with early delivery
    const pendingParcelBookings = JSON.parse(localStorage.getItem('pendingParcelBookings') || '[]');
    const earlyDeliveryBookings = pendingParcelBookings.filter(booking => 
        booking.status === 'pending_early_delivery' && booking.earlierTrip
    );
    
    // If user has a selected route, check for early delivery on that route
    if (selectedRoute && earlyDeliveryBookings.length > 0) {
        const matchingBooking = earlyDeliveryBookings.find(booking => booking.routeId === selectedRoute);
        if (matchingBooking && matchingBooking.earlierTrip) {
            showEarlyDeliveryNotification(matchingBooking.earlierTrip, matchingBooking.deliveryWindow, selectedRoute);
        }
    }
}

// Demo function to show early delivery notification with fake data (for testing/preview)
function showDemoEarlyDeliveryNotification() {
    if (!PARCEL_FEATURE_ENABLED) return;

    // Create fake earlier trip data
    const fakeEarlierTrip = {
        id: 'TRIP_DEMO_' + Date.now(),
        date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toLocaleDateString('en-ZA', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        }), // 2 days from now
        time: '08:30',
        parcelSpace: 'Available',
        routeId: 'jhb-ct',
        availableSpace: {
            large: 3,
            medium: 7,
            small: 15
        }
    };
    
    // Show notification with demo data
    showEarlyDeliveryNotification(fakeEarlierTrip, 'friday', 'jhb-ct');
}

// Notifications Management
let notifications = [];

// Toggle notifications dropdown
function toggleNotifications() {
    const dropdown = document.getElementById('notificationsDropdown');
    if (dropdown) {
        const isVisible = dropdown.style.display === 'block';
        dropdown.style.display = isVisible ? 'none' : 'block';
        
        if (!isVisible) {
            loadNotifications();
            // Close dropdown when clicking outside
            setTimeout(() => {
                document.addEventListener('click', closeNotificationsOnClickOutside);
            }, 100);
        } else {
            document.removeEventListener('click', closeNotificationsOnClickOutside);
        }
    }
}

// Close notifications when clicking outside
function closeNotificationsOnClickOutside(event) {
    const dropdown = document.getElementById('notificationsDropdown');
    const bell = document.getElementById('notificationBell');
    
    if (dropdown && bell && !dropdown.contains(event.target) && !bell.contains(event.target)) {
        dropdown.style.display = 'none';
        document.removeEventListener('click', closeNotificationsOnClickOutside);
    }
}

// Load and display notifications
function loadNotifications() {
    // Get notifications from localStorage
    const savedNotifications = JSON.parse(localStorage.getItem('userNotifications') || '[]');
    
    // Add demo early delivery notification if it doesn't exist
    const hasEarlyDeliveryNotification = savedNotifications.some(n => n.type === 'early_delivery');
    
    if (!hasEarlyDeliveryNotification) {
        const demoEarlyDeliveryNotification = {
            id: 'NOTIF_' + Date.now(),
            type: 'early_delivery',
            title: 'Earlier Delivery Available!',
            message: 'Great news! We found a trip on Johannesburg → Cape Town that can collect and deliver your parcels sooner than your chosen delivery window (Friday).',
            time: new Date().toISOString(),
            read: false,
            data: {
                routeId: 'jhb-ct',
                routeName: 'Johannesburg → Cape Town',
                earlierDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toLocaleDateString('en-ZA', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                }),
                earlierTime: '08:30',
                originalWindow: 'Friday',
                parcelSpace: 'Large: 3 | Medium: 7 | Small: 15'
            }
        };
        savedNotifications.unshift(demoEarlyDeliveryNotification);
        localStorage.setItem('userNotifications', JSON.stringify(savedNotifications));
    }
    
    notifications = savedNotifications;
    displayNotifications();
    updateNotificationBadge();
}

// Display notifications in dropdown
function displayNotifications() {
    const notificationsList = document.getElementById('notificationsList');
    if (!notificationsList) return;
    
    if (notifications.length === 0) {
        notificationsList.innerHTML = `
            <div class="no-notifications">
                <i class="ri-notification-off-line"></i>
                <p>No notifications</p>
            </div>
        `;
        return;
    }
    
    notificationsList.innerHTML = notifications.map(notification => {
        const timeAgo = getTimeAgo(notification.time);
        const unreadClass = !notification.read ? 'unread' : '';
        const iconClass = notification.type === 'early_delivery' ? 'early-delivery' : 'default';
        const icon = notification.type === 'early_delivery' ? 'ri-notification-3-line' : 'ri-information-line';
        
        let actionButtons = '';
        if (notification.type === 'early_delivery' && !notification.read) {
            actionButtons = `
                <div class="notification-actions">
                    <button class="notification-action-btn accept" onclick="handleEarlyDeliveryFromNotification('${notification.id}', 'accept')">
                        Accept & Complete Payment
                    </button>
                    <button class="notification-action-btn decline" onclick="handleEarlyDeliveryFromNotification('${notification.id}', 'decline')">
                        Keep Original Window
                    </button>
                </div>
            `;
        }
        
        return `
            <div class="notification-item ${unreadClass}" onclick="markNotificationAsRead('${notification.id}')">
                <div class="notification-icon ${iconClass}">
                    <i class="${icon}"></i>
                </div>
                <div class="notification-content">
                    <div class="notification-title">${notification.title}</div>
                    <div class="notification-message">${notification.message}</div>
                    <div class="notification-time">
                        <i class="ri-time-line"></i> ${timeAgo}
                    </div>
                    ${actionButtons}
                </div>
            </div>
        `;
    }).join('');
}

// Get time ago string
function getTimeAgo(dateString) {
    const now = new Date();
    const date = new Date(dateString);
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    return date.toLocaleDateString();
}

// Update notification badge count
function updateNotificationBadge() {
    const badge = document.getElementById('notificationBadge');
    if (!badge) return;
    
    const unreadCount = notifications.filter(n => !n.read).length;
    if (unreadCount > 0) {
        badge.textContent = unreadCount > 99 ? '99+' : unreadCount;
        badge.style.display = 'flex';
    } else {
        badge.style.display = 'none';
    }
}

// Mark notification as read
function markNotificationAsRead(notificationId) {
    const notification = notifications.find(n => n.id === notificationId);
    if (notification && !notification.read) {
        notification.read = true;
        localStorage.setItem('userNotifications', JSON.stringify(notifications));
        displayNotifications();
        updateNotificationBadge();
    }
}

// Handle early delivery notification action
function handleEarlyDeliveryFromNotification(notificationId, action) {
    const notification = notifications.find(n => n.id === notificationId);
    if (!notification || notification.type !== 'early_delivery') return;
    
    markNotificationAsRead(notificationId);
    
    if (action === 'accept') {
        // Navigate to booking page with early delivery accepted
        sessionStorage.setItem('selectedEarlyDeliveryTrip', JSON.stringify(notification.data));
        sessionStorage.setItem('deliveryWindow', 'early');
        sessionStorage.setItem('originalDeliveryWindow', notification.data.originalWindow);
        
        // Redirect to booking-public.html or payment page
        window.location.href = 'booking-public.html';
    } else {
        // User declined, just close dropdown
        toggleNotifications();
    }
}

// Check authentication and load notifications
function checkAuthAndLoadNotifications() {
    // Check if user is logged in (check localStorage or sessionStorage)
    const currentUser = localStorage.getItem('currentUser') || sessionStorage.getItem('currentUser');
    const authButtons = document.getElementById('authButtons');
    const fullNav = document.getElementById('fullNav');
    
    if (currentUser && fullNav) {
        // User is logged in
        if (authButtons) authButtons.style.display = 'none';
        fullNav.style.display = 'flex';
        // Load notifications
        loadNotifications();
    } else {
        // User is not logged in
        if (authButtons) authButtons.style.display = 'flex';
        if (fullNav) fullNav.style.display = 'none';
    }
}

// Make functions globally accessible
window.toggleNotifications = toggleNotifications;
window.markNotificationAsRead = markNotificationAsRead;
window.handleEarlyDeliveryFromNotification = handleEarlyDeliveryFromNotification;

// Initialize the page
document.addEventListener('DOMContentLoaded', function() {
    initializeMap();
    checkActiveTrip();
    loadUserBookings();
    setupBookingsTabs();
    checkForJoinLink(); // Check if user is joining via shared link
    checkEarlyDeliveryOnRouteStep(); // Check for early delivery notifications
    
    // Load notifications if user is logged in
    const fullNav = document.getElementById('fullNav');
    if (fullNav && fullNav.style.display !== 'none') {
        loadNotifications();
    }
    
    // Simulate background checking for early delivery (this would be backend in production)
    simulateBackgroundEarlyDeliveryCheck();
    
    // DEMO: Show early delivery notification with fake data for preview
    // Remove this line in production - it's just for testing/preview
    setTimeout(() => {
        showDemoEarlyDeliveryNotification();
    }, 1000); // Show after 1 second to let page load
    
    // Also check when route selection step is shown
    const routeSelection = document.getElementById('route-selection');
    if (routeSelection) {
        const observer = new MutationObserver(function(mutations) {
            mutations.forEach(function(mutation) {
                if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                    if (routeSelection.classList.contains('active')) {
                        checkEarlyDeliveryOnRouteStep();
                    }
                }
            });
        });
        observer.observe(routeSelection, { attributes: true });
        
        // Also check immediately if route selection is already active
        if (routeSelection.classList.contains('active')) {
            checkEarlyDeliveryOnRouteStep();
        }
    }
});

