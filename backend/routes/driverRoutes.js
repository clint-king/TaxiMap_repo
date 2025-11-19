import express from "express";
import driverController from "../controllers/driverController.js";
import authenticateUser from "../Middleware/authenticateUser.js";

const router = express.Router();

// ============================================
// DRIVER ROUTES
// ============================================
// Get driver profile
router.get("/profile", authenticateUser, driverController.getDriverProfile);

// Update driver profile
router.put("/profile", authenticateUser, driverController.updateDriverProfile);

// Get driver documents
router.get("/documents", authenticateUser, driverController.getDriverDocuments);

// Upload driver document
router.post("/documents", authenticateUser, driverController.uploadDriverDocument);

// Delete driver document
router.delete("/documents/:documentId", authenticateUser, driverController.deleteDriverDocument);

// Get driver statistics
router.get("/statistics", authenticateUser, driverController.getDriverStatistics);

// ============================================
// OWNER ROUTES
// ============================================
// Get owner's drivers
router.get("/owner/my-drivers", authenticateUser, driverController.getOwnerDrivers);

// ============================================
// ADMIN ROUTES
// ============================================
// Get all drivers
router.get("/admin/all", authenticateUser, driverController.getAllDrivers);

// Verify driver
router.put("/:driverId/verify", authenticateUser, driverController.verifyDriver);

// Update driver status
router.put("/:driverId/status", authenticateUser, driverController.updateDriverStatus);

export default router;

