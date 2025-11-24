import pool from "../config/db.js";
import bcrypt from 'bcrypt';

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
            `SELECT u.*, dp.*,
                    u_owner.ID as owner_user_id, u_owner.name as owner_name, u_owner.email as owner_email
             FROM users u
             LEFT JOIN driver_profiles dp ON u.ID = dp.user_id
             LEFT JOIN users u_owner ON dp.owner_id = u_owner.ID
             WHERE u.ID = ? AND u.user_type = 'driver'`,
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
             LEFT JOIN existing_routes er ON v.existing_route_id = er.ID
             WHERE v.driver_id = ? AND v.vehicle_status = 'active'`,
            [userId]
        );

        // Get documents - join through driver_profiles to use driver_profiles.ID
        const [documents] = await pool.execute(
            `SELECT dd.* 
             FROM driver_documents dd
             INNER JOIN driver_profiles dp ON dd.driver_id = dp.ID
             WHERE dp.user_id = ? 
             ORDER BY dd.created_at DESC`,
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
        let targetUserId = userId;
        if (req.user.user_type === 'admin' && req.query.driverId) {
            targetUserId = req.query.driverId;
        }

        // Get documents - join through driver_profiles to use driver_profiles.ID
        const [documents] = await pool.execute(
            `SELECT dd.* 
             FROM driver_documents dd
             INNER JOIN driver_profiles dp ON dd.driver_id = dp.ID
             WHERE dp.user_id = ? 
             ORDER BY dd.created_at DESC`,
            [targetUserId]
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

        // Get driver_profiles.ID from user_id
        const [driverProfiles] = await pool.execute(
            "SELECT ID FROM driver_profiles WHERE user_id = ?",
            [userId]
        );

        if (driverProfiles.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Driver profile not found"
            });
        }

        const driverProfileId = driverProfiles[0].ID;

        const [result] = await pool.execute(
            `INSERT INTO driver_documents (
                driver_id, document_type, reference_number, image_url,
                expiry_date, issue_date, issuing_authority, status
            ) VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')`,
            [
                driverProfileId, document_type, reference_number || null, image_url,
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

        // Get driver_profiles.ID from user_id
        const [driverProfiles] = await pool.execute(
            "SELECT ID FROM driver_profiles WHERE user_id = ?",
            [userId]
        );

        if (driverProfiles.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Driver profile not found"
            });
        }

        const driverProfileId = driverProfiles[0].ID;

        await pool.execute(
            "DELETE FROM driver_documents WHERE id = ? AND driver_id = ?",
            [documentId, driverProfileId]
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

// Create driver (owner creates driver account and profile)
export const createDriver = async (req, res) => {
    try {
        const ownerId = req.user.id;
        checkUserType(req.user, ['owner', 'admin']);

        const {
            firstName,
            surname,
            email,
            password,
            phone,
            address,
            id_number,
            license_number,
            license_expiry,
            license_photo,
            photo
        } = req.body;

        // Validate required fields
        if (!firstName || !surname || !email || !password || !phone || !address || 
            !id_number || !license_number || !license_expiry) {
            return res.status(400).json({
                success: false,
                message: "Missing required fields: firstName, surname, email, password, phone, address, id_number, license_number, license_expiry"
            });
        }

        // Validate password length
        if (password.length < 6) {
            return res.status(400).json({
                success: false,
                message: "Password must be at least 6 characters long"
            });
        }

        // Check if email already exists
        const [existingUsers] = await pool.execute(
            "SELECT ID FROM users WHERE email = ?",
            [email]
        );

        if (existingUsers.length > 0) {
            return res.status(400).json({
                success: false,
                message: "Email already exists"
            });
        }

        // Check if ID number already exists in driver_profiles
        const [existingIdNumbers] = await pool.execute(
            "SELECT user_id FROM driver_profiles WHERE id_number = ?",
            [id_number]
        );

        if (existingIdNumbers.length > 0) {
            return res.status(400).json({
                success: false,
                message: "ID number already registered"
            });
        }

        // Check if license number already exists
        const [existingLicenses] = await pool.execute(
            "SELECT user_id FROM driver_profiles WHERE license_number = ?",
            [license_number]
        );

        if (existingLicenses.length > 0) {
            return res.status(400).json({
                success: false,
                message: "License number already registered"
            });
        }

        // Get a connection for transaction
        const connection = await pool.getConnection();

        try {
            // Start transaction
            await connection.beginTransaction();

            // Hash password
            const hashedPassword = await bcrypt.hash(password, 10);

            // Create user account
            const fullName = `${firstName} ${surname}`.trim();
            const [userResult] = await connection.execute(
                `INSERT INTO users (
                    name, email, password, user_type, phone, location,
                    email_verified, verification_token, profile_picture
                ) VALUES (?, ?, ?, 'driver', ?, ?, true, NULL, ?)`,
                [fullName, email, hashedPassword, phone, address, photo || null]
            );

            const userId = userResult.insertId;
            const ownerUserId = req.user.id; // Owner creating this driver

            // Get owner_profiles.ID from user_id
            const [ownerProfiles] = await connection.execute(
                "SELECT ID FROM owner_profiles WHERE user_id = ?",
                [ownerUserId]
            );

            if (ownerProfiles.length === 0) {
                await connection.rollback();
                connection.release();
                return res.status(400).json({
                    success: false,
                    message: "Owner profile not found"
                });
            }

            const ownerProfileId = ownerProfiles[0].ID;

            // Create driver profile (with owner_id from owner_profiles.ID)
            const [profileResult] = await connection.execute(
                `INSERT INTO driver_profiles (
                    user_id, owner_id, license_number, license_expiry, id_number,
                    status, verification_status
                ) VALUES (?, ?, ?, ?, ?, 'pending', 'pending')`,
                [userId, ownerProfileId, license_number, license_expiry, id_number]
            );

            const driverProfileId = profileResult.insertId;

            // If license photo is provided, create a document record
            // Use driver_profiles.ID instead of users.ID
            if (license_photo) {
                await connection.execute(
                    `INSERT INTO driver_documents (
                        driver_id, document_type, image_url, status
                    ) VALUES (?, 'license', ?, 'pending')`,
                    [driverProfileId, license_photo]
                );
            }

            // Commit transaction
            await connection.commit();

            res.status(201).json({
                success: true,
                message: "Driver created successfully",
                driver: {
                    user_id: userId,
                    name: fullName,
                    email,
                    license_number,
                    status: 'pending',
                    verification_status: 'pending'
                }
            });
        } catch (error) {
            // Rollback transaction on error
            await connection.rollback();
            throw error;
        } finally {
            // Always release the connection
            connection.release();
        }
    } catch (error) {
        console.error("Error creating driver:", error);
        res.status(500).json({
            success: false,
            message: "Failed to create driver",
            error: error.message
        });
    }
};

// Get available drivers for assignment (verified and active, without vehicle)
export const getAvailableDriversForAssignment = async (req, res) => {
    try {
        const userId = req.user.id;
        checkUserType(req.user, ['owner']);

        // Get owner's drivers that are:
        // 1. Verified by admin (verification_status = 'verified')
        // 2. Active (status = 'active')
        // 3. Don't have a vehicle assigned (not in vehicles table with driver_id)
        const [drivers] = await pool.execute(
            `SELECT u.ID, u.name, u.email, u.phone, dp.license_number, dp.license_expiry
             FROM users u
             INNER JOIN driver_profiles dp ON u.ID = dp.user_id
             LEFT JOIN vehicles v ON u.ID = v.driver_id AND v.vehicle_status = 'active'
             WHERE dp.owner_id = ? 
               AND u.user_type = 'driver'
               AND dp.verification_status = 'verified'
               AND dp.status = 'active'
               AND v.ID IS NULL
             ORDER BY u.name`,
            [userId]
        );

        res.json({
            success: true,
            drivers
        });
    } catch (error) {
        console.error("Error fetching available drivers:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch available drivers",
            error: error.message
        });
    }
};

