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
 * Currently selected booking data from the database
 * Stores the full booking object when a route card is selected
 */
let selectedBooking = null;

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
 * Structure: { parcelId: { size, images, etc. } }
 * Used to store all parcel information before booking submission
 * Note: senderName, senderPhone, receiverName, receiverPhone are now shared across all parcels
 */
let parcelData = {}; // Store parcel data by unique ID

// Shared sender and receiver information for all parcels
let sharedSenderInfo = {
    senderName: '',
    senderPhone: ''
};

let sharedReceiverInfo = {
    receiverName: '',
    receiverPhone: ''
};

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
/**
 * Converts extra space from small units to display format
 * Rule: 1 Large = 2 Medium = 4 Small
 * @param {number} smallCount - Count in small units
 * @returns {string} - Formatted string like "3 large (or 3 large or 6 medium or 12 small)"
 */
function formatExtraSpaceFromSmall(smallCount) {
    if (smallCount === 0) {
        return 'No extra space available';
    }
    
    const large = Math.floor(smallCount / 4);
    const medium = Math.floor(smallCount / 2);
    
    // Build the display string: "X large (or X large or Y medium or Z small)"
    const equivalents = [];
    if (large > 0) {
        equivalents.push(`${large} large`);
    }
    if (medium > 0) {
        equivalents.push(`${medium} medium`);
    }
    equivalents.push(`${smallCount} small`);
    
    if (large > 0) {
        return `${large} large (or ${equivalents.join(' or ')})`;
    } else if (medium > 0) {
        return `${medium} medium (or ${equivalents.join(' or ')})`;
    } else {
        return `${smallCount} small`;
    }
}

/**
 * Formats date from datetime string to date only
 * @param {string} datetimeString - ISO datetime string
 * @returns {string} - Formatted date string
 */
function formatDateOnly(datetimeString) {
    if (!datetimeString) return 'To be confirmed';
    const date = new Date(datetimeString);
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dayName = days[date.getDay()];
    return `${year}/${month}/${day} ${dayName}`;
}

/**
 * Formats time from datetime string to time only
 * @param {string} datetimeString - ISO datetime string
 * @returns {string} - Formatted time string
 */
function formatTimeOnly(datetimeString) {
    if (!datetimeString) return 'To be confirmed';
    const date = new Date(datetimeString);
    let hours = date.getHours();
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'pm' : 'am';
    hours = hours % 12;
    hours = hours ? hours : 12; // the hour '0' should be '12'
    return `${hours}:${minutes} ${ampm}`;
}

/**
 * Populates route cards from pending bookings
 * Only displays route cards for bookings with status 'pending'
 */
