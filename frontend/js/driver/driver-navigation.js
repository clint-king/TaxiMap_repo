// Driver Navigation JavaScript
import * as trackingAPi from "../api/trackingAPi.js";
import { Simulation } from "./simaulation.js";
import * as socketService from "../api/socketService.js";
let map;
let directionsService;
let directionsRenderer;
let currentTrip = null;
let trafficLayer = null;
let isSatelliteView = false;
let isTripStarted = false;
//create a driver marker
let driverMarker = null;

//create full path
let fullPath = null;

//create simulation instance
let simulation = null;

// Navigation directions
let allNavigationSteps = []; // All steps from the route
let currentStepIndex = 0; // Current step the driver is on
let routeLegs = []; // Store route legs for step tracking

const geocoder = new google.maps.Geocoder();

function getSourceInSouthAfrica(text) {
  return new Promise((resolve, reject) => {
    geocoder.geocode(
      {
        address: text,
        componentRestrictions: {
          country: "ZA", // South Africa
        },
      },
      (results, status) => {
        if (status !== "OK" || !results.length) {
          reject("No results in South Africa");
          return;
        }

        const topResult = results[0]; // first, best match IN SA

        resolve({
          name: topResult.formatted_address,
          lat: topResult.geometry.location.lat(),
          lng: topResult.geometry.location.lng(),
          placeId: topResult.place_id,
        });
      }
    );
  });
}

document.addEventListener("DOMContentLoaded", function () {
  // Check driver authentication
  checkDriverAuthentication();

  // Initialize map
  initMap();

  // Draw route for current trip if exists
  const params = new URLSearchParams(window.location.search);
  const bookingId = Number(params.get("bookingId"));
  if (bookingId) {
    (async () => {
      try {
        await drawRoute(
          bookingId,
          null,
          null
        );
      } catch (error) {
        console.error("Error drawing route for booking:", error);
      }
    })();
  }

  // Load current trip
  loadCurrentTrip();

  // Set up real-time location tracking
  setupLocationTracking();
  
  // Set up WebSocket listener for geofence updates
  if (bookingId) {
    setupGeofenceListener(bookingId);
  }
  
  // Set up static Verify Passenger button click handler (from HTML)
  const verifyPassengerBtnStatic = document.getElementById("verifyPassengerBtnStatic");
  if (verifyPassengerBtnStatic) {
    verifyPassengerBtnStatic.onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      // Get bookingId from URL parameters
      const params = new URLSearchParams(window.location.search);
      const bookingId = Number(params.get("bookingId"));
      if (bookingId) {
        sendBookingIdForVerification(bookingId);
      } else {
        console.warn("No booking ID available for verification.");
        alert("No booking ID available for verification.");
      }
    };
  }
});

function checkDriverAuthentication() {
  const userProfile = localStorage.getItem("userProfile");

  if (!userProfile) {
    window.location.href = "/pages/authentication/login.html";
    return;
  }

  const user = JSON.parse(userProfile);

  // Check if user is a driver - allow access for now (can be restricted later)
  // For now, let any logged-in user access the driver portal
  // In production, you would check: user.userType === 'driver' || user.user_type === 'driver'

  // Show driver navigation
  const driverNav = document.getElementById("driverNav");
  const logoutBtn = document.getElementById("logoutBtn");

  if (driverNav) driverNav.style.display = "flex";
  if (logoutBtn) logoutBtn.style.display = "block";
}

// Helper function to safely execute map operations
function safeMapOperation(operation, errorMessage = "Map operation failed") {
  if (!map) {
    console.warn("Map not initialized:", errorMessage);
    return false;
  }
  
  try {
    if (typeof operation === 'function') {
      operation();
      return true;
    }
  } catch (error) {
    // Suppress Google Maps internal errors (like 'IJ' property errors)
    if (error && error.message && error.message.includes('IJ')) {
      console.warn("Google Maps internal error suppressed:", errorMessage);
      return false;
    }
    console.error(errorMessage, error);
    return false;
  }
  return false;
}

function initMap() {
  // Prevent reinitialization if map already exists
  if (map) {
    console.warn("Map already initialized. Skipping reinitialization.");
    return;
  }

  // Check if map container exists
  const mapElement = document.getElementById("map");
  if (!mapElement) {
    console.error("Map container element not found");
    return;
  }

  try {
    // Initialize Google Maps
    directionsService = new google.maps.DirectionsService();
    directionsRenderer = new google.maps.DirectionsRenderer({
      draggable: true,
      suppressMarkers: false,
    });

    // Create map centered on Johannesburg
    map = new google.maps.Map(mapElement, {
      zoom: 12,
      center: { lat: -26.2041, lng: 28.0473 }, // Johannesburg
      mapTypeId: google.maps.MapTypeId.ROADMAP,
      // Add options to prevent map resets and improve stability
      disableDefaultUI: false,
      zoomControl: true,
      mapTypeControl: true,
      scaleControl: true,
      streetViewControl: true,
      rotateControl: false,
      fullscreenControl: true,
      // Prevent map from resetting on zoom/pan
      gestureHandling: 'cooperative',
      // Disable automatic UI updates that might cause resets
      disableDoubleClickZoom: false,
    });

    // Auto-centering removed - no user interaction tracking needed

    // Wait for map to be ready before setting directions renderer
    google.maps.event.addListenerOnce(map, 'idle', () => {
      try {
        if (directionsRenderer && map) {
          directionsRenderer.setMap(map);
        }
      } catch (error) {
        console.error("Error setting directions renderer:", error);
      }
    });

    // Initialize traffic layer
    if (!trafficLayer) {
      trafficLayer = new google.maps.TrafficLayer();
    }

    // Add error handler for map to catch and suppress internal Google Maps errors
    google.maps.event.addListener(map, 'error', (error) => {
      // Suppress common Google Maps internal errors
      if (error && (error.message?.includes('IJ') || error.message?.includes('undefined'))) {
        console.warn("Google Maps internal error suppressed (common issue)");
        return;
      }
      console.error("Google Maps error:", error);
    });

    console.log("Map initialized successfully");
  } catch (error) {
    // Suppress Google Maps internal initialization errors
    if (error && error.message && error.message.includes('IJ')) {
      console.warn("Google Maps internal initialization error suppressed");
      return;
    }
    console.error("Error initializing map:", error);
  }
}

