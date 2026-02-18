import express from "express";
import driverController from "../controllers/driverController.js";
import authenticateUser from "../Middleware/authenticateUser.js";

const router = express.Router();

// Debug middleware to log all requests to driver routes
router.use((req, res, next) => {
    console.log(`[Driver Routes] ${req.method} ${req.path}`);
    next();
});

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
// Create driver (owner creates driver account and profile)
router.post("/owner/create", authenticateUser, driverController.createDriver);

// Get owner's drivers
router.get("/owner/my-drivers", authenticateUser, driverController.getOwnerDrivers);

// Get available drivers for assignment (owner)
router.get("/owner/available-for-assignment", authenticateUser, driverController.getAvailableDriversForAssignment);

// Update driver status (owner can only change status if driver is verified)
router.put("/owner/:driverId/status", authenticateUser, driverController.updateDriverStatusByOwner);

// ============================================
// ADMIN ROUTES
// ============================================
// Get all drivers (must come before /admin/:driverId to avoid route conflicts)
router.get("/admin/all", authenticateUser, driverController.getAllDrivers);

// Get driver details (admin)
// Note: This route must come after /admin/all to avoid matching "all" as a driverId
router.get("/admin/:driverId", authenticateUser, driverController.getDriverDetails);

// Verify driver
router.put("/:driverId/verify", authenticateUser, driverController.verifyDriver);

// Update driver status
router.put("/:driverId/status", authenticateUser, driverController.updateDriverStatus);

export default router;