// Get owner's drivers
export const getOwnerDrivers = async (req, res) => {
    try {
        const userId = req.user.id;
        checkUserType(req.user, ['owner', 'admin']);

        // For admin, allow querying any owner's drivers via query param
        const ownerId = req.user.user_type === 'admin' && req.query.owner_id 
            ? parseInt(req.query.owner_id) 
            : userId;

        console.log(`[getOwnerDrivers] Fetching drivers for owner_id: ${ownerId} (user_id: ${userId}, user_type: ${req.user.user_type})`);

        const [drivers] = await pool.execute(
            `SELECT u.*, dp.ID as driver_profile_id, dp.license_number, dp.license_expiry, dp.id_number,
                    dp.status, dp.verification_status, dp.created_at as driver_since,
                    (SELECT COUNT(*) FROM vehicles WHERE driver_id = u.ID) as vehicle_count
             FROM users u
             INNER JOIN driver_profiles dp ON u.ID = dp.user_id
             WHERE dp.owner_id = ? AND u.user_type = 'driver'
             ORDER BY u.name`,
            [ownerId]
        );

        console.log(`[getOwnerDrivers] Found ${drivers.length} drivers for owner_id: ${ownerId}`);

        // If no drivers found, check if there are any drivers without owner_id
        if (drivers.length === 0) {
            const [allDrivers] = await pool.execute(
                `SELECT COUNT(*) as count FROM driver_profiles WHERE owner_id IS NULL OR owner_id != ?`,
                [ownerId]
            );
            console.log(`[getOwnerDrivers] Drivers without matching owner_id: ${allDrivers[0]?.count || 0}`);
        }

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

        // Validate and parse limit and offset
        const limitValue = Math.max(1, Math.min(parseInt(limit) || 100, 1000)); // Between 1 and 1000
        const offsetValue = Math.max(0, parseInt(offset) || 0); // At least 0

        let query = `
            SELECT u.*, dp.*,
                   u_owner.ID as owner_user_id, u_owner.name as owner_name, u_owner.email as owner_email,
                   (SELECT COUNT(*) FROM vehicles WHERE driver_id = u.ID) as vehicle_count
            FROM users u
            LEFT JOIN driver_profiles dp ON u.ID = dp.user_id
            LEFT JOIN users u_owner ON dp.owner_id = u_owner.ID
            WHERE u.user_type = 'driver'
        `;
        const params = [];

        if (status) {
            query += ` AND dp.status = ?`;
            params.push(status);
        }

        // Use template literals for LIMIT and OFFSET since they're validated integers
        // MySQL2 prepared statements don't support parameterized LIMIT/OFFSET
        query += ` ORDER BY u.created_at DESC LIMIT ${limitValue} OFFSET ${offsetValue}`;

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

// Get driver details (admin endpoint)
export const getDriverDetails = async (req, res) => {
    try {
        console.log('getDriverDetails called with driverId:', req.params.driverId);
        checkUserType(req.user, ['admin']);
        const { driverId } = req.params;

        // Get driver by driver_profiles.ID (driverId is the driver_profiles.ID, not users.ID)
        // Note: driver_profiles.owner_id references owner_profiles.ID (not users.ID)
        console.log('Querying database for driver profile with ID:', driverId);
        // We need to get the driver profile first, then join to users table
        const [drivers] = await pool.execute(
            `SELECT u.*, dp.*,
                    u_owner.ID as owner_user_id, u_owner.name as owner_name, u_owner.email as owner_email,
                    op.ID as owner_profile_id
             FROM driver_profiles dp
             INNER JOIN users u ON dp.user_id = u.ID
             LEFT JOIN owner_profiles op ON dp.owner_id = op.ID
             LEFT JOIN users u_owner ON op.user_id = u_owner.ID
             WHERE dp.ID = ? AND u.user_type = 'driver'`,
            [driverId]
        );

        console.log('Query result - drivers found:', drivers.length);
        if (drivers.length === 0) {
            console.log('No driver found with ID:', driverId);
            return res.status(404).json({
                success: false,
                message: "Driver not found"
            });
        }

        const driver = drivers[0];
        const driverUserId = driver.user_id; // Get the user_id from driver_profiles

        // Get assigned vehicles
        // v.driver_id references users.ID, so use driver.user_id
        const [vehicles] = await pool.execute(
            `SELECT v.*, er.route_name
             FROM vehicles v
             LEFT JOIN existing_routes er ON v.existing_route_id = er.ID
             WHERE v.driver_id = ? AND v.vehicle_status = 'active'`,
            [driverUserId]
        );

        // Get documents - driver_documents.driver_id references driver_profiles.ID
        const [documents] = await pool.execute(
            `SELECT dd.* 
             FROM driver_documents dd
             WHERE dd.driver_id = ? 
             ORDER BY dd.created_at DESC`,
            [driverId]
        );

        // Get ratings - rated_user_id references users.ID, so use driver.user_id
        const [ratings] = await pool.execute(
            `SELECT AVG(rating) as avg_rating, COUNT(*) as total_ratings
             FROM booking_ratings
             WHERE rated_type = 'driver' AND rated_user_id = ?`,
            [driverUserId]
        );

        res.json({
            success: true,
            driver: {
                ...driver,
                vehicles,
                documents,
                rating: ratings[0]?.avg_rating || 0,
                total_ratings: ratings[0]?.total_ratings || 0
            }
        });
    } catch (error) {
        console.error("Error fetching driver details:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch driver details",
            error: error.message
        });
    }
};

// Verify driver
// Note: driverId is driver_profiles.ID, not users.ID
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

        console.log('Verifying driver with driver_profiles.ID:', driverId);

        const [result] = await pool.execute(
            `UPDATE driver_profiles 
             SET verification_status = ?, verification_notes = ?, verified_at = NOW()
             WHERE ID = ?`,
            [verification_status, verification_notes || null, driverId]
        );

        console.log('Update result:', result.affectedRows, 'rows affected');

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: "Driver not found"
            });
        }

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
// Note: driverId is driver_profiles.ID, not users.ID
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

        console.log('Updating driver status with driver_profiles.ID:', driverId);

        const [result] = await pool.execute(
            "UPDATE driver_profiles SET status = ? WHERE ID = ?",
            [status, driverId]
        );

        console.log('Update result:', result.affectedRows, 'rows affected');

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: "Driver not found"
            });
        }

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

