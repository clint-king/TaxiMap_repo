import express from "express";
import authenticateUser from "../Middleware/authenticateUser.js";
import trackingController from "../controllers/trackingController.js";

const router = express.Router();

// Route to get waypoints (pickup and dropoff coordinates)
router.get("/waypoints", authenticateUser, trackingController.getBookingWaypoints);

export default router;