// They display the ui TO SHOW LIST OF PICKUP and dropoffs information
async function loadCurrentTrip() {
  // Get trip ID or bookingId from URL parameters
  const urlParams = new URLSearchParams(window.location.search);
  const bookingId = Number(urlParams.get("bookingId"));
  if(bookingId == null || bookingId == undefined || bookingId == "" || typeof bookingId !== "number"){
    console.error("Error loading current trip: bookingId is required and must be a number");
    return;
  }

  let bookingDetails = null;
  let pickupDropoffInfo = null;
  let currentTrip = null;

  try{
    let response_bookingDetails = await trackingAPi.getBookingDetails(bookingId);
    let response_pickupDropoffInfo = await trackingAPi.getPickupDropoffInfo(bookingId);
    console.log("Response Booking Details: ", response_bookingDetails);
    console.log("Response Pickup Dropoff Info: ", response_pickupDropoffInfo);


    if(response_bookingDetails.success == false || response_bookingDetails == null){
      console.error("Error loading current trip: booking details not found");
      return;
    }
    bookingDetails = response_bookingDetails.bookingDetails;
  
    if(response_pickupDropoffInfo.success == false || response_pickupDropoffInfo == null){
      console.error("Error loading current trip: pickup dropoff info not found");
      return;
    }
    pickupDropoffInfo = response_pickupDropoffInfo.pickupDropoffInfo;

    
  } catch (error) {
    console.error("Error loading current trip:", error);
  }
  if(bookingDetails == null || pickupDropoffInfo == null){
    console.error("Error loading current trip: booking details or pickup dropoff info not found");
    return;
  }

  currentTrip = {
    id: bookingId.toString(),
    bookingId: bookingId.toString(),
    status: bookingDetails.booking_status,
    vehicleType: `${bookingDetails.vehicle_make}, ${bookingDetails.vehicle_model}`,
    totalDistance: bookingDetails.distance_km,
    estimatedDuration: bookingDetails.typical_duration_hours,
    stops: [
      ...pickupDropoffInfo.pickup_info.map(pickup => {
        return pickup.type === "passenger" ? {
          type: "pickup",
          category: "human",
          location: pickup.pickup_address,
          passengerName: pickup.name,
          phoneNumber: pickup.phone,
          email: pickup.email,
        } :
        {
          type: "pickup",
          category: "package",
          location: pickup.pickup_address,
          packageId: pickup.id,
          senderName: pickup.name,
          senderPhone: pickup.phone,
          senderEmail: pickup.email,
        }
      }),
      ...pickupDropoffInfo.dropoff_info.map(dropoff => {
        return dropoff.type === "passenger" ? {
          type: "dropoff",
          category: "human",
          location: dropoff.dropoff_address,
          passengerName: dropoff.name,
          phoneNumber: dropoff.phone,
          email: dropoff.email,
        } :
        {
          type: "dropoff",
          category: "package",
          location: dropoff.dropoff_address,
          packageId: dropoff.id,
          receiverName: dropoff.name,
          receiverPhone: dropoff.phone,
          receiverEmail: dropoff.email,
        }
      })
    ],
  }

  if (currentTrip) {
    displayTrip(currentTrip);
    calculateRoute();
  } else {

    //show there is no list of pickup and dropoff information for this booking
    const navigationInfo = document.getElementById("navigationInfo");
    if (navigationInfo) {
      navigationInfo.innerHTML = `
        <div class="no-trip-message">
          <i class="fas fa-exclamation-triangle" style="font-size: 2rem; margin-bottom: 1rem;"></i>
          <h3>No Active Trip</h3>
          <p>There is no list of pickup and dropoff information for this booking.</p>
        </div>
      `;
    }
    return;
  }

}


function displayTrip(trip) {
  const navigationInfo = document.getElementById("navigationInfo");
  if (!navigationInfo) return;

  // Calculate capacity usage
  const humanPassengers = trip.stops.filter(
    (stop) => stop.type === "pickup" && stop.category === "human"
  ).length;
  const packages = trip.stops.filter(
    (stop) => stop.type === "pickup" && stop.category === "package"
  ).length;
  const totalCapacity = 15;
  const availableSeats = totalCapacity - humanPassengers;

  // Generate route steps
  let routeStepsHTML = "";
  trip.stops.forEach((stop, index) => {
    const stepNumber = index + 1;
    const isCurrent = index === 0; // First stop is current
    const isCompleted = false; // For now, no completed steps

    const icon = stop.category === "package" ? "fas fa-box" : "fas fa-user";
    const typeLabel = stop.category === "package" ? "PACKAGE" : "PASSENGER";
    const actionType = stop.type === "pickup" ? "pickup" : "dropoff";

    let details = "";
    if (stop.category === "human") {
      details = `Passenger: ${stop.passengerName}`;
      if (stop.phoneNumber) details += ` | Phone: ${stop.phoneNumber}`;
      if (stop.email) details += ` | Email: ${stop.email}`;
    } else {
      // For parcels, show sender/receiver name, phone, and email
      const contactName = stop.receiverName || stop.senderName || 'N/A';
      details = `Package ID: ${stop.packageId}`;
      if (contactName && contactName !== 'N/A') details += ` | Name: ${contactName}`;
      if (stop.receiverPhone || stop.senderPhone) {
        details += ` | Phone: ${stop.receiverPhone || stop.senderPhone}`;
      }
      if (stop.receiverEmail || stop.senderEmail) {
        details += ` | Email: ${stop.receiverEmail || stop.senderEmail}`;
      }
    }

    routeStepsHTML += `
            <div class="route-step ${isCurrent ? "current" : ""} ${
      isCompleted ? "completed" : ""
    } ${actionType}-${stop.category}">
                <div class="step-number">${stepNumber}</div>
                <div class="step-info">
                    <div class="step-title">
                        <i class="step-icon ${stop.category} ${icon}"></i>
                        ${stop.type === "pickup" ? "Pickup" : "Dropoff"}: ${
      stop.location
    }
                        <span class="step-type-badge ${
                          stop.category
                        }">${typeLabel}</span>
                    </div>
                    <div class="step-details">${details}</div>
                </div>
                <div class="step-actions">
                    <button class="action-btn ${
                      isCurrent ? "success" : "primary"
                    }" onclick="${
      isCurrent
        ? "markStepComplete(" + stepNumber + ")"
        : "navigateToStep(" + stepNumber + ")"
    }">
                        <i class="fas fa-${
                          isCurrent ? "check" : "directions"
                        }"></i>
                    </button>
                </div>
            </div>
        `;
  });

  const startTripBtn = document.getElementById("startTripBtn");
  const buttonHTML = startTripBtn ? startTripBtn.outerHTML : `
    <button class="start-trip-btn" id="startTripBtn" onclick="startTrip()">
      <i class="fas fa-play-circle"></i>
      <span>Start Trip</span>
    </button>
  `;

  navigationInfo.innerHTML = `
        ${!isTripStarted ? buttonHTML : ''}
        <a href="#" id="verifyPassengerBtn" class="action-btn secondary" style="margin-bottom: 0.75rem; display: inline-flex; align-items: center; justify-content: center; gap: 0.5rem;">
          <i class="fas fa-qrcode"></i>
          Verify Passenger
        </a>
        <div class="trip-summary">
            <div class="trip-id">Booking #${trip.id || trip.bookingId || 'N/A'}</div>
            <div class="trip-status active">In Progress</div>
        </div>
        
        <div class="trip-info">
            <div class="trip-details">
                <div class="detail-item">
                    <i class="fas fa-bus"></i>
                    <span>Vehicle: ${trip.vehicleType}</span>
                </div>
                <div class="detail-item">
                    <i class="fas fa-users"></i>
                    <span>Passengers: ${humanPassengers}/${totalCapacity}</span>
                </div>
                <div class="detail-item">
                    <i class="fas fa-box"></i>
                    <span>Packages: ${packages}</span>
                </div>
                <div class="detail-item">
                    <i class="fas fa-route"></i>
                    <span>Distance: ${trip.totalDistance}</span>
                </div>
                <div class="detail-item">
                    <i class="fas fa-clock"></i>
                    <span>Duration: ${trip.estimatedDuration}</span>
                </div>
            </div>
        </div>
        
        <div class="route-steps" id="routeSteps">
            ${routeStepsHTML}
        </div>
    `;
  
  // Set up Verify Passenger button click handler
  const verifyPassengerBtn = document.getElementById("verifyPassengerBtn");
  if (verifyPassengerBtn) {
    verifyPassengerBtn.onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      // Get bookingId from URL parameters
      const params = new URLSearchParams(window.location.search);
      const bookingId = Number(params.get("bookingId"));
      if (bookingId) {
        sendBookingIdForVerification(bookingId);
      } else {
        console.warn("No booking ID available for verification.");
        alert("No booking ID available for verification.");
      }
    };
  }
}

