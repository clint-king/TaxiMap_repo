import * as bookingApi from '../../js/api/bookingApi.js';

// Booking card creation and detail view functions
// Note: These functions rely on global variables: allBookings



// Store bookings globally
let allBookings = [];
let autoSettings = {
    routeLocal: 'manual',
    routeLong: 'manual',
    custom: 'manual'
};

// Load auto settings from localStorage
function loadAutoSettings() {
    const saved = localStorage.getItem('ownerAutoSettings');
    if (saved) {
        autoSettings = JSON.parse(saved);
        // Update radio buttons
        document.getElementById('routeLocalAccept').checked = autoSettings.routeLocal === 'auto-accept';
        document.getElementById('routeLocalReject').checked = autoSettings.routeLocal === 'auto-reject';
        document.getElementById('routeLocalManual').checked = autoSettings.routeLocal === 'manual';
        document.getElementById('routeLongAccept').checked = autoSettings.routeLong === 'auto-accept';
        document.getElementById('routeLongReject').checked = autoSettings.routeLong === 'auto-reject';
        document.getElementById('routeLongManual').checked = autoSettings.routeLong === 'manual';
        document.getElementById('customAccept').checked = autoSettings.custom === 'auto-accept';
        document.getElementById('customReject').checked = autoSettings.custom === 'auto-reject';
        document.getElementById('customManual').checked = autoSettings.custom === 'manual';
    }
}

// Save auto settings
function saveAutoSettings() {
    autoSettings.routeLocal = document.querySelector('input[name="routeLocalAuto"]:checked').value;
    autoSettings.routeLong = document.querySelector('input[name="routeLongAuto"]:checked').value;
    autoSettings.custom = document.querySelector('input[name="customAuto"]:checked').value;
    localStorage.setItem('ownerAutoSettings', JSON.stringify(autoSettings));
    alert('Auto-settings saved successfully!');
}
// Navigation functions
function toggleMobileMenu() {
    const mobileMenu = document.getElementById('mobileMenu');
    mobileMenu.classList.toggle('show');
}

function topNavZIndexDecrease() {
    // Function for navigation link clicks
}

// Check authentication status
document.addEventListener('DOMContentLoaded', async function() {
    const authButtons = document.getElementById('authButtons');
    const fullNav = document.getElementById('fullNav');
    
    const isLoggedIn = localStorage.getItem('userProfile') || sessionStorage.getItem('userProfile') || 
                      localStorage.getItem('currentUser') || sessionStorage.getItem('currentUser');
    
    if (isLoggedIn) {
        if (authButtons) authButtons.style.display = 'none';
        if (fullNav) fullNav.style.display = 'flex';
    } else {
        if (authButtons) authButtons.style.display = 'flex';
        if (fullNav) fullNav.style.display = 'none';
    }

    await loadBookings();
});

