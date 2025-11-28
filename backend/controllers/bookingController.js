import pool from "../config/db.js";
import { v4 as uuidv4 } from 'uuid';
import { getNextVehicleInQueueHelper } from "./vehicleController.js";
import vehicleController from "./vehicleController.js";

// ============================================
// HELPER FUNCTIONS
// ============================================
const generateBookingReference = () => {
    return `BK${Date.now().toString().slice(-8)}${Math.random().toString(36).substr(2, 4).toUpperCase()}`;
};

const checkUserType = (user, allowedTypes) => {
    if (!allowedTypes.includes(user.user_type)) {
        throw new Error(`Access denied. Required user type: ${allowedTypes.join(' or ')}`);
    }
};

// ============================================
// CLIENT ROUTES
// ============================================

/**
 * Create a route-based booking
 * Automatically selects the next vehicle in queue and populates all booking details from route/vehicle data
 * 
 * Required input: existing_route_id only
 * All other fields are automatically populated:
 * - vehicle_id, driver_id, owner_id from getNextVehicleInQueue
 * - booking_mode = 'route'
 * - total_seats_available from vehicle capacity
 * - total_amount_needed from route base_fare
 * - route_points from route location_1/location_2
 * - scheduled_pickup, passenger_count, parcel_count can be optionally provided
 * 
 * @param {number} existing_route_id - Required: The route ID
 * @param {string} scheduled_pickup - Optional: When the trip should start (defaults to route schedule)
 * @param {number} passenger_count - Optional: Number of passengers (defaults to 0)
 * @param {number} parcel_count - Optional: Number of parcels (defaults to 0)
 * @param {string} special_instructions - Optional: Special instructions
 */
export const createRouteBasedBooking = async (req, res) => {
    try {
        const userId = req.user.id;
        const {
            existing_route_id,
            scheduled_pickup,
            passenger_count = 0,
            parcel_count = 0,
            special_instructions = null
        } = req.body;

        // Validate required fields
        if (!existing_route_id) {
            return res.status(400).json({
                success: false,
                message: "Missing required field: existing_route_id"
            });
        }

        // Get route information
        const [routes] = await pool.execute(
            "SELECT * FROM existing_routes WHERE ID = ? AND status = 'active'",
            [existing_route_id]
        );

        if (routes.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Route not found or inactive"
            });
        }

        const route = routes[0];

        // Get the next vehicle in queue (position 1) for this route
        const nextVehicleInfo = await getNextVehicleInQueueHelper(existing_route_id);

        if (!nextVehicleInfo) {
            return res.status(404).json({
                success: false,
                message: "No vehicle available at position 1 for this route. Please try again later."
            });
        }

        // Extract information from queue and route
        const vehicleId = nextVehicleInfo.vehicle_id;
        const driverId = nextVehicleInfo.driver_id;
        const ownerId = nextVehicleInfo.owner_id;
        const totalSeatsAvailable = nextVehicleInfo.capacity;
        const baseFare = parseFloat(route.base_fare);
        
        // Calculate total amount needed (base fare, can be adjusted later for passengers/parcels)
        const totalAmountNeeded = baseFare;

        // Create route points from route location_1 and location_2
        const routePoints = [
            {
                point_type: 'pickup',
                point_name: route.location_1,
                address: route.location_1,
                expected_time: scheduled_pickup || new Date().toISOString()
            },
            {
                point_type: 'dropoff',
                point_name: route.location_2 || route.location_1,
                address: route.location_2 || route.location_1,
                expected_time: scheduled_pickup || new Date().toISOString()
            }
        ];

        // Generate unique booking reference
        const booking_reference = generateBookingReference();

        // Start transaction
        await pool.execute('START TRANSACTION');

        try {
            // Insert booking
            const [result] = await pool.execute(
                `INSERT INTO bookings (
                    booking_reference, user_id, owner_id, vehicle_id, driver_id, 
                    existing_route_id, booking_mode, booking_status, passenger_count, 
                    parcel_count, total_seats_available, total_amount_needed, 
                    total_amount_paid, scheduled_pickup, route_points, special_instructions
                ) VALUES (?, ?, ?, ?, ?, ?, 'route', 'pending', ?, ?, ?, ?, 0.00, ?, ?, ?)`,
                [
                    booking_reference, userId, ownerId, vehicleId, driverId,
                    existing_route_id, passenger_count, parcel_count, 
                    totalSeatsAvailable, totalAmountNeeded,
                    scheduled_pickup || new Date().toISOString(), 
                    JSON.stringify(routePoints), special_instructions
                ]
            );

            const bookingId = result.insertId;

            // Insert route points
            for (let i = 0; i < routePoints.length; i++) {
                const point = routePoints[i];
                await pool.execute(
                    `INSERT INTO booking_route_points (
                        booking_id, point_type, point_name, address, order_index, expected_time
                    ) VALUES (?, ?, ?, ?, ?, ?)`,
                    [
                        bookingId, point.point_type, point.point_name,
                        point.address, i + 1, point.expected_time
                    ]
                );
            }

            await pool.execute('COMMIT');

            res.status(201).json({
                success: true,
                message: "Route-based booking created successfully",
                booking: {
                    id: bookingId,
                    booking_reference,
                    booking_status: 'pending',
                    booking_mode: 'route',
                    vehicle_id: vehicleId,
                    driver_id: driverId,
                    owner_id: ownerId,
                    existing_route_id: existing_route_id,
                    route_name: route.route_name,
                    total_seats_available: totalSeatsAvailable,
                    total_amount_needed: totalAmountNeeded
                },
                vehicle_info: {
                    vehicle_id: vehicleId,
                    registration_number: nextVehicleInfo.registration_number,
                    make: nextVehicleInfo.make,
                    model: nextVehicleInfo.model,
                    capacity: totalSeatsAvailable,
                    driver_name: nextVehicleInfo.driver_name,
                    owner_name: nextVehicleInfo.owner_name
                },
                route_info: {
                    route_id: route.ID,
                    route_name: route.route_name,
                    location_1: route.location_1,
                    location_2: route.location_2,
                    base_fare: baseFare
                }
            });
        } catch (error) {
            await pool.execute('ROLLBACK');
            throw error;
        }
    } catch (error) {
        console.error("Error creating route-based booking:", error);
        res.status(500).json({
            success: false,
            message: "Failed to create route-based booking",
            error: error.message
        });
    }
};

