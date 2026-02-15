// SIMPLIFIED Socket.io WebSocket server configuration
import { Server } from 'socket.io';

let io = null;

// Initialize Socket.io server - SIMPLIFIED (no auth for now)
export const initSocket = (httpServer) => {
    console.log('🔌 [WEBSOCKET] Initializing Socket.io server...');
    
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

    // Handle connections - SIMPLIFIED
    io.on('connection', (socket) => {
        console.log('✅ [WEBSOCKET] Client connected:', socket.id);

        // Join booking room for tracking - SIMPLIFIED
        socket.on('join-booking', (bookingId) => {
            console.log('📥 [WEBSOCKET] Received join-booking request:', { socketId: socket.id, bookingId });
            
            if (!bookingId) {
                console.error('❌ [WEBSOCKET] No bookingId provided');
                socket.emit('error', { message: 'Booking ID required' });
                return;
            }

            const room = `booking:${bookingId}`;
            socket.join(room);
            console.log(`✅ [WEBSOCKET] Socket ${socket.id} joined room: ${room}`);
            
            socket.emit('joined-booking', { bookingId, room });
            console.log(`📤 [WEBSOCKET] Sent joined-booking confirmation to ${socket.id}`);
        });

        // Leave booking room
        socket.on('leave-booking', (bookingId) => {
            console.log('📥 [WEBSOCKET] Received leave-booking request:', { socketId: socket.id, bookingId });
            const room = `booking:${bookingId}`;
            socket.leave(room);
            console.log(`👋 [WEBSOCKET] Socket ${socket.id} left room: ${room}`);
        });

        // Handle disconnection
        socket.on('disconnect', (reason) => {
            console.log(`❌ [WEBSOCKET] Client disconnected: ${socket.id} (Reason: ${reason})`);
        });

        // Handle errors
        socket.on('error', (error) => {
            console.error(`❌ [WEBSOCKET] Socket error for ${socket.id}:`, error);
        });
    });

    console.log('✅ [WEBSOCKET] Socket.io server initialized successfully');
    return io;
};

// Get Socket.io instance
export const getIO = () => {
    if (!io) {
        throw new Error('Socket.io not initialized. Call initSocket first.');
    }
    return io;
};

// SIMPLIFIED: Broadcast vehicle position update to all clients tracking a booking
export const broadcastVehiclePosition = (bookingId, positionData) => {
    console.log('📡 [WEBSOCKET] broadcastVehiclePosition called:', { bookingId, positionData });
    
    if (!io) {
        console.error('❌ [WEBSOCKET] Socket.io not initialized, cannot broadcast');
        return;
    }

    const room = `booking:${bookingId}`;
    const clientsInRoom = io.sockets.adapter.rooms.get(room);
    const clientCount = clientsInRoom ? clientsInRoom.size : 0;
    
    console.log(`📡 [WEBSOCKET] Broadcasting to room "${room}" (${clientCount} clients connected)`);
    
    const message = {
        bookingId,
        ...positionData,
        timestamp: new Date().toISOString()
    };
    
    console.log('📤 [WEBSOCKET] Sending vehicle-position-update:', message);
    
    io.to(room).emit('vehicle-position-update', message);
    
    console.log(`✅ [WEBSOCKET] Broadcasted vehicle position update to room: ${room}`);
};

// SIMPLIFIED: Broadcast calculated distance (keeping for compatibility, but simplified)
export const broadcastCalculatedDistance = (bookingId, distanceData) => {
    console.log('📡 [WEBSOCKET] broadcastCalculatedDistance called:', { bookingId, distanceData });
    
    if (!io) {
        console.error('❌ [WEBSOCKET] Socket.io not initialized, cannot broadcast');
        return;
    }

    const room = `booking:${bookingId}`;
    const clientsInRoom = io.sockets.adapter.rooms.get(room);
    const clientCount = clientsInRoom ? clientsInRoom.size : 0;
    
    console.log(`📡 [WEBSOCKET] Broadcasting distance to room "${room}" (${clientCount} clients connected)`);
    
    const message = {
        bookingId,
        ...distanceData,
        timestamp: new Date().toISOString()
    };
    
    io.to(room).emit('distance-update', message);
    console.log(`✅ [WEBSOCKET] Broadcasted distance update to room: ${room}`);
};

export default io;
