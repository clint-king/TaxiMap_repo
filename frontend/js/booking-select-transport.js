// Select Transport Page JavaScript
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

// Global variables
let tripInfo = null;
let selectedTransportType = null;
let selectedVehicle = null;
let availableVehicles = [];

// Initialize the page
document.addEventListener('DOMContentLoaded', function() {
    loadTripInfo();
    setupEventListeners();
    loadAvailableVehicles();
    calculatePriceEstimates();
});

function loadTripInfo() {
    const tripInfoData = sessionStorage.getItem('tripInfo');
    if (!tripInfoData) {
        // For demo purposes, create default trip info
        tripInfo = {
            pickup: "123 Main Street, Johannesburg",
            destination: "456 Oak Avenue, Pretoria",
            date: "2024-01-15",
            time: "14:30",
            distance: 45.5,
            duration: "1h 15min"
        };
        sessionStorage.setItem('tripInfo', JSON.stringify(tripInfo));
    } else {
        tripInfo = JSON.parse(tripInfoData);
    }
    console.log('Trip Info:', tripInfo);
}

function setupEventListeners() {
    // Transport type selection
    document.querySelectorAll('.transport-type-card').forEach(card => {
        card.addEventListener('click', function() {
            selectTransportType(this.dataset.type);
        });
    });
    
    // Filter controls
    document.getElementById('vehicleFilter').addEventListener('change', filterVehicles);
    document.getElementById('sortBy').addEventListener('change', sortVehicles);
    
    // Proceed to payment
    document.getElementById('proceedToPayment').addEventListener('click', proceedToPayment);
    
    // Modal close
    document.querySelector('.close').addEventListener('click', closeModal);
    window.addEventListener('click', function(e) {
        const modal = document.getElementById('vehicleModal');
        if (e.target === modal) {
            closeModal();
        }
    });
}

function selectTransportType(type) {
    selectedTransportType = type;
    
    // Update UI
    document.querySelectorAll('.transport-type-card').forEach(card => {
        card.classList.remove('selected');
    });
    document.querySelector(`[data-type="${type}"]`).classList.add('selected');
    
    // Filter vehicles
    filterVehicles();
}

function loadAvailableVehicles() {
    // Mock data - in real implementation, this would come from your backend
    availableVehicles = [
        {
            id: 1,
            type: 'minibus',
            name: 'Golden Arrow Minibus',
            capacity: 16,
            registration: 'CA 123-456',
            owner: 'John Mthembu',
            rating: 4.8,
            price: 15.50,
            distance: 2.3,
            image: './images/tol00005_u27946_3.jpg',
            amenities: ['AC', 'Music', 'WiFi'],
            description: 'Well-maintained minibus with experienced driver'
        },
        {
            id: 2,
            type: 'minibus',
            name: 'City Express',
            capacity: 18,
            registration: 'GP 789-012',
            owner: 'Sarah Nkomo',
            rating: 4.6,
            price: 14.00,
            distance: 1.8,
            image: './images/toyota-quantum.jpg', 
            amenities: ['AC', 'Music'],
            description: 'Reliable service with friendly driver'
        },
        {
            id: 3,
            type: 'bus',
            name: 'Comfort Bus Lines',
            capacity: 22,
            registration: 'KZN 345-678',
            owner: 'Mike Dlamini',
            rating: 4.9,
            price: 12.00,
            distance: 3.1,
            image: './images/Coach Rentals 27.jpeg',
            amenities: ['AC', 'Music', 'WiFi', 'Charging Ports'],
            description: 'Premium bus service with all amenities'
        },
        {
            id: 4,
            type: 'bus',
            name: 'Metro Transport',
            capacity: 22,
            registration: 'WC 901-234',
            owner: 'Lisa van der Merwe',
            rating: 4.7,
            price: 13.50,
            distance: 2.7,
            image: './images/images.jpeg',
            amenities: ['AC', 'Music', 'WiFi'],
            description: 'Professional service with modern vehicles'
        }
    ];
    
    displayVehicles(availableVehicles);
}

function displayVehicles(vehicles) {
    const vehicleList = document.getElementById('vehicleList');
    vehicleList.innerHTML = '';
    
    if (vehicles.length === 0) {
        vehicleList.innerHTML = '<p class="no-vehicles">No vehicles available for the selected criteria.</p>';
        return;
    }
    
    vehicles.forEach(vehicle => {
        const vehicleCard = createVehicleCard(vehicle);
        vehicleList.appendChild(vehicleCard);
    });
}

