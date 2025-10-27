// Booking Public - Route-Based Booking JavaScript

// Get Mapbox token from environment variable
const accessToken = import.meta.env.VITE_MAPBOX_TOKEN;

// State variables
let selectedRoute = null;
let passengerCount = 1;
let parcelCount = 0;
const MAX_TOTAL_CAPACITY = 14;
let currentStep = 1;
let map = null;
let tripOption = null; // 'create' or 'join'
let selectedTrip = null;
let tripLocationsMap = null;
let pickupPoints = [];
let dropoffPoints = [];
let pickupCounter = 1;
let dropoffCounter = 1;
let parcelData = {}; // Store parcel data by unique ID

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

    // Update map
    addRouteMarkers();

    // Enable next step
    setTimeout(() => {
        nextStep();
    }, 500);
}

function nextStep() {
    if (currentStep < 4) {
        // Hide current step
        document.querySelector(`#step${currentStep}`).classList.remove('active');
        document.querySelector(`#step${currentStep}`).classList.add('completed');
        document.querySelector('.booking-content.active').classList.remove('active');

        currentStep++;

        // Show next step
        document.querySelector(`#step${currentStep}`).classList.add('active');
        
        // Show the correct booking content by ID
        if (currentStep === 2) {
            document.getElementById('passenger-selection').classList.add('active');
            // Initialize passenger info and forms
            updatePassengerInfo();
                } else if (currentStep === 3) {
                    document.getElementById('trip-selection').classList.add('active');
                    // Reset trip selection
                    tripOption = null;
                    selectedTrip = null;
                    document.getElementById('continue-trip-btn').style.display = 'none';
                    
                    // Check if should disable join option
                    checkAndDisableJoinOption();
                } else if (currentStep === 4) {
            document.getElementById('booking-confirmation').classList.add('active');
            updateBookingSummary();
        }
    }
}

function goBack() {
    if (currentStep > 1) {
        // Hide current step
        document.querySelector(`#step${currentStep}`).classList.remove('active');
        document.querySelector('.booking-content.active').classList.remove('active');

        currentStep--;

        // Show previous step
        document.querySelector(`#step${currentStep}`).classList.remove('completed');
        document.querySelector(`#step${currentStep}`).classList.add('active');
        
        // Show the correct booking content by ID
        if (currentStep === 1) {
            document.getElementById('route-selection').classList.add('active');
        } else if (currentStep === 2) {
            document.getElementById('passenger-selection').classList.add('active');
        } else if (currentStep === 3) {
            document.getElementById('trip-selection').classList.add('active');
        }
    }
}

