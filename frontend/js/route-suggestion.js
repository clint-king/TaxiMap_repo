// Route Suggestion - User-Friendly Version
import axios from 'axios';
import { BASE_URL } from './AddressSelection.js';

// Create axios instance with credentials for API calls
const apiClient = axios.create({
  withCredentials: true,
  baseURL: BASE_URL
});

// Global variables
let currentStep = 1;
let map = null;
let drawMode = false;
let currentRoute = null;
let startMarker = null;
let endMarker = null;
let routeCoordinates = [];
let newLocationType = null;
let selectedRouteType = null;
let isStraightRoute = true;
let routeMarkers = [];
let coords = [];
let selectedStartLocation = null;
let selectedEndLocation = null;
let markerChosenForEditing = null;
let markerChosenForRemoval = null;
let globalMarkerBehind = null;
let globalMarkerFoward = null;
let newDraggableMarker = null;
let currentColor = '#193148';
let routeFinished = false;

// Multiple route management variables
let listOfRoutes = [];
let routeCount = 1;
let currentStateNameId = 1;
let savedCurrentRouteObj = null;
let routeObj = null;
let colors = ['#eba9b7', '#BCF9F9', '#F9E1BC', '#C1F9BC', '#A9C6EB'];
let routeToDelete = null;

// Route class for managing multiple routes
class Route {
  name;
  listOfCoords = [];
  message;
  price = 0;
  
  // Variables for drawing management
  routeMarkers = [];
  coords = [];
  isLoopRoutefinished = false;
  
  constructor(name) {
    this.name = name;
  }
  
  hasRouteEnded(flag) {
    this.isLoopRoutefinished = flag;
  }
  
  AddMessage(message) {
    this.message = message;
  }
  
  AddPrice(price) {
    this.price = price;
  }
  
  AddListofMarkers(routeMarkers) {
    if (routeMarkers.length === 0) return false;
    this.routeMarkers.push(...routeMarkers);
    return true;
  }
  
  AddCoords(coords) {
    if (coords.length === 0) return false;
    this.coords.push(...coords);
    return true;
  }
  
  AddRouteCoords(listOfCoords) {
    if (listOfCoords.length === 0) return false;
    this.listOfCoords.push(...listOfCoords);
    return true;
  }
  
  RoutePrint() {
    return `name: ${this.name}, message: ${this.message}, price: ${this.price}, listOfCoords: ${this.listOfCoords.length} points`;
  }
}

// Select route type (Straight or Loop)
function selectRouteType(type) {
  selectedRouteType = type;
  isStraightRoute = type === 'Straight';
  
  // Update UI
  document.querySelectorAll('.route-type-card').forEach(card => {
    card.classList.remove('selected');
  });
  
  event.currentTarget.classList.add('selected');
  
  // Update step 2 description
  const step2Description = document.getElementById('step2Description');
  const endLocationInput = document.getElementById('endLocation');
  
  if (isStraightRoute) {
    step2Description.textContent = 'Choose your starting and destination taxi ranks';
    document.getElementById('endLocationGroup').style.display = 'block';
    endLocationInput.required = true;
  } else {
    step2Description.textContent = 'Choose your starting taxi rank (loop route)';
    document.getElementById('endLocationGroup').style.display = 'none';
    endLocationInput.required = false;
    endLocationInput.value = ''; // Clear the value for loop routes
  }
  
  // Update step 1 UI
  updateStep1UI();
  
  // Auto-advance to next step after selection
  setTimeout(() => {
    nextStep();
  }, 500);
}

// Update step 1 UI
function updateStep1UI() {
  // Step 1 doesn't have a next button - route type selection is handled by the cards
  // This function is kept for consistency but doesn't need to do anything
  console.log('Step 1 UI Update:', {
    selectedRouteType,
    isComplete: selectedRouteType !== null
  });
}

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
  initializeApp();
});

async function initializeApp() {
  try {
    // Authentication is now handled by requireClientAuth() in route-suggestion.html
    // Just verify userProfile exists (requireClientAuth already checked backend)
    const userProfile = localStorage.getItem('userProfile');
    if (!userProfile) {
      // If somehow we got here without userProfile, redirect
      // But this shouldn't happen since requireClientAuth handles it
      console.log('No user profile found, redirecting to login');
      window.location.href = 'login.html';
      return;
    }

    // Initialize map
    await initializeMap();
    
    // Setup event listeners
    setupEventListeners();
    
    // Initialize UI state
    updateStepDisplay();
    
    // Initialize end location input state (default to straight route)
    const endLocationInput = document.getElementById('endLocation');
    if (endLocationInput) {
      endLocationInput.required = true;
    }
    
    // Initialize step 1 UI
    updateStep1UI();
    
    console.log('Route suggestion app initialized successfully');
  } catch (error) {
    console.error('Error initializing app:', error);
    showMessage('Error initializing application. Please refresh the page.', 'error');
  }
}

// Initialize Mapbox map
async function initializeMap() {
  try {
    mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN;
    
    map = new mapboxgl.Map({
      container: 'map',
      style: 'mapbox://styles/mapbox/streets-v11',
      center: [28.0473, -26.2041], // Johannesburg
      zoom: 10
    });

    // Add navigation controls
    map.addControl(new mapboxgl.NavigationControl());

    // Setup map click handler for drawing
    map.on('click', handleMapClick);
    
    // Setup map load handler
    map.on('load', () => {
      console.log('Map loaded successfully');
    });

  } catch (error) {
    console.error('Error initializing map:', error);
    showMessage('Error loading map. Please check your internet connection.', 'error');
  }
}

// Setup all event listeners
function setupEventListeners() {
  // Location search (only set up if elements exist)
  const startLocation = document.getElementById('startLocation');
  const endLocation = document.getElementById('endLocation');
  
  if (startLocation) {
    setupLocationSearch('startLocation', 'startSuggestions');
  }
  
  if (endLocation) {
    setupLocationSearch('endLocation', 'endSuggestions');
  }

  // Price input event listener
  const routePrice = document.getElementById('routePrice');
  if (routePrice) {
    routePrice.addEventListener('input', () => {
      updateStep3UI();
    });
  }

  // Form validation
  setupFormValidation();
  
  // Context menu event listeners
  setupContextMenuListeners();
  
  // Remove route menu event listeners
  setupRemoveRouteMenuListeners();
  
  // Window resize listener for map
  window.addEventListener('resize', () => {
    if (map) {
      map.resize();
    }
  });
}

// Setup location search functionality
function setupLocationSearch(inputId, suggestionsId) {
  const input = document.getElementById(inputId);
  const suggestions = document.getElementById(suggestionsId);
  
  let searchTimeout;
  
  input.addEventListener('input', (e) => {
    clearTimeout(searchTimeout);
    const query = e.target.value.trim();
    
    // Update step 2 UI whenever input changes
    updateStep2UI();
    
    if (query.length < 2) {
      suggestions.classList.remove('show');
      return;
    }
    
    searchTimeout = setTimeout(() => {
      searchLocations(query, suggestions);
    }, 300);
  });
  
  // Hide suggestions when clicking outside
  document.addEventListener('click', (e) => {
    if (!input.contains(e.target) && !suggestions.contains(e.target)) {
      suggestions.classList.remove('show');
    }
  });
}

// Search for locations
async function searchLocations(query, suggestionsContainer) {
  try {
    const response = await apiClient.get('/admin/listTaxiRanks');
    const locations = response.data;
    
    const filtered = locations.filter(location => 
      location.name.toLowerCase().includes(query.toLowerCase()) ||
      location.address?.toLowerCase().includes(query.toLowerCase())
    );
    
    displayLocationSuggestions(filtered, suggestionsContainer);
  } catch (error) {
    console.error('Error searching locations:', error);
    showMessage('Error searching locations. Please try again.', 'error');
  }
}

// Display location suggestions
function displayLocationSuggestions(locations, container) {
  container.innerHTML = '';
  
  if (locations.length === 0) {
    container.innerHTML = '<div class="suggestion-item">No locations found</div>';
  } else {
    locations.forEach(location => {
      const item = document.createElement('div');
      item.className = 'suggestion-item';
      item.innerHTML = `
        <div><strong>${location.name}</strong></div>
        <div style="font-size: 0.9rem; color: #666;">${location.address || location.province}</div>
      `;
      
      item.addEventListener('click', () => {
        const input = container.previousElementSibling.querySelector('input');
        input.value = location.name;
        container.classList.remove('show');
        
        // Store selected location data
        if (input.id === 'startLocation') {
          selectedStartLocation = location;
        } else if (input.id === 'endLocation') {
          selectedEndLocation = location;
        }
        
        // Add marker to map
        addLocationMarker(location, input.id === 'startLocation' ? 'start' : 'end');
        
        // Update step 2 UI to enable/disable next button
        updateStep2UI();
      });
      
      container.appendChild(item);
    });
  }
  
  container.classList.add('show');
}

// Add location marker to map
function addLocationMarker(location, type) {
  // Remove existing marker
  if (type === 'start' && startMarker) {
    startMarker.remove();
  } else if (type === 'end' && endMarker) {
    endMarker.remove();
  }
  
  // Parse coordinates - handle different formats
  let coords = [0, 0];
  
  // Check both location_coord and coord fields
  const coordData = location.location_coord || location.coord;
  
  if (coordData) {
    console.log('Parsing coordinates:', coordData, 'Type:', typeof coordData);
    try {
      // Check if it's already an array/object
      if (Array.isArray(coordData)) {
        coords = coordData;
      } else if (typeof coordData === 'object' && coordData.lng && coordData.lat) {
        coords = [coordData.lng, coordData.lat];
      } else if (typeof coordData === 'object' && coordData.longitude && coordData.latitude) {
        coords = [coordData.longitude, coordData.latitude];
      } else if (typeof coordData === 'string') {
        // Try to parse as JSON first
        try {
          const parsed = JSON.parse(coordData);
          if (Array.isArray(parsed)) {
            coords = parsed;
          } else if (parsed.lng && parsed.lat) {
            coords = [parsed.lng, parsed.lat];
          } else if (parsed.longitude && parsed.latitude) {
            coords = [parsed.longitude, parsed.latitude];
          }
        } catch (jsonError) {
          // If JSON parsing fails, try POINT format
          if (coordData.startsWith('POINT(')) {
            const pointStr = coordData.replace('POINT(', '').replace(')', '');
            const parts = pointStr.split(' ');
            if (parts.length >= 2) {
              coords = [parseFloat(parts[0]), parseFloat(parts[1])];
            }
          }
        }
      }
    } catch (error) {
      console.error('Error parsing coordinates:', error, coordData);
      coords = [0, 0];
    }
  }
  
  console.log('Final parsed coordinates:', coords);
  
  // Create marker
  const marker = new mapboxgl.Marker({
    color: type === 'start' ? '#28a745' : '#dc3545'
  })
    .setLngLat(coords)
    .addTo(map);
  
  // Store marker reference
  if (type === 'start') {
    startMarker = marker;
  } else {
    endMarker = marker;
  }
  
  // Center map on marker
  map.flyTo({
    center: coords,
    zoom: Math.max(map.getZoom(), 12)
  });
}


