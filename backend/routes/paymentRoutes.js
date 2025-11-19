import express from "express";
import paymentController from "../controllers/paymentController.js";
import authenticateUser from "../Middleware/authenticateUser.js";

const router = express.Router();

// ============================================
// CLIENT ROUTES
// ============================================
// Create payment
router.post("/", authenticateUser, paymentController.createPayment);

// Get user's payments
router.get("/my-payments", authenticateUser, paymentController.getMyPayments);

// Get payment details
router.get("/:paymentId", authenticateUser, paymentController.getPaymentDetails);

// Process payment callback (from payment gateway)
router.post("/callback", paymentController.processPaymentCallback);

// ============================================
// OWNER ROUTES
// ============================================
// Get owner's payments
router.get("/owner/payments", authenticateUser, paymentController.getOwnerPayments);

// ============================================
// ADMIN ROUTES
// ============================================
// Get all payments
router.get("/admin/all", authenticateUser, paymentController.getAllPayments);

// Process refund
router.post("/:paymentId/refund", authenticateUser, paymentController.processRefund);

export default router;