// Trip Selection Functions
function selectTripOption(option) {
    // Don't allow selecting join if user has 14 passengers
    if (option === 'join' && passengerCount >= 14) {
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
    
    if (!selectedRoute || !passengerCount) return;
    
    const route = routes[selectedRoute];
    const seatsNeeded = 14 - passengerCount;
    
    // Update filter info
    document.getElementById('filter-route').textContent = route.name;
    document.getElementById('filter-passengers').textContent = passengerCount;
    document.getElementById('filter-seats-needed').textContent = seatsNeeded;
    
    // Sample available trips (in production, this would come from an API)
    const availableTrips = [
        {
            id: 'trip-001',
            route: selectedRoute,
            organizer: 'John M.',
            currentPassengers: 5,
            seatsAvailable: 9,
            departureTime: 'Tomorrow 08:00 AM',
            departureDate: '2024-01-15',
            pricePerPerson: route.price
        },
        {
            id: 'trip-002',
            route: selectedRoute,
            organizer: 'Sarah K.',
            currentPassengers: 6,
            seatsAvailable: 8,
            departureTime: 'Jan 20, 10:00 AM',
            departureDate: '2024-01-20',
            pricePerPerson: route.price
        },
        {
            id: 'trip-003',
            route: selectedRoute,
            organizer: 'Mike T.',
            currentPassengers: 8,
            seatsAvailable: 6,
            departureTime: 'Jan 22, 2:00 PM',
            departureDate: '2024-01-22',
            pricePerPerson: route.price
        }
    ];
    
    // Filter trips that have enough seats
    const matchingTrips = availableTrips.filter(trip => 
        trip.route === selectedRoute && trip.seatsAvailable >= passengerCount
    );
    
    // Display trips
    availableTripsList.innerHTML = '';
    
    if (matchingTrips.length === 0) {
        availableTripsList.innerHTML = `
            <div class="no-trips-message">
                <i class="ri-error-warning-line"></i>
                <h4>No Matching Trips Found</h4>
                <p>There are currently no trips with ${passengerCount} available seats on this route. Consider creating your own trip!</p>
            </div>
        `;
    } else {
        matchingTrips.forEach(trip => {
            const tripHTML = `
                <div class="available-trip-card" data-trip-id="${trip.id}" onclick="selectTrip('${trip.id}')">
                    <div class="available-trip-header">
                        <h4><i class="ri-map-pin-user-line"></i>Trip by ${trip.organizer}</h4>
                        <span class="trip-status-badge">${trip.seatsAvailable} Seats Available</span>
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
}

function selectTrip(tripId) {
    selectedTrip = tripId;
    
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
    if (parcelCount > 0) {
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
        
        // Validate sender name
        if (!parcel.senderName || parcel.senderName.trim() === '') {
            return {
                valid: false,
                message: `Parcel ${i}: Please enter the sender's name.`
            };
        }
        
        // Validate sender phone
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
        
        // Validate receiver name
        if (!parcel.receiverName || parcel.receiverName.trim() === '') {
            return {
                valid: false,
                message: `Parcel ${i}: Please enter the receiver's name.`
            };
        }
        
        // Validate receiver phone
        if (!parcel.receiverPhone || parcel.receiverPhone.trim() === '') {
            return {
                valid: false,
                message: `Parcel ${i}: Please enter the receiver's phone number.`
            };
        }
        
        if (!validateSAPhoneNumber(parcel.receiverPhone)) {
            return {
                valid: false,
                message: `Parcel ${i}: Receiver's phone number is invalid. Please enter a valid South African phone number (e.g., 071 234 5678 or +27 71 234 5678).`
            };
        }
        
        // Validate parcel images (at least one image required)
        if (!parcel.images || parcel.images.length === 0) {
            return {
                valid: false,
                message: `Parcel ${i}: Please upload at least one image of the parcel.`
            };
        }
    }
    
    return { valid: true };
}

// Capacity Management Functions
function updateCapacityDisplay() {
    const total = passengerCount + parcelCount;
    const capacityPercentage = (total / MAX_TOTAL_CAPACITY) * 100;
    
    // Update displays
    document.getElementById('passenger-count-display-public').textContent = passengerCount;
    document.getElementById('parcel-count-display-public').textContent = parcelCount;
    document.getElementById('total-capacity-display').textContent = total;
    document.getElementById('passengers-only').textContent = passengerCount;
    document.getElementById('parcels-only').textContent = parcelCount;
    document.getElementById('remaining-capacity').textContent = MAX_TOTAL_CAPACITY - total;

    // Update capacity bar
    document.getElementById('capacity-fill').style.width = `${capacityPercentage}%`;
    
    // Show/hide warning
    const warning = document.getElementById('capacity-warning-public');
    if (total >= MAX_TOTAL_CAPACITY) {
        warning.style.display = 'block';
    } else {
        warning.style.display = 'none';
    }
    
    // Update parcel forms visibility
    const parcelDetails = document.getElementById('parcel-details');
    if (parcelCount > 0) {
        parcelDetails.style.display = 'block';
    } else {
        parcelDetails.style.display = 'none';
    }
    
    // Update continue button state
    updateContinueButtonState();
}

function updateContinueButtonState() {
    const continueBtn = document.getElementById('continue-passenger-btn');
    const validationMsg = document.getElementById('parcel-validation-message');
    const validationText = document.getElementById('validation-message-text');
    
    if (!continueBtn) return;
    
    // Check if parcels need validation
    if (parcelCount > 0) {
        const validation = validateParcelInformation();
        
        if (!validation.valid) {
            // Disable button and show message
            continueBtn.disabled = true;
            continueBtn.style.opacity = '0.5';
            continueBtn.style.cursor = 'not-allowed';
            validationMsg.style.display = 'block';
            validationText.textContent = validation.message;
        } else {
            // Enable button and hide message
            continueBtn.disabled = false;
            continueBtn.style.opacity = '1';
            continueBtn.style.cursor = 'pointer';
            validationMsg.style.display = 'none';
        }
    } else {
        // No parcels, button is always enabled
        continueBtn.disabled = false;
        continueBtn.style.opacity = '1';
        continueBtn.style.cursor = 'pointer';
        validationMsg.style.display = 'none';
    }
}

function validateAndProceed() {
    // If there are parcels, validate them
    if (parcelCount > 0) {
        const validation = validateParcelInformation();
        if (!validation.valid) {
            // Show error message
            const validationMsg = document.getElementById('parcel-validation-message');
            const validationText = document.getElementById('validation-message-text');
            validationMsg.style.display = 'block';
            validationText.textContent = validation.message;
            
            // Scroll to validation message
            validationMsg.scrollIntoView({ behavior: 'smooth', block: 'center' });
            return;
        }
    }
    
    // All validation passed, proceed to next step
    nextStep();
}

function incrementPassengersPublic() {
    const total = passengerCount + parcelCount;
    if (total < MAX_TOTAL_CAPACITY) {
        passengerCount++;
    generatePassengerForms();
        updateCapacityDisplay();
        checkAndDisableJoinOption();
    }
}

function decrementPassengersPublic() {
    if (passengerCount > 0) {
        passengerCount--;
        generatePassengerForms();
        updateCapacityDisplay();
        checkAndDisableJoinOption();
    }
}

function incrementParcelsPublic() {
    const total = passengerCount + parcelCount;
    if (total < MAX_TOTAL_CAPACITY) {
        parcelCount++;
        if (!parcelData[parcelCount]) {
            parcelData[parcelCount] = {
                senderName: '',
                senderPhone: '',
                receiverName: '',
                receiverPhone: '',
                secretCode: generateSecretCode(),
                images: []
            };
        }
        generateParcelForms();
        updateCapacityDisplay();
        checkAndDisableJoinOption();
    }
}

function decrementParcelsPublic() {
    if (parcelCount > 0) {
        delete parcelData[parcelCount];
        parcelCount--;
        generateParcelForms();
        updateCapacityDisplay();
        checkAndDisableJoinOption();
    }
}

function generateSecretCode() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

function updatePassengerInfo() {
    updateCapacityDisplay();
    generatePassengerForms();
    generateParcelForms();
}

function generatePassengerForms() {
    const formsContainer = document.getElementById('passenger-forms');
    formsContainer.innerHTML = '';

    for (let i = 1; i <= passengerCount; i++) {
        const isPrimary = i === 1;
        const formHTML = `
            <div class="passenger-form-card">
                <div class="passenger-form-header">
                    <h5>
                        <i class="ri-user-line"></i>
                        Passenger ${i}
                    </h5>
                    ${isPrimary ? '<span class="passenger-form-badge">Primary Contact</span>' : ''}
                </div>
                <div class="passenger-form-grid">
                    <div class="passenger-form-group">
                        <label>
                            <i class="ri-user-3-line"></i>
                            Full Name
                        </label>
                        <input type="text" placeholder="e.g., John Doe" id="passenger-name-${i}">
                    </div>
                    <div class="passenger-form-group">
                        <label>
                            <i class="ri-mail-line"></i>
                            Email Address
                        </label>
                        <input type="email" placeholder="e.g., john@example.com" id="passenger-email-${i}">
                    </div>
                    <div class="passenger-form-group">
                        <label>
                            <i class="ri-phone-line"></i>
                            Phone Number
                        </label>
                        <input type="tel" placeholder="e.g., 0712345678" id="passenger-phone-${i}">
                    </div>
                    <div class="passenger-form-group">
                        <label>
                            <i class="ri-fingerprint-line"></i>
                            ID Number
                        </label>
                        <input type="text" placeholder="e.g., 8001015009087" id="passenger-id-${i}">
                    </div>
                </div>
            </div>
        `;
        formsContainer.innerHTML += formHTML;
    }
}

// Parcel Form Generation
function generateParcelForms() {
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
                images: []
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
    if (parcelData[parcelNumber]) {
        parcelData[parcelNumber][field] = value;
        // Update button state after field change
        updateContinueButtonState();
    }
}

function handleParcelImageUploadPublic(parcelNumber, input) {
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
    if (parcelData[parcelNumber] && parcelData[parcelNumber].images) {
        parcelData[parcelNumber].images.splice(imageIndex, 1);
        generateParcelForms();
        // Update button state after removing image
        updateContinueButtonState();
    }
}

function updateBookingSummary() {
    if (selectedRoute && routes[selectedRoute]) {
        const route = routes[selectedRoute];
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

        let summaryHTML = `
            <div class="summary-row">
                <span>Route:</span>
                <span>${route.name}</span>
            </div>
            <div class="summary-row">
                <span>Trip Type:</span>
                <span>${tripTypeText}</span>
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

        document.getElementById('booking-summary').innerHTML = summaryHTML;
    }
}

function confirmBooking() {
    if (selectedRoute && passengerCount > 0) {
        if (tripOption === 'create') {
            // Check if trip is full (14 passengers)
            if (passengerCount >= 14) {
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
    const seatsAvailable = 14 - passengerCount;
    const capacityPercentage = (passengerCount / 14) * 100;
    
    document.getElementById('trip-route-display').textContent = route.name;
    document.getElementById('trip-current-passengers').textContent = passengerCount;
    document.getElementById('trip-seats-available').textContent = seatsAvailable;
    document.getElementById('trip-capacity-text').textContent = `${passengerCount} / 14`;
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
    if (passengerCount >= 14) {
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
    if (currentPassengers < 14) {
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
    const message = `🚖 Join my trip on TeksiMap!\n\nRoute: ${route.name}\nSeats Available: ${14 - passengerCount - parcelCount}\n\nOnly logged-in users can join. Click the link below:\n${link}`;
    
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
}

function shareViaEmail() {
    const link = document.getElementById('trip-share-link').value;
    const route = routes[selectedRoute];
    const subject = `Join my trip: ${route.name}`;
    const body = `Hi!\n\nI've created a trip on TeksiMap and I'd like to invite you to join.\n\nRoute: ${route.name}\nSeats Available: ${14 - passengerCount - parcelCount}\n\nNote: You need to be logged in to TeksiMap to join this trip.\n\nJoin here: ${link}\n\nSee you on the trip!`;
    
    const mailtoUrl = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.href = mailtoUrl;
}

function shareViaSMS() {
    const link = document.getElementById('trip-share-link').value;
    const route = routes[selectedRoute];
    const message = `Join my trip on TeksiMap! Route: ${route.name}. ${14 - passengerCount - parcelCount} seats available. Login required: ${link}`;
    
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
            if (tripData.passengers < 14) {
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
    const seatsAvailable = 14 - tripData.passengers;
    
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
    if (tripOption === 'create' && passengerCount < 14) {
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
    
    if (passengerCount >= 14) {
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

// Initialize the page
document.addEventListener('DOMContentLoaded', function() {
    initializeMap();
    checkActiveTrip();
    loadUserBookings();
    setupBookingsTabs();
    checkForJoinLink(); // Check if user is joining via shared link
});

