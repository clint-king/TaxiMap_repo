import express from "express";
import ownerController from "../controllers/ownerController.js";
import authenticateUser from "../Middleware/authenticateUser.js";

const router = express.Router();

// ============================================
// OWNER ROUTES
// ============================================
// Get owner profile
router.get("/profile", authenticateUser, ownerController.getOwnerProfile);

// Update owner profile
router.put("/profile", authenticateUser, ownerController.updateOwnerProfile);

// Get owner statistics
router.get("/statistics", authenticateUser, ownerController.getOwnerStatistics);

// Get owner revenue
router.get("/revenue", authenticateUser, ownerController.getOwnerRevenue);

// ============================================
// ADMIN ROUTES
// ============================================
// Get all owners
router.get("/admin/all", authenticateUser, ownerController.getAllOwners);

// Verify owner
router.put("/:ownerId/verify", authenticateUser, ownerController.verifyOwner);

// Update owner status
router.put("/:ownerId/status", authenticateUser, ownerController.updateOwnerStatus);

// Banking details routes
router.get("/banking", authenticateUser, ownerController.getBankingDetails);
router.post("/banking", authenticateUser, ownerController.saveBankingDetails);
router.put("/banking", authenticateUser, ownerController.saveBankingDetails);

export default router;