function createVehicleCard(vehicle) {
    const card = document.createElement('div');
    card.className = 'vehicle-card';
    card.dataset.vehicleId = vehicle.id;
    
    const totalPrice = calculateTotalPrice(vehicle);
    
    card.innerHTML = `
        <div class="vehicle-image">
            <img src="${vehicle.image}" alt="${vehicle.name}" onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzUwIiBoZWlnaHQ9IjE1MCIgdmlld0JveD0iMCAwIDM1MCAxNTAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjM1MCIgaGVpZ2h0PSIxNTAiIGZpbGw9IiMwMTM4NkEiLz48dGV4dCB4PSIxNzUiIHk9Ijc1IiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTQiIGZpbGw9IiNGRkQ1MkYiIHRleHQtYW5jaG9yPSJtaWRkbGUiPk5vIEltYWdlPC90ZXh0Pjwvc3ZnPg=='">
        </div>
        <div class="vehicle-details">
            <h3 class="vehicle-name">${vehicle.name}</h3>
            <div class="vehicle-info">
                <div class="vehicle-info-item">
                    <span class="vehicle-info-label">Type:</span>
                    <span class="vehicle-info-value">${vehicle.type === 'minibus' ? 'Minibus Taxi' : '22-Seater Bus'}</span>
                </div>
                <div class="vehicle-info-item">
                    <span class="vehicle-info-label">Capacity:</span>
                    <span class="vehicle-info-value">${vehicle.capacity} seats</span>
                </div>
                <div class="vehicle-info-item">
                    <span class="vehicle-info-label">Registration:</span>
                    <span class="vehicle-info-value">${vehicle.registration}</span>
                </div>
                <div class="vehicle-info-item">
                    <span class="vehicle-info-label">Owner:</span>
                    <span class="vehicle-info-value">${vehicle.owner}</span>
                </div>
                <div class="vehicle-info-item">
                    <span class="vehicle-info-label">Distance:</span>
                    <span class="vehicle-info-value">${vehicle.distance} km away</span>
                </div>
            </div>
            <div class="vehicle-rating">
                <div class="stars">${'★'.repeat(Math.floor(vehicle.rating))}${'☆'.repeat(5 - Math.floor(vehicle.rating))}</div>
                <span class="rating-text">${vehicle.rating}/5 (${Math.floor(Math.random() * 50) + 10} reviews)</span>
            </div>
            <div class="vehicle-price">
                <span class="price-label">R ${vehicle.price.toFixed(2)}/km</span>
                <span class="price-amount">Total: R ${totalPrice.toFixed(2)}</span>
            </div>
            <div class="vehicle-actions">
                <button class="btn-view-details" onclick="showVehicleDetails(${vehicle.id})">View Details</button>
                <button class="btn-select" onclick="selectVehicle(${vehicle.id})">Select</button>
            </div>
        </div>
    `;
    
    return card;
}

function calculateTotalPrice(vehicle) {
    // Mock calculation - in real implementation, this would be based on actual route distance
    const estimatedDistance = 25; // km
    const basePrice = vehicle.price * estimatedDistance;
    const passengerMultiplier = Math.ceil(tripInfo.passengerCount / vehicle.capacity);
    
    return basePrice * passengerMultiplier;
}

function calculatePriceEstimates() {
    const estimatedDistance = 25; // Mock distance
    
    // Calculate minibus price
    const minibusPrice = 15.00 * estimatedDistance;
    document.getElementById('minibusPrice').textContent = `R ${minibusPrice.toFixed(2)}`;
    
    // Calculate bus price
    const busPrice = 12.50 * estimatedDistance;
    document.getElementById('busPrice').textContent = `R ${busPrice.toFixed(2)}`;
}

function filterVehicles() {
    const filter = document.getElementById('vehicleFilter').value;
    let filteredVehicles = availableVehicles;
    
    if (filter !== 'all') {
        filteredVehicles = availableVehicles.filter(vehicle => vehicle.type === filter);
    }
    
    // Apply transport type filter if selected
    if (selectedTransportType) {
        filteredVehicles = filteredVehicles.filter(vehicle => vehicle.type === selectedTransportType);
    }
    
    sortVehicles(filteredVehicles);
}

function sortVehicles(vehicles = null) {
    const sortBy = document.getElementById('sortBy').value;
    const vehiclesToSort = vehicles || availableVehicles;
    
    let sortedVehicles = [...vehiclesToSort];
    
    switch (sortBy) {
        case 'price':
            sortedVehicles.sort((a, b) => calculateTotalPrice(a) - calculateTotalPrice(b));
            break;
        case 'rating':
            sortedVehicles.sort((a, b) => b.rating - a.rating);
            break;
        case 'distance':
            sortedVehicles.sort((a, b) => a.distance - b.distance);
            break;
    }
    
    displayVehicles(sortedVehicles);
}

function selectVehicle(vehicleId) {
    selectedVehicle = availableVehicles.find(v => v.id === vehicleId);
    
    // Update UI
    document.querySelectorAll('.vehicle-card').forEach(card => {
        card.classList.remove('selected');
    });
    document.querySelector(`[data-vehicle-id="${vehicleId}"]`).classList.add('selected');
    
    // Show selected vehicle summary
    showSelectedVehicleSummary();
}

