import pool from "../config/db.js";

const checkUserType = (user, allowedTypes) => {
    if (!allowedTypes.includes(user.user_type)) {
        throw new Error(`Access denied. Required user type: ${allowedTypes.join(' or ')}`);
    }
};

// ============================================
// OWNER ROUTES
// ============================================

// Create vehicle
export const createVehicle = async (req, res) => {
    try {
        const userId = req.user.id;
        checkUserType(req.user, ['owner', 'admin']);

        const {
            owner_id, // Admin can specify owner_id, otherwise uses logged-in user
            existing_route_id,
            registration_number,
            license_plate,
            make,
            model,
            color,
            capacity,
            extraspace_parcel_sp,
            vehicle_type,
            route_types,
            direction_type,
            description,
            images,
            videos,
            features
        } = req.body;

        // Determine owner_id: admin can specify, otherwise use logged-in user
        const finalOwnerId = req.user.user_type === 'admin' && owner_id ? owner_id : userId;

        // Validate required fields
        if (!registration_number || !license_plate || !make || !model || !vehicle_type || !capacity) {
            return res.status(400).json({
                success: false,
                message: "Missing required fields: registration_number, license_plate, make, model, vehicle_type, capacity"
            });
        }

        // Validate capacity range
        if (capacity < 10 || capacity > 22) {
            return res.status(400).json({
                success: false,
                message: "Capacity must be between 10 and 22"
            });
        }

        // Parse and validate extraspace_parcel_sp
        // Default to 12 if not provided, null, 0, or invalid
        let finalExtraspaceParcelSp = 12; // Default value
        if (extraspace_parcel_sp !== undefined && extraspace_parcel_sp !== null && extraspace_parcel_sp !== '') {
            // Parse to integer
            const parsedValue = parseInt(extraspace_parcel_sp, 10);
            if (!isNaN(parsedValue) && parsedValue > 0) {
                // Validate range
                if (parsedValue < 4 || parsedValue > 16) {
                    return res.status(400).json({
                        success: false,
                        message: "extraspace_parcel_sp must be between 4 and 16"
                    });
                }
                // Validate multiple of 4
                if (parsedValue % 4 !== 0) {
                    return res.status(400).json({
                        success: false,
                        message: "extraspace_parcel_sp must be a multiple of 4"
                    });
                }
                finalExtraspaceParcelSp = parsedValue;
            }
        }

        // Validate route_types
        let routeTypesValue = 'long-distance'; // Default
        if (route_types) {
            if (Array.isArray(route_types)) {
                // Convert array to SET format (comma-separated string)
                const validTypes = route_types.filter(rt => ['custom', 'long-distance'].includes(rt));
                routeTypesValue = validTypes.length > 0 ? validTypes.join(',') : 'long-distance';
            } else if (typeof route_types === 'string') {
                routeTypesValue = route_types;
            }
        }

        // Validate direction_type
        let directionTypeValue = 'from_loc1,from_loc2'; // Default: both directions
        if (direction_type) {
            if (Array.isArray(direction_type)) {
                // Convert array to SET format (comma-separated string)
                const validDirections = direction_type.filter(d => ['from_loc1', 'from_loc2'].includes(d));
                directionTypeValue = validDirections.length > 0 ? validDirections.join(',') : 'from_loc1,from_loc2';
            } else if (typeof direction_type === 'string') {
                // Validate string format
                const directions = direction_type.split(',').map(d => d.trim());
                const validDirections = directions.filter(d => ['from_loc1', 'from_loc2'].includes(d));
                directionTypeValue = validDirections.length > 0 ? validDirections.join(',') : 'from_loc1,from_loc2';
            }
        }

        // Check if registration number already exists
        const [existing] = await pool.execute(
            "SELECT ID FROM vehicles WHERE registration_number = ?",
            [registration_number]
        );

        if (existing.length > 0) {
            return res.status(400).json({
                success: false,
                message: "Vehicle with this registration number already exists"
            });
        }

        // Verify owner exists and get owner_profiles.ID
        const [ownerProfiles] = await pool.execute(
            `SELECT op.ID 
             FROM owner_profiles op
             INNER JOIN users u ON op.user_id = u.ID
             WHERE u.ID = ? AND u.user_type = 'owner'`,
            [finalOwnerId]
        );
        
        if (ownerProfiles.length === 0) {
            return res.status(400).json({
                success: false,
                message: "Owner profile not found or user is not an owner"
            });
        }

        const ownerProfileId = ownerProfiles[0].ID;

        // Insert vehicle
        // Note: route_types and direction_type are SET fields, so we pass comma-separated strings
        // vehicle_status defaults to 'inactive', admin_status defaults to 'pending'
        // Use owner_profiles.ID instead of users.ID
        const [result] = await pool.execute(
            `INSERT INTO vehicles (
                owner_id, existing_route_id, registration_number, license_plate,
                make, model, color, capacity, extraspace_parcel_sp, vehicle_type, route_types, direction_type,
                description, images, videos, features, vehicle_status, admin_status
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'inactive', 'pending')`,
            [
                ownerProfileId, existing_route_id || null, registration_number, license_plate,
                make, model, color || null, capacity, finalExtraspaceParcelSp, vehicle_type,
                routeTypesValue, directionTypeValue, description || null,
                JSON.stringify(images || []), JSON.stringify(videos || []),
                JSON.stringify(features || [])
            ]
        );

        // Update owner profile vehicle count
        await pool.execute(
            "UPDATE owner_profiles SET total_vehicles = total_vehicles + 1 WHERE ID = ?",
            [ownerProfileId]
        );

        res.status(201).json({
            success: true,
            message: "Vehicle created successfully",
            vehicle: {
                id: result.insertId,
                registration_number,
                admin_status: 'pending',
                vehicle_status: 'inactive'
            }
        });
    } catch (error) {
        console.error("Error creating vehicle:", error);
        res.status(500).json({
            success: false,
            message: "Failed to create vehicle",
            error: error.message
        });
    }
};

// Get owner's vehicles
export const getOwnerVehicles = async (req, res) => {
    try {
        const userId = req.user.id;
        checkUserType(req.user, ['owner', 'admin']);

        const { status } = req.query;
        
        // Ensure limit and offset are valid integers with defaults
        const limit = parseInt(req.query.limit) || 50;
        const offset = parseInt(req.query.offset) || 0;

        // Build query without driver information
        // Select specific columns to avoid loading large JSON fields during sort
        let query = `
            SELECT v.ID, v.owner_id, v.driver_id, v.existing_route_id,
                   v.registration_number, v.license_plate, v.make, v.model, v.color,
                   v.capacity, v.extraspace_parcel_sp, v.vehicle_type, v.vehicle_status,
                   v.admin_status, v.route_types, v.description,
                   v.images, v.videos, v.features,
                   v.created_at, v.updated_at,
                   er.route_name, er.location_1, er.location_2
            FROM vehicles v
            LEFT JOIN existing_routes er ON v.existing_route_id = er.ID
            WHERE v.owner_id = ?
        `;
        const params = [userId];

        if (status) {
            query += ` AND v.vehicle_status = ?`;
            params.push(status);
        }

        // Order by ID (which is auto-increment and correlates with created_at) to avoid sort memory issues
        // Alternatively, we could add an index on created_at, but using ID is more efficient
        query += ` ORDER BY v.ID DESC LIMIT ${limit} OFFSET ${offset}`;

        const [vehicles] = await pool.execute(query, params);

        // Parse JSON fields (MySQL2 may already parse JSON columns automatically)
        vehicles.forEach(vehicle => {
            // route_types is SET('custom', 'long-distance'), so it comes as comma-separated string
            // Convert to array for frontend consistency
            if (vehicle.route_types && typeof vehicle.route_types === 'string') {
                vehicle.route_types = vehicle.route_types.split(',').map(rt => rt.trim());
            } else if (!vehicle.route_types) {
                vehicle.route_types = [];
            }
            
            // Parse JSON fields only if they are strings (MySQL2 may already parse them as objects)
            if (vehicle.images) {
                if (typeof vehicle.images === 'string') {
                    try {
                        vehicle.images = JSON.parse(vehicle.images);
                    } catch (e) {
                        vehicle.images = [];
                    }
                } else if (!Array.isArray(vehicle.images)) {
                    vehicle.images = [];
                }
            } else {
                vehicle.images = [];
            }
            
            if (vehicle.videos) {
                if (typeof vehicle.videos === 'string') {
                    try {
                        vehicle.videos = JSON.parse(vehicle.videos);
                    } catch (e) {
                        vehicle.videos = [];
                    }
                } else if (!Array.isArray(vehicle.videos)) {
                    vehicle.videos = [];
                }
            } else {
                vehicle.videos = [];
            }
            
            if (vehicle.features) {
                if (typeof vehicle.features === 'string') {
                    try {
                        vehicle.features = JSON.parse(vehicle.features);
                    } catch (e) {
                        vehicle.features = [];
                    }
                } else if (!Array.isArray(vehicle.features)) {
                    vehicle.features = [];
                }
            } else {
                vehicle.features = [];
            }
        });

        res.json({
            success: true,
            vehicles
        });
    } catch (error) {
        console.error("Error fetching owner vehicles:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch vehicles",
            error: error.message
        });
    }
};

