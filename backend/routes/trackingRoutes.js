import express from "express";
import authenticateUser from "../Middleware/authenticateUser.js";
import trackingController from "../controllers/trackingController.js";

const router = express.Router();

// Route to get waypoints (pickup and dropoff coordinates)
router.get(
  "/:bookingId/waypoints",
  authenticateUser,
  trackingController.getBookingWaypoints
);

// Route to update vehicle position
router.post(
  "/update-position",
  authenticateUser,
  trackingController.updateVehiclePosition
);

// Route to confirm dropoff (re-checks distance before finalizing)
router.post(
  "/confirm-dropoff",
  authenticateUser,
  trackingController.confirmDropoff
);

// Distance calculation route removed - using visual map instead

export default router;