async function populateRouteCards() {
    const routeSelectionContainer = document.querySelector('.route-selection');
    if (!routeSelectionContainer) {
        console.warn('Route selection container not found');
        return;
    }

    // Clear existing route cards
    routeSelectionContainer.innerHTML = '';

    try {
        // Fetch pending bookings from API
        const response = await bookingApi.getPublicPendingBookings();
        
        if (!response.success || !response.bookings || response.bookings.length === 0) {
            // No pending bookings - hide the route cards section and heading
            const routeSection = document.querySelector('.route-selection');
            const routeHeading = routeSelectionContainer.previousElementSibling;
            if (routeSection) {
                routeSection.style.display = 'none';
            }
            if (routeHeading && routeHeading.tagName === 'H2' && routeHeading.textContent.includes('Available Routes')) {
                routeHeading.style.display = 'none';
            }
            return;
        }

        // Show the route cards section and heading
        const routeSection = document.querySelector('.route-selection');
        const routeHeading = routeSelectionContainer.previousElementSibling;
        if (routeSection) {
            routeSection.style.display = '';
        }
        if (routeHeading && routeHeading.tagName === 'H2' && routeHeading.textContent.includes('Available Routes')) {
            routeHeading.style.display = '';
        }

        // Store bookings globally for later use
        window.pendingBookings = response.bookings;

        // Generate route cards for each pending booking
        response.bookings.forEach(booking => {
            // Determine route display based on direction_type
            let routeDisplay = '';
            if (booking.direction_type === 'from_loc1') {
                routeDisplay = `${booking.location_1} → ${booking.location_2}`;
            } else if (booking.direction_type === 'from_loc2') {
                routeDisplay = `${booking.location_2} → ${booking.location_1}`;
            } else {
                // Fallback
                routeDisplay = `${booking.location_1} → ${booking.location_2}`;
            }

            // Format date and time
            const formattedDate = formatDateOnly(booking.scheduled_pickup);
            const formattedTime = formatTimeOnly(booking.scheduled_pickup);

            // Format extra space
            const extraSpaceText = formatExtraSpaceFromSmall(booking.extraspace_parcel_count_sp || 0);

            // Generate unique ID for this booking route card
            const bookingRouteId = `booking-${booking.ID}`;

            // Generate route card HTML
            const routeCardHTML = `
                <div class="route-card" data-route="${bookingRouteId}" data-booking-id="${booking.ID}" onclick="selectRoute('${bookingRouteId}')">
                    <div class="route-info">
                        <div class="route-details">
                            <h3><i class="ri-taxi-line"></i>${escapeAttribute(routeDisplay)}</h3>
                            <p><i class="ri-time-line"></i><strong>Duration:</strong> ~${booking.typical_duration_hours} hours</p>
                            <p><i class="ri-calendar-line"></i><strong>Date:</strong> ${escapeAttribute(formattedDate)}</p>
                            <p><i class="ri-time-line"></i><strong>Time:</strong> ${escapeAttribute(formattedTime)}</p>
                            <p><i class="ri-user-line"></i><strong>Capacity:</strong> ${booking.total_seats_available} seat${booking.total_seats_available !== 1 ? 's' : ''} available</p>
                            <p id="extra-space-${bookingRouteId}" style="background: #f3e5f5; padding: 0.75rem; border-radius: 8px; margin-top: 0.5rem;">
                                <i class="ri-box-3-line" style="color: #7b1fa2;"></i>
                                <strong style="color: #7b1fa2;">Available Extra Space:</strong> 
                                <span id="extra-space-display-${bookingRouteId}">${escapeAttribute(extraSpaceText)}</span>
                            </p>
                        </div>
                        <div class="route-price">R${parseFloat(booking.base_fare).toFixed(2)}</div>
                        <div class="extra-space-pricing" style="margin-top: 1rem; padding: 1rem; background: #fff9e6; border: 2px solid #FFD52F; border-radius: 10px;">
                            <div style="font-size: 0.85rem; color: #666; margin-bottom: 0.5rem; font-weight: 600;">
                                <i class="ri-price-tag-3-line" style="color: #FFD52F;"></i> Extra Space Pricing:
                            </div> 
                            <div style="display: flex; flex-direction: column; gap: 0.4rem; font-size: 0.9rem;">
                                <div style="display: flex; justify-content: space-between;">
                                    <span><strong>Large:</strong></span>
                                    <span style="color: #01386A; font-weight: 700;">R${parseFloat(booking.large_parcel_price).toFixed(2)}</span>
                                </div>
                                <div style="display: flex; justify-content: space-between;">
                                    <span><strong>Medium:</strong></span>
                                    <span style="color: #01386A; font-weight: 700;">R${parseFloat(booking.medium_parcel_price).toFixed(2)}</span>
                                </div>
                                <div style="display: flex; justify-content: space-between;">
                                    <span><strong>Small:</strong></span>
                                    <span style="color: #01386A; font-weight: 700;">R${parseFloat(booking.small_parcel_price).toFixed(2)}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;

            // Insert route card into container
            routeSelectionContainer.insertAdjacentHTML('beforeend', routeCardHTML);
        });
    } catch (error) {
        console.error('Error loading pending bookings:', error);
        // Hide route cards section and heading on error
        const routeSection = document.querySelector('.route-selection');
        const routeHeading = routeSelectionContainer.previousElementSibling;
        if (routeSection) {
            routeSection.style.display = 'none';
        }
        if (routeHeading && routeHeading.tagName === 'H2' && routeHeading.textContent.includes('Available Routes')) {
            routeHeading.style.display = 'none';
        }
    }
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
    
    // Get origin and destination cities from booking data
    let originCity, destinationCity;
    
    if (selectedBooking) {
        // Use booking data
        if (selectedBooking.direction_type === 'from_loc1') {
            originCity = selectedBooking.location_1;
            destinationCity = selectedBooking.location_2;
        } else if (selectedBooking.direction_type === 'from_loc2') {
            originCity = selectedBooking.location_2;
            destinationCity = selectedBooking.location_1;
        } else {
            // Fallback
            originCity = selectedBooking.location_1;
            destinationCity = selectedBooking.location_2;
        }
    } else {
        // Fallback to old routes object if booking data not available
        const route = routes[selectedRoute];
        if (!route) return;
        const cities = route.name.split(' → ');
        originCity = cities[0].trim();
        destinationCity = cities[1].trim();
    }
    
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
    
    // Ensure location selection section is visible
    const locationSection = document.querySelector('.location-selection-section');
    if (locationSection) {
        locationSection.style.display = 'block';
    }
    
    // Initialize Google Maps
    const mapContainer = document.getElementById('location-selection-map');
    if (!mapContainer) {
        console.warn('Location selection map container not found');
        return;
    }
    
    // Ensure map container is visible
    mapContainer.style.display = 'block';
    mapContainer.style.visibility = 'visible';
    mapContainer.style.height = '400px';
    
    if (!locationSelectionMap) {
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
            
            // Add route line if coordinates exist (for old route system)
            // For booking-based routes, we'll show the route when pickup/dropoff are selected
            if (routes[selectedRoute] && routes[selectedRoute].coordinates) {
                const route = routes[selectedRoute];
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
            } else if (selectedBooking) {
                // For booking-based routes, center map between origin and destination cities
                const originBoundary = cityBoundaries[originCity] || cityBoundaries['Pretoria'];
                const destBoundary = cityBoundaries[destinationCity] || cityBoundaries['Tzaneen'];
                
                if (originBoundary && destBoundary) {
                    const bounds = new google.maps.LatLngBounds();
                    bounds.extend(new google.maps.LatLng(originBoundary.center.lat, originBoundary.center.lng));
                    bounds.extend(new google.maps.LatLng(destBoundary.center.lat, destBoundary.center.lng));
                    locationSelectionMap.fitBounds(bounds);
                }
            }
            
            // Initialize autocomplete inputs
            initializeAutocomplete();
        }, 100);
    } else {
        // Map already exists, just initialize autocomplete and ensure visibility
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
            
            // Create wrapper for input and suggestions
            const pickupWrapper = document.createElement('div');
            pickupWrapper.style.position = 'relative';
            pickupWrapper.style.width = '100%';
            
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
            pickupWrapper.appendChild(pickupInput);
            
            // Create suggestions dropdown
            const pickupSuggestions = document.createElement('div');
            pickupSuggestions.id = 'pickup-suggestions';
            pickupSuggestions.style.display = 'none';
            pickupSuggestions.style.position = 'absolute';
            pickupSuggestions.style.top = '100%';
            pickupSuggestions.style.left = '0';
            pickupSuggestions.style.right = '0';
            pickupSuggestions.style.backgroundColor = 'white';
            pickupSuggestions.style.border = '1px solid #e0e0e0';
            pickupSuggestions.style.borderRadius = '8px';
            pickupSuggestions.style.maxHeight = '300px';
            pickupSuggestions.style.overflowY = 'auto';
            pickupSuggestions.style.zIndex = '1000';
            pickupSuggestions.style.boxShadow = '0 4px 6px rgba(0,0,0,0.1)';
            pickupWrapper.appendChild(pickupSuggestions);
            
            pickupContainer.appendChild(pickupWrapper);
            
            // Initialize AutocompleteService for filtering
            const autocompleteService = new google.maps.places.AutocompleteService();
            let pickupService = autocompleteService;
            
            // Handle input changes
            let pickupTimeout;
            pickupInput.addEventListener('input', () => {
                clearTimeout(pickupTimeout);
                const query = pickupInput.value.trim();
                
                if (query.length < 2) {
                    pickupSuggestions.style.display = 'none';
                    return;
                }
                
                pickupTimeout = setTimeout(() => {
                    pickupService.getPlacePredictions({
                        input: query,
                        bounds: new google.maps.LatLngBounds(
                            new google.maps.LatLng(originBoundary.bounds.south, originBoundary.bounds.west),
                            new google.maps.LatLng(originBoundary.bounds.north, originBoundary.bounds.east)
                        ),
                        componentRestrictions: { country: 'za' }
                    }, (predictions, status) => {
                        if (status === google.maps.places.PlacesServiceStatus.OK && predictions) {
                            // Filter predictions to only include those with the city name
                            const filteredPredictions = predictions.filter(prediction => {
                                const description = prediction.description.toLowerCase();
                                const cityName = originCity.toLowerCase();
                                return description.includes(cityName);
                            });
                            
                            if (filteredPredictions.length > 0) {
                                displayPickupSuggestions(filteredPredictions, pickupSuggestions, pickupInput);
                            } else {
                                pickupSuggestions.style.display = 'none';
                            }
                        } else {
                            pickupSuggestions.style.display = 'none';
                        }
                    });
                }, 300);
            });
            
            // Hide suggestions when clicking outside
            document.addEventListener('click', (e) => {
                if (!pickupWrapper.contains(e.target)) {
                    pickupSuggestions.style.display = 'none';
                }
            });
            
            // Function to display filtered suggestions
            function displayPickupSuggestions(predictions, container, input) {
                container.innerHTML = '';
                predictions.forEach(prediction => {
                    const item = document.createElement('div');
                    item.style.padding = '0.75rem';
                    item.style.cursor = 'pointer';
                    item.style.borderBottom = '1px solid #f0f0f0';
                    item.textContent = prediction.description;
                    
                    item.addEventListener('mouseenter', () => {
                        item.style.backgroundColor = '#f5f5f5';
                    });
                    item.addEventListener('mouseleave', () => {
                        item.style.backgroundColor = 'white';
                    });
                    
                    item.addEventListener('click', () => {
                        input.value = prediction.description;
                        container.style.display = 'none';
                        
                        // Get place details
                        const placesService = new google.maps.places.PlacesService(locationSelectionMap);
                        placesService.getDetails({
                            placeId: prediction.place_id,
                            fields: ['geometry', 'formatted_address', 'name']
                        }, (place, status) => {
                            if (status === google.maps.places.PlacesServiceStatus.OK && place.geometry) {
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
                                
                                // Clear validation error for pickup
                                const pickupInput = document.getElementById('pickup-location-input');
                                if (pickupInput) {
                                    pickupInput.style.borderColor = '#e0e0e0';
                                }
                                const locationErrorMsg = document.getElementById('location-validation-message');
                                if (locationErrorMsg && pickupPoints.length > 0 && dropoffPoints.length > 0) {
                                    locationErrorMsg.style.display = 'none';
                                }
                                
                                // Fit map to show both markers
                                fitLocationSelectionMap();
                                
                                // Update continue button state
                                updateContinueButtonState();
                            }
                        });
                    });
                    
                    container.appendChild(item);
                });
                container.style.display = 'block';
            }
        }
        
        if (dropoffContainer) {
            // Clear container
            dropoffContainer.innerHTML = '';
            
            // Create wrapper for input and suggestions
            const dropoffWrapper = document.createElement('div');
            dropoffWrapper.style.position = 'relative';
            dropoffWrapper.style.width = '100%';
            
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
            dropoffWrapper.appendChild(dropoffInput);
            
            // Create suggestions dropdown
            const dropoffSuggestions = document.createElement('div');
            dropoffSuggestions.id = 'dropoff-suggestions';
            dropoffSuggestions.style.display = 'none';
            dropoffSuggestions.style.position = 'absolute';
            dropoffSuggestions.style.top = '100%';
            dropoffSuggestions.style.left = '0';
            dropoffSuggestions.style.right = '0';
            dropoffSuggestions.style.backgroundColor = 'white';
            dropoffSuggestions.style.border = '1px solid #e0e0e0';
            dropoffSuggestions.style.borderRadius = '8px';
            dropoffSuggestions.style.maxHeight = '300px';
            dropoffSuggestions.style.overflowY = 'auto';
            dropoffSuggestions.style.zIndex = '1000';
            dropoffSuggestions.style.boxShadow = '0 4px 6px rgba(0,0,0,0.1)';
            dropoffWrapper.appendChild(dropoffSuggestions);
            
            dropoffContainer.appendChild(dropoffWrapper);
            
            // Initialize AutocompleteService for filtering
            const autocompleteService = new google.maps.places.AutocompleteService();
            let dropoffService = autocompleteService;
            
            // Handle input changes
            let dropoffTimeout;
            dropoffInput.addEventListener('input', () => {
                clearTimeout(dropoffTimeout);
                const query = dropoffInput.value.trim();
                
                if (query.length < 2) {
                    dropoffSuggestions.style.display = 'none';
                    return;
                }
                
                dropoffTimeout = setTimeout(() => {
                    dropoffService.getPlacePredictions({
                        input: query,
                        bounds: new google.maps.LatLngBounds(
                            new google.maps.LatLng(destBoundary.bounds.south, destBoundary.bounds.west),
                            new google.maps.LatLng(destBoundary.bounds.north, destBoundary.bounds.east)
                        ),
                        componentRestrictions: { country: 'za' }
                    }, (predictions, status) => {
                        if (status === google.maps.places.PlacesServiceStatus.OK && predictions) {
                            // Filter predictions to only include those with the city name
                            const filteredPredictions = predictions.filter(prediction => {
                                const description = prediction.description.toLowerCase();
                                const cityName = destinationCity.toLowerCase();
                                return description.includes(cityName);
                            });
                            
                            if (filteredPredictions.length > 0) {
                                displayDropoffSuggestions(filteredPredictions, dropoffSuggestions, dropoffInput);
                            } else {
                                dropoffSuggestions.style.display = 'none';
                            }
                        } else {
                            dropoffSuggestions.style.display = 'none';
                        }
                    });
                }, 300);
            });
            
            // Hide suggestions when clicking outside
            document.addEventListener('click', (e) => {
                if (!dropoffWrapper.contains(e.target)) {
                    dropoffSuggestions.style.display = 'none';
                }
            });
            
            // Function to display filtered suggestions
            function displayDropoffSuggestions(predictions, container, input) {
                container.innerHTML = '';
                predictions.forEach(prediction => {
                    const item = document.createElement('div');
                    item.style.padding = '0.75rem';
                    item.style.cursor = 'pointer';
                    item.style.borderBottom = '1px solid #f0f0f0';
                    item.textContent = prediction.description;
                    
                    item.addEventListener('mouseenter', () => {
                        item.style.backgroundColor = '#f5f5f5';
                    });
                    item.addEventListener('mouseleave', () => {
                        item.style.backgroundColor = 'white';
                    });
                    
                    item.addEventListener('click', () => {
                        input.value = prediction.description;
                        container.style.display = 'none';
                        
                        // Get place details
                        const placesService = new google.maps.places.PlacesService(locationSelectionMap);
                        placesService.getDetails({
                            placeId: prediction.place_id,
                            fields: ['geometry', 'formatted_address', 'name']
                        }, (place, status) => {
                            if (status === google.maps.places.PlacesServiceStatus.OK && place.geometry) {
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
                                
                                // Clear validation error for dropoff
                                const dropoffInput = document.getElementById('dropoff-location-input');
                                if (dropoffInput) {
                                    dropoffInput.style.borderColor = '#e0e0e0';
                                }
                                const locationErrorMsg = document.getElementById('location-validation-message');
                                if (locationErrorMsg && pickupPoints.length > 0 && dropoffPoints.length > 0) {
                                    locationErrorMsg.style.display = 'none';
                                }
                                
                                // Fit map to show both markers
                                fitLocationSelectionMap();
                                
                                // Update continue button state
                                updateContinueButtonState();
                            }
                        });
                    });
                    
                    container.appendChild(item);
                });
                container.style.display = 'block';
            }
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
    const routeCard = document.querySelector(`[data-route="${routeId}"]`);
    if (routeCard) {
        routeCard.classList.add('selected');
        selectedRoute = routeId;
        
        // Get booking ID from data attribute
        const bookingId = routeCard.getAttribute('data-booking-id');
        if (bookingId && window.pendingBookings) {
            // Find and store the selected booking data
            selectedBooking = window.pendingBookings.find(b => b.ID == bookingId);
            
            // Log selected booking with parcel prices for debugging
            if (selectedBooking) {
                console.log('Selected booking with prices:', {
                    bookingId: selectedBooking.ID,
                    base_fare: selectedBooking.base_fare,
                    small_parcel_price: selectedBooking.small_parcel_price,
                    medium_parcel_price: selectedBooking.medium_parcel_price,
                    large_parcel_price: selectedBooking.large_parcel_price
                });
            }
            
            // Update booking type options based on availability
            updateBookingTypeOptionsBasedOnAvailability();
        }
    }

    // Update map
    addRouteMarkers();

    // Enable next step after a delay
    setTimeout(() => {
        nextStep();
    }, 500);
}

/**
 * Updates booking type options (passengers vs parcels) based on availability
 * - Hides passenger option if no seats available (total_seats_available <= 0)
 * - Hides parcel option if no extra parcel space available (extraspace_parcel_count_sp <= 0)
 */
function updateBookingTypeOptionsBasedOnAvailability() {
    if (!selectedBooking) {
        // Reset visibility if no booking selected
        const passengerOption = document.getElementById('booking-type-passengers');
        const parcelOption = document.getElementById('booking-type-parcels');
        const passengerLabel = passengerOption ? passengerOption.closest('label') : null;
        const parcelLabel = parcelOption ? parcelOption.closest('label') : null;
        
        if (passengerLabel) passengerLabel.style.display = 'block';
        if (parcelLabel) parcelLabel.style.display = 'block';
        if (passengerOption) passengerOption.disabled = false;
        if (parcelOption) parcelOption.disabled = false;
        return;
    }
    
    const seatsAvailable = selectedBooking.total_seats_available || 0;
    const extraParcelSpace = selectedBooking.extraspace_parcel_count_sp || 0;
    
    // Get booking type option elements
    const passengerOption = document.getElementById('booking-type-passengers');
    const parcelOption = document.getElementById('booking-type-parcels');
    const passengerLabel = passengerOption ? passengerOption.closest('label') : null;
    const parcelLabel = parcelOption ? parcelOption.closest('label') : null;
    
    // Hide/show passenger option based on seat availability
    if (seatsAvailable <= 0) {
        // No seats available - hide and disable passenger option
        if (passengerLabel) {
            passengerLabel.style.display = 'none';
        }
        if (passengerOption) {
            passengerOption.disabled = true;
        }
        // If passenger was selected, switch to parcels if available
        if (bookingType === 'passengers' && extraParcelSpace > 0) {
            bookingType = 'parcels';
            if (parcelOption) {
                parcelOption.checked = true;
                parcelOption.disabled = false;
            }
            handleBookingTypeChange('parcels');
        } else if (bookingType === 'passengers' && extraParcelSpace <= 0) {
            // Neither available - keep current but show warning
            console.warn('No seats or parcel space available for this route');
        }
    } else {
        // Seats available - show and enable passenger option
        if (passengerLabel) {
            passengerLabel.style.display = 'block';
        }
        if (passengerOption) {
            passengerOption.disabled = false;
        }
    }
    
    // Always show parcel option (unless both seats and extra space are full)
    // Parcels can use extra space, and if seats are available, they can also use seat parcels
    // Only hide if BOTH seats and extra space are unavailable
    if (extraParcelSpace <= 0 && seatsAvailable <= 0) {
        // No space available at all - hide and disable parcel option
        if (parcelLabel) {
            parcelLabel.style.display = 'none';
        }
        if (parcelOption) {
            parcelOption.disabled = true;
        }
        console.warn('No seats or parcel space available for this route');
    } else {
        // Parcel option available - show and enable
        if (parcelLabel) {
            parcelLabel.style.display = 'block';
        }
        if (parcelOption) {
            parcelOption.disabled = false;
        }
    }
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
    console.log('nextStep() CALLED - currentStep before increment:', currentStep);
    if (currentStep < 6) {
        // Map currentStep to step indicator before incrementing
        let currentStepIndicatorId = currentStep;
        if (currentStep === 4) {
            currentStepIndicatorId = 3; // Booking Summary is step3 in UI
        } else if (currentStep === 5) {
            currentStepIndicatorId = 4; // Payment is step4 in UI
        }
        
        const activeStepEl = document.querySelector(`#step${currentStepIndicatorId}`);
        if (activeStepEl) {
            activeStepEl.classList.remove('active');
            activeStepEl.classList.add('completed');
        }

        const activeContent = document.querySelector('.booking-content.active');
        if (activeContent) {
            activeContent.classList.remove('active');
        }

        currentStep++;

        // Map currentStep to step indicator (step indicators are 1-based, but don't match currentStep exactly)
        // Step 1: Route Selection (step1)
        // Step 2: Location Selection (step2)
        // Step 3: Passenger/Parcel Info (step2 - still in Booking Details)
        // Step 4: Booking Summary (step3)
        // Step 5: Payment (step4)
        let stepIndicatorId = currentStep;
        if (currentStep === 4) {
            stepIndicatorId = 3; // Booking Summary is step3 in UI
        } else if (currentStep === 5) {
            stepIndicatorId = 4; // Payment is step4 in UI
        }
        
        const nextStepEl = document.querySelector(`#step${stepIndicatorId}`);
        if (nextStepEl) {
            nextStepEl.classList.add('active');
        }
        
        if (currentStep === 2) {
            // Location Selection / Booking Details step
            const passengerContent = document.getElementById('passenger-selection');
            if (passengerContent) {
                passengerContent.classList.add('active');
                
                // Update booking type options based on availability
                updateBookingTypeOptionsBasedOnAvailability();
                
                // Ensure location selection section is visible
                const locationSection = passengerContent.querySelector('.location-selection-section');
                if (locationSection) {
                    locationSection.style.display = 'block';
                }
            }

            updatePassengerInfo();
            
            // Initialize location selection map and geocoders
            // Use a longer delay to ensure the DOM is ready
            setTimeout(() => {
                initializeLocationSelection();
                // Update button state after initialization to check for locations
                updateContinueButtonState();
            }, 300);
            
            // Resize map when step becomes active
            setTimeout(() => {
                if (locationSelectionMap) {
                    google.maps.event.trigger(locationSelectionMap, 'resize');
                }
            }, 800);

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
            console.log('=== ENTERING STEP 3: PASSENGER/PARCEL INFORMATION ===');
            console.log('currentStep value:', currentStep);
            console.log('You are now on step 3. Fill in passenger/parcel info and click Continue again to go to step 4 (Booking Summary)');
            
            // Ensure passenger-selection is visible
            const passengerContent = document.getElementById('passenger-selection');
            if (passengerContent) {
                passengerContent.classList.add('active');
                passengerContent.style.display = 'block';
                console.log('Passenger selection content is visible');
                
                // Generate passenger forms if needed
                if (bookingType === 'passengers') {
                    updatePassengerInfo();
                    console.log('Passenger forms generated');
                } else if (PARCEL_FEATURE_ENABLED && bookingType === 'parcels') {
                    generateParcelForms();
                    console.log('Parcel forms generated');
                }
            } else {
                console.error('CRITICAL: passenger-selection container not found!');
            }
        } else if (currentStep === 4) {
            // Booking Summary step
            console.log('=== ENTERING STEP 4: BOOKING SUMMARY ===');
            console.log('currentStep value:', currentStep);
            console.log('Step 4 handler executing...');
            
            // Hide all other booking-content sections first
            document.querySelectorAll('.booking-content').forEach(content => {
                content.classList.remove('active');
                content.style.display = 'none';
            });
            
            const confirmationContent = document.getElementById('booking-confirmation');
            console.log('Confirmation content found:', !!confirmationContent);
            
            if (!confirmationContent) {
                console.error('CRITICAL ERROR: booking-confirmation element does not exist in DOM!');
                console.log('Available booking-content elements:', document.querySelectorAll('.booking-content').length);
                return; // Can't proceed without the container
            }
            
            if (confirmationContent) {
                // Force visibility with multiple methods
                confirmationContent.classList.add('active');
                confirmationContent.style.display = 'block';
                confirmationContent.style.visibility = 'visible';
                confirmationContent.style.opacity = '1';
                confirmationContent.style.position = 'relative';
                confirmationContent.style.zIndex = '1';
                
                // Ensure booking summary container is visible
                const summaryContainer = document.getElementById('booking-summary');
                console.log('Summary container found:', !!summaryContainer);
                
                if (summaryContainer) {
                    summaryContainer.style.display = 'block';
                    summaryContainer.style.visibility = 'visible';
                    summaryContainer.style.opacity = '1';
                    summaryContainer.style.minHeight = '200px';
                    summaryContainer.style.width = '100%';
                    
                    // Set a test message immediately - FORCE IT TO SHOW
                    const testHTML = `
                        <div class="summary-row" style="padding: 2rem; text-align: center; background: #d4edda; border: 2px solid #28a745; border-radius: 10px; margin-bottom: 1rem;">
                            <span style="font-size: 1.2rem; color: #155724; font-weight: 700;">TEST: Booking Summary Container is Visible!</span>
                        </div>
                        <div class="summary-row" style="padding: 1.5rem; background: white; border-radius: 10px;">
                            <span>Route:</span>
                            <span>Loading booking information...</span>
                        </div>
                    `;
                    summaryContainer.innerHTML = testHTML;
                    console.log('Test HTML set in summary container');
                    
                    // Force with !important
                    summaryContainer.setAttribute('style', 
                        'display: block !important; visibility: visible !important; opacity: 1 !important; min-height: 200px !important; width: 100% !important;'
                    );
                } else {
                    console.error('CRITICAL: Summary container not found!');
                    console.log('Parent element:', confirmationContent);
                    console.log('All children:', Array.from(confirmationContent.children).map(c => c.id || c.className));
                }
                
                // Ensure buttons are visible
                const bookingActions = confirmationContent.querySelector('.booking-actions');
                console.log('Booking actions found:', !!bookingActions);
                
                if (bookingActions) {
                    bookingActions.style.display = 'flex';
                    bookingActions.style.visibility = 'visible';
                    bookingActions.style.gap = '1rem';
                    bookingActions.style.marginTop = '2rem';
                } else {
                    console.error('CRITICAL: Booking actions not found!');
                }
                
                // Ensure h2 title is visible
                const title = confirmationContent.querySelector('h2');
                if (title) {
                    title.style.display = 'block';
                    title.style.visibility = 'visible';
                }
            } else {
                console.error('CRITICAL: booking-confirmation container not found in DOM!');
            }
            
            // Update summary immediately and with retries
            console.log('Calling updateBookingSummary from step 4');
            updateBookingSummary();
            
            setTimeout(() => {
                console.log('Calling updateBookingSummary retry 1 (100ms)');
                updateBookingSummary();
            }, 100);
            
            setTimeout(() => {
                console.log('Calling updateBookingSummary retry 2 (500ms)');
                updateBookingSummary();
            }, 500);
            
            setTimeout(() => {
                console.log('Calling updateBookingSummary retry 3 (1000ms)');
                updateBookingSummary();
            }, 1000);
            
            setTimeout(() => {
                console.log('Final check - calling updateBookingSummary retry 4 (2000ms)');
                updateBookingSummary();
                // Final visibility check
                const finalCheck = document.getElementById('booking-summary');
                if (finalCheck) {
                    console.log('Final check - summary container styles:', {
                        display: window.getComputedStyle(finalCheck).display,
                        visibility: window.getComputedStyle(finalCheck).visibility,
                        opacity: window.getComputedStyle(finalCheck).opacity,
                        innerHTML: finalCheck.innerHTML.substring(0, 100)
                    });
                }
            }, 2000);
        } else if (currentStep === 5) {
            // Payment step - hide booking summary and show payment
            console.log('=== ENTERING STEP 5: PAYMENT ===');
            
            // Hide ALL booking-content sections first
            document.querySelectorAll('.booking-content').forEach(content => {
                content.classList.remove('active');
                content.style.display = 'none';
                content.style.visibility = 'hidden';
            });
            
            // Explicitly hide booking confirmation (Booking Summary)
            const confirmationContent = document.getElementById('booking-confirmation');
            if (confirmationContent) {
                confirmationContent.classList.remove('active');
                confirmationContent.style.display = 'none';
                confirmationContent.style.visibility = 'hidden';
                confirmationContent.style.opacity = '0';
                console.log('Booking summary hidden in nextStep() handler');
            }
            
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
        // Map currentStep to step indicator
        let currentStepIndicatorId = currentStep;
        if (currentStep === 4) {
            currentStepIndicatorId = 3; // Booking Summary is step3 in UI
        } else if (currentStep === 5) {
            currentStepIndicatorId = 4; // Payment is step4 in UI
        }
        
        const activeStep = document.querySelector(`#step${currentStepIndicatorId}`);
        const activeContent = document.querySelector('.booking-content.active');
        if (activeStep) {
            activeStep.classList.remove('active');
        }
        if (activeContent) {
            activeContent.classList.remove('active');
        }
        currentStep--;

        // Map new currentStep to step indicator
        let targetStepIndicatorId = currentStep;
        if (currentStep === 4) {
            targetStepIndicatorId = 3; // Booking Summary is step3 in UI
        } else if (currentStep === 5) {
            targetStepIndicatorId = 4; // Payment is step4 in UI
        }
        
        const targetStep = document.querySelector(`#step${targetStepIndicatorId}`);
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
                confirmationContent.style.display = 'block';
            }
            updateBookingSummary();
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
    // First validate shared sender/receiver information
    if (!sharedSenderInfo.senderName || sharedSenderInfo.senderName.trim() === '') {
        return {
            valid: false,
            message: 'Please enter the sender\'s name.'
        };
    }
    
    if (!sharedSenderInfo.senderPhone || sharedSenderInfo.senderPhone.trim() === '') {
        return {
            valid: false,
            message: 'Please enter the sender\'s phone number.'
        };
    }
    
    if (!validateSAPhoneNumber(sharedSenderInfo.senderPhone)) {
        return {
            valid: false,
            message: 'Sender\'s phone number is invalid. Please enter a valid South African phone number (e.g., 071 234 5678 or +27 71 234 5678).'
        };
    }
    
    if (!sharedReceiverInfo.receiverName || sharedReceiverInfo.receiverName.trim() === '') {
        return {
            valid: false,
            message: 'Please enter the receiver\'s name.'
        };
    }
    
    if (!sharedReceiverInfo.receiverPhone || sharedReceiverInfo.receiverPhone.trim() === '') {
        return {
            valid: false,
            message: 'Please enter the receiver\'s phone number.'
        };
    }
    
    if (!validateSAPhoneNumber(sharedReceiverInfo.receiverPhone)) {
        return {
            valid: false,
            message: 'Receiver\'s phone number is invalid. Please enter a valid South African phone number (e.g., 082 123 4567 or +27 82 123 4567).'
        };
    }
    
    // Then validate individual parcel information
    for (let i = 1; i <= parcelCount; i++) {
        const parcel = parcelData[i];
        
        if (!parcel) {
            return {
                valid: false,
                message: `Parcel ${i}: Missing parcel information. Please provide details for all parcels.`
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

    // Use new capacity calculation system based on small equivalents
    const availableCapacity = getAvailableParcelCapacity(); // in small equivalents
    const capacityInfo = calculateTotalParcelCapacityUsed(); // Returns object with total, extraSpace, seatParcels, seatParcelCount
    const extraSpaceRemaining = Math.max(availableCapacity - capacityInfo.extraSpace, 0);
    
    // Get available seats for seat parcels
    const seatsAvailable = selectedBooking ? (selectedBooking.total_seats_available || 0) : 15;
    const seatParcelsRemaining = Math.max(seatsAvailable - capacityInfo.seatParcelCount, 0);
    
    // Calculate percentage based on extra space usage (seat parcels don't count towards extra space percentage)
    const capacityPercentage = availableCapacity > 0 
        ? Math.min((capacityInfo.extraSpace / availableCapacity) * 100, 100) 
        : 0;

    if (capacityFill) {
        capacityFill.style.width = `${capacityPercentage}%`;
        capacityFill.textContent = `${Math.round(capacityPercentage)}%`;
    }
    
    // Display capacity information
    if (totalDisplay) {
        // Show extra space usage
        let displayText = `${capacityInfo.extraSpace} / ${availableCapacity} extra space used`;
        if (capacityInfo.seatParcelCount > 0) {
            displayText += `, ${capacityInfo.seatParcelCount} seat parcel${capacityInfo.seatParcelCount !== 1 ? 's' : ''}`;
        }
        totalDisplay.textContent = displayText;
    }

    if (capacityText) {
        // Show breakdown of parcels by size and type (extra space vs seat parcels)
        let extraSpaceLarge = 0, extraSpaceMedium = 0, extraSpaceSmall = 0;
        let seatParcelLarge = 0, seatParcelMedium = 0, seatParcelSmall = 0;
        
        for (let i = 1; i <= parcelCount; i++) {
            if (parcelData[i] && parcelData[i].size) {
                if (parcelData[i].isSeatParcel) {
                    // Seat parcel
                    if (parcelData[i].size === 'large') seatParcelLarge++;
                    else if (parcelData[i].size === 'medium') seatParcelMedium++;
                    else if (parcelData[i].size === 'small') seatParcelSmall++;
                } else {
                    // Extra space parcel
                    if (parcelData[i].size === 'large') extraSpaceLarge++;
                    else if (parcelData[i].size === 'medium') extraSpaceMedium++;
                    else if (parcelData[i].size === 'small') extraSpaceSmall++;
                }
            }
        }
        
        const extraSpaceBreakdown = [];
        if (extraSpaceLarge > 0) extraSpaceBreakdown.push(`${extraSpaceLarge} large`);
        if (extraSpaceMedium > 0) extraSpaceBreakdown.push(`${extraSpaceMedium} medium`);
        if (extraSpaceSmall > 0) extraSpaceBreakdown.push(`${extraSpaceSmall} small`);
        
        const seatParcelBreakdown = [];
        if (seatParcelLarge > 0) seatParcelBreakdown.push(`${seatParcelLarge} large`);
        if (seatParcelMedium > 0) seatParcelBreakdown.push(`${seatParcelMedium} medium`);
        if (seatParcelSmall > 0) seatParcelBreakdown.push(`${seatParcelSmall} small`);
        
        let displayText = `<i class="ri-box-3-line"></i>${parcelCount} parcel${parcelCount !== 1 ? 's' : ''} selected`;
        
        if (extraSpaceBreakdown.length > 0) {
            displayText += ` - Extra Space: ${extraSpaceBreakdown.join(', ')}`;
        }
        if (seatParcelBreakdown.length > 0) {
            displayText += ` - Seat Parcels: ${seatParcelBreakdown.join(', ')} (at seat price)`;
        }
        
        capacityText.innerHTML = displayText;
    }
    
    if (matchingStatus) {
        const timerElement = matchingStatus.querySelector('.matching-timer');
        if (timerElement) {
            let statusMessage = '';
            
            if (extraSpaceRemaining > 0) {
                statusMessage += `<i class="ri-information-line"></i> ${extraSpaceRemaining} extra space remaining`;
            } else if (capacityInfo.extraSpace > 0) {
                statusMessage += `<i class="ri-checkbox-circle-line" style="color: #28a745;"></i> Extra space full`;
            }
            
            if (seatParcelsRemaining > 0) {
                if (statusMessage) statusMessage += ' | ';
                statusMessage += `${seatParcelsRemaining} seat${seatParcelsRemaining !== 1 ? 's' : ''} available for seat parcels`;
            } else if (capacityInfo.seatParcelCount > 0) {
                if (statusMessage) statusMessage += ' | ';
                statusMessage += `All seats used for parcels`;
            }
            
            if (!statusMessage) {
                statusMessage = `<i class="ri-error-warning-line" style="color: #dc3545;"></i> No more space available`;
            }
            
            timerElement.innerHTML = statusMessage;
        }
    }
}

function updateContinueButtonState() {
    const continueBtn = document.getElementById('continue-passenger-btn');
    const validationMsg = document.getElementById('parcel-validation-message');
    const validationText = document.getElementById('validation-message-text');
    
    if (!continueBtn) return;
    
    // PRIORITY: Check if pickup and dropoff locations are selected
    const locationsSelected = pickupPoints.length > 0 && dropoffPoints.length > 0;
    
    if (!locationsSelected) {
        // Disable button if locations not selected
        continueBtn.disabled = true;
        continueBtn.style.opacity = '0.5';
        continueBtn.style.cursor = 'not-allowed';
        return;
    }
    
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
        // For passengers, enable button if locations are selected
        continueBtn.disabled = false;
        continueBtn.style.opacity = '1';
        continueBtn.style.cursor = 'pointer';
        if (validationMsg) validationMsg.style.display = 'none';
    }
}

function validateAndProceed() {
    console.log('=== validateAndProceed() CALLED ===');
    console.log('Current state:', {
        currentStep,
        pickupPoints: pickupPoints.length,
        dropoffPoints: dropoffPoints.length,
        bookingType,
        passengerCount
    });
    
    // PRIORITY: Validate pickup and dropoff locations are selected
    if (pickupPoints.length === 0) {
        console.log('VALIDATION FAILED: No pickup points');
        // Show error message
        const locationErrorMsg = document.getElementById('location-validation-message');
        const locationErrorText = document.getElementById('location-validation-message-text');
        if (locationErrorMsg) {
            locationErrorMsg.style.display = 'block';
        }
        if (locationErrorText) {
            locationErrorText.textContent = 'Please select a pickup location before proceeding.';
        }
        
        // Scroll to location selection section
        const locationSection = document.querySelector('.location-selection-section');
        if (locationSection) {
            locationSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        
        // Highlight pickup input
        const pickupInput = document.getElementById('pickup-location-input');
        if (pickupInput) {
            pickupInput.style.borderColor = '#dc3545';
            pickupInput.style.borderWidth = '2px';
            pickupInput.focus();
        }
        
        return;
    }
    
    if (dropoffPoints.length === 0) {
        // Show error message
        const locationErrorMsg = document.getElementById('location-validation-message');
        const locationErrorText = document.getElementById('location-validation-message-text');
        if (locationErrorMsg) {
            locationErrorMsg.style.display = 'block';
        }
        if (locationErrorText) {
            locationErrorText.textContent = 'Please select a dropoff location before proceeding.';
        }
        
        // Scroll to location selection section
        const locationSection = document.querySelector('.location-selection-section');
        if (locationSection) {
            locationSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        
        // Highlight dropoff input
        const dropoffInput = document.getElementById('dropoff-location-input');
        if (dropoffInput) {
            dropoffInput.style.borderColor = '#dc3545';
            dropoffInput.style.borderWidth = '2px';
            dropoffInput.focus();
        }
        
        return;
    }
    
    // Hide location validation message if locations are selected
    const locationErrorMsg = document.getElementById('location-validation-message');
    if (locationErrorMsg) {
        locationErrorMsg.style.display = 'none';
    }
    
    // Reset input border colors
    const pickupInput = document.getElementById('pickup-location-input');
    const dropoffInput = document.getElementById('dropoff-location-input');
    if (pickupInput) {
        pickupInput.style.borderColor = '#e0e0e0';
    }
    if (dropoffInput) {
        dropoffInput.style.borderColor = '#e0e0e0';
    }
    
    // Ensure mutual exclusivity - user can only book passengers OR parcels, never both
    if (bookingType === 'passengers' && parcelCount > 0) {
        alert('Error: Cannot book both passengers and parcels at the same time. Please select only passenger booking.');
        // Reset parcels
        parcelCount = 0;
        parcelData = {};
        return;
    }
    
    if (bookingType === 'parcels' && passengerCount > 0) {
        alert('Error: Cannot book both passengers and parcels at the same time. Please select only parcel booking.');
        // Reset passengers
        passengerCount = 0;
        return;
    }
    
    // Validate based on booking type
    if (PARCEL_FEATURE_ENABLED && bookingType === 'parcels') {
        // Ensure no passengers for parcel booking
        if (passengerCount > 0) {
            alert('Error: Cannot book passengers when parcel booking is selected. Please select only parcel booking.');
            passengerCount = 0;
            return;
        }
        
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
        // For passengers, ensure no parcels
        if (parcelCount > 0) {
            alert('Error: Cannot book parcels when passenger booking is selected. Please select only passenger booking.');
            parcelCount = 0;
            parcelData = {};
            return;
        }
        
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

    console.log('About to call nextStep() from validateAndProceed, currentStep:', currentStep);
    
    // If we're on step 2 (Booking Details), skip step 3 and go directly to step 4 (Booking Summary)
    if (currentStep === 2) {
        console.log('Skipping step 3, going directly to step 4 (Booking Summary)');
        // Mark step 2 as completed
        const step2El = document.querySelector('#step2');
        if (step2El) {
            step2El.classList.remove('active');
            step2El.classList.add('completed');
        }
        
        // Hide passenger-selection
        const passengerContent = document.getElementById('passenger-selection');
        if (passengerContent) {
            passengerContent.classList.remove('active');
            passengerContent.style.display = 'none';
        }
        
        // Set currentStep to 4 (Booking Summary)
        currentStep = 4;
        
        // Mark step 3 as active (which is Booking Summary in UI)
        const step3El = document.querySelector('#step3');
        if (step3El) {
            step3El.classList.add('active');
        }
        
        // Show booking summary
        const confirmationContent = document.getElementById('booking-confirmation');
        if (confirmationContent) {
            confirmationContent.classList.add('active');
            confirmationContent.style.display = 'block';
            confirmationContent.style.visibility = 'visible';
            confirmationContent.style.opacity = '1';
        }
        
        // Update booking summary
        updateBookingSummary();
        
        console.log('After skipping to step 4, currentStep is now:', currentStep);
    } else {
        nextStep();
        console.log('After calling nextStep(), currentStep is now:', currentStep);
    }
}

// Handle booking type change (passengers vs parcels)
// Ensures mutual exclusivity - user can only book passengers OR parcels, never both
function handleBookingTypeChange(type) {
    if (!PARCEL_FEATURE_ENABLED && type === 'parcels') {
        console.info('Parcel bookings are temporarily disabled.');
        type = 'passengers';
    }
    bookingType = type;
    
    // Reset counts when switching - enforce mutual exclusivity
    if (type === 'passengers') {
        // Switch to passengers - completely reset parcels to ensure no mixing
        parcelCount = 0;
        parcelData = {};
        passengerCount = 1; // Only allow 1 passenger - others join through links
        
        // Clear parcel data from sessionStorage
        sessionStorage.removeItem('parcelData');
    } else if (type === 'parcels') {
        // Switch to parcels - completely reset passengers to ensure no mixing
        passengerCount = 0;
        
        // Clear passenger data from sessionStorage
        const emptyPassengerData = [];
        sessionStorage.setItem('passengerData', JSON.stringify(emptyPassengerData));
        
        parcelCount = Math.max(1, parcelCount); // Ensure at least 1 parcel
        // Initialize first parcel if needed
        if (!parcelData[1]) {
            parcelData[1] = {
                secretCode: generateSecretCode(),
                images: [],
                size: 'small' // default parcel size
            };
        }
        
        // Ensure all existing parcels have a default size of 'small' if not set
        for (let i = 1; i <= parcelCount; i++) {
            if (parcelData[i] && !parcelData[i].size) {
                parcelData[i].size = 'small';
            }
        }
        
        // Load shared sender/receiver info from sessionStorage if available
        const savedSharedSenderInfo = sessionStorage.getItem('sharedSenderInfo');
        const savedSharedReceiverInfo = sessionStorage.getItem('sharedReceiverInfo');
        if (savedSharedSenderInfo) {
            sharedSenderInfo = JSON.parse(savedSharedSenderInfo);
        }
        if (savedSharedReceiverInfo) {
            sharedReceiverInfo = JSON.parse(savedSharedReceiverInfo);
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
    
    // Check available seats for seat parcels
    const seatsAvailable = selectedBooking ? (selectedBooking.total_seats_available || 0) : 15;
    const capacityInfo = calculateTotalParcelCapacityUsed();
    const seatParcelsCount = capacityInfo.seatParcelCount || 0;
    
    // Check if we can add more parcels
    const availableCapacity = getAvailableParcelCapacity();
    const extraSpaceRemaining = Math.max(availableCapacity - capacityInfo.extraSpace, 0);
    
    // Allow adding parcels if:
    // 1. There's extra space available, OR
    // 2. There are seats available for seat parcels (only if seats are not fully occupied)
    if (extraSpaceRemaining > 0 || (seatsAvailable > 0 && seatParcelsCount < seatsAvailable)) {
        parcelCount++;
        if (!parcelData[parcelCount]) {
            const availableExtraSpace = getAvailableParcelCapacity();
            const currentCapacity = calculateTotalParcelCapacityUsed();
            
            // Determine if this should be a seat parcel
            // Can only be seat parcel if: extra space is full AND seats are available
            const isSeatParcel = currentCapacity.extraSpace >= availableExtraSpace && seatsAvailable > 0;
            
            parcelData[parcelCount] = {
                secretCode: generateSecretCode(),
                images: [],
                size: 'small', // Default to small size
                isSeatParcel: isSeatParcel // Mark if it's a seat parcel
            };
        }
        generateParcelForms();
        updateCounterDisplays();
        updateCapacityDisplay();
    } else {
        // Show notification that capacity is full
        const notification = document.createElement('div');
        notification.style.cssText = 'position: fixed; top: 20px; right: 20px; background: #dc3545; color: white; padding: 1rem 1.5rem; border-radius: 10px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); z-index: 10000; max-width: 300px;';
        
        let message = '';
        if (extraSpaceRemaining <= 0 && seatsAvailable <= 0) {
            message = 'No more parcel space or seats available for this route.';
        } else if (extraSpaceRemaining <= 0) {
            message = 'Extra parcel space is full. Seat parcels are not available as all seats are occupied.';
        } else {
            message = 'Cannot add more parcels at this time.';
        }
        
        notification.innerHTML = `
            <div style="display: flex; align-items: center; gap: 10px;">
                <i class="ri-error-warning-line" style="font-size: 1.5rem;"></i>
                <div>
                    <strong>Capacity Full</strong>
                    <p style="margin: 0.5rem 0 0 0; font-size: 0.9rem;">${message}</p>
                </div>
            </div>
        `;
        document.body.appendChild(notification);
        
        // Remove notification after 3 seconds
        setTimeout(() => {
            notification.remove();
        }, 3000);
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
    
    // Get user profile to prefill sender information
    const userProfileString = localStorage.getItem('userProfile') || sessionStorage.getItem('userProfile');
    let userProfile = null;

    if (userProfileString) {
        try {
            userProfile = JSON.parse(userProfileString);
        } catch (e) {
            console.error('Error parsing user profile:', e);
        }
    }

    // Prefill sender information with user's information if not already set
    if (!sharedSenderInfo.senderName || sharedSenderInfo.senderName.trim() === '') {
        // Try to get full name from userProfile
        let userName = '';
        if (userProfile) {
            if (userProfile.firstName && userProfile.lastName) {
                userName = `${userProfile.firstName} ${userProfile.lastName}`.trim();
            } else if (userProfile.name) {
                userName = userProfile.name;
            } else if (userProfile.firstName) {
                userName = userProfile.firstName;
            }
        }
        sharedSenderInfo.senderName = sanitizeFieldValue(userName);
    }

    if (!sharedSenderInfo.senderPhone || sharedSenderInfo.senderPhone.trim() === '') {
        const userPhone = userProfile?.phone || userProfile?.phoneNumber || '';
        sharedSenderInfo.senderPhone = sanitizeFieldValue(userPhone);
    }
    
    // Add shared sender and receiver information section at the top (only once)
    const sharedInfoHTML = `
        <div class="passenger-form-card" style="margin-bottom: 2rem; background: linear-gradient(135deg, #e7f3ff 0%, #d1e7ff 100%); border: 2px solid #01386A;">
            <div class="passenger-form-header">
                <h5 style="color: #01386A;"><i class="ri-information-line"></i> Shared Sender & Receiver Information</h5>
                <p style="color: #666; font-size: 0.9rem; margin-top: 0.5rem;">This information will be used for all parcels</p>
            </div>
            
            <h5 style="color: #01386A; margin-bottom: 1rem; font-size: 1.1rem; margin-top: 1.5rem;"><i class="ri-user-fill"></i> Sender Information</h5>
            <div class="passenger-form-grid" style="margin-bottom: 1.5rem;">
                <div class="passenger-form-group">
                    <label><i class="ri-user-3-line"></i> Sender Name <span style="color: #dc3545;">*</span></label>
                    <input type="text" id="sharedSenderNamePublic" 
                        value="${sharedSenderInfo.senderName || ''}" 
                        onchange="updateSharedSenderInfo('senderName', this.value)"
                        placeholder="Enter sender's full name">
                </div>
                <div class="passenger-form-group">
                    <label><i class="ri-phone-line"></i> Sender Phone <span style="color: #dc3545;">*</span></label>
                    <input type="tel" id="sharedSenderPhonePublic" 
                        value="${sharedSenderInfo.senderPhone || ''}" 
                        onchange="updateSharedSenderInfo('senderPhone', this.value)"
                        oninput="validatePhoneInputPublic(this)"
                        placeholder="e.g., 071 234 5678">
                    <small style="color: #6c757d; font-size: 0.85rem; margin-top: 0.25rem; display: block;">Format: 071 234 5678 or +27 71 234 5678</small>
                </div>
            </div>
            
            <h5 style="color: #01386A; margin-bottom: 1rem; font-size: 1.1rem;"><i class="ri-user-received-line"></i> Receiver Information</h5>
            <div class="passenger-form-grid" style="margin-bottom: 1.5rem;">
                <div class="passenger-form-group">
                    <label><i class="ri-user-3-line"></i> Receiver Name <span style="color: #dc3545;">*</span></label>
                    <input type="text" id="sharedReceiverNamePublic" 
                        value="${sharedReceiverInfo.receiverName || ''}" 
                        onchange="updateSharedReceiverInfo('receiverName', this.value)"
                        placeholder="Enter receiver's full name">
                </div>
                <div class="passenger-form-group">
                    <label><i class="ri-phone-line"></i> Receiver Phone <span style="color: #dc3545;">*</span></label>
                    <input type="tel" id="sharedReceiverPhonePublic" 
                        value="${sharedReceiverInfo.receiverPhone || ''}" 
                        onchange="updateSharedReceiverInfo('receiverPhone', this.value)"
                        oninput="validatePhoneInputPublic(this)"
                        placeholder="e.g., 071 234 5678">
                    <small style="color: #6c757d; font-size: 0.85rem; margin-top: 0.25rem; display: block;">Format: 071 234 5678 or +27 71 234 5678</small>
                </div>
            </div>
        </div>
    `;
    
    formsContainer.innerHTML = sharedInfoHTML;
    
    // Recalculate capacity to properly assign parcels
    const capacityInfo = calculateTotalParcelCapacityUsed();
    const availableExtraSpace = getAvailableParcelCapacity();
    
    for (let i = 1; i <= parcelCount; i++) {
        if (!parcelData[i]) {
            // Determine if this should be a seat parcel based on current capacity
            const currentExtraSpaceUsed = capacityInfo.extraSpace || 0;
            const seatsAvailable = selectedBooking ? (selectedBooking.total_seats_available || 0) : 15;
            
            // Can only be seat parcel if seats are available
            const isSeatParcel = currentExtraSpaceUsed >= availableExtraSpace && seatsAvailable > 0;
            
            parcelData[i] = {
                secretCode: generateSecretCode(),
                images: [],
                size: 'small',
                isSeatParcel: isSeatParcel
            };
        } else {
            // Ensure existing parcels have isSeatParcel flag set correctly
            if (parcelData[i].size && parcelData[i].isSeatParcel === undefined) {
                // Recalculate to determine if it should be a seat parcel
                const currentExtraSpaceUsed = capacityInfo.extraSpace || 0;
                const seatsAvailable = selectedBooking ? (selectedBooking.total_seats_available || 0) : 15;
                parcelData[i].isSeatParcel = currentExtraSpaceUsed >= availableExtraSpace && seatsAvailable > 0;
            }
        }
        
        // Check if this is a seat parcel
        const isSeatParcel = parcelData[i].isSeatParcel || false;
        const seatParcelBadge = isSeatParcel 
            ? '<div style="background: #FFD52F; color: #01386A; padding: 0.3rem 0.8rem; border-radius: 15px; font-size: 0.85rem; font-weight: 700; margin-left: 0.5rem;"><i class="ri-seat-line"></i> Seat Parcel (Seat Price)</div>'
            : '';
        
        const formHTML = `
            <div class="parcel-card-public" ${isSeatParcel ? 'style="border: 2px solid #FFD52F; background: linear-gradient(135deg, #fff9e6 0%, #fff3cd 100%);"' : ''}>
                <div class="passenger-form-header">
                    <h5><i class="ri-box-3-line"></i> Parcel ${i}</h5>
                    <div style="display: flex; align-items: center; gap: 0.5rem;">
                        <div style="background: #01386A; color: white; padding: 0.3rem 0.8rem; border-radius: 15px; font-size: 0.9rem; font-weight: 600;">#${i}</div>
                        ${seatParcelBadge}
                    </div>
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
            </div>
        `;
        
        formsContainer.innerHTML += formHTML;
    }
}

// Functions to update shared sender/receiver information
function updateSharedSenderInfo(field, value) {
    if (field === 'senderName') {
        sharedSenderInfo.senderName = value;
    } else if (field === 'senderPhone') {
        sharedSenderInfo.senderPhone = value;
    }
    updateContinueButtonState();
}

function updateSharedReceiverInfo(field, value) {
    if (field === 'receiverName') {
        sharedReceiverInfo.receiverName = value;
    } else if (field === 'receiverPhone') {
        sharedReceiverInfo.receiverPhone = value;
    }
    updateContinueButtonState();
}

// Make functions globally accessible
window.updateSharedSenderInfo = updateSharedSenderInfo;
window.updateSharedReceiverInfo = updateSharedReceiverInfo;

/**
 * Converts parcel size to small equivalents
 * 1 large = 4 small, 1 medium = 2 small, 1 small = 1 small
 */
function getParcelSizeInSmallEquivalents(size) {
    switch(size) {
        case 'large': return 4;
        case 'medium': return 2;
        case 'small': return 1;
        default: return 1; // Default to small if unknown
    }
}

/**
 * Calculates total capacity used by all parcels in small equivalents
 * Separates extra space parcels from seat parcels
 * @returns {Object} - { total: number, extraSpace: number, seatParcels: number, seatParcelCount: number }
 */
function calculateTotalParcelCapacityUsed() {
    const availableExtraSpace = getAvailableParcelCapacity();
    const seatsAvailable = selectedBooking ? (selectedBooking.total_seats_available || 0) : 15;
    let extraSpaceUsed = 0;
    let seatParcelCount = 0;
    let seatParcelsTotal = 0;
    
    // First pass: Try to fill extra space first, then mark remaining as seat parcels (only if seats available)
    for (let i = 1; i <= parcelCount; i++) {
        if (parcelData[i] && parcelData[i].size) {
            const parcelSize = getParcelSizeInSmallEquivalents(parcelData[i].size);
            
            // If already marked as seat parcel, verify seats are still available
            if (parcelData[i].isSeatParcel) {
                // If seats are now full, can't be seat parcel - try to fit in extra space
                if (seatParcelCount >= seatsAvailable) {
                    // Seats are full, try extra space
                    if (extraSpaceUsed + parcelSize <= availableExtraSpace) {
                        parcelData[i].isSeatParcel = false;
                        extraSpaceUsed += parcelSize;
                    } else {
                        // Can't fit anywhere - keep as seat parcel but we'll show warning
                        seatParcelCount++;
                        seatParcelsTotal += parcelSize;
                    }
                } else {
                    seatParcelCount++;
                    seatParcelsTotal += parcelSize;
                }
            } else {
                // Try to fit in extra space first
                if (extraSpaceUsed + parcelSize <= availableExtraSpace) {
                    // Can fit in extra space
                    parcelData[i].isSeatParcel = false;
                    extraSpaceUsed += parcelSize;
                } else {
                    // Extra space full - can be seat parcel only if seats are available
                    if (seatParcelCount < seatsAvailable) {
                        parcelData[i].isSeatParcel = true;
                        seatParcelCount++;
                        seatParcelsTotal += parcelSize;
                    } else {
                        // No space available - can't assign (shouldn't happen if validation is correct)
                        parcelData[i].isSeatParcel = false;
                    }
                }
            }
        }
    }
    
    return {
        total: extraSpaceUsed + seatParcelsTotal,
        extraSpace: extraSpaceUsed,
        seatParcels: seatParcelsTotal,
        seatParcelCount: seatParcelCount
    };
}

/**
 * Gets available parcel capacity from selected booking
 * Returns capacity in small equivalents
 */
function getAvailableParcelCapacity() {
    if (!selectedBooking) {
        // Default capacity if no booking selected
        return 12; // Default to 12 small parcels
    }
    // extraspace_parcel_count_sp is already in small equivalents
    return selectedBooking.extraspace_parcel_count_sp || 0;
}

/**
 * Removes excess parcels when extra space capacity is exceeded
 * Only removes parcels that exceed extra space - seat parcels are allowed
 * Removes parcels starting from the highest numbered ones
 */
function removeExcessParcels() {
    const availableCapacity = getAvailableParcelCapacity();
    
    // Recalculate and mark parcels as seat parcels if needed
    let extraSpaceUsed = 0;
    for (let i = 1; i <= parcelCount; i++) {
        if (parcelData[i] && parcelData[i].size) {
            const parcelSize = getParcelSizeInSmallEquivalents(parcelData[i].size);
            
            if (extraSpaceUsed + parcelSize <= availableCapacity) {
                // Can fit in extra space
                parcelData[i].isSeatParcel = false;
                extraSpaceUsed += parcelSize;
            } else {
                // Must be a seat parcel
                parcelData[i].isSeatParcel = true;
            }
        }
    }
    
    // No need to remove parcels - seat parcels are allowed
    // Just regenerate forms to update the display
    generateParcelForms();
    updateCounterDisplays();
    updateCapacityDisplay();
}

function updateParcelFieldPublic(parcelNumber, field, value) {
    if (!PARCEL_FEATURE_ENABLED) return;
    if (parcelData[parcelNumber]) {
        const oldValue = parcelData[parcelNumber][field];
        parcelData[parcelNumber][field] = value;
        
        // Special handling for size changes - recalculate parcel assignments
        if (field === 'size' && oldValue !== value) {
            const availableCapacity = getAvailableParcelCapacity();
            const capacityInfo = calculateTotalParcelCapacityUsed();
            
            // Check if extra space is exceeded - if so, mark excess parcels as seat parcels
            if (capacityInfo.extraSpace > availableCapacity) {
                // Reassign parcels - extra space parcels first, then seat parcels
                let extraSpaceUsed = 0;
                for (let i = 1; i <= parcelCount; i++) {
                    if (parcelData[i] && parcelData[i].size) {
                        const parcelSize = getParcelSizeInSmallEquivalents(parcelData[i].size);
                        
                        if (extraSpaceUsed + parcelSize <= availableCapacity) {
                            // Can fit in extra space
                            parcelData[i].isSeatParcel = false;
                            extraSpaceUsed += parcelSize;
                        } else {
                            // Must be a seat parcel
                            parcelData[i].isSeatParcel = true;
                        }
                    }
                }
                
                // Show notification to user about seat parcels
                const notification = document.createElement('div');
                notification.style.cssText = 'position: fixed; top: 20px; right: 20px; background: #ffc107; color: #000; padding: 1rem 1.5rem; border-radius: 10px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); z-index: 10000; max-width: 300px;';
                notification.innerHTML = `
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <i class="ri-information-line" style="font-size: 1.5rem;"></i>
                        <div>
                            <strong>Extra Space Full</strong>
                            <p style="margin: 0.5rem 0 0 0; font-size: 0.9rem;">Some parcels will use seat space at seat price.</p>
                        </div>
                    </div>
                `;
                document.body.appendChild(notification);
                
                // Remove notification after 5 seconds
                setTimeout(() => {
                    notification.remove();
                }, 5000);
            }
            
            // Update display
            generateParcelForms();
            updateCapacityDisplay();
        }
        
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
    console.log('=== updateBookingSummary FUNCTION CALLED ===');
    console.log('State:', { 
        selectedRoute, 
        selectedBooking: selectedBooking ? 'exists' : 'null',
        pickupPoints: pickupPoints.length,
        dropoffPoints: dropoffPoints.length,
        passengerCount,
        bookingType,
        currentStep
    });
    
    // FIRST: Find and ensure container exists and is visible
    const summaryContainer = document.getElementById('booking-summary');
    if (!summaryContainer) {
        console.error('CRITICAL ERROR: booking-summary container does not exist in DOM!');
        // Try to create it as fallback
        const confirmationContent = document.getElementById('booking-confirmation');
        if (confirmationContent) {
            const newContainer = document.createElement('div');
            newContainer.id = 'booking-summary';
            newContainer.className = 'booking-summary';
            newContainer.style.display = 'block';
            newContainer.style.visibility = 'visible';
            newContainer.style.minHeight = '200px';
            const h2 = confirmationContent.querySelector('h2');
            if (h2 && h2.nextSibling) {
                confirmationContent.insertBefore(newContainer, h2.nextSibling);
            } else {
                confirmationContent.appendChild(newContainer);
            }
            console.log('Created booking-summary container as fallback');
            return updateBookingSummary(); // Retry
        }
        return;
    }
    
    // Ensure container is visible BEFORE generating content
    summaryContainer.style.display = 'block';
    summaryContainer.style.visibility = 'visible';
    summaryContainer.style.opacity = '1';
    summaryContainer.style.minHeight = '200px';
    summaryContainer.style.width = '100%';
    
    // Get route data from booking or fallback to routes object
    let routeName = 'Route not selected';
    let routePrice = 0;
    let routeDuration = 0;
    let routeDistance = 0;
    
    if (selectedBooking) {
        // Use booking data
        if (selectedBooking.direction_type === 'from_loc1') {
            routeName = `${selectedBooking.location_1 || 'Location 1'} → ${selectedBooking.location_2 || 'Location 2'}`;
        } else if (selectedBooking.direction_type === 'from_loc2') {
            routeName = `${selectedBooking.location_2 || 'Location 2'} → ${selectedBooking.location_1 || 'Location 1'}`;
        } else {
            routeName = `${selectedBooking.location_1 || 'Location 1'} → ${selectedBooking.location_2 || 'Location 2'}`;
        }
        routePrice = parseFloat(selectedBooking.base_fare) || 0;
        routeDuration = parseFloat(selectedBooking.typical_duration_hours) || 0;
        routeDistance = 0; // Distance not available in booking data
    } else if (selectedRoute && routes && routes[selectedRoute]) {
        // Fallback to old routes object
        const route = routes[selectedRoute];
        routeName = route.name || 'Route not selected';
        routePrice = route.price || 0;
        routeDuration = route.duration || 0;
        routeDistance = route.distance || 0;
    } else {
        console.warn('No route data available for summary. Using defaults.');
        // Try to get from sessionStorage or use defaults
        routeName = 'Route information unavailable';
    }
    
    const bookingTypeFromStorage = sessionStorage.getItem('bookingType') || bookingType;
    const passengerCountFromStorage = parseInt(sessionStorage.getItem('passengerCount') || passengerCount) || passengerCount;
    
    // Load shared sender/receiver info from sessionStorage if available (for parcel bookings)
    if (bookingTypeFromStorage === 'parcels') {
        const savedSharedSenderInfo = sessionStorage.getItem('sharedSenderInfo');
        const savedSharedReceiverInfo = sessionStorage.getItem('sharedReceiverInfo');
        if (savedSharedSenderInfo) {
            try {
                sharedSenderInfo = JSON.parse(savedSharedSenderInfo);
            } catch (e) {
                console.warn('Error parsing shared sender info:', e);
            }
        }
        if (savedSharedReceiverInfo) {
            try {
                sharedReceiverInfo = JSON.parse(savedSharedReceiverInfo);
            } catch (e) {
                console.warn('Error parsing shared receiver info:', e);
            }
        }
    }
    
    let summaryHTML = '';
    
    // Handle parcel bookings
    if (bookingTypeFromStorage === 'parcels') {
        const savedParcelCount = parseInt(sessionStorage.getItem('parcelCount') || parcelCount) || parcelCount;
        const savedParcelData = JSON.parse(sessionStorage.getItem('parcelData') || JSON.stringify(parcelData)) || parcelData;
        
        // Calculate pricing based on parcel types (extra space vs seat parcels)
        // Get pricing from selected booking (from route card) - ensure they are numbers
        // These prices come from the booking that was clicked in the route selection step
        const smallPrice = selectedBooking?.small_parcel_price != null 
            ? parseFloat(selectedBooking.small_parcel_price) 
            : EXTRA_SPACE_PRICING.small;
        const mediumPrice = selectedBooking?.medium_parcel_price != null 
            ? parseFloat(selectedBooking.medium_parcel_price) 
            : EXTRA_SPACE_PRICING.medium;
        const largePrice = selectedBooking?.large_parcel_price != null 
            ? parseFloat(selectedBooking.large_parcel_price) 
            : EXTRA_SPACE_PRICING.large;
        const routePriceNum = parseFloat(routePrice) || 0;
        
        let extraSpaceTotal = 0;
        let seatParcelTotal = 0;
        let extraSpaceCount = 0;
        let seatParcelCount = 0;
        
        for (let i = 1; i <= savedParcelCount; i++) {
            if (savedParcelData[i] && savedParcelData[i].size) {
                if (savedParcelData[i].isSeatParcel) {
                    // Seat parcels cost the same as a passenger seat regardless of size
                    seatParcelTotal += routePriceNum;
                    seatParcelCount++;
                } else {
                    // Extra space parcels use size-based pricing
                    if (savedParcelData[i].size === 'large') {
                        extraSpaceTotal += largePrice;
                    } else if (savedParcelData[i].size === 'medium') {
                        extraSpaceTotal += mediumPrice;
                    } else if (savedParcelData[i].size === 'small') {
                        extraSpaceTotal += smallPrice;
                    }
                    extraSpaceCount++;
                }
            }
        }
        
        // Ensure totals are numbers
        extraSpaceTotal = parseFloat(extraSpaceTotal) || 0;
        seatParcelTotal = parseFloat(seatParcelTotal) || 0;
        const estimatedTotal = extraSpaceTotal + seatParcelTotal;
        
        summaryHTML = `
            <div class="summary-row">
                <span>Booking Type:</span>
                <span><strong>Parcel Delivery</strong></span>
            </div>
            <div class="summary-row">
                <span>Route:</span>
                <span>${routeName}</span>
            </div>
            <div class="summary-row">
                <span>Number of Parcels:</span>
                <span>${savedParcelCount} parcel(s)${seatParcelCount > 0 ? ` (${extraSpaceCount} extra space, ${seatParcelCount} seat parcel${seatParcelCount !== 1 ? 's' : ''})` : ''}</span>
            </div>
            ${seatParcelCount > 0 ? `<div class="summary-row" style="color: #FFD52F; font-weight: 600;">
                <span><i class="ri-seat-line"></i> Seat Parcels:</span>
                <span>${seatParcelCount} × R${routePriceNum.toFixed(2)} = R${seatParcelTotal.toFixed(2)}</span>
            </div>` : ''}
            ${extraSpaceCount > 0 ? `<div class="summary-row">
                <span>Extra Space Parcels:</span>
                <span>R${extraSpaceTotal.toFixed(2)}</span>
            </div>` : ''}
            ${routeDistance > 0 ? `<div class="summary-row">
                <span>Distance:</span>
                <span>${routeDistance} km</span>
            </div>` : ''}
            <div class="summary-row">
                <span>Duration:</span>
                <span>~${routeDuration} hours</span>
            </div>
        `;
        
        // Add shared sender/receiver information
        summaryHTML += `<div class="summary-row" style="grid-column: 1 / -1; margin-top: 1rem; padding-top: 1rem; border-top: 2px solid #e0e0e0;">
            <span><strong>Sender & Receiver Information:</strong></span>
        </div>`;
        summaryHTML += `
            <div class="summary-row" style="grid-column: 1 / -1; padding-left: 2rem;">
                <span>Sender:</span>
                <span>${sharedSenderInfo.senderName || 'Not specified'} - ${sharedSenderInfo.senderPhone || 'Not specified'}</span>
            </div>
            <div class="summary-row" style="grid-column: 1 / -1; padding-left: 2rem;">
                <span>Receiver:</span>
                <span>${sharedReceiverInfo.receiverName || 'Not specified'} - ${sharedReceiverInfo.receiverPhone || 'Not specified'}</span>
            </div>
        `;
        
        // Add parcel details if available (without individual verification codes)
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
                    `;
                }
            });
        }
        
        // Add verification codes (one sender code and one receiver code for the entire booking)
        // Try to get codes from sessionStorage (set after payment) or from payment response
        const parcelCodes = JSON.parse(sessionStorage.getItem('parcelCodes') || '{}');
        const senderCode = parcelCodes.sender_code || null;
        const receiverCode = parcelCodes.receiver_code || null;
        
        if (senderCode || receiverCode) {
            summaryHTML += `<div class="summary-row" style="grid-column: 1 / -1; margin-top: 1rem; padding-top: 1rem; border-top: 2px solid #e0e0e0;">
                <span><strong>Verification Codes:</strong></span>
            </div>`;
            if (senderCode) {
                summaryHTML += `
                    <div class="summary-row" style="grid-column: 1 / -1; padding-left: 2rem;">
                        <span>Sender Code (for pickup verification):</span>
                        <span><strong style="color: #01386A; font-size: 1.1rem;">${senderCode}</strong></span>
                    </div>
                `;
            }
            if (receiverCode) {
                summaryHTML += `
                    <div class="summary-row" style="grid-column: 1 / -1; padding-left: 2rem;">
                        <span>Receiver Code (for delivery verification):</span>
                        <span><strong style="color: #01386A; font-size: 1.1rem;">${receiverCode}</strong></span>
                    </div>
                `;
            }
        }
        
        // Calculate average parcel price for display - ensure it's a number
        let avgParcelPrice = 0;
        if (extraSpaceCount > 0 && extraSpaceTotal > 0) {
            avgParcelPrice = parseFloat(extraSpaceTotal) / parseFloat(extraSpaceCount);
            avgParcelPrice = isNaN(avgParcelPrice) ? 0 : avgParcelPrice;
        }
        
        // Ensure estimatedTotal is a number
        const estimatedTotalNum = parseFloat(estimatedTotal) || 0;
        
        summaryHTML += `
            ${extraSpaceCount > 0 ? `<div class="summary-row" style="margin-top: 1rem; padding-top: 1rem; border-top: 2px solid #e0e0e0;">
                <span>Average Price per Extra Space Parcel:</span>
                <span>R${avgParcelPrice.toFixed(2)}</span>
            </div>` : ''}
            <div class="summary-row" style="margin-top: ${extraSpaceCount > 0 ? '0.5rem' : '1rem'}; padding-top: ${extraSpaceCount > 0 ? '0.5rem' : '1rem'}; border-top: ${extraSpaceCount > 0 ? 'none' : '2px solid #e0e0e0'};">
                <span><strong>Total Amount:</strong></span>
                <span><strong>R${estimatedTotalNum.toFixed(2)}</strong></span>
            </div>
        `;
    } else {
        // Handle passenger bookings
        const totalPrice = routePrice * passengerCountFromStorage;

        let pickupLocations = 'Not specified';
        if (pickupPoints.length > 0) {
            pickupLocations = pickupPoints.map(p => p.address).join('<br>');
        }

        let dropoffLocations = 'Not specified';
        if (dropoffPoints.length > 0) {
            dropoffLocations = dropoffPoints.map(p => p.address).join('<br>');
        }

        // Resolve date/time from booking or desiredTripDate
        let tripDateDisplay = '-';
        let tripTimeDisplay = 'To be confirmed';
        
        if (selectedBooking && selectedBooking.scheduled_pickup) {
            tripDateDisplay = formatDateOnly(selectedBooking.scheduled_pickup);
            tripTimeDisplay = formatTimeOnly(selectedBooking.scheduled_pickup);
        } else if (desiredTripDate) {
            tripDateDisplay = formatDateOnly(desiredTripDate);
            tripTimeDisplay = formatTimeOnly(desiredTripDate);
        } else {
            const desiredTripDateFromStorage = sessionStorage.getItem('desiredTripDate');
            if (desiredTripDateFromStorage) {
                tripDateDisplay = formatDateOnly(desiredTripDateFromStorage);
                tripTimeDisplay = formatTimeOnly(desiredTripDateFromStorage);
            }
        }

        summaryHTML = `
            <div class="summary-row">
                <span>Route:</span>
                <span>${routeName}</span>
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
                <span>${passengerCountFromStorage} person(s)</span>
            </div>
            ${routeDistance > 0 ? `<div class="summary-row">
                <span>Distance:</span>
                <span>${routeDistance} km</span>
            </div>` : ''}
            <div class="summary-row">
                <span>Duration:</span>
                <span>~${routeDuration} hours</span>
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
                <span><strong>Total Amount:</strong></span>
                <span><strong>R${totalPrice.toFixed(2)}</strong></span>
            </div>
        `;
    }
    
    // summaryContainer was already declared at the start of the function
    // Now set the HTML content - ALWAYS set something even if empty
    if (!summaryHTML || summaryHTML.trim().length === 0) {
        summaryHTML = `
            <div class="summary-row" style="padding: 2rem; background: #fff3cd; border-radius: 10px; margin-bottom: 1rem;">
                <span style="font-weight: 700; color: #856404;">Route:</span>
                <span style="color: #856404;">Loading booking information...</span>
            </div>
            <div class="summary-row" style="padding: 2rem; background: #d1ecf1; border-radius: 10px;">
                <span style="font-weight: 700; color: #0c5460;">Status:</span>
                <span style="color: #0c5460;">Please wait while we load your booking details</span>
            </div>
        `;
        console.warn('Summary HTML was empty, using fallback');
    }
    
    // Set the HTML content
    summaryContainer.innerHTML = summaryHTML;
    
    // Force visibility again after setting content
    summaryContainer.style.display = 'block';
    summaryContainer.style.visibility = 'visible';
    summaryContainer.style.opacity = '1';
    summaryContainer.style.minHeight = '200px';
    summaryContainer.style.width = '100%';
    
    // Verify it's actually visible
    const computedStyle = window.getComputedStyle(summaryContainer);
    console.log('Booking summary updated successfully', { 
        htmlLength: summaryHTML.length,
        containerExists: !!summaryContainer,
        containerDisplay: computedStyle.display,
        containerVisibility: computedStyle.visibility,
        containerOpacity: computedStyle.opacity,
        containerHeight: computedStyle.height,
        parentDisplay: summaryContainer.parentElement ? window.getComputedStyle(summaryContainer.parentElement).display : 'no parent',
        preview: summaryHTML.substring(0, 150) + '...'
    });
    
    // If still not visible, force it with !important
    if (computedStyle.display === 'none' || computedStyle.visibility === 'hidden') {
        console.warn('Container is still hidden, forcing with !important');
        summaryContainer.setAttribute('style', 
            'display: block !important; visibility: visible !important; opacity: 1 !important; min-height: 200px !important; width: 100% !important;'
        );
    }
    
    // Ensure the booking-confirmation container is visible
    const confirmationContainer = document.getElementById('booking-confirmation');
    if (confirmationContainer) {
        confirmationContainer.style.display = 'block';
        confirmationContainer.style.visibility = 'visible';
        confirmationContainer.classList.add('active');
        
        // Ensure buttons are visible
        const bookingActions = confirmationContainer.querySelector('.booking-actions');
        if (bookingActions) {
            bookingActions.style.display = 'flex';
            bookingActions.style.gap = '1rem';
            bookingActions.style.visibility = 'visible';
        } else {
            console.warn('Booking actions container not found');
        }
        
        // Ensure h2 title is visible
        const title = confirmationContainer.querySelector('h2');
        if (title) {
            title.style.display = 'block';
        }
    } else {
        console.error('CRITICAL: booking-confirmation container not found!');
    }
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
    console.log('showPaymentStep() called - hiding booking summary, showing payment');
    
    // Initialize payment methods visibility (in case DOM wasn't ready earlier)
    initializePaymentMethods();
    
    // Mark step 3 (Booking Summary) as completed and step 4 (Payment) as active
    const step3 = document.getElementById('step3');
    const step4 = document.getElementById('step4');
    if (step3) {
        step3.classList.remove('active');
        step3.classList.add('completed');
    }
    if (step4) {
        step4.classList.add('active');
    }
    
    // Update current step to 5 (Payment step in code, but step4 in UI)
    currentStep = 5;
    
    // Hide ALL booking-content sections first
    document.querySelectorAll('.booking-content').forEach(content => {
        content.classList.remove('active');
        content.style.display = 'none';
        content.style.visibility = 'hidden';
    });
    
    // Explicitly hide booking confirmation (Booking Summary)
    const confirmationContent = document.getElementById('booking-confirmation');
    if (confirmationContent) {
        confirmationContent.classList.remove('active');
        confirmationContent.style.display = 'none';
        confirmationContent.style.visibility = 'hidden';
        confirmationContent.style.opacity = '0';
        console.log('Booking summary (booking-confirmation) is now hidden');
    }
    
    // Show payment step
    const paymentStep = document.getElementById('payment-step');
    if (paymentStep) {
        paymentStep.classList.add('active');
        paymentStep.style.display = 'block';
        paymentStep.style.visibility = 'visible';
        paymentStep.style.opacity = '1';
        console.log('Payment step is now visible');
    } else {
        console.error('CRITICAL: payment-step container not found!');
    }
    
    // Update payment booking summary
    updatePaymentBookingSummary();
    
    // Automatically select Yoco as the only payment method
    selectedPaymentMethodInBooking = 'yoco';
    
    // Enable pay button since Yoco is the only option
    const payButton = document.getElementById('pay-button');
    if (payButton) {
        payButton.disabled = false;
    }
    
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

// Yoco Configuration
// Set this to your actual Yoco public key, or leave as null/empty to disable Yoco payments
const YOCO_PUBLIC_KEY = 'pk_test_660c6ab0kwjeRzEb28d4'; // Replace with your Yoco public key, or set to null/empty to disable
// Enable Yoco if a valid key is provided (starts with 'pk_' for Yoco public keys)
const YOCO_ENABLED = YOCO_PUBLIC_KEY && YOCO_PUBLIC_KEY.trim() !== '' && YOCO_PUBLIC_KEY.startsWith('pk_');

/**
 * Handles payment method selection (Yoco, EFT, Mobile, PayFast)
 * Updates UI to show selected method and corresponding form
 * 
 * @param {string} method - Payment method: 'yoco', 'eft', 'mobile', or 'payfast'
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
    // Check if Yoco is enabled when trying to select it
    if (method === 'yoco' && !YOCO_ENABLED) {
        alert('Yoco payment gateway is not configured. Please configure your Yoco public key in booking-public.js, or use a different payment method.');
        return;
    }
    
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
    
    // Get route data from booking or fallback to routes object
    let routeName = '';
    let routePrice = 450; // Default fallback
    
    if (selectedBooking) {
        // Use booking data
        if (selectedBooking.direction_type === 'from_loc1') {
            routeName = `${selectedBooking.location_1} → ${selectedBooking.location_2}`;
        } else if (selectedBooking.direction_type === 'from_loc2') {
            routeName = `${selectedBooking.location_2} → ${selectedBooking.location_1}`;
        } else {
            routeName = `${selectedBooking.location_1} → ${selectedBooking.location_2}`;
        }
        routePrice = parseFloat(selectedBooking.base_fare) || 450;
    } else if (routes[selectedRoute]) {
        // Fallback to old routes object
        const route = routes[selectedRoute];
        routeName = route.name;
        routePrice = route.price || 450;
    }
    
    const bookingTypeFromStorage = sessionStorage.getItem('bookingType') || bookingType;
    const passengerCountFromStorage = parseInt(sessionStorage.getItem('passengerCount') || passengerCount) || passengerCount;
    const parcelCountFromStorage = parseInt(sessionStorage.getItem('parcelCount') || parcelCount) || parcelCount;
    
    // Calculate total amount based on booking type - ensure all prices are numbers
    const routePriceNum = parseFloat(routePrice) || 0;
    let totalAmount = 0;
    
    if (bookingTypeFromStorage === 'parcels') {
        // Get parcel data from storage
        const savedParcelData = JSON.parse(sessionStorage.getItem('parcelData') || JSON.stringify(parcelData)) || parcelData;
        
        // Get pricing from selected booking (from route card) - ensure they are numbers
        // These prices come from the booking that was clicked in the route selection step
        const smallPrice = selectedBooking?.small_parcel_price != null 
            ? parseFloat(selectedBooking.small_parcel_price) 
            : EXTRA_SPACE_PRICING.small;
        const mediumPrice = selectedBooking?.medium_parcel_price != null 
            ? parseFloat(selectedBooking.medium_parcel_price) 
            : EXTRA_SPACE_PRICING.medium;
        const largePrice = selectedBooking?.large_parcel_price != null 
            ? parseFloat(selectedBooking.large_parcel_price) 
            : EXTRA_SPACE_PRICING.large;
        
        console.log('Payment summary - Using parcel prices from selected booking:', {
            small: smallPrice,
            medium: mediumPrice,
            large: largePrice,
            seatPrice: routePriceNum
        });
        
        // Calculate parcel pricing: extra space parcels use size-based pricing, seat parcels use seat price
        for (let i = 1; i <= parcelCountFromStorage; i++) {
            if (savedParcelData[i] && savedParcelData[i].size) {
                if (savedParcelData[i].isSeatParcel) {
                    // Seat parcels cost the same as a passenger seat regardless of size
                    totalAmount += routePriceNum;
                } else {
                    // Extra space parcels use size-based pricing
                    if (savedParcelData[i].size === 'large') {
                        totalAmount += largePrice;
                    } else if (savedParcelData[i].size === 'medium') {
                        totalAmount += mediumPrice;
                    } else if (savedParcelData[i].size === 'small') {
                        totalAmount += smallPrice;
                    }
                }
            }
        }
        
        // Ensure totalAmount is a number
        totalAmount = parseFloat(totalAmount) || 0;
    } else {
        totalAmount = routePriceNum * passengerCountFromStorage;
    }
    
    // Update summary using the same structure as booking-payment.js
    const summaryRoute = document.getElementById('summary-route');
    const summaryPassengers = document.getElementById('summary-passengers');
    const summaryTotal = document.getElementById('summary-total');
    
    // Find parent container to update labels dynamically
    const summaryCard = summaryRoute?.closest('.booking-summary-card');
    
    if (summaryRoute) summaryRoute.textContent = routeName || '-';
    
    // Update passengers/parcels label and count
    if (summaryPassengers) {
        // Find the label element (the span before summaryPassengers)
        const passengersLabel = summaryPassengers.parentElement?.querySelector('span:first-child');
        if (passengersLabel) {
            if (bookingTypeFromStorage === 'parcels') {
                passengersLabel.textContent = 'Parcels:';
                summaryPassengers.textContent = parcelCountFromStorage || 0;
            } else {
                passengersLabel.textContent = 'Passengers:';
                summaryPassengers.textContent = passengerCountFromStorage;
            }
        } else {
            // Fallback if label not found
            if (bookingTypeFromStorage === 'parcels') {
                summaryPassengers.textContent = parcelCountFromStorage || 0;
            } else {
                summaryPassengers.textContent = passengerCountFromStorage;
            }
        }
    }
    
    
    // Update total amount - this is the most important for payment processing
    if (summaryTotal) {
        // Ensure totalAmount is properly formatted as a number
        const finalTotal = parseFloat(totalAmount) || 0;
        summaryTotal.textContent = `R${finalTotal.toFixed(2)}`;
        console.log('Payment summary - Total amount for ' + bookingTypeFromStorage + ':', finalTotal);
    }
    
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
 * - Yoco: No validation needed (handled by Yoco SDK)
 * - Mobile: Validates mobile number
 * - EFT: No validation needed (reference is auto-generated)
 * 
 * Process:
 * 1. For Yoco: Initializes Yoco checkout and opens payment modal
 * 2. For other methods: Validates form inputs
 * 3. Shows processing state on pay button
 * 4. Calls completePaymentInBooking() after payment success
 * 
 * Usage: Called when user clicks "Pay Now" button
 */
function processPaymentInBooking() {
    // Yoco is the only payment method, so always use it
    if (!selectedPaymentMethodInBooking) {
        selectedPaymentMethodInBooking = 'yoco';
    }
    
    // Handle Yoco payment (only payment method)
    if (selectedPaymentMethodInBooking === 'yoco') {
        processYocoPayment();
        return;
    }
    
    // Fallback (should not happen, but just in case)
    alert('Payment method not available. Please refresh the page and try again.');
}

/**
 * Processes payment using Yoco payment gateway
 * Initializes Yoco SDK and opens checkout modal
 * 
 * Process:
 * 1. Gets booking total amount from summary
 * 2. Waits for Yoco SDK to be fully loaded
 * 3. Initializes Yoco SDK with public key
 * 4. Creates checkout instance with booking details
 * 5. Opens Yoco payment modal
 * 6. Handles payment success/error callbacks
 * 
 * Usage: Called when user selects Yoco payment method and clicks "Pay Now"
 */
function processYocoPayment() {
    // Get total amount from summary
    const summaryTotal = document.getElementById('summary-total');
    if (!summaryTotal) {
        alert('Unable to retrieve payment amount. Please try again.');
        return;
    }
    
    // Extract amount from text (e.g., "R450.00" -> 45000 cents)
    const amountText = summaryTotal.textContent.replace(/[R\s,]/g, '');
    const amountInRands = parseFloat(amountText);
    const amountInCents = Math.round(amountInRands * 100);
    
    console.log('Yoco Payment - Amount extraction:', {
        summaryText: summaryTotal.textContent,
        amountText: amountText,
        amountInRands: amountInRands,
        amountInCents: amountInCents
    });
    
    if (!amountInCents || amountInCents <= 0 || isNaN(amountInCents)) {
        alert('Invalid payment amount: R' + amountInRands + '. Please check your booking and try again.');
        console.error('Invalid payment amount detected:', { amountInRands, amountInCents });
        return;
    }
    
    // Get route name for description
    const routeName = document.getElementById('summary-route')?.textContent || 'Booking Payment';
    const bookingTypeFromStorage = sessionStorage.getItem('bookingType') || bookingType;
    const passengerCountFromStorage = parseInt(sessionStorage.getItem('passengerCount') || passengerCount) || passengerCount;
    const parcelCountFromStorage = parseInt(sessionStorage.getItem('parcelCount') || parcelCount) || parcelCount;
    
    const description = bookingTypeFromStorage === 'parcels' 
        ? `${parcelCountFromStorage} Parcel(s) - ${routeName}`
        : `${passengerCountFromStorage} Passenger(s) - ${routeName}`;
    
    // Check if Yoco is enabled
    if (!YOCO_ENABLED) {
        alert('Yoco payment gateway is not configured. Please configure your Yoco public key in the code, or use a different payment method.');
        console.warn('Yoco payment attempted but Yoco is not enabled. Set YOCO_PUBLIC_KEY in booking-public.js');
        return;
    }
    
    // Initialize Yoco SDK with configured public key
    const yocoPublicKey = YOCO_PUBLIC_KEY;
    
    // Function to initialize and open Yoco checkout
    const initializeAndOpenCheckout = () => {
        // Check if Yoco SDK is loaded
        if (typeof window.YocoSDK === 'undefined') {
            console.error('Yoco SDK not loaded');
            console.log('Available window properties:', Object.keys(window).filter(k => k.toLowerCase().includes('yoco')));
            alert('Payment gateway is not available. Please refresh the page and try again.');
            return;
        }
        
        try {
            console.log('Initializing Yoco SDK with public key:', yocoPublicKey.substring(0, 10) + '...');
            
            // Initialize Yoco SDK
            const yoco = new window.YocoSDK({
                publicKey: yocoPublicKey
            });
            
            // Verify yoco object is created
            if (!yoco) {
                throw new Error('Failed to initialize Yoco SDK - yoco object is null/undefined');
            }
            
            console.log('Yoco SDK initialized. Available methods:', Object.keys(yoco));
            
            // Check if showPopup method exists (this is the correct Yoco SDK method)
            if (typeof yoco.showPopup !== 'function') {
                console.error('Yoco object methods:', Object.keys(yoco));
                console.error('Yoco object:', yoco);
                // Try checkout method as fallback
                if (typeof yoco.checkout === 'function') {
                    console.warn('showPopup not found, trying checkout method...');
                } else {
                    throw new Error('Yoco showPopup method not available. Available methods: ' + Object.keys(yoco).join(', '));
                }
            }
            
            console.log('Opening Yoco payment popup with amount:', amountInCents, 'cents');
            
            // Define callback function
            const paymentCallback = function (result) {
                console.log('Yoco callback received:', result);
                
                // Show processing state
                const payButton = document.getElementById('pay-button');
                if (payButton) {
                    payButton.disabled = true;
                    payButton.innerHTML = '<i class="ri-loader-4-line"></i> Processing Payment...';
                }
                
                if (result.error) {
                    // Handle payment error
                    console.error('Yoco payment error:', result.error);
                    alert('Payment failed: ' + (result.error.message || 'An error occurred. Please try again.'));
                    
                    // Re-enable pay button
                    if (payButton) {
                        payButton.disabled = false;
                        payButton.innerHTML = '<i class="ri-bank-card-line"></i> Pay Now';
                    }
                } else {
                    // Payment successful
                    console.log('Yoco payment successful:', result);
                    
                    // Store payment data for server-side verification
                    if (result.token) {
                        sessionStorage.setItem('yocoPaymentToken', result.token);
                    }
                    if (result.id) {
                        sessionStorage.setItem('yocoPaymentId', result.id);
                    }
                    // Store full response for gateway_response field
                    if (result) {
                        sessionStorage.setItem('yocoPaymentResponse', JSON.stringify(result));
                    }
                    
                    // Update payment method to include Yoco token
                    selectedPaymentMethodInBooking = 'yoco';
                    
                    // Complete the booking process
                    completePaymentInBooking();
                }
            };
            
            // Use showPopup method (correct Yoco SDK API)
            const popupConfig = {
                amountInCents: amountInCents,
                currency: 'ZAR',
                name: 'TekSiMap Booking',
                description: description,
                callback: paymentCallback
            };
            
            console.log('Yoco popup config:', popupConfig);
            
            // Call showPopup directly - this opens the payment modal
            yoco.showPopup(popupConfig);
            
        } catch (error) {
            console.error('Error initializing Yoco checkout:', error);
            console.error('Error details:', {
                message: error.message,
                stack: error.stack,
                yocoSDKAvailable: typeof window.YocoSDK !== 'undefined',
                yocoSDKType: typeof window.YocoSDK,
                yocoSDKConstructor: window.YocoSDK ? window.YocoSDK.toString().substring(0, 200) : 'N/A'
            });
            alert('Unable to initialize payment gateway: ' + (error.message || 'Unknown error') + '. Please try again or use a different payment method.');
        }
    };
    
    // Wait for Yoco SDK to be loaded if it's not already available
    if (typeof window.YocoSDK === 'undefined') {
        console.log('Yoco SDK not immediately available, waiting for it to load...');
        
        // Wait up to 5 seconds for SDK to load
        let attempts = 0;
        const maxAttempts = 50; // 50 attempts * 100ms = 5 seconds
        
        const checkSDK = setInterval(() => {
            attempts++;
            
            if (typeof window.YocoSDK !== 'undefined') {
                clearInterval(checkSDK);
                console.log('Yoco SDK loaded after', attempts * 100, 'ms');
                initializeAndOpenCheckout();
            } else if (attempts >= maxAttempts) {
                clearInterval(checkSDK);
                alert('Payment gateway is taking too long to load. Please refresh the page and try again.');
                console.error('Yoco SDK failed to load after 5 seconds');
                console.error('Window.YocoSDK:', window.YocoSDK);
                console.error('Available window properties with "yoco":', Object.keys(window).filter(k => k.toLowerCase().includes('yoco')));
            }
        }, 100);
    } else {
        // SDK is already loaded, proceed immediately
        console.log('Yoco SDK is available, proceeding immediately');
        initializeAndOpenCheckout();
    }
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
    
    // Get route data - check selectedBooking first, then fallback to routes object
    let routeName = '';
    let routePrice = 450; // Default fallback
    let routeTime = '10:00 am'; // Default fallback time
    
    if (selectedBooking) {
        // Use booking data from database
        if (selectedBooking.direction_type === 'from_loc1') {
            routeName = `${selectedBooking.location_1} → ${selectedBooking.location_2}`;
        } else if (selectedBooking.direction_type === 'from_loc2') {
            routeName = `${selectedBooking.location_2} → ${selectedBooking.location_1}`;
        } else {
            routeName = `${selectedBooking.location_1} → ${selectedBooking.location_2}`;
        }
        routePrice = parseFloat(selectedBooking.base_fare) || 450;
        // Extract time from scheduled_pickup if available
        if (selectedBooking.scheduled_pickup) {
            const date = new Date(selectedBooking.scheduled_pickup);
            routeTime = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
        }
    } else if (selectedRoute && routes && routes[selectedRoute]) {
        // Fallback to old routes object
        const route = routes[selectedRoute];
        routeName = route.name || 'Route not selected';
        routePrice = route.price || 450;
        // Extract time from departure string (format: '2025/11/14 Friday 10:00 am')
        if (route.departure) {
            const timeMatch = route.departure.match(/(\d{1,2}:\d{2}\s*(?:am|pm))/i);
            if (timeMatch) {
                routeTime = timeMatch[1];
            }
        }
    } else {
        console.warn('No route data available. Using defaults.');
        routeName = 'Route information unavailable';
        routePrice = 450;
    }
    
    const bookingTypeFromStorage = sessionStorage.getItem('bookingType') || bookingType;
    
    // Validate booking type - must be either 'passengers' OR 'parcels', never both
    if (bookingTypeFromStorage !== 'passengers' && bookingTypeFromStorage !== 'parcels') {
        console.error('Invalid booking type:', bookingTypeFromStorage);
        alert('Error: Invalid booking type. Please select either passenger or parcel booking.');
        return;
    }
    
    // Ensure mutual exclusivity - validate that we're only processing one type
    const hasPassengers = bookingTypeFromStorage === 'passengers' && passengerCount > 0;
    const hasParcels = bookingTypeFromStorage === 'parcels' && parcelCount > 0;
    
    if (hasPassengers && hasParcels) {
        console.error('Both passengers and parcels detected - this should not happen');
        alert('Error: Cannot book both passengers and parcels at the same time. Please select only one booking type.');
        return;
    }
    
    if (!hasPassengers && !hasParcels) {
        console.error('No passengers or parcels to book');
        alert('Error: Please select at least 1 passenger or 1 parcel to book.');
        return;
    }
    
    // Calculate total amount based on booking type - ensure all prices are numbers for consistency
    const routePriceNum = parseFloat(routePrice) || 0;
    let totalAmount = 0;
    
    if (bookingTypeFromStorage === 'parcels') {
        // Calculate parcel pricing: extra space parcels use size-based pricing, seat parcels use seat price
        // Get pricing from selected booking (from route card) - ensure they are numbers
        // These prices come from the booking that was clicked in the route selection step
        const smallPrice = selectedBooking?.small_parcel_price != null 
            ? parseFloat(selectedBooking.small_parcel_price) 
            : EXTRA_SPACE_PRICING.small;
        const mediumPrice = selectedBooking?.medium_parcel_price != null 
            ? parseFloat(selectedBooking.medium_parcel_price) 
            : EXTRA_SPACE_PRICING.medium;
        const largePrice = selectedBooking?.large_parcel_price != null 
            ? parseFloat(selectedBooking.large_parcel_price) 
            : EXTRA_SPACE_PRICING.large;
        
        console.log('Payment completion - Using parcel prices from selected booking:', {
            small: smallPrice,
            medium: mediumPrice,
            large: largePrice,
            seatPrice: routePriceNum,
            selectedBookingId: selectedBooking?.ID
        });
        
        for (let i = 1; i <= parcelCount; i++) {
            if (parcelData[i] && parcelData[i].size) {
                if (parcelData[i].isSeatParcel) {
                    // Seat parcels cost the same as a passenger seat regardless of size
                    totalAmount += routePriceNum;
                } else {
                    // Extra space parcels use size-based pricing
                    if (parcelData[i].size === 'large') {
                        totalAmount += largePrice;
                    } else if (parcelData[i].size === 'medium') {
                        totalAmount += mediumPrice;
                    } else if (parcelData[i].size === 'small') {
                        totalAmount += smallPrice;
                    }
                }
            }
        }
        
        // Ensure totalAmount is a number
        totalAmount = parseFloat(totalAmount) || 0;
    } else {
        totalAmount = routePriceNum * passengerCount;
    }
    
    // Get passenger data (only used for passenger bookings)
    const passengerData = bookingTypeFromStorage === 'passengers' 
        ? JSON.parse(sessionStorage.getItem('passengerData') || '[]')
        : [];
    
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
    
    // Only work with existing bookings - bookings are only created by admins
    // Passengers can only update existing bookings through payments
    if (!selectedBooking || !selectedBooking.ID) {
        console.error('No booking selected. A booking must be selected before payment.');
        alert('Error: No booking selected. Please select a booking from the route selection step.');
        return;
    }
    
    // Use existing booking - payment controller will handle updating it
    console.log('Updating existing booking:', selectedBooking.ID);
    const apiBooking = {
        id: selectedBooking.ID,
        booking_reference: selectedBooking.booking_reference || selectedBooking.booking_ref || 'TKS' + Date.now().toString().slice(-8),
        owner_id: selectedBooking.owner_id,
        vehicle_id: selectedBooking.vehicle_id,
        booking_status: selectedBooking.booking_status || 'pending'
    };
    
    // Prepare parcel data for payment controller (parcel bookings will be handled in payment controller)
    // Must not process parcels for passenger bookings to ensure mutual exclusivity
    let parcelDataForPayment = null;
    if (bookingTypeFromStorage === 'parcels') {
        // Validate that this is truly a parcel booking (no passengers)
        if (passengerCount > 0) {
            console.error('Parcel booking detected but passenger count > 0 - this should not happen');
            throw new Error('Cannot add parcels when passengers are selected. Please select only one booking type.');
        }
        
        const parcelDataFromStorage = JSON.parse(sessionStorage.getItem('parcelData') || '{}');
        
        // Prepare parcel data array with all parcel information
        const parcelsArray = [];
        for (let i = 1; i <= parcelCount; i++) {
            const parcel = parcelDataFromStorage[i];
            if (parcel && parcel.size) {
                parcelsArray.push({
                    size: parcel.size || 'small',
                    weight: parcel.weight || null,
                    images: parcel.images || [],
                    isSeatParcel: parcel.isSeatParcel || false
                });
            }
        }
        
        // Prepare route points for pickup/dropoff (same for all parcels in the booking)
        // Use the first pickup and dropoff points
        const pickupPoint = pickupPoints.length > 0 ? pickupPoints[0] : null;
        const dropoffPoint = dropoffPoints.length > 0 ? dropoffPoints[0] : null;
        
        // Format pickup point with coordinates (convert array [lng, lat] to object if needed)
        let formattedPickupPoint = null;
        if (pickupPoint) {
            formattedPickupPoint = {
                address: pickupPoint.address || null,
                lat: pickupPoint.lat || (pickupPoint.coordinates && Array.isArray(pickupPoint.coordinates) ? pickupPoint.coordinates[1] : null),
                lng: pickupPoint.lng || (pickupPoint.coordinates && Array.isArray(pickupPoint.coordinates) ? pickupPoint.coordinates[0] : null),
                coordinates: pickupPoint.coordinates || (pickupPoint.lat && pickupPoint.lng ? [pickupPoint.lng, pickupPoint.lat] : null)
            };
        }
        
        // Format dropoff point with coordinates
        let formattedDropoffPoint = null;
        if (dropoffPoint) {
            formattedDropoffPoint = {
                address: dropoffPoint.address || null,
                lat: dropoffPoint.lat || (dropoffPoint.coordinates && Array.isArray(dropoffPoint.coordinates) ? dropoffPoint.coordinates[1] : null),
                lng: dropoffPoint.lng || (dropoffPoint.coordinates && Array.isArray(dropoffPoint.coordinates) ? dropoffPoint.coordinates[0] : null),
                coordinates: dropoffPoint.coordinates || (dropoffPoint.lat && dropoffPoint.lng ? [dropoffPoint.lng, dropoffPoint.lat] : null)
            };
        }
        
        // Prepare parcel data object with sender/receiver info, parcels array, and pickup/dropoff points
        parcelDataForPayment = {
            sender_name: sharedSenderInfo.senderName || '',
            sender_phone: sharedSenderInfo.senderPhone || '',
            receiver_name: sharedReceiverInfo.receiverName || '',
            receiver_phone: sharedReceiverInfo.receiverPhone || '',
            parcels: parcelsArray,
            pickup_point: formattedPickupPoint,
            dropoff_point: formattedDropoffPoint,
            pickup_address: formattedPickupPoint?.address || null,
            dropoff_address: formattedDropoffPoint?.address || null
        };
    } else if (bookingTypeFromStorage === 'passengers') {
        // Ensure no parcels are processed for passenger bookings
        if (parcelCount > 0) {
            console.error('Passenger booking detected but parcel count > 0 - this should not happen');
            throw new Error('Cannot process passenger booking when parcels are selected. Please select only one booking type.');
        }
    }
    
    // Create payment - payment controller will update the booking
    try {
        // Map payment method for API
        let paymentMethod = selectedPaymentMethodInBooking || 'EFT';
        if (paymentMethod === 'yoco') {
            paymentMethod = 'card'; // Yoco processes card payments
        }
        
        // Get Yoco payment data if available
        const yocoPaymentToken = sessionStorage.getItem('yocoPaymentToken');
        const yocoPaymentId = sessionStorage.getItem('yocoPaymentId');
        const yocoPaymentResponse = sessionStorage.getItem('yocoPaymentResponse');
        
        // Prepare gateway response for Yoco payments
        let gatewayResponse = null;
        if (paymentMethod === 'card' && yocoPaymentToken) {
            gatewayResponse = {
                token: yocoPaymentToken,
                id: yocoPaymentId,
                gateway: 'yoco',
                timestamp: new Date().toISOString()
            };
            // Include full response if available
            if (yocoPaymentResponse) {
                try {
                    const fullResponse = JSON.parse(yocoPaymentResponse);
                    gatewayResponse = { ...gatewayResponse, ...fullResponse };
                } catch (e) {
                    console.warn('Could not parse Yoco payment response:', e);
                }
            }
        }
        
        // Prepare passenger data ONLY if this is a passenger booking
        // Must be null for parcel bookings to ensure mutual exclusivity
        let passengerDataForPayment = null;
        if (bookingTypeFromStorage === 'passengers') {
            // Only process passenger data if booking type is passengers
            if (parcelCount > 0) {
                console.error('Passenger booking detected but parcels also present - this should not happen');
                throw new Error('Cannot process passenger booking when parcels are selected. Please select only one booking type.');
            }
            
            if (passengerData && passengerData.length > 0) {
                // Get the primary passenger (first one)
                const primaryPassenger = passengerData[0];
                passengerDataForPayment = {
                    first_name: primaryPassenger.firstName,
                    last_name: primaryPassenger.lastName,
                    email: primaryPassenger.email || null,
                    phone: primaryPassenger.phone || null,
                    id_number: primaryPassenger.idNumber || null,
                    pickup_point: pickupPoints[0] || null,
                    dropoff_point: dropoffPoints[0] || null,
                    next_of_kin_first_name: primaryPassenger.nextOfKin?.firstName || '',
                    next_of_kin_last_name: primaryPassenger.nextOfKin?.lastName || '',
                    next_of_kin_phone: primaryPassenger.nextOfKin?.phone || '',
                    is_primary: true
                };
            } else {
                throw new Error('No passenger data found for passenger booking.');
            }
        } else if (bookingTypeFromStorage === 'parcels') {
            // Ensure passenger data is null for parcel bookings
            if (passengerCount > 0 || (passengerData && passengerData.length > 0)) {
                console.error('Parcel booking detected but passengers also present - this should not happen');
                throw new Error('Cannot process parcel booking when passengers are selected. Please select only one booking type.');
            }
            // passengerDataForPayment remains null for parcel bookings
        }
        
        // Create payment - payment controller will update the existing booking
        // passenger_data will be null for parcel bookings, parcel_data will be null for passenger bookings
        const paymentResponse = await paymentApi.createPayment({
            booking_id: apiBooking.id,
            amount: totalAmount,
            payment_method: paymentMethod,
            // Include Yoco payment details if available
            transaction_id: yocoPaymentId || null,
            payment_gateway: 'yoco', // Always 'yoco' since it's the only payment gateway
            gateway_response: gatewayResponse,
            passenger_data: passengerDataForPayment, // null for parcel bookings, contains data for passenger bookings only
            parcel_data: parcelDataForPayment // null for passenger bookings, contains data for parcel bookings only
        });
        
        // Store sender_code and receiver_code from payment response for parcel bookings
        // Payment API response structure: { success, message, payment, parcel: { sender_code, receiver_code, ... } }
        if (bookingTypeFromStorage === 'parcels' && paymentResponse) {
            // Handle both direct response and axios-wrapped response
            const parcelData = paymentResponse.data?.parcel || paymentResponse.parcel;
            if (parcelData && (parcelData.sender_code || parcelData.receiver_code)) {
                const parcelCodes = {
                    sender_code: parcelData.sender_code || null,
                    receiver_code: parcelData.receiver_code || null
                };
                sessionStorage.setItem('parcelCodes', JSON.stringify(parcelCodes));
                console.log('Stored parcel verification codes:', parcelCodes);
            }
        }
        
        // Clear Yoco payment data from session storage
        if (yocoPaymentToken) {
            sessionStorage.removeItem('yocoPaymentToken');
        }
        if (yocoPaymentId) {
            sessionStorage.removeItem('yocoPaymentId');
        }
        if (yocoPaymentResponse) {
            sessionStorage.removeItem('yocoPaymentResponse');
        }
    } catch (error) {
        console.error('Error creating payment for existing booking:', error);
        if (error.response) {
            console.error('Payment API Error Details:', {
                status: error.response.status,
                statusText: error.response.statusText,
                data: error.response.data,
                url: error.config?.url
            });
        } else if (error.request) {
            console.error('Payment API Request Error - No response received:', error.request);
        } else {
            console.error('Payment API Error:', error.message);
        }
        throw error; // Re-throw to prevent continuing with localStorage fallback
    }
    
    // Save parcel data if parcels were booked
    let savedParcelData = null;
    if (bookingTypeFromStorage === 'parcels') {
        const parcelDataFromStorage = JSON.parse(sessionStorage.getItem('parcelData') || '{}');
        savedParcelData = {};
        Object.keys(parcelDataFromStorage).forEach(key => {
            const parcel = parcelDataFromStorage[key];
            savedParcelData[key] = {
                size: parcel.size || 'small',
                images: parcel.images || []
                // Note: No individual secretCode - verification codes are per booking (sender_code and receiver_code), not per parcel
            };
        });
        
        // Save shared sender/receiver info to sessionStorage
        sessionStorage.setItem('sharedSenderInfo', JSON.stringify(sharedSenderInfo));
        sessionStorage.setItem('sharedReceiverInfo', JSON.stringify(sharedReceiverInfo));
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
        routeName: routeName, // Use the routeName variable we created above
        bookingType: bookingTypeFromStorage,
        passengers: bookingTypeFromStorage === 'parcels' ? 0 : passengerCount,
        parcels: bookingTypeFromStorage === 'parcels' ? (parcelCount || 0) : 0,
        parcelData: savedParcelData,
        seatSecretCode: seatSecretCode,
        pricePerPerson: routePrice, // Use the routePrice variable we created above
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
            routeName: routeName, // Use the routeName variable we created above
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
            tripTime: desiredTripDate || routeTime
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
// Note: Active trip banner is now shown within each upcoming booking item, not as a standalone banner
function checkActiveTrip() {
    // The active trip information is now displayed within each upcoming booking item
    // This function is kept for compatibility but no longer displays a standalone banner
    const activeTrip = localStorage.getItem('activeTripData');
    
    if (activeTrip) {
        try {
            const tripData = JSON.parse(activeTrip);
            
            // If trip is full, remove from localStorage
            if (tripData.passengers >= 15) {
                localStorage.removeItem('activeTripData');
            }
            // Active trip info will be shown in the booking item itself via createBookingItemHTML
        } catch (error) {
            console.error('Error parsing active trip data:', error);
            localStorage.removeItem('activeTripData');
        }
    }
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
 * Loads and displays user's bookings from the database
 * Fetches bookings where user is a passenger (via booking_passengers table)
 * Separates bookings into upcoming and history categories
 * 
 * Process:
 * 1. Fetches bookings from API where user is a passenger or booking owner
 * 2. Filters for status 'paid' or 'pending' for upcoming
 * 3. Separates into upcoming (future trips with paid/pending status) and history
 * 4. Updates count displays
 * 5. Displays bookings in appropriate tabs
 * 6. Shows bookings section if bookings exist
 * 
 * Categories:
 * - Upcoming: Bookings with status 'paid' or 'pending' with trip date in the future
 * - History: Completed trips or trips with date in the past
 * 
 * Usage: Called on page load to display user's existing bookings
 */
async function loadUserBookings() {
    try {
        // Fetch bookings from API
        const response = await bookingApi.getMyBookings();
        
        if (!response.success || !response.bookings || response.bookings.length === 0) {
            // Don't show the section if no bookings
            return;
        }

        const now = new Date();
        const bookings = response.bookings;
        
        // Map database fields to frontend format
        const mappedBookings = bookings.map(booking => {
            // Determine route name
            let routeName = booking.route_name;
            if (!routeName && booking.location_1 && booking.location_2) {
                if (booking.direction_type === 'from_loc2') {
                    routeName = `${booking.location_2} → ${booking.location_1}`;
                } else {
                    routeName = `${booking.location_1} → ${booking.location_2}`;
                }
            }
            
            // Parse route_points if it exists
            let pickupPoints = [];
            let dropoffPoints = [];
            if (booking.route_points) {
                try {
                    const routePoints = typeof booking.route_points === 'string' 
                        ? JSON.parse(booking.route_points) 
                        : booking.route_points;
                    
                    if (Array.isArray(routePoints)) {
                        routePoints.forEach(point => {
                            if (point.point_type === 'pickup') {
                                pickupPoints.push({
                                    address: point.address || point.point_name,
                                    lat: point.coordinates?.lat || null,
                                    lng: point.coordinates?.lng || null
                                });
                            } else if (point.point_type === 'dropoff') {
                                dropoffPoints.push({
                                    address: point.address || point.point_name,
                                    lat: point.coordinates?.lat || null,
                                    lng: point.coordinates?.lng || null
                                });
                            }
                        });
                    }
                } catch (e) {
                    console.error('Error parsing route_points:', e);
                }
            }
            
            // Add pickup/dropoff points if available (works for both passenger and parcel bookings)
            if (booking.pickup_point && !pickupPoints.length) {
                pickupPoints.push({
                    address: booking.pickup_address || 'Pickup location',
                    lat: booking.pickup_point.lat,
                    lng: booking.pickup_point.lng
                });
            }
            if (booking.dropoff_point && !dropoffPoints.length) {
                dropoffPoints.push({
                    address: booking.dropoff_address || 'Dropoff location',
                    lat: booking.dropoff_point.lat,
                    lng: booking.dropoff_point.lng
                });
            }
            
            // Determine booking type (passenger or parcel)
            const bookingType = booking.booking_type || (booking.passenger_count > 0 ? 'passenger' : 'parcel');
            
            // Calculate price per unit (person for passengers, parcel for parcels)
            let pricePerUnit = 0;
            if (bookingType === 'passenger') {
                pricePerUnit = booking.base_fare ? parseFloat(booking.base_fare) : (booking.total_amount_needed ? parseFloat(booking.total_amount_needed) / Math.max(booking.passenger_count || 1, 1) : 0);
            } else {
                // For parcels, calculate average price per parcel
                const parcelCount = booking.parcel_count || 0;
                if (parcelCount > 0) {
                    pricePerUnit = parseFloat(booking.total_amount_paid || booking.total_amount_needed || 0) / parcelCount;
                }
            }
            
            // Create unique ID by combining booking ID with booking type and record ID
            // This ensures passenger and parcel bookings from the same booking have different IDs
            let uniqueId;
            if (bookingType === 'passenger') {
                // Use passenger_record_id if available, otherwise combine booking ID with type
                uniqueId = booking.passenger_record_id 
                    ? `passenger-${booking.ID}-${booking.passenger_record_id}` 
                    : `passenger-${booking.ID}`;
            } else {
                // Use parcel_record_id if available, otherwise combine booking ID with type
                uniqueId = booking.parcel_record_id 
                    ? `parcel-${booking.ID}-${booking.parcel_record_id}` 
                    : `parcel-${booking.ID}`;
            }
            
            return {
                id: uniqueId,
                bookingId: booking.ID, // Keep original booking ID for reference
                reference: booking.booking_reference,
                routeName: routeName || 'Unknown Route',
                status: booking.booking_status, // 'pending', 'confirmed', 'paid', 'cancelled', 'completed', 'refunded'
                bookingType: bookingType, // 'passenger' or 'parcel'
                passengers: booking.passenger_count || 0,
                parcels: booking.parcel_count || 0,
                // Use payment_amount from payments table if available, otherwise fallback to booking total_amount_paid
                totalAmount: parseFloat(booking.payment_amount !== undefined ? booking.payment_amount : (booking.total_amount_paid || booking.total_amount_needed || 0)),
                pricePerPerson: pricePerUnit,
                tripDate: booking.scheduled_pickup,
                bookingDate: booking.created_at,
                pickupPoints: pickupPoints,
                dropoffPoints: dropoffPoints,
                // Record IDs for differentiating between passenger and parcel bookings from the same booking
                passengerRecordId: booking.passenger_record_id || null,
                parcelRecordId: booking.parcel_record_id || null,
                // Parcel-specific fields
                sender_name: booking.sender_name || null,
                sender_phone: booking.sender_phone || null,
                receiver_name: booking.receiver_name || null,
                receiver_phone: booking.receiver_phone || null,
                sender_code: booking.sender_code || null,
                receiver_code: booking.receiver_code || null,
                parcel_status: booking.parcel_status || null
            };
        });

        // Filter for upcoming: status 'paid' or 'pending'
        // Show all paid/pending bookings as upcoming regardless of date
        const upcoming = mappedBookings.filter(b => 
            b.status === 'paid' || b.status === 'pending'
        );
        
        // History: completed, cancelled, refunded, or confirmed (if not in upcoming)
        const history = mappedBookings.filter(b => 
            (b.status === 'completed' || 
             b.status === 'cancelled' || 
             b.status === 'refunded' ||
             b.status === 'confirmed') &&
            !(b.status === 'paid' || b.status === 'pending')
        );

        // Update counts
        document.getElementById('upcoming-count').textContent = upcoming.length;
        document.getElementById('history-count').textContent = history.length;

        // Display bookings
        displayBookingsInTab('upcoming-bookings', upcoming, 'upcoming');
        displayBookingsInTab('history-bookings', history, 'history');

        // Show the bookings section
        document.getElementById('your-bookings-section').style.display = 'block';
    } catch (error) {
        console.error('Error loading user bookings:', error);
        // Silently fail - don't show bookings section if there's an error
    }
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
    
    // Determine booking type (passenger or parcel)
    const bookingType = booking.bookingType || (booking.passengers > 0 ? 'passenger' : 'parcel');
    const isParcelBooking = bookingType === 'parcel';
    
    const tripDate = new Date(booking.tripDate);
    const bookingDate = new Date(booking.bookingDate);
    
    // Check if trip date is valid
    const tripDateDisplay = isNaN(tripDate.getTime()) ? 'Date not set' : 
        `${tripDate.toLocaleDateString()} ${tripDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`;

    // Check if this is an active trip (for upcoming bookings only)
    // Show active trip banner for ALL upcoming items (paid or pending status)
    const isActiveTrip = type === 'upcoming' && (booking.status === 'paid' || booking.status === 'pending');
    const seatsAvailable = isActiveTrip && !isParcelBooking ? Math.max(0, (15 - (booking.passengers || 0))) : 0;

    // Icon and title based on booking type
    const bookingIcon = isParcelBooking ? 'ri-box-3-line' : 'ri-taxi-line';
    const bookingTypeLabel = isParcelBooking ? 'Parcel Booking' : 'Taxi Booking';

    return `
        <div class="booking-item ${statusClass} ${isParcelBooking ? 'parcel-booking' : 'passenger-booking'}">
            ${isActiveTrip ? `
            <div class="active-trip-banner" style="margin-bottom: 1rem;">
                <div class="active-trip-content">
                    <div class="active-trip-icon">
                        <i class="ri-time-line"></i>
                    </div>
                    <div class="active-trip-info">
                        <h3><i class="ri-information-line"></i> You Have an Active ${isParcelBooking ? 'Parcel' : 'Trip'}</h3>
                        <p>Your ${isParcelBooking ? 'parcel booking' : 'trip'} from <strong>${booking.routeName || 'N/A'}</strong> ${booking.status === 'pending' ? 'is pending confirmation.' : 'is active.'}</p>
                        <div class="active-trip-stats">
                            ${isParcelBooking ? 
                                `<span><i class="ri-box-3-line"></i> <strong>${booking.parcels || 0}</strong> parcel${(booking.parcels || 0) !== 1 ? 's' : ''}</span>` :
                                `<span><i class="ri-user-line"></i> <strong>${booking.passengers || 0}</strong> passenger${(booking.passengers || 0) !== 1 ? 's' : ''}</span>`
                            }
                            ${seatsAvailable > 0 ? `<span><i class="ri-user-add-line"></i> <strong>${seatsAvailable}</strong> seats available</span>` : ''}
                        </div>
                    </div>
                    <div class="active-trip-actions">
                        <button class="btn-view-trip" onclick="window.location.href='trip-status.html?bookingId=${booking.bookingId}${booking.passengerRecordId ? `&passengerRecordId=${booking.passengerRecordId}` : ''}${booking.parcelRecordId ? `&parcelRecordId=${booking.parcelRecordId}` : ''}&bookingType=${bookingType}'">
                            <i class="ri-eye-line"></i> View ${isParcelBooking ? 'Parcel' : 'Trip'} Status
                        </button>
                    </div>
                </div>
            </div>
            ` : ''}
            <div class="booking-item-header" data-booking-id="${String(booking.id)}" onclick="window.toggleBookingDetailsView && window.toggleBookingDetailsView('${String(booking.id)}'); return false;">
                <div class="booking-item-title">
                    <h3><i class="${bookingIcon}"></i> ${booking.routeName || bookingTypeLabel} ${isParcelBooking ? '<span style="background: #7b1fa2; color: white; padding: 0.2rem 0.5rem; border-radius: 4px; font-size: 0.8rem; margin-left: 0.5rem;">PARCEL</span>' : ''}</h3>
                    <div class="booking-reference">Ref: ${booking.reference}</div>
                </div>
                <div class="booking-expand-icon" id="expand-icon-${String(booking.id)}">
                    <i class="ri-arrow-down-s-line"></i>
                </div>
            </div>
            
            <div class="booking-item-quick-info">
                <div class="quick-info-item">
                    <i class="ri-calendar-line"></i>
                    <span>${tripDate.toLocaleDateString()}</span>
                </div>
                <div class="quick-info-item">
                    <i class="${isParcelBooking ? 'ri-box-3-line' : 'ri-group-line'}"></i>
                    <strong>${isParcelBooking ? (booking.parcels || 0) : booking.passengers}</strong> ${isParcelBooking ? ((booking.parcels || 0) === 1 ? 'parcel' : 'parcels') : (booking.passengers === 1 ? 'person' : 'people')}
                </div>
                <div class="quick-info-item">
                    <i class="ri-money-dollar-circle-line"></i>
                    <strong>R${parseFloat(booking.totalAmount).toFixed(2)}</strong>
                </div>
            </div>
            
            <div class="booking-item-details" id="booking-details-${String(booking.id)}">
                <div class="booking-details-grid">
                    <div class="booking-detail">
                        <div class="booking-detail-label">Trip Date & Time</div>
                        <div class="booking-detail-value">
                            <i class="ri-calendar-event-line"></i>
                            ${tripDateDisplay}
                        </div>
                    </div>
                    ${isParcelBooking ? `
                    <div class="booking-detail">
                        <div class="booking-detail-label">Number of Parcels</div>
                        <div class="booking-detail-value">
                            <i class="ri-box-3-line"></i>
                            ${booking.parcels || 0} ${(booking.parcels || 0) === 1 ? 'parcel' : 'parcels'}
                        </div>
                    </div>
                    ` : `
                    <div class="booking-detail">
                        <div class="booking-detail-label">Number of Passengers</div>
                        <div class="booking-detail-value">
                            <i class="ri-group-line"></i>
                            ${booking.passengers} ${booking.passengers === 1 ? 'person' : 'people'}
                        </div>
                    </div>
                    `}
                    <div class="booking-detail">
                        <div class="booking-detail-label">Total Amount</div>
                        <div class="booking-detail-value">
                            <i class="ri-money-dollar-circle-line"></i>
                            R${parseFloat(booking.totalAmount).toFixed(2)}
                        </div>
                    </div>
                    <div class="booking-detail">
                        <div class="booking-detail-label">Booking Date</div>
                        <div class="booking-detail-value">
                            <i class="ri-time-line"></i>
                            ${bookingDate.toLocaleDateString()}
                        </div>
                    </div>
                    ${isParcelBooking && booking.sender_code ? `
                    <div class="booking-detail">
                        <div class="booking-detail-label">Sender Code</div>
                        <div class="booking-detail-value">
                            <i class="ri-qr-code-line"></i>
                            <strong style="font-size: 1.1rem; letter-spacing: 2px;">${booking.sender_code}</strong>
                        </div>
                    </div>
                    ` : ''}
                    ${isParcelBooking && booking.receiver_code ? `
                    <div class="booking-detail">
                        <div class="booking-detail-label">Receiver Code</div>
                        <div class="booking-detail-value">
                            <i class="ri-qr-code-line"></i>
                            <strong style="font-size: 1.1rem; letter-spacing: 2px;">${booking.receiver_code}</strong>
                        </div>
                    </div>
                    ` : ''}
                    ${isParcelBooking && booking.sender_name ? `
                    <div class="booking-detail">
                        <div class="booking-detail-label">Sender</div>
                        <div class="booking-detail-value">
                            <i class="ri-user-line"></i>
                            ${booking.sender_name}${booking.sender_phone ? ` (${booking.sender_phone})` : ''}
                        </div>
                    </div>
                    ` : ''}
                    ${isParcelBooking && booking.receiver_name ? `
                    <div class="booking-detail">
                        <div class="booking-detail-label">Receiver</div>
                        <div class="booking-detail-value">
                            <i class="ri-user-line"></i>
                            ${booking.receiver_name}${booking.receiver_phone ? ` (${booking.receiver_phone})` : ''}
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
    
    // Don't show action buttons for upcoming items
    if (type !== 'upcoming') {
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
    // Convert bookingId to string to ensure consistent ID matching
    const id = String(bookingId);
    const details = document.getElementById(`booking-details-${id}`);
    const expandIcon = document.getElementById(`expand-icon-${id}`);
    
    if (details) {
        const isExpanded = details.classList.toggle('show');
        
        // Rotate the expand icon to indicate expanded/collapsed state
        if (expandIcon) {
            const iconElement = expandIcon.querySelector('i');
            if (iconElement) {
                if (isExpanded) {
                    iconElement.style.transform = 'rotate(180deg)';
                } else {
                    iconElement.style.transform = 'rotate(0deg)';
                }
            }
        }
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

// Make new functions globally accessible - MUST be in global scope for onclick handlers
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
/**
 * Initializes payment method visibility based on configuration
 * Hides Yoco option if not configured
 */
function initializePaymentMethods() {
    // Hide Yoco payment option if not enabled
    const yocoCard = document.querySelector('.payment-method-card[onclick*="yoco"]');
    if (yocoCard) {
        if (!YOCO_ENABLED) {
            yocoCard.style.display = 'none';
            console.log('Yoco payment option hidden - not configured');
        } else {
            yocoCard.style.display = 'flex';
            console.log('Yoco payment option enabled');
        }
    }
}

document.addEventListener('DOMContentLoaded', function() {
    // Initialize payment methods visibility
    initializePaymentMethods();
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