// Get vehicle details
export const getVehicleDetails = async (req, res) => {
    try {
        const { vehicleId } = req.params;

        const [vehicles] = await pool.execute(
            `SELECT v.*, 
                    u_owner.name as owner_name, u_owner.email as owner_email,
                    u_driver.name as driver_name, u_driver.email as driver_email,
                    er.route_name, er.location_1, er.location_2
             FROM vehicles v
             LEFT JOIN users u_owner ON v.owner_id = u_owner.ID
             LEFT JOIN users u_driver ON v.driver_id = u_driver.ID
             LEFT JOIN existing_routes er ON v.existing_route_id = er.ID
             WHERE v.ID = ?`,
            [vehicleId]
        );

        if (vehicles.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Vehicle not found"
            });
        }

        const vehicle = vehicles[0];

        // Check access (owner, driver, or admin)
        if (req.user && 
            vehicle.owner_id !== req.user.id && 
            vehicle.driver_id !== req.user.id && 
            req.user.user_type !== 'admin') {
            return res.status(403).json({
                success: false,
                message: "Access denied"
            });
        }

        // Parse route_types (SET type - comma-separated string, not JSON)
        if (vehicle.route_types && typeof vehicle.route_types === 'string') {
            vehicle.route_types = vehicle.route_types.split(',').map(rt => rt.trim());
        } else if (!vehicle.route_types) {
            vehicle.route_types = [];
        }
        
        // Parse JSON fields (MySQL2 may already parse JSON columns automatically)
        if (vehicle.images) {
            if (typeof vehicle.images === 'string') {
                try {
                    vehicle.images = JSON.parse(vehicle.images);
                } catch (e) {
                    console.error(`Error parsing images for vehicle ${vehicle.ID}:`, e);
                    vehicle.images = [];
                }
            } else if (!Array.isArray(vehicle.images)) {
                vehicle.images = [];
            }
        } else {
            vehicle.images = [];
        }
        
        if (vehicle.videos) {
            if (typeof vehicle.videos === 'string') {
                try {
                    vehicle.videos = JSON.parse(vehicle.videos);
                } catch (e) {
                    console.error(`Error parsing videos for vehicle ${vehicle.ID}:`, e);
                    vehicle.videos = [];
                }
            } else if (!Array.isArray(vehicle.videos)) {
                vehicle.videos = [];
            }
        } else {
            vehicle.videos = [];
        }
        
        if (vehicle.features) {
            if (typeof vehicle.features === 'string') {
                try {
                    vehicle.features = JSON.parse(vehicle.features);
                } catch (e) {
                    console.error(`Error parsing features for vehicle ${vehicle.ID}:`, e);
                    vehicle.features = [];
                }
            } else if (!Array.isArray(vehicle.features)) {
                vehicle.features = [];
            }
        } else {
            vehicle.features = [];
        }

        // Get documents
        const [documents] = await pool.execute(
            "SELECT * FROM vehicle_documents WHERE vehicle_id = ? ORDER BY created_at DESC",
            [vehicleId]
        );

        res.json({
            success: true,
            vehicle: {
                ...vehicle,
                documents
            }
        });
    } catch (error) {
        console.error("Error fetching vehicle details:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch vehicle details",
            error: error.message
        });
    }
};

// Update vehicle
export const updateVehicle = async (req, res) => {
    try {
        const userId = req.user.id;
        checkUserType(req.user, ['owner', 'admin']);
        const { vehicleId } = req.params;
        const updateData = req.body;

        // Get vehicle
        const [vehicles] = await pool.execute(
            "SELECT * FROM vehicles WHERE ID = ? AND owner_id = ?",
            [vehicleId, userId]
        );

        if (vehicles.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Vehicle not found or you don't own this vehicle"
            });
        }

        // Build update query
        const allowedFields = [
            'make', 'model', 'color', 'capacity', 'vehicle_type',
            'route_types', 'direction_type', 'description', 'images', 'videos', 'features',
            'existing_route_id', 'vehicle_status'
        ];
        const updates = [];
        const values = [];
        let vehicleStatusChanged = false;
        let newVehicleStatus = null;

        for (const field of allowedFields) {
            if (updateData[field] !== undefined) {
                updates.push(`${field} = ?`);
                if (['route_types', 'images', 'videos', 'features'].includes(field)) {
                    values.push(JSON.stringify(updateData[field]));
                } else if (field === 'direction_type') {
                    // Handle direction_type SET field
                    let directionTypeValue = 'from_loc1,from_loc2'; // Default
                    if (Array.isArray(updateData[field])) {
                        const validDirections = updateData[field].filter(d => ['from_loc1', 'from_loc2'].includes(d));
                        directionTypeValue = validDirections.length > 0 ? validDirections.join(',') : 'from_loc1,from_loc2';
                    } else if (typeof updateData[field] === 'string') {
                        const directions = updateData[field].split(',').map(d => d.trim());
                        const validDirections = directions.filter(d => ['from_loc1', 'from_loc2'].includes(d));
                        directionTypeValue = validDirections.length > 0 ? validDirections.join(',') : 'from_loc1,from_loc2';
                    }
                    values.push(directionTypeValue);
                } else {
                    values.push(updateData[field]);
                    // Track if vehicle_status is being changed
                    if (field === 'vehicle_status') {
                        vehicleStatusChanged = true;
                        newVehicleStatus = updateData[field];
                    }
                }
            }
        }

        if (updates.length === 0) {
            return res.status(400).json({
                success: false,
                message: "No valid fields to update"
            });
        }

        // Get a connection for transaction
        const connection = await pool.getConnection();

        try {
            // Start transaction
            await connection.beginTransaction();

            values.push(vehicleId);
            await connection.execute(
                `UPDATE vehicles SET ${updates.join(', ')} WHERE ID = ?`,
                values
            );

            // If vehicle status is set to 'inactive', remove from queue
            if (vehicleStatusChanged && newVehicleStatus === 'inactive') {
                await connection.execute(
                    "DELETE FROM vehicle_queue WHERE vehicle_id = ?",
                    [vehicleId]
                );
            }

            // Commit transaction
            await connection.commit();

            res.json({
                success: true,
                message: vehicleStatusChanged && newVehicleStatus === 'inactive'
                    ? "Vehicle updated successfully. Vehicle removed from queue (status set to inactive)."
                    : "Vehicle updated successfully"
            });
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release(); // Release the connection back to the pool
        }
    } catch (error) {
        console.error("Error updating vehicle:", error);
        res.status(500).json({
            success: false,
            message: "Failed to update vehicle",
            error: error.message
        });
    }
};

// Delete vehicle
export const deleteVehicle = async (req, res) => {
    try {
        const userId = req.user.id;
        checkUserType(req.user, ['owner', 'admin']);
        const { vehicleId } = req.params;

        // Get vehicle
        const [vehicles] = await pool.execute(
            "SELECT * FROM vehicles WHERE ID = ? AND owner_id = ?",
            [vehicleId, userId]
        );

        if (vehicles.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Vehicle not found or you don't own this vehicle"
            });
        }

        // Check if vehicle has active bookings
        const [bookings] = await pool.execute(
            `SELECT COUNT(*) as count FROM bookings 
             WHERE vehicle_id = ? AND booking_status IN ('pending', 'confirmed', 'paid')`,
            [vehicleId]
        );

        if (bookings[0].count > 0) {
            return res.status(400).json({
                success: false,
                message: "Cannot delete vehicle with active bookings"
            });
        }

        // Delete vehicle (cascade will handle related records)
        await pool.execute("DELETE FROM vehicles WHERE ID = ?", [vehicleId]);

        // Update owner profile vehicle count
        await pool.execute(
            "UPDATE owner_profiles SET total_vehicles = GREATEST(total_vehicles - 1, 0) WHERE user_id = ?",
            [userId]
        );

        res.json({
            success: true,
            message: "Vehicle deleted successfully"
        });
    } catch (error) {
        console.error("Error deleting vehicle:", error);
        res.status(500).json({
            success: false,
            message: "Failed to delete vehicle",
            error: error.message
        });
    }
};

