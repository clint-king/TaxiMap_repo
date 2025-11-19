import pool from "../config/db.js";

const checkUserType = (user, allowedTypes) => {
    if (!allowedTypes.includes(user.user_type)) {
        throw new Error(`Access denied. Required user type: ${allowedTypes.join(' or ')}`);
    }
};

// Get owner profile
export const getOwnerProfile = async (req, res) => {
    try {
        const userId = req.user.id;
        checkUserType(req.user, ['owner', 'admin']);

        const [owners] = await pool.execute(
            `SELECT u.*, op.*
             FROM users u
             LEFT JOIN owner_profiles op ON u.id = op.user_id
             WHERE u.id = ? AND u.user_type = 'owner'`,
            [userId]
        );

        if (owners.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Owner profile not found"
            });
        }

        // Get vehicles count
        const [vehicles] = await pool.execute(
            "SELECT COUNT(*) as count FROM vehicles WHERE owner_id = ?",
            [userId]
        );

        // Get drivers count
        const [drivers] = await pool.execute(
            `SELECT COUNT(DISTINCT driver_id) as count 
             FROM vehicles 
             WHERE owner_id = ? AND driver_id IS NOT NULL`,
            [userId]
        );

        res.json({
            success: true,
            owner: {
                ...owners[0],
                total_vehicles: vehicles[0]?.count || 0,
                total_drivers: drivers[0]?.count || 0
            }
        });
    } catch (error) {
        console.error("Error fetching owner profile:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch owner profile",
            error: error.message
        });
    }
};

// Update owner profile
export const updateOwnerProfile = async (req, res) => {
    try {
        const userId = req.user.id;
        checkUserType(req.user, ['owner', 'admin']);
        const updateData = req.body;

        // Check if owner profile exists
        const [profiles] = await pool.execute(
            "SELECT * FROM owner_profiles WHERE user_id = ?",
            [userId]
        );

        if (profiles.length === 0) {
            // Create profile
            const allowedFields = [
                'business_name', 'business_registration_number', 'tax_number', 'business_type'
            ];
            const fields = [];
            const values = [];

            for (const field of allowedFields) {
                if (updateData[field] !== undefined) {
                    fields.push(field);
                    values.push(updateData[field]);
                }
            }

            if (fields.length > 0) {
                fields.push('user_id');
                values.push(userId);
                await pool.execute(
                    `INSERT INTO owner_profiles (${fields.join(', ')}) VALUES (${fields.map(() => '?').join(', ')})`,
                    values
                );
            }
        } else {
            // Update profile
            const allowedFields = [
                'business_name', 'business_registration_number', 'tax_number', 'business_type'
            ];
            const updates = [];
            const values = [];

            for (const field of allowedFields) {
                if (updateData[field] !== undefined) {
                    updates.push(`${field} = ?`);
                    values.push(updateData[field]);
                }
            }

            if (updates.length > 0) {
                values.push(userId);
                await pool.execute(
                    `UPDATE owner_profiles SET ${updates.join(', ')} WHERE user_id = ?`,
                    values
                );
            }
        }

        res.json({
            success: true,
            message: "Owner profile updated successfully"
        });
    } catch (error) {
        console.error("Error updating owner profile:", error);
        res.status(500).json({
            success: false,
            message: "Failed to update owner profile",
            error: error.message
        });
    }
};

// Get owner statistics
export const getOwnerStatistics = async (req, res) => {
    try {
        const userId = req.user.id;
        checkUserType(req.user, ['owner', 'admin']);

        // Get booking stats
        const [bookingStats] = await pool.execute(
            `SELECT 
                COUNT(*) as total_bookings,
                SUM(CASE WHEN booking_status = 'completed' THEN 1 ELSE 0 END) as completed,
                SUM(CASE WHEN booking_status = 'paid' THEN 1 ELSE 0 END) as paid,
                SUM(total_amount_paid) as total_revenue
             FROM bookings
             WHERE owner_id = ?`,
            [userId]
        );

        // Get vehicle stats
        const [vehicleStats] = await pool.execute(
            `SELECT 
                COUNT(*) as total_vehicles,
                SUM(CASE WHEN vehicle_status = 'active' THEN 1 ELSE 0 END) as active_vehicles
             FROM vehicles
             WHERE owner_id = ?`,
            [userId]
        );

        // Get driver count
        const [driverCount] = await pool.execute(
            `SELECT COUNT(DISTINCT driver_id) as count 
             FROM vehicles 
             WHERE owner_id = ? AND driver_id IS NOT NULL`,
            [userId]
        );

        res.json({
            success: true,
            statistics: {
                ...bookingStats[0],
                ...vehicleStats[0],
                total_drivers: driverCount[0]?.count || 0
            }
        });
    } catch (error) {
        console.error("Error fetching owner statistics:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch statistics",
            error: error.message
        });
    }
};

