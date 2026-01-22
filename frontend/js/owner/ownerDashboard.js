 // Check authentication status and update navigation
 document.addEventListener('DOMContentLoaded', function() {
    const fullNav = document.getElementById('fullNav');
    
    // Check if user is logged in
    const isLoggedIn = localStorage.getItem('userProfile') || sessionStorage.getItem('userProfile');
    
    if (isLoggedIn) {
        // User is logged in - show full navigation
        fullNav.style.display = 'block';
    } else {
        // User is not logged in - hide full navigation
        fullNav.style.display = 'none';
    }
});

// Global variables
let currentTab = 'vehicles';
let map;
let coverageAreas = [];

// Initialize dashboard
document.addEventListener('DOMContentLoaded', function() {
    initializeMap();
    loadDashboardData();
});

// Tab switching
// Load recent bookings
function loadRecentBookings() {
    // Create sample bookings for demo
    const now = new Date();
    const bookings = [
        {
            id: 'BK-2025-001',
            status: 'pending',
            type: 'route-based',
            customer: 'Sarah Mthembu',
            from: 'Sandton City, Johannesburg',
            to: 'OR Tambo Airport, Kempton Park',
            date: 'Today, 2:30 PM',
            passengers: '3 adults, 2 children',
            distance: '28.5 km',
            amount: 'R 516.75',
            time: '2 hours ago'
        },
        {
            id: 'BK-2025-002',
            status: 'confirmed',
            type: 'custom-trip',
            customer: 'John Dlamini',
            from: 'Rosebank Mall, Johannesburg',
            to: 'Pretoria CBD, Pretoria',
            date: 'Tomorrow, 8:00 AM',
            passengers: '2 adults',
            distance: '45.2 km',
            amount: 'R 750.60',
            time: '1 day ago'
        },
        {
            id: 'BK-2025-003',
            status: 'confirmed',
            type: 'route-based',
            customer: 'Mary Khumalo',
            from: 'Soweto, Johannesburg',
            to: 'Sandton, Johannesburg',
            date: new Date(now.getTime() + 2 * 86400000).toLocaleDateString('en-ZA', { weekday: 'long', day: 'numeric', month: 'long' }) + ', 10:00 AM',
            passengers: '4 adults',
            distance: '35.8 km',
            amount: 'R 642.30',
            time: '3 days ago'
        },
        {
            id: 'BK-2025-004',
            status: 'pending',
            type: 'custom-trip',
            customer: 'David Nkomo',
            from: 'Midrand, Johannesburg',
            to: 'Lanseria Airport, Johannesburg',
            date: new Date(now.getTime() + 1 * 86400000).toLocaleDateString('en-ZA', { weekday: 'long', day: 'numeric', month: 'long' }) + ', 6:00 AM',
            passengers: '1 adult',
            distance: '42.3 km',
            amount: 'R 689.50',
            time: '5 hours ago'
        },
        {
            id: 'BK-2025-005',
            status: 'confirmed',
            type: 'route-based',
            customer: 'Grace Mokoena',
            from: 'Pretoria Central, Pretoria',
            to: 'Johannesburg CBD, Johannesburg',
            date: new Date(now.getTime() + 3 * 86400000).toLocaleDateString('en-ZA', { weekday: 'long', day: 'numeric', month: 'long' }) + ', 3:00 PM',
            passengers: '5 adults',
            distance: '58.7 km',
            amount: 'R 987.20',
            time: '2 days ago'
        },
        {
            id: 'BK-2025-006',
            status: 'confirmed',
            type: 'custom-trip',
            customer: 'Thabo Sithole',
            from: 'Randburg, Johannesburg',
            to: 'Sandton City, Johannesburg',
            date: new Date(now.getTime() + 1 * 86400000).toLocaleDateString('en-ZA', { weekday: 'long', day: 'numeric', month: 'long' }) + ', 11:30 AM',
            passengers: '2 adults, 1 child',
            distance: '18.9 km',
            amount: 'R 342.80',
            time: '1 day ago'
        },
        {
            id: 'BK-2025-007',
            status: 'pending',
            type: 'route-based',
            customer: 'Nomsa Dlamini',
            from: 'Fourways, Johannesburg',
            to: 'OR Tambo Airport, Kempton Park',
            date: 'Tomorrow, 12:00 PM',
            passengers: '3 adults',
            distance: '31.4 km',
            amount: 'R 568.90',
            time: '3 hours ago'
        },
        {
            id: 'BK-2025-008',
            status: 'confirmed',
            type: 'custom-trip',
            customer: 'Peter Ngubane',
            from: 'Benoni, Gauteng',
            to: 'Johannesburg CBD, Johannesburg',
            date: new Date(now.getTime() + 4 * 86400000).toLocaleDateString('en-ZA', { weekday: 'long', day: 'numeric', month: 'long' }) + ', 9:00 AM',
            passengers: '4 adults',
            distance: '52.1 km',
            amount: 'R 892.40',
            time: '4 days ago'
        },
        {
            id: 'BK-2025-009',
            status: 'pending',
            type: 'route-based',
            customer: 'Lindiwe Khumalo',
            from: 'Kempton Park, Gauteng',
            to: 'Sandton, Johannesburg',
            date: new Date(now.getTime() + 1 * 86400000).toLocaleDateString('en-ZA', { weekday: 'long', day: 'numeric', month: 'long' }) + ', 4:30 PM',
            passengers: '2 adults',
            distance: '24.6 km',
            amount: 'R 445.20',
            time: '6 hours ago'
        },
        {
            id: 'BK-2025-010',
            status: 'confirmed',
            type: 'custom-trip',
            customer: 'Sipho Mthembu',
            from: 'Soweto, Johannesburg',
            to: 'Rosebank, Johannesburg',
            date: new Date(now.getTime() + 2 * 86400000).toLocaleDateString('en-ZA', { weekday: 'long', day: 'numeric', month: 'long' }) + ', 1:00 PM',
            passengers: '6 adults',
            distance: '22.8 km',
            amount: 'R 412.50',
            time: '3 days ago'
        },
        {
            id: 'BK-2025-011',
            status: 'pending',
            type: 'route-based',
            customer: 'Zanele Ndlovu',
            from: 'Johannesburg CBD',
            to: 'OR Tambo Airport, Kempton Park',
            date: 'Today, 5:00 PM',
            passengers: '1 adult',
            distance: '23.5 km',
            amount: 'R 425.80',
            time: '1 hour ago'
        },
        {
            id: 'BK-2025-012',
            status: 'confirmed',
            type: 'custom-trip',
            customer: 'Mpho Molefe',
            from: 'Pretoria East, Pretoria',
            to: 'Johannesburg, Gauteng',
            date: new Date(now.getTime() + 5 * 86400000).toLocaleDateString('en-ZA', { weekday: 'long', day: 'numeric', month: 'long' }) + ', 7:30 AM',
            passengers: '3 adults, 1 child',
            distance: '61.3 km',
            amount: 'R 1023.60',
            time: '5 days ago'
        }
    ];

    const recentBookingsList = document.getElementById('recentBookingsList');
    if (!recentBookingsList) return;

    if (bookings.length === 0) {
        recentBookingsList.innerHTML = `
            <div class="no-recent-bookings">
                <i class="fas fa-calendar-times"></i>
                <p>No recent bookings found.</p>
            </div>
        `;
        return;
    }

    recentBookingsList.innerHTML = bookings.slice(0, 5).map(booking => createRecentBookingCard(booking)).join('');
}