/**
 * Create a custom booking
 * Requires all booking details to be provided by the user
 * Used for custom routes that are not in the existing_routes table
 * 
 * Required fields:
 * - owner_id, vehicle_id, scheduled_pickup, total_amount_needed
 * - route_points (array of pickup/dropoff points)
 * Optional: driver_id, booking_mode, passenger_count, parcel_count, total_seats_available, special_instructions
 */
export const createCustomBooking = async (req, res) => {
    try {
        const userId = req.user.id;
        const {
            owner_id,
            vehicle_id,
            driver_id,
            existing_route_id,
            booking_mode,
            passenger_count,
            parcel_count,
            total_seats_available,
            total_amount_needed,
            scheduled_pickup,
            route_points,
            special_instructions
        } = req.body;

        // Validate required fields for custom booking
        if (!owner_id || !vehicle_id || !scheduled_pickup || !total_amount_needed) {
            return res.status(400).json({
                success: false,
                message: "Missing required fields: owner_id, vehicle_id, scheduled_pickup, total_amount_needed"
            });
        }

        // Validate route_points for custom booking
        if (!route_points || !Array.isArray(route_points) || route_points.length < 2) {
            return res.status(400).json({
                success: false,
                message: "route_points array with at least 2 points (pickup and dropoff) is required for custom bookings"
            });
        }

        // Generate unique booking reference
        const booking_reference = generateBookingReference();

        // Start transaction
        await pool.execute('START TRANSACTION');

        try {
            // Insert booking
            const [result] = await pool.execute(
                `INSERT INTO bookings (
                    booking_reference, user_id, owner_id, vehicle_id, driver_id, 
                    existing_route_id, booking_mode, booking_status, passenger_count, 
                    parcel_count, total_seats_available, total_amount_needed, 
                    total_amount_paid, scheduled_pickup, route_points, special_instructions
                ) VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?, 0.00, ?, ?, ?)`,
                [
                    booking_reference, userId, owner_id, vehicle_id, driver_id,
                    existing_route_id || null, booking_mode || 'custom', passenger_count || 0,
                    parcel_count || 0, total_seats_available || 15, total_amount_needed,
                    scheduled_pickup, JSON.stringify(route_points), special_instructions || null
                ]
            );

            const bookingId = result.insertId;

            // Insert route points if provided
            if (route_points && Array.isArray(route_points)) {
                for (let i = 0; i < route_points.length; i++) {
                    const point = route_points[i];
                    await pool.execute(
                        `INSERT INTO booking_route_points (
                            booking_id, point_type, point_name, address, order_index, expected_time
                        ) VALUES (?, ?, ?, ?, ?, ?)`,
                        [
                            bookingId, point.point_type, point.point_name || '',
                            point.address || '', i + 1, point.expected_time || scheduled_pickup
                        ]
                    );
                }
            }

            await pool.execute('COMMIT');

            res.status(201).json({
                success: true,
                message: "Custom booking created successfully",
                booking: {
                    id: bookingId,
                    booking_reference,
                    booking_status: 'pending',
                    booking_mode: booking_mode || 'custom',
                    vehicle_id: vehicle_id,
                    driver_id: driver_id,
                    owner_id: owner_id
                }
            });
        } catch (error) {
            await pool.execute('ROLLBACK');
            throw error;
        }
    } catch (error) {
        console.error("Error creating custom booking:", error);
        res.status(500).json({
            success: false,
            message: "Failed to create custom booking",
            error: error.message
        });
    }
};

// Get user's bookings
export const getMyBookings = async (req, res) => {
    try {
        const userId = req.user.id;
        const { status, limit = 50, offset = 0 } = req.query;

        let query = `
            SELECT b.*, 
                   v.registration_number, v.make, v.model, v.capacity,
                   u_owner.name as owner_name, u_owner.email as owner_email,
                   u_driver.name as driver_name, u_driver.email as driver_email,
                   er.route_name, er.location_1, er.location_2
            FROM bookings b
            LEFT JOIN vehicles v ON b.vehicle_id = v.id
            LEFT JOIN users u_owner ON b.owner_id = u_owner.id
            LEFT JOIN users u_driver ON b.driver_id = u_driver.id
            LEFT JOIN existing_routes er ON b.existing_route_id = er.id
            WHERE b.user_id = ?
        `;
        const params = [userId];

        if (status) {
            query += ` AND b.booking_status = ?`;
            params.push(status);
        }

        query += ` ORDER BY b.created_at DESC LIMIT ? OFFSET ?`;
        params.push(parseInt(limit), parseInt(offset));

        const [bookings] = await pool.execute(query, params);

        // Get passenger and parcel counts
        for (let booking of bookings) {
            const [passengers] = await pool.execute(
                "SELECT COUNT(*) as count FROM booking_passengers WHERE booking_id = ?",
                [booking.id]
            );
            const [parcels] = await pool.execute(
                "SELECT COUNT(*) as count FROM booking_parcels WHERE booking_id = ?",
                [booking.id]
            );
            booking.passenger_count = passengers[0].count;
            booking.parcel_count = parcels[0].count;
        }

        res.json({
            success: true,
            bookings
        });
    } catch (error) {
        console.error("Error fetching bookings:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch bookings",
            error: error.message
        });
    }
};

