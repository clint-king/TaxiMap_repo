import express from "express";
import {AddTaxiRank , getRoute , listTaxiRanks, getTaxiRank, getUniqueRouteName , listRoutes, AddRoute} from "../controllers/adminController.js";


const router = express.Router();

router.post("/addTaxiRank", AddTaxiRank);
router.get("/listTaxiRanks" , listTaxiRanks);
router.post("/getTaxiRank" , getTaxiRank);
router.get("/getUniqueRouteName" , getUniqueRouteName);
router.post("/listRoutes" , listRoutes);
router.post("/AddRoute" , AddRoute);
router.post("/getRoute" , getRoute);


export default router;