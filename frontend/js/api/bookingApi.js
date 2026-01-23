// Booking API Service
import axios from 'axios';
import { BASE_URL } from '../AddressSelection.js';

axios.defaults.withCredentials = true;

// ============================================
// CLIENT BOOKING APIs
// ============================================

/**
 * Create a new booking
 * Uses route-based endpoint if existing_route_id is provided, otherwise uses custom endpoint
 */
export const createBooking = async (bookingData) => {
    try {
        // Determine which endpoint to use based on booking data
        let endpoint = '/api/bookings/custom';
        
        // If existing_route_id is provided and booking_mode is 'route', use route-based endpoint
        if (bookingData.existing_route_id && bookingData.booking_mode === 'route') {
            endpoint = '/api/bookings/route-based';
            // Route-based booking only needs existing_route_id and optional fields
            // Backend will automatically select vehicle and populate other fields
            const routeBasedData = {
                existing_route_id: bookingData.existing_route_id,
                scheduled_pickup: bookingData.scheduled_pickup,
                passenger_count: bookingData.passenger_count || 0,
                parcel_count: bookingData.parcel_count || 0,
                special_instructions: bookingData.special_instructions
            };
            const response = await axios.post(`${BASE_URL}${endpoint}`, routeBasedData);
            return response.data;
        } else {
            // Custom booking requires all fields
            const response = await axios.post(`${BASE_URL}${endpoint}`, bookingData);
            return response.data;
        }
    } catch (error) {
        console.error('Error creating booking:', error);
        throw error;
    }
};

/**
 * Get user's bookings
 */
export const getMyBookings = async (status = null, limit = 50, offset = 0) => {
    try {
        const params = { limit, offset };
        if (status) params.status = status;
        
        const response = await axios.get(`${BASE_URL}/api/bookings/my-bookings`, { params });
        return response.data;
    } catch (error) {
        console.error('Error fetching bookings:', error);
        throw error;
    }
};

/**
 * Verify passenger or parcel pickup code
 */
export const verifyPassengerOrParcelPickUpCode = async (bookingId, code) => {
    try {
        const response = await axios.post(`${BASE_URL}/api/bookings/driver/verify-code`, {
            booking_id: bookingId,
            code_inserted: code
        });

        if (!response.data.success) {
            throw new Error('Failed to verify code');
        }

        return response.data;
    } catch (error) {
        console.error('Error verifying code:', error);
        throw error;
    }
};


/**
 * Get booking details
 * @param {string} bookingId - The booking ID
 * @param {string} [passengerRecordId] - Optional passenger record ID to differentiate between passenger and parcel bookings
 * @param {string} [parcelRecordId] - Optional parcel record ID to differentiate between passenger and parcel bookings
 * @param {string} [bookingType] - Optional booking type ('passenger' or 'parcel') to help identify which booking to show
 */
export const getBookingDetails = async (bookingId, passengerRecordId = null, parcelRecordId = null, bookingType = null) => {
    try {
        let url = `${BASE_URL}/api/bookings/${bookingId}`;
        const params = new URLSearchParams();
        
        if (passengerRecordId) {
            params.append('passengerRecordId', passengerRecordId);
        }
        if (parcelRecordId) {
            params.append('parcelRecordId', parcelRecordId);
        }
        if (bookingType) {
            params.append('bookingType', bookingType);
        }
        
        if (params.toString()) {
            url += `?${params.toString()}`;
        }
        
        const response = await axios.get(url);
        return response.data;
    } catch (error) {
        console.error('Error fetching booking details:', error);
        throw error;
    }
};

/**
 * Cancel booking
 */
export const cancelBooking = async (bookingId, cancellationReason = null) => {
    try {
        const response = await axios.put(`${BASE_URL}/api/bookings/${bookingId}/cancel`, {
            cancellation_reason: cancellationReason
        });
        return response.data;
    } catch (error) {
        console.error('Error cancelling booking:', error);
        throw error;
    }
};

/**
 * Add passenger to booking
 */
export const addPassenger = async (bookingId, passengerData) => {
    try {
        const response = await axios.post(`${BASE_URL}/api/bookings/${bookingId}/passengers`, passengerData);
        return response.data;
    } catch (error) {
        console.error('Error adding passenger:', error);
        throw error;
    }
};

/**
 * Remove passenger from booking
 */
export const removePassenger = async (bookingId, passengerId) => {
    try {
        const response = await axios.delete(`${BASE_URL}/api/bookings/${bookingId}/passengers/${passengerId}`);
        return response.data;
    } catch (error) {
        console.error('Error removing passenger:', error);
        throw error;
    }
};

/**
 * Add parcel to booking
 */
export const addParcel = async (bookingId, parcelData) => {
    try {
        const response = await axios.post(`${BASE_URL}/api/bookings/${bookingId}/parcels`, parcelData);
        return response.data;
    } catch (error) {
        console.error('Error adding parcel:', error);
        throw error;
    }
};

/**
 * Remove parcel from booking
 */
export const removeParcel = async (bookingId, parcelId) => {
    try {
        const response = await axios.delete(`${BASE_URL}/api/bookings/${bookingId}/parcels/${parcelId}`);
        return response.data;
    } catch (error) {
        console.error('Error removing parcel:', error);
        throw error;
    }
};

/**
 * Rate a booking
 */
export const rateBooking = async (bookingId, ratingData) => {
    try {
        const response = await axios.post(`${BASE_URL}/api/bookings/${bookingId}/rate`, ratingData);
        return response.data;
    } catch (error) {
        console.error('Error rating booking:', error);
        throw error;
    }
};