// Get booking details
export const getBookingDetails = async (req, res) => {
    try {
        const userId = req.user.id;
        const { bookingId } = req.params;

        // Get booking
        const [bookings] = await pool.execute(
            `SELECT b.*, 
                    v.*, 
                    u_owner.name as owner_name, u_owner.email as owner_email, u_owner.phone as owner_phone,
                    u_driver.name as driver_name, u_driver.email as driver_email, u_driver.phone as driver_phone,
                    er.route_name, er.location_1, er.location_2
             FROM bookings b
             LEFT JOIN vehicles v ON b.vehicle_id = v.id
             LEFT JOIN users u_owner ON b.owner_id = u_owner.id
             LEFT JOIN users u_driver ON b.driver_id = u_driver.id
             LEFT JOIN existing_routes er ON b.existing_route_id = er.id
             WHERE b.id = ?`,
            [bookingId]
        );

        if (bookings.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Booking not found"
            });
        }

        const booking = bookings[0];

        // Check access (user must be client, owner, driver, or admin)
        if (booking.user_id !== userId && 
            booking.owner_id !== userId && 
            booking.driver_id !== userId && 
            req.user.user_type !== 'admin') {
            return res.status(403).json({
                success: false,
                message: "Access denied"
            });
        }

        // Get passengers
        const [passengers] = await pool.execute(
            `SELECT * FROM booking_passengers WHERE booking_id = ? ORDER BY passenger_number`,
            [bookingId]
        );

        // Get parcels
        const [parcels] = await pool.execute(
            `SELECT * FROM booking_parcels WHERE booking_id = ? ORDER BY parcel_number`,
            [bookingId]
        );

        // Get route points
        const [routePoints] = await pool.execute(
            `SELECT * FROM booking_route_points WHERE booking_id = ? ORDER BY order_index`,
            [bookingId]
        );

        // Get payments
        const [payments] = await pool.execute(
            `SELECT * FROM payments WHERE booking_id = ? ORDER BY created_at DESC`,
            [bookingId]
        );

        // Get ratings
        const [ratings] = await pool.execute(
            `SELECT * FROM booking_ratings WHERE booking_id = ?`,
            [bookingId]
        );

        res.json({
            success: true,
            booking: {
                ...booking,
                passengers,
                parcels,
                route_points: routePoints,
                payments,
                ratings
            }
        });
    } catch (error) {
        console.error("Error fetching booking details:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch booking details",
            error: error.message
        });
    }
};

// Cancel booking
export const cancelBooking = async (req, res) => {
    try {
        const userId = req.user.id;
        const { bookingId } = req.params;
        const { cancellation_reason } = req.body;

        // Get booking
        const [bookings] = await pool.execute(
            "SELECT * FROM bookings WHERE id = ?",
            [bookingId]
        );

        if (bookings.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Booking not found"
            });
        }

        const booking = bookings[0];

        // Check access
        if (booking.user_id !== userId && 
            booking.owner_id !== userId && 
            req.user.user_type !== 'admin') {
            return res.status(403).json({
                success: false,
                message: "Access denied"
            });
        }

        // Check if booking can be cancelled
        if (['cancelled', 'completed'].includes(booking.booking_status)) {
            return res.status(400).json({
                success: false,
                message: `Booking is already ${booking.booking_status}`
            });
        }

        // Update booking
        await pool.execute(
            `UPDATE bookings 
             SET booking_status = 'cancelled', 
                 cancellation_reason = ?,
                 cancelled_by = ?,
                 cancelled_at = NOW()
             WHERE id = ?`,
            [cancellation_reason || null, userId, bookingId]
        );

        // Create cancellation record
        await pool.execute(
            `INSERT INTO cancellations (
                booking_id, cancelled_by, cancellation_type, reason
            ) VALUES (?, ?, ?, ?)`,
            [
                bookingId, 
                userId, 
                booking.user_id === userId ? 'passenger' : 
                booking.owner_id === userId ? 'owner' : 'system',
                cancellation_reason || null
            ]
        );

        res.json({
            success: true,
            message: "Booking cancelled successfully"
        });
    } catch (error) {
        console.error("Error cancelling booking:", error);
        res.status(500).json({
            success: false,
            message: "Failed to cancel booking",
            error: error.message
        });
    }
};