// Setup form validation
function setupFormValidation() {
  const forms = document.querySelectorAll('form, .form-container');
  
  forms.forEach(form => {
    const inputs = form.querySelectorAll('input[required], select[required], textarea[required]');
    
    inputs.forEach(input => {
      input.addEventListener('blur', validateField);
      input.addEventListener('input', clearFieldError);
    });
  });
}

// Setup context menu event listeners
function setupContextMenuListeners() {
  // Close button
  const closeButton = document.getElementById('del_close_button');
  if (closeButton) {
    closeButton.addEventListener('click', () => {
      closeListMenu(false);
    });
  }
  
  // Edit button
  const editButton = document.getElementById('editbtnListMenu');
  if (editButton) {
    editButton.addEventListener('click', () => {
      if (!markerChosenForEditing) {
        showMessage('Could not edit route', 'error');
        return;
      }
      editRoute(markerChosenForEditing);
    });
  }
  
  // Remove button
  const removeButton = document.getElementById('removebtnListMenu');
  if (removeButton) {
    removeButton.addEventListener('click', () => {
      if (!markerChosenForRemoval) {
        showMessage('Could not remove route', 'error');
        return;
      }
      removeWaypointMarker(markerChosenForRemoval);
    });
  }
  
  // Edit marker menu buttons
  const editCloseButton = document.getElementById('edit_close_button');
  if (editCloseButton) {
    editCloseButton.addEventListener('click', () => {
      closeEditMarkerMenu();
    });
  }
  
  const editNoButton = document.getElementById('editNoBtn');
  if (editNoButton) {
    editNoButton.addEventListener('click', () => {
      closeEditMarkerMenu();
    });
  }
  
  const editYesButton = document.getElementById('editYesBtn');
  if (editYesButton) {
    editYesButton.addEventListener('click', () => {
      recreateRouteAfterEdit();
    });
  }
}

// Setup remove route menu event listeners
function setupRemoveRouteMenuListeners() {
  const removeRouteCloseBtn = document.getElementById('removeRoute_close_button');
  const removeRouteNoBtn = document.getElementById('removeRouteNoBtn');
  const removeRouteYesBtn = document.getElementById('removeRouteYesBtn');

  if (removeRouteCloseBtn) {
    removeRouteCloseBtn.addEventListener("click", () => {
      closeRemoveRouteMenu();
    });
  }

  if (removeRouteNoBtn) {
    removeRouteNoBtn.addEventListener("click", () => {
      closeRemoveRouteMenu();
    });
  }

  if (removeRouteYesBtn) {
    removeRouteYesBtn.addEventListener("click", () => {
      if (routeToDelete !== null) {
        removeRouteInfoDrawing(routeToDelete);
        console.log("Clicked route data-name:", routeToDelete);
        // Show current route
        showRoute(currentStateNameId);
        closeRemoveRouteMenu();
      }
    });
  }
}

// Validate individual field
function validateField(e) {
  const field = e.target;
  const value = field.value.trim();
  
  if (field.hasAttribute('required') && !value) {
    showFieldError(field, 'This field is required');
    return false;
  }
  
  if (field.type === 'email' && value && !isValidEmail(value)) {
    showFieldError(field, 'Please enter a valid email address');
    return false;
  }
  
  if (field.type === 'number' && value) {
    const num = parseFloat(value);
    const min = parseFloat(field.getAttribute('min'));
    const max = parseFloat(field.getAttribute('max'));
    
    if (min !== null && num < min) {
      showFieldError(field, `Value must be at least ${min}`);
      return false;
    }
    
    if (max !== null && num > max) {
      showFieldError(field, `Value must be at most ${max}`);
      return false;
    }
  }
  
  clearFieldError(e);
  return true;
}

// Show field error
function showFieldError(field, message) {
  clearFieldError({ target: field });
  
  field.style.borderColor = '#dc3545';
  
  const errorDiv = document.createElement('div');
  errorDiv.className = 'field-error';
  errorDiv.style.color = '#dc3545';
  errorDiv.style.fontSize = '0.875rem';
  errorDiv.style.marginTop = '0.25rem';
  errorDiv.textContent = message;
  
  field.parentNode.appendChild(errorDiv);
}

// Clear field error
function clearFieldError(e) {
  const field = e.target;
  field.style.borderColor = '';
  
  const errorDiv = field.parentNode.querySelector('.field-error');
  if (errorDiv) {
    errorDiv.remove();
  }
}

// Validate email
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}


// Step navigation functions
function nextStep() {
  if (validateCurrentStep()) {
    if (currentStep < 4) {
      currentStep++;
      updateStepDisplay();
      
      if (currentStep === 3) {
        initializeDrawingMap();
      } else if (currentStep === 4) {
        populateReviewData();
      }
    }
  }
}

function previousStep() {
  if (currentStep > 1) {
    currentStep--;
    updateStepDisplay();
  }
}

// Validate current step
function validateCurrentStep() {
  const currentStepElement = document.getElementById(`step-${currentStep}`);
  const requiredFields = currentStepElement.querySelectorAll('input[required], select[required], textarea[required]');
  
  let isValid = true;
  
  requiredFields.forEach(field => {
    if (!validateField({ target: field })) {
      isValid = false;
    }
  });
  
  // Additional step-specific validation
  if (currentStep === 1) {
    if (!selectedRouteType) {
      showMessage('Please select a route type.', 'error');
      isValid = false;
    }
  } else if (currentStep === 2) {
    const startLocation = document.getElementById('startLocation').value.trim();
    const endLocation = document.getElementById('endLocation').value.trim();
    
    if (!startLocation) {
      showMessage('Please select a starting taxi rank.', 'error');
      isValid = false;
    }
    
    if (isStraightRoute && !endLocation) {
      showMessage('Please select a destination taxi rank.', 'error');
      isValid = false;
    }
  } else if (currentStep === 3) {
    if (routeCoordinates.length < 2) {
      showMessage('Please draw a route with at least 2 points.', 'error');
      isValid = false;
    }
    
    const routePrice = document.getElementById('routePrice').value.trim();
    if (!routePrice) {
      showMessage('Please set a price for this route.', 'error');
      isValid = false;
    } else if (parseFloat(routePrice) <= 0) {
      showMessage('Please enter a valid price greater than 0.', 'error');
      isValid = false;
    }
  }
  
  return isValid;
}

// Update step display
function updateStepDisplay() {
  // Update progress steps
  document.querySelectorAll('.step').forEach((step, index) => {
    const stepNumber = index + 1;
    step.classList.remove('active', 'completed');
    
    if (stepNumber === currentStep) {
      step.classList.add('active');
    } else if (stepNumber < currentStep) {
      step.classList.add('completed');
    }
  });
  
  // Update step content
  document.querySelectorAll('.step-content').forEach((content, index) => {
    const stepNumber = index + 1;
    content.classList.remove('active');
    
    if (stepNumber === currentStep) {
      content.classList.add('active');
    }
  });
  
  // Update step-specific UI
  if (currentStep === 1) {
    updateStep1UI();
  } else if (currentStep === 2) {
    updateStep2UI();
  } else if (currentStep === 3) {
    updateStep3UI();
    // Resize map when step 3 becomes active
    setTimeout(() => {
      if (map) {
        map.resize();
      }
    }, 200);
  }
}

// Update step 2 UI
function updateStep2UI() {
  const step2NextBtn = document.getElementById('step2NextBtn');
  
  if (!step2NextBtn) {
    console.log('Step 2 next button not found');
    return;
  }
  
  // Enable/disable next button based on completion
  const startLocation = document.getElementById('startLocation').value.trim();
  const endLocation = document.getElementById('endLocation').value.trim();
  
  let isComplete = startLocation;
  if (isStraightRoute) {
    isComplete = isComplete && endLocation;
  }
  
  console.log('Step 2 UI Update:', {
    startLocation,
    endLocation,
    isStraightRoute,
    isComplete,
    startLocationLength: startLocation ? startLocation.length : 0,
    endLocationLength: endLocation ? endLocation.length : 0
  });
  
  step2NextBtn.disabled = !isComplete;
}

// Initialize drawing map
function initializeDrawingMap() {
  if (!map) {
    initializeMap();
  }
  
  // Resize map to ensure proper sizing when container becomes visible
  setTimeout(() => {
    if (map) {
      map.resize();
    }
  }, 100);
  
  // Clear any existing routes and markers
  clearRoute();
  
  // Add taxi rank markers
  addTaxiRankMarkers();
  
  // Initialize first route if not exists
  if (!routeObj) {
    routeObj = new Route("1");
    currentStateNameId = 1;
    currentColor = colors[0];
  }
  
  // Setup drawing mode
  setupDrawingMode();
  
  // Update step 3 UI
  updateStep3UI();
}

