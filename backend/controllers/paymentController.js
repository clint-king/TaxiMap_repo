import pool from "../config/db.js";
import { v4 as uuidv4 } from 'uuid';

const checkUserType = (user, allowedTypes) => {
    if (!allowedTypes.includes(user.user_type)) {
        throw new Error(`Access denied. Required user type: ${allowedTypes.join(' or ')}`);
    }
};

// Create payment
export const createPayment = async (req, res) => {
    try {
        const userId = req.user.id;
        console.log("The user id is: ", userId);
        const {
            booking_id,
            amount,
            payment_method = 'card', // Default to 'card' since Yoco is the only payment method
            payment_gateway = 'yoco', // Default to 'yoco' since it's the only payment gateway
            transaction_id: provided_transaction_id = null,
            gateway_response = null,
            passenger_data = null // Passenger data if this is a passenger booking
        } = req.body;

        if (!booking_id || !amount) {
            return res.status(400).json({
                success: false,
                message: "booking_id and amount are required"
            });
        }

        // Get booking
        const [bookings] = await pool.execute(
            "SELECT * FROM bookings WHERE id = ?",
            [booking_id]
        );

        if (bookings.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Booking not found"
            });
        }

        const booking = bookings[0];

        // Check access
        // Only clients (regular users) can make payments, not admins or owners
        const userType = req.user.user_type;
        const isClient = userType === 'client' || userType === 'customer';
        const isAdmin = userType === 'admin';
        const isOwner = userType === 'owner';
        const isRouteBasedBooking = booking.booking_mode === 'route';
        
        // Deny payment if user is admin or owner
        if (isAdmin || isOwner) {
            return res.status(403).json({
                success: false,
                message: "Access denied. Only clients can make payments. Admins and owners are not allowed to pay."
            });
        }
        
        // Allow payment only for clients on route-based bookings
        if (!isClient || !isRouteBasedBooking) {
            return res.status(403).json({
                success: false,
                message: "Access denied. Only clients can pay for route-based bookings."
            });
        }

        // Use provided transaction_id (from Yoco) or generate a new one
        const transaction_id = provided_transaction_id || uuidv4();
        
        // Determine payment status based on gateway
        // Yoco payments are typically 'completed' when the callback is received
        // EFT payments start as 'pending'
        let payment_status = 'pending';
        if (payment_gateway === 'yoco' && provided_transaction_id) {
            payment_status = 'completed'; // Yoco payments are completed when we receive the transaction_id
        }

        // Insert payment
        const [result] = await pool.execute(
            `INSERT INTO payments (
                booking_id, user_id, amount, currency,
                payment_method, payment_status, transaction_id,
                payment_gateway, gateway_response
            ) VALUES (?, ?, ?, 'ZAR', ?, ?, ?, ?, ?)`,
            [
                booking_id, 
                userId, // Always use the authenticated user's ID
                amount, 
                payment_method, 
                payment_status,
                transaction_id,
                payment_gateway,
                gateway_response ? JSON.stringify(gateway_response) : null
            ]
        );

        // Update booking payment status and amounts
        const newTotalPaid = parseFloat(booking.total_amount_paid || 0) + parseFloat(amount);
        
        // Check if this is a passenger booking (has passenger data)
        const isPassengerBooking = passenger_data && passenger_data.first_name;
        
        // Prepare booking update query
        // Note: payment_id column has been removed from bookings table
        // Note: Booking status should not be changed here - leave it as 'pending' or whatever it currently is
        let bookingUpdateQuery = `UPDATE bookings 
             SET total_amount_paid = ?`;
        let bookingUpdateParams = [newTotalPaid];
        
        // If passenger booking, update passenger_count and total_seats_available
        if (isPassengerBooking) {
            bookingUpdateQuery += `, passenger_count = passenger_count + 1,
                 total_seats_available = GREATEST(0, total_seats_available - 1)`;
        }
        
        bookingUpdateQuery += ` WHERE id = ?`;
        bookingUpdateParams.push(booking_id);
        
        await pool.execute(bookingUpdateQuery, bookingUpdateParams);
        
        // If passenger booking, add passenger to booking_passengers table
        let passengerResult = null;
        if (isPassengerBooking) {
            try {
                // Get current passenger count for passenger_number
                const [passengerCount] = await pool.execute(
                    "SELECT COUNT(*) as count FROM booking_passengers WHERE booking_id = ?",
                    [booking_id]
                );
                const passenger_number = passengerCount[0].count + 1;
                
                // Generate unique 7-character code
                let code;
                let codeExists = true;
                let attempts = 0;
                const maxAttempts = 20;
                
                while (codeExists && attempts < maxAttempts) {
                    // Generate 7-character alphanumeric code
                    code = Math.random().toString(36).substring(2, 9).toUpperCase();
                    // Ensure it's exactly 7 characters
                    if (code.length < 7) {
                        code = code.padEnd(7, Math.random().toString(36).substring(2, 9).toUpperCase());
                    }
                    code = code.substring(0, 7);
                    
                    // Check if code already exists
                    const [existingCode] = await pool.execute(
                        "SELECT ID FROM booking_passengers WHERE code = ?",
                        [code]
                    );
                    codeExists = existingCode.length > 0;
                    attempts++;
                }
                
                if (codeExists) {
                    throw new Error('Failed to generate unique passenger code after ' + maxAttempts + ' attempts');
                }
                
                // Helper function to extract coordinates from point data
                const extractCoordinates = (pointData) => {
                    if (!pointData) return null;
                    
                    // Handle different coordinate formats
                    let lat, lng;
                    
                    if (pointData.coordinates) {
                        lat = pointData.coordinates.lat || pointData.coordinates.latitude;
                        lng = pointData.coordinates.lng || pointData.coordinates.longitude;
                    } else if (pointData.lat && pointData.lng) {
                        lat = pointData.lat;
                        lng = pointData.lng;
                    } else if (pointData.latitude && pointData.longitude) {
                        lat = pointData.latitude;
                        lng = pointData.longitude;
                    }
                    
                    // Return coordinates if valid, otherwise null
                    if (lat != null && lng != null && !isNaN(lat) && !isNaN(lng)) {
                        return { lat: parseFloat(lat), lng: parseFloat(lng) };
                    }
                    
                    return null;
                };
                
                // Extract coordinates for pickup and dropoff points
                const pickupCoords = extractCoordinates(passenger_data.pickup_point);
                const dropoffCoords = extractCoordinates(passenger_data.dropoff_point);
                
                // Build SQL with POINT geometry functions
                // Use ST_GeomFromText for POINT geometry: POINT(longitude latitude) - MySQL uses longitude first
                let pickupPointSQL = 'NULL';
                let dropoffPointSQL = 'NULL';
                
                if (pickupCoords) {
                    pickupPointSQL = `ST_GeomFromText('POINT(${pickupCoords.lng} ${pickupCoords.lat})', 4326)`;
                }
                
                if (dropoffCoords) {
                    dropoffPointSQL = `ST_GeomFromText('POINT(${dropoffCoords.lng} ${dropoffCoords.lat})', 4326)`;
                }
                
                // Extract addresses from pickup_point and dropoff_point objects
                const pickupAddress = passenger_data.pickup_point?.address || 
                                     (typeof passenger_data.pickup_point === 'string' ? passenger_data.pickup_point : null) ||
                                     passenger_data.pickup_address || null;
                const dropoffAddress = passenger_data.dropoff_point?.address || 
                                      (typeof passenger_data.dropoff_point === 'string' ? passenger_data.dropoff_point : null) ||
                                      passenger_data.dropoff_address || null;
                
                // Insert passenger as registered user with POINT geometry
                const [passengerInsert] = await pool.execute(
                    `INSERT INTO booking_passengers (
                        booking_id, passenger_number, passenger_type, linked_user_id,
                        first_name, last_name, email, phone, id_number,
                        code, pickup_point, dropoff_point, pickup_address, dropoff_address, is_primary,
                        next_of_kin_first_name, next_of_kin_last_name, next_of_kin_phone
                    ) VALUES (?, ?, 'registered', ?, ?, ?, ?, ?, ?, ?, ${pickupPointSQL}, ${dropoffPointSQL}, ?, ?, ?, ?, ?, ?)`,
                    [
                        booking_id,
                        passenger_number,
                        userId, // linked_user_id for registered user
                        passenger_data.first_name,
                        passenger_data.last_name,
                        passenger_data.email || null,
                        passenger_data.phone || null,
                        passenger_data.id_number || null,
                        code,
                        pickupAddress,
                        dropoffAddress,
                        passenger_data.is_primary || false,
                        passenger_data.next_of_kin_first_name || '',
                        passenger_data.next_of_kin_last_name || '',
                        passenger_data.next_of_kin_phone || ''
                    ]
                );
                
                passengerResult = {
                    id: passengerInsert.insertId,
                    passenger_number,
                    code
                };
            } catch (error) {
                console.error("Error adding passenger to booking:", error);
                // Don't fail the payment if passenger addition fails, but log it
            }
        }

        res.status(201).json({
            success: true,
            message: "Payment created successfully",
            payment: {
                id: result.insertId,
                transaction_id,
                payment_status: payment_status,
                payment_gateway: payment_gateway
            },
            passenger: passengerResult // Include passenger info if added
        });
    } catch (error) {
        console.error("Error creating payment:", error);
        res.status(500).json({
            success: false,
            message: "Failed to create payment",
            error: error.message
        });
    }
};

