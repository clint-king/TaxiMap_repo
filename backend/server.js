import express from "express";
import adminRoutes from './routes/adminRoutes.js';
import bodyParser from "body-parser";
import cors from "cors";
const port = 3000;
const app = express();

//middleware
app.use(bodyParser.json());
app.use(cors());

//route
app.use("/admin", adminRoutes);


app.listen(port , ()=>{
    console.log(`Server running on server ${port}`);
})