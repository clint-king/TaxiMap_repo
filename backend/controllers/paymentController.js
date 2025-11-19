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
        const {
            booking_id,
            payer_profile_id,
            amount,
            payment_method = 'EFT',
            payer_type = 'registered'
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
        if (booking.user_id !== userId && req.user.user_type !== 'admin') {
            return res.status(403).json({
                success: false,
                message: "Access denied"
            });
        }

        // Generate transaction ID
        const transaction_id = uuidv4();

        // Insert payment
        const [result] = await pool.execute(
            `INSERT INTO payments (
                booking_id, user_id, payer_profile_id, amount, currency,
                payment_method, payer_type, payment_status, transaction_id
            ) VALUES (?, ?, ?, ?, 'ZAR', ?, ?, 'pending', ?)`,
            [
                booking_id, payer_type === 'registered' ? userId : null,
                payer_profile_id || null, amount, payment_method, payer_type, transaction_id
            ]
        );

        // Update booking payment status
        const newTotalPaid = parseFloat(booking.total_amount_paid || 0) + parseFloat(amount);
        await pool.execute(
            `UPDATE bookings 
             SET total_amount_paid = ?, 
                 payment_transaction_id = ?,
                 booking_status = CASE 
                     WHEN ? >= total_amount_needed THEN 'paid'
                     WHEN booking_status = 'pending' THEN 'confirmed'
                     ELSE booking_status
                 END
             WHERE id = ?`,
            [newTotalPaid, transaction_id, newTotalPaid, booking_id]
        );

        res.status(201).json({
            success: true,
            message: "Payment created successfully",
            payment: {
                id: result.insertId,
                transaction_id,
                payment_status: 'pending'
            }
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
        if (payment.user_id !== userId && 
            payment.booking?.owner_id !== userId && 
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

        const [payments] = await pool.execute(
            `SELECT p.*, b.booking_reference, b.scheduled_pickup
             FROM payments p
             LEFT JOIN bookings b ON p.booking_id = b.id
             WHERE b.owner_id = ?
             ORDER BY p.created_at DESC
             LIMIT ? OFFSET ?`,
            [userId, parseInt(limit), parseInt(offset)]
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