// Assign driver to vehicle
export const assignDriver = async (req, res) => {
    try {
        const userId = req.user.id;
        checkUserType(req.user, ['owner']);
        const { vehicleId } = req.params;
        const { driver_id } = req.body;

        if (!driver_id) {
            return res.status(400).json({
                success: false,
                message: "driver_id is required"
            });
        }

        // Get vehicle
        const [vehicles] = await pool.execute(
            "SELECT * FROM vehicles WHERE ID = ? AND owner_id = ?",
            [vehicleId, userId]
        );

        if (vehicles.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Vehicle not found or you don't own this vehicle"
            });
        }

        // Verify driver exists and get driver profile
        const [drivers] = await pool.execute(
            `SELECT u.*, dp.status as driver_status, dp.verification_status as driver_verification_status
             FROM users u
             LEFT JOIN driver_profiles dp ON u.ID = dp.user_id
             WHERE u.ID = ? AND u.user_type = 'driver'`,
            [driver_id]
        );

        if (drivers.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Driver not found"
            });
        }

        const driver = drivers[0];

        // Verify driver is verified and active
        if (!driver.driver_verification_status || driver.driver_verification_status !== 'verified') {
            return res.status(400).json({
                success: false,
                message: "Driver must be verified before being assigned to a vehicle"
            });
        }

        if (!driver.driver_status || driver.driver_status !== 'active') {
            return res.status(400).json({
                success: false,
                message: "Driver must be active before being assigned to a vehicle"
            });
        }

        // Verify vehicle is approved before assigning driver
        if (vehicles[0].admin_status !== 'approve') {
            return res.status(400).json({
                success: false,
                message: "Vehicle must be approved by admin before assigning a driver"
            });
        }

        // Check if driver already has a vehicle assigned (one-to-one relationship)
        const [driverVehicles] = await pool.execute(
            "SELECT ID, registration_number FROM vehicles WHERE driver_id = ? AND vehicle_status = 'active'",
            [driver_id]
        );

        // Check if vehicle already has a driver assigned
        const vehicleHasDriver = vehicles[0].driver_id !== null;

        // Get a connection for transaction
        const connection = await pool.getConnection();

        try {
            // Start transaction
            await connection.beginTransaction();

            // One-to-one relationship: Unassign driver from their current vehicle if they have one
            if (driverVehicles.length > 0) {
                const currentVehicleId = driverVehicles[0].ID;
                console.log(`Unassigning driver ${driver_id} from vehicle ${currentVehicleId} (one-to-one relationship)`);
                
                // Update assignment record
                await connection.execute(
                    `UPDATE driver_vehicle_assignments 
                     SET unassigned_at = NOW(), status = 'completed' 
                     WHERE vehicle_id = ? AND driver_id = ? AND status = 'active'`,
                    [currentVehicleId, driver_id]
                );
                
                // Remove driver from vehicle
                await connection.execute(
                    "UPDATE vehicles SET driver_id = NULL WHERE ID = ?",
                    [currentVehicleId]
                );
            }

            // Unassign previous driver from this vehicle if exists
            if (vehicleHasDriver) {
                const previousDriverId = vehicles[0].driver_id;
                console.log(`Unassigning previous driver ${previousDriverId} from vehicle ${vehicleId}`);
                
                await connection.execute(
                    `UPDATE driver_vehicle_assignments 
                     SET unassigned_at = NOW(), status = 'completed' 
                     WHERE vehicle_id = ? AND status = 'active'`,
                    [vehicleId]
                );
            }

            // Update vehicle with new driver
            await connection.execute(
                "UPDATE vehicles SET driver_id = ? WHERE ID = ?",
                [driver_id, vehicleId]
            );

            // Create assignment record
            await connection.execute(
                `INSERT INTO driver_vehicle_assignments (
                    driver_id, vehicle_id, assigned_by, status
                ) VALUES (?, ?, ?, 'active')`,
                [driver_id, vehicleId, userId]
            );

            // Commit transaction first before calling addVehicleToQueue (which has its own transaction logic)
            await connection.commit();
            connection.release(); // Release connection before external function call

            // Add vehicle to queue now that it has a verified, active driver
            // If vehicle was already in queue, addVehicleToQueue will handle it (returns already_exists: true)
            let queueResult = null;
            try {
                queueResult = await addVehicleToQueue(vehicleId);
            } catch (queueError) {
                // Log error but don't fail the assignment
                console.error("Error adding vehicle to queue after driver assignment:", queueError);
                queueResult = {
                    success: false,
                    message: queueError.message,
                    error: queueError.message
                };
            }

            res.json({
                success: true,
                message: "Driver assigned successfully",
                queue: queueResult
            });
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            if (connection) {
                connection.release(); // Ensure connection is released even if commit was called
            }
        }
    } catch (error) {
        console.error("Error assigning driver:", error);
        res.status(500).json({
            success: false,
            message: "Failed to assign driver",
            error: error.message
        });
    }
};

// Get available vehicles for assignment (verified and active, without driver)
export const getAvailableVehiclesForAssignment = async (req, res) => {
    try {
        const userId = req.user.id;
        checkUserType(req.user, ['owner']);

        // Get owner's vehicles that are:
        // 1. Approved by admin (admin_status = 'approve')
        // 2. Active (vehicle_status = 'active')
        // 3. Don't have a driver assigned (driver_id IS NULL)
        const [vehicles] = await pool.execute(
            `SELECT v.ID, v.registration_number, v.license_plate, v.make, v.model, 
                    v.color, v.vehicle_type, v.capacity, er.route_name
             FROM vehicles v
             LEFT JOIN existing_routes er ON v.existing_route_id = er.ID
             WHERE v.owner_id = ? 
               AND v.admin_status = 'approve'
               AND v.vehicle_status = 'active'
               AND v.driver_id IS NULL
             ORDER BY v.registration_number`,
            [userId]
        );

        res.json({
            success: true,
            vehicles
        });
    } catch (error) {
        console.error("Error fetching available vehicles:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch available vehicles",
            error: error.message
        });
    }
};

// Get current vehicle-driver assignments for owner
export const getCurrentAssignments = async (req, res) => {
    try {
        const userId = req.user.id;
        checkUserType(req.user, ['owner']);

        // Get owner's vehicles with assigned drivers
        // Join with users to get driver information and driver_profiles for verification status
        const [assignments] = await pool.execute(
            `SELECT 
                v.ID as vehicle_id, v.registration_number, v.license_plate, v.make, v.model, 
                v.color, v.vehicle_type, v.capacity, v.vehicle_status, v.admin_status,
                er.route_name, er.ID as route_id,
                u_driver.ID as driver_id, u_driver.name as driver_name, u_driver.email as driver_email, 
                u_driver.phone as driver_phone,
                dp.license_number as driver_license, dp.license_expiry as driver_license_expiry,
                dp.status as driver_status, dp.verification_status as driver_verification_status,
                dva.assigned_at, dva.ID as assignment_id
             FROM vehicles v
             INNER JOIN users u_driver ON v.driver_id = u_driver.ID
             INNER JOIN driver_profiles dp ON u_driver.ID = dp.user_id
             LEFT JOIN existing_routes er ON v.existing_route_id = er.ID
             LEFT JOIN driver_vehicle_assignments dva ON v.ID = dva.vehicle_id 
                AND u_driver.ID = dva.driver_id 
                AND dva.status = 'active'
             WHERE v.owner_id = ? 
               AND v.driver_id IS NOT NULL
               AND v.vehicle_status = 'active'
             ORDER BY v.registration_number`,
            [userId]
        );

        res.json({
            success: true,
            assignments
        });
    } catch (error) {
        console.error("Error fetching current assignments:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch current assignments",
            error: error.message
        });
    }
};

// Unassign driver from vehicle
export const unassignDriver = async (req, res) => {
    try {
        const userId = req.user.id;
        checkUserType(req.user, ['owner']);
        const { vehicleId } = req.params;

        // Get vehicle
        const [vehicles] = await pool.execute(
            "SELECT * FROM vehicles WHERE ID = ? AND owner_id = ?",
            [vehicleId, userId]
        );

        if (vehicles.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Vehicle not found or you don't own this vehicle"
            });
        }

        if (!vehicles[0].driver_id) {
            return res.status(400).json({
                success: false,
                message: "No driver assigned to this vehicle"
            });
        }

        // Get a connection for transaction
        const connection = await pool.getConnection();

        try {
            // Start transaction
            await connection.beginTransaction();

            // Update assignment record
            await connection.execute(
                `UPDATE driver_vehicle_assignments 
                 SET unassigned_at = NOW(), status = 'completed' 
                 WHERE vehicle_id = ? AND driver_id = ? AND status = 'active'`,
                [vehicleId, vehicles[0].driver_id]
            );

            // Update vehicle (remove driver)
            await connection.execute(
                "UPDATE vehicles SET driver_id = NULL WHERE ID = ?",
                [vehicleId]
            );

            // Remove vehicle from queue when driver is unassigned
            // (Vehicle cannot be in queue without a verified driver)
            await connection.execute(
                "DELETE FROM vehicle_queue WHERE vehicle_id = ?",
                [vehicleId]
            );

            // Commit transaction
            await connection.commit();

            res.json({
                success: true,
                message: "Driver unassigned successfully. Vehicle removed from queue."
            });
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release(); // Release the connection back to the pool
        }
    } catch (error) {
        console.error("Error unassigning driver:", error);
        res.status(500).json({
            success: false,
            message: "Failed to unassign driver",
            error: error.message
        });
    }
};

// ============================================
// DRIVER ROUTES
// ============================================

