import express from "express";
import {findingPath , AddPendingRoute , listOfAllRoutes} from "../controllers/clientController.js";
import authenticateUser from '../Middleware/authenticateUser.js';

const router = express.Router();


router.post("/findingPath", authenticateUser, findingPath);
router.post("/AddPendingRoute" , authenticateUser , AddPendingRoute);
router.get("/listOfAllRoutes" , authenticateUser , listOfAllRoutes);

export default router;