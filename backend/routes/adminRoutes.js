import express from "express";
import {AddTaxiRank , getRoute , listTaxiRanks, getTaxiRank, getUniqueRouteName , listRoutes, AddRoute, deleteRoute , deleteTaxiRank} from "../controllers/adminController.js";
import adminFeedbackController from "../controllers/adminFeedbackController.js";
import adminRouteController from "../controllers/adminRouteController.js";
import adminReportsController from "../controllers/adminReportsController.js";
import authenticateUser from "../Middleware/authenticateUser.js";



const router = express.Router();

// All admin routes require authentication
router.use(authenticateUser);



router.post("/addTaxiRank", AddTaxiRank);
router.get("/listTaxiRanks" , listTaxiRanks);
router.post("/getTaxiRank" , getTaxiRank);
router.get("/getUniqueRouteName" , getUniqueRouteName);
router.post("/listRoutes" , listRoutes);
router.post("/AddRoute" , AddRoute);
router.post("/getRoute" , getRoute);
router.post("/deleteRoute" , deleteRoute);
router.post("/deleteTaxiRank" , deleteTaxiRank);

// Feedback management routes
router.get("/feedback", adminFeedbackController.getAllFeedback);
router.put("/feedback/:id", adminFeedbackController.updateFeedbackStatus);

// FAQ management routes
router.get("/faqs", adminFeedbackController.getAllFAQs);
router.post("/faqs", adminFeedbackController.createFAQ);
router.put("/faqs/:id", adminFeedbackController.updateFAQ);
router.delete("/faqs/:id", adminFeedbackController.deleteFAQ);

// User questions management routes
router.get("/user-questions", adminFeedbackController.getAllUserQuestions);
router.put("/user-questions/:id", adminFeedbackController.answerUserQuestion);

// Route approval management routes
router.get("/pending-routes", adminRouteController.getPendingRoutes);
router.get("/pending-routes/:routeId", adminRouteController.getPendingRouteDetails);
router.put("/pending-routes/:routeId/approve", adminRouteController.approveRoute);
router.put("/pending-routes/:routeId/reject", adminRouteController.rejectRoute);

// Contributors management routes
router.get("/contributors", adminRouteController.getAllContributors);

// Reports and analytics routes
router.get("/reports", adminReportsController.getAnalyticsData);
router.get("/reports/user-activities", adminReportsController.getUserActivityDetails);
router.get("/reports/route-usage", adminReportsController.getRouteUsageDetails);

export default router;