function createRecentBookingCard(booking) {
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

    let routeInfoHTML = '';
    if (booking.type === 'route-based') {
        // Route-Based: Show trip name
        routeInfoHTML = `
            <div class="recent-booking-route-item">
                <i class="fas fa-route"></i>
                <strong>Trip:</strong> ${escapeHtml(booking.tripName || booking.from + ' - ' + booking.to)}
            </div>
            <div class="recent-booking-route-item">
                <i class="fas fa-calendar"></i>
                <strong>Date & Time:</strong> ${escapeHtml(booking.date)}
            </div>
        `;
    } else {
        // Custom Trip: Show from/to
        routeInfoHTML = `
            <div class="recent-booking-route-item">
                <i class="fas fa-map-marker-alt"></i>
                <strong>From:</strong> ${escapeHtml(booking.from)}
            </div>
            <div class="recent-booking-route-item">
                <i class="fas fa-map-marker-alt"></i>
                <strong>To:</strong> ${escapeHtml(booking.to)}
            </div>
            ${booking.returnTrip ? `
            <div class="recent-booking-route-item">
                <i class="fas fa-undo"></i>
                <strong>Return Trip:</strong> ${booking.stayDays || 0} days stay
            </div>
            ` : ''}
        `;
    }

    return `
        <div class="recent-booking-card ${cardClass}">
            <div class="recent-booking-header">
                <div style="display: flex; align-items: center; gap: 0.5rem;">
                    <div class="recent-booking-id">#${booking.id}</div>
                    <span class="booking-type-badge ${typeClass}">
                        <i class="fas ${typeIcon}"></i> ${typeText}
                    </span>
                </div>
                <div style="display: flex; align-items: center; gap: 0.75rem; flex-wrap: wrap;">
                    <div class="recent-booking-status ${statusClass}">${statusText}</div>
                    <span style="color: #6c757d; font-size: 0.85rem;">${escapeHtml(booking.time || booking.timeAgo || '')}</span>
                </div>
            </div>
            <div class="recent-booking-route">
                ${routeInfoHTML}
            </div>
            <div class="recent-booking-info">
                ${booking.type === 'route-based' ? `
                <div class="recent-booking-info-item">
                    <strong>Distance:</strong> ${escapeHtml(booking.distance || 'N/A')}
                </div>
                <div class="recent-booking-info-item">
                    <strong>Passengers:</strong> ${getPassengerCount(booking.passengers)}
                </div>
                <div class="recent-booking-info-item">
                    <strong>Parcels:</strong> ${booking.parcels || 0}
                </div>
                ` : `
                <div class="recent-booking-info-item">
                    <strong>Date:</strong> ${escapeHtml(booking.departureDate || booking.date || 'N/A')}
                </div>
                <div class="recent-booking-info-item">
                    <strong>Passengers:</strong> ${getPassengerCount(booking.passengers)}
                </div>
                <div class="recent-booking-info-item">
                    <strong>Distance:</strong> ${escapeHtml(booking.distance || 'N/A')}
                </div>
                `}
                <div class="recent-booking-info-item">
                    <strong>Amount:</strong> <span style="color: #28a745; font-weight: 700;">${escapeHtml(booking.amount)}</span>
                </div>
            </div>
        </div>
    `;
}

