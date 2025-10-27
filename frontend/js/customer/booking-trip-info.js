// Trip Info Page JavaScript
import axios from 'axios';
import { BASE_URL } from "../AddressSelection.js";

// Navigation functions (matching standard pages)
function toggleMobileMenu() {
    const navLinks = document.querySelector('.nav-links');
    navLinks.classList.toggle('show');
}

function topNavZIndexDecrease() {
    // Function to handle navigation z-index
    const topnav = document.querySelector('.topnav');
    if (topnav) {
        topnav.style.zIndex = '999';
    }
}

// === MAP IMPLEMENTATION (Following client.js pattern) ===

// Mapbox setup (same as client.js)
const accessToken = import.meta.env.VITE_MAPBOX_TOKEN;
mapboxgl.accessToken = accessToken;

// Global variables
let map;
let markers = [];
let pickupPoints = [];
let destinationMarker = null;

// Initialize the page
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM Content Loaded');
    
    // Initialize map immediately (same as client.js)
    initializeMap();
    setupEventListeners();
    setDefaultDateTime();
    updateTripSummary();
});

function initializeMap() {
    console.log('Initializing booking map...');
    
    // Initialize map (same pattern as client.js)
    map = new mapboxgl.Map({
        container: "bookingMap",
        style: "mapbox://styles/mapbox/streets-v11",
        center: [28.5, -26.2], // approximate center of Gauteng
        zoom: 8,
        // Limit map bounds to South Africa
        maxBounds: [
            [16.0, -35.0], // Southwest coordinates (min longitude, min latitude)
            [33.0, -22.0]  // Northeast coordinates (max longitude, max latitude)
        ],
    });
    
    console.log('Map initialized successfully');
    
    // Add navigation controls
    map.addControl(new mapboxgl.NavigationControl());
}

function setupEventListeners() {
    // Add pickup point button
    document.getElementById('addPickupPoint').addEventListener('click', addPickupPoint);
    
    // Form submission
    document.getElementById('tripInfoForm').addEventListener('submit', handleFormSubmit);
    
    // Map controls
    document.getElementById('clearMarkers').addEventListener('click', clearAllMarkers);
    document.getElementById('centerMap').addEventListener('click', centerMap);
    
    // Destination search (same pattern as client.js)
    const destinationInput = document.getElementById('destination');
    const destinationSuggestions = document.getElementById('destinationSuggestions');
    
    destinationInput.addEventListener('input', () => {
        console.log('Destination input changed:', destinationInput.value);
        fetchSuggestions(destinationSuggestions, destinationInput.value);
    });
    
    // First pickup point search
    const firstPickupInput = document.querySelector('input[name="pickup[]"]');
    const firstPickupSuggestions = document.getElementById('pickupSuggestions1');
    
    console.log('First pickup input found:', firstPickupInput);
    console.log('First pickup suggestions found:', firstPickupSuggestions);
    
    if (firstPickupInput && firstPickupSuggestions) {
        firstPickupInput.addEventListener('input', () => {
            console.log('Pickup input changed:', firstPickupInput.value);
            fetchSuggestions(firstPickupSuggestions, firstPickupInput.value);
        });
    }
    
    // Form inputs
    document.getElementById('passengerCount').addEventListener('input', updateTripSummary);
    
    // Date/time validation
    document.getElementById('departureDate').addEventListener('change', validateDates);
    document.getElementById('returnDate').addEventListener('change', validateDates);
    
}

// === SUGGESTIONS SYSTEM (Following client.js pattern) ===

