/**
 * ============================================
 * BOOKING PUBLIC - ROUTE-BASED BOOKING SYSTEM
 * ============================================
 * 
 * This file handles the complete booking flow for route-based taxi/transport bookings.
 * It supports both passenger bookings and parcel delivery bookings with the following features:
 * 
 * MAIN FUNCTIONALITIES:
 * 1. Route Selection - Users select from predefined routes (e.g., Pretoria → Tzaneen)
 * 3. Location Selection - Pickup and dropoff point selection with Google Maps integration
 * 4. Passenger/Parcel Management - Add passengers or parcels to booking
 * 5. Booking Confirmation - Review and confirm booking details
 * 6. Payment Processing - Handle payment via multiple methods (Card, EFT, Mobile)
 * 7. Trip Sharing - Generate shareable links for trips needing more passengers
 * 9. Booking Management - View, cancel, and manage existing bookings
 * 
 * BOOKING FLOW:
 * Step 1: Route Selection → Step 2: Location Selection → 
 * Step 3: Passenger/Parcel Info → Step 4: Booking Summary → 
 * Step 5: Payment → Step 6: Confirmation
 * 
 * API INTEGRATION:
 * - Uses bookingApi for creating bookings, adding passengers/parcels
 * - Uses vehicleApi for searching and selecting vehicles
 * - Uses paymentApi for processing payments
 * 
 * DATA PERSISTENCE:
 * - Uses sessionStorage for temporary booking data during flow
 * - Uses localStorage for completed bookings and user preferences
 * ============================================
 */

import * as bookingApi from '../api/bookingApi.js';
import * as vehicleApi from '../api/vehicleApi.js';
import * as paymentApi from '../api/paymentApi.js';

// ============================================
// CONFIGURATION & CONSTANTS
// ============================================


/**
 * Maximum total capacity for a vehicle (passengers + parcel space)
 * This is the total number of seats available in a vehicle
 */
const MAX_TOTAL_CAPACITY = 15;

/**
 * Feature flag to enable/disable parcel booking functionality
 * When false, parcel-related features are hidden and disabled
 */
const PARCEL_FEATURE_ENABLED = true;

// ============================================
// STATE VARIABLES - Booking Flow State
// ============================================

/**
 * Currently selected route ID (e.g., 'pta-tzn' for Pretoria → Tzaneen)
 * Used to identify which route the user has selected for booking
 */
let selectedRoute = null;

/**
 * Number of passengers in the current booking
 * Defaults to 1 (the booking user)
 */
let passengerCount = 1;

/**
 * Number of parcels in the current booking
 * Only used when bookingType is 'parcels'
 */
let parcelCount = 0;

/**
 * Current step in the booking flow (1-7)
 * 1: Route Selection
 * 2: Location Selection
 * 3: Passenger/Parcel Information
 * 4: Booking Summary
 * 5: Payment
 * 6: Confirmation
 */
let currentStep = 1;

/**
 * Desired trip date/time selected by user
 * Format: ISO string or formatted date string
 */
let desiredTripDate = '';

/**
 * Type of booking being made
 * - 'passengers': Booking is for passenger transport
 * - 'parcels': Booking is for parcel delivery
 */
let bookingType = 'passengers'; // 'passengers' or 'parcels'


// ============================================
// STATE VARIABLES - Map & Location State
// ============================================

/**
 * Google Maps instance for main route display map
 * Shows the selected route with start and end markers
 */
let map = null;

/**
 * Google Maps marker for route start location
 * Displays the origin city on the map
 */
let routeStartMarker = null;

/**
 * Google Maps marker for route end location
 * Displays the destination city on the map
 */
let routeEndMarker = null;

/**
 * Google Maps polyline showing the route path
 * Draws a line connecting start and end points
 */
let routePolylineMain = null;

/**
 * Google Maps instance for trip locations selection map
 * Used when user is selecting specific pickup/dropoff points
 */
let tripLocationsMap = null;

/**
 * Array of pickup points selected by user
 * Each point contains: address, coordinates (lat/lng), index
 * Users can add multiple pickup points
 */
let pickupPoints = [];

/**
 * Array of dropoff points selected by user
 * Each point contains: address, coordinates (lat/lng), index
 * Users can add multiple dropoff points
 */
let dropoffPoints = [];

/**
 * Counter for pickup points (for unique identification)
 * Increments each time a new pickup point is added
 */
let pickupCounter = 1;

/**
 * Counter for dropoff points (for unique identification)
 * Increments each time a new dropoff point is added
 */
let dropoffCounter = 1;

// ============================================
// STATE VARIABLES - Parcel Data
// ============================================

/**
 * Object storing parcel data by unique parcel ID
 * Structure: { parcelId: { size, senderName, receiverName, images, etc. } }
 * Used to store all parcel information before booking submission
 */
let parcelData = {}; // Store parcel data by unique ID

// ============================================
// UTILITY FUNCTIONS - Data Sanitization
// ============================================

/**
 * Sanitizes field values to prevent null/undefined issues
 * Removes whitespace, converts null/undefined to empty strings
 * 
 * @param {*} value - The value to sanitize (can be any type)
 * @returns {string} - Sanitized string value (empty string if invalid)
 * 
 * Usage: Used when processing form inputs to ensure clean data
 */
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

/**
 * Escapes HTML special characters to prevent XSS attacks
 * Converts &, ", <, > to their HTML entity equivalents
 * 
 * @param {*} value - The value to escape (will be converted to string)
 * @returns {string} - HTML-escaped string
 * 
 * Usage: Used when inserting user input into HTML to prevent injection attacks
 */
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

// ============================================
// PARCEL FEATURE INITIALIZATION
// ============================================

/**
 * Cleanup function: Removes parcel-related data if parcel feature is disabled
 * This ensures no parcel data persists when feature is turned off
 * Runs on page load to maintain data consistency
 */
if (!PARCEL_FEATURE_ENABLED) {
    try {
        if (sessionStorage.getItem('bookingType') === 'parcels') {
            sessionStorage.setItem('bookingType', 'passengers');
        }
        sessionStorage.removeItem('parcelCount');
        sessionStorage.removeItem('parcelData');
    } catch (error) {
        console.warn('Parcel state reset skipped:', error);
    }
}

// ============================================
// PARCEL SPACE CALCULATION SYSTEM
// ============================================

/**
 * Base capacity for extra space (guaranteed parcel zone)
 * Total capacity equivalent to 4 Large + 1 Medium parcels
 * 
 * Size Equivalences:
 * - 1 Large = 2 Medium = 4 Small
 * - Total: 4L + 1M = 9M = 18S (in small equivalents)
 * 
 * This represents the dedicated space available for parcels beyond passenger seats
 */
const EXTRA_SPACE_BASE = { large: 4, medium: 1, mediumEquivalent: 9, smallEquivalent: 18 };

/**
 * Calculates remaining extra space after some parcels have been booked
 * Converts all sizes to medium equivalents for calculation, then converts back
 * 
 * @param {number} usedLarge - Number of large parcels already booked (default: 0)
 * @param {number} usedMedium - Number of medium parcels already booked (default: 0)
 * @param {number} usedSmall - Number of small parcels already booked (default: 0)
 * @returns {Object} - Object containing remaining space in all size formats:
 *   - large: Remaining large parcel slots
 *   - medium: Remaining medium parcel slots
 *   - small: Remaining small parcel slots
 *   - mediumEquivalent: Total remaining in medium equivalents
 *   - smallEquivalent: Total remaining in small equivalents
 * 
 * Usage: Called when user adds/removes parcels to update available space display
 */
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

// ============================================
// ROUTE DATA - Predefined Routes
// ============================================

/**
 * Sample route data containing predefined routes available for booking
 * Each route contains:
 * - name: Display name (e.g., "Pretoria → Tzaneen")
 * - distance: Distance in kilometers
 * - duration: Estimated travel time in hours
 * - price: Base fare per person/parcel
 * - capacity: Total vehicle capacity
 * - occupied: Currently occupied seats
 * - departure: Scheduled departure date and time
 * - extraSpace: Available parcel space breakdown
 * - coordinates: Start and end coordinates for map display
 * 
 * In production, this would be fetched from the backend API
 */
