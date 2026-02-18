// SIMPLIFIED WebSocket client service for real-time updates
import { io } from 'socket.io-client';
import { BASE_URL } from '../AddressSelection.js';

let socket = null;
let isConnected = false;

// SIMPLIFIED: Initialize Socket.io connection (no auth for now)
export const initSocket = () => {
    console.log('🔌 [CLIENT] Initializing WebSocket connection...');
    
    if (socket && socket.connected) {
        console.log('✅ [CLIENT] Socket already connected:', socket.id);
        return socket;
    }

    // Get base URL without /api
    const wsBaseUrl = BASE_URL.replace('/api', '');
    console.log('🔗 [CLIENT] Connecting to:', wsBaseUrl);

    socket = io(wsBaseUrl, {
        // SIMPLIFIED: No auth for now
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionAttempts: 5,
        reconnectionDelayMax: 5000
    });

    socket.on('connect', () => {
        isConnected = true;
        console.log('✅ [CLIENT] WebSocket connected! Socket ID:', socket.id);
    });

    socket.on('disconnect', (reason) => {
        isConnected = false;
        console.log('❌ [CLIENT] WebSocket disconnected. Reason:', reason);
    });

    socket.on('connect_error', (error) => {
        console.error('❌ [CLIENT] WebSocket connection error:', error);
        isConnected = false;
    });

    socket.on('error', (error) => {
        console.error('❌ [CLIENT] WebSocket error:', error);
    });

    return socket;
};

// SIMPLIFIED: Join a booking room to receive updates
export const joinBookingRoom = (bookingId, callback) => {
    console.log('📥 [CLIENT] joinBookingRoom called with bookingId:', bookingId);
    
    if (!socket || !socket.connected) {
        console.log('⚠️ [CLIENT] Socket not connected, initializing...');
        initSocket();
        
        // Wait for connection
        socket.once('connect', () => {
            console.log('✅ [CLIENT] Socket connected, now joining room...');
            joinBookingRoom(bookingId, callback);
        });
        return;
    }

    console.log('📤 [CLIENT] Emitting join-booking for bookingId:', bookingId);
    socket.emit('join-booking', bookingId, (response) => {
        console.log('📥 [CLIENT] Received joined-booking response:', response);
        if (response && response.bookingId) {
            console.log(`✅ [CLIENT] Successfully joined booking room: ${response.bookingId}`);
            if (callback) callback(response);
        }
    });
};

// Leave a booking room
export const leaveBookingRoom = (bookingId) => {
    if (!socket || !socket.connected) {
        return;
    }

    socket.emit('leave-booking', bookingId);
    console.log(`👋 Left booking room: ${bookingId}`);
};

// SIMPLIFIED: Listen for vehicle position updates
export const onVehiclePositionUpdate = (callback) => {
    console.log('👂 [CLIENT] Setting up vehicle position update listener...');
    
    if (!socket) {
        console.log('⚠️ [CLIENT] Socket not initialized, initializing now...');
        initSocket();
    }

    socket.on('vehicle-position-update', (data) => {
        console.log('📡 [CLIENT] ⭐ RECEIVED VEHICLE POSITION UPDATE ⭐');
        console.log('📡 [CLIENT] Vehicle position data:', data);
        console.log('📡 [CLIENT] Booking ID:', data.bookingId);
        console.log('📡 [CLIENT] Vehicle Position:', data.vehiclePosition);
        console.log('📡 [CLIENT] Timestamp:', data.timestamp);
        
        if (callback) {
            console.log('📡 [CLIENT] Calling callback with data...');
            callback(data);
        }
    });
    
    console.log('✅ [CLIENT] Vehicle position update listener set up');
};

// Listen for distance calculation updates
export const onDistanceUpdate = (callback) => {
    if (!socket) {
        initSocket();
    }

    socket.on('distance-update', (data) => {
        console.log('📡 Received distance update:', data);
        if (callback) callback(data);
    });
};

// Remove listeners
export const removeVehiclePositionListener = () => {
    if (socket) {
        socket.off('vehicle-position-update');
    }
};

export const removeDistanceListener = () => {
    if (socket) {
        socket.off('distance-update');
    }
};

// Disconnect socket
export const disconnectSocket = () => {
    if (socket) {
        socket.disconnect();
        socket = null;
        isConnected = false;
        console.log('🔌 WebSocket disconnected');
    }
};

// Get socket connection status
export const isSocketConnected = () => {
    return isConnected && socket && socket.connected;
};

// Get socket instance
export const getSocket = () => {
    return socket;
};

export default {
    initSocket,
    joinBookingRoom,
    leaveBookingRoom,
    onVehiclePositionUpdate,
    onDistanceUpdate,
    removeVehiclePositionListener,
    removeDistanceListener,
    disconnectSocket,
    isSocketConnected,
    getSocket
};