// Get driver's assigned vehicles
export const getDriverVehicles = async (req, res) => {
    try {
        const userId = req.user.id;
        checkUserType(req.user, ['driver', 'admin']);

        const [vehicles] = await pool.execute(
            `SELECT v.*, 
                    u_owner.name as owner_name, u_owner.email as owner_email,
                    er.route_name, er.location_1, er.location_2
             FROM vehicles v
             LEFT JOIN users u_owner ON v.owner_id = u_owner.ID
             LEFT JOIN existing_routes er ON v.existing_route_id = er.ID
             WHERE v.driver_id = ? AND v.vehicle_status = 'active'
             ORDER BY v.created_at DESC`,
            [userId]
        );

        // Parse JSON fields
        vehicles.forEach(vehicle => {
            // route_types is SET('custom', 'long-distance'), so it comes as comma-separated string
            // Convert to array for frontend consistency
            if (vehicle.route_types && typeof vehicle.route_types === 'string') {
                vehicle.route_types = vehicle.route_types.split(',').map(rt => rt.trim());
            } else if (!vehicle.route_types) {
                vehicle.route_types = [];
            }
            if (vehicle.images) vehicle.images = JSON.parse(vehicle.images);
            if (vehicle.videos) vehicle.videos = JSON.parse(vehicle.videos);
            if (vehicle.features) vehicle.features = JSON.parse(vehicle.features);
        });

        res.json({
            success: true,
            vehicles
        });
    } catch (error) {
        console.error("Error fetching driver vehicles:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch vehicles",
            error: error.message
        });
    }
};

// ============================================
// PUBLIC/CLIENT ROUTES
// ============================================

// Search available vehicles
export const searchVehicles = async (req, res) => {
    try {
        const { route_id, vehicle_type, min_capacity, status = 'active' } = req.body;

        let query = `
            SELECT v.*, 
                   u_owner.name as owner_name,
                   er.route_name, er.location_1, er.location_2
            FROM vehicles v
            LEFT JOIN users u_owner ON v.owner_id = u_owner.ID
            LEFT JOIN existing_routes er ON v.existing_route_id = er.ID
            WHERE v.vehicle_status = ?
        `;
        const params = [status];

        if (route_id) {
            query += ` AND v.existing_route_id = ?`;
            params.push(route_id);
        }

        if (vehicle_type) {
            query += ` AND v.vehicle_type = ?`;
            params.push(vehicle_type);
        }

        if (min_capacity) {
            query += ` AND v.capacity >= ?`;
            params.push(min_capacity);
        }

        query += ` ORDER BY v.created_at DESC`;

        const [vehicles] = await pool.execute(query, params);

        // Parse JSON fields
        vehicles.forEach(vehicle => {
            // route_types is SET('custom', 'long-distance'), so it comes as comma-separated string
            // Convert to array for frontend consistency
            if (vehicle.route_types && typeof vehicle.route_types === 'string') {
                vehicle.route_types = vehicle.route_types.split(',').map(rt => rt.trim());
            } else if (!vehicle.route_types) {
                vehicle.route_types = [];
            }
            if (vehicle.images) vehicle.images = JSON.parse(vehicle.images);
            if (vehicle.videos) vehicle.videos = JSON.parse(vehicle.videos);
            if (vehicle.features) vehicle.features = JSON.parse(vehicle.features);
        });

        res.json({
            success: true,
            vehicles
        });
    } catch (error) {
        console.error("Error searching vehicles:", error);
        res.status(500).json({
            success: false,
            message: "Failed to search vehicles",
            error: error.message
        });
    }
};

// Get vehicles by route
export const getVehiclesByRoute = async (req, res) => {
    try {
        const { routeId } = req.params;

        const [vehicles] = await pool.execute(
            `SELECT v.*, 
                    u_owner.name as owner_name,
                    er.route_name, er.location_1, er.location_2
             FROM vehicles v
             LEFT JOIN users u_owner ON v.owner_id = u_owner.ID
             LEFT JOIN existing_routes er ON v.existing_route_id = er.ID
             WHERE v.existing_route_id = ? AND v.vehicle_status = 'active'
             ORDER BY v.created_at DESC`,
            [routeId]
        );

        // Parse JSON fields
        vehicles.forEach(vehicle => {
            // route_types is SET('custom', 'long-distance'), so it comes as comma-separated string
            // Convert to array for frontend consistency
            if (vehicle.route_types && typeof vehicle.route_types === 'string') {
                vehicle.route_types = vehicle.route_types.split(',').map(rt => rt.trim());
            } else if (!vehicle.route_types) {
                vehicle.route_types = [];
            }
            if (vehicle.images) vehicle.images = JSON.parse(vehicle.images);
            if (vehicle.videos) vehicle.videos = JSON.parse(vehicle.videos);
            if (vehicle.features) vehicle.features = JSON.parse(vehicle.features);
        });

        res.json({
            success: true,
            vehicles
        });
    } catch (error) {
        console.error("Error fetching vehicles by route:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch vehicles",
            error: error.message
        });
    }
};

// ============================================
// ADMIN ROUTES
// ============================================

// Get all vehicles
export const getAllVehicles = async (req, res) => {
    try {
        checkUserType(req.user, ['admin']);

        const { status, admin_status } = req.query;
        
        // Ensure limit and offset are valid integers with defaults
        const limit = parseInt(req.query.limit) || 100;
        const offset = parseInt(req.query.offset) || 0;

        // Build query with specific columns to avoid loading large JSON fields during sort
        // This prevents "Out of sort memory" errors
        let query = `
            SELECT v.ID, v.owner_id, v.driver_id, v.existing_route_id,
                   v.registration_number, v.license_plate, v.make, v.model, v.color,
                   v.capacity, v.extraspace_parcel_sp, v.vehicle_type, v.vehicle_status,
                   v.admin_status, v.route_types, v.description,
                   v.images, v.videos, v.features,
                   v.created_at, v.updated_at,
                   u_owner.name as owner_name, u_owner.email as owner_email,
                   u_driver.name as driver_name,
                   er.route_name, er.location_1, er.location_2
            FROM vehicles v
            LEFT JOIN users u_owner ON v.owner_id = u_owner.ID
            LEFT JOIN users u_driver ON v.driver_id = u_driver.ID
            LEFT JOIN existing_routes er ON v.existing_route_id = er.ID
            WHERE 1=1
        `;
        const params = [];

        if (status) {
            query += ` AND v.vehicle_status = ?`;
            params.push(status);
        }

        if (admin_status) {
            query += ` AND v.admin_status = ?`;
            params.push(admin_status);
        }

        // Order by ID (which is auto-increment and correlates with created_at) to avoid sort memory issues
        // ID is indexed (primary key), making sorting much more efficient
        // Alternatively, we could add an index on created_at, but using ID is more efficient
        query += ` ORDER BY v.ID DESC LIMIT ${limit} OFFSET ${offset}`;

        const [vehicles] = await pool.execute(query, params);

        // Parse JSON fields (MySQL2 may already parse JSON columns automatically)
        vehicles.forEach(vehicle => {
            // route_types is SET('custom', 'long-distance'), so it comes as comma-separated string
            // Convert to array for frontend consistency
            if (vehicle.route_types && typeof vehicle.route_types === 'string') {
                vehicle.route_types = vehicle.route_types.split(',').map(rt => rt.trim());
            } else if (!vehicle.route_types) {
                vehicle.route_types = [];
            }
            
            // Parse JSON fields only if they are strings (MySQL2 may already parse them as objects)
            if (vehicle.images) {
                if (typeof vehicle.images === 'string') {
                    try {
                        vehicle.images = JSON.parse(vehicle.images);
                    } catch (e) {
                        console.error(`Error parsing images for vehicle ${vehicle.ID}:`, e);
                        vehicle.images = [];
                    }
                } else if (!Array.isArray(vehicle.images)) {
                    vehicle.images = [];
                }
            } else {
                vehicle.images = [];
            }
            
            if (vehicle.videos) {
                if (typeof vehicle.videos === 'string') {
                    try {
                        vehicle.videos = JSON.parse(vehicle.videos);
                    } catch (e) {
                        console.error(`Error parsing videos for vehicle ${vehicle.ID}:`, e);
                        vehicle.videos = [];
                    }
                } else if (!Array.isArray(vehicle.videos)) {
                    vehicle.videos = [];
                }
            } else {
                vehicle.videos = [];
            }
            
            if (vehicle.features) {
                if (typeof vehicle.features === 'string') {
                    try {
                        vehicle.features = JSON.parse(vehicle.features);
                    } catch (e) {
                        console.error(`Error parsing features for vehicle ${vehicle.ID}:`, e);
                        vehicle.features = [];
                    }
                } else if (!Array.isArray(vehicle.features)) {
                    vehicle.features = [];
                }
            } else {
                vehicle.features = [];
            }
        });

        res.json({
            success: true,
            vehicles
        });
    } catch (error) {
        console.error("Error fetching all vehicles:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch vehicles",
            error: error.message
        });
    }
};

