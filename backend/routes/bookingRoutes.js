import express from "express";
import bookingController from "../controllers/bookingController.js";
import authenticateUser from "../Middleware/authenticateUser.js";

const router = express.Router();

// ============================================
// PUBLIC ROUTES (No authentication required)
// ============================================
// Get public pending bookings for display on booking-public page
router.get("/public/pending", bookingController.getPublicPendingBookings);

// ============================================
// CLIENT ROUTES (Passenger/Booking Creator)
// ============================================
// Create a route-based booking (automatically selects next vehicle in queue)
router.post("/route-based", authenticateUser, bookingController.createRouteBasedBooking);

// Create a custom booking (requires all details from user)
router.post("/custom", authenticateUser, bookingController.createCustomBooking);

// Get user's bookings (client view)
router.get("/my-bookings", authenticateUser, bookingController.getMyBookings);

// Get booking details
router.get("/:bookingId", authenticateUser, bookingController.getBookingDetails);

// Cancel booking
router.put("/:bookingId/cancel", authenticateUser, bookingController.cancelBooking);

// Add passenger to booking
router.post("/:bookingId/passengers", authenticateUser, bookingController.addPassenger);

// Remove passenger from booking
router.delete("/:bookingId/passengers/:passengerId", authenticateUser, bookingController.removePassenger);

// Add parcel to booking
router.post("/:bookingId/parcels", authenticateUser, bookingController.addParcel);

// Remove parcel from booking
router.delete("/:bookingId/parcels/:parcelId", authenticateUser, bookingController.removeParcel);

// Rate booking
router.post("/:bookingId/rate", authenticateUser, bookingController.rateBooking);

// ============================================
// DRIVER ROUTES
// ============================================
// Get driver's assigned bookings
router.get("/driver/my-bookings", authenticateUser, bookingController.getDriverBookings);

// Update booking status (driver)
router.put("/:bookingId/driver/status", authenticateUser, bookingController.updateBookingStatusDriver);

// Mark route point as completed
router.put("/:bookingId/route-points/:pointId/complete", authenticateUser, bookingController.completeRoutePoint);

router.get("/existing-route-details", authenticateUser, bookingController.getExistingRouteDetails);

// ============================================
// OWNER ROUTES
// ============================================
// Get owner's bookings
router.get("/owner/my-bookings", authenticateUser, bookingController.getOwnerBookings);

// Assign driver to booking
router.put("/:bookingId/assign-driver", authenticateUser, bookingController.assignDriver);

// Update booking (owner)
router.put("/:bookingId", authenticateUser, bookingController.updateBooking);

// ============================================
// ADMIN ROUTES
// ============================================
// Get all bookings (admin)
router.get("/admin/all", authenticateUser, bookingController.getAllBookings);

// Get booking statistics
router.get("/admin/statistics", authenticateUser, bookingController.getBookingStatistics);

// Execute booking (admin) - creates booking and moves vehicle to end of queue
router.post("/admin/execute", authenticateUser, bookingController.executeBookingAdmin);

// Update booking status (admin)
router.put("/:bookingId/admin/status", authenticateUser, bookingController.updateBookingStatusAdmin);

export default router;