// Get user's payments
export const getMyPayments = async (req, res) => {
    try {
        const userId = req.user.id;
        const { status, limit = 50, offset = 0 } = req.query;

        let query = `
            SELECT p.*, b.booking_reference, b.scheduled_pickup
            FROM payments p
            LEFT JOIN bookings b ON p.booking_id = b.id
            WHERE p.user_id = ?
        `;
        const params = [userId];

        if (status) {
            query += ` AND p.payment_status = ?`;
            params.push(status);
        }

        query += ` ORDER BY p.created_at DESC LIMIT ? OFFSET ?`;
        params.push(parseInt(limit), parseInt(offset));

        const [payments] = await pool.execute(query, params);

        res.json({
            success: true,
            payments
        });
    } catch (error) {
        console.error("Error fetching payments:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch payments",
            error: error.message
        });
    }
};

// Get payment details
export const getPaymentDetails = async (req, res) => {
    try {
        const userId = req.user.id;
        const { paymentId } = req.params;

        const [payments] = await pool.execute(
            `SELECT p.*, b.*, u.name as payer_name
             FROM payments p
             LEFT JOIN bookings b ON p.booking_id = b.id
             LEFT JOIN users u ON p.user_id = u.id
             WHERE p.id = ?`,
            [paymentId]
        );

        if (payments.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Payment not found"
            });
        }

        const payment = payments[0];

        // Check access
        // Get user's owner profile ID if user is owner
        let userOwnerProfileId = null;
        if (req.user.user_type === 'owner' && payment.booking?.owner_id) {
            const [ownerProfiles] = await pool.execute(
                "SELECT ID FROM owner_profiles WHERE user_id = ?",
                [userId]
            );
            if (ownerProfiles.length > 0) {
                userOwnerProfileId = ownerProfiles[0].ID;
            }
        }
        
        const isOwner = userOwnerProfileId !== null && payment.booking?.owner_id === userOwnerProfileId;
        
        if (payment.user_id !== userId && 
            !isOwner && 
            req.user.user_type !== 'admin') {
            return res.status(403).json({
                success: false,
                message: "Access denied"
            });
        }

        res.json({
            success: true,
            payment
        });
    } catch (error) {
        console.error("Error fetching payment details:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch payment details",
            error: error.message
        });
    }
};