// Update vehicle status (admin)
export const updateVehicleStatusAdmin = async (req, res) => {
    try {
        checkUserType(req.user, ['admin']);
        const { vehicleId } = req.params;
        const { vehicle_status } = req.body;

        if (!vehicle_status) {
            return res.status(400).json({
                success: false,
                message: "vehicle_status is required"
            });
        }

        // Get a connection for transaction
        const connection = await pool.getConnection();

        try {
            // Start transaction
            await connection.beginTransaction();

            // Update vehicle status
            await connection.execute(
                "UPDATE vehicles SET vehicle_status = ? WHERE ID = ?",
                [vehicle_status, vehicleId]
            );

            // If vehicle status is set to 'inactive', remove from queue
            if (vehicle_status === 'inactive') {
                await connection.execute(
                    "DELETE FROM vehicle_queue WHERE vehicle_id = ?",
                    [vehicleId]
                );
            }

            // Commit transaction
            await connection.commit();

            res.json({
                success: true,
                message: vehicle_status === 'inactive' 
                    ? "Vehicle status updated to inactive. Vehicle removed from queue."
                    : "Vehicle status updated successfully"
            });
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release(); // Release the connection back to the pool
        }
    } catch (error) {
        console.error("Error updating vehicle status:", error);
        res.status(500).json({
            success: false,
            message: "Failed to update vehicle status",
            error: error.message
        });
    }
};

// ============================================
// VEHICLE APPROVAL & QUEUE MANAGEMENT
// ============================================

/**
 * Adds a vehicle to the queue for its assigned route when a verified driver is assigned
 * This function is called automatically when an owner assigns a verified, active driver to a vehicle
 * 
 * IMPORTANT: Each existing_route has its own independent queue with positions starting from 1
 * For example:
 * - Route ID 1: vehicles with queue_position 1, 2, 3, 4, 5...
 * - Route ID 2: vehicles with queue_position 1, 2, 3, 4, 5... (separate from Route ID 1)
 * 
 * HOW IT WORKS:
 * ============
 * 1. Gets the vehicle information (including existing_route_id, route_types, and driver_id)
 * 2. Verifies the vehicle is active and approved (admin_status = 'approve')
 * 3. Verifies vehicle has a driver assigned (driver_id is not NULL)
 * 4. Verifies the driver is verified (verification_status = 'verified') and active (status = 'active')
 * 5. Verifies vehicle has 'long-distance' in route_types (only long-distance vehicles can have routes)
 * 6. Checks if vehicle is already in the queue for this specific route
 * 7. Gets the current queue for THIS specific route only (filters by existing_route_id)
 * 8. Calculates next position based on max queue_position for THIS route only
 * 9. Adds vehicle to the end of the queue for this route (preserves "first approved = first in line")
 * 10. Returns the updated queue position
 * 
 * Note: Vehicle can only be added to queue if:
 * - Vehicle is approved and active
 * - Vehicle has a driver assigned
 * - Driver is verified and active
 * - Vehicle has 'long-distance' route type
 * - Vehicle has a route assigned
 * 
 * @param {number} vehicleId - The vehicle ID
 * @returns {Promise<Object>} - Queue entry information
 */
export const addVehicleToQueue = async (vehicleId) => {
    try {
        // Get vehicle information with driver details
        const [vehicles] = await pool.execute(
            `SELECT v.ID, v.existing_route_id, v.vehicle_status, v.admin_status, 
                    v.registration_number, v.route_types, v.driver_id,
                    dp.status as driver_status, dp.verification_status as driver_verification_status
             FROM vehicles v
             LEFT JOIN driver_profiles dp ON v.driver_id = dp.user_id
             WHERE v.ID = ?`,
            [vehicleId]
        );

        if (vehicles.length === 0) {
            throw new Error("Vehicle not found");
        }

        const vehicle = vehicles[0];

        // Verify vehicle is active and approved
        if (vehicle.vehicle_status !== 'active') {
            throw new Error("Vehicle must be active to be added to queue");
        }

        if (vehicle.admin_status !== 'approve') {
            throw new Error("Vehicle must be approved to be added to queue");
        }

        // Verify vehicle has a driver assigned
        if (!vehicle.driver_id) {
            return {
                success: false,
                message: "Vehicle must have a driver assigned to be added to queue"
            };
        }

        // Verify driver is verified and active
        if (!vehicle.driver_verification_status || vehicle.driver_verification_status !== 'verified') {
            return {
                success: false,
                message: "Driver must be verified to add vehicle to queue"
            };
        }

        if (!vehicle.driver_status || vehicle.driver_status !== 'active') {
            return {
                success: false,
                message: "Driver must be active to add vehicle to queue"
            };
        }

        // Check if vehicle has 'long-distance' in route_types
        // Only long-distance vehicles can have existing_route_id and be added to queue
        const [routeTypeCheck] = await pool.execute(
            `SELECT FIND_IN_SET('long-distance', route_types) as has_long_distance
             FROM vehicles 
             WHERE ID = ?`,
            [vehicleId]
        );

        if (!routeTypeCheck[0] || routeTypeCheck[0].has_long_distance === 0) {
            return {
                success: false,
                message: "Only vehicles with 'long-distance' route type can be added to route queues. This vehicle has custom routes only."
            };
        }

        // Check if vehicle has a route assigned
        if (!vehicle.existing_route_id) {
            // Vehicle doesn't have a route, can't add to queue
            return {
                success: false,
                message: "Vehicle does not have a route assigned. Cannot add to queue."
            };
        }

        // Check if vehicle is already in the queue
        const [existingQueue] = await pool.execute(
            `SELECT * FROM vehicle_queue 
             WHERE existing_route_id = ? AND vehicle_id = ?`,
            [vehicle.existing_route_id, vehicleId]
        );

        if (existingQueue.length > 0) {
            // Vehicle already in queue
            return {
                success: true,
                message: "Vehicle already in queue",
                queue_entry: existingQueue[0],
                already_exists: true
            };
        }

        // Get current queue for this specific route to determine position
        // Each existing_route has its own independent queue (1, 2, 3, 4, 5...)
        // So we only count vehicles in the queue for THIS specific route
        const [currentQueue] = await pool.execute(
            `SELECT MAX(queue_position) as max_position
             FROM vehicle_queue 
             WHERE existing_route_id = ?`,
            [vehicle.existing_route_id]
        );

        // Calculate next position (add to end of queue for this specific route)
        // If no vehicles exist for this route yet, start at position 1
        const nextPosition = currentQueue.length > 0 && currentQueue[0].max_position !== null
            ? currentQueue[0].max_position + 1 
            : 1;

        // Add vehicle to queue
        const [result] = await pool.execute(
            `INSERT INTO vehicle_queue (existing_route_id, vehicle_id, queue_position)
             VALUES (?, ?, ?)`,
            [vehicle.existing_route_id, vehicleId, nextPosition]
        );

        return {
            success: true,
            message: `Vehicle ${vehicle.registration_number} added to queue for route`,
            queue_entry: {
                id: result.insertId,
                existing_route_id: vehicle.existing_route_id,
                vehicle_id: vehicleId,
                queue_position: nextPosition
            },
            already_exists: false
        };
    } catch (error) {
        console.error("Error adding vehicle to queue:", error);
        throw error;
    }
};

/**
 * Approves/rejects/suspends a vehicle and automatically adds it to the queue if approved
 * This is the main function called when admin changes vehicle admin_status
 * 
 * Note: Vehicles start with admin_status = 'pending' (default)
 * This endpoint is used to change from 'pending' to 'approve', 'reject', or 'suspended'
 * 
 * @param {number} vehicleId - The vehicle ID to approve/reject/suspend
 * @param {string} admin_status - The admin status ('approve', 'reject', 'suspended')
 *                                Note: 'pending' is the default state and cannot be set via this endpoint
 * @returns {Promise<Object>} - Approval result and queue information
 */
