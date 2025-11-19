// Vehicle API Service
import axios from 'axios';
import { BASE_URL } from '../AddressSelection.js';

axios.defaults.withCredentials = true;

// ============================================
// OWNER VEHICLE APIs
// ============================================

/**
 * Create a new vehicle
 */
export const createVehicle = async (vehicleData) => {
    try {
        const response = await axios.post(`${BASE_URL}/api/vehicles`, vehicleData);
        return response.data;
    } catch (error) {
        console.error('Error creating vehicle:', error);
        throw error;
    }
};

/**
 * Get owner's vehicles
 */
export const getOwnerVehicles = async (status = null, limit = 50, offset = 0) => {
    try {
        const params = { limit, offset };
        if (status) params.status = status;
        
        const response = await axios.get(`${BASE_URL}/api/vehicles/owner/my-vehicles`, { params });
        return response.data;
    } catch (error) {
        console.error('Error fetching owner vehicles:', error);
        throw error;
    }
};

/**
 * Get vehicle details
 */
export const getVehicleDetails = async (vehicleId) => {
    try {
        const response = await axios.get(`${BASE_URL}/api/vehicles/${vehicleId}`);
        return response.data;
    } catch (error) {
        console.error('Error fetching vehicle details:', error);
        throw error;
    }
};

/**
 * Update vehicle
 */
export const updateVehicle = async (vehicleId, updateData) => {
    try {
        const response = await axios.put(`${BASE_URL}/api/vehicles/${vehicleId}`, updateData);
        return response.data;
    } catch (error) {
        console.error('Error updating vehicle:', error);
        throw error;
    }
};

/**
 * Delete vehicle
 */
export const deleteVehicle = async (vehicleId) => {
    try {
        const response = await axios.delete(`${BASE_URL}/api/vehicles/${vehicleId}`);
        return response.data;
    } catch (error) {
        console.error('Error deleting vehicle:', error);
        throw error;
    }
};

/**
 * Assign driver to vehicle
 */
export const assignDriverToVehicle = async (vehicleId, driverId) => {
    try {
        const response = await axios.put(`${BASE_URL}/api/vehicles/${vehicleId}/assign-driver`, {
            driver_id: driverId
        });
        return response.data;
    } catch (error) {
        console.error('Error assigning driver:', error);
        throw error;
    }
};

/**
 * Unassign driver from vehicle
 */
export const unassignDriverFromVehicle = async (vehicleId) => {
    try {
        const response = await axios.put(`${BASE_URL}/api/vehicles/${vehicleId}/unassign-driver`);
        return response.data;
    } catch (error) {
        console.error('Error unassigning driver:', error);
        throw error;
    }
};

// ============================================
// DRIVER VEHICLE APIs
// ============================================

/**
 * Get driver's assigned vehicles
 */
export const getDriverVehicles = async () => {
    try {
        const response = await axios.get(`${BASE_URL}/api/vehicles/driver/my-vehicles`);
        return response.data;
    } catch (error) {
        console.error('Error fetching driver vehicles:', error);
        throw error;
    }
};

// ============================================
// PUBLIC/CLIENT VEHICLE APIs
// ============================================

/**
 * Search available vehicles
 */
export const searchVehicles = async (searchParams) => {
    try {
        const response = await axios.post(`${BASE_URL}/api/vehicles/search`, searchParams);
        return response.data;
    } catch (error) {
        console.error('Error searching vehicles:', error);
        throw error;
    }
};

/**
 * Get vehicles by route
 */
export const getVehiclesByRoute = async (routeId) => {
    try {
        const response = await axios.get(`${BASE_URL}/api/vehicles/route/${routeId}`);
        return response.data;
    } catch (error) {
        console.error('Error fetching vehicles by route:', error);
        throw error;
    }
};

// ============================================
// ADMIN VEHICLE APIs
// ============================================

/**
 * Get all vehicles (admin)
 */
export const getAllVehicles = async (status = null, limit = 100, offset = 0) => {
    try {
        const params = { limit, offset };
        if (status) params.status = status;
        
        const response = await axios.get(`${BASE_URL}/api/vehicles/admin/all`, { params });
        return response.data;
    } catch (error) {
        console.error('Error fetching all vehicles:', error);
        throw error;
    }
};

/**
 * Update vehicle status (admin)
 */
export const updateVehicleStatusAdmin = async (vehicleId, vehicleStatus) => {
    try {
        const response = await axios.put(`${BASE_URL}/api/vehicles/${vehicleId}/admin/status`, {
            vehicle_status: vehicleStatus
        });
        return response.data;
    } catch (error) {
        console.error('Error updating vehicle status:', error);
        throw error;
    }
};

