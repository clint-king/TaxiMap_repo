// Driver API Service
import axios from 'axios';
import { BASE_URL } from '../AddressSelection.js';

axios.defaults.withCredentials = true;

// ============================================
// DRIVER APIs
// ============================================

/**
 * Get driver profile
 */
export const getDriverProfile = async () => {
    try {
        const response = await axios.get(`${BASE_URL}/api/drivers/profile`);
        return response.data;
    } catch (error) {
        console.error('Error fetching driver profile:', error);
        throw error;
    }
};

/**
 * Update driver profile
 */
export const updateDriverProfile = async (profileData) => {
    try {
        const response = await axios.put(`${BASE_URL}/api/drivers/profile`, profileData);
        return response.data;
    } catch (error) {
        console.error('Error updating driver profile:', error);
        throw error;
    }
};

/**
 * Get driver documents
 */
export const getDriverDocuments = async () => {
    try {
        const response = await axios.get(`${BASE_URL}/api/drivers/documents`);
        return response.data;
    } catch (error) {
        console.error('Error fetching driver documents:', error);
        throw error;
    }
};

/**
 * Upload driver document
 */
export const uploadDriverDocument = async (documentData) => {
    try {
        const response = await axios.post(`${BASE_URL}/api/drivers/documents`, documentData);
        return response.data;
    } catch (error) {
        console.error('Error uploading driver document:', error);
        throw error;
    }
};

/**
 * Delete driver document
 */
export const deleteDriverDocument = async (documentId) => {
    try {
        const response = await axios.delete(`${BASE_URL}/api/drivers/documents/${documentId}`);
        return response.data;
    } catch (error) {
        console.error('Error deleting driver document:', error);
        throw error;
    }
};

/**
 * Get driver statistics
 */
export const getDriverStatistics = async () => {
    try {
        const response = await axios.get(`${BASE_URL}/api/drivers/statistics`);
        return response.data;
    } catch (error) {
        console.error('Error fetching driver statistics:', error);
        throw error;
    }
};

// ============================================
// OWNER APIs (for viewing drivers)
// ============================================

/**
 * Create driver (owner creates driver account and profile)
 */
export const createDriver = async (driverData) => {
    try {
        const response = await axios.post(`${BASE_URL}/api/drivers/owner/create`, driverData);
        return response.data;
    } catch (error) {
        console.error('Error creating driver:', error);
        throw error;
    }
};

/**
 * Get owner's drivers
 */
export const getOwnerDrivers = async () => {
    try {
        const response = await axios.get(`${BASE_URL}/api/drivers/owner/my-drivers`);
        return response.data;
    } catch (error) {
        console.error('Error fetching owner drivers:', error);
        throw error;
    }
};

/**
 * Update driver status by owner (only if driver is verified)
 */
export const updateDriverStatusByOwner = async (driverId, status) => {
    try {
        const response = await axios.put(`${BASE_URL}/api/drivers/owner/${driverId}/status`, { status });
        return response.data;
    } catch (error) {
        console.error('Error updating driver status:', error);
        throw error;
    }
};

// ============================================
// ADMIN APIs
// ============================================

/**
 * Get all drivers (admin)
 */
export const getAllDrivers = async (status = null, limit = 100, offset = 0) => {
    try {
        const params = { limit, offset };
        if (status) params.status = status;
        
        const response = await axios.get(`${BASE_URL}/api/drivers/admin/all`, { params });
        return response.data;
    } catch (error) {
        console.error('Error fetching all drivers:', error);
        throw error;
    }
};

/**
 * Verify driver (admin)
 */
export const verifyDriver = async (driverId, verificationData) => {
    try {
        const response = await axios.put(`${BASE_URL}/api/drivers/${driverId}/verify`, verificationData);
        return response.data;
    } catch (error) {
        console.error('Error verifying driver:', error);
        throw error;
    }
};

/**
 * Update driver status (admin)
 */
export const updateDriverStatus = async (driverId, status) => {
    try {
        const response = await axios.put(`${BASE_URL}/api/drivers/${driverId}/status`, { status });
        return response.data;
    } catch (error) {
        console.error('Error updating driver status:', error);
        throw error;
    }
};