async function fetchSuggestions(suggestions, query) {
    console.log('fetchSuggestions called with:', query, 'for element:', suggestions);
    
    if (!query) {
        suggestions.innerHTML = ""; // Clear suggestions if input is empty
        return;
    }

    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
        query
    )}.json?access_token=${mapboxgl.accessToken}&country=ZA&autocomplete=true&limit=10`;
    
    try {
        const response = await fetch(url);
        const data = await response.json();

        console.log('Received suggestions:', data.features.length);

        // Populate the dropdown with suggestions
        suggestions.innerHTML = "";
        if (data.features.length > 0) {
            data.features.forEach((feature) => {
                const li = document.createElement("li");
                li.textContent = feature.place_name;
                li.style.padding = "10px";
                li.style.cursor = "pointer";
                li.style.borderBottom = "1px solid #eee";
                li.style.backgroundColor = "#fff";
                li.style.transition = "background-color 0.2s";

                li.addEventListener("mouseenter", () => {
                    li.style.backgroundColor = "#f0f0f0";
                });

                li.addEventListener("mouseleave", () => {
                    li.style.backgroundColor = "#fff";
                });

                li.addEventListener("click", () => {
                    const longitude = feature.center[0];
                    const latitude = feature.center[1];

                    console.log("Selected coordinates:", longitude, latitude);

                    if (suggestions.id === 'destinationSuggestions') {
                        // Handle destination selection
                        setDestination(feature.place_name, longitude, latitude);
                        document.getElementById('destination').value = feature.place_name;
                        suggestions.innerHTML = "";
                    } else {
                        // Handle pickup point selection
                        const pickupIndex = parseInt(suggestions.id.replace('pickupSuggestions', '')) - 1;
                        setPickupPoint(feature.place_name, longitude, latitude, pickupIndex);
                        const pickupInput = document.querySelector(`input[name="pickup[]"]:nth-of-type(${pickupIndex + 1})`);
                        if (pickupInput) pickupInput.value = feature.place_name;
                        suggestions.innerHTML = "";
                    }
                });

                suggestions.appendChild(li);
            });
        }
    } catch (error) {
        console.error("Error fetching suggestions:", error);
    }
}

function setDestination(address, lng, lat) {
    if (destinationMarker) {
        destinationMarker.remove();
    }
    
    // Create destination marker (same pattern as client.js)
    destinationMarker = new mapboxgl.Marker({ color: '#dc3545' })
        .setLngLat([lng, lat])
        .addTo(map);
    
    // Fly to the location
    map.flyTo({ center: [lng, lat], zoom: 12 });
    
    updateTripSummary();
}

function setPickupPoint(address, lng, lat, index) {
    // Remove existing marker if it exists
    if (markers[index]) {
        markers[index].remove();
    }
    
    // Create pickup marker (same pattern as client.js)
    markers[index] = new mapboxgl.Marker({ color: '#28a745' })
        .setLngLat([lng, lat])
        .addTo(map);
    
    // Update pickup point data
    pickupPoints[index] = { address, lng, lat, index };
    
    // Fly to the location
    map.flyTo({ center: [lng, lat], zoom: 12 });
    
    updateTripSummary();
}

function addPickupPointFromMap(address, lng, lat) {
    const pickupIndex = pickupPoints.length;
    const pickupPoint = { address, lng, lat, index: pickupIndex };
    pickupPoints.push(pickupPoint);
    
    // Add marker
    const marker = new mapboxgl.Marker({ color: '#28a745' })
        .setLngLat([lng, lat])
        .addTo(map);
    
    markers.push(marker);
    
    // Add input field
    addPickupInputField(address, pickupIndex);
    updateTripSummary();
}

function addPickupPoint() {
    const pickupIndex = pickupPoints.length;
    const emptyPickup = { address: '', lng: null, lat: null, index: pickupIndex };
    pickupPoints.push(emptyPickup);
    
    addPickupInputField('', pickupIndex);
    updateRemoveButtons();
}

function addPickupInputField(address, index) {
    const pickupList = document.getElementById('pickupPointsList');
    const pickupItem = document.createElement('div');
    pickupItem.className = 'pickup-point-item';
    pickupItem.innerHTML = `
        <div class="input-group">
            <label>Pickup Point ${index + 1}</label>
            <div class="input-with-icon">
                <input type="text" name="pickup[]" placeholder="Search for pickup address" value="${address}" required>
                <span class="input-icon">📍</span>
            </div>
            <ul id="pickupSuggestions${index + 1}" class="suggestions-dropdown"></ul>
        </div>
        <button type="button" class="remove-pickup">Remove</button>
    `;
    
    pickupList.appendChild(pickupItem);
    
    // Add event listeners (same pattern as client.js)
    const input = pickupItem.querySelector('input');
    const removeBtn = pickupItem.querySelector('.remove-pickup');
    const suggestions = pickupItem.querySelector(`#pickupSuggestions${index + 1}`);
    
    input.addEventListener('input', () => {
        fetchSuggestions(suggestions, input.value);
    });
    
    removeBtn.addEventListener('click', () => removePickupPoint(index));
    
    // Show remove button if more than 1 pickup point
    updateRemoveButtons();
}





function removePickupPoint(index) {
    // Remove from array
    pickupPoints.splice(index, 1);
    
    // Remove marker
    if (markers[index]) {
        markers[index].remove();
        markers.splice(index, 1);
    }
    
    // Rebuild pickup point list
    rebuildPickupPointsList();
    updateTripSummary();
}

