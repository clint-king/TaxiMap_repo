import pool from "../config/db.js";

const checkUserType = (user, allowedTypes) => {
    if (!allowedTypes.includes(user.user_type)) {
        throw new Error(`Access denied. Required user type: ${allowedTypes.join(' or ')}`);
    }
};

// ============================================
// DRIVER ROUTES
// ============================================

// Get driver profile
export const getDriverProfile = async (req, res) => {
    try {
        const userId = req.user.id;
        checkUserType(req.user, ['driver', 'admin']);

        const [drivers] = await pool.execute(
            `SELECT u.*, dp.*
             FROM users u
             LEFT JOIN driver_profiles dp ON u.id = dp.user_id
             WHERE u.id = ? AND u.user_type = 'driver'`,
            [userId]
        );

        if (drivers.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Driver profile not found"
            });
        }

        // Get assigned vehicles
        const [vehicles] = await pool.execute(
            `SELECT v.*, er.route_name
             FROM vehicles v
             LEFT JOIN existing_routes er ON v.existing_route_id = er.id
             WHERE v.driver_id = ? AND v.vehicle_status = 'active'`,
            [userId]
        );

        // Get documents
        const [documents] = await pool.execute(
            "SELECT * FROM driver_documents WHERE driver_id = ? ORDER BY created_at DESC",
            [userId]
        );

        // Get ratings
        const [ratings] = await pool.execute(
            `SELECT AVG(rating) as avg_rating, COUNT(*) as total_ratings
             FROM booking_ratings
             WHERE rated_type = 'driver' AND rated_user_id = ?`,
            [userId]
        );

        res.json({
            success: true,
            driver: {
                ...drivers[0],
                vehicles,
                documents,
                rating: ratings[0]?.avg_rating || 0,
                total_ratings: ratings[0]?.total_ratings || 0
            }
        });
    } catch (error) {
        console.error("Error fetching driver profile:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch driver profile",
            error: error.message
        });
    }
};

// Update driver profile
export const updateDriverProfile = async (req, res) => {
    try {
        const userId = req.user.id;
        checkUserType(req.user, ['driver', 'admin']);
        const updateData = req.body;

        // Check if driver profile exists
        const [profiles] = await pool.execute(
            "SELECT * FROM driver_profiles WHERE user_id = ?",
            [userId]
        );

        if (profiles.length === 0) {
            // Create profile
            const allowedFields = ['license_number', 'license_expiry', 'id_number'];
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
                    `INSERT INTO driver_profiles (${fields.join(', ')}) VALUES (${fields.map(() => '?').join(', ')})`,
                    values
                );
            }
        } else {
            // Update profile
            const allowedFields = ['license_number', 'license_expiry', 'id_number'];
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
                    `UPDATE driver_profiles SET ${updates.join(', ')} WHERE user_id = ?`,
                    values
                );
            }
        }

        res.json({
            success: true,
            message: "Driver profile updated successfully"
        });
    } catch (error) {
        console.error("Error updating driver profile:", error);
        res.status(500).json({
            success: false,
            message: "Failed to update driver profile",
            error: error.message
        });
    }
};

// Get driver documents
export const getDriverDocuments = async (req, res) => {
    try {
        const userId = req.user.id;
        checkUserType(req.user, ['driver', 'admin']);

        // If admin, allow getting documents for any driver via query param
        let driverId = userId;
        if (req.user.user_type === 'admin' && req.query.driverId) {
            driverId = req.query.driverId;
        }

        const [documents] = await pool.execute(
            "SELECT * FROM driver_documents WHERE driver_id = ? ORDER BY created_at DESC",
            [driverId]
        );

        res.json({
            success: true,
            documents
        });
    } catch (error) {
        console.error("Error fetching driver documents:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch documents",
            error: error.message
        });
    }
};

// Upload driver document
export const uploadDriverDocument = async (req, res) => {
    try {
        const userId = req.user.id;
        checkUserType(req.user, ['driver', 'admin']);

        const {
            document_type,
            reference_number,
            image_url,
            expiry_date,
            issue_date,
            issuing_authority
        } = req.body;

        if (!document_type || !image_url) {
            return res.status(400).json({
                success: false,
                message: "document_type and image_url are required"
            });
        }

        const [result] = await pool.execute(
            `INSERT INTO driver_documents (
                driver_id, document_type, reference_number, image_url,
                expiry_date, issue_date, issuing_authority, status
            ) VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')`,
            [
                userId, document_type, reference_number || null, image_url,
                expiry_date || null, issue_date || null, issuing_authority || null
            ]
        );

        res.status(201).json({
            success: true,
            message: "Document uploaded successfully",
            document: {
                id: result.insertId
            }
        });
    } catch (error) {
        console.error("Error uploading document:", error);
        res.status(500).json({
            success: false,
            message: "Failed to upload document",
            error: error.message
        });
    }
};

// Delete driver document
export const deleteDriverDocument = async (req, res) => {
    try {
        const userId = req.user.id;
        checkUserType(req.user, ['driver', 'admin']);
        const { documentId } = req.params;

        await pool.execute(
            "DELETE FROM driver_documents WHERE id = ? AND driver_id = ?",
            [documentId, userId]
        );

        res.json({
            success: true,
            message: "Document deleted successfully"
        });
    } catch (error) {
        console.error("Error deleting document:", error);
        res.status(500).json({
            success: false,
            message: "Failed to delete document",
            error: error.message
        });
    }
};

