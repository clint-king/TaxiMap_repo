import express from "express";
import adminRoutes from './routes/adminRoutes.js';
import clientRoutes from './routes/clientRoutes.js';
import auth from './routes/AuthRoutes.js';
import feedbackRoutes from './routes/feedbackRoutes.js';
import helpRoutes from './routes/helpRoutes.js';
import contactRoutes from './routes/contactRoutes.js';
import bodyParser from "body-parser";
import cors from "cors";
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables from .env file
dotenv.config({ path: './config/development.env' });

const port = process.env.PORT || 3000 ;
const app = express();

//middleware
app.use(bodyParser.json({ limit: '50mb' }));
app.use(cors({
    origin: ["http://localhost:5174","http://localhost:5173", "https://www.teksimap.co.za" ], // Allow Vite frontend
    methods: "GET, POST, PUT, DELETE",
    credentials: true  // Allow cookies & auth headers
}));
app.use(express.urlencoded({limit:'50mb', extended: true }));
app.use(express.json({limit:'50mb'}));
app.use(cookieParser());

// Serve static files from uploads directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

//route
app.use("/admin", adminRoutes);
app.use("/client" , clientRoutes);
app.use("/auth",auth );
app.use("/feedback", feedbackRoutes);
app.use("/help", helpRoutes);
app.use("/contact", contactRoutes);



app.listen(port , ()=>{
    console.log(`Server running on server ${port}`);
})