// Update driver status by owner (only if driver is verified)
// Note: driverId is driver_profiles.ID, not users.ID
export const updateDriverStatusByOwner = async (req, res) => {
    try {
        checkUserType(req.user, ['owner']);
        const { driverId } = req.params;
        const { status } = req.body;
        const ownerUserId = req.user.id;

        if (!status || !['active', 'inactive'].includes(status)) {
            return res.status(400).json({
                success: false,
                message: "status is required and must be 'active' or 'inactive'"
            });
        }

        console.log('Owner updating driver status:', { driverId, status, ownerUserId });

        // First, verify that the driver belongs to this owner and is verified
        // Note: driver_profiles.owner_id references users(ID) directly
        const [driver] = await pool.execute(
            `SELECT dp.ID, dp.verification_status, dp.owner_id, dp.status
             FROM driver_profiles dp
             WHERE dp.ID = ?`,
            [driverId]
        );

        if (driver.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Driver not found"
            });
        }

        const driverData = driver[0];

        // Check if driver belongs to this owner
        if (driverData.owner_id !== ownerUserId) {
            return res.status(403).json({
                success: false,
                message: "You do not have permission to update this driver's status"
            });
        }

        // Check if driver is verified by admin
        if (driverData.verification_status !== 'verified') {
            return res.status(400).json({
                success: false,
                message: "Driver must be verified by admin before status can be changed. Current verification status: " + driverData.verification_status
            });
        }

        // Update status
        const [result] = await pool.execute(
            "UPDATE driver_profiles SET status = ? WHERE ID = ?",
            [status, driverId]
        );

        console.log('Update result:', result.affectedRows, 'rows affected');

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: "Driver not found"
            });
        }

        res.json({
            success: true,
            message: "Driver status updated successfully"
        });
    } catch (error) {
        console.error("Error updating driver status by owner:", error);
        res.status(500).json({
            success: false,
            message: "Failed to update driver status",
            error: error.message
        });
    }
};

// Export all driver controller functions
const driverController = {
    getDriverProfile,
    updateDriverProfile,
    getDriverDocuments,
    uploadDriverDocument,
    deleteDriverDocument,
    getDriverStatistics,
    createDriver,
    getOwnerDrivers,
    getAllDrivers,
    getDriverDetails,
    verifyDriver,
    updateDriverStatus,
    updateDriverStatusByOwner,
    getAvailableDriversForAssignment
};

export default driverController;