// Add passenger to booking
export const addPassenger = async (req, res) => {
    try {
        const userId = req.user.id;
        const { bookingId } = req.params;
        const {
            passenger_type,
            linked_user_id,
            passenger_profile_id,
            first_name,
            last_name,
            email,
            phone,
            id_number,
            pickup_point,
            dropoff_point,
            next_of_kin_first_name,
            next_of_kin_last_name,
            next_of_kin_phone,
            is_primary = false
        } = req.body;

        // Get booking
        const [bookings] = await pool.execute(
            "SELECT * FROM bookings WHERE id = ?",
            [bookingId]
        );

        if (bookings.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Booking not found"
            });
        }

        const booking = bookings[0];

        // Check access
        if (booking.user_id !== userId && req.user.user_type !== 'admin') {
            return res.status(403).json({
                success: false,
                message: "Access denied"
            });
        }

        // Get current passenger count
        const [passengerCount] = await pool.execute(
            "SELECT COUNT(*) as count FROM booking_passengers WHERE booking_id = ?",
            [bookingId]
        );
        const passenger_number = passengerCount[0].count + 1;

        // Generate passenger code
        const code = Math.random().toString(36).substr(2, 7).toUpperCase();

        // Insert passenger
        const [result] = await pool.execute(
            `INSERT INTO booking_passengers (
                booking_id, passenger_number, passenger_type, linked_user_id,
                passenger_profile_id, first_name, last_name, email, phone, id_number,
                code, pickup_point, dropoff_point, is_primary,
                next_of_kin_first_name, next_of_kin_last_name, next_of_kin_phone
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                bookingId, passenger_number, passenger_type || 'guest',
                linked_user_id || null, passenger_profile_id || null,
                first_name, last_name, email || null, phone || null, id_number || null,
                code, JSON.stringify(pickup_point || null), JSON.stringify(dropoff_point || null),
                is_primary, next_of_kin_first_name, next_of_kin_last_name, next_of_kin_phone
            ]
        );

        // Update passenger count
        await pool.execute(
            "UPDATE bookings SET passenger_count = passenger_count + 1 WHERE id = ?",
            [bookingId]
        );

        res.status(201).json({
            success: true,
            message: "Passenger added successfully",
            passenger: {
                id: result.insertId,
                passenger_number,
                code
            }
        });
    } catch (error) {
        console.error("Error adding passenger:", error);
        res.status(500).json({
            success: false,
            message: "Failed to add passenger",
            error: error.message
        });
    }
};

// Remove passenger from booking
export const removePassenger = async (req, res) => {
    try {
        const userId = req.user.id;
        const { bookingId, passengerId } = req.params;

        // Get booking
        const [bookings] = await pool.execute(
            "SELECT * FROM bookings WHERE id = ?",
            [bookingId]
        );

        if (bookings.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Booking not found"
            });
        }

        const booking = bookings[0];

        // Check access
        if (booking.user_id !== userId && req.user.user_type !== 'admin') {
            return res.status(403).json({
                success: false,
                message: "Access denied"
            });
        }

        // Delete passenger
        await pool.execute(
            "DELETE FROM booking_passengers WHERE id = ? AND booking_id = ?",
            [passengerId, bookingId]
        );

        // Update passenger count
        await pool.execute(
            "UPDATE bookings SET passenger_count = GREATEST(passenger_count - 1, 0) WHERE id = ?",
            [bookingId]
        );

        res.json({
            success: true,
            message: "Passenger removed successfully"
        });
    } catch (error) {
        console.error("Error removing passenger:", error);
        res.status(500).json({
            success: false,
            message: "Failed to remove passenger",
            error: error.message
        });
    }
};

// Add parcel to booking
export const addParcel = async (req, res) => {
    try {
        const userId = req.user.id;
        const { bookingId } = req.params;
        const {
            size,
            weight,
            description,
            sender_name,
            sender_phone,
            receiver_name,
            receiver_phone,
            images,
            delivery_window
        } = req.body;

        // Get booking
        const [bookings] = await pool.execute(
            "SELECT * FROM bookings WHERE id = ?",
            [bookingId]
        );

        if (bookings.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Booking not found"
            });
        }

        const booking = bookings[0];

        // Check access
        if (booking.user_id !== userId && req.user.user_type !== 'admin') {
            return res.status(403).json({
                success: false,
                message: "Access denied"
            });
        }

        // Get current parcel count
        const [parcelCount] = await pool.execute(
            "SELECT COUNT(*) as count FROM booking_parcels WHERE booking_id = ?",
            [bookingId]
        );
        const parcel_number = parcelCount[0].count + 1;

        // Generate codes
        const secret_code = Math.random().toString(36).substr(2, 10).toUpperCase();
        const receiver_code = Math.random().toString(36).substr(2, 10).toUpperCase();

        // Insert parcel
        const [result] = await pool.execute(
            `INSERT INTO booking_parcels (
                booking_id, parcel_number, size, weight, description,
                sender_name, sender_phone, receiver_name, receiver_phone,
                secret_code, receiver_code, images, delivery_window
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                bookingId, parcel_number, size, weight || null, description || null,
                sender_name, sender_phone, receiver_name, receiver_phone,
                secret_code, receiver_code, JSON.stringify(images || []), delivery_window || null
            ]
        );

        // Update parcel count
        await pool.execute(
            "UPDATE bookings SET parcel_count = parcel_count + 1 WHERE id = ?",
            [bookingId]
        );

        res.status(201).json({
            success: true,
            message: "Parcel added successfully",
            parcel: {
                id: result.insertId,
                parcel_number,
                secret_code,
                receiver_code
            }
        });
    } catch (error) {
        console.error("Error adding parcel:", error);
        res.status(500).json({
            success: false,
            message: "Failed to add parcel",
            error: error.message
        });
    }
};

// Remove parcel from booking
export const removeParcel = async (req, res) => {
    try {
        const userId = req.user.id;
        const { bookingId, parcelId } = req.params;

        // Get booking
        const [bookings] = await pool.execute(
            "SELECT * FROM bookings WHERE id = ?",
            [bookingId]
        );

        if (bookings.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Booking not found"
            });
        }

        const booking = bookings[0];

        // Check access
        if (booking.user_id !== userId && req.user.user_type !== 'admin') {
            return res.status(403).json({
                success: false,
                message: "Access denied"
            });
        }

        // Delete parcel
        await pool.execute(
            "DELETE FROM booking_parcels WHERE id = ? AND booking_id = ?",
            [parcelId, bookingId]
        );

        // Update parcel count
        await pool.execute(
            "UPDATE bookings SET parcel_count = GREATEST(parcel_count - 1, 0) WHERE id = ?",
            [bookingId]
        );

        res.json({
            success: true,
            message: "Parcel removed successfully"
        });
    } catch (error) {
        console.error("Error removing parcel:", error);
        res.status(500).json({
            success: false,
            message: "Failed to remove parcel",
            error: error.message
        });
    }
};

// Rate booking
export const rateBooking = async (req, res) => {
    try {
        const userId = req.user.id;
        const { bookingId } = req.params;
        const { rated_type, rated_user_id, rating, review_text } = req.body;

        // Validate
        if (!rated_type || !rating || (rating < 1 || rating > 5)) {
            return res.status(400).json({
                success: false,
                message: "Invalid rating data"
            });
        }

        // Get booking
        const [bookings] = await pool.execute(
            "SELECT * FROM bookings WHERE id = ?",
            [bookingId]
        );

        if (bookings.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Booking not found"
            });
        }

        const booking = bookings[0];

        // Check access (only client who made booking can rate)
        if (booking.user_id !== userId) {
            return res.status(403).json({
                success: false,
                message: "Only the booking creator can rate"
            });
        }

        // Insert rating
        await pool.execute(
            `INSERT INTO booking_ratings (
                booking_id, rated_by, rated_type, rated_user_id, rating, review_text
            ) VALUES (?, ?, ?, ?, ?, ?)`,
            [bookingId, userId, rated_type, rated_user_id || null, rating, review_text || null]
        );

        res.status(201).json({
            success: true,
            message: "Rating submitted successfully"
        });
    } catch (error) {
        console.error("Error rating booking:", error);
        res.status(500).json({
            success: false,
            message: "Failed to submit rating",
            error: error.message
        });
    }
};

