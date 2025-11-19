// Document API Service
import axios from 'axios';
import { BASE_URL } from '../AddressSelection.js';

axios.defaults.withCredentials = true;

// ============================================
// VEHICLE DOCUMENT APIs (OWNER)
// ============================================

/**
 * Get vehicle documents
 */
export const getVehicleDocuments = async (vehicleId) => {
    try {
        const response = await axios.get(`${BASE_URL}/api/documents/vehicle/${vehicleId}`);
        return response.data;
    } catch (error) {
        console.error('Error fetching vehicle documents:', error);
        throw error;
    }
};

/**
 * Upload vehicle document
 */
export const uploadVehicleDocument = async (vehicleId, documentData) => {
    try {
        const response = await axios.post(`${BASE_URL}/api/documents/vehicle/${vehicleId}`, documentData);
        return response.data;
    } catch (error) {
        console.error('Error uploading vehicle document:', error);
        throw error;
    }
};

/**
 * Update vehicle document
 */
export const updateVehicleDocument = async (documentId, updateData) => {
    try {
        const response = await axios.put(`${BASE_URL}/api/documents/vehicle/${documentId}`, updateData);
        return response.data;
    } catch (error) {
        console.error('Error updating vehicle document:', error);
        throw error;
    }
};

/**
 * Delete vehicle document
 */
export const deleteVehicleDocument = async (documentId) => {
    try {
        const response = await axios.delete(`${BASE_URL}/api/documents/vehicle/${documentId}`);
        return response.data;
    } catch (error) {
        console.error('Error deleting vehicle document:', error);
        throw error;
    }
};

// ============================================
// ADMIN DOCUMENT APIs
// ============================================

/**
 * Verify vehicle document (admin)
 */
export const verifyVehicleDocument = async (documentId, verificationData) => {
    try {
        const response = await axios.put(`${BASE_URL}/api/documents/vehicle/${documentId}/verify`, verificationData);
        return response.data;
    } catch (error) {
        console.error('Error verifying vehicle document:', error);
        throw error;
    }
};

/**
 * Get pending documents (admin)
 */
export const getPendingDocuments = async (documentType = null, limit = 100, offset = 0) => {
    try {
        const params = { limit, offset };
        if (documentType) params.document_type = documentType;
        
        const response = await axios.get(`${BASE_URL}/api/documents/admin/pending`, { params });
        return response.data;
    } catch (error) {
        console.error('Error fetching pending documents:', error);
        throw error;
    }
};