// Add taxi rank markers to map
function addTaxiRankMarkers() {
  // Clear existing markers
  if (startMarker) startMarker.remove();
  if (endMarker) endMarker.remove();
  
  // Initialize coords array
  coords = [];
  
  // Add starting marker
  const startLocation = document.getElementById('startLocation').value;
  if (startLocation) {
    // Find the taxi rank data
    const startCoords = getTaxiRankCoordinates(startLocation);
    if (startCoords) {
      startMarker = new mapboxgl.Marker({ color: '#28a745' })
        .setLngLat(startCoords)
        .addTo(map);
      coords[0] = startCoords;
    }
  }
  
  // Add destination marker (only for straight routes)
  if (isStraightRoute) {
    const endLocation = document.getElementById('endLocation').value;
    if (endLocation) {
      const endCoords = getTaxiRankCoordinates(endLocation);
      if (endCoords) {
        endMarker = new mapboxgl.Marker({ color: '#dc3545' })
          .setLngLat(endCoords)
          .addTo(map);
        coords[1] = endCoords;
      }
    }
  }
  
  // Fit map to show all markers
  if (coords.length > 0) {
    const bounds = new mapboxgl.LngLatBounds();
    coords.forEach(coord => bounds.extend(coord));
    map.fitBounds(bounds, { padding: 100 });
  }
}

// Get taxi rank coordinates by name
function getTaxiRankCoordinates(name) {
  let location = null;
  
  console.log('Getting coordinates for:', name);
  console.log('selectedStartLocation:', selectedStartLocation);
  console.log('selectedEndLocation:', selectedEndLocation);
  
  // Find the location data
  if (name === selectedStartLocation?.name) {
    location = selectedStartLocation;
    console.log('Found in selectedStartLocation');
  } else if (name === selectedEndLocation?.name) {
    location = selectedEndLocation;
    console.log('Found in selectedEndLocation');
  }
  
  if (!location) {
    console.log('Location not found for:', name);
    return [28.0473, -26.2041]; // Default to Johannesburg
  }
  
  // Parse coordinates using the same logic as addLocationMarker
  const coordData = location.location_coord || location.coord;
  
  if (coordData) {
    try {
      // Check if it's already an array/object
      if (Array.isArray(coordData)) {
        return coordData;
      } else if (typeof coordData === 'object' && coordData.lng && coordData.lat) {
        return [coordData.lng, coordData.lat];
      } else if (typeof coordData === 'object' && coordData.longitude && coordData.latitude) {
        return [coordData.longitude, coordData.latitude];
      } else if (typeof coordData === 'string') {
        // Try to parse as JSON first
        try {
          const parsed = JSON.parse(coordData);
          if (Array.isArray(parsed)) {
            return parsed;
          } else if (parsed.lng && parsed.lat) {
            return [parsed.lng, parsed.lat];
          } else if (parsed.longitude && parsed.latitude) {
            return [parsed.longitude, parsed.latitude];
          }
        } catch (e) {
          // If JSON parsing fails, try POINT format
          const pointMatch = coordData.match(/POINT\(([^)]+)\)/);
          if (pointMatch) {
            const coords = pointMatch[1].split(' ').map(Number);
            return [coords[0], coords[1]]; // lng, lat
          }
        }
      }
    } catch (error) {
      console.error('Error parsing coordinates:', error);
    }
  }
  
  console.log('Could not parse coordinates for:', name, coordData);
  return [28.0473, -26.2041]; // Default to Johannesburg
}

// Update step 3 UI
function updateStep3UI() {
  const step3NextBtn = document.getElementById('step3NextBtn');
  const routePrice = document.getElementById('routePrice');
  
  // Enable/disable next button based on route completion and price
  const hasRoute = routeCoordinates.length >= 2;
  const hasPrice = routePrice && routePrice.value.trim() && parseFloat(routePrice.value) > 0;
  const isComplete = hasRoute && hasPrice;
  
  console.log('Step 3 UI Update:', {
    routeCoordinatesLength: routeCoordinates.length,
    hasRoute,
    routePriceValue: routePrice ? routePrice.value : 'no price element',
    hasPrice,
    isComplete,
    buttonDisabled: !isComplete
  });
  
  step3NextBtn.disabled = !isComplete;
  
  // Update button text to indicate what's missing
  if (!hasRoute && !hasPrice) {
    step3NextBtn.innerHTML = 'Draw route and set price <i class="fas fa-arrow-right"></i>';
  } else if (!hasRoute) {
    step3NextBtn.innerHTML = 'Draw route to continue <i class="fas fa-arrow-right"></i>';
  } else if (!hasPrice) {
    step3NextBtn.innerHTML = 'Set route price <i class="fas fa-arrow-right"></i>';
  } else {
    step3NextBtn.innerHTML = 'Next: Review Route <i class="fas fa-arrow-right"></i>';
  }
}

// Handle map click for drawing
// Handle map click for drawing (simplified from clientCrowdSource)
async function handleMapClick(e) {
  if (!drawMode) return;
  
  const lngLat = [e.lngLat.lng, e.lngLat.lat];
  
  // Add coordinate to coords array
  coords.push(lngLat);
  
  console.log('Current coords array:', coords);
  console.log('Current routeCoordinates array:', routeCoordinates);
  console.log('Current routeMarkers array length:', routeMarkers.length);
  
  let previous, current;
  
  if (coords.length === 2) {
    // First connection: point 1 → point 2
    previous = coords[0];
    current = coords[1];
    if (isStraightRoute === false) {
      routeCoordinates.length = 0; // reset previous route
      routeCoordinates.push(previous);
    }
  } else if (coords.length === 3 && isStraightRoute === true) {
    // Replace route: point 1 → point 3
    previous = coords[0];
    current = coords[2];
    routeCoordinates.length = 0; // reset previous route
    routeCoordinates.push(previous);
  } else if (coords.length > 3 || (coords.length === 3 && isStraightRoute === false)) {
    // Continue from last added point
    previous = coords[coords.length - 2];
    current = coords[coords.length - 1];
  }
  
  if (previous && current) {
    try {
      console.log('Generating route segment between:', previous, 'and', current);
      const segment = await routeGeneration(previous, current);
      
      console.log('Received segment:', segment);
      console.log('Segment type:', typeof segment);
      console.log('Is array:', Array.isArray(segment));
      
      if (!segment || !Array.isArray(segment)) {
        throw new Error('Invalid segment data received');
      }
      
      if (coords.length === 3 || (coords.length === 2 && isStraightRoute === false)) {
        console.log('Adding segment (first connection):', segment.slice(1));
        routeCoordinates.push(...segment.slice(1)); // skip duplicate
      } else if (coords.length > 3) {
        console.log('Adding segment (continuation):', segment.slice(1));
        routeCoordinates.push(...segment.slice(1));
      }

      updateRouteOnMap({
        type: 'LineString',
        coordinates: routeCoordinates
      });
      
      // Create waypoint marker
      createCustomPointMarker(lngLat);
      
      // Update status
      const status = document.getElementById('drawStatus');
      if (status) {
        status.textContent = `Route points: ${coords.length}. Click to add more waypoints.`;
      }
      
      // Update step 3 UI to enable/disable next button
      updateStep3UI();
      
    } catch (error) {
      console.error('Error generating route segment:', error);
      showMessage('Error generating route segment. Please try again.', 'error');
    }
  }
}

// Toggle draw mode
// Setup drawing mode (simplified from clientCrowdSource)
function setupDrawingMode() {
  // Don't enable drawing mode by default - user must click "Start Drawing"
  drawMode = false;
  const status = document.getElementById('drawStatus');
  status.textContent = 'Click "Start Drawing" to begin drawing your route';
  map.getCanvas().style.cursor = '';
  
  // Disable buttons initially
  const clearBtn = document.getElementById('clearRouteBtn');
  const finishBtn = document.getElementById('finishRouteBtn');
  clearBtn.disabled = true;
  finishBtn.disabled = true;
}

function toggleDrawMode() {
  // Don't allow toggling if route is already finished
  if (routeFinished) {
    showMessage('Route is already completed. Use "Clear Route" to start over.', 'warning');
    return;
  }
  
  drawMode = !drawMode;
  const drawBtn = document.getElementById('drawRouteBtn');
  const clearBtn = document.getElementById('clearRouteBtn');
  const finishBtn = document.getElementById('finishRouteBtn');
  const status = document.getElementById('drawStatus');
  
  if (drawMode) {
    drawBtn.innerHTML = '<i class="fas fa-stop"></i> Stop Drawing';
    drawBtn.classList.remove('btn-outline');
    drawBtn.classList.add('btn-success');
    clearBtn.disabled = false;
    finishBtn.disabled = false;
    status.textContent = 'Click on the map to add waypoints to your route.';
    map.getCanvas().style.cursor = 'crosshair';
  } else {
    drawBtn.innerHTML = '<i class="fas fa-pencil-alt"></i> Start Drawing';
    drawBtn.classList.remove('btn-success');
    drawBtn.classList.add('btn-outline');
    status.textContent = 'Drawing stopped. Click "Start Drawing" to continue adding waypoints.';
    map.getCanvas().style.cursor = '';
    clearBtn.disabled = true;
    finishBtn.disabled = true;
  }
  
  updateStep3UI();
}