function getPassengerCount(passengers) {
    if (!passengers) return 0;
    
    // If it's already a number, return it
    if (typeof passengers === 'number') {
        return passengers;
    }
    
    // If it's a string like "3 adults, 2 children" or "2 adults", extract numbers
    if (typeof passengers === 'string') {
        // Extract all numbers from the string
        const numbers = passengers.match(/\d+/g);
        if (numbers && numbers.length > 0) {
            // Sum all numbers found
            return numbers.reduce((sum, num) => sum + parseInt(num, 10), 0);
        }
    }
    
    return 0;
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Old showTab function - kept for backward compatibility but does nothing
function showTab(tabName) {
    // Tab functionality removed - now using separate pages
    
    // Load drivers if drivers tab is selected
    if (tabName === 'drivers') {
        loadDrivers();
    }
    
    // Initialize map if coverage tab is selected
    if (tabName === 'coverage') {
        setTimeout(() => {
            initializeMap();
        }, 100);
    }
}

// Initialize map for coverage areas
function initializeMap() {
    if (map) {
        map.remove();
    }
    
    map = new mapboxgl.Map({
        container: 'coverageMap',
        style: 'mapbox://styles/mapbox/streets-v12',
        center: [-26.2041, 28.0473], // Johannesburg
        zoom: 10
    });
    
    map.on('load', function() {
        // Add coverage areas
        addCoverageAreas();
    });
}

// Add coverage areas to map
function addCoverageAreas() {
    // Example coverage areas (in real app, this would come from backend)
    const areas = [
        {
            name: 'Johannesburg CBD',
            center: [-26.2041, 28.0473],
            radius: 5
        },
        {
            name: 'Soweto',
            center: [-26.2485, 27.9083],
            radius: 8
        },
        {
            name: 'Sandton',
            center: [-26.1076, 28.0567],
            radius: 6
        }
    ];
    
    areas.forEach(area => {
        // Add circle for coverage area
        map.addSource(`coverage-${area.name}`, {
            type: 'geojson',
            data: {
                type: 'Feature',
                geometry: {
                    type: 'Point',
                    coordinates: area.center
                }
            }
        });
        
        map.addLayer({
            id: `coverage-${area.name}`,
            type: 'circle',
            source: `coverage-${area.name}`,
            paint: {
                'circle-radius': area.radius * 1000, // Convert km to meters
                'circle-color': '#01386A',
                'circle-opacity': 0.3,
                'circle-stroke-color': '#01386A',
                'circle-stroke-width': 2
            }
        });
    });
}

// Image upload variables
let uploadedImages = [];
let mainImageIndex = 0;

// Vehicle management functions
function openAddVehicleModal() {
    document.getElementById('modalTitle').textContent = 'Add New Vehicle';
    document.getElementById('vehicleForm').reset();
    uploadedImages = [];
    mainImageIndex = 0;
    updateImagePreview();
    document.getElementById('vehicleModal').style.display = 'block';
}

function editVehicle(vehicleId) {
    document.getElementById('modalTitle').textContent = 'Edit Vehicle';
    // In real app, load vehicle data from backend
    uploadedImages = [];
    mainImageIndex = 0;
    updateImagePreview();
    document.getElementById('vehicleModal').style.display = 'block';
}

// Image upload handling
function handleImageUpload(event) {
    const files = Array.from(event.target.files);
    
    // Check if adding these files would exceed the limit
    if (uploadedImages.length + files.length > 5) {
        alert('You can only upload a maximum of 5 images.');
        return;
    }
    
    files.forEach(file => {
        if (file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = function(e) {
                uploadedImages.push({
                    file: file,
                    url: e.target.result
                });
                updateImagePreview();
            };
            reader.readAsDataURL(file);
        }
    });
    
    // Clear the input
    event.target.value = '';
}

function updateImagePreview() {
    const container = document.getElementById('imagePreviewContainer');
    container.innerHTML = '';
    
    uploadedImages.forEach((image, index) => {
        const imageItem = document.createElement('div');
        imageItem.className = `image-preview-item ${index === mainImageIndex ? 'main-image' : ''}`;
        imageItem.onclick = () => setMainImage(index);
        
        imageItem.innerHTML = `
            <img src="${image.url}" alt="Vehicle image ${index + 1}">
            <div class="image-preview-overlay">
                ${index === mainImageIndex ? 'Main Image' : 'Click to set as main'}
            </div>
            <button class="image-remove-btn" onclick="removeImage(${index})" title="Remove image">
                <i class="fas fa-times"></i>
            </button>
        `;
        
        container.appendChild(imageItem);
    });
}

function setMainImage(index) {
    mainImageIndex = index;
    updateImagePreview();
}

function removeImage(index) {
    uploadedImages.splice(index, 1);
    if (mainImageIndex >= uploadedImages.length) {
        mainImageIndex = Math.max(0, uploadedImages.length - 1);
    }
    updateImagePreview();
}

function deleteVehicle(vehicleId) {
    if (confirm('Are you sure you want to delete this vehicle?')) {
        // In real app, delete from backend
        alert('Vehicle deleted successfully!');
        location.reload();
    }
}

function toggleVehicle(vehicleId) {
    // In real app, toggle vehicle status in backend
    alert('Vehicle status updated!');
}

function closeModal() {
    document.getElementById('vehicleModal').style.display = 'none';
}

function editCoverageAreas() {
    document.getElementById('coverageModal').style.display = 'block';
}

function closeCoverageModal() {
    document.getElementById('coverageModal').style.display = 'none';
}

// Base location and multi-day trip variables
let baseLocation = null;
let baseLocationMap = null;

function searchBaseLocation() {
    const searchTerm = document.getElementById('baseLocationSearch').value;
    if (searchTerm.length > 2) {
        // In real app, use geocoding API
        console.log('Searching for:', searchTerm);
        // Simulate search results
        setTimeout(() => {
            if (searchTerm.toLowerCase().includes('johannesburg')) {
                setBaseLocation({
                    address: 'Johannesburg CBD, Gauteng, South Africa',
                    coordinates: [-26.2041, 28.0475],
                    lat: -26.2041,
                    lng: 28.0475
                });
            }
        }, 500);
    }
}

function useCurrentLocation() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            function(position) {
                const lat = position.coords.latitude;
                const lng = position.coords.longitude;
                setBaseLocation({
                    address: `Current Location (${lat.toFixed(4)}, ${lng.toFixed(4)})`,
                    coordinates: [lng, lat],
                    lat: lat,
                    lng: lng
                });
            },
            function(error) {
                alert('Unable to get current location. Please search manually.');
            }
        );
    } else {
        alert('Geolocation is not supported by this browser.');
    }
}

