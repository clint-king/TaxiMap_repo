// Owner API Service
import axios from 'axios';
import { BASE_URL } from '../AddressSelection.js';

axios.defaults.withCredentials = true;

// ============================================
// OWNER APIs
// ============================================

/**
 * Get owner profile
 */
export const getOwnerProfile = async () => {
    try {
        const response = await axios.get(`${BASE_URL}/api/owners/profile`);
        return response.data;
    } catch (error) {
        console.error('Error fetching owner profile:', error);
        throw error;
    }
};

/**
 * Update owner profile
 */
export const updateOwnerProfile = async (profileData) => {
    try {
        const response = await axios.put(`${BASE_URL}/api/owners/profile`, profileData);
        return response.data;
    } catch (error) {
        console.error('Error updating owner profile:', error);
        throw error;
    }
};

/**
 * Get owner statistics
 */
export const getOwnerStatistics = async () => {
    try {
        const response = await axios.get(`${BASE_URL}/api/owners/statistics`);
        return response.data;
    } catch (error) {
        console.error('Error fetching owner statistics:', error);
        throw error;
    }
};

/**
 * Get owner revenue
 */
export const getOwnerRevenue = async (startDate = null, endDate = null, limit = 50, offset = 0) => {
    try {
        const params = { limit, offset };
        if (startDate) params.start_date = startDate;
        if (endDate) params.end_date = endDate;
        
        const response = await axios.get(`${BASE_URL}/api/owners/revenue`, { params });
        return response.data;
    } catch (error) {
        console.error('Error fetching owner revenue:', error);
        throw error;
    }
};

// ============================================
// ADMIN APIs
// ============================================

/**
 * Get all owners (admin)
 */
export const getAllOwners = async (status = null, limit = 100, offset = 0) => {
    try {
        const params = { limit, offset };
        if (status) params.status = status;
        
        const response = await axios.get(`${BASE_URL}/api/owners/admin/all`, { params });
        return response.data;
    } catch (error) {
        console.error('Error fetching all owners:', error);
        throw error;
    }
};

/**
 * Verify owner (admin)
 */
export const verifyOwner = async (ownerId, verificationData) => {
    try {
        const response = await axios.put(`${BASE_URL}/api/owners/${ownerId}/verify`, verificationData);
        return response.data;
    } catch (error) {
        console.error('Error verifying owner:', error);
        throw error;
    }
};

/**
 * Update owner status (admin)
 */
export const updateOwnerStatus = async (ownerId, status) => {
    try {
        const response = await axios.put(`${BASE_URL}/api/owners/${ownerId}/status`, { status });
        return response.data;
    } catch (error) {
        console.error('Error updating owner status:', error);
        throw error;
    }
};