/**
 * This draws the line of booking route on the map
 * @param {Number} bookingID  This is the booking ID
 * @param {Object} driverSourceCoords  This is the driver's source coordinates in the format {lat: xx.xxxx , lng: yy.yyyyy}
 * @param {Object} driverDestCoords  This is the driver's destination coordinates in the format {lat: xx.xxxx , lng: yy.yyyyy}
 * @returns 
 */
// async function drawRoute(bookingID , driverSourceCoords , driverDestCoords){
//   try {
//     const waypointResult = await trackingAPi.getBookingWaypoints(bookingID);
//     const defaultCoords = await trackingAPi.getDefaultSourceAndDestCoords(
//       bookingID
//     );
//     // Process the waypoints to draw the route on the map
//     // This is a placeholder - actual implementation will depend on the API response structure
//     console.log("Waypoints for route drawing:", waypointResult);

//     //pick up waypoints
//     const pickupWaypoints = waypointResult.pickup.coordinatesOnly;
//     const dropoffWaypoints = waypointResult.dropoff.coordinatesOnly;
//     let orderedPickupWaypoints = [];
//     let defaultsourcePosition ={};
//     let defaultdestinationPosition ={};

//     if (driverSourceCoords) {
//       defaultsourcePosition = driverSourceCoords;
//     }else{
//         defaultsourcePosition = defaultCoords.source.position;
//     }

//     if (driverDestCoords) {
//       defaultdestinationPosition = driverDestCoords;
//     }else{
//         defaultdestinationPosition = defaultCoords.destination.position;
//     }

//     directionsService.route(
//       {
//         origin: defaultsourcePosition,
//         destination: dropoffWaypoints[0].position,
//         waypoints: pickupWaypoints.map((p) => ({
//           location: p.position,
//           stopover: p.stopOverValue,
//         })),
//         optimizeWaypoints: true,
//         travelMode: "DRIVING",
//       },
//       (result, status) => {
//         if (status === "OK") {
//           //   const pickupOrder = result.routes[0].waypoint_order;
//           //   console.log("Optimized pickup order:", pickupOrder);

//           const route = result.routes[0];
//           const legs = route.legs;

//           // Build polyline path EXCLUDING last leg
//           const path = [];

//           for (let i = 0; i < legs.length - 1; i++) {
//             legs[i].steps.forEach((step) => {
//               step.path.forEach((p) => path.push(p));
//             });
//           }

//           new google.maps.Polyline({
//             path,
//             map,
//             strokeColor: "#4285F4",
//             strokeOpacity: 1,
//             strokeWeight: 5,
//           });

//           console.log("Optimized pickup order:", route.waypoint_order);
//           orderedPickupWaypoints = route.waypoint_order.map(
//             (index) => pickupWaypoints[index]
//           );
          
//         }
//       }
//     );

//     // Then send another request for drop-offs from last pickup to Tzaneen
//     //drop off waypoints

//     directionsService.route(
//       {
//         origin:
//           orderedPickupWaypoints.length > 0
//             ? orderedPickupWaypoints[orderedPickupWaypoints.length - 1]
//                 .position
//             : defaultsourcePosition,
//         destination: defaultdestinationPosition,
//         waypoints: dropoffWaypoints.map((p) => ({
//           location: p.position,
//           stopover: p.stopOverValue,
//         })),
//         optimizeWaypoints: true,
//         travelMode: "DRIVING",
//       },
//       (result, status) => {
//         if (status === "OK") {
//           const route = result.routes[0];
//           const legs = route.legs;
          
//           // Build polyline path
//           const path = [];
//             for (let i = 0; i < legs.length -1; i++) {
//                 legs[i].steps.forEach((step) => {
//                     step.path.forEach((p) => path.push(p));
//                 });
//             }

//           new google.maps.Polyline({
//             path,
//             map,
//             strokeColor: "#4285F4",
//             strokeOpacity: 1,
//             strokeWeight: 5,
//           });
//         }
//       }
//     );

//     return true;
//   } catch (error) {
//     console.error("Error drawing route:", error);
//     return false;
//   }
// }

function routeAsync(request) {
  return new Promise((resolve, reject) => {
    directionsService.route(request, (result, status) => {
      if (status === "OK") resolve(result);
      else reject(status);
    });
  });
}

// Make a anum of origin , pickup , dropoff and destination
const markerType = {
  ORIGIN: "origin",
  PICKUP: "pickup",
  DROPOFF: "dropoff",
  DESTINATION: "destination"
};

