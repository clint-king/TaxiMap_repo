import express from "express";
import documentController from "../controllers/documentController.js";
import authenticateUser from "../Middleware/authenticateUser.js";

const router = express.Router();

// ============================================
// VEHICLE DOCUMENT ROUTES (OWNER)
// ============================================
// Get vehicle documents
router.get("/vehicle/:vehicleId", authenticateUser, documentController.getVehicleDocuments);

// Upload vehicle document
router.post("/vehicle/:vehicleId", authenticateUser, documentController.uploadVehicleDocument);

// Update vehicle document
router.put("/vehicle/:documentId", authenticateUser, documentController.updateVehicleDocument);

// Delete vehicle document
router.delete("/vehicle/:documentId", authenticateUser, documentController.deleteVehicleDocument);

// ============================================
// ADMIN ROUTES
// ============================================
// Verify vehicle document
router.put("/vehicle/:documentId/verify", authenticateUser, documentController.verifyVehicleDocument);

// Get all pending documents
router.get("/admin/pending", authenticateUser, documentController.getPendingDocuments);

export default router;