// ============================================
// DRIVER ROUTES
// ============================================

// Get driver's assigned bookings
export const getDriverBookings = async (req, res) => {
    try {
        const userId = req.user.id;
        checkUserType(req.user, ['driver', 'admin']);

        const { status, limit = 50, offset = 0 } = req.query;

        let query = `
            SELECT b.*, 
                   v.registration_number, v.make, v.model,
                   u_client.name as client_name, u_client.email as client_email,
                   er.route_name, er.location_1, er.location_2
            FROM bookings b
            LEFT JOIN vehicles v ON b.vehicle_id = v.id
            LEFT JOIN users u_client ON b.user_id = u_client.id
            LEFT JOIN existing_routes er ON b.existing_route_id = er.id
            WHERE b.driver_id = ?
        `;
        const params = [userId];

        if (status) {
            query += ` AND b.booking_status = ?`;
            params.push(status);
        }

        query += ` ORDER BY b.scheduled_pickup ASC LIMIT ? OFFSET ?`;
        params.push(parseInt(limit), parseInt(offset));

        const [bookings] = await pool.execute(query, params);

        res.json({
            success: true,
            bookings
        });
    } catch (error) {
        console.error("Error fetching driver bookings:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch driver bookings",
            error: error.message
        });
    }
};

// Update booking status (driver)
export const updateBookingStatusDriver = async (req, res) => {
    try {
        const userId = req.user.id;
        checkUserType(req.user, ['driver', 'admin']);
        const { bookingId } = req.params;
        const { booking_status } = req.body;

        // Get booking
        const [bookings] = await pool.execute(
            "SELECT * FROM bookings WHERE id = ? AND driver_id = ?",
            [bookingId, userId]
        );

        if (bookings.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Booking not found or not assigned to you"
            });
        }

        // Update status
        await pool.execute(
            "UPDATE bookings SET booking_status = ? WHERE id = ?",
            [booking_status, bookingId]
        );

        res.json({
            success: true,
            message: "Booking status updated successfully"
        });
    } catch (error) {
        console.error("Error updating booking status:", error);
        res.status(500).json({
            success: false,
            message: "Failed to update booking status",
            error: error.message
        });
    }
};

// Complete route point
export const completeRoutePoint = async (req, res) => {
    try {
        const userId = req.user.id;
        checkUserType(req.user, ['driver', 'admin']);
        const { bookingId, pointId } = req.params;

        // Get booking
        const [bookings] = await pool.execute(
            "SELECT * FROM bookings WHERE id = ? AND driver_id = ?",
            [bookingId, userId]
        );

        if (bookings.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Booking not found or not assigned to you"
            });
        }

        // Update route point
        await pool.execute(
            `UPDATE booking_route_points 
             SET status = 'completed', actual_time = NOW() 
             WHERE id = ? AND booking_id = ?`,
            [pointId, bookingId]
        );

        res.json({
            success: true,
            message: "Route point marked as completed"
        });
    } catch (error) {
        console.error("Error completing route point:", error);
        res.status(500).json({
            success: false,
            message: "Failed to complete route point",
            error: error.message
        });
    }
};

// ============================================
// OWNER ROUTES
// ============================================

// Get owner's bookings
export const getOwnerBookings = async (req, res) => {
    try {
        const userId = req.user.id;
        checkUserType(req.user, ['owner', 'admin']);

        const { status, limit = 50, offset = 0 } = req.query;

        let query = `
            SELECT b.*, 
                   v.registration_number, v.make, v.model,
                   u_client.name as client_name, u_client.email as client_email,
                   u_driver.name as driver_name,
                   er.route_name, er.location_1, er.location_2
            FROM bookings b
            LEFT JOIN vehicles v ON b.vehicle_id = v.id
            LEFT JOIN users u_client ON b.user_id = u_client.id
            LEFT JOIN users u_driver ON b.driver_id = u_driver.id
            LEFT JOIN existing_routes er ON b.existing_route_id = er.id
            WHERE b.owner_id = ?
        `;
        const params = [userId];

        if (status) {
            query += ` AND b.booking_status = ?`;
            params.push(status);
        }

        query += ` ORDER BY b.created_at DESC LIMIT ? OFFSET ?`;
        params.push(parseInt(limit), parseInt(offset));

        const [bookings] = await pool.execute(query, params);

        res.json({
            success: true,
            bookings
        });
    } catch (error) {
        console.error("Error fetching owner bookings:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch owner bookings",
            error: error.message
        });
    }
};

// Assign driver to booking
export const assignDriver = async (req, res) => {
    try {
        const userId = req.user.id;
        checkUserType(req.user, ['owner', 'admin']);
        const { bookingId } = req.params;
        const { driver_id } = req.body;

        if (!driver_id) {
            return res.status(400).json({
                success: false,
                message: "driver_id is required"
            });
        }

        // Get booking
        const [bookings] = await pool.execute(
            "SELECT * FROM bookings WHERE id = ? AND owner_id = ?",
            [bookingId, userId]
        );

        if (bookings.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Booking not found or you don't own this booking"
            });
        }

        // Verify driver exists and is a driver
        const [drivers] = await pool.execute(
            "SELECT * FROM users WHERE id = ? AND user_type = 'driver'",
            [driver_id]
        );

        if (drivers.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Driver not found"
            });
        }

        // Update booking
        await pool.execute(
            "UPDATE bookings SET driver_id = ? WHERE id = ?",
            [driver_id, bookingId]
        );

        // Create assignment record
        await pool.execute(
            `INSERT INTO driver_vehicle_assignments (
                driver_id, vehicle_id, assigned_by, status
            ) VALUES (?, ?, ?, 'active')`,
            [driver_id, bookings[0].vehicle_id, userId]
        );

        res.json({
            success: true,
            message: "Driver assigned successfully"
        });
    } catch (error) {
        console.error("Error assigning driver:", error);
        res.status(500).json({
            success: false,
            message: "Failed to assign driver",
            error: error.message
        });
    }
};

