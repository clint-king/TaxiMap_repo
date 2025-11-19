import express from "express";
import vehicleController from "../controllers/vehicleController.js";
import authenticateUser from "../Middleware/authenticateUser.js";

const router = express.Router();

// ============================================
// OWNER ROUTES
// ============================================
// Create vehicle
router.post("/", authenticateUser, vehicleController.createVehicle);

// Get owner's vehicles
router.get("/owner/my-vehicles", authenticateUser, vehicleController.getOwnerVehicles);

// Get vehicle details
router.get("/:vehicleId", authenticateUser, vehicleController.getVehicleDetails);

// Update vehicle
router.put("/:vehicleId", authenticateUser, vehicleController.updateVehicle);

// Delete vehicle
router.delete("/:vehicleId", authenticateUser, vehicleController.deleteVehicle);

// Assign driver to vehicle
router.put("/:vehicleId/assign-driver", authenticateUser, vehicleController.assignDriver);

// Unassign driver from vehicle
router.put("/:vehicleId/unassign-driver", authenticateUser, vehicleController.unassignDriver);

// ============================================
// DRIVER ROUTES
// ============================================
// Get driver's assigned vehicles
router.get("/driver/my-vehicles", authenticateUser, vehicleController.getDriverVehicles);

// ============================================
// PUBLIC/CLIENT ROUTES
// ============================================
// Search available vehicles
router.post("/search", vehicleController.searchVehicles);

// Get vehicle by route
router.get("/route/:routeId", vehicleController.getVehiclesByRoute);

// ============================================
// ADMIN ROUTES
// ============================================
// Get all vehicles
router.get("/admin/all", authenticateUser, vehicleController.getAllVehicles);

// Update vehicle status (admin)
router.put("/:vehicleId/admin/status", authenticateUser, vehicleController.updateVehicleStatusAdmin);

// Approve/reject/suspend vehicle (admin) - automatically adds to queue when approved
router.put("/:vehicleId/admin/approve", authenticateUser, vehicleController.approveVehicle);

// ============================================
// VEHICLE QUEUE ROUTES (Taxi Line System)
// ============================================
// Initialize/reorder vehicle queue (owner/admin)
router.post("/queue/initialize", authenticateUser, vehicleController.initializeVehicleQueue);

// Get vehicle queue (owner/admin)
router.get("/queue", authenticateUser, vehicleController.getVehicleQueue);

// Get next vehicle in queue (position 1) (owner/admin)
router.get("/queue/next", authenticateUser, vehicleController.getNextVehicleInQueue);

// Select next vehicle in line (admin) - moves vehicle from position 1 to end after booking completion
router.post("/queue/select-next", authenticateUser, vehicleController.selectNextVehicle);

export default router;