export const approveVehicle = async (req, res) => {
    try {
        checkUserType(req.user, ['admin']);
        const { vehicleId } = req.params;
        const { admin_status } = req.body;

        if (!admin_status) {
            return res.status(400).json({
                success: false,
                message: "admin_status is required"
            });
        }

        // Validate admin_status - only allow approve, reject, or suspended
        // 'pending' is the default state and should not be set via this endpoint
        if (!['approve','pending' , 'reject', 'suspended'].includes(admin_status)) {
            return res.status(400).json({
                success: false,
                message: "admin_status must be 'approve', 'reject', or 'suspended'. 'pending' is the default state and cannot be set via this endpoint."
            });
        }

        // Get a connection for transaction
        const connection = await pool.getConnection();

        try {
            // Start transaction
            await connection.beginTransaction();

            // Get vehicle before update
            const [vehiclesBefore] = await connection.execute(
                `SELECT ID, existing_route_id, vehicle_status, admin_status, registration_number, route_types
                 FROM vehicles 
                 WHERE ID = ?`,
                [vehicleId]
            );

            if (vehiclesBefore.length === 0) {
                await connection.rollback();
                connection.release();
                return res.status(404).json({
                    success: false,
                    message: "Vehicle not found"
                });
            }

            const vehicleBefore = vehiclesBefore[0];

            // Update vehicle admin_status
            // If approving, also set vehicle_status to 'active'
            // Note: Vehicle will be added to queue when owner assigns a verified driver
            if (admin_status === 'approve') {
                await connection.execute(
                    "UPDATE vehicles SET admin_status = ?, vehicle_status = 'active' WHERE ID = ?",
                    [admin_status, vehicleId]
                );
            } else {
                // For reject/suspended, only update admin_status
                await connection.execute(
                    "UPDATE vehicles SET admin_status = ? WHERE ID = ?",
                    [admin_status, vehicleId]
                );
            }

            // If rejected or suspended, remove from queue if it exists
            // (Vehicle should not be in queue if rejected/suspended)
            if (admin_status !== 'approve') {
                await connection.execute(
                    "DELETE FROM vehicle_queue WHERE vehicle_id = ?",
                    [vehicleId]
                );
            }

            // Commit transaction
            await connection.commit();

            // Get updated vehicle info
            const [vehiclesAfter] = await pool.execute(
                `SELECT v.*, er.route_name, er.origin, er.destination
                 FROM vehicles v
                 LEFT JOIN existing_routes er ON v.existing_route_id = er.ID
                 WHERE v.ID = ?`,
                [vehicleId]
            );

            res.json({
                success: true,
                message: admin_status === 'approve' 
                    ? 'Vehicle approved and set to active. Will be added to queue when owner assigns a verified driver.' 
                    : admin_status === 'reject' 
                        ? 'Vehicle rejected successfully' 
                        : 'Vehicle suspended successfully',
                vehicle: vehiclesAfter[0]
            });
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release(); // Release the connection back to the pool
        }
    } catch (error) {
        console.error("Error approving vehicle:", error);
        res.status(500).json({
            success: false,
            message: "Failed to approve vehicle",
            error: error.message
        });
    }
};

// ============================================
// VEHICLE QUEUE MANAGEMENT (Taxi Line System)
// ============================================

/**
 * Initializes or reorders vehicles in a queue for a specific route
 * Only includes active vehicles approved for that route
 * This simulates taxis in a line at a taxi rank, each taking their turn
 * 
 * HOW IT WORKS:
 * ============
 * 1. Gets the route information (e.g., Tzaneen → Johannesburg)
 * 2. Finds all active vehicles that are approved for this route (vehicles.existing_route_id = route_id)
 * 3. Removes vehicles from queue that are no longer active or no longer on this route
 * 4. Adds NEW vehicles to the end of the queue (based on their creation/approval time)
 * 5. Reorders ALL vehicles based on:
 *    - PRIMARY: When vehicle was first added to queue (vehicle_queue.created_at)
 *      This preserves "first approved = first in line" principle
 *    - SECONDARY: If same creation time, use vehicle.created_at (approval time)
 * 6. Assigns sequential positions (1 = next in line, 2 = second, etc.)
 * 7. Returns the ordered queue visible in the database
 * 
 * IMPORTANT: This function preserves the original order based on approval time.
 * When a vehicle is selected (via selectNextVehicle), it moves to the end,
 * but when reinitializing, we restore order based on when vehicles were first approved.
 * 
 * EXAMPLE:
 * ========
 * Route: Tzaneen → Johannesburg (route_id = 5)
 * 
 * Day 1: Vehicle A approved → added to queue (position 1)
 * Day 2: Vehicle B approved → added to queue (position 2)
 * Day 3: Vehicle C approved → added to queue (position 3)
 * 
 * After Vehicle A is selected:
 * - Vehicle B: position 1 (next in line)
 * - Vehicle C: position 2
 * - Vehicle A: position 3 (moved to end)
 * 
 * If initializeVehicleQueue is called again:
 * - Vehicle A: position 1 (first approved, restored to front)
 * - Vehicle B: position 2
 * - Vehicle C: position 3
 * 
 * @param {number} routeId - The existing_route_id (required)
 * @returns {Promise<Array>} - Array of vehicles in queue order
 */
export const initializeVehicleQueue = async (req, res) => {
    try {
        checkUserType(req.user, ['admin']);

        const { route_id } = req.body;

        if (!route_id) {
            return res.status(400).json({
                success: false,
                message: "route_id is required"
            });
        }

        // Verify route exists
        const [routes] = await pool.execute(
            "SELECT * FROM existing_routes WHERE ID = ?",
            [route_id]
        );

        if (routes.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Route not found"
            });
        }

        const route = routes[0];

        // Get all active vehicles approved for this route with verified, active drivers
        // Only include vehicles that are:
        // 1. vehicle_status = 'active' (vehicle is operational)
        // 2. admin_status = 'approve' (admin has approved the vehicle)
        // 3. route_types contains 'long-distance' (only long-distance vehicles can have existing_route_id)
        // 4. driver_id is not NULL (has a driver assigned)
        // 5. Driver is verified (verification_status = 'verified')
        // 6. Driver is active (status = 'active')
        // Order by created_at (approval time) - first approved = first in line
        const [activeVehicles] = await pool.execute(
            `SELECT v.ID, v.registration_number, v.make, v.model, v.vehicle_status, 
                    v.admin_status, v.owner_id, v.created_at, v.driver_id
             FROM vehicles v
             INNER JOIN driver_profiles dp ON v.driver_id = dp.user_id
             WHERE v.existing_route_id = ? 
               AND v.vehicle_status = 'active' 
               AND v.admin_status = 'approve'
               AND FIND_IN_SET('long-distance', v.route_types) > 0
               AND v.driver_id IS NOT NULL
               AND dp.verification_status = 'verified'
               AND dp.status = 'active'
             ORDER BY v.created_at ASC`,
            [route_id]
        );

        if (activeVehicles.length === 0) {
            return res.status(400).json({
                success: false,
                message: `No active and approved vehicles with verified, active drivers found for route: ${route.route_name} (${route.location_1} → ${route.location_2})`
            });
        }

        // Get a connection for transaction
        const connection = await pool.getConnection();

        try {
            // Start transaction
            await connection.beginTransaction();

            // Remove queue entries for vehicles that are no longer active or no longer on this route
            const activeVehicleIds = activeVehicles.map(v => v.ID);
            if (activeVehicleIds.length > 0) {
                const placeholders = activeVehicleIds.map(() => '?').join(',');
                await connection.execute(
                    `DELETE FROM vehicle_queue 
                     WHERE existing_route_id = ? AND vehicle_id NOT IN (${placeholders})`,
                    [route_id, ...activeVehicleIds]
                );
            } else {
                // No active vehicles, clear entire queue for this route
                await connection.execute(
                    "DELETE FROM vehicle_queue WHERE existing_route_id = ?",
                    [route_id]
                );
            }

            // Get existing queue entries for THIS specific route only
            // Each existing_route has its own independent queue (positions 1, 2, 3, 4, 5...)
            const [existingQueue] = await connection.execute(
                `SELECT vehicle_id, queue_position, created_at
                 FROM vehicle_queue 
                 WHERE existing_route_id = ?
                 ORDER BY queue_position ASC`,
                [route_id]
            );

            const existingVehicleIds = new Set(existingQueue.map(q => q.vehicle_id));
            const newVehicles = activeVehicles.filter(v => !existingVehicleIds.has(v.ID));

            // Add new vehicles to the end of the queue for THIS specific route
            // New vehicles are added based on their creation time (approval time)
            // Calculate max position only for this route's queue
            let maxPosition = existingQueue.length > 0 
                ? Math.max(...existingQueue.map(q => q.queue_position))
                : 0;

            for (const vehicle of newVehicles) {
                maxPosition++;
                await connection.execute(
                    `INSERT INTO vehicle_queue (existing_route_id, vehicle_id, queue_position)
                     VALUES (?, ?, ?)
                     ON DUPLICATE KEY UPDATE queue_position = queue_position`,
                    [route_id, vehicle.ID, maxPosition]
                );
            }

            // Reorder all positions based on when vehicle was FIRST added to queue (created_at)
            // This preserves "first approved = first in line" principle
            // If vehicle_queue.created_at is same, use vehicle.created_at as tiebreaker
            const [allQueueEntries] = await connection.execute(
                `SELECT vq.vehicle_id, vq.queue_position, vq.created_at as queue_created_at,
                        v.created_at as vehicle_created_at
                 FROM vehicle_queue vq
                 INNER JOIN vehicles v ON vq.vehicle_id = v.ID
                 WHERE vq.existing_route_id = ?
                 ORDER BY 
                     vq.created_at ASC,  -- When vehicle was first added to queue (preserves original order)
                     v.created_at ASC    -- Tiebreaker: vehicle approval time
                 `,
                [route_id]
            );

            // Update positions sequentially based on original approval order
            for (let i = 0; i < allQueueEntries.length; i++) {
                await connection.execute(
                    `UPDATE vehicle_queue 
                     SET queue_position = ? 
                     WHERE existing_route_id = ? AND vehicle_id = ?`,
                    [i + 1, route_id, allQueueEntries[i].vehicle_id]
                );
            }

            // Commit transaction
            await connection.commit();

            // Get final queue with vehicle details
            // Only include vehicles that are active, approved, and have verified, active drivers
            const [finalQueue] = await pool.execute(
                `SELECT vq.*, v.registration_number, v.make, v.model, v.vehicle_type, 
                        v.capacity, v.vehicle_status, v.admin_status, v.driver_id, v.owner_id,
                        u_driver.name as driver_name,
                        u_owner.name as owner_name,
                        dp.status as driver_status, dp.verification_status as driver_verification_status
                 FROM vehicle_queue vq
                 INNER JOIN vehicles v ON vq.vehicle_id = v.ID
                 LEFT JOIN users u_driver ON v.driver_id = u_driver.ID
                 LEFT JOIN users u_owner ON v.owner_id = u_owner.ID
                 LEFT JOIN driver_profiles dp ON v.driver_id = dp.user_id
                 WHERE vq.existing_route_id = ?
                   AND v.vehicle_status = 'active'
                   AND v.admin_status = 'approve'
                   AND v.driver_id IS NOT NULL
                   AND dp.verification_status = 'verified'
                   AND dp.status = 'active'
                 ORDER BY vq.queue_position ASC`,
                [route_id]
            );

            res.json({
                success: true,
                message: `Vehicle queue initialized successfully for route: ${route.route_name}`,
                route: {
                    id: route.ID,
                    name: route.route_name,
                    location_1: route.location_1,
                    location_2: route.location_2
                },
                queue: finalQueue,
                total_vehicles: finalQueue.length
            });
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release(); // Release the connection back to the pool
        }
    } catch (error) {
        console.error("Error initializing vehicle queue:", error);
        res.status(500).json({
            success: false,
            message: "Failed to initialize vehicle queue",
            error: error.message
        });
    }
};