// Update booking (owner)
export const updateBooking = async (req, res) => {
    try {
        const userId = req.user.id;
        checkUserType(req.user, ['owner', 'admin']);
        const { bookingId } = req.params;
        const updateData = req.body;

        // Get booking
        const [bookings] = await pool.execute(
            "SELECT * FROM bookings WHERE id = ? AND owner_id = ?",
            [bookingId, userId]
        );

        if (bookings.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Booking not found or you don't own this booking"
            });
        }

        // Build update query
        const allowedFields = [
            'scheduled_pickup', 'special_instructions', 'route_points',
            'total_seats_available', 'total_amount_needed'
        ];
        const updates = [];
        const values = [];

        for (const field of allowedFields) {
            if (updateData[field] !== undefined) {
                updates.push(`${field} = ?`);
                if (field === 'route_points') {
                    values.push(JSON.stringify(updateData[field]));
                } else {
                    values.push(updateData[field]);
                }
            }
        }

        if (updates.length === 0) {
            return res.status(400).json({
                success: false,
                message: "No valid fields to update"
            });
        }

        values.push(bookingId);
        await pool.execute(
            `UPDATE bookings SET ${updates.join(', ')} WHERE id = ?`,
            values
        );

        res.json({
            success: true,
            message: "Booking updated successfully"
        });
    } catch (error) {
        console.error("Error updating booking:", error);
        res.status(500).json({
            success: false,
            message: "Failed to update booking",
            error: error.message
        });
    }
};

// ============================================
// ADMIN ROUTES
// ============================================

// Get all bookings (admin)
export const getAllBookings = async (req, res) => {
    try {
        checkUserType(req.user, ['admin']);

        const { status, user_type, limit = 100, offset = 0 } = req.query;

        let query = `
            SELECT b.*, 
                   v.registration_number, v.make, v.model,
                   u_client.name as client_name, u_client.email as client_email,
                   u_owner.name as owner_name,
                   u_driver.name as driver_name,
                   er.route_name, er.location_1, er.location_2
            FROM bookings b
            LEFT JOIN vehicles v ON b.vehicle_id = v.id
            LEFT JOIN users u_client ON b.user_id = u_client.id
            LEFT JOIN users u_owner ON b.owner_id = u_owner.id
            LEFT JOIN users u_driver ON b.driver_id = u_driver.id
            LEFT JOIN existing_routes er ON b.existing_route_id = er.id
            WHERE 1=1
        `;
        const params = [];

        if (status) {
            query += ` AND b.booking_status = ?`;
            params.push(status);
        }

        query += ` ORDER BY b.created_at DESC LIMIT ? OFFSET ?`;
        params.push(parseInt(limit), parseInt(offset));

        const [bookings] = await pool.execute(query, params);

        res.json({
            success: true,
            bookings
        });
    } catch (error) {
        console.error("Error fetching all bookings:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch bookings",
            error: error.message
        });
    }
};

// Get booking statistics
export const getBookingStatistics = async (req, res) => {
    try {
        checkUserType(req.user, ['admin']);

        const [stats] = await pool.execute(`
            SELECT 
                COUNT(*) as total_bookings,
                SUM(CASE WHEN booking_status = 'pending' THEN 1 ELSE 0 END) as pending,
                SUM(CASE WHEN booking_status = 'confirmed' THEN 1 ELSE 0 END) as confirmed,
                SUM(CASE WHEN booking_status = 'paid' THEN 1 ELSE 0 END) as paid,
                SUM(CASE WHEN booking_status = 'completed' THEN 1 ELSE 0 END) as completed,
                SUM(CASE WHEN booking_status = 'cancelled' THEN 1 ELSE 0 END) as cancelled,
                SUM(total_amount_paid) as total_revenue
            FROM bookings
        `);

        const [recentBookings] = await pool.execute(`
            SELECT COUNT(*) as count 
            FROM bookings 
            WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
        `);

        res.json({
            success: true,
            statistics: {
                ...stats[0],
                recent_bookings: recentBookings[0].count
            }
        });
    } catch (error) {
        console.error("Error fetching booking statistics:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch statistics",
            error: error.message
        });
    }
};

// Update booking status (admin)
export const updateBookingStatusAdmin = async (req, res) => {
    try {
        checkUserType(req.user, ['admin']);
        const { bookingId } = req.params;
        const { booking_status } = req.body;

        if (!booking_status) {
            return res.status(400).json({
                success: false,
                message: "booking_status is required"
            });
        }

        // Update status
        await pool.execute(
            "UPDATE bookings SET booking_status = ? WHERE id = ?",
            [booking_status, bookingId]
        );

        res.json({
            success: true,
            message: "Booking status updated successfully"
        });
    } catch (error) {
        console.error("Error updating booking status:", error);
        res.status(500).json({
            success: false,
            message: "Failed to update booking status",
            error: error.message
        });
    }
};

/**
 * Admin endpoint to execute a booking
 * Creates a route-based booking and automatically moves the vehicle to the end of the queue
 * 
 * @param {number} existing_route_id - Required: The route ID
 * @param {number} vehicle_id - Required: The vehicle ID at position 1 (for verification)
 * @param {string} scheduled_pickup - Optional: When the trip should start
 * @param {number} passenger_count - Optional: Number of passengers (defaults to 0)
 * @param {number} parcel_count - Optional: Number of parcels (defaults to 0)
 * @param {string} special_instructions - Optional: Special instructions
 */