function setBaseLocation(location) {
    baseLocation = location;
    document.getElementById('baseAddress').textContent = location.address;
    document.getElementById('baseCoordinates').textContent = `${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}`;
    document.getElementById('selectedBaseLocation').style.display = 'block';
    
    // Initialize map with location
    initializeBaseLocationMap();
}

function initializeBaseLocationMap() {
    const mapContainer = document.getElementById('baseLocationMap');
    mapContainer.innerHTML = `
        <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; color: #6c757d;">
            <i class="fas fa-map" style="font-size: 2rem; margin-bottom: 1rem;"></i>
            <p>Map will be initialized here</p>
            <small>Base Location: ${baseLocation ? baseLocation.address : 'Not selected'}</small>
        </div>
    `;
}

function toggleMultiDayOptions() {
    const allowMultiDay = document.getElementById('allowMultiDayTrips').checked;
    const settingsDiv = document.getElementById('multiDaySettings');
    
    if (allowMultiDay) {
        settingsDiv.style.display = 'block';
    } else {
        settingsDiv.style.display = 'none';
    }
}

function saveCoverageSettings() {
    const maxDistance = document.getElementById('maxDistance').value;
    
    // Get selected provinces
    const selectedProvinces = [];
    const provinceCheckboxes = document.querySelectorAll('.province-item input[type="checkbox"]:checked');
    provinceCheckboxes.forEach(checkbox => {
        selectedProvinces.push(checkbox.value);
    });
    
    // Get multi-day trip settings
    const allowMultiDay = document.getElementById('allowMultiDayTrips').checked;
    const maxStayDays = document.getElementById('maxStayDays').value;
    const returnTripRate = document.getElementById('returnTripRate').value;
    const requireReturnBooking = document.getElementById('requireReturnBooking').checked;
    const allowFlexibleReturn = document.getElementById('allowFlexibleReturn').checked;
    const provideDriverAccommodation = document.getElementById('provideDriverAccommodation').checked;
    
    const coverageData = {
        maxDistance: parseInt(maxDistance),
        selectedProvinces: selectedProvinces,
        baseLocation: baseLocation,
        multiDayTrips: {
            allowed: allowMultiDay,
            maxStayDays: allowMultiDay ? parseInt(maxStayDays) : null,
            returnTripRate: allowMultiDay ? parseInt(returnTripRate) : null,
            requireReturnBooking: allowMultiDay ? requireReturnBooking : false,
            allowFlexibleReturn: allowMultiDay ? allowFlexibleReturn : false,
            provideDriverAccommodation: allowMultiDay ? provideDriverAccommodation : false
        }
    };
    
    console.log('Coverage settings:', coverageData);
    
    // In real app, save to backend
    let message = `Coverage settings saved!\nMax Distance: ${maxDistance}km\nSelected Provinces: ${selectedProvinces.length}\nProvinces: ${selectedProvinces.join(', ')}`;
    
    if (baseLocation) {
        message += `\nBase Location: ${baseLocation.address}`;
    }
    
    if (allowMultiDay) {
        message += `\nMulti-day trips: Enabled (Max ${maxStayDays} days, R${returnTripRate}/day)`;
    } else {
        message += `\nMulti-day trips: Disabled`;
    }
    
    alert(message);
    closeCoverageModal();
}

