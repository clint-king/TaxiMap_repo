// Redis client configuration for vehicle position tracking
import { createClient } from 'redis';
import config from './configurations.js';

// Check if Redis is configured
const redisHost = config.redis?.host || process.env.REDIS_HOST;
const redisPort = config.redis?.port || process.env.REDIS_PORT || 6379;

let redisClient = null;
let redisAvailable = false;

// Only create Redis client if host is configured
if (redisHost) {
    redisClient = createClient({
        socket: {
            host: redisHost,
            port: redisPort,
            connectTimeout: 5000, // 5 second timeout
            reconnectStrategy: (retries) => {
                if (retries > 5) {
                    console.warn('⚠️  Redis: Connection failed after 5 retries. Continuing without Redis cache.');
                    redisAvailable = false;
                    return false; // Stop reconnecting
                }
                return Math.min(retries * 200, 2000);
            }
        }
    });

    redisClient.on('error', (err) => {
        console.warn('⚠️  Redis Client Error:', err.message);
        redisAvailable = false;
    });

    redisClient.on('connect', () => {
        console.log('🔄 Redis Client: Connecting...');
    });

    redisClient.on('ready', () => {
        console.log('✅ Redis Client: Ready');
        redisAvailable = true;
    });

    redisClient.on('reconnecting', () => {
        console.log('🔄 Redis Client: Reconnecting...');
    });

    redisClient.on('end', () => {
        console.warn('⚠️  Redis Client: Connection ended');
        redisAvailable = false;
    });
} else {
    console.log('ℹ️  Redis: Not configured (REDIS_HOST not set). Vehicle position caching disabled.');
}

// Connect to Redis (with graceful failure handling)
const connectRedis = async () => {
    if (!redisClient) {
        return; // Redis not configured
    }
    
    try {
        if (!redisClient.isOpen) {
            await Promise.race([
                redisClient.connect(),
                new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('Connection timeout')), 5000)
                )
            ]);
            redisAvailable = true;
            console.log('✅ Redis: Connected successfully');
        }
    } catch (error) {
        console.warn('⚠️  Redis: Failed to connect. Continuing without Redis cache:', error.message);
        redisAvailable = false;
        // Don't throw - allow app to continue without Redis
    }
};

// Initialize connection (non-blocking)
if (redisClient) {
    connectRedis().catch(() => {
        // Already handled in connectRedis
    });
}

// Redis helper functions for vehicle tracking
export const redisHelpers = {
    // Store vehicle position for a booking
    async setVehiclePosition(bookingId, vehiclePosition, routePoints = null) {
        if (!redisClient || !redisAvailable) {
            return false; // Redis not available, fail silently
        }
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
            // Silently fail - Redis is optional
            redisAvailable = false;
            return false;
        }
    },

    // Get vehicle position for a booking
    async getVehiclePosition(bookingId) {
        if (!redisClient || !redisAvailable) {
            return null; // Redis not available
        }
        try {
            const key = `vehicle:position:${bookingId}`;
            const data = await redisClient.get(key);
            return data ? JSON.parse(data) : null;
        } catch (error) {
            redisAvailable = false;
            return null;
        }
    },

    // Delete vehicle position for a booking
    async deleteVehiclePosition(bookingId) {
        if (!redisClient || !redisAvailable) {
            return false;
        }
        try {
            const key = `vehicle:position:${bookingId}`;
            await redisClient.del(key);
            return true;
        } catch (error) {
            redisAvailable = false;
            return false;
        }
    },

    // Subscribe clients tracking a booking
    async addTrackingClient(bookingId, clientId) {
        if (!redisClient || !redisAvailable) {
            return false;
        }
        try {
            const key = `booking:trackers:${bookingId}`;
            await redisClient.sAdd(key, clientId);
            // Set expiration for tracking list (2 hours)
            await redisClient.expire(key, 7200);
            return true;
        } catch (error) {
            redisAvailable = false;
            return false;
        }
    },

    // Remove client from tracking a booking
    async removeTrackingClient(bookingId, clientId) {
        if (!redisClient || !redisAvailable) {
            return false;
        }
        try {
            const key = `booking:trackers:${bookingId}`;
            await redisClient.sRem(key, clientId);
            return true;
        } catch (error) {
            redisAvailable = false;
            return false;
        }
    },

    // Get all clients tracking a booking
    async getTrackingClients(bookingId) {
        if (!redisClient || !redisAvailable) {
            return [];
        }
        try {
            const key = `booking:trackers:${bookingId}`;
            const clients = await redisClient.sMembers(key);
            return clients || [];
        } catch (error) {
            redisAvailable = false;
            return [];
        }
    },

    // Store passenger dropoff points for geofence checking
    async setPassengerDropoffs(bookingId, dropoffPoints) {
        if (!redisClient || !redisAvailable) {
            console.warn('⚠️ Redis: Not connected. Cannot store passenger dropoffs.');
            return false;
        }
        try {
            const key = `booking:dropoffs:${bookingId}`;
            await redisClient.setEx(key, 7200, JSON.stringify(dropoffPoints)); // 2 hours expiration
            return true;
        } catch (error) {
            console.error('Error storing passenger dropoffs in Redis:', error);
            redisAvailable = false;
            return false;
        }
    },

    // Get passenger dropoff points from Redis
    async getPassengerDropoffs(bookingId) {
        if (!redisClient || !redisAvailable) {
            console.warn('⚠️ Redis: Not connected. Cannot get passenger dropoffs.');
            return null;
        }
        try {
            const key = `booking:dropoffs:${bookingId}`;
            const data = await redisClient.get(key);
            return data ? JSON.parse(data) : null;
        } catch (error) {
            console.error('Error getting passenger dropoffs from Redis:', error);
            redisAvailable = false;
            return null;
        }
    },

    // Invalidate passenger dropoffs cache (when passengers are added/removed or status changes)
    async invalidatePassengerDropoffs(bookingId) {
        if (!redisClient || !redisAvailable) {
            return false;
        }
        try {
            const key = `booking:dropoffs:${bookingId}`;
            await redisClient.del(key);
            return true;
        } catch (error) {
            console.error('Error invalidating passenger dropoffs cache:', error);
            return false;
        }
    }
};

export { redisClient, connectRedis, redisAvailable };
export default redisClient;