// Finish route drawing (copied from clientCrowdSource lastConnection)
async function finishRoute() {
  if (isStraightRoute === true) {
    // Straight case - connect to destination marker
    console.log("Finishing straight route - connecting to destination");
    
    if (coords.length >= 3) {
      const lastCoord = coords.length - 1;
      const markerCoord = endMarker.getLngLat();
      const coordPair = `${coords[lastCoord].join(',')};${[markerCoord.lng, markerCoord.lat].join(',')}`;
      
      try {
        const segment = await routeGeneration(coords[lastCoord], [markerCoord.lng, markerCoord.lat]);
        routeCoordinates.push(...segment.slice(1));
        
        updateRouteOnMap({
          type: 'LineString',
          coordinates: routeCoordinates
        });
        
        // End route
        drawMode = false;
        routeFinished = true;  // Mark route as finished
        const drawBtn = document.getElementById('drawRouteBtn');
        const status = document.getElementById('drawStatus');
        
        drawBtn.innerHTML = '<i class="fas fa-pencil-alt"></i> Start Drawing';
        drawBtn.classList.remove('btn-success');
        drawBtn.classList.add('btn-outline');
        status.textContent = `Route completed! Connected to destination.`;
        map.getCanvas().style.cursor = '';
        
        // Save completed route
        saveCompletedRoute();
        
        updateStep3UI();
        updateRouteManagementUI();
        showMessage('Route completed successfully!', 'success');
        
      } catch (error) {
        console.error('Error finishing route:', error);
        showMessage('Error completing route. Please try again.', 'error');
      }
    } else {
      showMessage('Please draw at least 2 waypoints before finishing the route.', 'error');
    }
    
  } else {
    // Loop case - connect back to starting marker
    console.log("Finishing loop route - connecting to starting point");
    
    if (coords.length >= 2) {
      const lastCoord = coords.length - 1;
      const markerCoord = startMarker.getLngLat();
      const coordPair = `${coords[lastCoord].join(',')};${[markerCoord.lng, markerCoord.lat].join(',')}`;
      
      try {
        const segment = await routeGeneration(coords[lastCoord], [markerCoord.lng, markerCoord.lat]);
        routeCoordinates.push(...segment.slice(1));
        
        updateRouteOnMap({
          type: 'LineString',
          coordinates: routeCoordinates
        });
        
        // End route
        drawMode = false;
        routeFinished = true;  // Mark route as finished
        const drawBtn = document.getElementById('drawRouteBtn');
        const status = document.getElementById('drawStatus');
        
        drawBtn.innerHTML = '<i class="fas fa-pencil-alt"></i> Start Drawing';
        drawBtn.classList.remove('btn-success');
        drawBtn.classList.add('btn-outline');
        status.textContent = `Loop route completed! Connected back to starting point.`;
        map.getCanvas().style.cursor = '';
        
        // Save completed route
        saveCompletedRoute();
        
        updateStep3UI();
        updateRouteManagementUI();
        showMessage('Loop route completed successfully!', 'success');
        
      } catch (error) {
        console.error('Error finishing loop route:', error);
        showMessage('Error completing loop route. Please try again.', 'error');
      }
    } else {
      showMessage('Please draw at least 1 waypoint before finishing the loop route.', 'error');
    }
  }
}

// Clear route (simplified from clientCrowdSource)
function clearRoute() {
  // Remove route from map
  if (map.getSource('route')) {
    map.removeLayer('route');
    map.removeSource('route');
  }
  
  // Remove all waypoint markers
  routeMarkers.forEach(marker => {
    if (marker) marker.remove();
  });
  
  // Reset arrays
  routeCoordinates = [];
  routeMarkers = [];
  coords = [];
  
  // Reset context menu variables
  markerChosenForEditing = null;
  markerChosenForRemoval = null;
  globalMarkerBehind = null;
  globalMarkerFoward = null;
  newDraggableMarker = null;
  
  // Close context menu if open
  closeListMenu(false);
  closeEditMarkerMenu();
  
  // Reset drawing mode and button states
  drawMode = false;
  routeFinished = false;
  const drawBtn = document.getElementById('drawRouteBtn');
  const clearBtn = document.getElementById('clearRouteBtn');
  const finishBtn = document.getElementById('finishRouteBtn');
  const status = document.getElementById('drawStatus');
  
  if (drawBtn) {
    drawBtn.innerHTML = '<i class="fas fa-pencil-alt"></i> Start Drawing';
    drawBtn.classList.remove('btn-success');
    drawBtn.classList.add('btn-outline');
  }
  
  if (clearBtn) clearBtn.disabled = true;
  if (finishBtn) finishBtn.disabled = true;
  
  if (status) {
    status.textContent = 'Click "Start Drawing" to begin drawing your route';
  }
  
  // Reset cursor
  if (map) {
    map.getCanvas().style.cursor = '';
  }
  
  // Don't clear price field - all routes share the same price
  // Price should only be cleared when starting a completely new route
  
  // Re-add taxi rank markers
  addTaxiRankMarkers();
  
  updateStep3UI();
  updateRouteManagementUI();
}

// Update route display on map (simplified from clientCrowdSource)
function updateRouteOnMap(geojson) {
  if (map.getSource('route')) {
    // Update the existing route with new data
    map.getSource('route').setData(geojson);
  } else {
    // Add the route to the map for the first time
    map.addSource('route', {
      type: 'geojson',
      data: geojson
    });

    map.addLayer({
      id: 'route',
      type: 'line',
      source: 'route',
      layout: {
        'line-join': 'round',
        'line-cap': 'round'
      },
      paint: {
        'line-color': '#193148',
        'line-width': 4
      }
    });
  }
}

// Create custom waypoint marker (simplified from clientCrowdSource)
function createCustomPointMarker(lngLat) {
  const el = document.createElement('div');
  el.style.width = '12px';
  el.style.height = '12px';
  el.style.borderRadius = '50%';
  el.style.backgroundColor = '#007bff';
  el.style.border = '2px solid white';
  el.style.boxShadow = '0 2px 4px rgba(0,0,0,0.3)';

  const newMarker = new mapboxgl.Marker(el)
    .setLngLat(lngLat)
    .addTo(map);

  // Add to the list for reference
  routeMarkers.push(newMarker);
  
  // Add metadata
  newMarker.coordIndex = coords.length - 1;
  newMarker.routeStartingIndex = routeCoordinates.length - 1;
  newMarker.routeMarkerIndex = routeMarkers.length - 1;
  
  // Add context menu functionality
  newMarker.getElement().addEventListener('contextmenu', (event) => {
    event.preventDefault();
    event.stopPropagation();
    
    if (markerChosenForRemoval === null && markerChosenForEditing === null) {
      openListMenu();
      markerChosenForRemoval = newMarker;
      markerChosenForEditing = newMarker;
    }
  });
}

