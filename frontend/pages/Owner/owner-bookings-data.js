// Comprehensive booking data structure with all required fields

function createComprehensiveBookings() {
    const now = new Date();
    
    return [
        // Route-Based Local - Collection
        {
            id: 'BK-2025-001',
            status: 'pending',
            type: 'route-based',
            routeType: 'local',
            tripName: 'Johannesburg Local',
            collectionDelivery: 'collection',
            date: 'Today, 2:30 PM',
            time: '14:30',
            distance: '28.5 km',
            passengers: 3,
            parcels: 2,
            amount: 'R 516.75',
            timeAgo: '2 hours ago',
            customer: {
                name: 'Sarah Mthembu',
                phone: '082 123 4567',
                email: 'sarah@example.com'
            },
            passengerDetails: [
                { name: 'Sarah Mthembu', id: '850101 5800 08 5', phone: '082 123 4567', pickup: 'Sandton City Mall, Sandton', dropoff: 'OR Tambo Airport' },
                { name: 'John Mthembu', id: '920315 5800 08 6', phone: '082 123 4568', pickup: 'Sandton City Mall, Sandton', dropoff: 'OR Tambo Airport' },
                { name: 'Mary Mthembu', id: '950520 5800 08 7', phone: '082 123 4569', pickup: 'Sandton City Mall, Sandton', dropoff: 'OR Tambo Airport' }
            ],
            parcelDetails: [
                { size: 'Medium', weight: '12kg', sender: 'Sarah Mthembu', receiver: 'John Doe', secretCode: 'ABC123', image: '../../assets/images/default-avatar.png', pickup: 'Sandton City Mall, Sandton', dropoff: '123 Main St, Tzaneen' },
                { size: 'Small', weight: '4kg', sender: 'Sarah Mthembu', receiver: 'Jane Smith', secretCode: 'XYZ789', image: '../../assets/images/default-avatar.png', pickup: 'Sandton City Mall, Sandton', dropoff: '456 Oak Ave, Tzaneen' }
            ],
            waitingPoints: [
                { type: 'waiting', location: 'Sandton City Mall Parking, Sandton', description: 'Drop-off point for passengers and parcels' }
            ],
            pickupLocations: [
                { type: 'pickup', location: 'Sandton City Mall, Sandton', description: 'Collect passengers and parcels' }
            ],
            dropoffLocations: [
                { type: 'dropoff', location: 'OR Tambo Airport, Kempton Park', description: 'Drop-off passengers' },
                { type: 'dropoff', location: '123 Main St, Tzaneen', description: 'Drop-off parcel for John Doe' },
                { type: 'dropoff', location: '456 Oak Ave, Tzaneen', description: 'Drop-off parcel for Jane Smith' }
            ],
            route: 'Via N1 Highway'
        },
        // Route-Based Local - Delivery
        {
            id: 'BK-2025-002',
            status: 'pending',
            type: 'route-based',
            routeType: 'local',
            tripName: 'Pretoria Local',
            collectionDelivery: 'delivery',
            date: 'Tomorrow, 8:00 AM',
            time: '08:00',
            distance: '35.2 km',
            passengers: 2,
            parcels: 1,
            amount: 'R 642.50',
            timeAgo: '1 day ago',
            customer: {
                name: 'John Dlamini',
                phone: '083 234 5678',
                email: 'john@example.com'
            },
            passengerDetails: [
                { name: 'John Dlamini', id: '880710 5800 08 8', phone: '083 234 5678', pickup: 'Rosebank Mall, Johannesburg', dropoff: 'Pretoria CBD, Pretoria' },
                { name: 'Jane Dlamini', id: '901225 5800 08 9', phone: '083 234 5679', pickup: 'Rosebank Mall, Johannesburg', dropoff: 'Pretoria CBD, Pretoria' }
            ],
            parcelDetails: [
                { size: 'Large', weight: '25kg', sender: 'John Dlamini', receiver: 'Mike Johnson', secretCode: 'DEF456', image: '../../assets/images/default-avatar.png', pickup: 'Rosebank Mall, Johannesburg', dropoff: '789 Pine St, Pretoria' }
            ],
            waitingPoints: [
                { type: 'waiting', location: 'Rosebank Mall Parking, Johannesburg', description: 'Collection point for passengers and parcels' }
            ],
            pickupLocations: [
                { type: 'pickup', location: 'Rosebank Mall, Johannesburg', description: 'Collect passengers and parcels' }
            ],
            dropoffLocations: [
                { type: 'dropoff', location: 'Pretoria CBD, Pretoria', description: 'Drop-off passengers' },
                { type: 'dropoff', location: '789 Pine St, Pretoria', description: 'Drop-off parcel for Mike Johnson' }
            ],
            route: 'Via N1 Highway'
        },
        // Route-Based Long Distance
        {
            id: 'BK-2025-003',
            status: 'confirmed',
            type: 'route-based',
            routeType: 'long-distance',
            tripName: 'Johannesburg - Tzaneen',
            date: new Date(now.getTime() + 2 * 86400000).toLocaleDateString('en-ZA', { weekday: 'long', day: 'numeric', month: 'long' }) + ', 10:00 AM',
            time: '10:00',
            distance: '412.5 km',
            passengers: 4,
            parcels: 3,
            amount: 'R 3,250.00',
            timeAgo: '3 days ago',
            customer: {
                name: 'Mary Khumalo',
                phone: '084 345 6789',
                email: 'mary@example.com'
            },
            passengerDetails: [
                { name: 'Mary Khumalo', id: '790315 5800 08 1', phone: '084 345 6789', pickup: 'Soweto, Johannesburg', dropoff: 'Tzaneen CBD' },
                { name: 'Peter Khumalo', id: '820420 5800 08 2', phone: '084 345 6790', pickup: 'Soweto, Johannesburg', dropoff: 'Tzaneen CBD' },
                { name: 'Lisa Khumalo', id: '850815 5800 08 3', phone: '084 345 6791', pickup: 'Soweto, Johannesburg', dropoff: 'Tzaneen CBD' },
                { name: 'Tom Khumalo', id: '881120 5800 08 4', phone: '084 345 6792', pickup: 'Soweto, Johannesburg', dropoff: 'Tzaneen CBD' }
            ],
            parcelDetails: [
                { size: 'Large', weight: '28kg', sender: 'Mary Khumalo', receiver: 'David Brown', secretCode: 'GHI789', image: '../../assets/images/default-avatar.png', pickup: 'Soweto, Johannesburg', dropoff: 'Tzaneen CBD' },
                { size: 'Medium', weight: '15kg', sender: 'Mary Khumalo', receiver: 'Susan White', secretCode: 'JKL012', image: '../../assets/images/default-avatar.png', pickup: 'Soweto, Johannesburg', dropoff: 'Tzaneen CBD' },
                { size: 'Small', weight: '6kg', sender: 'Mary Khumalo', receiver: 'Robert Green', secretCode: 'MNO345', image: '../../assets/images/default-avatar.png', pickup: 'Soweto, Johannesburg', dropoff: 'Tzaneen CBD' }
            ],
            startingPoint: 'Soweto, Johannesburg',
            endingPoint: 'Tzaneen CBD, Tzaneen',
            route: 'Via N1 and R71'
        },
        // Custom Trip - One Way
        {
            id: 'BK-2025-004',
            status: 'confirmed',
            type: 'custom-trip',
            from: 'Midrand, Johannesburg',
            to: 'Johannesburg CBD, Johannesburg',
            date: new Date(now.getTime() + 2 * 86400000).toLocaleDateString('en-ZA', { weekday: 'long', day: 'numeric', month: 'long' }) + ', 10:00 AM',
            time: '10:00',
            departureDate: new Date(now.getTime() + 2 * 86400000).toLocaleDateString('en-ZA', { weekday: 'long', day: 'numeric', month: 'long' }) + ', 10:00 AM',
            returnTrip: false,
            distance: '22.3 km',
            passengers: 1,
            amount: 'R 389.45',
            timeAgo: '5 days ago',
            customer: {
                name: 'Peter Ndlovu',
                phone: '085 456 7890',
                email: 'peter@example.com'
            },
            passengerDetails: [
                { name: 'Peter Ndlovu', id: '870510 5800 08 0', phone: '085 456 7890', pickup: 'Midrand, Johannesburg', dropoff: 'Johannesburg CBD, Johannesburg' }
            ],
            pickupLocation: 'Midrand, Johannesburg',
            destination: 'Johannesburg CBD, Johannesburg',
            routeOptions: [
                'Via N1 Highway (Fastest - 25 min)',
                'Via M1 Highway (Scenic - 30 min)',
                'Via Local Roads (Cheapest - 35 min)'
            ]
        },
        // Custom Trip - Return Trip
        {
            id: 'BK-2025-005',
            status: 'pending',
            type: 'custom-trip',
            from: 'Pretoria, Gauteng',
            to: 'Johannesburg, Gauteng',
            date: new Date(now.getTime() + 3 * 86400000).toLocaleDateString('en-ZA', { weekday: 'long', day: 'numeric', month: 'long' }) + ', 8:00 AM',
            time: '08:00',
            departureDate: new Date(now.getTime() + 3 * 86400000).toLocaleDateString('en-ZA', { weekday: 'long', day: 'numeric', month: 'long' }) + ', 8:00 AM',
            returnTrip: true,
            stayDays: 3,
            returnDate: new Date(now.getTime() + 6 * 86400000).toLocaleDateString('en-ZA', { weekday: 'long', day: 'numeric', month: 'long' }) + ', 2:00 PM',
            distance: '58.7 km',
            passengers: 5,
            amount: 'R 2,450.00',
            timeAgo: '1 week ago',
            customer: {
                name: 'Grace Mokoena',
                phone: '086 567 8901',
                email: 'grace@example.com'
            },
            passengerDetails: [
                { name: 'Grace Mokoena', id: '760205 5800 08 1', phone: '086 567 8901', pickup: 'Pretoria, Gauteng', dropoff: 'Johannesburg, Gauteng' },
                { name: 'James Mokoena', id: '780310 5800 08 2', phone: '086 567 8902', pickup: 'Pretoria, Gauteng', dropoff: 'Johannesburg, Gauteng' },
                { name: 'Anna Mokoena', id: '800415 5800 08 3', phone: '086 567 8903', pickup: 'Pretoria, Gauteng', dropoff: 'Johannesburg, Gauteng' },
                { name: 'David Mokoena', id: '820520 5800 08 4', phone: '086 567 8904', pickup: 'Pretoria, Gauteng', dropoff: 'Johannesburg, Gauteng' },
                { name: 'Emma Mokoena', id: '840625 5800 08 5', phone: '086 567 8905', pickup: 'Pretoria, Gauteng', dropoff: 'Johannesburg, Gauteng' }
            ],
            pickupLocation: 'Pretoria, Gauteng',
            destination: 'Johannesburg, Gauteng',
            routeOptions: [
                'Via N1 Highway (Fastest - 45 min)',
                'Via R101 (Scenic - 55 min)'
            ]
        },
        // Route-Based Long Distance - Completed
        {
            id: 'BK-2025-006',
            status: 'completed',
            type: 'route-based',
            routeType: 'long-distance',
            tripName: 'Pretoria - Tzaneen',
            date: new Date(now.getTime() - 5 * 86400000).toLocaleDateString('en-ZA', { weekday: 'long', day: 'numeric', month: 'long' }),
            time: '09:00',
            distance: '398.2 km',
            passengers: 2,
            parcels: 1,
            amount: 'R 2,850.00',
            timeAgo: '5 days ago',
            customer: {
                name: 'David Sithole',
                phone: '087 678 9012',
                email: 'david@example.com'
            },
            passengerDetails: [
                { name: 'David Sithole', id: '830715 5800 08 6', phone: '087 678 9012', pickup: 'Pretoria CBD', dropoff: 'Tzaneen CBD' },
                { name: 'Sarah Sithole', id: '860820 5800 08 7', phone: '087 678 9013', pickup: 'Pretoria CBD', dropoff: 'Tzaneen CBD' }
            ],
            parcelDetails: [
                { size: 'Medium', weight: '18kg', sender: 'David Sithole', receiver: 'Chris Black', secretCode: 'PQR678', image: '../../assets/images/default-avatar.png', pickup: 'Pretoria CBD', dropoff: 'Tzaneen CBD' }
            ],
            startingPoint: 'Pretoria CBD, Pretoria',
            endingPoint: 'Tzaneen CBD, Tzaneen',
            route: 'Via N1 and R71'
        },
        // Custom Trip - Cancelled
        {
            id: 'BK-2025-007',
            status: 'cancelled',
            type: 'custom-trip',
            from: 'Randburg, Johannesburg',
            to: 'Lanseria Airport',
            date: new Date(now.getTime() - 3 * 86400000).toLocaleDateString('en-ZA', { weekday: 'long', day: 'numeric', month: 'long' }),
            time: '06:00',
            departureDate: new Date(now.getTime() - 3 * 86400000).toLocaleDateString('en-ZA', { weekday: 'long', day: 'numeric', month: 'long' }),
            returnTrip: false,
            distance: '31.2 km',
            passengers: 2,
            amount: 'R 523.80',
            timeAgo: '3 days ago',
            customer: {
                name: 'Michael Brown',
                phone: '088 789 0123',
                email: 'michael@example.com'
            },
            passengerDetails: [
                { name: 'Michael Brown', id: '850925 5800 08 8', phone: '088 789 0123', pickup: 'Randburg, Johannesburg', dropoff: 'Lanseria Airport' },
                { name: 'Jennifer Brown', id: '871030 5800 08 9', phone: '088 789 0124', pickup: 'Randburg, Johannesburg', dropoff: 'Lanseria Airport' }
            ],
            pickupLocation: 'Randburg, Johannesburg',
            destination: 'Lanseria Airport',
            routeOptions: [
                'Via N1 and R512 (Fastest - 35 min)'
            ]
        }
    ];
}


