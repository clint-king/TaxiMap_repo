import express from "express";
import adminRoutes from './routes/adminRoutes.js';
import bodyParser from "body-parser";
import cors from "cors";
const port = 3000;
const app = express();

//middleware
app.use(bodyParser.json({ limit: '50mb' }));
app.use(cors());
app.use(express.urlencoded({limit:'50mb', extended: true }));
app.use(express.json({limit:'50mb'}));

//route
app.use("/admin", adminRoutes);


app.listen(port , ()=>{
    console.log(`Server running on server ${port}`);
})