function showSelectedVehicleSummary() {
    if (!selectedVehicle) return;
    
    const totalPrice = calculateTotalPrice(selectedVehicle);
    
    document.getElementById('selectedVehicleImage').src = selectedVehicle.image;
    document.getElementById('selectedVehicleName').textContent = selectedVehicle.name;
    document.getElementById('selectedVehicleType').textContent = selectedVehicle.type === 'minibus' ? 'Minibus Taxi' : '22-Seater Bus';
    document.getElementById('selectedVehicleCapacity').textContent = `${selectedVehicle.capacity} seats`;
    document.getElementById('selectedVehiclePrice').textContent = `R ${totalPrice.toFixed(2)}`;
    
    document.getElementById('selectedVehicleSummary').style.display = 'block';
    
    // Scroll to summary
    document.getElementById('selectedVehicleSummary').scrollIntoView({ behavior: 'smooth' });
}

function showVehicleDetails(vehicleId) {
    const vehicle = availableVehicles.find(v => v.id === vehicleId);
    if (!vehicle) return;
    
    const modalContent = document.getElementById('vehicleModalContent');
    modalContent.innerHTML = `
        <div class="vehicle-details-modal">
            <div class="modal-header">
                <h2>${vehicle.name}</h2>
                <div class="vehicle-rating">
                    <div class="stars">${'★'.repeat(Math.floor(vehicle.rating))}${'☆'.repeat(5 - Math.floor(vehicle.rating))}</div>
                    <span class="rating-text">${vehicle.rating}/5</span>
                </div>
            </div>
            
            <div class="modal-body">
                <div class="vehicle-image-large">
                    <img src="${vehicle.image}" alt="${vehicle.name}" onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDQwMCAyMDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjQwMCIgaGVpZ2h0PSIyMDAiIGZpbGw9IiMwMTM4NkEiLz48dGV4dCB4PSIyMDAiIHk9IjEwMCIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjE4IiBmaWxsPSIjRkZENTJGIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj5ObyBJbWFnZTwvdGV4dD48L3N2Zz4='">
                </div>
                
                <div class="vehicle-info-detailed">
                    <h3>Vehicle Information</h3>
                    <div class="info-grid">
                        <div class="info-item">
                            <span class="info-label">Type:</span>
                            <span class="info-value">${vehicle.type === 'minibus' ? 'Minibus Taxi' : '22-Seater Bus'}</span>
                        </div>
                        <div class="info-item">
                            <span class="info-label">Capacity:</span>
                            <span class="info-value">${vehicle.capacity} seats</span>
                        </div>
                        <div class="info-item">
                            <span class="info-label">Registration:</span>
                            <span class="info-value">${vehicle.registration}</span>
                        </div>
                        <div class="info-item">
                            <span class="info-label">Distance:</span>
                            <span class="info-value">${vehicle.distance} km away</span>
                        </div>
                    </div>
                    
                    <h3>Owner Information</h3>
                    <div class="owner-info">
                        <div class="owner-name">${vehicle.owner}</div>
                        <div class="owner-rating">Rating: ${vehicle.rating}/5</div>
                    </div>
                    
                    <h3>Amenities</h3>
                    <div class="amenities">
                        ${vehicle.amenities.map(amenity => `<span class="amenity-tag">${amenity}</span>`).join('')}
                    </div>
                    
                    <h3>Description</h3>
                    <p class="vehicle-description">${vehicle.description}</p>
                    
                    <div class="modal-actions">
                        <button class="btn btn-secondary" onclick="closeModal()">Close</button>
                        <button class="btn btn-primary" onclick="selectVehicle(${vehicle.id}); closeModal();">Select This Vehicle</button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    document.getElementById('vehicleModal').style.display = 'block';
}

function closeModal() {
    document.getElementById('vehicleModal').style.display = 'none';
}

function proceedToPayment() {
    if (!selectedVehicle) {
        alert('Please select a vehicle first');
        return;
    }
    
    // Store selected vehicle data
    const bookingData = {
        tripInfo: tripInfo,
        selectedVehicle: selectedVehicle,
        totalPrice: calculateTotalPrice(selectedVehicle)
    };
    
    sessionStorage.setItem('bookingData', JSON.stringify(bookingData));
    
    // Navigate to payment page (to be created)
    alert('Payment page coming soon!');
    // window.location.href = './booking-payment.html';
}

// Make functions globally available
window.toggleMobileMenu = toggleMobileMenu;
window.topNavZIndexDecrease = topNavZIndexDecrease;
window.showVehicleDetails = showVehicleDetails;
window.selectVehicle = selectVehicle;
window.closeModal = closeModal;
