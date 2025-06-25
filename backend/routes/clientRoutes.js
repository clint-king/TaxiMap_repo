import express from "express";
import {findingPath , AddPendingRoute} from "../controllers/clientController.js";

const router = express.Router();


router.post("/findingPath", findingPath);
router.post("/AddPendingRoute" , AddPendingRoute);

export default router;