function showBookingTab(tabName) {
    // Hide all tab content sections
    document.querySelectorAll('.tab-content-section').forEach(section => {
        section.classList.remove('active');
    });

    // Remove active class from all buttons
    document.querySelectorAll('.booking-tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });

    // Show selected tab content
    document.getElementById(`${tabName}-bookings`).classList.add('active');

    // Add active class to clicked button
    event.target.classList.add('active');
}

// {
//     id: 'BK-2025-001',
//     status: 'pending',
//     type: 'route-based',
//     routeType: 'local',
//     tripName: 'Johannesburg Local',
//     collectionDelivery: 'collection',
//     date: 'Today, 2:30 PM',
//     time: '14:30',
//     distance: '28.5 km',
//     passengers: 3,
//     parcels: 2,
//     amount: 'R 516.75',
//     timeAgo: '2 hours ago',
//     customer: {
//         name: 'Sarah Mthembu',
//         phone: '082 123 4567',
//         email: 'sarah@example.com'
//     },
//     passengerDetails: [
//         { name: 'Sarah Mthembu', id: '850101 5800 08 5', phone: '082 123 4567', pickup: 'Sandton City Mall, Sandton', dropoff: 'OR Tambo Airport' },
//         { name: 'John Mthembu', id: '920315 5800 08 6', phone: '082 123 4568', pickup: 'Sandton City Mall, Sandton', dropoff: 'OR Tambo Airport' },
//         { name: 'Mary Mthembu', id: '950520 5800 08 7', phone: '082 123 4569', pickup: 'Sandton City Mall, Sandton', dropoff: 'OR Tambo Airport' }
//     ],
//     parcelDetails: [
//         { size: 'Medium', weight: '12kg', sender: 'Sarah Mthembu', receiver: 'John Doe', secretCode: 'ABC123', image: '../../assets/images/default-avatar.png', pickup: 'Sandton City Mall, Sandton', dropoff: '123 Main St, Tzaneen' },
//         { size: 'Small', weight: '4kg', sender: 'Sarah Mthembu', receiver: 'Jane Smith', secretCode: 'XYZ789', image: '../../assets/images/default-avatar.png', pickup: 'Sandton City Mall, Sandton', dropoff: '456 Oak Ave, Tzaneen' }
//     ],
//     waitingPoints: [
//         { type: 'waiting', location: 'Sandton City Mall Parking, Sandton', description: 'Drop-off point for passengers and parcels' }
//     ],
//     pickupLocations: [
//         { type: 'pickup', location: 'Sandton City Mall, Sandton', description: 'Collect passengers and parcels' }
//     ],
//     dropoffLocations: [
//         { type: 'dropoff', location: 'OR Tambo Airport, Kempton Park', description: 'Drop-off passengers' },
//         { type: 'dropoff', location: '123 Main St, Tzaneen', description: 'Drop-off parcel for John Doe' },
//         { type: 'dropoff', location: '456 Oak Ave, Tzaneen', description: 'Drop-off parcel for Jane Smith' }
//     ],
//     route: 'Via N1 Highway'
// }

async function createComprehensiveBookings() {
    let allBookingsData;
    try{
    allBookingsData = await bookingApi.getAllBookingsOwner();
    console.log('allBookingsData:', allBookingsData);
    }catch(error){
        console.error('Error fetching all bookings:', error);
        throw error;
    }
    console.log('allBookingsData:', allBookingsData);
    let allBookings = [];
    if(allBookingsData.success){
        allBookingsData.allBookings.forEach(booking => {
        
        let fromLocation = '';
        let toLocation = '';
        if(booking.bookingInfo.direction_type === 'from_loc1' ){
            fromLocation = booking.bookingInfo.location_1;
            toLocation = booking.bookingInfo.location_2;
        }else{
            fromLocation = booking.bookingInfo.location_2;
            toLocation = booking.bookingInfo.location_1;
            }


            allBookings.push({
                id: booking.bookingInfo.booking_reference,
                status: booking.bookingInfo.booking_status,
                type:  'route-based',
                routeType: 'long-distance',
                tripName: `${fromLocation} - ${toLocation}`,
                date: new Date(booking.bookingInfo.scheduled_pickup).toLocaleDateString('en-ZA', { weekday: 'long', day: 'numeric', month: 'long' }),
                time: new Date(booking.bookingInfo.scheduled_pickup).toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' }),
                distance: booking.bookingInfo.distance_km + ' km',
                passengers: booking.bookingInfo.passenger_count,
                parcels: booking.bookingInfo.total_parcels,
                amount: 'R ' + booking.bookingInfo.total_amount_paid,
                timeAgo: new Date(booking.bookingInfo.created_at).toLocaleString('en-ZA', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' }),
                passengerDetails: booking.passengers.map(passenger => ({
                    name: passenger.name,
                    id: passenger.id,
                    phone: passenger.phone,
                    pickup: passenger.pickup_address,
                    dropoff: passenger.dropoff_address,
                })),
                parcelDetails: booking.parcels.map(parcel => {
                    // Parse parcel_images JSON and filter out empty objects
                    let images = [];
                    try {
                        if (parcel.parcel_images) {
                            const parsed = typeof parcel.parcel_images === 'string' 
                                ? JSON.parse(parcel.parcel_images) 
                                : parcel.parcel_images;
                            
                            if (Array.isArray(parsed)) {
                                // Filter out empty objects and null values
                                images = parsed.filter(img => img && typeof img === 'string' && img.length > 0);
                            } else if (typeof parsed === 'string' && parsed.length > 0) {
                                images = [parsed];
                            }
                        }
                    } catch (e) {
                        console.error('Error parsing parcel images:', e);
                        images = [];
                    }
                    
                    return {
                        size: parcel.parcel_size,
                        sender: parcel.parcel_sender_name,
                        receiver: parcel.parcel_receiver_name,
                        image: images.length > 0 ? images[0] : null, // Use first image for display
                        images: images, // Store all images
                        pickup: parcel.parcel_pickup_address,
                        dropoff: parcel.parcel_dropoff_address,
                    };
                }),
                pickupLocations: [...booking.passengers.map(passenger => ({
                    type: 'pickup',
                    location: passenger.pickup_address,
                    description: 'Collect passengers and parcels'
                })) , ...booking.parcels.map(parcel => ({
                    type: 'pickup',
                    location: parcel.parcel_pickup_address,
                    description: 'Collect parcels'
                }))],
                dropoffLocations: [...booking.passengers.map(passenger => ({
                    type: 'dropoff',
                    location: passenger.dropoff_address,
                    description: 'Drop-off passengers'
                })) , ...booking.parcels.map(parcel => ({
                    type: 'dropoff',
                    location: parcel.parcel_dropoff_address,
                    description: 'Drop-off parcels'
                }))],
                route: booking.bookingInfo.existing_route_name,
            });
        });
    }
    
    return allBookings;

    //const now = new Date();
    // return [
    //     // Route-Based Local - Collection
    //     {
    //         id: 'BK-2025-001',
    //         status: 'pending',
    //         type: 'route-based',
    //         routeType: 'local',
    //         tripName: 'Johannesburg Local',
    //         collectionDelivery: 'collection',
    //         date: 'Today, 2:30 PM',
    //         time: '14:30',
    //         distance: '28.5 km',
    //         passengers: 3,
    //         parcels: 2,
    //         amount: 'R 516.75',
    //         timeAgo: '2 hours ago',
    //         customer: {
    //             name: 'Sarah Mthembu',
    //             phone: '082 123 4567',
    //             email: 'sarah@example.com'
    //         },
    //         passengerDetails: [
    //             { name: 'Sarah Mthembu', id: '850101 5800 08 5', phone: '082 123 4567', pickup: 'Sandton City Mall, Sandton', dropoff: 'OR Tambo Airport' },
    //             { name: 'John Mthembu', id: '920315 5800 08 6', phone: '082 123 4568', pickup: 'Sandton City Mall, Sandton', dropoff: 'OR Tambo Airport' },
    //             { name: 'Mary Mthembu', id: '950520 5800 08 7', phone: '082 123 4569', pickup: 'Sandton City Mall, Sandton', dropoff: 'OR Tambo Airport' }
    //         ],
    //         parcelDetails: [
    //             { size: 'Medium', weight: '12kg', sender: 'Sarah Mthembu', receiver: 'John Doe', secretCode: 'ABC123', image: '../../assets/images/default-avatar.png', pickup: 'Sandton City Mall, Sandton', dropoff: '123 Main St, Tzaneen' },
    //             { size: 'Small', weight: '4kg', sender: 'Sarah Mthembu', receiver: 'Jane Smith', secretCode: 'XYZ789', image: '../../assets/images/default-avatar.png', pickup: 'Sandton City Mall, Sandton', dropoff: '456 Oak Ave, Tzaneen' }
    //         ],
    //         waitingPoints: [
    //             { type: 'waiting', location: 'Sandton City Mall Parking, Sandton', description: 'Drop-off point for passengers and parcels' }
    //         ],
    //         pickupLocations: [
    //             { type: 'pickup', location: 'Sandton City Mall, Sandton', description: 'Collect passengers and parcels' }
    //         ],
    //         dropoffLocations: [
    //             { type: 'dropoff', location: 'OR Tambo Airport, Kempton Park', description: 'Drop-off passengers' },
    //             { type: 'dropoff', location: '123 Main St, Tzaneen', description: 'Drop-off parcel for John Doe' },
    //             { type: 'dropoff', location: '456 Oak Ave, Tzaneen', description: 'Drop-off parcel for Jane Smith' }
    //         ],
    //         route: 'Via N1 Highway'
    //     },
    //     // Route-Based Local - Delivery
    //     {
    //         id: 'BK-2025-002',
    //         status: 'pending',
    //         type: 'route-based',
    //         routeType: 'local',
    //         tripName: 'Pretoria Local',
    //         collectionDelivery: 'delivery',
    //         date: 'Tomorrow, 8:00 AM',
    //         time: '08:00',
    //         distance: '35.2 km',
    //         passengers: 2,
    //         parcels: 1,
    //         amount: 'R 642.50',
    //         timeAgo: '1 day ago',
    //         customer: {
    //             name: 'John Dlamini',
    //             phone: '083 234 5678',
    //             email: 'john@example.com'
    //         },
    //         passengerDetails: [
    //             { name: 'John Dlamini', id: '880710 5800 08 8', phone: '083 234 5678', pickup: 'Rosebank Mall, Johannesburg', dropoff: 'Pretoria CBD, Pretoria' },
    //             { name: 'Jane Dlamini', id: '901225 5800 08 9', phone: '083 234 5679', pickup: 'Rosebank Mall, Johannesburg', dropoff: 'Pretoria CBD, Pretoria' }
    //         ],
    //         parcelDetails: [
    //             { size: 'Large', weight: '25kg', sender: 'John Dlamini', receiver: 'Mike Johnson', secretCode: 'DEF456', image: '../../assets/images/default-avatar.png', pickup: 'Rosebank Mall, Johannesburg', dropoff: '789 Pine St, Pretoria' }
    //         ],
    //         waitingPoints: [
    //             { type: 'waiting', location: 'Rosebank Mall Parking, Johannesburg', description: 'Collection point for passengers and parcels' }
    //         ],
    //         pickupLocations: [
    //             { type: 'pickup', location: 'Rosebank Mall, Johannesburg', description: 'Collect passengers and parcels' }
    //         ],
    //         dropoffLocations: [
    //             { type: 'dropoff', location: 'Pretoria CBD, Pretoria', description: 'Drop-off passengers' },
    //             { type: 'dropoff', location: '789 Pine St, Pretoria', description: 'Drop-off parcel for Mike Johnson' }
    //         ],
    //         route: 'Via N1 Highway'
    //     },
    //     // Route-Based Long Distance
    //     {
    //         id: 'BK-2025-003',
    //         status: 'confirmed',
    //         type: 'route-based',
    //         routeType: 'long-distance',
    //         tripName: 'Johannesburg - Tzaneen',
    //         date: new Date(now.getTime() + 2 * 86400000).toLocaleDateString('en-ZA', { weekday: 'long', day: 'numeric', month: 'long' }) + ', 10:00 AM',
    //         time: '10:00',
    //         distance: '412.5 km',
    //         passengers: 4,
    //         parcels: 3,
    //         amount: 'R 3,250.00',
    //         timeAgo: '3 days ago',
    //         customer: {
    //             name: 'Mary Khumalo',
    //             phone: '084 345 6789',
    //             email: 'mary@example.com'
    //         },
    //         passengerDetails: [
    //             { name: 'Mary Khumalo', id: '790315 5800 08 1', phone: '084 345 6789', pickup: 'Soweto, Johannesburg', dropoff: 'Tzaneen CBD' },
    //             { name: 'Peter Khumalo', id: '820420 5800 08 2', phone: '084 345 6790', pickup: 'Soweto, Johannesburg', dropoff: 'Tzaneen CBD' },
    //             { name: 'Lisa Khumalo', id: '850815 5800 08 3', phone: '084 345 6791', pickup: 'Soweto, Johannesburg', dropoff: 'Tzaneen CBD' },
    //             { name: 'Tom Khumalo', id: '881120 5800 08 4', phone: '084 345 6792', pickup: 'Soweto, Johannesburg', dropoff: 'Tzaneen CBD' }
    //         ],
    //         parcelDetails: [
    //             { size: 'Large', weight: '28kg', sender: 'Mary Khumalo', receiver: 'David Brown', secretCode: 'GHI789', image: '../../assets/images/default-avatar.png', pickup: 'Soweto, Johannesburg', dropoff: 'Tzaneen CBD' },
    //             { size: 'Medium', weight: '15kg', sender: 'Mary Khumalo', receiver: 'Susan White', secretCode: 'JKL012', image: '../../assets/images/default-avatar.png', pickup: 'Soweto, Johannesburg', dropoff: 'Tzaneen CBD' },
    //             { size: 'Small', weight: '6kg', sender: 'Mary Khumalo', receiver: 'Robert Green', secretCode: 'MNO345', image: '../../assets/images/default-avatar.png', pickup: 'Soweto, Johannesburg', dropoff: 'Tzaneen CBD' }
    //         ],
    //         startingPoint: 'Soweto, Johannesburg',
    //         endingPoint: 'Tzaneen CBD, Tzaneen',
    //         route: 'Via N1 and R71'
    //     },
    //     // Custom Trip - One Way
    //     {
    //         id: 'BK-2025-004',
    //         status: 'confirmed',
    //         type: 'custom-trip',
    //         from: 'Midrand, Johannesburg',
    //         to: 'Johannesburg CBD, Johannesburg',
    //         date: new Date(now.getTime() + 2 * 86400000).toLocaleDateString('en-ZA', { weekday: 'long', day: 'numeric', month: 'long' }) + ', 10:00 AM',
    //         time: '10:00',
    //         departureDate: new Date(now.getTime() + 2 * 86400000).toLocaleDateString('en-ZA', { weekday: 'long', day: 'numeric', month: 'long' }) + ', 10:00 AM',
    //         returnTrip: false,
    //         distance: '22.3 km',
    //         passengers: 1,
    //         amount: 'R 389.45',
    //         timeAgo: '5 days ago',
    //         customer: {
    //             name: 'Peter Ndlovu',
    //             phone: '085 456 7890',
    //             email: 'peter@example.com'
    //         },
    //         passengerDetails: [
    //             { name: 'Peter Ndlovu', id: '870510 5800 08 0', phone: '085 456 7890', pickup: 'Midrand, Johannesburg', dropoff: 'Johannesburg CBD, Johannesburg' }
    //         ],
    //         pickupLocation: 'Midrand, Johannesburg',
    //         destination: 'Johannesburg CBD, Johannesburg',
    //         routeOptions: [
    //             'Via N1 Highway (Fastest - 25 min)',
    //             'Via M1 Highway (Scenic - 30 min)',
    //             'Via Local Roads (Cheapest - 35 min)'
    //         ]
    //     },
    //     // Custom Trip - Return Trip
    //     {
    //         id: 'BK-2025-005',
    //         status: 'pending',
    //         type: 'custom-trip',
    //         from: 'Pretoria, Gauteng',
    //         to: 'Johannesburg, Gauteng',
    //         date: new Date(now.getTime() + 3 * 86400000).toLocaleDateString('en-ZA', { weekday: 'long', day: 'numeric', month: 'long' }) + ', 8:00 AM',
    //         time: '08:00',
    //         departureDate: new Date(now.getTime() + 3 * 86400000).toLocaleDateString('en-ZA', { weekday: 'long', day: 'numeric', month: 'long' }) + ', 8:00 AM',
    //         returnTrip: true,
    //         stayDays: 3,
    //         returnDate: new Date(now.getTime() + 6 * 86400000).toLocaleDateString('en-ZA', { weekday: 'long', day: 'numeric', month: 'long' }) + ', 2:00 PM',
    //         distance: '58.7 km',
    //         passengers: 5,
    //         amount: 'R 2,450.00',
    //         timeAgo: '1 week ago',
    //         customer: {
    //             name: 'Grace Mokoena',
    //             phone: '086 567 8901',
    //             email: 'grace@example.com'
    //         },
    //         passengerDetails: [
    //             { name: 'Grace Mokoena', id: '760205 5800 08 1', phone: '086 567 8901', pickup: 'Pretoria, Gauteng', dropoff: 'Johannesburg, Gauteng' },
    //             { name: 'James Mokoena', id: '780310 5800 08 2', phone: '086 567 8902', pickup: 'Pretoria, Gauteng', dropoff: 'Johannesburg, Gauteng' },
    //             { name: 'Anna Mokoena', id: '800415 5800 08 3', phone: '086 567 8903', pickup: 'Pretoria, Gauteng', dropoff: 'Johannesburg, Gauteng' },
    //             { name: 'David Mokoena', id: '820520 5800 08 4', phone: '086 567 8904', pickup: 'Pretoria, Gauteng', dropoff: 'Johannesburg, Gauteng' },
    //             { name: 'Emma Mokoena', id: '840625 5800 08 5', phone: '086 567 8905', pickup: 'Pretoria, Gauteng', dropoff: 'Johannesburg, Gauteng' }
    //         ],
    //         pickupLocation: 'Pretoria, Gauteng',
    //         destination: 'Johannesburg, Gauteng',
    //         routeOptions: [
    //             'Via N1 Highway (Fastest - 45 min)',
    //             'Via R101 (Scenic - 55 min)'
    //         ]
    //     },
    //     // Route-Based Long Distance - Completed
    //     {
    //         id: 'BK-2025-006',
    //         status: 'completed',
    //         type: 'route-based',
    //         routeType: 'long-distance',
    //         tripName: 'Pretoria - Tzaneen',
    //         date: new Date(now.getTime() - 5 * 86400000).toLocaleDateString('en-ZA', { weekday: 'long', day: 'numeric', month: 'long' }),
    //         time: '09:00',
    //         distance: '398.2 km',
    //         passengers: 2,
    //         parcels: 1,
    //         amount: 'R 2,850.00',
    //         timeAgo: '5 days ago',
    //         customer: {
    //             name: 'David Sithole',
    //             phone: '087 678 9012',
    //             email: 'david@example.com'
    //         },
    //         passengerDetails: [
    //             { name: 'David Sithole', id: '830715 5800 08 6', phone: '087 678 9012', pickup: 'Pretoria CBD', dropoff: 'Tzaneen CBD' },
    //             { name: 'Sarah Sithole', id: '860820 5800 08 7', phone: '087 678 9013', pickup: 'Pretoria CBD', dropoff: 'Tzaneen CBD' }
    //         ],
    //         parcelDetails: [
    //             { size: 'Medium', weight: '18kg', sender: 'David Sithole', receiver: 'Chris Black', secretCode: 'PQR678', image: '../../assets/images/default-avatar.png', pickup: 'Pretoria CBD', dropoff: 'Tzaneen CBD' }
    //         ],
    //         startingPoint: 'Pretoria CBD, Pretoria',
    //         endingPoint: 'Tzaneen CBD, Tzaneen',
    //         route: 'Via N1 and R71'
    //     },
    //     // Custom Trip - Cancelled
    //     {
    //         id: 'BK-2025-007',
    //         status: 'cancelled',
    //         type: 'custom-trip',
    //         from: 'Randburg, Johannesburg',
    //         to: 'Lanseria Airport',
    //         date: new Date(now.getTime() - 3 * 86400000).toLocaleDateString('en-ZA', { weekday: 'long', day: 'numeric', month: 'long' }),
    //         time: '06:00',
    //         departureDate: new Date(now.getTime() - 3 * 86400000).toLocaleDateString('en-ZA', { weekday: 'long', day: 'numeric', month: 'long' }),
    //         returnTrip: false,
    //         distance: '31.2 km',
    //         passengers: 2,
    //         amount: 'R 523.80',
    //         timeAgo: '3 days ago',
    //         customer: {
    //             name: 'Michael Brown',
    //             phone: '088 789 0123',
    //             email: 'michael@example.com'
    //         },
    //         passengerDetails: [
    //             { name: 'Michael Brown', id: '850925 5800 08 8', phone: '088 789 0123', pickup: 'Randburg, Johannesburg', dropoff: 'Lanseria Airport' },
    //             { name: 'Jennifer Brown', id: '871030 5800 08 9', phone: '088 789 0124', pickup: 'Randburg, Johannesburg', dropoff: 'Lanseria Airport' }
    //         ],
    //         pickupLocation: 'Randburg, Johannesburg',
    //         destination: 'Lanseria Airport',
    //         routeOptions: [
    //             'Via N1 and R512 (Fastest - 35 min)'
    //         ]
    //     }
    // ];
}


async function loadBookings() {
    // Load comprehensive bookings



    allBookings = await createComprehensiveBookings();
    
    // Apply auto-settings
    allBookings.forEach(booking => {
        if (booking.status === 'pending') {
            let autoAction = null;
            if (booking.type === 'route-based') {
                if (booking.routeType === 'local') {
                    autoAction = autoSettings.routeLocal;
                } else if (booking.routeType === 'long-distance') {
                    autoAction = autoSettings.routeLong;
                }
            } else if (booking.type === 'custom-trip') {
                autoAction = autoSettings.custom;
            }
            
            if (autoAction === 'auto-accept') {
                booking.status = 'confirmed';
            } else if (autoAction === 'auto-reject') {
                booking.status = 'cancelled';
            }
        }
    });

    displayBookings(allBookings);
}

function displayBookings(bookings) {
    const pending = bookings.filter(b => b.status === 'pending');
    const upcoming = bookings.filter(b => b.status === 'fully_paid' || b.status === 'active');
    const historical = bookings.filter(b => b.status === 'completed' || b.status === 'cancelled' || b.status === 'refunded' || b.status === 'refund_pending');

    displayBookingList('pendingBookingsList', pending);
    displayBookingList('upcomingBookingsList', upcoming);
    displayBookingList('historicalBookingsList', historical);
}

function displayBookingList(containerId, bookings) {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (bookings.length === 0) {
        container.innerHTML = `
            <div class="no-bookings">
                <i class="fas fa-calendar-times"></i>
                <p>No bookings found in this category.</p>
            </div>
        `;
        return;
    }

    container.innerHTML = bookings.map(booking => createBookingCard(booking)).join('');
}



function createBookingCard(booking) {
    const statusClass = `status-${booking.status}`;
    const statusText = booking.status === 'pending' ? 'Pending' :
                     booking.status === 'fully_paid' ? 'Fully Paid' :
                     booking.status === 'active' ? 'Active' :
                     booking.status === 'completed' ? 'Completed' :
                     booking.status === 'cancelled' ? 'Cancelled' :
                     booking.status === 'refunded' ? 'Refunded' :
                     booking.status === 'refund_pending' ? 'Refund Pending' :
                     'Unknown';
    
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

    let actionsHTML = '';
    if (booking.status === 'pending') {
        actionsHTML = `
            <button class="btn-action btn-accept" onclick="acceptBooking('${booking.id}')">
                <i class="fas fa-check"></i> Accept
            </button>
            <button class="btn-action btn-view" onclick="viewBookingDetails('${booking.id}')">
                <i class="fas fa-eye"></i> View Details
            </button>
            <button class="btn-action btn-decline" onclick="declineBooking('${booking.id}')">
                <i class="fas fa-times"></i> Decline
            </button>
        `;
    } else if (booking.status === 'confirmed') {
        actionsHTML = `
            <button class="btn-action btn-view" onclick="viewBookingDetails('${booking.id}')">
                <i class="fas fa-eye"></i> View Details
            </button>
            <button class="btn-action btn-cancel" onclick="cancelBooking('${booking.id}')">
                <i class="fas fa-ban"></i> Cancel
            </button>
        `;
    } else {
        actionsHTML = `
            <button class="btn-action btn-view" onclick="viewBookingDetails('${booking.id}')">
                <i class="fas fa-eye"></i> View Details
            </button>

        `;
    }

    let bookingInfoHTML = '';
    
    if (booking.type === 'route-based') {
        // Route-Based Booking Display
        bookingInfoHTML = `
            <div class="route-info">
                <div class="route-from">
                    <strong>Trip:</strong> ${escapeHtml(booking.tripName)}
                </div>
                <div class="route-to">
                    <strong>Date & Time:</strong> ${escapeHtml(booking.date) + ' ' + escapeHtml(booking.time)}
                </div>
            </div>
            <div class="booking-info">
                <div class="info-item">
                    <span class="label">Distance:</span>
                    <span class="value">${escapeHtml(booking.distance)}</span>
                </div>
                <div class="info-item">
                    <span class="label">Passengers:</span>
                    <span class="value">${booking.passengers || 0}</span>
                </div>
                <div class="info-item">
                    <span class="label">Parcels:</span>
                    <span class="value">${booking.parcels || 0}</span>
                </div>
                <div class="info-item">
                    <span class="label">Total Amount:</span>
                    <span class="value amount">${escapeHtml(booking.amount)}</span>
                </div>
            </div>
        `;
    } else {
        // Custom Trip Display
        const returnTripInfo = booking.returnTrip 
            ? `<div class="return-trip-info">
                <i class="fas fa-undo"></i> Return Trip - Taxi stays for ${booking.stayDays || 0} days
               </div>`
            : `<div class="one-way-info">
                <i class="fas fa-arrow-right"></i> One Way Trip
               </div>`;
        
        bookingInfoHTML = `
            <div class="route-info">
                <div class="route-from">
                    <strong>From:</strong> ${escapeHtml(booking.from)}
                </div>
                <div class="route-to">
                    <strong>To:</strong> ${escapeHtml(booking.to)}
                </div>
            </div>
            <div class="booking-info">
                <div class="info-item">
                    <span class="label">Date & Time:</span>
                    <span class="value">${escapeHtml(booking.departureDate || booking.date)}</span>
                </div>
                ${returnTripInfo}
                <div class="info-item">
                    <span class="label">Passengers:</span>
                    <span class="value">${booking.passengers || 0}</span>
                </div>
                <div class="info-item">
                    <span class="label">Distance:</span>
                    <span class="value">${escapeHtml(booking.distance)}</span>
                </div>
            </div>
        `;
    }

    return `
        <div class="booking-card ${cardClass}">
            <div class="booking-header">
                <div style="display: flex; align-items: center; gap: 0.75rem; flex-wrap: wrap;">
                    <div class="booking-id">#${booking.id}</div>
                    <span class="booking-type-badge ${typeClass}">
                        <i class="fas ${typeIcon}"></i> ${typeText}
                    </span>
                </div>
                <div style="display: flex; align-items: center; gap: 0.75rem; flex-wrap: wrap;">
                    <div class="booking-status ${statusClass}">${statusText}</div>
                    <div class="booking-time">${escapeHtml(booking.timeAgo || booking.time || '')}</div>
                </div>
            </div>
            <div class="booking-details">
                ${bookingInfoHTML}
            </div>
            <div class="booking-actions">
                ${actionsHTML}
            </div>
        </div>
    `;
}

function viewBookingDetails(bookingId) {
    const booking = allBookings.find(b => b.id === bookingId);
    if (!booking) {
        alert('Booking not found!');
        return;
    }

    const modal = document.getElementById('bookingModal');
    const modalTitle = document.getElementById('modalTitle');
    const modalBody = document.getElementById('modalBody');

    modalTitle.innerHTML = `<i class="fas fa-calendar-check"></i> Booking #${booking.id}`;

    let modalContent = '';

    if (booking.type === 'route-based') {
        // Route-Based Booking Detail View
        modalContent = `
            <div class="trip-info-header">
                <h2 style="margin: 0 0 1rem 0; color: #01386A;">
                    ${escapeHtml(booking.tripName)}
                </h2>
                <div class="trip-info-grid">
                    <div class="trip-info-item">
                        <span class="trip-info-label">Date & Time</span>
                        <span class="trip-info-value">${escapeHtml(booking.date)}</span>
                    </div>
                    <div class="trip-info-item">
                        <span class="trip-info-label">Distance</span>
                        <span class="trip-info-value">${escapeHtml(booking.distance)}</span>
                    </div>
                    <div class="trip-info-item">
                        <span class="trip-info-label">Passengers</span>
                        <span class="trip-info-value">${booking.passengers || 0}</span>
                    </div>
                    <div class="trip-info-item">
                        <span class="trip-info-label">Parcels</span>
                        <span class="trip-info-value">${booking.parcels || 0}</span>
                    </div>
                    <div class="trip-info-item">
                        <span class="trip-info-label">Amount</span>
                        <span class="trip-info-value" style="color: #28a745;">${escapeHtml(booking.amount)}</span>
                    </div>
                </div>
            </div>

            <!-- Passenger Details -->
            <div class="detail-section">
                <h3><i class="fas fa-users"></i> Passenger Details</h3>
                <div class="passenger-list">
                    ${(booking.passengerDetails || []).map(passenger => `
                        <div class="passenger-card">
                            <h4>${escapeHtml(passenger.name)}</h4>
                            <div class="passenger-detail-item">
                                <span class="detail-label">Passenger Number:</span>
                                <span class="detail-value">${escapeHtml(passenger.id)}</span>
                            </div>
                            <div class="passenger-detail-item">
                                <span class="detail-label">Phone:</span>
                                <span class="detail-value">${escapeHtml(passenger.phone)}</span>
                            </div>
                            <div class="passenger-detail-item">
                                <span class="detail-label">Pickup:</span>
                                <span class="detail-value">${escapeHtml(passenger.pickup)}</span>
                            </div>
                            <div class="passenger-detail-item">
                                <span class="detail-label">Drop-off:</span>
                                <span class="detail-value">${escapeHtml(passenger.dropoff)}</span>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>

            <!-- Parcel Details -->
            ${(booking.parcelDetails && booking.parcelDetails.length > 0) ? `
            <div class="detail-section">
                <h3><i class="fas fa-box"></i> Parcel Details</h3>
                <div class="parcel-list">
                    ${booking.parcelDetails.map(parcel => `
                        <div class="parcel-card">
                            <h4>${escapeHtml(parcel.size)} Parcel - ${escapeHtml(parcel.weight)}</h4>
                            <div class="parcel-detail-item">
                                <span class="detail-label">Sender:</span>
                                <span class="detail-value">${escapeHtml(parcel.sender)}</span>
                            </div>
                            <div class="parcel-detail-item">
                                <span class="detail-label">Receiver:</span>
                                <span class="detail-value">${escapeHtml(parcel.receiver)}</span>
                            </div>
                            <div class="parcel-detail-item">
                                <span class="detail-label">Pickup:</span>
                                <span class="detail-value">${escapeHtml(parcel.pickup)}</span>
                            </div>
                            <div class="parcel-detail-item">
                                <span class="detail-label">Drop-off:</span>
                                <span class="detail-value">${escapeHtml(parcel.dropoff)}</span>
                            </div>
                            ${parcel.images && parcel.images.length > 0 ? `
                                <div class="parcel-images-container" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 1rem; margin-top: 1rem;">
                                    ${parcel.images.map((img, idx) => `
                                        <img src="${escapeHtml(img)}" alt="Parcel Image ${idx + 1}" class="parcel-image" style="max-width: 100%; border-radius: 8px; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);">
                                    `).join('')}
                                </div>
                            ` : ''}
                        </div>
                    `).join('')}
                </div>
            </div>
            ` : ''}

            <!-- Map and Route Information -->
            <div class="detail-section">
                <h3><i class="fas fa-map-marked-alt"></i> Route & Locations</h3>
                ${booking.routeType === 'long-distance' ? `
                    <div class="route-info-display">
                        <h4 style="margin-bottom: 1rem; color: #01386A;">Pickup Locations</h4>
                        ${(booking.pickupLocations || []).map(point => `
                            <div class="location-point pickup">
                                <i class="fas fa-map-marker-alt"></i>
                                <div>
                                    <strong>${escapeHtml(point.location)}</strong>
                                    <div style="font-size: 0.9rem; color: #6c757d;">${escapeHtml(point.description)}</div>
                                </div>
                            </div>
                        `).join('')}
                        
                        <h4 style="margin-top: 1.5rem; margin-bottom: 1rem; color: #01386A;">Drop-off Locations</h4>
                        ${(booking.dropoffLocations || []).map(point => `
                            <div class="location-point dropoff">
                                <i class="fas fa-flag"></i>
                                <div>
                                    <strong>${escapeHtml(point.location)}</strong>
                                    <div style="font-size: 0.9rem; color: #6c757d;">${escapeHtml(point.description)}</div>
                                </div>
                            </div>
                        `).join('')}
                        
                    </div>
                ` : `
                    <div class="route-info-display">
                        <div class="route-info-item">
                            <i class="fas fa-map-marker-alt"></i>
                            <strong>Starting Point:</strong> ${escapeHtml(booking.startingPoint)}
                        </div>
                        <div class="route-info-item">
                            <i class="fas fa-flag"></i>
                            <strong>Ending Point:</strong> ${escapeHtml(booking.endingPoint)}
                        </div>
                    </div>
                `}
            </div>
        `;
    } else {
        // Custom Trip Detail View
        const returnTripHTML = booking.returnTrip 
            ? `
                <div class="return-trip-info">
                    <i class="fas fa-undo"></i> 
                    <strong>Return Trip:</strong> Taxi will stay at destination for ${booking.stayDays || 0} days
                    <br>
                    <strong>Return Date:</strong> ${escapeHtml(booking.returnDate || 'TBD')}
                </div>
            `
            : `
                <div class="one-way-info">
                    <i class="fas fa-arrow-right"></i> 
                    <strong>One Way Trip</strong>
                </div>
            `;

        modalContent = `
            <div class="trip-info-header">
                <h2 style="margin: 0 0 1rem 0; color: #01386A;">
                    Custom Trip Booking
                </h2>
                <div class="trip-info-grid">
                    <div class="trip-info-item">
                        <span class="trip-info-label">From</span>
                        <span class="trip-info-value">${escapeHtml(booking.from)}</span>
                    </div>
                    <div class="trip-info-item">
                        <span class="trip-info-label">To</span>
                        <span class="trip-info-value">${escapeHtml(booking.to)}</span>
                    </div>
                    <div class="trip-info-item">
                        <span class="trip-info-label">Departure Date</span>
                        <span class="trip-info-value">${escapeHtml(booking.departureDate || booking.date)}</span>
                    </div>
                    <div class="trip-info-item">
                        <span class="trip-info-label">Distance</span>
                        <span class="trip-info-value">${escapeHtml(booking.distance)}</span>
                    </div>
                    <div class="trip-info-item">
                        <span class="trip-info-label">Passengers</span>
                        <span class="trip-info-value">${booking.passengers || 0}</span>
                    </div>
                    <div class="trip-info-item">
                        <span class="trip-info-label">Amount</span>
                        <span class="trip-info-value" style="color: #28a745;">${escapeHtml(booking.amount)}</span>
                    </div>
                </div>
                ${returnTripHTML}
            </div>

            <!-- Passenger Details -->
            <div class="detail-section">
                <h3><i class="fas fa-users"></i> Passenger Details</h3>
                <div class="passenger-list">
                    ${(booking.passengerDetails || []).map(passenger => `
                        <div class="passenger-card">
                            <h4>${escapeHtml(passenger.name)}</h4>
                            <div class="passenger-detail-item">
                                <span class="detail-label">ID Number:</span>
                                <span class="detail-value">${escapeHtml(passenger.id)}</span>
                            </div>
                            <div class="passenger-detail-item">
                                <span class="detail-label">Phone:</span>
                                <span class="detail-value">${escapeHtml(passenger.phone)}</span>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>

            <!-- Route Information -->
            <div class="detail-section">
                <h3><i class="fas fa-map-marked-alt"></i> Route & Locations</h3>
                <div class="route-info-display">
                    <div class="route-info-item">
                        <i class="fas fa-map-marker-alt"></i>
                        <strong>Pickup Location:</strong> ${escapeHtml(booking.pickupLocation)}
                    </div>
                    <div class="route-info-item">
                        <i class="fas fa-flag"></i>
                        <strong>Destination:</strong> ${escapeHtml(booking.destination)}
                    </div>
                    <div style="margin-top: 1rem; padding-top: 1rem; border-top: 2px solid #e9ecef;">
                        <strong style="color: #01386A;">Route Driving Options:</strong>
                        <ul style="margin-top: 0.5rem; padding-left: 1.5rem;">
                            ${(booking.routeOptions || []).map(option => `
                                <li style="margin: 0.5rem 0; color: #333;">${escapeHtml(option)}</li>
                            `).join('')}
                        </ul>
                    </div>
                </div>
                <div class="map-container">
                    <i class="fas fa-map" style="font-size: 3rem; color: #6c757d;"></i>
                    <div style="margin-top: 1rem; color: #6c757d;">Map integration will display route here</div>
                </div>
            </div>
        `;
    }

    modalBody.innerHTML = modalContent;
    modal.style.display = 'block';
}

function closeBookingModal() {
    document.getElementById('bookingModal').style.display = 'none';
}

// Close modal when clicking outside
window.onclick = function(event) {
    const modal = document.getElementById('bookingModal');
    if (event.target === modal) {
        modal.style.display = 'none';
    }
}

async function acceptBooking(bookingId) {
    const booking = allBookings.find(b => b.id === bookingId);
    if (booking) {
        booking.status = 'confirmed';
        alert(`Booking ${bookingId} accepted!`);
        await loadBookings();
    }
}

async function declineBooking(bookingId) {
    if (confirm('Are you sure you want to decline this booking?')) {
        const booking = allBookings.find(b => b.id === bookingId);
        if (booking) {
            booking.status = 'cancelled';
            alert(`Booking ${bookingId} declined.`);
            await loadBookings();
        }
    }
}

async function cancelBooking(bookingId) {
    if (confirm('Are you sure you want to cancel this booking?')) {
        const booking = allBookings.find(b => b.id === bookingId);
        if (booking) {
            booking.status = 'cancelled';
            alert(`Booking ${bookingId} cancelled.`);
            await loadBookings();
        }
    }
}

function contactCustomer(customerName) {
    const booking = allBookings.find(b => b.customer.name === customerName);
    if (booking) {
        alert(`Contacting ${customerName}\nPhone: ${booking.customer.phone}\nEmail: ${booking.customer.email || 'N/A'}`);
    } else {
        alert(`Contacting ${customerName}...`);
    }
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

     // Make functions globally accessible
     window.toggleMobileMenu = toggleMobileMenu;
     window.topNavZIndexDecrease = topNavZIndexDecrease;
     window.showBookingTab = showBookingTab;
     window.saveAutoSettings = saveAutoSettings;
     window.acceptBooking = async (bookingId) => {
        await acceptBooking(bookingId);
     };
     window.declineBooking = async (bookingId) => {
        await declineBooking(bookingId);
     };
     window.cancelBooking = async (bookingId) => {
        await cancelBooking(bookingId);
     };
     window.viewBookingDetails = viewBookingDetails;
     window.contactCustomer = contactCustomer;
     window.closeBookingModal = closeBookingModal;