async function drawRoute(bookingID, driverSourceCoords, driverDestCoords) {
  try {
    const waypointResult = await trackingAPi.getBookingWaypoints(bookingID);
    const defaultCoords = await trackingAPi.getDefaultSourceAndDestCoords(
      bookingID
    );

    console.log("Default : " , defaultCoords);

    const pickupWaypoints = waypointResult.pickup.coordinatesOnly;
    const dropoffWaypoints = waypointResult.dropoff.coordinatesOnly;

    console.log(`Pickup Waypoints: ${pickupWaypoints.length} points`);
    console.log(`Dropoff Waypoints: ${dropoffWaypoints.length} points`);

    const defaultsourcePosition =
      driverSourceCoords ?? defaultCoords.source.position;

    const defaultdestinationPosition =
      driverDestCoords ?? defaultCoords.destination.position;

    // clear previous polylines if you store them globally
    if (window.activePolylines) {
      window.activePolylines.forEach(p => p.setMap(null));
    }
    window.activePolylines = [];

    /* ---------------- PICKUP ROUTE ---------------- */
    
    // Google Maps Directions API allows maximum 25 waypoints per request
    // Limit pickup waypoints to 25 (origin + 25 waypoints + destination = 27 points max)
    const MAX_WAYPOINTS = 25;
    const limitedPickupWaypoints = pickupWaypoints.slice(0, MAX_WAYPOINTS);
    
    if (pickupWaypoints.length > MAX_WAYPOINTS) {
      console.warn(`Too many pickup waypoints (${pickupWaypoints.length}). Limiting to ${MAX_WAYPOINTS} waypoints.`);
      // Optionally show a user notification
      if (window.showNotification) {
        window.showNotification(`Warning: Route has ${pickupWaypoints.length} pickup points. Only showing first ${MAX_WAYPOINTS} points on map.`, 'warning');
      }
    }
    
    // Determine pickup route destination (first dropoff point or default destination)
    const pickupDestination = dropoffWaypoints.length > 0 
      ? dropoffWaypoints[0].position 
      : defaultdestinationPosition;

    const pickupResult = await routeAsync({
      origin: defaultsourcePosition,
      destination: pickupDestination,
      waypoints: limitedPickupWaypoints.map(p => ({
        location: p.position,
        stopover: p.stopOverValue,
      })),
      optimizeWaypoints: true,
      travelMode: google.maps.TravelMode.DRIVING,
    });

    const pickupRoute = pickupResult.routes[0];
    const pickupLegs = pickupRoute.legs;

    // Extract navigation steps from pickup legs (include all legs)
    const pickupSteps = [];
    for (let i = 0; i < pickupLegs.length; i++) {
      pickupLegs[i].steps.forEach(step => {
        // Strip HTML tags from instructions if present
        const instructionText = step.instructions 
          ? step.instructions.replace(/<[^>]*>/g, '') 
          : 'Continue straight';
        
        pickupSteps.push({
          instruction: instructionText,
          distance: step.distance ? step.distance.text : '',
          duration: step.duration ? step.duration.text : '',
          maneuver: step.maneuver || 'straight',
          startLocation: step.start_location,
          endLocation: step.end_location,
          path: step.path || []
        });
      });
    }

    const pickupPath = [];
    for (let i = 0; i < pickupLegs.length - 1; i++) {
      pickupLegs[i].steps.forEach(step =>
        step.path.forEach(p => pickupPath.push(p))
      );
    }

    window.activePolylines.push(
      new google.maps.Polyline({
        path: pickupPath,
        map,
        strokeOpacity: 1,
        strokeWeight: 5,
      })
    );

    // Check if waypoint_order exists (it might not exist if there's only one waypoint or optimization fails)
    let orderedPickupWaypoints;
    if (pickupRoute.waypoint_order && pickupRoute.waypoint_order.length > 0) {
      orderedPickupWaypoints =
        pickupRoute.waypoint_order.map(index => limitedPickupWaypoints[index]);
    } else {
      // If waypoint_order doesn't exist, use the waypoints in their original order
      console.warn("Pickup route waypoint_order is missing or empty. Using original order.");
      orderedPickupWaypoints = limitedPickupWaypoints;
    }

    const lastPickupPosition =
      orderedPickupWaypoints.length > 0
        ? orderedPickupWaypoints[orderedPickupWaypoints.length - 1].position
        : defaultsourcePosition;

    /* ---------------- DROPOFF ROUTE ---------------- */
    
    let orderedDropoffWaypoints = [];
    let dropoffPath = [];
    let dropoffSteps = [];
    let dropoffLegs = [];
    
    // Only process dropoff waypoints if they exist
    if (dropoffWaypoints && dropoffWaypoints.length > 0) {
      // Limit dropoff waypoints to 25 (origin + 25 waypoints + destination = 27 points max)
      const limitedDropoffWaypoints = dropoffWaypoints.slice(0, MAX_WAYPOINTS);
      
      if (dropoffWaypoints.length > MAX_WAYPOINTS) {
        console.warn(`Too many dropoff waypoints (${dropoffWaypoints.length}). Limiting to ${MAX_WAYPOINTS} waypoints.`);
        // Optionally show a user notification
        if (window.showNotification) {
          window.showNotification(`Warning: Route has ${dropoffWaypoints.length} dropoff points. Only showing first ${MAX_WAYPOINTS} points on map.`, 'warning');
        }
      }

      const dropoffResult = await routeAsync({
        origin: lastPickupPosition,
        destination: defaultdestinationPosition,
        waypoints: limitedDropoffWaypoints.map(p => ({
          location: p.position,
          stopover: p.stopOverValue,
        })),
        optimizeWaypoints: true,
        travelMode: google.maps.TravelMode.DRIVING,
      });

      const dropoffRoute = dropoffResult.routes[0];
      dropoffLegs = dropoffRoute.legs;

      // Extract navigation steps from dropoff legs (include all legs)
      for (let i = 0; i < dropoffLegs.length; i++) {
        dropoffLegs[i].steps.forEach(step => {
          // Strip HTML tags from instructions if present
          const instructionText = step.instructions 
            ? step.instructions.replace(/<[^>]*>/g, '') 
            : 'Continue straight';
          
          dropoffSteps.push({
            instruction: instructionText,
            distance: step.distance ? step.distance.text : '',
            duration: step.duration ? step.duration.text : '',
            maneuver: step.maneuver || 'straight',
            startLocation: step.start_location,
            endLocation: step.end_location,
            path: step.path || []
          });
        });
      }

      // Build dropoff path (exclude last leg which goes to final destination)
      for (let i = 0; i < dropoffLegs.length - 1; i++) {
        dropoffLegs[i].steps.forEach(step =>
          step.path.forEach(p => dropoffPath.push(p))
        );
      }

      // Only add polyline if there's a path
      if (dropoffPath.length > 0) {
        window.activePolylines.push(
          new google.maps.Polyline({
            path: dropoffPath,
            map,
            strokeOpacity: 1,
            strokeWeight: 5,
          })
        );
      }

      // Check if waypoint_order exists (it might not exist if there's only one waypoint or optimization fails)
      if (dropoffRoute.waypoint_order && dropoffRoute.waypoint_order.length > 0) {
        orderedDropoffWaypoints =
          dropoffRoute.waypoint_order.map(index => limitedDropoffWaypoints[index]);
        console.log(`Dropoff route waypoint_order: ${dropoffRoute.waypoint_order.length} waypoints`);
      } else {
        // If waypoint_order doesn't exist, use the waypoints in their original order
        // This happens when there's only one waypoint or optimization is not applied
        console.warn("Dropoff route waypoint_order is missing or empty. Using original order.");
        orderedDropoffWaypoints = limitedDropoffWaypoints;
      }
      
      console.log(`Ordered dropoff waypoints: ${orderedDropoffWaypoints.length} points`);
    } else {
      console.log("No dropoff waypoints found for this booking");
    }


   //draw markers

      orderedPickupWaypoints.forEach((waypoint, index) => {
        createMarker(
          waypoint.position, 
          `W${index + 1}`, 
          markerType.PICKUP,
          {
            id: waypoint.id,
            type: waypoint.type,
            waypointIndex: index
          }
        );
      });

      // Only create dropoff markers if there are dropoff waypoints
      if (orderedDropoffWaypoints && orderedDropoffWaypoints.length > 0) {
        console.log("Creating dropoff markers for", orderedDropoffWaypoints.length, "waypoints");
        orderedDropoffWaypoints.forEach((waypoint, index) => {
          // console.log("Creating dropoff marker:", waypoint.id, waypoint.type); // Removed position logging
          createMarker(
            waypoint.position, 
            `DP${orderedPickupWaypoints.length + index}`, 
            markerType.DROPOFF,
            {
              id: waypoint.id,
              type: waypoint.type,
              waypointIndex: index
            }
          );
        });
      } else {
        console.log("No dropoff markers to create - orderedDropoffWaypoints is empty");
      }

    createMarker(defaultsourcePosition, "S" , markerType.ORIGIN);
    createMarker(defaultdestinationPosition, "D" , markerType.DESTINATION);

   
    fullPath = [...pickupPath,  ...dropoffPath];
    
    // Store all navigation steps for turn-by-turn directions
    allNavigationSteps = [...pickupSteps, ...dropoffSteps];
    currentStepIndex = 0;
    routeLegs = [...pickupLegs, ...dropoffLegs];
    
    // Initialize navigation instructions display
    if (allNavigationSteps.length > 0) {
      updateNavigationInstruction();
    }

    return true;
  } catch (error) {
    console.error("Error drawing route:", error);
    return false;
  }
}

