// WebSocket client service for real-time updates
import { io } from 'socket.io-client';
import { BASE_URL } from '../AddressSelection.js';

let socket = null;
let isConnected = false;

// Initialize Socket.io connection
export const initSocket = (token) => {
    if (socket && socket.connected) {
        console.log('Socket already connected');
        return socket;
    }

    // Get base URL without /api
    const wsBaseUrl = BASE_URL.replace('/api', '');

    socket = io(wsBaseUrl, {
        auth: {
            token: token || getAuthToken()
        },
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionAttempts: 5,
        reconnectionDelayMax: 5000
    });

    socket.on('connect', () => {
        isConnected = true;
        console.log('✅ WebSocket connected:', socket.id);
    });

    socket.on('disconnect', (reason) => {
        isConnected = false;
        console.log('❌ WebSocket disconnected:', reason);
    });

    socket.on('connect_error', (error) => {
        console.error('❌ WebSocket connection error:', error);
        isConnected = false;
    });

    socket.on('error', (error) => {
        console.error('❌ WebSocket error:', error);
    });

    return socket;
};

// Get authentication token from localStorage or cookies
function getAuthToken() {
    // Try to get token from localStorage
    const userProfile = localStorage.getItem('userProfile');
    if (userProfile) {
        try {
            const user = JSON.parse(userProfile);
            return user.token || null;
        } catch (e) {
            console.error('Error parsing user profile:', e);
        }
    }

    // Try to get from cookies
    const cookies = document.cookie.split(';');
    for (let cookie of cookies) {
        const [name, value] = cookie.trim().split('=');
        if (name === 'token') {
            return decodeURIComponent(value);
        }
    }

    return null;
}

// Join a booking room to receive updates
export const joinBookingRoom = (bookingId, callback) => {
    if (!socket || !socket.connected) {
        console.warn('Socket not connected, attempting to initialize...');
        initSocket();
        
        // Wait for connection
        socket.once('connect', () => {
            joinBookingRoom(bookingId, callback);
        });
        return;
    }

    socket.emit('join-booking', bookingId, (response) => {
        if (response && response.bookingId) {
            console.log(`✅ Joined booking room: ${response.bookingId}`);
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

// Listen for vehicle position updates
export const onVehiclePositionUpdate = (callback) => {
    if (!socket) {
        initSocket();
    }

    socket.on('vehicle-position-update', (data) => {
        console.log('📡 Received vehicle position update:', data);
        if (callback) callback(data);
    });
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