// Generate route segment between two points (from clientCrowdSource)
async function routeGeneration(coordFrom, coordTo) {
  try {
    const token = import.meta.env.VITE_MAPBOX_TOKEN;
    if (!token) {
      throw new Error('Mapbox token not found');
    }
    
    const coordPair = `${coordFrom.join(',')};${coordTo.join(',')}`;
    const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${coordPair}?geometries=geojson&access_token=${token}`;
    
    console.log('Requesting route from:', coordFrom, 'to:', coordTo);
    console.log('URL:', url);
    console.log('Token available:', !!token);
    
    const response = await fetch(url);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('API Error Response:', errorText);
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('Mapbox API response:', data);
    
    if (!data.routes || !data.routes[0] || !data.routes[0].geometry) {
      console.error('Invalid API response structure:', data);
      throw new Error('Invalid API response structure');
    }
    
    const segment = data.routes[0].geometry;
    console.log('Route segment:', segment);
    
    if (!segment.coordinates) {
      console.error('No coordinates in route segment:', segment);
      throw new Error('No coordinates in route segment');
    }
    
    console.log('Returning coordinates:', segment.coordinates);
    return segment.coordinates;
  } catch (error) {
    console.error('Error in routeGeneration:', error);
    // Return a simple straight line as fallback
    console.log('Using fallback straight line');
    return [coordFrom, coordTo];
  }
}

// Context Menu Functions (from clientCrowdSource)
function openListMenu() {
  const listmenu = document.getElementById('markerContextMenu');
  if (listmenu) {
    listmenu.style.visibility = 'visible';
  }
}

function closeListMenu(isEditing = false) {
  const listmenu = document.getElementById('markerContextMenu');
  if (listmenu) {
    listmenu.style.visibility = 'hidden';
  }
  markerChosenForRemoval = null;
  if (!isEditing) markerChosenForEditing = null;
}

// Remove marker function (copied exactly from clientCrowdSource)
function removeWaypointMarker(clickedMarker) {
  const markerCoords = clickedMarker.getLngLat();
  const routeStartingIndex = clickedMarker.routeStartingIndex;
  const coordIndex = clickedMarker.coordIndex;
  const markerIndex = clickedMarker.routeMarkerIndex;

  console.log("**MARKER** coordinates found:", markerCoords);
  console.log("**MARKER** routeStartingIndex:", routeStartingIndex);
  console.log("**MARKER** coordIndex:", coordIndex);
  console.log("**MARKER** routeMarkerIndex:", markerIndex);

  const source = map.getSource('route');

  if (source) {
    updateRouteOnMap({
      type: 'LineString',
      coordinates: routeCoordinates.slice(0, routeStartingIndex + 1)
    });

    for (let i = markerIndex + 1; i < routeMarkers.length; i++) {
      const marker = routeMarkers[i];
      if (marker) {
        marker.remove();
      }
    }

    routeCoordinates = routeCoordinates.slice(0, routeStartingIndex + 1);
    coords = coords.slice(0, coordIndex + 1);
    routeMarkers.length = markerIndex + 1;
  }

  // Close menu
  closeListMenu(false);
}

// Edit marker function (copied from clientCrowdSource)
function editRoute(clickedMarker) {
  const markerCoords = clickedMarker.getLngLat();
  const routeStartingIndex = clickedMarker.routeStartingIndex;
  const coordIndex = clickedMarker.coordIndex;

  console.log("**MARKER** coordinates found:", markerCoords);
  console.log("**MARKER** routeStartingIndex:", routeStartingIndex);
  console.log("**MARKER** coordIndex:", coordIndex);

  // Remove the original route
  tempRouteRemoval();

  const index = routeMarkers.findIndex((marker) => {
    return markerCoords.lng === marker.getLngLat().lng &&
           markerCoords.lat === marker.getLngLat().lat;
  });

  if (index === -1) {
    console.log("index is -1");
    return;
  }

  let indexBehind = index - 1;
  if (indexBehind < 0) indexBehind = null;

  let indexFoward = index + 1;
  if (indexFoward >= routeMarkers.length) indexFoward = null;

  const markerBehind = indexBehind !== null ? routeMarkers[indexBehind] : null;
  const markerFoward = indexFoward !== null ? routeMarkers[indexFoward] : null;

  console.log("markerBehind:", markerBehind);
  console.log("markerFoward:", markerFoward);

  // The behind portion
  let startingIndex;
  if (markerBehind === null) {
    startingIndex = 0;
  } else {
    startingIndex = markerBehind.routeStartingIndex;
  }
  console.log("startingIndex:", startingIndex);
  console.log("routeCoordinates:", routeCoordinates);

  if (startingIndex >= 0) {
    console.log("first index:", 0, "startingIndex of markerBehind:", startingIndex + 1);
    const routeBehind = routeCoordinates.slice(0, startingIndex + 1);
    drawRouteBehind(routeBehind, currentColor);
  } else {
    console.log("startingIndex:", startingIndex);
  }

  // The forward portion
  let endingIndex;
  if (markerFoward === null) {
    endingIndex = routeCoordinates.length;
  } else {
    endingIndex = markerFoward.routeStartingIndex;
  }

  if (endingIndex >= 0) {
    const indexOfCurrentMarker = routeStartingIndex;
    console.log("indexOfCurrentMarker:", indexOfCurrentMarker, "endingIndex:", endingIndex);
    const routeFoward = routeCoordinates.slice(endingIndex, routeCoordinates.length);
    drawRouteFoward(routeFoward, currentColor);
  } else {
    console.log("endingIndex:", endingIndex);
  }

  // Insert global data
  globalMarkerBehind = markerBehind;
  globalMarkerFoward = markerFoward;
  console.log("globalMarkerBehind:", globalMarkerBehind);
  
  // Close menu
  closeListMenu(true);

  // Popup
  showMessage("Click in a new area to edit the route", 'info');

  // Make the marker draggable if it isn't already
  if (!clickedMarker._draggable) {
    const lngLat = clickedMarker.getLngLat();

    // Hide old marker
    clickedMarker.getElement().style.display = "none";

    // Create new draggable marker at the same spot
    const newMarker = new mapboxgl.Marker({
      color: 'orange',
      draggable: true
    })
      .setLngLat(lngLat)
      .addTo(map);

    // Copy over any metadata (like index)
    newMarker.coordIndex = clickedMarker.coordIndex;
    newMarker.routeStartingIndex = clickedMarker.routeStartingIndex;

    // Add dragend handler
    newMarker.on('dragend', () => {
      const newPos = newMarker.getLngLat();

      console.log("Dragged and dropped:", newPos);
      newDraggableMarker = newMarker;
      openEditMarkerMenu();
    });
  }
}

// Supporting functions (copied from clientCrowdSource)
function tempRouteRemoval() {
  // Route remove 
  if (map.getLayer('route')) {
    map.removeLayer('route');
  }
  if (map.getSource('route')) {
    map.removeSource('route');
  }
}

function drawRouteBehind(coords, color) {
  console.log("behind coords:", coords);

  map.addSource('routeBehind', {
    type: 'geojson',
    data: {
      type: 'LineString',
      coordinates: coords
    }
  });

  map.addLayer({
    id: 'routeBehind',
    type: 'line',
    source: 'routeBehind',
    layout: {
      'line-join': 'round',
      'line-cap': 'round'
    },
    paint: {
      'line-color': color,
      'line-width': 4
    }
  });
}

function drawRouteFoward(coords, color) {
  console.log("forward coords:", coords);

  map.addSource('routeFoward', {
    type: 'geojson',
    data: {
      type: 'LineString',
      coordinates: coords
    }
  });

  map.addLayer({
    id: 'routeFoward',
    type: 'line',
    source: 'routeFoward',
    layout: {
      'line-join': 'round',
      'line-cap': 'round'
    },
    paint: {
      'line-color': color,
      'line-width': 4
    }
  });
}

function deleteSideRoutes() {
  const routeIds = ['routeBehind', 'routeFoward'];

  routeIds.forEach((id) => {
    if (map.getLayer(id)) {
      map.removeLayer(id);
    }
    if (map.getSource(id)) {
      map.removeSource(id);
    }
  });

  console.log("Both routeBehind and routeFoward have been removed.");
}

function editRouteArrays(startingIndex, endingIndex, markerIndex, markerPosCoord, newCoords) {
  const deleteCount = endingIndex - startingIndex + 1;
  // Replace the chunk in routeCoordinates with newCoords

  routeCoordinates.splice(startingIndex, deleteCount, ...newCoords);
  coords[markerIndex] = markerPosCoord;

  console.log("Edit routeCoords 2:", ...newCoords);
  const newEndingIndex = startingIndex + newCoords.length - 1;
  return newEndingIndex;
}

async function recreateRouteAfterEdit() {
  let markerBehind;
  if (globalMarkerBehind) {
    markerBehind = globalMarkerBehind;
  } else {
    // Use starting taxi rank marker as fallback
    markerBehind = startMarker;
  }

  console.log("markerBehind in [recreateRouteAfterEdit]:", markerBehind);
  
  // BEHIND
  const routeBehind = await routeGeneration(
    [markerBehind.getLngLat().lng, markerBehind.getLngLat().lat],
    [newDraggableMarker.getLngLat().lng, newDraggableMarker.getLngLat().lat]
  );
  
  console.log("Edit routeCoords 1:", routeBehind);
  console.log("Routes coord before:", routeCoordinates);
  
  let startingIndex;
  if (!markerBehind.routeStartingIndex) {
    startingIndex = 0;
  } else {
    startingIndex = markerBehind.routeStartingIndex;
  }

  console.log("StartingIndex:", startingIndex);

  const newRouteIndex = editRouteArrays(
    startingIndex,
    markerChosenForEditing.routeStartingIndex,
    markerChosenForEditing.coordIndex,
    [newDraggableMarker.getLngLat().lng, newDraggableMarker.getLngLat().lat],
    routeBehind
  );
  
  console.log("Routes coord after:", routeCoordinates);

  // Revive the hidden marker with the right position 
  markerChosenForEditing.setLngLat([newDraggableMarker.getLngLat().lng, newDraggableMarker.getLngLat().lat]);
  markerChosenForEditing.routeStartingIndex = newRouteIndex;
  markerChosenForEditing.getElement().style.display = "";

  // The other part of the route
  deleteSideRoutes();

  updateRouteOnMap({
    type: 'LineString',
    coordinates: routeCoordinates
  });

  console.log("markerChosenForEditing index in Coords:", markerChosenForEditing.coordIndex);
  console.log("Coords:", coords);

  // Resetting 
  closeEditMarkerMenu();
  markerChosenForEditing = null;
  if (newDraggableMarker) {
    newDraggableMarker.remove();
    newDraggableMarker = null;
  }
}

// Edit marker menu functions
function openEditMarkerMenu() {
  const editMarkerMenu = document.getElementById('editMarkerMenu');
  if (editMarkerMenu) {
    editMarkerMenu.style.visibility = 'visible';
  }
}

function closeEditMarkerMenu() {
  const editMarkerMenu = document.getElementById('editMarkerMenu');
  if (editMarkerMenu) {
    editMarkerMenu.style.visibility = 'hidden';
  }
}

// Remove route menu functions
function openRemoveRouteMenu(routeNumber) {
  routeToDelete = routeNumber;
  const removeRouteMessage = document.getElementById('removeRouteMessage');
  if (removeRouteMessage) {
    removeRouteMessage.textContent = `Do you want to remove the route Route ${routeNumber}?`;
  }
  const removeRouteMenu = document.getElementById('removeRouteMenu');
  if (removeRouteMenu) {
    removeRouteMenu.style.visibility = "visible";
  }
}

function closeRemoveRouteMenu() {
  const removeRouteMenu = document.getElementById('removeRouteMenu');
  if (removeRouteMenu) {
    removeRouteMenu.style.visibility = "hidden";
  }
  routeToDelete = null;
}

// Remove route info and drawing (from clientCrowdSource)
function removeRouteInfoDrawing(nameId) {
  let getIndex = -1;
  listOfRoutes.forEach((routeLocalObj, index) => {
    if (routeLocalObj.name === `${nameId}`) {
      getIndex = index;
    }
  });

  if (getIndex !== -1) {
    listOfRoutes.splice(getIndex, 1);
    // Get the specific element
    let routeDiv = document.querySelector(`.route_div[data-name="${nameId}"]`);

    // Remove it from the DOM
    if (routeDiv) {
      routeDiv.remove();
    }
    
    // Routes keep their original numbers (no renumbering)
    
    // Update route management UI
    updateRouteManagementUI();
    
    showMessage(`Route ${nameId} deleted successfully.`, 'success');
  } else {
    console.log("ERROR: Could not find the route");
    showMessage("Error: Could not find the route to delete.", 'error');
  }
}

// Create new location
function createNewLocation(type) {
  newLocationType = type;
  document.getElementById('locationModal').classList.add('show');
  
  // Initialize location map
  initializeLocationMap();
}

// Initialize location map for new location creation
function initializeLocationMap() {
  const locationMap = new mapboxgl.Map({
    container: 'locationMap',
    style: 'mapbox://styles/mapbox/streets-v11',
    center: [28.0473, -26.2041],
    zoom: 10
  });
  
  // Initialize global marker reference as null
  window.locationMarker = null;
  
  // Setup address autocomplete
  setupAddressAutocomplete();
  
  locationMap.on('click', async (e) => {
    // Remove existing marker if it exists
    if (window.locationMarker) {
      window.locationMarker.remove();
    }
    
    // Create new marker and store in global reference
    window.locationMarker = new mapboxgl.Marker()
      .setLngLat([e.lngLat.lng, e.lngLat.lat])
      .addTo(locationMap);
    
    // Get address from coordinates (reverse geocoding)
    try {
      const address = await reverseGeocode(e.lngLat.lng, e.lngLat.lat);
      document.getElementById('newLocationAddress').value = address;
    } catch (error) {
      console.error('Error getting address:', error);
      document.getElementById('newLocationAddress').value = `${e.lngLat.lat.toFixed(6)}, ${e.lngLat.lng.toFixed(6)}`;
    }
  });
  
  // Store map reference for later use
  window.locationMap = locationMap;
  
  console.log('Location map initialized:', window.locationMap);
}

// Setup address autocomplete for location creation
function setupAddressAutocomplete() {
  const addressInput = document.getElementById('newLocationAddress');
  const suggestionsContainer = document.getElementById('addressSuggestions');
  let searchTimeout;

  addressInput.addEventListener('input', (e) => {
    clearTimeout(searchTimeout);
    const query = e.target.value.trim();
    
    if (query.length < 3) {
      suggestionsContainer.style.display = 'none';
      return;
    }
    
    searchTimeout = setTimeout(() => {
      searchAddresses(query, suggestionsContainer);
    }, 300);
  });

  // Hide suggestions when clicking outside
  document.addEventListener('click', (e) => {
    if (!addressInput.contains(e.target) && !suggestionsContainer.contains(e.target)) {
      suggestionsContainer.style.display = 'none';
    }
  });
}

// Search for addresses using Mapbox Geocoding API
async function searchAddresses(query, container) {
  try {
    const response = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?` +
      `access_token=${mapboxgl.accessToken}&` +
      `country=ZA&` +
      `limit=5`
    );
    
    const data = await response.json();
    
    if (data.features && data.features.length > 0) {
      displayAddressSuggestions(data.features, container);
    } else {
      container.style.display = 'none';
    }
  } catch (error) {
    console.error('Error searching addresses:', error);
    container.style.display = 'none';
  }
}