function viewCoverageMap() {
    alert('Coverage map feature coming soon! This will show your service areas on an interactive map.');
}

// Form submission
document.getElementById('vehicleForm').addEventListener('submit', function(e) {
    e.preventDefault();
    
    const formData = {
        name: document.getElementById('vehicleName').value,
        type: document.getElementById('vehicleType').value,
        registration: document.getElementById('registration').value,
        rate: document.getElementById('ratePerKm').value,
        amenities: document.getElementById('amenities').value,
        description: document.getElementById('description').value,
        images: uploadedImages,
        mainImageIndex: mainImageIndex
    };
    
    // In real app, send to backend
    console.log('Vehicle data:', formData);
    console.log('Main image index:', mainImageIndex);
    console.log('Total images:', uploadedImages.length);
    
    if (uploadedImages.length === 0) {
        alert('Please upload at least one image for your vehicle.');
        return;
    }
    
    alert(`Vehicle added successfully with ${uploadedImages.length} image(s)! Main image is image ${mainImageIndex + 1}.`);
    closeModal();
    location.reload();
});

// Load dashboard data
function loadDashboardData() {
    // In real app, load data from backend
    console.log('Loading dashboard data...');
}


// Booking action functions
function acceptBooking(bookingId) {
    alert(`Booking ${bookingId} accepted! Customer will be notified.`);
    // In real app, update booking status in backend
}

function declineBooking(bookingId) {
    if (confirm(`Are you sure you want to decline booking ${bookingId}?`)) {
        alert(`Booking ${bookingId} declined. Customer will be notified.`);
        // In real app, update booking status in backend
    }
}

function contactCustomer(customerName) {
    alert(`Opening contact options for ${customerName}...`);
    // In real app, open contact modal or redirect to messaging
}

function viewBookingDetails(bookingId) {
    alert(`Viewing details for booking ${bookingId}...`);
    // In real app, open booking details modal
}

function cancelBooking(bookingId) {
    if (confirm(`Are you sure you want to cancel booking ${bookingId}?`)) {
        alert(`Booking ${bookingId} cancelled. Customer will be notified.`);
        // In real app, update booking status in backend
    }
}