/**
 * Helper function: Gets the next vehicle in queue for a specific route that matches the requested direction
 * This can be called internally from other controllers
 * 
 * Searches through the queue starting from position 1, finding the first vehicle whose direction_type
 * SET contains the requested direction (from_loc1 or from_loc2).
 * 
 * @param {number} route_id - The existing_route_id
 * @param {string} direction_type - The requested direction ('from_loc1' or 'from_loc2')
 * @returns {Promise<Object|null>} - The matching vehicle with its queue position, or null if no vehicle available
 */
export const getNextVehicleInQueueHelper = async (route_id, direction_type = null) => {
    try {
        // Get route info
        const [routes] = await pool.execute(
            "SELECT * FROM existing_routes WHERE ID = ?",
            [route_id]
        );

        if (routes.length === 0) {
            return null;
        }

        // If no direction_type specified, return vehicle at position 1 (backward compatibility)
        if (!direction_type) {
            const [nextVehicle] = await pool.execute(
                `SELECT vq.*, v.ID as vehicle_id, v.registration_number, v.make, v.model, v.vehicle_type, 
                        v.capacity, v.extraspace_parcel_sp, v.vehicle_status, v.admin_status, v.driver_id, v.owner_id, v.direction_type,
                        u_driver.name as driver_name, u_driver.email as driver_email, u_driver.phone as driver_phone,
                        u_owner.name as owner_name, u_owner.email as owner_email,
                        dp.status as driver_status, dp.verification_status as driver_verification_status,
                        dp.license_number as driver_license_number
                 FROM vehicle_queue vq
                 INNER JOIN vehicles v ON vq.vehicle_id = v.ID
                 LEFT JOIN users u_driver ON v.driver_id = u_driver.ID
                 LEFT JOIN users u_owner ON v.owner_id = u_owner.ID
                 LEFT JOIN driver_profiles dp ON v.driver_id = dp.user_id
                 WHERE vq.existing_route_id = ? 
                   AND vq.queue_position = 1
                   AND v.vehicle_status = 'active' 
                   AND v.admin_status = 'approve'
                   AND v.driver_id IS NOT NULL
                   AND dp.verification_status = 'verified'
                   AND dp.status = 'active'
                 LIMIT 1`,
                [route_id]
            );

            return nextVehicle.length > 0 ? nextVehicle[0] : null;
        }

        // Validate direction_type
        if (!['from_loc1', 'from_loc2'].includes(direction_type)) {
            throw new Error(`Invalid direction_type: ${direction_type}. Must be 'from_loc1' or 'from_loc2'`);
        }

        // Get all vehicles in queue for this route, ordered by position
        // Check if each vehicle's direction_type SET contains the requested direction
        // FIND_IN_SET returns > 0 if the value is found in the SET
        const [vehicles] = await pool.execute(
            `SELECT vq.*, v.ID as vehicle_id, v.registration_number, v.make, v.model, v.vehicle_type, 
                    v.capacity, v.extraspace_parcel_sp, v.vehicle_status, v.admin_status, v.driver_id, v.owner_id, v.direction_type,
                    u_driver.name as driver_name, u_driver.email as driver_email, u_driver.phone as driver_phone,
                    u_owner.name as owner_name, u_owner.email as owner_email,
                    dp.status as driver_status, dp.verification_status as driver_verification_status,
                    dp.license_number as driver_license_number
             FROM vehicle_queue vq
             INNER JOIN vehicles v ON vq.vehicle_id = v.ID
             LEFT JOIN users u_driver ON v.driver_id = u_driver.ID
             LEFT JOIN users u_owner ON v.owner_id = u_owner.ID
             LEFT JOIN driver_profiles dp ON v.driver_id = dp.user_id
             WHERE vq.existing_route_id = ? 
               AND v.vehicle_status = 'active' 
               AND v.admin_status = 'approve'
               AND v.driver_id IS NOT NULL
               AND dp.verification_status = 'verified'
               AND dp.status = 'active'
               AND FIND_IN_SET(?, v.direction_type) > 0
             ORDER BY vq.queue_position ASC
             LIMIT 1`,
            [route_id, direction_type]
        );

        return vehicles.length > 0 ? vehicles[0] : null;
    } catch (error) {
        console.error("Error in getNextVehicleInQueueHelper:", error);
        throw error;
    }
};

/**
 * Gets the vehicle at position 1 (next in line) for a specific route
 * This is the vehicle that should be used for the next booking
 * 
 * @param {number} routeId - The existing_route_id (required query parameter)
 * @returns {Promise<Object>} - The vehicle at position 1, or null if no vehicle available
 */
export const getNextVehicleInQueue = async (req, res) => {
    try {
        checkUserType(req.user, ['owner', 'admin']);

        const { route_id, direction_type } = req.query;

        if (!route_id) {
            return res.status(400).json({
                success: false,
                message: "route_id query parameter is required"
            });
        }

        // Get route info
        const [routes] = await pool.execute(
            "SELECT * FROM existing_routes WHERE ID = ?",
            [route_id]
        );

        if (routes.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Route not found"
            });
        }

        const route = routes[0];

        // Get the next vehicle matching the direction (if specified) or at position 1
        const nextVehicle = await getNextVehicleInQueueHelper(route_id, direction_type || null);
   
        if (!nextVehicle) {
            const message = direction_type 
                ? `No vehicle available for this route with direction '${direction_type}'`
                : "No vehicle available at position 1 for this route";
            
            return res.json({
                success: true,
                route: {
                    id: route.ID,
                    name: route.route_name,
                    location_1: route.location_1,
                    location_2: route.location_2
                },
                next_vehicle: null,
                message: message
            });
        }

        res.json({
            success: true,
            route: {
                id: route.ID,
                name: route.route_name,
                location_1: route.location_1,
                location_2: route.location_2
            },
            next_vehicle: nextVehicle,
            queue_position: nextVehicle.queue_position
        });
    } catch (error) {
        console.error("Error fetching next vehicle in queue:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch next vehicle in queue",
            error: error.message
        });
    }
};

/**
 * Gets the current vehicle queue for a specific route
 * Returns vehicles in queue order (1 = next in line)
 * 
 * @param {number} routeId - The existing_route_id (required query parameter)
 * @returns {Promise<Array>} - Array of vehicles in queue order
 */