// Display address suggestions
function displayAddressSuggestions(features, container) {
  container.innerHTML = '';
  
  features.forEach(feature => {
    const item = document.createElement('div');
    item.className = 'address-suggestion-item';
    
    const text = document.createElement('div');
    text.className = 'suggestion-text';
    text.textContent = feature.place_name;
    
    const details = document.createElement('div');
    details.className = 'suggestion-details';
    details.textContent = `${feature.properties.category || 'Location'}`;
    
    item.appendChild(text);
    item.appendChild(details);
    
    item.addEventListener('click', () => {
      selectAddressSuggestion(feature);
    });
    
    container.appendChild(item);
  });
  
  container.style.display = 'block';
}

// Handle address suggestion selection
function selectAddressSuggestion(feature) {
  console.log('Address suggestion selected:', feature);
  
  const addressInput = document.getElementById('newLocationAddress');
  const suggestionsContainer = document.getElementById('addressSuggestions');
  
  // Set the address
  addressInput.value = feature.place_name;
  
  // Hide suggestions
  suggestionsContainer.style.display = 'none';
  
  // Update map marker if map exists
  if (window.locationMap) {
    const [lng, lat] = feature.center;
    console.log('Updating marker to coordinates:', lng, lat);
    
    // Remove existing marker if it exists
    if (window.locationMarker) {
      console.log('Removing existing marker');
      window.locationMarker.remove();
    }
    
    // Add new marker
    window.locationMarker = new mapboxgl.Marker()
      .setLngLat([lng, lat])
      .addTo(window.locationMap);
    
    console.log('New marker added:', window.locationMarker);
    
    // Center map on selected location
    window.locationMap.flyTo({
      center: [lng, lat],
      zoom: 15
    });
    
    console.log('Map centered on:', lng, lat);
  } else {
    console.error('Location map not found. Available:', {
      locationMap: window.locationMap,
      locationMarker: window.locationMarker
    });
  }
}

