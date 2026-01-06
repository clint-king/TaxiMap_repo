// Payment API Service
import axios from 'axios';
import { BASE_URL } from '../AddressSelection.js';

axios.defaults.withCredentials = true;

// ============================================
// CLIENT PAYMENT APIs
// ============================================

/**
 * Create payment
 */
export const createPayment = async (paymentData) => {
    try {
        const response = await axios.post(`${BASE_URL}/api/payments`, paymentData);
        return response.data;
    } catch (error) {
        console.error('Error creating payment:', error);
        throw error;
    }
};

/**
 * Get user's payments
 */
export const getMyPayments = async (status = null, limit = 50, offset = 0) => {
    try {
        const params = { limit, offset };
        if (status) params.status = status;
        
        const response = await axios.get(`${BASE_URL}/api/payments/my-payments`, { params });
        return response.data;
    } catch (error) {
        console.error('Error fetching payments:', error);
        throw error;
    }
};

/**
 * Get payment details
 */
export const getPaymentDetails = async (paymentId) => {
    try {
        const response = await axios.get(`${BASE_URL}/api/payments/${paymentId}`);
        return response.data;
    } catch (error) {
        console.error('Error fetching payment details:', error);
        throw error;
    }
};


export const checkPaymentStatus = async (paymentId, bookingId) => {
    try {
        //check inputs 
        if(!paymentId || !bookingId){
            throw new Error("Payment ID and Booking ID are required");
        }

        //request to backend
        const res = await axios.post(`${BASE_URL}/api/payments/paymentstatus`, { paymentId, bookingId });
        return res.data; // Expect  {success: true, status, amount, currency}
    } catch (error) {
        console.error("Error in checkPaymentStatus:", error);
        throw error;
    }
};
// ============================================
// OWNER PAYMENT APIs
// ============================================

/**
 * Get owner's payments
 */
export const getOwnerPayments = async (limit = 50, offset = 0) => {
    try {
        const response = await axios.get(`${BASE_URL}/api/payments/owner/payments`, {
            params: { limit, offset }
        });
        return response.data;
    } catch (error) {
        console.error('Error fetching owner payments:', error);
        throw error;
    }
};

// ============================================
// ADMIN PAYMENT APIs
// ============================================

/**
 * Get all payments (admin)
 */
export const getAllPayments = async (status = null, limit = 100, offset = 0) => {
    try {
        const params = { limit, offset };
        if (status) params.status = status;
        
        const response = await axios.get(`${BASE_URL}/api/payments/admin/all`, { params });
        return response.data;
    } catch (error) {
        console.error('Error fetching all payments:', error);
        throw error;
    }
};

/**
 * Process refund (admin)
 */
export const processRefund = async (paymentId, refundData) => {
    try {
        const response = await axios.post(`${BASE_URL}/api/payments/${paymentId}/refund`, refundData);
        return response.data;
    } catch (error) {
        console.error('Error processing refund:', error);
        throw error;
    }
};

// ============================================
// PAYMENT GATEWAY CALLBACK
// ============================================

/**
 * Process payment callback (from payment gateway)
 */
export const processPaymentCallback = async (callbackData) => {
    try {
        const response = await axios.post(`${BASE_URL}/api/payments/callback`, callbackData);
        return response.data;
    } catch (error) {
        console.error('Error processing payment callback:', error);
        throw error;
    }
};

// export const initiateYocoCheckout = async (checkoutData) => {
//     try {
//         const response = await axios.post(`${BASE_URL}/api/payments/yoco/checkout`, checkoutData);
//         return response.data;
//     } catch (error) {
//         console.error('Error initiating Yoco checkout:', error);
//         throw error;
//     }
// };

export const initiateYocoCheckout= async (paymentData) => {
    try {
        const response = await axios.post(`${BASE_URL}/api/payments/yoco/checkout`,paymentData);
        return response.data;
    } catch (error) {
        console.error('Error initiating Yoco checkout:', error);
        throw error;
    }
};