const routes = {
    'pta-tzn': {
        name: 'Pretoria → Tzaneen',
        distance: 450,
        duration: 5.5,
        price: 450,
        capacity: 20,
        occupied: 6,
        departure: '2025/11/14 Friday 10:00 am',
        // Extra space: Initial 1 large, 3 medium, 10 small = 20 small equivalents total
        // When nothing is bought: 4 large (or 8 medium or 20 small)
        extraSpace: {
            large: 1,   // Initial: 1 large
            medium: 3,  // Initial: 3 medium
            small: 10,  // Initial: 10 small
            // Total capacity in small equivalents: 1*4 + 3*2 + 10 = 20
            totalCapacity: 20,
            usedLarge: 0,
            usedMedium: 0,
            usedSmall: 0
        },
        coordinates: {
            start: [28.2294, -25.7479], // Pretoria
            end: [30.1403, -23.8336]    // Tzaneen
        }
    },
    'tzn-pta': {
        name: 'Tzaneen → Pretoria',
        distance: 450,
        duration: 5.5,
        price: 450,
        capacity: 20,
        occupied: 6,
        departure: '2025/11/14 Friday 10:00 am',
        // Extra space: Initial 1 large, 3 medium, 10 small = 20 small equivalents total
        // When nothing is bought: 4 large (or 8 medium or 20 small)
        extraSpace: {
            large: 1,   // Initial: 1 large
            medium: 3,  // Initial: 3 medium
            small: 10,  // Initial: 10 small
            // Total capacity in small equivalents: 1*4 + 3*2 + 10 = 20
            totalCapacity: 20,
            usedLarge: 0,
            usedMedium: 0,
            usedSmall: 0
        },
        coordinates: {
            start: [30.1403, -23.8336],  // Tzaneen
            end: [28.2294, -25.7479]     // Pretoria
        }
    }
};

// ============================================
// ROUTE CARD GENERATION
// ============================================

/**
 * Extra space pricing constants (in ZAR)
 * These prices are used for parcel delivery in extra space
 */
const EXTRA_SPACE_PRICING = {
    large: 400,
    medium: 150,
    small: 60
};

/**
 * Dynamically generates and populates route cards from the routes object
 * Replaces hardcoded route cards in the HTML with dynamically generated ones
 * 
 * Process:
 * 1. Finds the route-selection container
 * 2. Clears any existing route cards
 * 3. Iterates through routes object
 * 4. Generates HTML for each route card with all details
 * 5. Inserts cards into the DOM
 * 6. Updates extra space display after generation
 * 
 * Features:
 * - Calculates available seats (capacity - occupied)
 * - Parses departure date/time from route data
 * - Includes extra space pricing information
 * - Sets up click handlers for route selection
 * - Uses unique IDs for extra space display elements
 * 
 * Usage: Called on page load to populate route cards dynamically
 */