async function checkLocationPermission() {
  try {
    // First, check if Permissions API is available (modern browsers)
    if (navigator.permissions && navigator.permissions.query) {
      try {
        const permissionStatus = await navigator.permissions.query({ name: 'geolocation' });
        console.log("Current permission status:", permissionStatus.state);
        
        // If already granted, return immediately
        if (permissionStatus.state === 'granted') {
          return {
            granted: true,
            message: "Location access granted",
          };
        }
        
        // If denied, return without triggering request
        if (permissionStatus.state === 'denied') {
          return {
            granted: false,
            message: "Location access denied. Please enable location permissions in your browser settings.",
          };
        }
        
        // If prompt (not yet asked), we'll trigger the request below
        // permissionStatus.state === 'prompt'
      } catch (permError) {
        // Permissions API might not be fully supported, fall through to geolocation method
        console.log("Permissions API not fully supported, using geolocation method");
      }
    }

    // Request permission by calling getCurrentPosition
    // This will trigger the browser's permission dialog if not already granted/denied
    const result = await new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          // Permission granted and position obtained
          resolve({
            granted: true,
            message: "Location access granted",
            position: {
              lat: position.coords.latitude,
              lng: position.coords.longitude
            }
          });
        },
        (err) => {
          // Error codes: 1 = PERMISSION_DENIED, 2 = POSITION_UNAVAILABLE, 3 = TIMEOUT
          if (err.code === 1) { // PERMISSION_DENIED
            resolve({
              granted: false,
              message: "Location access denied. Please allow location access to use this feature.",
            });
          } else if (err.code === 2) { // POSITION_UNAVAILABLE
            resolve({
              granted: false,
              message: "Location information unavailable. Please check your device's location settings.",
            });
          } else if (err.code === 3) { // TIMEOUT
            resolve({
              granted: false,
              message: "Location request timeout. Please try again.",
            });
          } else {
            reject(err);
          }
        },
        {
          timeout: 10000, // Increased timeout to allow user time to respond to permission dialog
          maximumAge: 0,
          enableHighAccuracy: false
        }
      );
    });

    return result;
  } catch (err) {
    console.error("Permission check failed:", err);
    return {
      granted: false,
      message: "Location check failed. Please ensure location services are enabled.",
    };
  }
}

async function executeDirection(){
  //check if permission is granted
  const check = await checkLocationPermission();

  console.log("[In executeDirection] Check: ", check);

  if(check.granted){
    //re-draw route 
  const params = new URLSearchParams(window.location.search);
  const bookingId = Number(params.get("bookingId"));
  if (bookingId) {
    (async () => {
      try {
        await drawRoute(
          bookingId,
          null,
          null
        );
      } catch (error) {
        console.error("Error drawing route for booking:", error);
      }
    })();
  }
    // If granted render from current location
    RenderDriverPosition();
  }
  //ELSE:leave the existing drawing
}

function RenderDriverPosition() {
  //choose between real position or simulation position
  const simulate = true;

  if (simulate) {
       // execute a function that Simulates a moving position and updates the marker accordingly
       simulateDriverPosition();
  } else {
    // Real position from geolocation
navigator.geolocation.watchPosition(
  position => {
    const currentCoords = {
      lat: position.coords.latitude,
      lng: position.coords.longitude,
    };

    if (driverMarker) {
      driverMarker.setPosition(currentCoords);
    } else {
      createDriverMarker(currentCoords);
    }

    // Auto-centering removed - map will stay where user positions it
    // Driver marker position is updated, but map view is not automatically centered

    // Update navigation instructions based on current position
    if (window.findCurrentStep) {
      window.findCurrentStep(currentCoords);
    }
  },
  error => {
    console.error("Location error:", error);
  },
  {
    enableHighAccuracy: true,
    maximumAge: 0,
    timeout: 10000,
  }
);

  }
}

function sendBookingIdForVerification(bookingId) {
  try {
    if (!bookingId) return;
    // Persist id so verification page can pick it up
    window.location.href = `/pages/driver/driver-verification.html?bookingId=${encodeURIComponent(
      bookingId
    )}`;
  } catch (e) {
    console.error("Error initiating verification:", e);
  }
}

 function simulateDriverPosition() {
  //Simulate a moving position for testing
  if (!fullPath || fullPath.length === 0) {
    console.error("No fullPath available for simulation");
    return;
  }

  // Get bookingId from URL parameters
  const params = new URLSearchParams(window.location.search);
  const bookingId = Number(params.get("bookingId"));

  if (!bookingId) {
    console.warn("⚠️ No bookingId found in URL, simulation will run but won't send position updates");
  }

  // Stop existing simulation if running
  if (simulation && simulation.isSimulationRunning()) {
    simulation.stopSimulation();
  }

  // Create or ensure driver marker exists
  if (!driverMarker && map) {
    createDriverMarker(fullPath[0]);
  }

  // Create new simulation instance with bookingId
  simulation = new Simulation(fullPath, driverMarker, map, bookingId);
  
  // Start the simulation
  simulation.startSimulation();
  
  console.log("🚗 Driver position simulation started", bookingId ? `(Booking ID: ${bookingId})` : "(No booking ID)");
  }


// Initialize active markers array if it doesn't exist
if (!window.activeMarkers) {
  window.activeMarkers = [];
}

//create marker function
function createMarker(position, label, type, waypointData = null) {

  let iconColor = "purple"; // Default color
  if(type === markerType.ORIGIN){
    iconColor = "blue";
  } else if(type === markerType.PICKUP){
    // Check if it's a package or passenger pickup
    if (waypointData && waypointData.type === "parcel") {
      iconColor = "yellow"; // Package pickup: yellow
    } else {
      iconColor = "green"; // Passenger pickup: green
    }
  } else if(type === markerType.DROPOFF){
    // Check if it's a package or passenger dropoff
    if (waypointData && waypointData.type === "parcel") {
      iconColor = "red"; // Package dropoff: red
    } else {
      iconColor = "blue"; // Passenger dropoff: blue
    }
  } else if(type === markerType.DESTINATION){
    iconColor = "red";
  }

  const marker = new google.maps.Marker({
    position,
    map,
     label: {
      text: label,
      color: "white",
      fontWeight: "bold",
    },
    icon: {
      path: google.maps.SymbolPath.CIRCLE,
      scale: 20,
      fillColor: iconColor,
      fillOpacity: 1,
      strokeColor: "#0D47A1",
      strokeWeight: 2,
    },
  });

  // Store marker metadata for easy removal and identification
  marker.markerLabel = label;
  marker.markerType = type;
  
  // Store waypoint data (ID and type) if provided
  if (waypointData) {
    marker.waypointId = waypointData.id;
    marker.waypointType = waypointData.type;
    marker.waypointIndex = waypointData.waypointIndex;
  }
  
  // Add to active markers array
  if (!window.activeMarkers) {
    window.activeMarkers = [];
  }
  window.activeMarkers.push(marker);

  return marker;
}