export const executeBookingAdmin = async (req, res) => {
    try {
        checkUserType(req.user, ['admin']);
        const userId = req.user.id;
        
        const {
            existing_route_id,
            direction_type, // Required: 'from_loc1' or 'from_loc2'
            vehicle_id, // Required for verification
            scheduled_pickup,
            passenger_count = 0,
            parcel_count = 0,
            special_instructions = null
        } = req.body;

        // Validate required fields
        if (!existing_route_id) {
            return res.status(400).json({
                success: false,
                message: "Missing required field: existing_route_id"
            });
        }

        if (!direction_type) {
            return res.status(400).json({
                success: false,
                message: "Missing required field: direction_type"
            });
        }

        // Validate direction_type
        if (!['from_loc1', 'from_loc2'].includes(direction_type)) {
            return res.status(400).json({
                success: false,
                message: "direction_type must be 'from_loc1' or 'from_loc2'"
            });
        }

        if (!vehicle_id) {
            return res.status(400).json({
                success: false,
                message: "Missing required field: vehicle_id (for verification)"
            });
        }

        // Get route information
        const [routes] = await pool.execute(
            "SELECT * FROM existing_routes WHERE ID = ? AND status = 'active'",
            [existing_route_id]
        );

        if (routes.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Route not found or inactive"
            });
        }

        const route = routes[0];

        // Get the next vehicle in queue that matches the requested direction
        const nextVehicleInfo = await getNextVehicleInQueueHelper(existing_route_id, direction_type);

        if (!nextVehicleInfo) {
            return res.status(404).json({
                success: false,
                message: `No vehicle available for this route with direction '${direction_type}'. Please try again later.`
            });
        }

        // Verify the vehicle_id matches the one found
        if (nextVehicleInfo.vehicle_id !== parseInt(vehicle_id)) {
            return res.status(400).json({
                success: false,
                message: `Vehicle ID mismatch. Vehicle matching direction '${direction_type}' is ${nextVehicleInfo.vehicle_id}, not ${vehicle_id}`
            });
        }

        // Extract information from queue and route
        const vehicleId = nextVehicleInfo.vehicle_id;
        const driverId = nextVehicleInfo.driver_id;
        const ownerId = nextVehicleInfo.owner_id;
        const totalSeatsAvailable = nextVehicleInfo.capacity;
        const totalSeats = nextVehicleInfo.capacity; // capacity from vehicles table → total_seats in bookings table
        const extraspaceParcelCountSp = nextVehicleInfo.extraspace_parcel_sp || 0; // extraspace_parcel_sp from vehicles table → extraspace_parcel_count_sp in bookings table
        const baseFare = parseFloat(route.base_fare);
        
        // Calculate total amount needed (base fare, can be adjusted later for passengers/parcels)
        const totalAmountNeeded = baseFare;

        // Create route points based on direction_type
        // from_loc1: pickup at location_1, dropoff at location_2
        // from_loc2: pickup at location_2, dropoff at location_1
        let routePoints = [];
        if (direction_type === 'from_loc1') {
            routePoints = [
                {
                    point_type: 'pickup',
                    point_name: route.location_1,
                    address: route.location_1,
                    expected_time: scheduled_pickup || new Date().toISOString()
                },
                {
                    point_type: 'dropoff',
                    point_name: route.location_2 || route.location_1,
                    address: route.location_2 || route.location_1,
                    expected_time: scheduled_pickup || new Date().toISOString()
                }
            ];
        } else { // from_loc2
            routePoints = [
                {
                    point_type: 'pickup',
                    point_name: route.location_2,
                    address: route.location_2,
                    expected_time: scheduled_pickup || new Date().toISOString()
                },
                {
                    point_type: 'dropoff',
                    point_name: route.location_1 || route.location_2,
                    address: route.location_1 || route.location_2,
                    expected_time: scheduled_pickup || new Date().toISOString()
                }
            ];
        }

        // Generate unique booking reference
        const booking_reference = generateBookingReference();

        // Get a connection for transaction
        const connection = await pool.getConnection();

        try {
            // Start transaction
            await connection.beginTransaction();

            // Insert booking with direction_type
            const [result] = await connection.execute(
                `INSERT INTO bookings (
                    booking_reference, user_id, owner_id, vehicle_id, driver_id, 
                    existing_route_id, booking_mode, booking_status, passenger_count, 
                    seat_parcel_count, total_seats_available, total_amount_needed, 
                    total_amount_paid, scheduled_pickup, route_points, special_instructions,
                    direction_type, total_seats, extraspace_parcel_count_sp
                ) VALUES (?, ?, ?, ?, ?, ?, 'route', 'pending', ?, ?, ?, ?, 0.00, ?, ?, ?, ?, ?, ?)`,
                [
                    booking_reference, userId, ownerId, vehicleId, driverId,
                    existing_route_id, passenger_count, parcel_count, 
                    totalSeatsAvailable, totalAmountNeeded,
                    scheduled_pickup || new Date().toISOString(), 
                    JSON.stringify(routePoints), special_instructions,
                    direction_type, totalSeats, extraspaceParcelCountSp
                ]
            );

            const bookingId = result.insertId;

            // Note: booking_route_points table is not used in this application
            // Route points are stored in the route_points JSON field in the bookings table

            // Commit transaction first
            await connection.commit();
            connection.release();

            // Move vehicle to end of queue after successful booking creation
            // This is done after commit to ensure booking is saved first
            let queueResult = null;
            try {
                // Get a new connection for queue operations (after booking transaction is committed)
                const queueConnection = await pool.getConnection();
                
                try {
                    await queueConnection.beginTransaction();

                    // Get the current position of the selected vehicle
                    const [queueCheck] = await queueConnection.execute(
                        `SELECT queue_position FROM vehicle_queue 
                         WHERE existing_route_id = ? AND vehicle_id = ?`,
                        [existing_route_id, vehicleId]
                    );

                    if (queueCheck.length > 0) {
                        const currentPosition = queueCheck[0].queue_position;
                        
                        // Get total count of vehicles in queue for this route (active, approved, verified drivers)
                        const [countResult] = await queueConnection.execute(
                            `SELECT COUNT(*) as total 
                             FROM vehicle_queue vq
                             INNER JOIN vehicles v ON vq.vehicle_id = v.ID
                             LEFT JOIN driver_profiles dp ON v.driver_id = dp.user_id
                             WHERE vq.existing_route_id = ? 
                               AND v.vehicle_status = 'active' 
                               AND v.admin_status = 'approve'
                               AND v.driver_id IS NOT NULL
                               AND dp.verification_status = 'verified'
                               AND dp.status = 'active'`,
                            [existing_route_id]
                        );
                        const totalVehicles = countResult[0].total;
                        const newPosition = totalVehicles; // Move to last position

                        // Efficiently renumber the queue:
                        // 1. Move all vehicles after the selected vehicle up by 1 position
                        //    (This fills the gap left by the selected vehicle)
                        await queueConnection.execute(
                            `UPDATE vehicle_queue vq
                             INNER JOIN vehicles v ON vq.vehicle_id = v.ID
                             LEFT JOIN driver_profiles dp ON v.driver_id = dp.user_id
                             SET vq.queue_position = vq.queue_position - 1
                             WHERE vq.existing_route_id = ? 
                               AND vq.queue_position > ?
                               AND v.vehicle_status = 'active' 
                               AND v.admin_status = 'approve'
                               AND v.driver_id IS NOT NULL
                               AND dp.verification_status = 'verified'
                               AND dp.status = 'active'`,
                            [existing_route_id, currentPosition]
                        );

                        // 2. Move the selected vehicle to the end
                        // Note: updated_at will automatically update due to ON UPDATE CURRENT_TIMESTAMP
                        await queueConnection.execute(
                            `UPDATE vehicle_queue 
                             SET queue_position = ? 
                             WHERE existing_route_id = ? AND vehicle_id = ?`,
                            [newPosition, existing_route_id, vehicleId]
                        );

                        await queueConnection.commit();
                        queueResult = {
                            success: true,
                            message: "Vehicle moved to end of queue",
                            new_position: newPosition
                        };
                    } else {
                        await queueConnection.rollback();
                        queueResult = {
                            success: false,
                            message: "Vehicle not found in queue"
                        };
                    }
                } catch (queueError) {
                    await queueConnection.rollback();
                    throw queueError;
                } finally {
                    queueConnection.release();
                }
            } catch (queueError) {
                // Log error but don't fail the booking
                console.error("Error moving vehicle to end of queue after booking:", queueError);
                queueResult = {
                    success: false,
                    message: queueError.message,
                    error: queueError.message
                };
            }

            res.status(201).json({
                success: true,
                message: "Booking executed successfully. Vehicle moved to end of queue.",
                booking: {
                    id: bookingId,
                    booking_reference,
                    booking_status: 'pending',
                    booking_mode: 'route',
                    vehicle_id: vehicleId,
                    driver_id: driverId,
                    owner_id: ownerId,
                    existing_route_id: existing_route_id,
                    route_name: route.route_name,
                    total_seats_available: totalSeatsAvailable,
                    total_amount_needed: totalAmountNeeded
                },
                vehicle_info: {
                    vehicle_id: vehicleId,
                    registration_number: nextVehicleInfo.registration_number,
                    make: nextVehicleInfo.make,
                    model: nextVehicleInfo.model,
                    capacity: totalSeatsAvailable,
                    driver_name: nextVehicleInfo.driver_name,
                    owner_name: nextVehicleInfo.owner_name
                },
                route_info: {
                    route_id: route.ID,
                    route_name: route.route_name,
                    location_1: route.location_1,
                    location_2: route.location_2,
                    base_fare: baseFare
                },
                queue_result: queueResult
            });
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            if (connection) {
                connection.release();
            }
        }
    } catch (error) {
        console.error("Error executing booking (admin):", error);
        res.status(500).json({
            success: false,
            message: "Failed to execute booking",
            error: error.message
        });
    }
};