// ============================================
// DRIVER BOOKING APIs
// ============================================

/**
 * Get driver's assigned bookings
 */
export const getDriverBookings = async (status = null, limit = 50, offset = 0) => {
    try {
        const params = { limit, offset };
        if (status) params.status = status;
        
        const response = await axios.get(`${BASE_URL}/api/bookings/driver/my-bookings`, { params });
        return response.data;
    } catch (error) {
        console.error('Error fetching driver bookings:', error);
        throw error;
    }
};

/**
 * Update booking status (driver)
 */
export const updateBookingStatusDriver = async (bookingId, bookingStatus) => {
    try {
        const response = await axios.put(`${BASE_URL}/api/bookings/${bookingId}/driver/status`, {
            booking_status: bookingStatus
        });
        return response.data;
    } catch (error) {
        console.error('Error updating booking status:', error);
        throw error;
    }
};

/**
 * Complete route point
 */
export const completeRoutePoint = async (bookingId, pointId) => {
    try {
        const response = await axios.put(`${BASE_URL}/api/bookings/${bookingId}/route-points/${pointId}/complete`);
        return response.data;
    } catch (error) {
        console.error('Error completing route point:', error);
        throw error;
    }
};

/**
 * Verify passenger or parcel pickup code
 */
export const verifyPassengerOrParcelCode = async (bookingId, code) => {
    try {
        const response = await axios.post(`${BASE_URL}/api/bookings/driver/verify-code`, {
            booking_id: bookingId,
            code_inserted: code
        });
        return response.data;
    } catch (error) {
        console.error('Error verifying code:', error);
        throw error;
    }
};

// ...existing code...
export const getUpcomingTrips = async () => {
    try {
        const response = await axios.get(`${BASE_URL}/api/bookings/driver/upcoming-trips`);
        if (!response.data.success) {
            throw new Error('Failed to fetch upcoming trips');
        }
        return response.data;
    } catch (error) {
        // If endpoint not found, return empty list (UI-friendly)
        if (error.response && error.response.status === 404) {
            console.warn('Upcoming trips endpoint returned 404 — returning empty list for UI.');
            return { success: true, upcomingTrips: [] };
        }
        console.error('Error fetching upcoming trips:', error);
        throw error;
    }
};
// ...existing code...


// ============================================
// OWNER BOOKING APIs
// ============================================

/**
 * Get owner's bookings
 */
export const getOwnerBookings = async (status = null, limit = 50, offset = 0) => {
    try {
        const params = { limit, offset };
        if (status) params.status = status;
        
        const response = await axios.get(`${BASE_URL}/api/bookings/owner/my-bookings`, { params });
        return response.data;
    } catch (error) {
        console.error('Error fetching owner bookings:', error);
        throw error;
    }
};

/**
 * Assign driver to booking
 */
export const assignDriver = async (bookingId, driverId) => {
    try {
        const response = await axios.put(`${BASE_URL}/api/bookings/${bookingId}/assign-driver`, {
            driver_id: driverId
        });
        return response.data;
    } catch (error) {
        console.error('Error assigning driver:', error);
        throw error;
    }
};

/**
 * Update booking (owner)
 */
export const updateBooking = async (bookingId, updateData) => {
    try {
        const response = await axios.put(`${BASE_URL}/api/bookings/${bookingId}`, updateData);
        return response.data;
    } catch (error) {
        console.error('Error updating booking:', error);
        throw error;
    }
};

export const getUpcomingTripsOwner = async () => {
    try {
        const response = await axios.get(`${BASE_URL}/api/bookings/owner/upcoming-trips`);
        return response.data;
    } catch (error) {
        console.error('Error fetching upcoming trips:', error);
        throw error;
    }
};

export const  getAllBookingsOwner = async () => {
    try {
        const response = await axios.get(`${BASE_URL}/api/bookings/owner/all-bookings`);
        return response.data;
    } catch (error) {
        console.error('Error fetching all bookings:', error);
        throw error;
    }
};

// ============================================
// PUBLIC BOOKING APIs (No authentication required)
// ============================================

/**
 * Get public pending bookings for display on booking-public page
 */
export const getPublicPendingBookings = async () => {
    try {
        const response = await axios.get(`${BASE_URL}/api/bookings/public/pending`);
        return response.data;
    } catch (error) {
        console.error('Error fetching public pending bookings:', error);
        throw error;
    }
};

// ============================================
// ADMIN BOOKING APIs
// ============================================

/**
 * Get all bookings (admin)
 */
export const getAllBookings = async (status = null, limit = 100, offset = 0) => {
    try {
        const params = { limit, offset };
        if (status) params.status = status;
        
        const response = await axios.get(`${BASE_URL}/api/bookings/admin/all`, { params });
        return response.data;
    } catch (error) {
        console.error('Error fetching all bookings:', error);
        throw error;
    }
};

/**
 * Get booking statistics (admin)
 */
export const getBookingStatistics = async () => {
    try {
        const response = await axios.get(`${BASE_URL}/api/bookings/admin/statistics`);
        return response.data;
    } catch (error) {
        console.error('Error fetching booking statistics:', error);
        throw error;
    }
};

/**
 * Update booking status (admin)
 */
export const updateBookingStatusAdmin = async (bookingId, bookingStatus) => {
    try {
        const response = await axios.put(`${BASE_URL}/api/bookings/${bookingId}/admin/status`, {
            booking_status: bookingStatus
        });
        return response.data;
    } catch (error) {
        console.error('Error updating booking status:', error);
        throw error;
    }
};