// Date/Time Display Functionality
function updateDateTime() {
    const now = new Date();
    const dateOptions = { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric' };
    const formattedDate = now.toLocaleDateString('en-ZA', dateOptions);
    const timeOptions = { hour: '2-digit', minute: '2-digit', hour12: false };
    const formattedTime = now.toLocaleTimeString('en-ZA', timeOptions);
    
    const dateElement = document.getElementById('currentDate');
    const timeElement = document.getElementById('currentTimeLarge');
    
    if (dateElement) dateElement.textContent = formattedDate;
    if (timeElement) timeElement.textContent = formattedTime;
}

// Driver Management Functions

function loadDrivers() {
    let drivers = JSON.parse(localStorage.getItem('ownerDrivers') || '[]');
    const driversGrid = document.getElementById('driversGrid');
    
    if (!driversGrid) return;
    
    // Create sample drivers if none exist (for demo purposes)
    if (drivers.length === 0) {
        drivers = createSampleDrivers();
        localStorage.setItem('ownerDrivers', JSON.stringify(drivers));
    }
    
    driversGrid.innerHTML = drivers.map(driver => createDriverCard(driver)).join('');
}

function createSampleDrivers() {
    const now = new Date();
    const sampleDrivers = [
        {
            id: 'DRIVER_' + (Date.now() - 86400000 * 30), // 30 days ago
            photo: null, // No photo for sample
            firstName: 'Thabo',
            surname: 'Molefe',
            idNumber: '8501015801087',
            dateOfBirth: '1985-01-01',
            phone: '071 234 5678',
            email: 'thabo.molefe@email.com',
            address: '123 Main Street, Johannesburg, Gauteng',
            licenseNumber: 'DL123456789',
            licenseExpiry: new Date(now.getFullYear() + 2, 5, 15).toISOString().split('T')[0],
            licenseClass: 'PDP',
            experienceYears: 12,
            notes: 'Experienced driver, excellent customer service record.',
            status: 'active',
            password: 'driver123', // Default password for login
            createdAt: new Date(now.getTime() - 86400000 * 30).toISOString(),
            updatedAt: new Date(now.getTime() - 86400000 * 30).toISOString()
        },
        {
            id: 'DRIVER_' + (Date.now() - 86400000 * 20), // 20 days ago
            photo: null,
            firstName: 'Nomsa',
            surname: 'Dlamini',
            idNumber: '9203155902088',
            dateOfBirth: '1992-03-15',
            phone: '082 345 6789',
            email: 'nomsa.dlamini@email.com',
            address: '456 Oak Avenue, Pretoria, Gauteng',
            licenseNumber: 'DL987654321',
            licenseExpiry: new Date(now.getFullYear() + 1, 8, 20).toISOString().split('T')[0],
            licenseClass: 'C',
            experienceYears: 8,
            notes: 'Very reliable, prefers long-distance routes.',
            status: 'active',
            password: 'driver123', // Default password for login
            createdAt: new Date(now.getTime() - 86400000 * 20).toISOString(),
            updatedAt: new Date(now.getTime() - 86400000 * 20).toISOString()
        },
        {
            id: 'DRIVER_' + (Date.now() - 86400000 * 10), // 10 days ago
            photo: null,
            firstName: 'Sipho',
            surname: 'Ngubane',
            idNumber: '8805205803089',
            dateOfBirth: '1988-05-20',
            phone: '073 456 7890',
            email: 'sipho.ngubane@email.com',
            address: '789 Pine Road, Cape Town, Western Cape',
            licenseNumber: 'DL555666777',
            licenseExpiry: new Date(now.getFullYear() + 3, 2, 10).toISOString().split('T')[0],
            licenseClass: 'EC',
            experienceYears: 15,
            notes: 'Senior driver, handles heavy vehicles and trailers.',
            status: 'active',
            password: 'driver123', // Default password for login
            createdAt: new Date(now.getTime() - 86400000 * 10).toISOString(),
            updatedAt: new Date(now.getTime() - 86400000 * 10).toISOString()
        },
        {
            id: 'DRIVER_' + (Date.now() - 86400000 * 5), // 5 days ago
            photo: null,
            firstName: 'Lindiwe',
            surname: 'Khumalo',
            idNumber: '9508105904090',
            dateOfBirth: '1995-08-10',
            phone: '084 567 8901',
            email: 'lindiwe.khumalo@email.com',
            address: '321 Elm Street, Durban, KwaZulu-Natal',
            licenseNumber: 'DL111222333',
            licenseExpiry: new Date(now.getFullYear() + 1, 11, 5).toISOString().split('T')[0],
            licenseClass: 'C1',
            experienceYears: 5,
            notes: 'New driver, very enthusiastic and punctual.',
            status: 'active',
            password: 'driver123', // Default password for login
            createdAt: new Date(now.getTime() - 86400000 * 5).toISOString(),
            updatedAt: new Date(now.getTime() - 86400000 * 5).toISOString()
        }
    ];
    
    return sampleDrivers;
}

function createDriverCard(driver) {
    const statusClass = `driver-status-${driver.status}`;
    const statusText = driver.status === 'active' ? 'Active' : 
                     driver.status === 'inactive' ? 'Inactive' :
                     driver.status === 'on_leave' ? 'On Leave' : 'Suspended';
    
    const photoHtml = driver.photo ? 
        `<img src="${driver.photo}" alt="${driver.firstName} ${driver.surname}" class="driver-photo">` :
        `<div class="driver-photo-placeholder"><i class="fas fa-user"></i></div>`;
    
    return `
        <div class="driver-card" data-driver-id="${driver.id}">
            <div class="driver-photo-container">
                ${photoHtml}
            </div>
            <div class="driver-info">
                <h3 class="driver-name">${escapeHtml(driver.firstName)} ${escapeHtml(driver.surname)}</h3>
                <div class="driver-details">
                    <div class="driver-detail-item">
                        <i class="fas fa-phone"></i>
                        <span class="driver-detail-label">Phone:</span>
                        <span class="driver-detail-value">${escapeHtml(driver.phone)}</span>
                    </div>
                    <div class="driver-detail-item">
                        <i class="fas fa-envelope"></i>
                        <span class="driver-detail-label">Email:</span>
                        <span class="driver-detail-value">${escapeHtml(driver.email)}</span>
                    </div>
                    <div class="driver-detail-item">
                        <i class="fas fa-id-badge"></i>
                        <span class="driver-detail-label">License:</span>
                        <span class="driver-detail-value">${escapeHtml(driver.licenseNumber)} (${escapeHtml(driver.licenseClass)})</span>
                    </div>
                    <div class="driver-detail-item">
                        <i class="fas fa-calendar-alt"></i>
                        <span class="driver-detail-label">License Expiry:</span>
                        <span class="driver-detail-value">${new Date(driver.licenseExpiry).toLocaleDateString('en-ZA')}</span>
                    </div>
                    <div class="driver-detail-item">
                        <i class="fas fa-clock"></i>
                        <span class="driver-detail-label">Experience:</span>
                        <span class="driver-detail-value">${driver.experienceYears} years</span>
                    </div>
                </div>
                <span class="driver-status-badge ${statusClass}">${statusText}</span>
                <div class="driver-actions">
                    <a href="owner-driver-post.html?id=${driver.id}" class="btn-action btn-edit">
                        <i class="fas fa-edit"></i> Edit
                    </a>
                    <button class="btn-action btn-delete" onclick="deleteDriver('${driver.id}')">
                        <i class="fas fa-trash"></i> Delete
                    </button>
                </div>
            </div>
        </div>
    `;
}


function deleteDriver(driverId) {
    if (!confirm('Are you sure you want to delete this driver? This action cannot be undone.')) {
        return;
    }
    
    let drivers = JSON.parse(localStorage.getItem('ownerDrivers') || '[]');
    drivers = drivers.filter(d => d.id !== driverId);
    localStorage.setItem('ownerDrivers', JSON.stringify(drivers));
    
    alert('Driver deleted successfully!');
    loadDrivers();
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Load vehicles from localStorage
function loadVehicles() {
    const vehicles = JSON.parse(localStorage.getItem('ownerVehicles') || '[]');
    const vehicleGrid = document.getElementById('vehicleGridContainer');
    
    if (!vehicleGrid) return;

    // Clear existing dynamic vehicles (keep the static ones and "Add New Vehicle" card)
    const staticVehicles = vehicleGrid.querySelectorAll('.vehicle-card:not([data-dynamic])');
    const addVehicleCard = vehicleGrid.querySelector('.add-vehicle-card');
    
    // Remove dynamic vehicles
    vehicleGrid.querySelectorAll('.vehicle-card[data-dynamic]').forEach(card => card.remove());

    // Add pending vehicles
    vehicles.forEach(vehicle => {
        if (vehicle.status === 'pending') {
            const vehicleCard = createVehicleCard(vehicle);
            vehicleGrid.insertBefore(vehicleCard, addVehicleCard);
        }
    });
}

// Create vehicle card HTML
function createVehicleCard(vehicle) {
    const card = document.createElement('div');
    card.className = 'vehicle-card';
    card.setAttribute('data-dynamic', 'true');
    card.setAttribute('data-vehicle-id', vehicle.id);

    const vehicleTypeDisplay = vehicle.vehicleType === 'minibus' ? 'Minibus (16-18 seats)' : 
                              vehicle.vehicleType === 'bus' ? '22-Seater Bus' : vehicle.vehicleType;
    
    const statusClass = vehicle.status === 'pending' ? 'status-pending' : 
                       vehicle.status === 'active' ? 'status-active' : 'status-inactive';
    
    const statusText = vehicle.status === 'pending' ? 'Pending Approval' : 
                     vehicle.status === 'active' ? 'Active' : 'Inactive';

    card.innerHTML = `
        <div class="vehicle-image">
            <i class="fas fa-bus"></i>
        </div>
        <div class="vehicle-info">
            <h3 class="vehicle-name">${escapeHtml(vehicle.vehicleName)}</h3>
            <div class="vehicle-details">
                <div class="detail-item">
                    <span class="detail-label">Type</span>
                    <span class="detail-value">${escapeHtml(vehicleTypeDisplay)}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Registration</span>
                    <span class="detail-value">${escapeHtml(vehicle.registration)}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Capacity</span>
                    <span class="detail-value">${escapeHtml(vehicle.capacity)} seats</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Submitted</span>
                    <span class="detail-value">${vehicle.submittedDate || 'N/A'}</span>
                </div>
            </div>
            <span class="vehicle-status ${statusClass}">${statusText}</span>
            ${vehicle.status === 'pending' ? `
            <div style="margin-top: 0.5rem; padding: 0.5rem; background: #fff3cd; border-radius: 8px; font-size: 0.75rem; color: #856404;">
                <i class="fas fa-clock"></i> Awaiting admin approval
            </div>
            ` : ''}
            <div class="vehicle-actions">
                ${vehicle.status === 'pending' ? `
                <button class="btn-action btn-secondary" onclick="viewVehicleDetails('${vehicle.id}')" style="flex: 1;">
                    <i class="fas fa-eye"></i> View Details
                </button>
                ` : `
                <button class="btn-action btn-edit" onclick="editVehicle('${vehicle.id}')">
                    <i class="fas fa-edit"></i> Edit
                </button>
                <button class="btn-action btn-toggle" onclick="toggleVehicle('${vehicle.id}')">
                    <i class="fas fa-pause"></i> Pause
                </button>
                <button class="btn-action btn-delete" onclick="deleteVehicle('${vehicle.id}')">
                    <i class="fas fa-trash"></i> Delete
                </button>
                `}
            </div>
        </div>
    `;

    return card;
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return String(text).replace(/[&<>"']/g, m => map[m]);
}

// View vehicle details
function viewVehicleDetails(vehicleId) {
    const vehicles = JSON.parse(localStorage.getItem('ownerVehicles') || '[]');
    const vehicle = vehicles.find(v => v.id === vehicleId);
    
    if (vehicle) {
        alert(`Vehicle: ${vehicle.vehicleName}\nStatus: Pending Approval\nSubmitted: ${vehicle.submittedDate || 'N/A'}\n\nAn admin will review and approve this vehicle within 24-48 hours.`);
    }
}

// Initialize date/time display
document.addEventListener('DOMContentLoaded', function() {
    updateDateTime();
    setInterval(updateDateTime, 1000); // Update every second
    loadVehicles(); // Load vehicles from localStorage
    loadRecentBookings(); // Load recent bookings
});

// Close modals when clicking outside
window.onclick = function(event) {
    const vehicleModal = document.getElementById('vehicleModal');
    const coverageModal = document.getElementById('coverageModal');
    
    if (event.target === vehicleModal) {
        closeModal();
    }
    if (event.target === coverageModal) {
        closeCoverageModal();
    }
}

// Mobile menu toggle function
function toggleMobileMenu() {
    const menu = document.getElementById("mobileMenu");
    const isShown = menu.classList.toggle("show");

    if (isShown) {
        topNavZIndexIncrease();
    } else {
        topNavZIndexDecrease();
    }
}

function topNavZIndexIncrease() {
    const navbar = document.querySelector(".topnav");
    if (navbar) {
        navbar.style.zIndex = "3001";
    }
}

function topNavZIndexDecrease() {
    const navbar = document.querySelector(".topnav");
    if (navbar) {
        navbar.style.zIndex = "3";
    }
}


  // Check authentication status and update navigation
  document.addEventListener('DOMContentLoaded', function() {
    const authButtons = document.getElementById('authButtons');
    const fullNav = document.getElementById('fullNav');
    
    // Check if user is logged in
    const isLoggedIn = localStorage.getItem('userProfile') || sessionStorage.getItem('userProfile');
    
    if (isLoggedIn) {
        // User is logged in - show full navigation
        if (authButtons) authButtons.style.display = 'none';
        if (fullNav) fullNav.style.display = 'flex';
    } else {
        // User is not logged in - show auth buttons
        if (authButtons) authButtons.style.display = 'flex';
        if (fullNav) fullNav.style.display = 'none';
    }
});