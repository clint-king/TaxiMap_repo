import express from "express";
import adminRoutes from './routes/adminRoutes.js';
import clientRoutes from './routes/clientRoutes.js';
import auth from './routes/AuthRoutes.js';
import feedbackRoutes from './routes/feedbackRoutes.js';
import helpRoutes from './routes/helpRoutes.js';
import contactRoutes from './routes/contactRoutes.js';
import bookingRoutes from './routes/bookingRoutes.js';
import vehicleRoutes from './routes/vehicleRoutes.js';
import driverRoutes from './routes/driverRoutes.js';
import ownerRoutes from './routes/ownerRoutes.js';
import paymentRoutes from './routes/paymentRoutes.js';
import documentRoutes from './routes/documentRoutes.js';
import trackingRoutes from './routes/trackingRoutes.js';
import bodyParser from "body-parser";
import cors from "cors";
import cookieParser from 'cookie-parser';
import config from "./config/configurations.js"; 
import path from 'path';
import { fileURLToPath } from 'url';
import "./config/jobs/bookingJob.js"


const port = config.port || 3000 ;
const app = express();

//middleware
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));
app.use(cors({
  origin: [config.frontend.url, "https://www.teksimap.co.za"], // Use config for frontend URL
  credentials: true
}));
app.use(cookieParser());

// Serve static files from uploads directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Health check endpoint
app.get('/health', (req, res) => {
    res.status(200).json({ 
        status: 'healthy', 
        timestamp: new Date().toISOString(),
        environment: config.env,
        uptime: process.uptime()
    });
});

//route
app.use("/admin", adminRoutes);
app.use("/client" , clientRoutes);
app.use("/auth",auth );
app.use("/feedback", feedbackRoutes);
app.use("/help", helpRoutes);
app.use("/contact", contactRoutes);
// Booking system routes
app.use("/api/bookings", bookingRoutes);
app.use("/api/vehicles", vehicleRoutes);
app.use("/api/drivers", driverRoutes);
app.use("/api/owners", ownerRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/documents", documentRoutes);
app.use("/api/tracking", trackingRoutes);



app.listen(port , ()=>{
    console.log(`🚀 Server running on port ${port}`);
    console.log(`🌍 Environment: ${config.env}`);
    console.log(`🔗 Frontend URL: ${config.frontend.url}`);
    console.log(`📊 Database: ${config.database.host}:${config.database.port}/${config.database.name}`);
    console.log('✅ Server is ready to handle requests!');
})