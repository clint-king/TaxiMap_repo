import express from "express";
import {AddTaxiRank , listTaxiRanks} from "../controllers/adminController.js";


const router = express.Router();

router.post("/addTaxiRank", AddTaxiRank);
router.get("/listTaxiRanks" , listTaxiRanks);

export default router;