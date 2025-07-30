import express from "express";
import adminRoutes from './routes/adminRoutes.js';
import clientRoutes from './routes/clientRoutes.js';
import auth from './routes/AuthRoutes.js';
import bodyParser from "body-parser";
import cors from "cors";
import cookieParser from 'cookie-parser';

const port = process.env.PORT || 3000 ;
const app = express();

//middleware
app.use(bodyParser.json({ limit: '50mb' }));
app.use(cors({
    origin: ["http://localhost:5174","http://localhost:5173"], // Allow Vite frontend
    methods: "GET, POST, PUT, DELETE",
    credentials: true  // Allow cookies & auth headers
}));
app.use(express.urlencoded({limit:'50mb', extended: true }));
app.use(express.json({limit:'50mb'}));
app.use(cookieParser());
//route
app.use("/admin", adminRoutes);
app.use("/client" , clientRoutes);
app.use("/auth",auth );



app.listen(port , ()=>{
    console.log(`Server running on server ${port}`);
})