function populateRouteCards() {
    const routeSelectionContainer = document.querySelector('.route-selection');
    if (!routeSelectionContainer) {
        console.warn('Route selection container not found');
        return;
    }

    // Clear existing route cards
    routeSelectionContainer.innerHTML = '';

    // Generate route cards for each route in the routes object
    Object.keys(routes).forEach(routeId => {
        const route = routes[routeId];
        if (!route) return;

        // Calculate available seats
        const availableSeats = route.capacity - (route.occupied || 0);

        // Parse departure date and time from departure string
        // Format: '2025/11/14 Friday 10:00 am'
        let departureDate = '';
        let departureTime = '';
        
        if (route.departure) {
            const departureParts = route.departure.split(' ');
            if (departureParts.length >= 3) {
                departureDate = `${departureParts[0]} ${departureParts[1]}`;
                departureTime = departureParts.slice(2).join(' ');
            } else {
                departureDate = route.departure;
                departureTime = 'To be confirmed';
            }
        } else {
            departureDate = 'To be confirmed';
            departureTime = 'To be confirmed';
        }

        // Get available extra space for display
        const availableSpace = getAvailableExtraSpace(route);
        const extraSpaceText = formatExtraSpaceDisplay(availableSpace);

        // Generate route card HTML
        const routeCardHTML = `
            <div class="route-card" data-route="${routeId}" onclick="selectRoute('${routeId}')">
                <div class="route-info">
                    <div class="route-details">
                        <h3><i class="ri-taxi-line"></i>${escapeAttribute(route.name)}</h3>
                        <p><i class="ri-map-pin-distance-line"></i><strong>Distance:</strong> ${route.distance} km</p>
                        <p><i class="ri-time-line"></i><strong>Duration:</strong> ~${route.duration} hours</p>
                        <p><i class="ri-calendar-line"></i><strong>Date:</strong> ${escapeAttribute(departureDate)}</p>
                        <p><i class="ri-time-line"></i><strong>Time:</strong> ${escapeAttribute(departureTime)}</p>
                        <p><i class="ri-user-line"></i><strong>Capacity:</strong> ${availableSeats} seat${availableSeats !== 1 ? 's' : ''} available</p>
                        <p id="extra-space-${routeId}" style="background: #f3e5f5; padding: 0.75rem; border-radius: 8px; margin-top: 0.5rem;">
                            <i class="ri-box-3-line" style="color: #7b1fa2;"></i>
                            <strong style="color: #7b1fa2;">Available Extra Space:</strong> 
                            <span id="extra-space-display-${routeId}">${escapeAttribute(extraSpaceText)}</span>
                        </p>
                    </div>
                    <div class="route-price">R${route.price}</div>
                    <div class="extra-space-pricing" style="margin-top: 1rem; padding: 1rem; background: #fff9e6; border: 2px solid #FFD52F; border-radius: 10px;">
                        <div style="font-size: 0.85rem; color: #666; margin-bottom: 0.5rem; font-weight: 600;">
                            <i class="ri-price-tag-3-line" style="color: #FFD52F;"></i> Extra Space Pricing:
                        </div> 
                        <div style="display: flex; flex-direction: column; gap: 0.4rem; font-size: 0.9rem;">
                            <div style="display: flex; justify-content: space-between;">
                                <span><strong>Large:</strong></span>
                                <span style="color: #01386A; font-weight: 700;">R${EXTRA_SPACE_PRICING.large}</span>
                            </div>
                            <div style="display: flex; justify-content: space-between;">
                                <span><strong>Medium:</strong></span>
                                <span style="color: #01386A; font-weight: 700;">R${EXTRA_SPACE_PRICING.medium}</span>
                            </div>
                            <div style="display: flex; justify-content: space-between;">
                                <span><strong>Small:</strong></span>
                                <span style="color: #01386A; font-weight: 700;">R${EXTRA_SPACE_PRICING.small}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Insert route card into container
        routeSelectionContainer.insertAdjacentHTML('beforeend', routeCardHTML);
    });

    // Update extra space display after generating cards
    updateExtraSpaceDisplay();
}

/**
 * Calculates available extra space for parcels on a given route
 * Takes into account the route's initial extra space and any used space
 * 
 * @param {Object} route - Route object containing extraSpace property
 * @returns {Object} - Available space breakdown:
 *   - large: Available large parcel slots
 *   - medium: Available medium parcel slots
 *   - small: Available small parcel slots
 *   - totalSmall: Total available in small equivalents
 * 
 * Usage: Called to display available parcel space on route cards
 */
function getAvailableExtraSpace(route) {
    if (!route || !route.extraSpace) {
        return { large: 4, medium: 8, small: 20, totalSmall: 20 };
    }
    
    // Total capacity in small equivalents (1 large = 4, 1 medium = 2, 1 small = 1)
    const totalCapacity = route.extraSpace.totalCapacity || 
                          (route.extraSpace.large * 4 + route.extraSpace.medium * 2 + route.extraSpace.small);
    
    // Calculate used space in small equivalents
    const usedSmall = (route.extraSpace.usedLarge * 4) + (route.extraSpace.usedMedium * 2) + route.extraSpace.usedSmall;
    
    // Remaining space in small equivalents
    const remainingSmall = totalCapacity - usedSmall;
    
    // Convert remaining smalls to large, medium, small
    const large = Math.floor(remainingSmall / 4);
    const remainingAfterLarge = remainingSmall % 4;
    const medium = Math.floor(remainingAfterLarge / 2);
    const small = remainingAfterLarge % 2;
    
    return { large, medium, small, totalSmall: remainingSmall };
}

/**
 * Formats available extra space into a human-readable string
 * Shows space in the most readable format (large, medium, small)
 * Also shows equivalent formats in parentheses
 * 
 * @param {Object} available - Available space object from getAvailableExtraSpace()
 * @returns {string} - Formatted string like "2 large, 3 medium (or 5 large or 11 medium or 22 small)"
 * 
 * Usage: Called to display available space text on route cards
 */
function formatExtraSpaceDisplay(available) {
    if (available.totalSmall === 0) {
        return 'No extra space available';
    }
    
    // Show in the most readable format: large, medium, small
    const parts = [];
    if (available.large > 0) {
        parts.push(`${available.large} large`);
    }
    if (available.medium > 0) {
        parts.push(`${available.medium} medium`);
    }
    if (available.small > 0) {
        parts.push(`${available.small} small`);
    }
    
    // Also show equivalent formats in parentheses
    const equivalent = [];
    const totalLarge = Math.floor(available.totalSmall / 4);
    const totalMedium = Math.floor(available.totalSmall / 2);
    
    if (totalLarge > 0) {
        equivalent.push(`${totalLarge} large`);
    }
    if (totalMedium > 0) {
        equivalent.push(`${totalMedium} medium`);
    }
    equivalent.push(`${available.totalSmall} small`);
    
    if (parts.length > 0) {
        return `${parts.join(', ')} (or ${equivalent.join(' or ')})`;
    } else {
        return `${equivalent.join(' or ')}`;
    }
}

/**
 * Updates the extra space display on all dynamically generated route cards
 * Reads current route data and updates the display elements for all routes
 * 
 * Process:
 * 1. Iterates through all routes in the routes object
 * 2. Calculates available extra space for each route
 * 3. Updates the corresponding display element in the DOM
 * 
 * Usage: Called after route cards are generated or when parcel bookings change
 */
function updateExtraSpaceDisplay() {
    // Update all route cards dynamically
    Object.keys(routes).forEach(routeId => {
        const route = routes[routeId];
        if (route) {
            const available = getAvailableExtraSpace(route);
            const display = document.getElementById(`extra-space-display-${routeId}`);
            if (display) {
                display.textContent = formatExtraSpaceDisplay(available);
            }
        }
    });
}

// ============================================
// MAP INITIALIZATION & DISPLAY
// ============================================

/**
 * Initializes the main Google Maps instance for route display
 * Creates a map showing the selected route with start/end markers
 * Waits for Google Maps API to load before initializing
 * 
 * Features:
 * - Centers map between origin and destination
 * - Adds route markers (start and end points)
 * - Handles responsive sizing
 * 
 * Usage: Called on page load to display the route selection map
 */
function initializeMap() {
    // Wait for Google Maps API to load
    if (typeof google === 'undefined' || !google.maps) {
        setTimeout(initializeMap, 100);
        return;
    }
    
    const mapContainer = document.getElementById('route-map');
    if (!mapContainer) return;
    
    // Use setTimeout to ensure container is visible
    setTimeout(() => {
        // Ensure container has explicit width
        mapContainer.style.width = '100%';
        mapContainer.style.height = '100%';
        mapContainer.style.display = 'block';
        
        map = new google.maps.Map(mapContainer, {
            center: { lat: -24.791, lng: 29.185 }, // Center between Pretoria and Tzaneen
            zoom: 7,
            mapTypeControl: true,
            streetViewControl: false,
            fullscreenControl: true
        });
        
        // Trigger resize to ensure map uses full container width
        setTimeout(() => {
            if (map) {
                google.maps.event.trigger(map, 'resize');
                // Add default markers
                addRouteMarkers();
            }
        }, 300);
    }, 100);
}

/**
 * City boundaries for Google Maps autocomplete restrictions
 * Defines geographic bounds for each city to restrict location selection
 * Used to ensure users select locations within the correct city
 * 
 * Structure: { cityName: { bounds: {north, south, east, west}, center: {lat, lng}, name } }
 * 
 * Usage: Applied to Google Maps autocomplete to restrict suggestions to city boundaries
 */
const cityBoundaries = {
    'Pretoria': {
        bounds: {
            north: -25.6,
            south: -25.9,
            east: 28.4,
            west: 28.0
        },
        center: { lat: -25.7479, lng: 28.2294 },
        name: 'Pretoria'
    },
    'Tzaneen': {
        bounds: {
            north: -23.7,
            south: -24.0,
            east: 30.4,
            west: 29.9
        },
        center: { lat: -23.8336, lng: 30.1403 },
        name: 'Tzaneen'
    }
};

// ============================================
// LOCATION SELECTION STATE VARIABLES
// ============================================

/**
 * Google Maps instance for location selection (pickup/dropoff points)
 * Separate from main route map, used when user selects specific locations
 */
let locationSelectionMap = null;

/**
 * Google Maps Places Autocomplete instance for pickup location input
 * Provides location suggestions as user types
 */
let pickupAutocomplete = null;

/**
 * Google Maps Places Autocomplete instance for dropoff location input
 * Provides location suggestions as user types
 */
let dropoffAutocomplete = null;

/**
 * Google Maps marker for selected pickup location
 * Displays the chosen pickup point on the map
 */
let pickupMarker = null;

/**
 * Google Maps marker for selected dropoff location
 * Displays the chosen dropoff point on the map
 */
let dropoffMarker = null;

/**
 * Google Maps polyline connecting pickup and dropoff points
 * Shows the route between selected locations
 */
let routePolyline = null;

/**
 * Initializes the location selection map and autocomplete inputs
 * Sets up Google Maps with city boundaries and autocomplete restrictions
 * Configures pickup and dropoff location inputs with autocomplete
 * 
 * Features:
 * - Restricts autocomplete to city boundaries
 * - Updates map when locations are selected
 * - Displays markers and route polyline
 * 
 * Usage: Called when user reaches location selection step (Step 3)
 */
function initializeLocationSelection() {
    if (!selectedRoute) return;
    
    const route = routes[selectedRoute];
    if (!route) return;
    
    // Get origin and destination cities
    const cities = route.name.split(' → ');
    const originCity = cities[0].trim();
    const destinationCity = cities[1].trim();
    
    // Update hints
    const pickupHint = document.getElementById('pickup-location-hint');
    const dropoffHint = document.getElementById('dropoff-location-hint');
    if (pickupHint) {
        pickupHint.textContent = `Please select a location within ${originCity}`;
    }
    if (dropoffHint) {
        dropoffHint.textContent = `Please select a location within ${destinationCity}`;
    }
    
    // Wait for Google Maps API to load
    if (typeof google === 'undefined' || !google.maps) {
        setTimeout(initializeLocationSelection, 100);
        return;
    }
    
    // Initialize Google Maps
    const mapContainer = document.getElementById('location-selection-map');
    if (mapContainer && !locationSelectionMap) {
        // Use setTimeout to ensure container is visible
        setTimeout(() => {
            // Get the parent container to calculate actual available width
            const parentContainer = mapContainer.parentElement;
            if (parentContainer) {
                // Get computed styles
                const computedStyle = window.getComputedStyle(parentContainer);
                const paddingLeft = parseFloat(computedStyle.paddingLeft) || 0;
                const paddingRight = parseFloat(computedStyle.paddingRight) || 0;
                const parentWidth = parentContainer.offsetWidth;
                const availableWidth = parentWidth - paddingLeft - paddingRight;
                
                // Set explicit width on map container
                mapContainer.style.width = availableWidth + 'px';
                mapContainer.style.minWidth = availableWidth + 'px';
                mapContainer.style.maxWidth = availableWidth + 'px';
                mapContainer.style.display = 'block';
                mapContainer.style.boxSizing = 'border-box';
            } else {
                // Fallback to 100% if parent not found
                mapContainer.style.width = '100%';
                mapContainer.style.minWidth = '100%';
                mapContainer.style.maxWidth = '100%';
                mapContainer.style.display = 'block';
            }
            
            locationSelectionMap = new google.maps.Map(mapContainer, {
                center: { lat: -24.791, lng: 29.185 }, // Center between Pretoria and Tzaneen
                zoom: 8,
                mapTypeControl: true,
                streetViewControl: false,
                fullscreenControl: true
            });
            
            // Trigger resize multiple times to ensure map uses full container width
            setTimeout(() => {
                if (locationSelectionMap) {
                    google.maps.event.trigger(locationSelectionMap, 'resize');
                }
            }, 300);
            
            // Additional resize after a longer delay to catch any layout changes
            setTimeout(() => {
                if (locationSelectionMap) {
                    google.maps.event.trigger(locationSelectionMap, 'resize');
                }
            }, 600);
            
            // Final resize after window load to ensure everything is settled
            window.addEventListener('load', () => {
                if (locationSelectionMap) {
                    google.maps.event.trigger(locationSelectionMap, 'resize');
                }
            });
            
            // Add route line if coordinates exist
            if (route.coordinates) {
                const routePath = [
                    { lat: route.coordinates.start[1], lng: route.coordinates.start[0] },
                    { lat: route.coordinates.end[1], lng: route.coordinates.end[0] }
                ];
                
                routePolyline = new google.maps.Polyline({
                    path: routePath,
                    geodesic: true,
                    strokeColor: '#01386A',
                    strokeOpacity: 1.0,
                    strokeWeight: 3
                });
                routePolyline.setMap(locationSelectionMap);
            }
            
            // Initialize autocomplete inputs
            initializeAutocomplete();
        }, 100);
    } else if (locationSelectionMap) {
        // Map already exists, just initialize autocomplete
        initializeAutocomplete();
    }
    
    function initializeAutocomplete() {
        // Get city boundaries
        const originBoundary = cityBoundaries[originCity] || cityBoundaries['Pretoria'];
        const destBoundary = cityBoundaries[destinationCity] || cityBoundaries['Tzaneen'];
        
        // Create input elements for autocomplete
        const pickupContainer = document.getElementById('pickup-geocoder-container');
        const dropoffContainer = document.getElementById('dropoff-geocoder-container');
        
        if (pickupContainer) {
            // Clear container
            pickupContainer.innerHTML = '';
            
            // Create input element
            const pickupInput = document.createElement('input');
            pickupInput.type = 'text';
            pickupInput.id = 'pickup-location-input';
            pickupInput.placeholder = `Search for pickup location in ${originCity}...`;
            pickupInput.style.width = '100%';
            pickupInput.style.padding = '0.75rem';
            pickupInput.style.border = '2px solid #e0e0e0';
            pickupInput.style.borderRadius = '8px';
            pickupInput.style.fontSize = '1rem';
            pickupContainer.appendChild(pickupInput);
            
            // Initialize Google Places Autocomplete
            pickupAutocomplete = new google.maps.places.Autocomplete(pickupInput, {
                bounds: new google.maps.LatLngBounds(
                    new google.maps.LatLng(originBoundary.bounds.south, originBoundary.bounds.west),
                    new google.maps.LatLng(originBoundary.bounds.north, originBoundary.bounds.east)
                ),
                componentRestrictions: { country: 'za' },
                fields: ['geometry', 'formatted_address', 'name']
            });
            
            // Add listener for place selection
            pickupAutocomplete.addListener('place_changed', () => {
                const place = pickupAutocomplete.getPlace();
                if (!place.geometry) {
                    return;
                }
                
                const location = place.geometry.location;
                
                // Remove existing marker
                if (pickupMarker) {
                    pickupMarker.setMap(null);
                }
                
                // Add new marker
                pickupMarker = new google.maps.Marker({
                    map: locationSelectionMap,
                    position: location,
                    icon: {
                        path: google.maps.SymbolPath.CIRCLE,
                        scale: 8,
                        fillColor: '#28a745',
                        fillOpacity: 1,
                        strokeColor: '#ffffff',
                        strokeWeight: 2
                    },
                    title: place.formatted_address || place.name
                });
                
                // Store pickup location
                pickupPoints = [{
                    address: place.formatted_address || place.name,
                    lat: location.lat(),
                    lng: location.lng(),
                    index: 1
                }];
                
                // Fit map to show both markers
                fitLocationSelectionMap();
            });
        }
        
        if (dropoffContainer) {
            // Clear container
            dropoffContainer.innerHTML = '';
            
            // Create input element
            const dropoffInput = document.createElement('input');
            dropoffInput.type = 'text';
            dropoffInput.id = 'dropoff-location-input';
            dropoffInput.placeholder = `Search for dropoff location in ${destinationCity}...`;
            dropoffInput.style.width = '100%';
            dropoffInput.style.padding = '0.75rem';
            dropoffInput.style.border = '2px solid #e0e0e0';
            dropoffInput.style.borderRadius = '8px';
            dropoffInput.style.fontSize = '1rem';
            dropoffContainer.appendChild(dropoffInput);
            
            // Initialize Google Places Autocomplete
            dropoffAutocomplete = new google.maps.places.Autocomplete(dropoffInput, {
                bounds: new google.maps.LatLngBounds(
                    new google.maps.LatLng(destBoundary.bounds.south, destBoundary.bounds.west),
                    new google.maps.LatLng(destBoundary.bounds.north, destBoundary.bounds.east)
                ),
                componentRestrictions: { country: 'za' },
                fields: ['geometry', 'formatted_address', 'name']
            });
            
            // Add listener for place selection
            dropoffAutocomplete.addListener('place_changed', () => {
                const place = dropoffAutocomplete.getPlace();
                if (!place.geometry) {
                    return;
                }
                
                const location = place.geometry.location;
                
                // Remove existing marker
                if (dropoffMarker) {
                    dropoffMarker.setMap(null);
                }
                
                // Add new marker
                dropoffMarker = new google.maps.Marker({
                    map: locationSelectionMap,
                    position: location,
                    icon: {
                        path: google.maps.SymbolPath.CIRCLE,
                        scale: 8,
                        fillColor: '#dc3545',
                        fillOpacity: 1,
                        strokeColor: '#ffffff',
                        strokeWeight: 2
                    },
                    title: place.formatted_address || place.name
                });
                
                // Store dropoff location
                dropoffPoints = [{
                    address: place.formatted_address || place.name,
                    lat: location.lat(),
                    lng: location.lng(),
                    index: 1
                }];
                
                // Fit map to show both markers
                fitLocationSelectionMap();
            });
        }
    }
}

// ============================================
// MAP UTILITY FUNCTIONS
// ============================================

/**
 * Fits the location selection map to show both pickup and dropoff markers
 * If both markers exist, fits bounds to them; otherwise shows the full route
 * 
 * Usage: Called after adding/updating pickup or dropoff markers
 */
function fitLocationSelectionMap() {
    if (!locationSelectionMap) return;
    
    const bounds = new google.maps.LatLngBounds();
    
    if (pickupMarker) {
        bounds.extend(pickupMarker.getPosition());
    }
    if (dropoffMarker) {
        bounds.extend(dropoffMarker.getPosition());
    }
    
    // If we have both markers, fit to them; otherwise show route
    if (pickupMarker && dropoffMarker) {
        locationSelectionMap.fitBounds(bounds);
    } else if (selectedRoute && routes[selectedRoute]) {
        const route = routes[selectedRoute];
        if (route.coordinates) {
            bounds.extend(new google.maps.LatLng(route.coordinates.start[1], route.coordinates.start[0]));
            bounds.extend(new google.maps.LatLng(route.coordinates.end[1], route.coordinates.end[0]));
            locationSelectionMap.fitBounds(bounds);
        }
    }
}

/**
 * Adds start and end markers to the main route map
 * Also draws a polyline connecting the two points
 * Clears existing markers before adding new ones
 * 
 * Features:
 * - Start marker (yellow) for origin city
 * - End marker (blue) for destination city
 * - Route polyline connecting the points
 * - Auto-fits map bounds to show both points
 * 
 * Usage: Called when a route is selected or map is initialized
 */
function addRouteMarkers() {
    if (!map) return;

    // Clear existing markers
    if (routeStartMarker) {
        routeStartMarker.setMap(null);
        routeStartMarker = null;
    }
    if (routeEndMarker) {
        routeEndMarker.setMap(null);
        routeEndMarker = null;
    }
    if (routePolylineMain) {
        routePolylineMain.setMap(null);
        routePolylineMain = null;
    }

    if (selectedRoute && routes[selectedRoute]) {
        const route = routes[selectedRoute];
        
        // Add start marker (Pretoria)
        routeStartMarker = new google.maps.Marker({
            map: map,
            position: { lat: route.coordinates.start[1], lng: route.coordinates.start[0] },
            icon: {
                path: google.maps.SymbolPath.CIRCLE,
                scale: 10,
                fillColor: '#FFD52F',
                fillOpacity: 1,
                strokeColor: '#ffffff',
                strokeWeight: 2
            },
            title: 'Start: ' + route.name.split(' → ')[0]
        });

        // Add end marker (Tzaneen)
        routeEndMarker = new google.maps.Marker({
            map: map,
            position: { lat: route.coordinates.end[1], lng: route.coordinates.end[0] },
            icon: {
                path: google.maps.SymbolPath.CIRCLE,
                scale: 10,
                fillColor: '#01386A',
                fillOpacity: 1,
                strokeColor: '#ffffff',
                strokeWeight: 2
            },
            title: 'End: ' + route.name.split(' → ')[1]
        });

        // Add route line
        routePolylineMain = new google.maps.Polyline({
            path: [
                { lat: route.coordinates.start[1], lng: route.coordinates.start[0] },
                { lat: route.coordinates.end[1], lng: route.coordinates.end[0] }
            ],
            geodesic: true,
            strokeColor: '#01386A',
            strokeOpacity: 1.0,
            strokeWeight: 3
        });
        routePolylineMain.setMap(map);

        // Fit map to show both points
        const bounds = new google.maps.LatLngBounds();
        bounds.extend(new google.maps.LatLng(route.coordinates.start[1], route.coordinates.start[0]));
        bounds.extend(new google.maps.LatLng(route.coordinates.end[1], route.coordinates.end[0]));
        map.fitBounds(bounds);
    }
}

// ============================================
// ROUTE SELECTION FUNCTIONS
// ============================================

/**
 * Handles route selection by user
 * Updates UI, stores selected route, and proceeds to next step
 * 
 * @param {string} routeId - The ID of the selected route (e.g., 'pta-tzn')
 * 
 * Process:
 * 1. Removes previous route selection styling
 * 2. Highlights selected route card
 * 3. Updates map with route markers
 * 4. Proceeds to next step after a delay
 * 
 * Usage: Called when user clicks on a route card
 */
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

    // Enable next step after a delay
    setTimeout(() => {
        nextStep();
    }, 500);
}


// ============================================
// BOOKING FLOW NAVIGATION
// ============================================

/**
 * Advances to the next step in the booking flow
 * Updates step indicators, shows/hides content sections, and initializes step-specific features
 * 
 * Steps:
 * 1: Route Selection
 * 2: Location Selection - Sets up map and autocomplete
 * 3: Passenger/Parcel Information - Generates forms
 * 4: Booking Summary
 * 5: Payment
 * 6: Confirmation
 * 
 * Features:
 * - Updates step indicator UI (active/completed states)
 * - Shows/hides appropriate content sections
 * - Initializes step-specific functionality (maps, forms, etc.)
 * 
 * Usage: Called when user clicks "Next" button or selects a route
 */
function nextStep() {
    if (currentStep < 6) {
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
            // Location Selection step
            const passengerContent = document.getElementById('passenger-selection');
            if (passengerContent) {
                passengerContent.classList.add('active');
            }

            updatePassengerInfo();
            
            // Initialize location selection map and geocoders
            initializeLocationSelection();
            
            // Resize map when step becomes active
            setTimeout(() => {
                if (locationSelectionMap) {
                    google.maps.event.trigger(locationSelectionMap, 'resize');
                }
            }, 500);

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
            // Passenger/Parcel Information step
            // This step is handled by the form generation
        } else if (currentStep === 4) {
            // Booking Summary step
            const confirmationContent = document.getElementById('booking-confirmation');
            if (confirmationContent) {
                confirmationContent.classList.add('active');
            }
            updateBookingSummary();
        } else if (currentStep === 5) {
            // Payment step will be shown by showPaymentStep()
            showPaymentStep();
        }
    }
}

/**
 * Returns to the previous step in the booking flow
 * Updates step indicators and shows/hides content sections accordingly
 * 
 * Process:
 * 1. Marks current step as inactive
 * 2. Decrements current step counter
 * 3. Shows previous step content
 * 4. Updates step indicator UI
 * 
 * Usage: Called when user clicks "Back" button
 */
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
            // Passenger/Parcel Information step - handled by form generation
        } else if (currentStep === 4) {
            const confirmationContent = document.getElementById('booking-confirmation');
            if (confirmationContent) {
                confirmationContent.classList.add('active');
                updateBookingSummary();
            }
        } else if (currentStep === 5) {
            const paymentStep = document.getElementById('payment-step');
            if (paymentStep) {
                paymentStep.classList.add('active');
            }
        }
    }
}


// ============================================
// LOCATION SELECTION FUNCTIONS
// ============================================

/**
 * Initializes trip locations map for location selection
 * Note: Mapbox functionality has been removed
 * 
 * Usage: Called when user reaches location selection step
 */
function initializeTripLocationsMap() {
    // Mapbox functionality removed
    // Clear existing points
    pickupPoints = [];
    dropoffPoints = [];
    
    // Setup location inputs
    setupLocationInputs();
}

/**
 * Sets up all location input fields with autocomplete functionality
 * Configures pickup and dropoff inputs for the selected route
 * 
 * Process:
 * - Finds all pickup and dropoff input fields
 * - Sets up autocomplete for each input based on city boundaries
 * 
 * Usage: Called after trip locations map loads
 */
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

/**
 * Sets up autocomplete for a single location input field
 * Note: Mapbox Geocoding API functionality has been removed
 * 
 * @param {HTMLElement} input - The input element to add autocomplete to
 * @param {string} type - Either 'pickup' or 'dropoff'
 * @param {string} city - The city name to restrict suggestions to
 * 
 * Usage: Called by setupLocationInputs() for each input field
 */
function setupAutocomplete(input, type, city) {
    // Mapbox autocomplete functionality removed
    // This function is kept for compatibility but does not provide autocomplete
}

/**
 * Fetches location suggestions
 * Note: Mapbox Geocoding API functionality has been removed
 * 
 * @param {string} query - The search query entered by user
 * @param {string} city - The city to restrict results to
 * @param {string} type - Either 'pickup' or 'dropoff'
 * @param {string} index - The index of the input field
 * 
 * Usage: Called by autocomplete input handler after debounce
 */
async function fetchSuggestions(query, city, type, index) {
    // Mapbox Geocoding API functionality removed
    const suggestionsId = `suggestions-${type}-${index}`;
    const suggestionsList = document.getElementById(suggestionsId);
    if (suggestionsList) {
        suggestionsList.classList.remove('show');
    }
}

/**
 * Displays location suggestions in a dropdown list
 * Note: Mapbox API functionality has been removed
 * 
 * @param {Array} features - Array of location features
 * @param {string} type - Either 'pickup' or 'dropoff'
 * @param {string} index - The index of the input field
 * @param {string} requiredCity - The city that suggestions must be in
 * 
 * Usage: Called after fetchSuggestions() receives results
 */
function displaySuggestions(features, type, index, requiredCity) {
    // Mapbox functionality removed - no suggestions displayed
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
    // Mapbox functionality removed
    // Store the point without map marker
    const [lng, lat] = feature.center || [0, 0];
    const point = {
        index: index,
        address: feature.place_name || '',
        coordinates: [lng, lat]
    };

    if (type === 'pickup') {
        // Remove old point if exists
        const existingIndex = pickupPoints.findIndex(p => p.index == index);
        if (existingIndex !== -1) {
            pickupPoints[existingIndex] = point;
        } else {
            pickupPoints.push(point);
        }
    } else {
        // Remove old point if exists
        const existingIndex = dropoffPoints.findIndex(p => p.index == index);
        if (existingIndex !== -1) {
            dropoffPoints[existingIndex] = point;
        } else {
            dropoffPoints.push(point);
        }
    }
}

// Fit map to show all points
function fitMapToPoints() {
    // Mapbox functionality removed
    // This function is kept for compatibility but does not adjust map bounds
    // tripLocationsMap is no longer used
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

// Trip management functions removed - trip option functionality no longer needed

// Continue trip selection - validates location points and proceeds
function continueTripSelection() {
    // Validate that at least one pickup and one dropoff point is entered
    if (pickupPoints.length === 0) {
        alert('Please add at least one pickup point for your trip.');
        return;
    }
    
    if (dropoffPoints.length === 0) {
        alert('Please add at least one drop-off point for your trip.');
        return;
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
// ============================================
// VALIDATION FUNCTIONS
// ============================================

/**
 * Validates all parcel information before proceeding to booking summary
 * Checks that all required fields are filled for each parcel
 * 
 * Validation Checks:
 * - Parcel size is selected
 * - Sender name and phone are provided
 * - Receiver name and phone are provided
 * - At least one parcel image is uploaded (optional but recommended)
 * 
 * @returns {boolean} - true if all parcels are valid, false otherwise
 * 
 * Usage: Called when user clicks "Continue" from parcel information step
 */
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
    
    return { valid: true };
}

// Validate passenger information
/**
 * Validates all passenger information before proceeding to booking summary
 * Checks that all required fields are filled for each passenger
 * 
 * Validation Checks:
 * - First name and last name are provided
 * - Email is valid format
 * - Phone number is valid South African format
 * - ID number is provided (optional but recommended)
 * - Next of kin information is provided (optional)
 * 
 * @returns {boolean} - true if all passengers are valid, false otherwise
 * 
 * Usage: Called when user clicks "Continue" from passenger information step
 */
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
        sessionStorage.setItem('parcelCount', parcelCount);
        sessionStorage.setItem('parcelData', JSON.stringify(parcelData));
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
    
}

// Update step indicator visibility based on booking type
function updateStepIndicator() {
    const step3 = document.getElementById('step3');
        if (step3) {
            step3.classList.remove('hidden');
            step3.classList.remove('disabled');
    }
}

// ============================================
// FORM GENERATION FUNCTIONS
// ============================================

/**
 * Generates passenger information forms dynamically based on passenger count
 * Creates form fields for each passenger including personal info and next of kin
 * 
 * Form Fields Per Passenger:
 * - Personal Information: First name, Last name, Email, Phone, ID Number
 * - Next of Kin: First name, Last name, Phone
 * 
 * Features:
 * - Pre-fills logged-in user's information for first passenger
 * - Adds validation attributes to required fields
 * - Generates unique IDs for each field based on passenger index
 * - Updates form container HTML
 * 
 * Usage: Called when passenger count changes or booking type is set to 'passengers'
 */
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
/**
 * Generates parcel information forms dynamically based on parcel count
 * Creates form fields for each parcel including sender, receiver, and parcel details
 * 
 * Form Fields Per Parcel:
 * - Parcel Details: Size (Large/Medium/Small), Weight, Description
 * - Sender Information: Name, Phone
 * - Receiver Information: Name, Phone
 * - Images: Upload multiple images of the parcel
 * 
 * Features:
 * - Generates unique IDs for each field based on parcel number
 * - Handles image upload and preview
 * - Updates parcel data object as user fills forms
 * - Shows/hides fields based on parcel size selection
 * 
 * Usage: Called when parcel count changes or booking type is set to 'parcels'
 */
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

// ============================================
// BOOKING SUMMARY & CONFIRMATION
// ============================================

/**
 * Updates the booking summary display with current booking details
 * Shows different information based on booking type (passengers vs parcels)
 * 
 * For Passenger Bookings:
 * - Route, passenger count, pickup/dropoff points, total amount
 * 
 * For Parcel Bookings:
 * - Route, parcel count, estimated total
 * 
 * Process:
 * 1. Reads booking data from state and sessionStorage
 * 2. Generates HTML summary based on booking type
 * 3. Updates summary container in UI
 * 4. Calculates and displays total amount
 * 
 * Usage: Called when user reaches booking summary step or booking details change
 */
function updateBookingSummary() {
    if (!selectedRoute || !routes[selectedRoute]) return;
    
    const route = routes[selectedRoute];
    const bookingTypeFromStorage = sessionStorage.getItem('bookingType') || bookingType;
    
    let summaryHTML = '';
    
    // Handle parcel bookings
    if (bookingTypeFromStorage === 'parcels') {
        const savedParcelCount = parseInt(sessionStorage.getItem('parcelCount') || parcelCount) || parcelCount;
        const savedParcelData = JSON.parse(sessionStorage.getItem('parcelData') || JSON.stringify(parcelData)) || parcelData;
        
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

        let pickupLocations = 'Not specified';
        if (pickupPoints.length > 0) {
            pickupLocations = pickupPoints.map(p => p.address).join('<br>');
        }

        let dropoffLocations = 'Not specified';
        if (dropoffPoints.length > 0) {
            dropoffLocations = dropoffPoints.map(p => p.address).join('<br>');
        }

        // Resolve date/time
        let tripDateDisplay = desiredTripDate || '-';
        let tripTimeDisplay = 'To be confirmed';

        summaryHTML = `
            <div class="summary-row">
                <span>Route:</span>
                <span>${route.name}</span>
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
                <span>Passengers:</span>
                <span>${passengerCount} person(s)</span>
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
                <span>Pickup Points:</span>
                <span>${pickupLocations}</span>
            </div>
            <div class="summary-row">
                <span>Drop-off Points:</span>
                <span>${dropoffLocations}</span>
            </div>
        `;

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

/**
 * Handles booking confirmation and proceeds to payment
 * Validates that all required information is complete before proceeding
 * 
 * Process:
 * 1. Validates booking information
 * 2. Stores booking data in sessionStorage
 * 3. Proceeds to payment step
 * 
 * Usage: Called when user clicks "Confirm Booking" button
 */
function confirmBooking() {
    const bookingTypeFromStorage = sessionStorage.getItem('bookingType') || bookingType;
    
    // Always go to payment step first, regardless of booking type or trip status
    if (selectedRoute) {
        showPaymentStep();
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
    // Show payment step instead of redirecting
    showPaymentStep();
}

function showPaymentStep() {
    // Mark step 3 as completed and step 4 as active
    const step3 = document.getElementById('step3');
    const step4 = document.getElementById('step4');
    if (step3) {
        step3.classList.remove('active');
        step3.classList.add('completed');
    }
    if (step4) {
        step4.classList.add('active');
    }
    
    // Update current step
    currentStep = 4;
    
    // Hide booking confirmation
    const confirmationContent = document.getElementById('booking-confirmation');
    if (confirmationContent) {
        confirmationContent.classList.remove('active');
    }
    
    // Show payment step
    const paymentStep = document.getElementById('payment-step');
    if (paymentStep) {
        paymentStep.classList.add('active');
    }
    
    // Update payment booking summary
    updatePaymentBookingSummary();
    
    // Setup card input formatting
    setupCardInputFormatting();
}

// ============================================
// PAYMENT PROCESSING FUNCTIONS
// ============================================

/**
 * Sets up automatic formatting for card input fields
 * Formats card number with spaces and expiry with slash
 * 
 * Features:
 * - Card number: Adds space every 4 digits (e.g., "1234 5678 9012 3456")
 * - Card expiry: Formats as MM/YY
 * 
 * Usage: Called when payment step is shown
 */
function setupCardInputFormatting() {
    // Format card number input
    const cardNumberInput = document.getElementById('card-number');
    if (cardNumberInput) {
        cardNumberInput.addEventListener('input', function(e) {
            let value = e.target.value.replace(/\s/g, '');
            let formattedValue = value.match(/.{1,4}/g)?.join(' ') || value;
            e.target.value = formattedValue;
        });
    }
    
    // Format card expiry input
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
}

let selectedPaymentMethodInBooking = null;

/**
 * Handles payment method selection (Card, EFT, Mobile)
 * Updates UI to show selected method and corresponding form
 * 
 * @param {string} method - Payment method: 'card', 'eft', or 'mobile'
 * 
 * Process:
 * 1. Removes selection from all payment method cards
 * 2. Highlights selected payment method card
 * 3. Hides all payment forms
 * 4. Shows form for selected payment method
 * 5. Enables pay button
 * 
 * Usage: Called when user clicks on a payment method card
 */
function selectPaymentMethodInBooking(method) {
    selectedPaymentMethodInBooking = method;
    
    // Remove selection from all cards
    document.querySelectorAll('.payment-method-card').forEach(card => {
        card.classList.remove('selected');
    });
    
    // Hide all forms
    document.querySelectorAll('.payment-form').forEach(form => {
        form.classList.remove('show');
    });
    
    // Select the chosen method
    const selectedCard = document.querySelector('.payment-method-card[onclick*="' + method + '"]');
    if (selectedCard) {
        selectedCard.classList.add('selected');
    }
    
    // Show the corresponding form
    const formId = method + '-form';
    const form = document.getElementById(formId);
    if (form) {
        form.classList.add('show');
    }
    
    // Enable pay button
    const payButton = document.getElementById('pay-button');
    if (payButton) {
        payButton.disabled = false;
    }
}

/**
 * Updates the booking summary displayed in the payment step
 * Shows route, passenger/parcel count, price per unit, and total amount
 * Also generates payment reference for EFT payments
 * 
 * Process:
 * - Reads booking data from state and sessionStorage
 * - Calculates total amount based on booking type
 * - Updates all summary display elements
 * - Generates unique payment reference (TKS + timestamp)
 * 
 * Usage: Called when payment step is shown or booking details change
 */
function updatePaymentBookingSummary() {
    if (!selectedRoute) return;
    
    const route = routes[selectedRoute];
    const bookingTypeFromStorage = sessionStorage.getItem('bookingType') || bookingType;
    const pricePerPerson = route.price || 450;
    const passengers = bookingTypeFromStorage === 'parcels' ? (parcelCount || 0) : passengerCount;
    const totalAmount = bookingTypeFromStorage === 'parcels' 
        ? (parcelCount || 0) * route.price 
        : route.price * passengerCount;
    
    // Update summary using the same structure as booking-payment.js
    const summaryRoute = document.getElementById('summary-route');
    const summaryPassengers = document.getElementById('summary-passengers');
    const summaryPricePer = document.getElementById('summary-price-per');
    const summaryTotal = document.getElementById('summary-total');
    
    if (summaryRoute) summaryRoute.textContent = route.name || '-';
    if (summaryPassengers) {
        if (bookingTypeFromStorage === 'parcels') {
            summaryPassengers.textContent = parcelCount || 0;
        } else {
            summaryPassengers.textContent = passengerCount;
        }
    }
    if (summaryPricePer) summaryPricePer.textContent = `R${pricePerPerson}`;
    if (summaryTotal) summaryTotal.textContent = `R${totalAmount}`;
    
    // Generate payment reference for EFT
    const reference = 'TKS' + Date.now().toString().slice(-8);
    const referenceInput = document.getElementById('payment-reference');
    if (referenceInput) {
        referenceInput.value = reference;
    }
}

/**
 * Validates payment form and initiates payment processing
 * Validates inputs based on selected payment method
 * 
 * Validation:
 * - Card: Validates card number, name, expiry, CVV
 * - Mobile: Validates mobile number
 * - EFT: No validation needed (reference is auto-generated)
 * 
 * Process:
 * 1. Validates form inputs
 * 2. Shows processing state on pay button
 * 3. Calls completePaymentInBooking() after 2 second delay
 * 
 * Usage: Called when user clicks "Pay Now" button
 */
function processPaymentInBooking() {
    if (!selectedPaymentMethodInBooking) {
        alert('Please select a payment method');
        return;
    }
    
    // Validate form inputs based on selected method
    if (selectedPaymentMethodInBooking === 'card') {
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
    } else if (selectedPaymentMethodInBooking === 'mobile') {
        const mobileNumber = document.getElementById('mobile-number').value;
        
        if (!mobileNumber) {
            alert('Please enter your mobile number');
            return;
        }
    }
    
    // Show processing state
    const payButton = document.getElementById('pay-button');
    if (payButton) {
        payButton.disabled = true;
        payButton.innerHTML = '<i class="ri-loader-4-line"></i> Processing Payment...';
    }
    
    // Simulate payment processing
    setTimeout(() => {
        completePaymentInBooking();
    }, 2000);
}

/**
 * Completes the payment and creates booking via API
 * This is the main function that finalizes the booking process
 * 
 * Process:
 * 1. Hides payment form and shows success message
 * 2. Reveals vehicle information to user
 * 3. Prepares route points from pickup/dropoff selections
 * 4. Creates booking via bookingApi.createBooking()
 * 5. Adds passengers via bookingApi.addPassenger() (if passenger booking)
 * 6. Adds parcels via bookingApi.addParcel() (if parcel booking)
 * 7. Creates payment record via paymentApi.createPayment()
 * 8. Saves booking to localStorage for backward compatibility
 * 9. Stores booking in sessionStorage for confirmation display
 * 
 * API Integration:
 * - Uses bookingApi for booking creation and passenger/parcel addition
 * - Uses paymentApi for payment record creation
 * - Falls back to localStorage if API calls fail
 * 
 * Usage: Called after payment validation and processing delay
 */
async function completePaymentInBooking() {
    // Hide payment content
    const paymentContent = document.getElementById('payment-content');
    if (paymentContent) {
        paymentContent.style.display = 'none';
    }
    
    // Show success message
    const paymentSuccess = document.getElementById('payment-success');
    if (paymentSuccess) {
        paymentSuccess.classList.add('show');
    }
    
    // Reveal vehicle information
    revealVehicleInfoInBooking();
    
    // Get selected vehicle info
    const selectedVehicleData = JSON.parse(sessionStorage.getItem('selectedVehicle') || '{}');
    const route = routes[selectedRoute];
    const bookingTypeFromStorage = sessionStorage.getItem('bookingType') || bookingType;
    const totalAmount = bookingTypeFromStorage === 'parcels' 
        ? (parcelCount || 0) * route.price 
        : route.price * passengerCount;
    
    // Get passenger data
    const passengerData = JSON.parse(sessionStorage.getItem('passengerData') || '[]');
    
    // Prepare route points
    const routePoints = [];
    pickupPoints.forEach((point, index) => {
        routePoints.push({
            point_type: 'pickup',
            point_name: point.address || `Pickup Point ${index + 1}`,
            address: point.address,
            coordinates: point.coordinates || (point.lat && point.lng ? { lat: point.lat, lng: point.lng } : null),
            order_index: index + 1,
            expected_time: desiredTripDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
        });
    });
    dropoffPoints.forEach((point, index) => {
        routePoints.push({
            point_type: 'dropoff',
            point_name: point.address || `Dropoff Point ${index + 1}`,
            address: point.address,
            coordinates: point.coordinates || (point.lat && point.lng ? { lat: point.lat, lng: point.lng } : null),
            order_index: pickupPoints.length + index + 1,
            expected_time: desiredTripDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
        });
    });
    
    // Create booking via API
    let apiBooking = null;
    try {
        const bookingData = {
            owner_id: selectedVehicleData.owner_id,
            vehicle_id: selectedVehicleData.vehicle_id || selectedVehicleData.id,
            driver_id: null, // Will be assigned by owner
            existing_route_id: selectedRoute, // Route ID
            booking_mode: 'route',
            passenger_count: bookingTypeFromStorage === 'parcels' ? 0 : passengerCount,
            parcel_count: bookingTypeFromStorage === 'parcels' ? (parcelCount || 0) : 0,
            total_seats_available: selectedVehicleData.capacity || 15,
            total_amount_needed: totalAmount,
            scheduled_pickup: desiredTripDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            route_points: routePoints,
            special_instructions: null
        };

        const response = await bookingApi.createBooking(bookingData);
        if (response.success && response.booking) {
            apiBooking = response.booking;
            
            // Add passengers to booking
            if (passengerData && passengerData.length > 0) {
                for (let i = 0; i < passengerData.length; i++) {
                    const passenger = passengerData[i];
                    try {
                        await bookingApi.addPassenger(apiBooking.id, {
                            passenger_type: 'guest',
                            first_name: passenger.firstName,
                            last_name: passenger.lastName,
                            email: passenger.email,
                            phone: passenger.phone,
                            id_number: passenger.idNumber || null,
                            pickup_point: pickupPoints[i] || null,
                            dropoff_point: dropoffPoints[i] || null,
                            next_of_kin_first_name: passenger.nextOfKin?.firstName || '',
                            next_of_kin_last_name: passenger.nextOfKin?.lastName || '',
                            next_of_kin_phone: passenger.nextOfKin?.phone || '',
                            is_primary: i === 0
                        });
                    } catch (error) {
                        console.error('Error adding passenger:', error);
                    }
                }
            }
            
            // Add parcels to booking
            if (bookingTypeFromStorage === 'parcels') {
                const parcelDataFromStorage = JSON.parse(sessionStorage.getItem('parcelData') || '{}');
                for (const [key, parcel] of Object.entries(parcelDataFromStorage)) {
                    try {
                        await bookingApi.addParcel(apiBooking.id, {
                            size: parcel.size || 'small',
                            weight: parcel.weight || null,
                            description: parcel.description || null,
                            sender_name: parcel.senderName || '',
                            sender_phone: parcel.senderPhone || '',
                            receiver_name: parcel.receiverName || '',
                            receiver_phone: parcel.receiverPhone || '',
                            images: parcel.images || [],
                            delivery_window: null
                        });
                    } catch (error) {
                        console.error('Error adding parcel:', error);
                    }
                }
            }
            
            // Create payment
            try {
                await paymentApi.createPayment({
                    booking_id: apiBooking.id,
                    amount: totalAmount,
                    payment_method: selectedPaymentMethodInBooking || 'EFT',
                    payer_type: 'registered'
                });
            } catch (error) {
                console.error('Error creating payment:', error);
            }
        }
    } catch (error) {
        console.error('Error creating booking via API:', error);
        // Continue with localStorage fallback
    }
    
    // Save parcel data if parcels were booked
    let savedParcelData = null;
    if (bookingTypeFromStorage === 'parcels') {
        const parcelDataFromStorage = JSON.parse(sessionStorage.getItem('parcelData') || '{}');
        savedParcelData = {};
        Object.keys(parcelDataFromStorage).forEach(key => {
            const parcel = parcelDataFromStorage[key];
            savedParcelData[key] = {
                senderName: parcel.senderName || '',
                senderPhone: parcel.senderPhone || '',
                receiverName: parcel.receiverName || '',
                receiverPhone: parcel.receiverPhone || '',
                secretCode: parcel.secretCode || generateSecretCode(),
                size: parcel.size || 'small',
                images: parcel.images || []
            };
        });
    }
    
    // Generate secret code for seat bookings
    let seatSecretCode = null;
    if (bookingTypeFromStorage === 'passengers') {
        seatSecretCode = generateSecretCode();
    }
    
    // Create booking object for localStorage (for backward compatibility)
    const booking = {
        id: apiBooking?.id || 'BK' + Date.now(),
        booking_id: apiBooking?.id,
        reference: apiBooking?.booking_reference || 'TKS' + Date.now().toString().slice(-8),
        routeId: selectedRoute,
        routeName: route.name,
        bookingType: bookingTypeFromStorage,
        passengers: bookingTypeFromStorage === 'parcels' ? 0 : passengerCount,
        parcels: bookingTypeFromStorage === 'parcels' ? (parcelCount || 0) : 0,
        parcelData: savedParcelData,
        seatSecretCode: seatSecretCode,
        pricePerPerson: route.price,
        totalAmount: totalAmount,
        pickupPoints: pickupPoints.map(p => ({ address: p.address, lat: p.lat, lng: p.lng })),
        dropoffPoints: dropoffPoints.map(p => ({ address: p.address, lat: p.lat, lng: p.lng })),
        tripDate: desiredTripDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        bookingDate: new Date().toISOString(),
        status: 'paid',
        booking_status: 'paid',
        paymentMethod: selectedPaymentMethodInBooking,
        paymentDate: new Date().toISOString()
    };
    
    // Save to userBookings (for backward compatibility)
    const userBookings = JSON.parse(localStorage.getItem('userBookings') || '[]');
    userBookings.push(booking);
    localStorage.setItem('userBookings', JSON.stringify(userBookings));
    
    // Store completed booking for confirmation page
    localStorage.setItem('completedBooking', JSON.stringify(booking));
    sessionStorage.setItem('currentBooking', JSON.stringify(booking));
    
    // Save trip data for trip status page (for passenger bookings)
    if (bookingTypeFromStorage === 'passengers') {
        // Save trip data with all booking information
        const tripData = {
            routeId: selectedRoute,
            routeName: route.name,
            passengers: passengerCount,
            seatSecretCode: booking.seatSecretCode, // Include seat secret code
            pickupPoints: pickupPoints.map(p => ({ 
                address: p.address, 
                lat: p.lat, 
                lng: p.lng 
            })),
            dropoffPoints: dropoffPoints.map(p => ({ 
                address: p.address, 
                lat: p.lat, 
                lng: p.lng 
            })),
            createdAt: new Date().toISOString(),
            bookingId: booking.id,
            bookingReference: booking.reference,
            paymentMethod: booking.paymentMethod,
            paymentDate: booking.paymentDate,
            status: 'paid',
            tripTime: desiredTripDate || route.departure?.time || '10:00 am'
        };
        
        localStorage.setItem('activeTripData', JSON.stringify(tripData));
    }
    
    // Also save booking data for trip status page to access
    localStorage.setItem('completedBooking', JSON.stringify(booking));
    
    // Check if this is a trip that needs more passengers (less than 15 passengers)
    const needsMorePassengers = (bookingTypeFromStorage === 'passengers' && 
                                 passengerCount < 15);
    
    if (needsMorePassengers) {
        // After showing success message, user can click button to go to trip status
        // The button is already in the payment success message
    } else {
        // For full trips or joined trips, still show the trip status button
        // but also allow redirect to confirmation page
    }
}

function revealVehicleInfoInBooking() {
    const imageContainer = document.getElementById('vehicle-image-container');
    const blurOverlay = document.getElementById('blur-overlay');
    const vehicleDetails = document.getElementById('vehicle-details');
    
    // Reveal image
    if (imageContainer) imageContainer.classList.add('revealed');
    if (blurOverlay) blurOverlay.classList.add('hidden');
    
    // Reveal details
    if (vehicleDetails) vehicleDetails.classList.add('revealed');
}

function goBackFromPayment() {
    // Update step navigation - go back to step 3
    const step4 = document.getElementById('step4');
    const step3 = document.getElementById('step3');
    if (step4) {
        step4.classList.remove('active');
    }
    if (step3) {
        step3.classList.remove('completed');
        step3.classList.add('active');
    }
    
    // Update current step
    currentStep = 3;
    
    // Hide payment step
    const paymentStep = document.getElementById('payment-step');
    if (paymentStep) {
        paymentStep.classList.remove('active');
    }
    
    // Show booking confirmation
    const confirmationContent = document.getElementById('booking-confirmation');
    if (confirmationContent) {
        confirmationContent.classList.add('active');
    }
    
    // Reset payment selection
    selectedPaymentMethodInBooking = null;
    const payButton = document.getElementById('pay-button');
    if (payButton) {
        payButton.disabled = true;
    }
    
    // Hide all payment forms
    document.querySelectorAll('.payment-form').forEach(form => {
        form.classList.remove('show');
    });
    
    // Remove selection from all cards
    document.querySelectorAll('.payment-method-card').forEach(card => {
        card.classList.remove('selected');
    });
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
window.addPickupPoint = addPickupPoint;
window.addDropoffPoint = addDropoffPoint;
window.removeLocation = removeLocation;
window.continueTripSelection = continueTripSelection;
window.updatePassengerInfo = updatePassengerInfo;
window.confirmBooking = confirmBooking;
window.proceedToPayment = proceedToPayment;
window.selectPaymentMethodInBooking = selectPaymentMethodInBooking;
window.processPaymentInBooking = processPaymentInBooking;
window.goBackFromPayment = goBackFromPayment;
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
    // Navigate to trip-status.html page
    window.location.href = 'trip-status.html';
}

function saveActiveTripToStorage() {
    if (passengerCount < 15) {
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


// ============================================
// BOOKING MANAGEMENT FUNCTIONS
// ============================================

/**
 * Loads and displays user's bookings from localStorage
 * Separates bookings into upcoming and history categories
 * 
 * Process:
 * 1. Retrieves bookings from localStorage
 * 2. Separates into upcoming (future paid trips) and history (past/completed trips)
 * 3. Updates count displays
 * 4. Displays bookings in appropriate tabs
 * 5. Shows bookings section if bookings exist
 * 
 * Categories:
 * - Upcoming: Paid trips with trip date in the future
 * - History: Completed trips or trips with date in the past
 * 
 * Usage: Called on page load to display user's existing bookings
 */
function loadUserBookings() {
    const userBookings = JSON.parse(localStorage.getItem('userBookings') || '[]');
    
    if (userBookings.length === 0) {
        return; // Don't show the section if no bookings
    }

    const now = new Date();
    const upcoming = userBookings.filter(b => b.status === 'paid' && new Date(b.tripDate) > now);
    const history = userBookings.filter(b => 
        (b.status === 'paid' && new Date(b.tripDate) <= now) || b.status === 'completed'
    );

    // Update counts
    document.getElementById('upcoming-count').textContent = upcoming.length;
    document.getElementById('history-count').textContent = history.length;

    // Display bookings
    displayBookingsInTab('upcoming-bookings', upcoming, 'upcoming');
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
    const statusClass = booking.status === 'paid' ? 'paid' : 'completed';
    const statusText = booking.status === 'paid' ? 'PAID' : 'COMPLETED';
    
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
    
        actions += `
            <button class="booking-action-btn secondary" onclick="viewBookingOnMap('${booking.id}')">
                <i class="ri-map-pin-line"></i> View on Map
            </button>
        `;
    
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
        const iconClass = 'default';
        const icon = 'ri-information-line';
        
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

// Initialize the page
// Update extra space display on page load
document.addEventListener('DOMContentLoaded', function() {
    populateRouteCards(); // Generate route cards dynamically from routes object
    initializeMap();
    checkActiveTrip();
    loadUserBookings();
    setupBookingsTabs();
    checkForJoinLink(); // Check if user is joining via shared link
    
    // Load notifications if user is logged in
    const fullNav = document.getElementById('fullNav');
    if (fullNav && fullNav.style.display !== 'none') {
        loadNotifications();
    }
});