// Reverse geocoding - get address from coordinates
async function reverseGeocode(lng, lat) {
  try {
    const response = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?` +
      `access_token=${mapboxgl.accessToken}&` +
      `country=ZA`
    );
    
    const data = await response.json();
    
    if (data.features && data.features.length > 0) {
      return data.features[0].place_name;
    } else {
      return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
    }
  } catch (error) {
    console.error('Error in reverse geocoding:', error);
    return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
  }
}

// Close location modal
function closeLocationModal() {
  document.getElementById('locationModal').classList.remove('show');
  newLocationType = null;
  
  // Clear form
  document.getElementById('newLocationName').value = '';
  document.getElementById('newLocationProvince').value = '';
  document.getElementById('newLocationAddress').value = '';
  
  // Hide suggestions
  const suggestionsContainer = document.getElementById('addressSuggestions');
  if (suggestionsContainer) {
    suggestionsContainer.style.display = 'none';
  }
  
  // Remove marker if it exists
  if (window.locationMarker) {
    window.locationMarker.remove();
    window.locationMarker = null;
  }
}

// ===== MULTIPLE ROUTE MANAGEMENT FUNCTIONS =====

// Add new route
function addNewRoute() {
  if (routeCount >= 5) {
    showMessage('Maximum of 5 routes allowed per taxi rank pair.', 'error');
    return;
  }
  
  // Save current unfinished route if it exists
  if (routeCoordinates.length > 0 && !routeFinished) {
    saveUnfinishedCurrentRoute();
  }
  
  // Create new route
  const num = routeCount + 1;
  routeObj = new Route(`${num}`);
  
  // Set new color and state
  currentColor = colors[num - 1];
  currentStateNameId = num;
  routeCount++;
  
  // Create route div
  createRouteDiv(`Route${num}`, currentColor, num);
  
  // Reset route state
  routeFinished = false;
  savedCurrentRouteObj = null;
  
  // Clear current route and enable drawing
  clearRoute();
  toggleDrawMode();
  
  // Update UI
  updateStep3UI();
  updateRouteManagementUI();
  
  showMessage(`Route ${num} created. You can now draw a new route.`, 'success');
}

// Create route div element
function createRouteDiv(routeName, color, number) {
  const addRouteContainer = document.querySelector('.addRoute');
  if (!addRouteContainer) return;
  
  const routeDiv = document.createElement('div');
  routeDiv.className = 'route_div';
  routeDiv.style.backgroundColor = color;
  routeDiv.setAttribute('data-name', number);
  
  routeDiv.innerHTML = `
    ${routeName}
    <button class="routeButton" style="background-color: ${color}" onclick="showRoute(${number})">
      <i class="fa fa-eye" style="font-size: 12px; color: black;" aria-hidden="true"></i>
    </button>
    <button class="routeButton routeDeleteBtn" style="background-color: ${color}" onclick="openRemoveRouteMenu(${number})" ${number === currentStateNameId ? 'disabled' : ''}>
      <i class="fa fa-times" style="font-size: 12px; color: black;" aria-hidden="true"></i>
    </button>
  `;
  
  addRouteContainer.appendChild(routeDiv);
}

// Show route (switch to existing route) - EXACT COPY FROM clientCrowdSource.js
function showRoute(nameId){
  if(currentStateNameId == nameId){
   
    //load unfinished route if it exists
    if(savedCurrentRouteObj !== null){
      //remove the existing route
      removeRouteOnly();

      //push the objects data to the variables that manage current route 
      coords.push(...savedCurrentRouteObj.coords);
      routeFinished = savedCurrentRouteObj.isLoopRoutefinished;
      routeMarkers.push(...savedCurrentRouteObj.routeMarkers);
      routeCoordinates.push(...savedCurrentRouteObj.listOfCoords);
      
      // Update price - extract price from message or keep current price
      if (document.getElementById('routePrice')) {
        const currentPrice = document.getElementById('routePrice').value;
        // Only update if there's no current price set
        if (!currentPrice || currentPrice.trim() === '') {
          document.getElementById('routePrice').value = savedCurrentRouteObj.message || '0';
        }
      }

      console.log("Coords : " , coords);
      console.log("routeMarkers : " , routeMarkers);
      console.log("routeCoordinates : " , routeCoordinates);


      routeMarkers.forEach((marker)=>{
        if(marker){
          createCustomPointMarker([marker.getLngLat().lng , marker.getLngLat().lat]);
        }
      });
      
      //draw new route
       updateRouteOnMap({
          type: 'LineString',
          coordinates: savedCurrentRouteObj.listOfCoords
        });
      
      // Clear saved data after loading it
      savedCurrentRouteObj = null;
    } else {
      // If no saved data, the current route should already be displayed
      console.log("Current route is already displayed - no saved data to load");
    }

    // Set Start Drawing button state based on route completion
    const drawBtn = document.getElementById('drawRouteBtn');
    if (drawBtn) {
      if (!routeFinished) {
        // Route is unfinished - enable button but start in "off" state
        drawBtn.disabled = false;
        drawBtn.innerHTML = '<i class="fas fa-pencil-alt"></i> Start Drawing';
        drawBtn.classList.remove('btn-success');
        drawBtn.classList.add('btn-outline');
        drawMode = false;
        map.getCanvas().style.cursor = '';
      } else {
        // Route is finished - disable button
        drawBtn.disabled = true;
        drawBtn.innerHTML = '<i class="fas fa-pencil-alt"></i> Start Drawing';
        drawBtn.classList.remove('btn-success');
        drawBtn.classList.add('btn-outline');
        drawMode = false;
        map.getCanvas().style.cursor = '';
      }
    }

    //cut the function excution here if the route is in its current state
    return;
  }

  if(savedCurrentRouteObj === null){
    const isUnfinishedRouteSaved = saveUnfinishedCurrentRoute();
    if(isUnfinishedRouteSaved === false){
      console.log("ERROR: Could not save unfinished route");
      return;
    }
  }

  //load the Chosen route
  listOfRoutes.forEach((routeLocalObj)=>{
    if(routeLocalObj.name === `${nameId}` ){
      //remove the existing route
      removeRouteOnly();

     

      console.log("New route : ", JSON.stringify(routeLocalObj.listOfCoords));
      coords.push(...routeLocalObj.coords);
      routeFinished = routeLocalObj.isLoopRoutefinished;
      routeMarkers.push(...routeLocalObj.routeMarkers);
      routeCoordinates.push(...routeLocalObj.listOfCoords);
      
      // Keep the current price - all routes share the same price
      // Don't update the price when switching routes

      console.log("Coords : " , coords);
      console.log("routeMarkers : " , routeMarkers);
      console.log("routeCoordinates : " , routeCoordinates);


      routeMarkers.forEach((marker)=>{
        if(marker){
          createCustomPointMarker([marker.getLngLat().lng , marker.getLngLat().lat]);
        }
      });
      
      //draw new route
       updateRouteOnMap({
          type: 'LineString',
          coordinates: routeLocalObj.listOfCoords
        });
    }
  });

  // Turn OFF Start Drawing button when viewing previous routes
  const drawBtn = document.getElementById('drawRouteBtn');
  if (drawBtn) {
    drawBtn.disabled = true;
    drawBtn.innerHTML = '<i class="fas fa-pencil-alt"></i> Start Drawing';
    drawBtn.classList.remove('btn-success');
    drawBtn.classList.add('btn-outline');
  }
}

// Remove route
function removeRoute(nameId) {
  if (nameId === currentStateNameId) {
    showMessage('Cannot delete the current active route.', 'error');
    return;
  }
  
  // Remove from listOfRoutes
  const index = listOfRoutes.findIndex(route => route.name === `${nameId}`);
  if (index !== -1) {
    listOfRoutes.splice(index, 1);
  }
  
  // Remove route div
  const routeDiv = document.querySelector(`.route_div[data-name="${nameId}"]`);
  if (routeDiv) {
    routeDiv.remove();
  }
  
  // Update route count (no renumbering)
  routeCount--;
  
  // Update UI
  updateRouteManagementUI();
  
  showMessage(`Route ${nameId} deleted successfully.`, 'success');
}

// Save current route (finished or unfinished) - EXACT COPY FROM clientCrowdSource.js
function saveUnfinishedCurrentRoute(){
   //Create a new route object
   savedCurrentRouteObj = new Route("Unfinished");
    //add route 
    if(!routeCoordinates || routeCoordinates.length === 0){
      console.log("routeCoordinates has no coordinates");
      showMessage("There is no route drawn", 'error');
      return false;
    }
    //add route coords
    const addroute = savedCurrentRouteObj.AddRouteCoords(routeCoordinates);

    if(addroute === false){
      console.log("*********ERROR: Could not add route  ");
      return false;
    }

    //add coords of all Markers
    const allMarkers = savedCurrentRouteObj.AddCoords(coords);
    if(allMarkers === false){
       console.log("*********ERROR: Could not add all Marker (a.k.a coords)  ");
       return false;
    }

    //add inner markers array 
    const innerMarkers = savedCurrentRouteObj.AddListofMarkers(routeMarkers);
    if(innerMarkers === false){
       console.log("*********ERROR: Could not add innerMarkers");
       return false;
    }

    //add to indicate that the route is done 
    savedCurrentRouteObj.hasRouteEnded(routeFinished);

    //add message
    const priceValue = document.getElementById('routePrice')?.value || '0';
    if(priceValue.trim() === ""){
      savedCurrentRouteObj.AddMessage("");
    }else{
      savedCurrentRouteObj.AddMessage(priceValue);
    }

    return true;
}

// Load saved current route
function loadUnfinishedRoute() {
  if (!savedCurrentRouteObj) {
    console.log('No saved current route to load');
    return;
  }
  
  console.log('Loading saved current route:', {
    routeId: currentStateNameId,
    coordsLength: savedCurrentRouteObj.coords.length,
    routeCoordinatesLength: savedCurrentRouteObj.listOfCoords.length,
    routeFinished: savedCurrentRouteObj.isLoopRoutefinished
  });
  
  // Remove existing route
  removeRouteOnly();
  
  // Load data by pushing to existing arrays (like clientCrowdSource)
  coords.push(...savedCurrentRouteObj.coords);
  routeMarkers.push(...savedCurrentRouteObj.routeMarkers);
  routeCoordinates.push(...savedCurrentRouteObj.listOfCoords);
  routeFinished = savedCurrentRouteObj.isLoopRoutefinished;
  
  // Recreate markers
  routeMarkers.forEach((marker) => {
    if (marker) {
      createCustomPointMarker([marker.getLngLat().lng, marker.getLngLat().lat]);
    }
  });
  
  // Draw route
  updateRouteOnMap({
    type: 'LineString',
    coordinates: savedCurrentRouteObj.listOfCoords
  });
  
  // Update UI
  updateStep3UI();
}

// Remove route only (without markers)
function removeRouteOnly() {
  // Remove route from map
  if (map.getSource('route')) {
    map.removeLayer('route');
    map.removeSource('route');
  }
  
  // Clear arrays
  routeCoordinates = [];
  coords = [];
  
  // Remove waypoint markers
  routeMarkers.forEach(marker => {
    if (marker) marker.remove();
  });
  routeMarkers = [];
}

// Routes keep their original numbers after deletion (no renumbering)

// Save completed route
function saveCompletedRoute() {
  if (!routeObj || routeCoordinates.length === 0) return;
  
  // Update route object with current data
  routeObj.AddRouteCoords([...routeCoordinates]);
  routeObj.AddListofMarkers([...routeMarkers]);
  routeObj.AddCoords([...coords]);
  routeObj.hasRouteEnded(routeFinished);
  routeObj.AddPrice(parseFloat(document.getElementById('routePrice')?.value) || 0);
  
  // Add to list of routes if not already there
  const existingIndex = listOfRoutes.findIndex(route => route.name === routeObj.name);
  if (existingIndex !== -1) {
    listOfRoutes[existingIndex] = routeObj;
  } else {
    listOfRoutes.push(routeObj);
  }
  
  console.log('Route saved:', routeObj.RoutePrint());
}

// Update route management UI
function updateRouteManagementUI() {
  const addRouteBtn = document.getElementById('addRouteBtn');
  const routeDeleteBtns = document.querySelectorAll('.routeDeleteBtn');
  
  // Enable/disable add route button
  if (addRouteBtn) {
    // Button is enabled when:
    // - Maximum 5 routes not reached AND
    // - Current route is finished (completed)
    addRouteBtn.disabled = routeCount >= 5 || !routeFinished;
    
    console.log('Add Route Button State:', {
      routeCount,
      routeFinished,
      buttonDisabled: addRouteBtn.disabled,
      maxReached: routeCount >= 5
    });
  }
  
  // Update delete buttons
  routeDeleteBtns.forEach(btn => {
    const routeDiv = btn.closest('.route_div');
    const routeNumber = parseInt(routeDiv.getAttribute('data-name'));
    btn.disabled = routeNumber === currentStateNameId;
  });
}

// Save new location
async function saveNewLocation() {
  try {
    const name = document.getElementById('newLocationName').value.trim();
    const province = document.getElementById('newLocationProvince').value;
    const address = document.getElementById('newLocationAddress').value.trim();
    
    if (!name || !province) {
      showMessage('Please fill in all required fields.', 'error');
      return;
    }
    
    if (!window.locationMarker) {
      showMessage('Please click on the map to set the location.', 'error');
      return;
    }
    
    const coordinates = window.locationMarker.getLngLat();
    
    // Create new location data
    const locationData = {
      ID: Infinity, // Mark as new location (not existing in database)
      name,
      province,
      address,
      location_coord: `POINT(${coordinates.lng} ${coordinates.lat})`,
      coord: [coordinates.lng, coordinates.lat], // Add coord for coordinate retrieval
      exist: false
    };
    
    // Here you would typically save to your backend
    // For now, we'll just add it to the current input
    const inputId = newLocationType === 'start' ? 'startLocation' : 'endLocation';
    document.getElementById(inputId).value = name;
    
    // Store selected location data for coordinate retrieval
    if (newLocationType === 'start') {
      selectedStartLocation = locationData;
    } else if (newLocationType === 'end') {
      selectedEndLocation = locationData;
    }
    
    // Add marker to main map
    addLocationMarker(locationData, newLocationType);
    
    // Update step 2 UI to enable/disable next button
    updateStep2UI();
    
    closeLocationModal();
    showMessage('New location created successfully!', 'success');
    
  } catch (error) {
    console.error('Error saving new location:', error);
    showMessage('Error creating new location. Please try again.', 'error');
  }
}

// Populate review data
function populateReviewData() {
  // Route details
  const reviewRouteName = document.getElementById('reviewRouteName');
  const reviewRouteType = document.getElementById('reviewRouteType');
  const reviewTravelMethod = document.getElementById('reviewTravelMethod');
  const reviewPrice = document.getElementById('reviewPrice');
  const reviewDescription = document.getElementById('reviewDescription');
  
  if (reviewRouteName) {
    reviewRouteName.textContent = `${document.getElementById('startLocation').value}${isStraightRoute ? ' to ' + document.getElementById('endLocation').value : ' (Loop)'}`;
  }
  
  if (reviewRouteType) {
    reviewRouteType.textContent = selectedRouteType || '-';
  }
  
  if (reviewTravelMethod) {
    reviewTravelMethod.textContent = 'Taxi'; // Default for now
  }
  
  if (reviewPrice) {
    const routePrice = document.getElementById('routePrice').value;
    reviewPrice.textContent = routePrice ? `ZAR ${routePrice}` : 'Not specified';
  }
  
  if (reviewDescription) {
    const totalRoutes = listOfRoutes.length + (routeCoordinates.length > 0 ? 1 : 0);
    const totalWaypoints = listOfRoutes.reduce((total, route) => total + (route.listOfCoords?.length || 0), 0) + routeCoordinates.length;
    reviewDescription.textContent = `${totalRoutes} ${selectedRouteType} route(s) with ${totalWaypoints} total waypoints`;
  }
  
  // Locations
  const reviewStartLocation = document.getElementById('reviewStartLocation');
  const reviewEndLocation = document.getElementById('reviewEndLocation');
  
  if (reviewStartLocation) {
    reviewStartLocation.textContent = document.getElementById('startLocation').value || '-';
  }
  
  if (reviewEndLocation) {
    if (isStraightRoute) {
      reviewEndLocation.textContent = document.getElementById('endLocation').value || '-';
    } else {
      reviewEndLocation.textContent = 'Same as start (Loop route)';
    }
  }
  
  // Route preview map
  initializeRoutePreviewMap();
}

// Initialize route preview map
function initializeRoutePreviewMap() {
  const previewMap = new mapboxgl.Map({
    container: 'routePreviewMap',
    style: 'mapbox://styles/mapbox/streets-v11',
    center: routeCoordinates.length > 0 ? routeCoordinates[0] : [28.0473, -26.2041],
    zoom: 10
  });
  
  previewMap.on('load', () => {
    // Add all completed routes from listOfRoutes
    listOfRoutes.forEach((route, index) => {
      if (route.listOfCoords && route.listOfCoords.length > 1) {
        const sourceId = `preview-route-${index}`;
        const layerId = `preview-route-${index}`;
        
        previewMap.addSource(sourceId, {
          type: 'geojson',
          data: {
            type: 'Feature',
            properties: {
              routeName: route.name,
              routeColor: colors[index] || colors[0]
            },
            geometry: {
              type: 'LineString',
              coordinates: route.listOfCoords
            }
          }
        });
        
        previewMap.addLayer({
          id: layerId,
          type: 'line',
          source: sourceId,
          layout: {
            'line-join': 'round',
            'line-cap': 'round'
          },
          paint: {
            'line-color': colors[index] || colors[0],
            'line-width': 4
          }
        });
      }
    });
    
    // Add current route if it exists and has coordinates
    if (routeCoordinates.length > 1) {
      const currentSourceId = 'preview-current-route';
      const currentLayerId = 'preview-current-route';
      
      previewMap.addSource(currentSourceId, {
        type: 'geojson',
        data: {
          type: 'Feature',
          properties: {
            routeName: `Route ${currentStateNameId}`,
            routeColor: colors[currentStateNameId - 1] || colors[0]
          },
          geometry: {
            type: 'LineString',
            coordinates: routeCoordinates
          }
        }
      });
      
      previewMap.addLayer({
        id: currentLayerId,
        type: 'line',
        source: currentSourceId,
        layout: {
          'line-join': 'round',
          'line-cap': 'round'
        },
        paint: {
          'line-color': colors[currentStateNameId - 1] || colors[0],
          'line-width': 4
        }
      });
    }
    
    // Add taxi rank markers
    addTaxiRankMarkersToPreviewMap(previewMap);
    
    // Fit map to show all routes
    fitMapToAllRoutes(previewMap);
  });
}

// Add taxi rank markers to preview map
function addTaxiRankMarkersToPreviewMap(previewMap) {
  // Add start location marker
  if (selectedStartLocation) {
    const startCoords = getTaxiRankCoordinates(selectedStartLocation.name, 'start');
    new mapboxgl.Marker({ color: '#28a745' })
      .setLngLat(startCoords)
      .setPopup(new mapboxgl.Popup().setHTML(`<strong>Start:</strong> ${selectedStartLocation.name}`))
      .addTo(previewMap);
  }
  
  // Add end location marker (only for straight routes)
  if (isStraightRoute && selectedEndLocation) {
    const endCoords = getTaxiRankCoordinates(selectedEndLocation.name, 'end');
    new mapboxgl.Marker({ color: '#dc3545' })
      .setLngLat(endCoords)
      .setPopup(new mapboxgl.Popup().setHTML(`<strong>End:</strong> ${selectedEndLocation.name}`))
      .addTo(previewMap);
  }
}

// Fit map to show all routes
function fitMapToAllRoutes(previewMap) {
  const allCoordinates = [];
  
  // Collect coordinates from all completed routes
  listOfRoutes.forEach(route => {
    if (route.listOfCoords && route.listOfCoords.length > 0) {
      allCoordinates.push(...route.listOfCoords);
    }
  });
  
  // Add current route coordinates
  if (routeCoordinates.length > 0) {
    allCoordinates.push(...routeCoordinates);
  }
  
  // Add taxi rank coordinates
  if (selectedStartLocation) {
    allCoordinates.push(getTaxiRankCoordinates(selectedStartLocation.name, 'start'));
  }
  if (isStraightRoute && selectedEndLocation) {
    allCoordinates.push(getTaxiRankCoordinates(selectedEndLocation.name, 'end'));
  }
  
  // Fit map to show all coordinates
  if (allCoordinates.length > 0) {
    const bounds = allCoordinates.reduce((bounds, coord) => {
      return bounds.extend(coord);
    }, new mapboxgl.LngLatBounds(allCoordinates[0], allCoordinates[0]));
    
    previewMap.fitBounds(bounds, { padding: 100 });
  }
}

// Submit route
async function submitRoute() {
  try {
    // Show loading state
    const submitBtn = document.querySelector('.btn-success');
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Submitting...';
    submitBtn.disabled = true;
    
    // Collect route data in the expected format
    const routeType = selectedRouteType;
    const isStraight = routeType === 'Straight';
    let caseType = isStraight ? '1' : '0';
    
    // Determine if source is existing or new
    const sourceIsNew = selectedStartLocation && selectedStartLocation.ID === Infinity;
    caseType += sourceIsNew ? '1' : '0';
    
    // Determine if destination is existing or new (only for straight routes)
    let destIsNew = false;
    if (isStraight) {
      destIsNew = selectedEndLocation && selectedEndLocation.ID === Infinity;
      caseType += destIsNew ? '1' : '0';
    }
    
    let TRSource;
    if (sourceIsNew) {
      // New taxi rank - send full details
      TRSource = {
        name: selectedStartLocation.name,
        coord: getTaxiRankCoordinates(selectedStartLocation.name, 'start'),
        province: selectedStartLocation.province || 'Gauteng',
        address: selectedStartLocation.address || selectedStartLocation.name
      };
    } else {
      // Existing taxi rank - send only ID
      TRSource = {
        IDSource: selectedStartLocation.ID
      };
    }
    
    let TRDest;
    if (isStraight) {
      if (destIsNew) {
        // New destination taxi rank - send full details
        TRDest = {
          nameDest: selectedEndLocation.name,
          coordDest: getTaxiRankCoordinates(selectedEndLocation.name, 'end'),
          provinceDest: selectedEndLocation.province || 'Gauteng',
          addressDest: selectedEndLocation.address || selectedEndLocation.name
        };
      } else {
        // Existing destination taxi rank - send only ID
        TRDest = {
          IDDest: selectedEndLocation.ID
        };
      }
    }
    
    // Prepare multiple routes data
    const listOfMessAndCoords = [];
    listOfRoutes.forEach(route => {
      listOfMessAndCoords.push({
        message: `${routeType} route ${route.name} - Price: R${route.price}`,
        Coords: route.listOfCoords
      });
    });
    
    // If current route is not finished but has coordinates, add it
    if (routeCoordinates.length > 0 && !routeFinished) {
      listOfMessAndCoords.push({
        message: `${routeType} route ${currentStateNameId} (unfinished) - Price: R${parseFloat(document.getElementById('routePrice').value) || 0}`,
        Coords: routeCoordinates
      });
    }
    
    const routeInfo = {
      price: parseFloat(document.getElementById('routePrice').value) || 0,
      routeType: routeType,
      travelMethod: 'Taxi',
      listOfMessAndCoords: listOfMessAndCoords
    };
    
    const routeData = {
      caseType: caseType,
      TRSource: TRSource,
      TRDest: TRDest,
      routeInfo: routeInfo
    };
    
    // Submit to backend
    const response = await apiClient.post('/client//AddPendingRoute', routeData);
    
    if (response.status === 200 || response.status === 201) {
      // Show success overlay
      document.getElementById('successOverlay').classList.add('show');
    }
    
  } catch (error) {
    console.error('Error submitting route:', error);
    showMessage('Error submitting route. Please try again.', 'error');
  } finally {
    // Restore button state
    const submitBtn = document.querySelector('.btn-success');
    submitBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Submit Route';
    submitBtn.disabled = false;
  }
}


// Show message
function showMessage(message, type = 'info') {
  const container = document.getElementById('messageContainer');
  
  const messageDiv = document.createElement('div');
  messageDiv.className = `message ${type}`;
  messageDiv.textContent = message;
  
  container.appendChild(messageDiv);
  
  // Auto remove after 5 seconds
  setTimeout(() => {
    if (messageDiv.parentNode) {
      messageDiv.parentNode.removeChild(messageDiv);
    }
  }, 5000);
}

// Mobile menu toggle
function toggleMobileMenu() {
  const navLinks = document.querySelector('.nav-links');
  navLinks.classList.toggle('show');
}

// Start new route
function startNewRoute() {
  // Hide success overlay
  document.getElementById('successOverlay').classList.remove('show');
  
  // Reset to step 1
  currentStep = 1;
  selectedRouteType = null;
  isStraightRoute = true;
  
  // Reset multiple route variables
  listOfRoutes = [];
  routeCount = 1;
  currentStateNameId = 1;
  savedCurrentRouteObj = null;
  routeObj = null;
  currentColor = colors[0];
  routeFinished = false;
  
  // Clear all form fields
  document.getElementById('startLocation').value = '';
  document.getElementById('endLocation').value = '';
  document.getElementById('routePrice').value = '';
  
  // Reset end location input state (default to straight route)
  const endLocationInput = document.getElementById('endLocation');
  if (endLocationInput) {
    endLocationInput.required = true;
  }
  
  // Clear map
  clearRoute();
  if (startMarker) startMarker.remove();
  if (endMarker) endMarker.remove();
  
  // Reset variables
  routeCoordinates = [];
  routeMarkers = [];
  coords = [];
  startMarker = null;
  endMarker = null;
  drawMode = false;
  
  // Reset UI
  document.querySelectorAll('.route-type-card').forEach(card => {
    card.classList.remove('selected');
  });
  
  document.getElementById('endLocationGroup').style.display = 'block';
  
  // Reset route management UI
  const addRouteContainer = document.querySelector(".addRoute");
  if (addRouteContainer) {
    const routeDivs = addRouteContainer.querySelectorAll(".route_div");
    // Remove all route divs except the first one
    for (let i = 1; i < routeDivs.length; i++) {
      routeDivs[i].remove();
    }
    
    // Reset the first route div
    if (routeDivs[0]) {
      routeDivs[0].setAttribute('data-name', '1');
      routeDivs[0].style.backgroundColor = colors[0];
      routeDivs[0].innerHTML = `
        Route 1
        <button class="routeButton" style="background-color: ${colors[0]}" onclick="showRoute(1)">
          <i class="fa fa-eye" style="font-size: 12px; color: black;" aria-hidden="true"></i>
        </button>
        <button class="routeButton routeDeleteBtn" style="background-color: ${colors[0]}" onclick="removeRoute(1)" disabled>
          <i class="fa fa-times" style="font-size: 12px; color: black;" aria-hidden="true"></i>
        </button>
      `;
    }
  }
  
  // Update display
  updateStepDisplay();
}

// Go to home
function goToHome() {
  window.location.href = 'index.html';
}

// Export functions for global access
window.nextStep = nextStep;
window.previousStep = previousStep;
window.selectRouteType = selectRouteType;
window.toggleDrawMode = toggleDrawMode;
window.finishRoute = finishRoute;
window.clearRoute = clearRoute;
window.createNewLocation = createNewLocation;
window.closeLocationModal = closeLocationModal;
window.saveNewLocation = saveNewLocation;
window.submitRoute = submitRoute;
window.startNewRoute = startNewRoute;
window.goToHome = goToHome;
window.toggleMobileMenu = toggleMobileMenu;
window.topNavZIndexDecrease = function() {
    const navbar = document.querySelector(".topnav");
    if (navbar) {
        navbar.style.zIndex = "3";
    }
};
window.addNewRoute = addNewRoute;
window.showRoute = showRoute;
window.removeRoute = removeRoute;
window.openRemoveRouteMenu = openRemoveRouteMenu;