// Process payment callback
export const processPaymentCallback = async (req, res) => {
    try {
        const { transaction_id, status, gateway_response } = req.body;

        if (!transaction_id || !status) {
            return res.status(400).json({
                success: false,
                message: "transaction_id and status are required"
            });
        }

        // Update payment
        await pool.execute(
            `UPDATE payments 
             SET payment_status = ?, 
                 gateway_response = ?,
                 processed_at = CASE WHEN ? = 'completed' THEN NOW() ELSE processed_at END
             WHERE transaction_id = ?`,
            [status, JSON.stringify(gateway_response || {}), status, transaction_id]
        );

        // If payment completed, update booking and create revenue transaction
        if (status === 'completed') {
            const [payments] = await pool.execute(
                "SELECT * FROM payments WHERE transaction_id = ?",
                [transaction_id]
            );

            if (payments.length > 0) {
                const payment = payments[0];
                const [bookings] = await pool.execute(
                    "SELECT * FROM bookings WHERE id = ?",
                    [payment.booking_id]
                );

                if (bookings.length > 0) {
                    const booking = bookings[0];
                    
                    // Create revenue transaction
                    const commission_rate = 0.10; // 10% platform commission
                    const platform_commission = payment.amount * commission_rate;
                    const owner_amount = payment.amount - platform_commission;

                    await pool.execute(
                        `INSERT INTO revenue_transactions (
                            booking_id, owner_id, driver_id, gross_amount,
                            platform_commission, owner_amount, driver_amount,
                            commission_rate, transaction_type, status
                        ) VALUES (?, ?, ?, ?, ?, ?, 0.00, ?, 'booking_payment', 'processed')`,
                        [
                            booking.id, booking.owner_id, booking.driver_id || booking.owner_id,
                            payment.amount, platform_commission, owner_amount, commission_rate
                        ]
                    );
                }
            }
        }

        res.json({
            success: true,
            message: "Payment callback processed"
        });
    } catch (error) {
        console.error("Error processing payment callback:", error);
        res.status(500).json({
            success: false,
            message: "Failed to process payment callback",
            error: error.message
        });
    }
};