export const getVehicleQueue = async (req, res) => {
    try {
        checkUserType(req.user, ['owner', 'admin']);

        const { route_id } = req.query;

        if (!route_id) {
            return res.status(400).json({
                success: false,
                message: "route_id query parameter is required"
            });
        }

        // Get route info
        const [routes] = await pool.execute(
            "SELECT * FROM existing_routes WHERE ID = ?",
            [route_id]
        );

        if (routes.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Route not found"
            });
        }

        const route = routes[0];

        const [queue] = await pool.execute(
            `SELECT vq.*, v.registration_number, v.make, v.model, v.vehicle_type, 
                    v.capacity, v.vehicle_status, v.admin_status, v.driver_id, v.owner_id,
                    u_driver.name as driver_name, u_driver.email as driver_email,
                    u_owner.name as owner_name,
                    dp.status as driver_status, dp.verification_status as driver_verification_status
             FROM vehicle_queue vq
             INNER JOIN vehicles v ON vq.vehicle_id = v.ID
             LEFT JOIN users u_driver ON v.driver_id = u_driver.ID
             LEFT JOIN users u_owner ON v.owner_id = u_owner.ID
             LEFT JOIN driver_profiles dp ON v.driver_id = dp.user_id
             WHERE vq.existing_route_id = ? 
               AND v.vehicle_status = 'active' 
               AND v.admin_status = 'approve'
               AND v.driver_id IS NOT NULL
               AND dp.verification_status = 'verified'
               AND dp.status = 'active'
             ORDER BY vq.queue_position ASC`,
            [route_id]
        );

        res.json({
            success: true,
            route: {
                id: route.ID,
                name: route.route_name,
                origin: route.origin,
                destination: route.destination
            },
            queue: queue,
            total_vehicles: queue.length,
            next_vehicle: queue.length > 0 ? queue[0] : null
        });
    } catch (error) {
        console.error("Error fetching vehicle queue:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch vehicle queue",
            error: error.message
        });
    }
};

/**
 * Moves a vehicle from position 1 to the end of the queue after booking completion
 * This function is called when a booking is completed to rotate the queue
 * 
 * HOW IT WORKS:
 * ============
 * 1. Verifies the specified vehicle_id is actually at position 1 for the route
 * 2. Verifies the vehicle is still active, approved, and has verified driver
 * 3. Moves all other vehicles up by 1 position (2→1, 3→2, 4→3, etc.)
 * 4. Moves the specified vehicle to the end of the queue (last position)
 * 5. Returns the moved vehicle and updated queue
 * Note: updated_at timestamp is automatically updated due to ON UPDATE CURRENT_TIMESTAMP
 * 
 * EXAMPLE:
 * ========
 * Before moving (Route: Tzaneen → Johannesburg):
 * - Position 1: Vehicle A (vehicle_id = 10) ← This vehicle completed a booking
 * - Position 2: Vehicle B
 * - Position 3: Vehicle C
 * 
 * Call: selectNextVehicle(route_id=5, vehicle_id=10)
 * 
 * After moving:
 * - Position 1: Vehicle B (now next in line)
 * - Position 2: Vehicle C
 * - Position 3: Vehicle A (moved to end)
 * 
 * This ensures fair rotation - each vehicle takes its turn
 * 
 * @param {number} route_id - The existing_route_id (required)
 * @param {number} vehicle_id - The vehicle ID at position 1 (required, for verification)
 * @returns {Promise<Object>} - The moved vehicle and updated queue
 */
export const selectNextVehicle = async (req, res) => {
    try {
        checkUserType(req.user, ['admin']);

        const { route_id, vehicle_id } = req.body;

        if (!route_id) {
            return res.status(400).json({
                success: false,
                message: "route_id is required"
            });
        }

        if (!vehicle_id) {
            return res.status(400).json({
                success: false,
                message: "vehicle_id is required for verification"
            });
        }

        // Verify route exists
        const [routes] = await pool.execute(
            "SELECT * FROM existing_routes WHERE ID = ?",
            [route_id]
        );

        if (routes.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Route not found"
            });
        }

        const route = routes[0];

        // Get a connection for transaction
        const connection = await pool.getConnection();

        try {
            // Start transaction
            await connection.beginTransaction();

            // Verify the specified vehicle is actually at position 1 for this route
            // This ensures we're moving the correct vehicle (verification)
            const [vehicleAtPosition1] = await connection.execute(
                `SELECT vq.*, v.registration_number, v.make, v.model, v.vehicle_type, 
                        v.capacity, v.vehicle_status, v.admin_status, v.driver_id, v.ID as vehicle_id, v.owner_id,
                        u_driver.name as driver_name,
                        u_owner.name as owner_name,
                        dp.status as driver_status, dp.verification_status as driver_verification_status
                 FROM vehicle_queue vq
                 INNER JOIN vehicles v ON vq.vehicle_id = v.ID
                 LEFT JOIN users u_driver ON v.driver_id = u_driver.ID
                 LEFT JOIN users u_owner ON v.owner_id = u_owner.ID
                 LEFT JOIN driver_profiles dp ON v.driver_id = dp.user_id
                 WHERE vq.existing_route_id = ? 
                   AND vq.vehicle_id = ?
                   AND vq.queue_position = 1
                   AND v.vehicle_status = 'active' 
                   AND v.admin_status = 'approve'
                   AND v.driver_id IS NOT NULL
                   AND dp.verification_status = 'verified'
                   AND dp.status = 'active'
                 LIMIT 1`,
                [route_id, vehicle_id]
            );

            if (vehicleAtPosition1.length === 0) {
                await connection.rollback();
                connection.release();
                return res.status(404).json({
                    success: false,
                    message: `Vehicle with ID ${vehicle_id} is not at position 1 for route: ${route.route_name}. Please verify the vehicle ID and route.`
                });
            }

            const selectedVehicle = vehicleAtPosition1[0];

            // Get total count of vehicles in queue for this route
            // Only count vehicles that are active, approved, and have verified, active drivers
            const [countResult] = await connection.execute(
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
                [route_id]
            );
            const totalVehicles = countResult[0].total;

            // First, move all vehicles up by 1 (positions 2,3,4... become 1,2,3...)
            // This shifts everyone forward, leaving position 1 empty
            // Only move vehicles that are active, approved, and have verified, active drivers
            await connection.execute(
                `UPDATE vehicle_queue vq
                 INNER JOIN vehicles v ON vq.vehicle_id = v.ID
                 LEFT JOIN driver_profiles dp ON v.driver_id = dp.user_id
                 SET vq.queue_position = vq.queue_position - 1
                 WHERE vq.existing_route_id = ? 
                   AND v.vehicle_status = 'active'
                   AND v.admin_status = 'approve'
                   AND v.driver_id IS NOT NULL
                   AND dp.verification_status = 'verified'
                   AND dp.status = 'active'
                   AND vq.queue_position > 1`,
                [route_id]
            );

            // Then move selected vehicle to the end
            // Note: updated_at will automatically update due to ON UPDATE CURRENT_TIMESTAMP
            await connection.execute(
                `UPDATE vehicle_queue 
                 SET queue_position = ?
                 WHERE existing_route_id = ? AND vehicle_id = ?`,
                [totalVehicles, route_id, vehicle_id]
            );

            // Commit transaction
            await connection.commit();

            // Get updated queue
            // Only show vehicles that are active, approved, and have verified, active drivers
            const [updatedQueue] = await pool.execute(
                `SELECT vq.*, v.registration_number, v.make, v.model, v.vehicle_type, 
                        v.capacity, v.vehicle_status, v.admin_status, v.driver_id, v.owner_id,
                        u_driver.name as driver_name,
                        u_owner.name as owner_name,
                        dp.status as driver_status, dp.verification_status as driver_verification_status
                 FROM vehicle_queue vq
                 INNER JOIN vehicles v ON vq.vehicle_id = v.ID
                 LEFT JOIN users u_driver ON v.driver_id = u_driver.ID
                 LEFT JOIN users u_owner ON v.owner_id = u_owner.ID
                 LEFT JOIN driver_profiles dp ON v.driver_id = dp.user_id
                 WHERE vq.existing_route_id = ? 
                   AND v.vehicle_status = 'active' 
                   AND v.admin_status = 'approve'
                   AND v.driver_id IS NOT NULL
                   AND dp.verification_status = 'verified'
                   AND dp.status = 'active'
                 ORDER BY vq.queue_position ASC`,
                [route_id]
            );

            res.json({
                success: true,
                message: `Vehicle selected and queue rotated for route: ${route.route_name}`,
                route: {
                    id: route.ID,
                    name: route.route_name,
                    location_1: route.location_1,
                    location_2: route.location_2
                },
                selected_vehicle: {
                    ...selectedVehicle,
                    queue_position: totalVehicles // Now at end
                },
                updated_queue: updatedQueue,
                next_vehicle: updatedQueue.length > 0 ? updatedQueue[0] : null
            });
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release(); // Release the connection back to the pool
        }
    } catch (error) {
        console.error("Error selecting next vehicle:", error);
        res.status(500).json({
            success: false,
            message: "Failed to select next vehicle",
            error: error.message
        });
    }
};

export default {
    createVehicle,
    getOwnerVehicles,
    getVehicleDetails,
    updateVehicle,
    deleteVehicle,
    assignDriver,
    unassignDriver,
    getDriverVehicles,
    searchVehicles,
    getVehiclesByRoute,
    getAllVehicles,
    updateVehicleStatusAdmin,
    approveVehicle,
    addVehicleToQueue,
    initializeVehicleQueue,
    getVehicleQueue,
    getNextVehicleInQueue,
    selectNextVehicle,
    getAvailableVehiclesForAssignment,
    getCurrentAssignments
};