//create driver marker function
function createDriverMarker(position) {
  if (driverMarker) {
    driverMarker.setPosition(position);
  } else {
    driverMarker = new google.maps.Marker({
      position,
      map,
      title: "Driver Location",
      icon: {
        path: google.maps.SymbolPath.CIRCLE,
        scale: 20,
        fillColor: "blue",
        fillOpacity: 1,
        strokeColor: "#0D47A1",
        strokeWeight: 2,
      },
    });
  }
}

function clearExistingMarkers() {
  if (window.activeMarkers) {
    window.activeMarkers.forEach(marker => marker.setMap(null));
    window.activeMarkers = [];
  }
}

/**
 * Removes a specific marker from the map
 * @param {string} markerIdentifier - Can be:
 *   - Label string: Remove marker with matching label (e.g., "W1", "DP2", "S", "D")
 *   - Type string: Remove all markers of a specific type (markerType.PICKUP, markerType.DROPOFF, etc.)
 * @returns {boolean} - True if marker was removed, false otherwise
 * 
 * Usage examples:
 *   removeMarker("W1"); // Remove marker with label "W1"
 *   removeMarker(markerType.PICKUP); // Remove all pickup markers
 *   removeMarker("S"); // Remove origin marker
 */
function removeMarker(markerIdentifier) {
  if (!window.activeMarkers || window.activeMarkers.length === 0) {
    console.warn("No active markers to remove");
    return false;
  }

  if (typeof markerIdentifier !== 'string') {
    console.warn("removeMarker only accepts string (label or type)");
    return false;
  }

  let removed = false;

  // Check if it's a marker type (ORIGIN, PICKUP, DROPOFF, DESTINATION)
  const isMarkerType = Object.values(markerType).includes(markerIdentifier);
  
  if (isMarkerType) {
    // Remove all markers of this type
    const markersToRemove = window.activeMarkers.filter(m => m.markerType === markerIdentifier);
    markersToRemove.forEach(marker => {
      marker.setMap(null);
      const index = window.activeMarkers.indexOf(marker);
      if (index !== -1) {
        window.activeMarkers.splice(index, 1);
      }
    });
    removed = markersToRemove.length > 0;
  } else {
    // Remove marker by label
    const index = window.activeMarkers.findIndex(m => m.markerLabel === markerIdentifier);
    if (index !== -1) {
      const marker = window.activeMarkers[index];
      marker.setMap(null);
      window.activeMarkers.splice(index, 1);
      removed = true;
    }
  }

  if (!removed) {
    console.warn(`Marker not found: ${markerIdentifier}`);
  }

  return removed;
}

/**
 * Gets a marker by its waypoint ID and type
 * @param {number|string} waypointId - The waypoint ID to find
 * @param {string} type - The waypoint type (e.g., "passenger", "parcel")
 * @returns {google.maps.Marker|null} - The marker if found, null otherwise
 * 
 * Usage:
 *   const marker = getMarkerByWaypointId(123, "passenger");
 *   if (marker) {
 *     // Access marker properties: marker.waypointId, marker.waypointType, marker.markerLabel
 *   }
 */
function getMarkerByWaypointId(waypointId , type) {
  if (!window.activeMarkers || window.activeMarkers.length === 0) {
    return null;
  }
  
  return window.activeMarkers.find(m => (m.waypointId === waypointId && m.waypointType === type) ||
(m.waypointId == waypointId && m.waypointType == type)) || null;
}

/**
 * Removes a marker by its waypoint ID
 * @param {number|string} waypointId - The waypoint ID to remove
 * @param {string} type - The waypoint type (e.g., "passenger", "parcel")
 * @returns {boolean} - True if marker was removed, false otherwise
 * 
 * Usage:
 *   removeMarkerByWaypointId(123, "passenger"); // Remove marker with waypoint ID 123 and type "passenger"
 */
function removeMarkerByWaypointId(waypointId , type) {
  const marker = getMarkerByWaypointId(waypointId , type);
  if (marker) {
    marker.setMap(null);
    const index = window.activeMarkers.indexOf(marker);
    if (index !== -1) {
      window.activeMarkers.splice(index, 1);
      return true;
    }
  }
  console.warn(`Marker with waypoint ID ${waypointId} and type ${type} not found`);
  return false;
}

// Export function to window for global access (accessible from driver-verification.js)
window.removeMarkerByWaypointId = removeMarkerByWaypointId;
window.getMarkerByWaypointId = getMarkerByWaypointId;

function calculateRoute() {
  if (!currentTrip || !directionsService || !directionsRenderer) return;

  const request = {
    origin: currentTrip.pickupLocation,
    destination: currentTrip.dropoffLocation,
    travelMode: google.maps.TravelMode.DRIVING,
    avoidHighways: false,
    avoidTolls: false,
  };

  directionsService.route(request, function (result, status) {
    if (status === "OK") {
      directionsRenderer.setDirections(result);

      // Update trip with actual route information
      const route = result.routes[0];
      const leg = route.legs[0];

      currentTrip.actualDistance = leg.distance.text;
      currentTrip.actualDuration = leg.duration.text;

      // Update display
      updateRouteInfo(leg);
    } else {
      console.error("Directions request failed:", status);
      showErrorMessage("Failed to calculate route. Please try again.");
    }
  });
}

function updateRouteInfo(leg) {
  const routeSteps = document.getElementById("routeSteps");
  if (!routeSteps) return;

  // Update step information with actual route data
  const steps = routeSteps.querySelectorAll(".route-step");
  if (steps.length >= 2) {
    const pickupStep = steps[0];
    const dropoffStep = steps[1];

    // Update dropoff step
    const dropoffDetails = dropoffStep.querySelector(".step-details");

    if (dropoffDetails) {
      dropoffDetails.textContent = `Distance: ${leg.distance.text}`;
    }
  }
}

function showNoTripMessage() {
  const noTripOverlay = document.getElementById("noTripOverlay");
  if (noTripOverlay) {
    noTripOverlay.style.display = "block";
  }
}

function markStepComplete(stepNumber) {
  const steps = document.querySelectorAll(".route-step");
  if (steps[stepNumber - 1]) {
    const step = steps[stepNumber - 1];
    step.classList.add("completed");
    step.classList.remove("current");

    // Update step number styling
    const stepNumberEl = step.querySelector(".step-number");
    if (stepNumberEl) {
      stepNumberEl.classList.add("completed");
    }

    // Move to next step
    if (steps[stepNumber]) {
      steps[stepNumber].classList.add("current");
      steps[stepNumber].classList.remove("completed");
    }

    showSuccessMessage(`Step ${stepNumber} completed!`);
  }
}

function navigateToStep(stepNumber) {
  const steps = document.querySelectorAll(".route-step");
  if (steps[stepNumber - 1]) {
    // Update current step
    steps.forEach((step) => {
      step.classList.remove("current");
    });
    steps[stepNumber - 1].classList.add("current");

    showSuccessMessage(`Navigating to step ${stepNumber}`);
  }
}

function setupLocationTracking() {
  if (navigator.geolocation) {
    navigator.geolocation.watchPosition(
      function (position) {
        updateDriverLocation(position);
      },
      function (error) {
        console.error("Geolocation error:", error);
      },
      {
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 0,
      }
    );
  }
}

