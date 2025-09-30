import express from "express";
import {findingPath , AddPendingRoute , listOfAllRoutes} from "../controllers/clientController.js";
import authenticateUser from '../Middleware/authenticateUser.js';

const router = express.Router();


router.post("/findingPath",  findingPath);
router.post("/AddPendingRoute" ,  AddPendingRoute);
router.get("/listOfAllRoutes" , listOfAllRoutes);

export default router;