import pool from "../config/db.js";

const checkUserType = (user, allowedTypes) => {
    if (!allowedTypes.includes(user.user_type)) {
        throw new Error(`Access denied. Required user type: ${allowedTypes.join(' or ')}`);
    }
};

// Get vehicle documents
export const getVehicleDocuments = async (req, res) => {
    try {
        const userId = req.user.id;
        const { vehicleId } = req.params;

        // Get vehicle
        const [vehicles] = await pool.execute(
            "SELECT * FROM vehicles WHERE id = ?",
            [vehicleId]
        );

        if (vehicles.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Vehicle not found"
            });
        }

        const vehicle = vehicles[0];

        // Check access
        if (vehicle.owner_id !== userId && 
            vehicle.driver_id !== userId && 
            req.user.user_type !== 'admin') {
            return res.status(403).json({
                success: false,
                message: "Access denied"
            });
        }

        const [documents] = await pool.execute(
            "SELECT * FROM vehicle_documents WHERE vehicle_id = ? ORDER BY created_at DESC",
            [vehicleId]
        );

        res.json({
            success: true,
            documents
        });
    } catch (error) {
        console.error("Error fetching vehicle documents:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch documents",
            error: error.message
        });
    }
};

// Upload vehicle document
export const uploadVehicleDocument = async (req, res) => {
    try {
        const userId = req.user.id;
        checkUserType(req.user, ['owner', 'admin']);
        const { vehicleId } = req.params;
        const {
            document_type,
            reference_number,
            image_url,
            image_order = 1,
            expiry_date,
            issue_date,
            issuing_authority,
            route_type,
            route,
            route_origin,
            route_destination
        } = req.body;

        if (!document_type || !image_url) {
            return res.status(400).json({
                success: false,
                message: "document_type and image_url are required"
            });
        }

        // Get vehicle
        const [vehicles] = await pool.execute(
            "SELECT * FROM vehicles WHERE id = ? AND owner_id = ?",
            [vehicleId, userId]
        );

        if (vehicles.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Vehicle not found or you don't own this vehicle"
            });
        }

        const [result] = await pool.execute(
            `INSERT INTO vehicle_documents (
                vehicle_id, document_type, reference_number, image_url, image_order,
                expiry_date, issue_date, issuing_authority, route_type,
                route, route_origin, route_destination, status
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
            [
                vehicleId, document_type, reference_number || null, image_url, image_order,
                expiry_date || null, issue_date || null, issuing_authority || null,
                route_type || null, route || null, route_origin || null, route_destination || null
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

// Update vehicle document
export const updateVehicleDocument = async (req, res) => {
    try {
        const userId = req.user.id;
        checkUserType(req.user, ['owner', 'admin']);
        const { documentId } = req.params;
        const updateData = req.body;

        // Get document
        const [documents] = await pool.execute(
            `SELECT vd.*, v.owner_id
             FROM vehicle_documents vd
             LEFT JOIN vehicles v ON vd.vehicle_id = v.id
             WHERE vd.id = ?`,
            [documentId]
        );

        if (documents.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Document not found"
            });
        }

        // Check access
        if (documents[0].owner_id !== userId && req.user.user_type !== 'admin') {
            return res.status(403).json({
                success: false,
                message: "Access denied"
            });
        }

        // Build update query
        const allowedFields = [
            'reference_number', 'image_url', 'image_order', 'expiry_date',
            'issue_date', 'issuing_authority', 'route_type', 'route',
            'route_origin', 'route_destination'
        ];
        const updates = [];
        const values = [];

        for (const field of allowedFields) {
            if (updateData[field] !== undefined) {
                updates.push(`${field} = ?`);
                values.push(updateData[field]);
            }
        }

        if (updates.length === 0) {
            return res.status(400).json({
                success: false,
                message: "No valid fields to update"
            });
        }

        values.push(documentId);
        await pool.execute(
            `UPDATE vehicle_documents SET ${updates.join(', ')} WHERE id = ?`,
            values
        );

        res.json({
            success: true,
            message: "Document updated successfully"
        });
    } catch (error) {
        console.error("Error updating document:", error);
        res.status(500).json({
            success: false,
            message: "Failed to update document",
            error: error.message
        });
    }
};

// Delete vehicle document
export const deleteVehicleDocument = async (req, res) => {
    try {
        const userId = req.user.id;
        checkUserType(req.user, ['owner', 'admin']);
        const { documentId } = req.params;

        // Get document
        const [documents] = await pool.execute(
            `SELECT vd.*, v.owner_id
             FROM vehicle_documents vd
             LEFT JOIN vehicles v ON vd.vehicle_id = v.id
             WHERE vd.id = ?`,
            [documentId]
        );

        if (documents.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Document not found"
            });
        }

        // Check access
        if (documents[0].owner_id !== userId && req.user.user_type !== 'admin') {
            return res.status(403).json({
                success: false,
                message: "Access denied"
            });
        }

        await pool.execute("DELETE FROM vehicle_documents WHERE id = ?", [documentId]);

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

// ============================================
// ADMIN ROUTES
// ============================================

// Verify vehicle document
export const verifyVehicleDocument = async (req, res) => {
    try {
        checkUserType(req.user, ['admin']);
        const { documentId } = req.params;
        const { status, notes } = req.body;

        if (!status) {
            return res.status(400).json({
                success: false,
                message: "status is required"
            });
        }

        await pool.execute(
            `UPDATE vehicle_documents 
             SET status = ?, notes = ?, verified_by = ?, verified_at = NOW()
             WHERE id = ?`,
            [status, notes || null, req.user.id, documentId]
        );

        res.json({
            success: true,
            message: "Document verification updated successfully"
        });
    } catch (error) {
        console.error("Error verifying document:", error);
        res.status(500).json({
            success: false,
            message: "Failed to verify document",
            error: error.message
        });
    }
};

// Get pending documents
export const getPendingDocuments = async (req, res) => {
    try {
        checkUserType(req.user, ['admin']);

        const { document_type, limit = 100, offset = 0 } = req.query;

        let query = `
            SELECT vd.*, v.registration_number, v.make, v.model,
                   u.name as owner_name
            FROM vehicle_documents vd
            LEFT JOIN vehicles v ON vd.vehicle_id = v.id
            LEFT JOIN users u ON v.owner_id = u.id
            WHERE vd.status = 'pending'
        `;
        const params = [];

        if (document_type) {
            query += ` AND vd.document_type = ?`;
            params.push(document_type);
        }

        query += ` ORDER BY vd.created_at DESC LIMIT ? OFFSET ?`;
        params.push(parseInt(limit), parseInt(offset));

        const [documents] = await pool.execute(query, params);

        res.json({
            success: true,
            documents
        });
    } catch (error) {
        console.error("Error fetching pending documents:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch documents",
            error: error.message
        });
    }
};

export default {
    getVehicleDocuments,
    uploadVehicleDocument,
    updateVehicleDocument,
    deleteVehicleDocument,
    verifyVehicleDocument,
    getPendingDocuments
};

