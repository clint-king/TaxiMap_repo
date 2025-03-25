import express from "express";
import {findingPath} from "../controllers/clientController.js";

const router = express.Router();


router.post("/findingPath", findingPath);

export default router;