// Get driver statistics
export const getDriverStatistics = async (req, res) => {
    try {
        const userId = req.user.id;
        checkUserType(req.user, ['driver', 'admin']);

        // Get booking stats
        const [bookingStats] = await pool.execute(
            `SELECT 
                COUNT(*) as total_bookings,
                SUM(CASE WHEN booking_status = 'completed' THEN 1 ELSE 0 END) as completed,
                SUM(CASE WHEN booking_status = 'paid' THEN 1 ELSE 0 END) as paid,
                SUM(total_amount_paid) as total_earnings
             FROM bookings
             WHERE driver_id = ?`,
            [userId]
        );

        // Get rating stats
        const [ratingStats] = await pool.execute(
            `SELECT AVG(rating) as avg_rating, COUNT(*) as total_ratings
             FROM booking_ratings
             WHERE rated_type = 'driver' AND rated_user_id = ?`,
            [userId]
        );

        // Get assigned vehicles
        const [vehicles] = await pool.execute(
            "SELECT COUNT(*) as count FROM vehicles WHERE driver_id = ? AND vehicle_status = 'active'",
            [userId]
        );

        res.json({
            success: true,
            statistics: {
                ...bookingStats[0],
                avg_rating: ratingStats[0]?.avg_rating || 0,
                total_ratings: ratingStats[0]?.total_ratings || 0,
                assigned_vehicles: vehicles[0]?.count || 0
            }
        });
    } catch (error) {
        console.error("Error fetching driver statistics:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch statistics",
            error: error.message
        });
    }
};

// ============================================
// OWNER ROUTES
// ============================================

// Get owner's drivers
export const getOwnerDrivers = async (req, res) => {
    try {
        const userId = req.user.id;
        checkUserType(req.user, ['owner', 'admin']);

        const [drivers] = await pool.execute(
            `SELECT DISTINCT u.*, dp.license_number, dp.license_expiry,
                    (SELECT COUNT(*) FROM vehicles WHERE driver_id = u.id AND owner_id = ?) as vehicle_count
             FROM users u
             LEFT JOIN driver_profiles dp ON u.id = dp.user_id
             INNER JOIN vehicles v ON v.driver_id = u.id
             WHERE v.owner_id = ? AND u.user_type = 'driver'
             ORDER BY u.name`,
            [userId, userId]
        );

        res.json({
            success: true,
            drivers
        });
    } catch (error) {
        console.error("Error fetching owner drivers:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch drivers",
            error: error.message
        });
    }
};

// ============================================
// ADMIN ROUTES
// ============================================

// Get all drivers
export const getAllDrivers = async (req, res) => {
    try {
        checkUserType(req.user, ['admin']);

        const { status, limit = 100, offset = 0 } = req.query;

        let query = `
            SELECT u.*, dp.*,
                   (SELECT COUNT(*) FROM vehicles WHERE driver_id = u.id) as vehicle_count
            FROM users u
            LEFT JOIN driver_profiles dp ON u.id = dp.user_id
            WHERE u.user_type = 'driver'
        `;
        const params = [];

        if (status) {
            query += ` AND dp.status = ?`;
            params.push(status);
        }

        query += ` ORDER BY u.created_at DESC LIMIT ? OFFSET ?`;
        params.push(parseInt(limit), parseInt(offset));

        const [drivers] = await pool.execute(query, params);

        res.json({
            success: true,
            drivers
        });
    } catch (error) {
        console.error("Error fetching all drivers:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch drivers",
            error: error.message
        });
    }
};

// Verify driver
export const verifyDriver = async (req, res) => {
    try {
        checkUserType(req.user, ['admin']);
        const { driverId } = req.params;
        const { verification_status, verification_notes } = req.body;

        if (!verification_status) {
            return res.status(400).json({
                success: false,
                message: "verification_status is required"
            });
        }

        await pool.execute(
            `UPDATE driver_profiles 
             SET verification_status = ?, verification_notes = ?, verified_at = NOW()
             WHERE user_id = ?`,
            [verification_status, verification_notes || null, driverId]
        );

        res.json({
            success: true,
            message: "Driver verification updated successfully"
        });
    } catch (error) {
        console.error("Error verifying driver:", error);
        res.status(500).json({
            success: false,
            message: "Failed to verify driver",
            error: error.message
        });
    }
};

// Update driver status
export const updateDriverStatus = async (req, res) => {
    try {
        checkUserType(req.user, ['admin']);
        const { driverId } = req.params;
        const { status } = req.body;

        if (!status) {
            return res.status(400).json({
                success: false,
                message: "status is required"
            });
        }

        await pool.execute(
            "UPDATE driver_profiles SET status = ? WHERE user_id = ?",
            [status, driverId]
        );

        res.json({
            success: true,
            message: "Driver status updated successfully"
        });
    } catch (error) {
        console.error("Error updating driver status:", error);
        res.status(500).json({
            success: false,
            message: "Failed to update driver status",
            error: error.message
        });
    }
};

export default {
    getDriverProfile,
    updateDriverProfile,
    getDriverDocuments,
    uploadDriverDocument,
    deleteDriverDocument,
    getDriverStatistics,
    getOwnerDrivers,
    getAllDrivers,
    verifyDriver,
    updateDriverStatus
};

