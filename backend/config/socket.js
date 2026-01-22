// Socket.io WebSocket server configuration
import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import config from './configurations.js';

let io = null;

// Initialize Socket.io server
export const initSocket = (httpServer) => {
    io = new Server(httpServer, {
        cors: {
            origin: process.env.FRONTEND_URL || "http://localhost:5173",
            methods: ["GET", "POST"],
            credentials: true
        },
        transports: ['websocket', 'polling'],
        pingTimeout: 60000,
        pingInterval: 25000
    });

    // Authentication middleware for Socket.io
    io.use(async (socket, next) => {
        try {
            // Extract token from handshake auth or query
            const token = socket.handshake.auth?.token || socket.handshake.query?.token;
            
            if (!token) {
                return next(new Error('Authentication token required'));
            }

            // Verify JWT token directly (same as authenticateUser middleware)
            try {
                const decoded = jwt.verify(token, config.jwt.secret);
                socket.user = decoded;
                next();
            } catch (error) {
                console.error('Socket authentication error:', error);
                next(new Error('Invalid or expired token'));
            }
        } catch (error) {
            console.error('Socket authentication error:', error);
            next(new Error('Authentication failed'));
        }
    });

    // Handle connections
    io.on('connection', (socket) => {
        console.log(`✅ Client connected: ${socket.id} (User: ${socket.user?.id || 'unknown'})`);

        // Join booking room for tracking
        socket.on('join-booking', async (bookingId) => {
            if (!bookingId) {
                socket.emit('error', { message: 'Booking ID required' });
                return;
            }

            const room = `booking:${bookingId}`;
            socket.join(room);
            console.log(`👤 User ${socket.user?.id} joined room: ${room}`);
            
            socket.emit('joined-booking', { bookingId, room });
        });

        // Leave booking room
        socket.on('leave-booking', (bookingId) => {
            const room = `booking:${bookingId}`;
            socket.leave(room);
            console.log(`👤 User ${socket.user?.id} left room: ${room}`);
        });

        // Handle disconnection
        socket.on('disconnect', (reason) => {
            console.log(`❌ Client disconnected: ${socket.id} (Reason: ${reason})`);
        });

        // Handle errors
        socket.on('error', (error) => {
            console.error(`❌ Socket error for ${socket.id}:`, error);
        });
    });

    console.log('✅ Socket.io server initialized');
    return io;
};

// Get Socket.io instance
export const getIO = () => {
    if (!io) {
        throw new Error('Socket.io not initialized. Call initSocket first.');
    }
    return io;
};

// Broadcast vehicle position update to all clients tracking a booking
export const broadcastVehiclePosition = (bookingId, positionData) => {
    if (!io) {
        console.warn('Socket.io not initialized, cannot broadcast');
        return;
    }

    const room = `booking:${bookingId}`;
    io.to(room).emit('vehicle-position-update', {
        bookingId,
        ...positionData,
        timestamp: new Date().toISOString()
    });

    console.log(`📡 Broadcasted vehicle position update to room: ${room}`);
};

// Broadcast calculated distance to all clients tracking a booking
export const broadcastCalculatedDistance = (bookingId, distanceData) => {
    if (!io) {
        console.warn('Socket.io not initialized, cannot broadcast');
        return;
    }

    const room = `booking:${bookingId}`;
    io.to(room).emit('distance-update', {
        bookingId,
        ...distanceData,
        timestamp: new Date().toISOString()
    });

    console.log(`📡 Broadcasted distance update to room: ${room}`);
};

export default io;