/**
 * Get public pending bookings for display on booking-public page
 * This endpoint is public (no authentication required)
 * Returns bookings with status 'pending' along with their route information
 */
export const getPublicPendingBookings = async (req, res) => {
    try {
        const query = `
            SELECT 
                b.ID,
                b.booking_reference,
                b.booking_status,
                b.total_seats_available,
                b.scheduled_pickup,
                b.extraspace_parcel_count_sp,
                b.direction_type,
                er.id as route_id,
                er.location_1,
                er.location_2,
                er.typical_duration_hours,
                er.base_fare,
                er.small_parcel_price,
                er.medium_parcel_price,
                er.large_parcel_price
            FROM bookings b
            INNER JOIN existing_routes er ON b.existing_route_id = er.id
            WHERE b.booking_status = 'pending'
                AND b.booking_mode = 'route'
                AND er.status = 'active'
            ORDER BY b.scheduled_pickup ASC
        `;

        const [bookings] = await pool.execute(query);

        res.json({
            success: true,
            bookings: bookings
        });
    } catch (error) {
        console.error("Error fetching public pending bookings:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch pending bookings",
            error: error.message
        });
    }
};

export default {
    createRouteBasedBooking,
    createCustomBooking,
    getMyBookings,
    getBookingDetails,
    cancelBooking,
    addPassenger,
    removePassenger,
    addParcel,
    removeParcel,
    rateBooking,
    getDriverBookings,
    updateBookingStatusDriver,
    completeRoutePoint,
    getOwnerBookings,
    assignDriver,
    updateBooking,
    getAllBookings,
    getBookingStatistics,
    updateBookingStatusAdmin,
    executeBookingAdmin,
    getPublicPendingBookings
};