function rebuildPickupPointsList() {
    const pickupList = document.getElementById('pickupPointsList');
    pickupList.innerHTML = '';
    
    pickupPoints.forEach((pickup, index) => {
        addPickupInputField(pickup.address, index);
    });
}

function updateRemoveButtons() {
    const removeButtons = document.querySelectorAll('.remove-pickup');
    removeButtons.forEach(btn => {
        btn.style.display = pickupPoints.length > 1 ? 'block' : 'none';
    });
}

function clearAllMarkers() {
    markers.forEach(marker => marker.remove());
    if (destinationMarker) destinationMarker.remove();
    
    markers = [];
    destinationMarker = null;
    pickupPoints = [];
    
    document.getElementById('destination').value = '';
    rebuildPickupPointsList();
    updateTripSummary();
}


function centerMap() {
    if (destinationMarker && pickupPoints.length > 0) {
        // Fit bounds to all markers
        const bounds = new mapboxgl.LngLatBounds();
        
        bounds.extend([destinationMarker.getLngLat().lng, destinationMarker.getLngLat().lat]);
        pickupPoints.forEach(pickup => {
            if (pickup.lng && pickup.lat) {
                bounds.extend([pickup.lng, pickup.lat]);
            }
        });
        
        map.fitBounds(bounds, { padding: 50 });
    } else {
        map.flyTo({ center: [28.0473, -26.2041], zoom: 12 });
    }
}

function setDefaultDateTime() {
    const now = new Date();
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    
    document.getElementById('departureDate').value = tomorrow.toISOString().split('T')[0];
    document.getElementById('departureTime').value = '08:00';
}

function validateDates() {
    const departureDate = document.getElementById('departureDate').value;
    const returnDate = document.getElementById('returnDate').value;
    
    if (returnDate && returnDate < departureDate) {
        alert('Return date must be after departure date');
        document.getElementById('returnDate').value = '';
    }
}

function updateTripSummary() {
    const passengerCount = document.getElementById('passengerCount').value;
    
    document.getElementById('passengerSummary').textContent = passengerCount;
    document.getElementById('pickupCount').textContent = pickupPoints.length;
    
    // Calculate estimated distance and duration
    if (destinationMarker && pickupPoints.length > 0) {
        calculateRouteDetails();
    }
}

function calculateRouteDetails() {
    // This would integrate with a routing service to calculate actual distances and times
    // For now, using placeholder values
    const estimatedDistance = Math.floor(Math.random() * 50) + 10;
    const estimatedDuration = Math.floor(estimatedDistance / 30 * 60);
    
    document.getElementById('estimatedDistance').textContent = `${estimatedDistance} km`;
    document.getElementById('estimatedDuration').textContent = `${estimatedDuration} minutes`;
}

function handleFormSubmit(e) {
    e.preventDefault();
    
    // Validate form
    if (!validateForm()) {
        return;
    }
    
    // Collect form data
    const formData = {
        destination: document.getElementById('destination').value,
        pickupPoints: pickupPoints.map(pickup => ({
            address: pickup.address,
            lng: pickup.lng,
            lat: pickup.lat
        })),
        passengerCount: parseInt(document.getElementById('passengerCount').value),
        departureDate: document.getElementById('departureDate').value,
        departureTime: document.getElementById('departureTime').value,
        returnDate: document.getElementById('returnDate').value || null,
        returnTime: document.getElementById('returnTime').value || null,
        maxDistance: parseFloat(document.getElementById('maxDistance').value)
    };
    
    // Store in sessionStorage for next page
    sessionStorage.setItem('tripInfo', JSON.stringify(formData));
    
    // Navigate to next page
    window.location.href = '/pages/customer/booking-select-transport.html';
}

function validateForm() {
    const destination = document.getElementById('destination').value.trim();
    const passengerCount = parseInt(document.getElementById('passengerCount').value);
    const departureDate = document.getElementById('departureDate').value;
    const departureTime = document.getElementById('departureTime').value;
    
    if (!destination) {
        alert('Please enter a destination');
        return false;
    }
    
    if (!destinationMarker) {
        alert('Please select a destination on the map');
        return false;
    }
    
    if (pickupPoints.length === 0) {
        alert('Please add at least one pickup point');
        return false;
    }
    
    if (passengerCount < 1) {
        alert('Please enter a valid number of passengers');
        return false;
    }
    
    if (!departureDate || !departureTime) {
        alert('Please select departure date and time');
        return false;
    }
    
    return true;
}

// Make functions globally available
window.toggleMobileMenu = toggleMobileMenu;
window.topNavZIndexDecrease = topNavZIndexDecrease;
