// Redis client configuration for vehicle position tracking
import { createClient } from 'redis';
import config from './configurations.js';

const redisClient = createClient({
    socket: {
        host: config.redis?.host || process.env.REDIS_HOST || 'localhost',
        port: config.redis?.port || process.env.REDIS_PORT || 6379,
        reconnectStrategy: (retries) => {
            if (retries > 10) {
                console.error('Redis connection failed after 10 retries');
                return new Error('Redis connection failed');
            }
            return Math.min(retries * 100, 3000);
        }
    }
});

redisClient.on('error', (err) => {
    console.error('Redis Client Error:', err);
});

redisClient.on('connect', () => {
    console.log('✅ Redis Client: Connecting...');
});

redisClient.on('ready', () => {
    console.log('✅ Redis Client: Ready');
});

redisClient.on('reconnecting', () => {
    console.log('🔄 Redis Client: Reconnecting...');
});

// Connect to Redis
const connectRedis = async () => {
    try {
        if (!redisClient.isOpen) {
            await redisClient.connect();
        }
    } catch (error) {
        console.error('Failed to connect to Redis:', error);
    }
};

// Initialize connection
connectRedis();

// Redis helper functions for vehicle tracking
export const redisHelpers = {
    // Store vehicle position for a booking
    async setVehiclePosition(bookingId, vehiclePosition, routePoints = null) {
        try {
            const key = `vehicle:position:${bookingId}`;
            const data = {
                position: vehiclePosition,
                routePoints: routePoints,
                timestamp: new Date().toISOString()
            };
            // Store with 1 hour expiration (adjust as needed)
            await redisClient.setEx(key, 3600, JSON.stringify(data));
            return true;
        } catch (error) {
            console.error('Error setting vehicle position in Redis:', error);
            return false;
        }
    },

    // Get vehicle position for a booking
    async getVehiclePosition(bookingId) {
        try {
            const key = `vehicle:position:${bookingId}`;
            const data = await redisClient.get(key);
            return data ? JSON.parse(data) : null;
        } catch (error) {
            console.error('Error getting vehicle position from Redis:', error);
            return null;
        }
    },

    // Delete vehicle position for a booking
    async deleteVehiclePosition(bookingId) {
        try {
            const key = `vehicle:position:${bookingId}`;
            await redisClient.del(key);
            return true;
        } catch (error) {
            console.error('Error deleting vehicle position from Redis:', error);
            return false;
        }
    },

    // Subscribe clients tracking a booking
    async addTrackingClient(bookingId, clientId) {
        try {
            const key = `booking:trackers:${bookingId}`;
            await redisClient.sAdd(key, clientId);
            // Set expiration for tracking list (2 hours)
            await redisClient.expire(key, 7200);
            return true;
        } catch (error) {
            console.error('Error adding tracking client:', error);
            return false;
        }
    },

    // Remove client from tracking a booking
    async removeTrackingClient(bookingId, clientId) {
        try {
            const key = `booking:trackers:${bookingId}`;
            await redisClient.sRem(key, clientId);
            return true;
        } catch (error) {
            console.error('Error removing tracking client:', error);
            return false;
        }
    },

    // Get all clients tracking a booking
    async getTrackingClients(bookingId) {
        try {
            const key = `booking:trackers:${bookingId}`;
            const clients = await redisClient.sMembers(key);
            return clients || [];
        } catch (error) {
            console.error('Error getting tracking clients:', error);
            return [];
        }
    }
};

export { redisClient, connectRedis };
export default redisClient;