// Get owner revenue
export const getOwnerRevenue = async (req, res) => {
    try {
        const userId = req.user.id;
        checkUserType(req.user, ['owner', 'admin']);

        const { start_date, end_date, limit = 50, offset = 0 } = req.query;

        let query = `
            SELECT rt.*, b.booking_reference, b.scheduled_pickup
            FROM revenue_transactions rt
            LEFT JOIN bookings b ON rt.booking_id = b.id
            WHERE rt.owner_id = ?
        `;
        const params = [userId];

        if (start_date) {
            query += ` AND rt.created_at >= ?`;
            params.push(start_date);
        }

        if (end_date) {
            query += ` AND rt.created_at <= ?`;
            params.push(end_date);
        }

        query += ` ORDER BY rt.created_at DESC LIMIT ? OFFSET ?`;
        params.push(parseInt(limit), parseInt(offset));

        const [transactions] = await pool.execute(query, params);

        // Get summary
        const [summary] = await pool.execute(
            `SELECT 
                SUM(owner_amount) as total_earnings,
                SUM(platform_commission) as total_commission,
                COUNT(*) as total_transactions
             FROM revenue_transactions
             WHERE owner_id = ? AND status = 'processed'`,
            [userId]
        );

        res.json({
            success: true,
            transactions,
            summary: summary[0] || { total_earnings: 0, total_commission: 0, total_transactions: 0 }
        });
    } catch (error) {
        console.error("Error fetching owner revenue:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch revenue",
            error: error.message
        });
    }
};

// ============================================
// ADMIN ROUTES
// ============================================

// Get all owners
export const getAllOwners = async (req, res) => {
    try {
        checkUserType(req.user, ['admin']);

        const { status, limit = 100, offset = 0 } = req.query;

        let query = `
            SELECT u.*, op.*,
                   (SELECT COUNT(*) FROM vehicles WHERE owner_id = u.id) as vehicle_count
            FROM users u
            LEFT JOIN owner_profiles op ON u.id = op.user_id
            WHERE u.user_type = 'owner'
        `;
        const params = [];

        if (status) {
            query += ` AND op.status = ?`;
            params.push(status);
        }

        query += ` ORDER BY u.created_at DESC LIMIT ? OFFSET ?`;
        params.push(parseInt(limit), parseInt(offset));

        const [owners] = await pool.execute(query, params);

        res.json({
            success: true,
            owners
        });
    } catch (error) {
        console.error("Error fetching all owners:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch owners",
            error: error.message
        });
    }
};

// Verify owner
export const verifyOwner = async (req, res) => {
    try {
        checkUserType(req.user, ['admin']);
        const { ownerId } = req.params;
        const { verification_status, verification_notes } = req.body;

        if (!verification_status) {
            return res.status(400).json({
                success: false,
                message: "verification_status is required"
            });
        }

        await pool.execute(
            `UPDATE owner_profiles 
             SET verification_status = ?, verification_notes = ?
             WHERE user_id = ?`,
            [verification_status, verification_notes || null, ownerId]
        );

        res.json({
            success: true,
            message: "Owner verification updated successfully"
        });
    } catch (error) {
        console.error("Error verifying owner:", error);
        res.status(500).json({
            success: false,
            message: "Failed to verify owner",
            error: error.message
        });
    }
};

// Update owner status
export const updateOwnerStatus = async (req, res) => {
    try {
        checkUserType(req.user, ['admin']);
        const { ownerId } = req.params;
        const { status } = req.body;

        if (!status) {
            return res.status(400).json({
                success: false,
                message: "status is required"
            });
        }

        await pool.execute(
            "UPDATE owner_profiles SET status = ? WHERE user_id = ?",
            [status, ownerId]
        );

        res.json({
            success: true,
            message: "Owner status updated successfully"
        });
    } catch (error) {
        console.error("Error updating owner status:", error);
        res.status(500).json({
            success: false,
            message: "Failed to update owner status",
            error: error.message
        });
    }
};

export default {
    getOwnerProfile,
    updateOwnerProfile,
    getOwnerStatistics,
    getOwnerRevenue,
    getAllOwners,
    verifyOwner,
    updateOwnerStatus
};