// Get owner's payments
export const getOwnerPayments = async (req, res) => {
    try {
        const userId = req.user.id;
        checkUserType(req.user, ['owner', 'admin']);

        const { limit = 50, offset = 0 } = req.query;

        // Get user's owner profile ID
        const [ownerProfiles] = await pool.execute(
            "SELECT ID FROM owner_profiles WHERE user_id = ?",
            [userId]
        );
        
        if (ownerProfiles.length === 0) {
            return res.status(403).json({
                success: false,
                message: "User does not have an owner profile"
            });
        }
        
        const ownerProfileId = ownerProfiles[0].ID;
        
        const [payments] = await pool.execute(
            `SELECT p.*, b.booking_reference, b.scheduled_pickup
             FROM payments p
             LEFT JOIN bookings b ON p.booking_id = b.id
             WHERE b.owner_id = ?
             ORDER BY p.created_at DESC
             LIMIT ? OFFSET ?`,
            [ownerProfileId, parseInt(limit), parseInt(offset)]
        );

        res.json({
            success: true,
            payments
        });
    } catch (error) {
        console.error("Error fetching owner payments:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch payments",
            error: error.message
        });
    }
};

// ============================================
// ADMIN ROUTES
// ============================================

// Get all payments
export const getAllPayments = async (req, res) => {
    try {
        checkUserType(req.user, ['admin']);

        const { status, limit = 100, offset = 0 } = req.query;

        let query = `
            SELECT p.*, b.booking_reference, u.name as payer_name
            FROM payments p
            LEFT JOIN bookings b ON p.booking_id = b.id
            LEFT JOIN users u ON p.user_id = u.id
            WHERE 1=1
        `;
        const params = [];

        if (status) {
            query += ` AND p.payment_status = ?`;
            params.push(status);
        }

        query += ` ORDER BY p.created_at DESC LIMIT ? OFFSET ?`;
        params.push(parseInt(limit), parseInt(offset));

        const [payments] = await pool.execute(query, params);

        res.json({
            success: true,
            payments
        });
    } catch (error) {
        console.error("Error fetching all payments:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch payments",
            error: error.message
        });
    }
};

// Process refund
export const processRefund = async (req, res) => {
    try {
        checkUserType(req.user, ['admin']);
        const { paymentId } = req.params;
        const { refund_amount, refund_reason } = req.body;

        // Get payment
        const [payments] = await pool.execute(
            "SELECT * FROM payments WHERE id = ?",
            [paymentId]
        );

        if (payments.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Payment not found"
            });
        }

        const payment = payments[0];

        if (payment.payment_status !== 'completed') {
            return res.status(400).json({
                success: false,
                message: "Only completed payments can be refunded"
            });
        }

        const refundAmount = refund_amount || payment.amount;

        // Update payment
        await pool.execute(
            `UPDATE payments 
             SET payment_status = 'refunded',
                 refund_amount = ?,
                 refund_reason = ?,
                 refunded_at = NOW()
             WHERE id = ?`,
            [refundAmount, refund_reason || null, paymentId]
        );

        // Update booking
        await pool.execute(
            `UPDATE bookings 
             SET total_amount_paid = GREATEST(total_amount_paid - ?, 0),
                 booking_status = 'refunded'
             WHERE id = ?`,
            [refundAmount, payment.booking_id]
        );

        res.json({
            success: true,
            message: "Refund processed successfully"
        });
    } catch (error) {
        console.error("Error processing refund:", error);
        res.status(500).json({
            success: false,
            message: "Failed to process refund",
            error: error.message
        });
    }
};

export default {
    createPayment,
    getMyPayments,
    getPaymentDetails,
    processPaymentCallback,
    getOwnerPayments,
    getAllPayments,
    processRefund
};