function updateDriverLocation(position) {
  const driverLocation = {
    lat: position.coords.latitude,
    lng: position.coords.longitude,
  };

  // Auto-centering removed - map will stay where user positions it
  // Driver location is stored but map view is not automatically centered

  // Store driver location for real-time updates
  localStorage.setItem("driverLocation", JSON.stringify(driverLocation));
}

// Set up WebSocket listener for geofence updates (passenger arrival notifications)
function setupGeofenceListener(bookingId) {
  if (!bookingId) {
    console.warn('⚠️ [DRIVER] No bookingId provided for geofence listener');
    return;
  }

  console.log('🔔 [DRIVER] Setting up geofence listener for booking:', bookingId);

  // Initialize socket and join booking room
  socketService.initSocket();
  socketService.joinBookingRoom(bookingId, (response) => {
    console.log('✅ [DRIVER] Joined booking room for geofence updates:', response);
  });

  // Listen for vehicle position updates (which include geofence updates)
  socketService.onVehiclePositionUpdate((data) => {
    console.log('📡 [DRIVER] Received vehicle position update');
    // Removed full data structure logging to reduce console clutter
    if (data.vehiclePosition) {
      console.log('📍 [DRIVER] Vehicle position:', data.vehiclePosition.lat, data.vehiclePosition.lng);
    }
    if (data.routePoints) {
      console.log(`🛣️ [DRIVER] Route points: ${Array.isArray(data.routePoints) ? data.routePoints.length : 'N/A'} points`);
    }

    // Check if this update includes geofence information
    if (data.geofenceUpdate) {
      console.log('🔔 [DRIVER] Geofence update detected:', data.geofenceUpdate);
      
      if (data.geofenceUpdate.passengersArrived && Array.isArray(data.geofenceUpdate.passengersArrived)) {
        const arrivedPassengers = data.geofenceUpdate.passengersArrived;
        console.log('🔔 [DRIVER] Geofence triggered! Passengers arrived:', arrivedPassengers);
        console.log('🔔 [DRIVER] Number of passengers arrived:', arrivedPassengers.length);

        // Show confirmation button for each arrived passenger
        arrivedPassengers.forEach(passenger => {
          console.log('🔔 [DRIVER] Processing passenger:', passenger);
          showDropoffConfirmationButton(bookingId, passenger.id, passenger.name, passenger.distance);
        });
      } else {
        console.log('⚠️ [DRIVER] No passengersArrived array in geofenceUpdate');
      }
    } else {
      console.log('ℹ️ [DRIVER] No geofenceUpdate in vehicle position update');
    }
  });
}

// Show dropoff confirmation button for driver
function showDropoffConfirmationButton(bookingId, passengerId, passengerName, distance) {
  // Remove any existing confirmation button for this passenger
  const existingBtn = document.getElementById(`confirm-dropoff-btn-${passengerId}`);
  if (existingBtn) {
    existingBtn.remove();
  }

  // Create confirmation button
  const confirmBtn = document.createElement('button');
  confirmBtn.id = `confirm-dropoff-btn-${passengerId}`;
  confirmBtn.className = 'action-btn success';
  confirmBtn.style.cssText = `
    position: fixed;
    bottom: 20px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 2000;
    padding: 1rem 2rem;
    font-size: 1.1rem;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    animation: pulse 2s infinite;
  `;
  confirmBtn.innerHTML = `
    <i class="fas fa-check-circle"></i>
    Confirm Dropoff: ${passengerName} (${distance.toFixed(0)}m away)
  `;

  // Add pulse animation
  const style = document.createElement('style');
  style.textContent = `
    @keyframes pulse {
      0%, 100% { transform: translateX(-50%) scale(1); }
      50% { transform: translateX(-50%) scale(1.05); }
    }
  `;
  if (!document.getElementById('geofence-pulse-style')) {
    style.id = 'geofence-pulse-style';
    document.head.appendChild(style);
  }

  // Add click handler
  confirmBtn.onclick = async () => {
    try {
      confirmBtn.disabled = true;
      confirmBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Confirming...';

      const response = await trackingAPi.confirmDropoff(bookingId, passengerId);
      
      if (response.success) {
        confirmBtn.innerHTML = '<i class="fas fa-check"></i> Dropoff Confirmed!';
        confirmBtn.style.background = '#28a745';
        
        // Remove button after 2 seconds
        setTimeout(() => {
          confirmBtn.remove();
        }, 2000);

        // Show success notification
        showNotification(`✅ Dropoff confirmed for ${passengerName}`, 'success');
      } else {
        throw new Error(response.message || 'Failed to confirm dropoff');
      }
    } catch (error) {
      console.error('❌ [DRIVER] Error confirming dropoff:', error);
      confirmBtn.disabled = false;
      confirmBtn.innerHTML = `
        <i class="fas fa-exclamation-triangle"></i>
        Confirm Dropoff: ${passengerName} (Error - Try Again)
      `;
      showNotification(`❌ Error: ${error.message}`, 'error');
    }
  };

  // Add to page
  document.body.appendChild(confirmBtn);

  // Show notification
  showNotification(`🔔 ${passengerName} has arrived at dropoff point (${distance.toFixed(0)}m away)`, 'info');
}

