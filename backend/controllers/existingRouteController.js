import pool from "../config/db.js";

const checkUserType = (user, allowedTypes) => {
    if (!allowedTypes.includes(user.user_type)) {
        throw new Error(`Access denied. Required user type: ${allowedTypes.join(' or ')}`);
    }
};

/**
 * Create a new existing route (Admin only)
 * 
 * Required fields:
 * - route_name
 * - location_1
 * - location_2
 * - distance_km
 * - typical_duration_hours
 * - base_fare
 * - small_parcel_price
 * - medium_parcel_price
 * - large_parcel_price
 * 
 * Optional:
 * - status (defaults to 'active')
 */
export const createExistingRoute = async (req, res) => {
    try {
        checkUserType(req.user, ['admin']);

        const {
            route_name,
            location_1,
            location_2,
            distance_km,
            typical_duration_hours,
            base_fare,
            small_parcel_price,
            medium_parcel_price,
            large_parcel_price,
            status = 'active'
        } = req.body;

        // Validate required fields
        if (!route_name || !location_1 || !location_2 || distance_km === undefined || 
            typical_duration_hours === undefined || base_fare === undefined ||
            small_parcel_price === undefined || medium_parcel_price === undefined || 
            large_parcel_price === undefined) {
            return res.status(400).json({
                success: false,
                message: "Missing required fields: route_name, location_1, location_2, distance_km, typical_duration_hours, base_fare, small_parcel_price, medium_parcel_price, large_parcel_price"
            });
        }

        // Validate status
        if (status && !['active', 'inactive'].includes(status)) {
            return res.status(400).json({
                success: false,
                message: "Invalid status. Must be 'active' or 'inactive'"
            });
        }

        // Check if route already exists (unique constraint on location_1, location_2)
        const [existing] = await pool.execute(
            "SELECT ID FROM existing_routes WHERE location_1 = ? AND location_2 = ?",
            [location_1, location_2]
        );

        if (existing.length > 0) {
            return res.status(409).json({
                success: false,
                message: `Route from ${location_1} to ${location_2} already exists`
            });
        }

        // Insert new route
        const [result] = await pool.execute(
            `INSERT INTO existing_routes (
                route_name, location_1, location_2, distance_km, typical_duration_hours,
                base_fare, small_parcel_price, medium_parcel_price, large_parcel_price, status
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                route_name, location_1, location_2, 
                parseFloat(distance_km), parseFloat(typical_duration_hours),
                parseFloat(base_fare), parseFloat(small_parcel_price),
                parseFloat(medium_parcel_price), parseFloat(large_parcel_price),
                status
            ]
        );

        res.status(201).json({
            success: true,
            message: "Existing route created successfully",
            route: {
                id: result.insertId,
                route_name,
                location_1,
                location_2,
                distance_km: parseFloat(distance_km),
                typical_duration_hours: parseFloat(typical_duration_hours),
                base_fare: parseFloat(base_fare),
                small_parcel_price: parseFloat(small_parcel_price),
                medium_parcel_price: parseFloat(medium_parcel_price),
                large_parcel_price: parseFloat(large_parcel_price),
                status
            }
        });
    } catch (error) {
        console.error("Error creating existing route:", error);
        res.status(500).json({
            success: false,
            message: "Failed to create existing route",
            error: error.message
        });
    }
};

/**
 * Get all existing routes
 */
export const getAllExistingRoutes = async (req, res) => {
    try {
        checkUserType(req.user, ['admin','client','driver','owner']);

        const { status } = req.query;

        // Explicitly select ID to ensure it's included
        // Use alias to avoid case sensitivity issues
        let query = "SELECT existing_routes.ID, route_name, location_1, location_2, distance_km, typical_duration_hours, base_fare, small_parcel_price, medium_parcel_price, large_parcel_price, status, created_at, updated_at FROM existing_routes";
        let params = [];

        if (status) {
            query += " WHERE status = ?";
            params.push(status);
        }

        query += " ORDER BY created_at DESC";

        const [routes] = await pool.execute(query, params);
        
        // Debug: Log first route to check ID
        if (routes.length > 0) {
            console.log('First route from database (raw):', routes[0]);
            console.log('Route ID value (id):', routes[0].id, '(ID):', routes[0].ID);
            console.log('Route keys:', Object.keys(routes[0]));
        }

        res.json({
            success: true,
            routes: routes.map(route => {
                // Try multiple possible ID field names (id, ID, route_id)
                // MySQL returns column names in lowercase by default, so check id first
                const routeId = route.id !== null && route.id !== undefined ? route.id :
                               (route.ID !== null && route.ID !== undefined ? route.ID :
                               (route.route_id !== null && route.route_id !== undefined ? route.route_id : null));
                
                // Ensure ID is always present and valid
                if (!routeId && routeId !== 0) {
                    console.error('Route missing ID in database - Full route object:', route);
                    console.error('Route keys:', Object.keys(route));
                    console.error('route.id:', route.id, 'route.ID:', route.ID, 'route.route_id:', route.route_id);
                }
                
                return {
                    id: routeId, // Use the found ID
                    route_name: route.route_name,
                    location_1: route.location_1,
                    location_2: route.location_2,
                    distance_km: route.distance_km,
                    typical_duration_hours: route.typical_duration_hours,
                    base_fare: route.base_fare,
                    small_parcel_price: route.small_parcel_price,
                    medium_parcel_price: route.medium_parcel_price,
                    large_parcel_price: route.large_parcel_price,
                    status: route.status,
                    created_at: route.created_at,
                    updated_at: route.updated_at
                };
            }),
            total: routes.length
        });
    } catch (error) {
        console.error("Error fetching existing routes:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch existing routes",
            error: error.message
        });
    }
};

/**
 * Get a single existing route by ID
 */
export const getExistingRoute = async (req, res) => {
    try {
        checkUserType(req.user, ['admin']);

        const { routeId } = req.params;

        const [routes] = await pool.execute(
            "SELECT * FROM existing_routes WHERE ID = ?",
            [routeId]
        );

        if (routes.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Route not found"
            });
        }

        const route = routes[0];

        res.json({
            success: true,
            route: {
                id: route.ID,
                route_name: route.route_name,
                location_1: route.location_1,
                location_2: route.location_2,
                distance_km: route.distance_km,
                typical_duration_hours: route.typical_duration_hours,
                base_fare: route.base_fare,
                small_parcel_price: route.small_parcel_price,
                medium_parcel_price: route.medium_parcel_price,
                large_parcel_price: route.large_parcel_price,
                status: route.status,
                created_at: route.created_at,
                updated_at: route.updated_at
            }
        });
    } catch (error) {
        console.error("Error fetching existing route:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch existing route",
            error: error.message
        });
    }
};

/**
 * Update an existing route (Admin only)
 */
export const updateExistingRoute = async (req, res) => {
    try {
        checkUserType(req.user, ['admin']);

        const { routeId } = req.params;
        const {
            route_name,
            location_1,
            location_2,
            distance_km,
            typical_duration_hours,
            base_fare,
            small_parcel_price,
            medium_parcel_price,
            large_parcel_price,
            status
        } = req.body;

        // Check if route exists
        const [existing] = await pool.execute(
            "SELECT * FROM existing_routes WHERE ID = ?",
            [routeId]
        );

        if (existing.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Route not found"
            });
        }

        // If location_1/location_2 changed, check for conflicts
        if (location_1 && location_2) {
            const [conflicts] = await pool.execute(
                "SELECT ID FROM existing_routes WHERE location_1 = ? AND location_2 = ? AND ID != ?",
                [location_1, location_2, routeId]
            );

            if (conflicts.length > 0) {
                return res.status(409).json({
                    success: false,
                    message: `Route from ${location_1} to ${location_2} already exists`
                });
            }
        }

        // Build update query dynamically
        const updates = [];
        const values = [];

        if (route_name !== undefined) {
            updates.push("route_name = ?");
            values.push(route_name);
        }
        if (location_1 !== undefined) {
            updates.push("location_1 = ?");
            values.push(location_1);
        }
        if (location_2 !== undefined) {
            updates.push("location_2 = ?");
            values.push(location_2);
        }
        if (distance_km !== undefined) {
            updates.push("distance_km = ?");
            values.push(parseFloat(distance_km));
        }
        if (typical_duration_hours !== undefined) {
            updates.push("typical_duration_hours = ?");
            values.push(parseFloat(typical_duration_hours));
        }
        if (base_fare !== undefined) {
            updates.push("base_fare = ?");
            values.push(parseFloat(base_fare));
        }
        if (small_parcel_price !== undefined) {
            updates.push("small_parcel_price = ?");
            values.push(parseFloat(small_parcel_price));
        }
        if (medium_parcel_price !== undefined) {
            updates.push("medium_parcel_price = ?");
            values.push(parseFloat(medium_parcel_price));
        }
        if (large_parcel_price !== undefined) {
            updates.push("large_parcel_price = ?");
            values.push(parseFloat(large_parcel_price));
        }
        if (status !== undefined) {
            if (!['active', 'inactive'].includes(status)) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid status. Must be 'active' or 'inactive'"
                });
            }
            updates.push("status = ?");
            values.push(status);
        }

        if (updates.length === 0) {
            return res.status(400).json({
                success: false,
                message: "No fields to update"
            });
        }

        values.push(routeId);

        await pool.execute(
            `UPDATE existing_routes SET ${updates.join(', ')} WHERE ID = ?`,
            values
        );

        res.json({
            success: true,
            message: "Route updated successfully"
        });
    } catch (error) {
        console.error("Error updating existing route:", error);
        res.status(500).json({
            success: false,
            message: "Failed to update existing route",
            error: error.message
        });
    }
};

/**
 * Delete an existing route (Admin only)
 */
export const deleteExistingRoute = async (req, res) => {
    try {
        checkUserType(req.user, ['admin']);

        const { routeId } = req.params;

        // Check if route exists
        const [existing] = await pool.execute(
            "SELECT * FROM existing_routes WHERE ID = ?",
            [routeId]
        );

        if (existing.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Route not found"
            });
        }

        // Check if route is being used by any vehicles
        const [vehicles] = await pool.execute(
            "SELECT COUNT(*) as count FROM vehicles WHERE existing_route_id = ?",
            [routeId]
        );

        if (vehicles[0].count > 0) {
            return res.status(400).json({
                success: false,
                message: `Cannot delete route. ${vehicles[0].count} vehicle(s) are assigned to this route`
            });
        }

        // Check if route is being used by any bookings
        const [bookings] = await pool.execute(
            "SELECT COUNT(*) as count FROM bookings WHERE existing_route_id = ?",
            [routeId]
        );

        if (bookings[0].count > 0) {
            return res.status(400).json({
                success: false,
                message: `Cannot delete route. ${bookings[0].count} booking(s) reference this route`
            });
        }

        await pool.execute(
            "DELETE FROM existing_routes WHERE ID = ?",
            [routeId]
        );

        res.json({
            success: true,
            message: "Route deleted successfully"
        });
    } catch (error) {
        console.error("Error deleting existing route:", error);
        res.status(500).json({
            success: false,
            message: "Failed to delete existing route",
            error: error.message
        });
    }
};

export default {
    createExistingRoute,
    getAllExistingRoutes,
    getExistingRoute,
    updateExistingRoute,
    deleteExistingRoute
};

