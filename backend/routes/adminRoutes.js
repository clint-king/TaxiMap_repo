import express from "express";
import {AddTaxiRank , listTaxiRanks, getTaxiRank, getUniqueRouteName , listRoutes} from "../controllers/adminController.js";


const router = express.Router();

router.post("/addTaxiRank", AddTaxiRank);
router.get("/listTaxiRanks" , listTaxiRanks);
router.post("/getTaxiRank" , getTaxiRank);
router.get("/getUniqueRouteName" , getUniqueRouteName);
router.post("/listRoutes" , listRoutes);


export default router;