// Simple notification function
function showNotification(message, type = 'info') {
  const notification = document.createElement('div');
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: ${type === 'success' ? '#28a745' : type === 'error' ? '#dc3545' : '#17a2b8'};
    color: white;
    padding: 1rem 1.5rem;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
    z-index: 3000;
    max-width: 400px;
    animation: slideIn 0.3s ease-out;
  `;
  notification.textContent = message;

  // Add slide-in animation
  const style = document.createElement('style');
  style.textContent = `
    @keyframes slideIn {
      from {
        transform: translateX(100%);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }
  `;
  if (!document.getElementById('notification-style')) {
    style.id = 'notification-style';
    document.head.appendChild(style);
  }

  document.body.appendChild(notification);

  // Remove after 5 seconds
  setTimeout(() => {
    notification.style.animation = 'slideIn 0.3s ease-out reverse';
    setTimeout(() => notification.remove(), 300);
  }, 5000);
}

// Map control functions
function centerMapOnLocation() {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(function (position) {
      const location = {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
      };
      safeMapOperation(() => {
        map.setCenter(location);
        map.setZoom(15);
      }, "Error setting map center/zoom in setupLocationTracking");
    });
  }
}

function toggleTrafficLayer() {
  const trafficBtn = document.getElementById("trafficBtn");

  if (trafficLayer.getMap()) {
    trafficLayer.setMap(null);
    trafficBtn.classList.remove("active");
  } else {
    trafficLayer.setMap(map);
    trafficBtn.classList.add("active");
  }
}

function toggleSatelliteView() {
  if (!map) {
    console.warn("Map not initialized. Cannot toggle satellite view.");
    return;
  }

  const satelliteBtn = document.getElementById("satelliteBtn");

  try {
    if (isSatelliteView) {
      if (typeof map.setMapTypeId === 'function') {
        map.setMapTypeId(google.maps.MapTypeId.ROADMAP);
      }
      isSatelliteView = false;
      if (satelliteBtn) satelliteBtn.classList.remove("active");
    } else {
      if (typeof map.setMapTypeId === 'function') {
        map.setMapTypeId(google.maps.MapTypeId.SATELLITE);
      }
      isSatelliteView = true;
      if (satelliteBtn) satelliteBtn.classList.add("active");
    }
  } catch (error) {
    console.error("Error toggling satellite view:", error);
  }
}

function refreshCurrentRoute() {
  if (currentTrip) {
    calculateRoute();
    showSuccessMessage("Route refreshed");
  }
}

function showSuccessMessage(message) {
  const notification = document.createElement("div");
  notification.className = "notification success";
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
  const notification = document.createElement("div");
  notification.className = "notification error";
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

function startTripNavigation() {
  if (isTripStarted) {
    // If trip is already started, stop it
    isTripStarted = false;
    updateStartTripButton(false);
    
    // Stop simulation if running
    if (simulation && simulation.isSimulationRunning()) {
      simulation.stopSimulation();
    }
    
    // Hide navigation instruction panel
    const navPanel = document.getElementById("navigationInstructionPanel");
    if (navPanel) {
      navPanel.style.display = "none";
    }
    
    showSuccessMessage("Trip paused");
    return;
  }

  // Start the trip
  isTripStarted = true;
  updateStartTripButton(true);
  
  // Zoom into the map to show roads clearly
  safeMapOperation(() => {
    // Zoom to navigation level (15-16 is good for seeing roads)
    map.setZoom(16);
    
    // Center on driver's current position if available, otherwise center on route start
    if (driverMarker && driverMarker.getPosition) {
      const position = driverMarker.getPosition();
      if (position) {
        map.setCenter(position);
      }
    } else if (fullPath && fullPath.length > 0) {
      // Center on first point of the route
      const firstPoint = fullPath[0];
      const lat = typeof firstPoint.lat === 'function' ? firstPoint.lat() : firstPoint.lat;
      const lng = typeof firstPoint.lng === 'function' ? firstPoint.lng() : firstPoint.lng;
      map.setCenter({ lat: lat, lng: lng });
    }
  }, "Error setting map zoom/center in startTripNavigation");
  
  // Show navigation instruction panel if steps are available
  if (allNavigationSteps && allNavigationSteps.length > 0) {
    const navPanel = document.getElementById("navigationInstructionPanel");
    if (navPanel) {
      navPanel.style.display = "block";
    }
    updateNavigationInstruction();
  }
  
  // Execute direction/navigation
  executeDirection();
  
  // Show success message
  showSuccessMessage("Trip started! Follow the route directions.");
}

function updateStartTripButton(started) {
  const startTripBtn = document.getElementById("startTripBtn");
  if (!startTripBtn) return;

  if (started) {
    startTripBtn.classList.add("active");
    startTripBtn.innerHTML = `
      <i class="fas fa-pause-circle"></i>
      <span>Pause Trip</span>
    `;
  } else {
    startTripBtn.classList.remove("active");
    startTripBtn.innerHTML = `
      <i class="fas fa-play-circle"></i>
      <span>Start Trip</span>
    `;
  }
}

// Function to update navigation instruction display
function updateNavigationInstruction() {
  if (!allNavigationSteps || allNavigationSteps.length === 0) {
    return;
  }

  if (currentStepIndex >= allNavigationSteps.length) {
    // Trip completed
    showNavigationInstruction("You have arrived at your destination", "", "");
    return;
  }

  const currentStep = allNavigationSteps[currentStepIndex];
  const instruction = currentStep.instruction || "Continue straight";
  const distance = currentStep.distance || "";
  const maneuver = currentStep.maneuver || "straight";

  showNavigationInstruction(instruction, distance, maneuver);
}

// Function to display navigation instruction in UI
function showNavigationInstruction(instruction, distance, maneuver) {
  let navPanel = document.getElementById("navigationInstructionPanel");
  
  if (!navPanel) {
    // Create navigation instruction panel if it doesn't exist
    navPanel = document.createElement("div");
    navPanel.id = "navigationInstructionPanel";
    navPanel.className = "navigation-instruction-panel";
    navPanel.style.display = isTripStarted ? "block" : "none";
    document.body.appendChild(navPanel);
  }

  // Only show if trip is started
  if (!isTripStarted) {
    navPanel.style.display = "none";
    return;
  }

  navPanel.style.display = "block";

  // Get maneuver icon
  const maneuverIcon = getManeuverIcon(maneuver);
  
  navPanel.innerHTML = `
    <div class="nav-instruction-content">
      <div class="nav-maneuver-icon">${maneuverIcon}</div>
      <div class="nav-instruction-text">
        <div class="nav-instruction-main">${instruction}</div>
        <div class="nav-instruction-distance">${distance}</div>
      </div>
    </div>
  `;
}

// Function to get icon for maneuver type
function getManeuverIcon(maneuver) {
  const icons = {
    'turn-left': '<i class="fas fa-arrow-left"></i>',
    'turn-right': '<i class="fas fa-arrow-right"></i>',
    'turn-sharp-left': '<i class="fas fa-arrow-turn-left"></i>',
    'turn-sharp-right': '<i class="fas fa-arrow-turn-right"></i>',
    'turn-slight-left': '<i class="fas fa-arrow-left" style="opacity: 0.6;"></i>',
    'turn-slight-right': '<i class="fas fa-arrow-right" style="opacity: 0.6;"></i>',
    'straight': '<i class="fas fa-arrow-up"></i>',
    'uturn-left': '<i class="fas fa-rotate-left"></i>',
    'uturn-right': '<i class="fas fa-rotate-right"></i>',
    'merge': '<i class="fas fa-code-merge"></i>',
    'fork-left': '<i class="fas fa-code-branch"></i>',
    'fork-right': '<i class="fas fa-code-branch"></i>',
    'ramp-left': '<i class="fas fa-arrow-up-right"></i>',
    'ramp-right': '<i class="fas fa-arrow-up-right"></i>',
  };
  
  return icons[maneuver] || '<i class="fas fa-arrow-up"></i>';
}

// Function to find current step based on driver position
function findCurrentStep(driverPosition) {
  if (!allNavigationSteps || allNavigationSteps.length === 0) {
    return;
  }

  // Check if driver has passed the current step's end location
  if (currentStepIndex < allNavigationSteps.length) {
    const currentStep = allNavigationSteps[currentStepIndex];
    const endLocation = currentStep.endLocation;
    
    if (endLocation) {
      const distanceToEnd = calculateDistance(
        driverPosition.lat,
        driverPosition.lng,
        endLocation.lat(),
        endLocation.lng()
      );
      
      // If within 50 meters of step end, move to next step
      if (distanceToEnd < 0.05) { // 50 meters in kilometers
        currentStepIndex++;
        updateNavigationInstruction();
      }
    }
  }
}

// Helper function to calculate distance between two points (Haversine formula)
function calculateDistance(lat1, lng1, lat2, lng2) {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Export functions for global access
window.centerMapOnLocation = centerMapOnLocation;
window.toggleTrafficLayer = toggleTrafficLayer;
window.toggleSatelliteView = toggleSatelliteView;
window.refreshCurrentRoute = refreshCurrentRoute;
window.startTripNavigation = startTripNavigation;
window.executeDirection = executeDirection;
window.findCurrentStep = findCurrentStep;
window.updateNavigationInstruction = updateNavigationInstruction;