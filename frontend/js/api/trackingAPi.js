import axios from 'axios';
import { BASE_URL } from '../AddressSelection.js';

axios.defaults.withCredentials = true;

// Lazy initialization of geocoder - only create when needed and google is available
let geocoder = null;
function getGeocoder() {
    if (!geocoder && typeof google !== 'undefined' && google.maps) {
        geocoder = new google.maps.Geocoder();
    }
    return geocoder;
}
 const BookingStatus = {
    PENDING: "pending",
    CONFIRMED: "confirmed",
    PICKED_UP: "picked_up",
    IN_TRANSIT: "in_transit",
    DROPPED_OFF: "dropped-off",
    CANCELLED: "cancelled"
};

const BookingDirectionType = {
    FROM_LOC1: "from_loc1",
    FROM_LOC2: "from_loc2"
};

export const getBookingWaypoints = async (bookingID) => {
    try {
        const response = await axios.get(`${BASE_URL}/api/tracking/${bookingID}/waypoints`);

        //structure the returned data as needed
        //way point with current structure
        if(!response.data.success){
            throw new Error("No waypoints found for this booking");
        }

        const fullInfo_pickup_Waypoints = response.data.pickup_points;
        const fullInfo_dropoff_Waypoints = response.data.dropoff_points;

        //coordibnates only
        const pickup_coordinatesOnly = fullInfo_pickup_Waypoints.map(waypoint => {
            let stopOverValue = false;

            if(waypoint.status == BookingStatus.PENDING || waypoint.status == BookingStatus.CONFIRMED || waypoint.status == BookingStatus.IN_TRANSIT  ){
                stopOverValue = true;
            }

            return {
                position: {
                    lat: waypoint.position.lat,
                    lng: waypoint.position.lng
                },
                stopOverValue: stopOverValue,
                id: waypoint.id,
                type: waypoint.type
            };
    });


        const dropoff_coordinatesOnly = fullInfo_dropoff_Waypoints.map(waypoint => {
            let stopOverValue = false;

            if(waypoint.status == BookingStatus.PENDING || waypoint.status == BookingStatus.CONFIRMED || waypoint.status == BookingStatus.IN_TRANSIT || waypoint.status == BookingStatus.PICKED_UP){
                stopOverValue = true;
            }
            return {
                position: {
                    lat: waypoint.position.lat,
                    lng: waypoint.position.lng
                },
                stopOverValue: stopOverValue,
                id: waypoint.id,
                type: waypoint.type
            };
        });

        return {
            pickup: {
                fullInfo: fullInfo_pickup_Waypoints,
                coordinatesOnly: pickup_coordinatesOnly
            },
            dropoff: {
                fullInfo: fullInfo_dropoff_Waypoints,
                coordinatesOnly: dropoff_coordinatesOnly
            }
        };
    } catch (error) {
        console.error("Error fetching booking waypoints:", error);
        throw error;
    }
}

/**
 * Confirm dropoff for a passenger
 * Re-checks distance on backend before finalizing
 * Only for passengers (parcels are not checked by geofence)
 * @param {number} bookingId - The booking ID
 * @param {number} passengerId - Passenger ID
 * @returns {Promise<Object>} Response with success status and distance
 */
export const confirmDropoff = async (bookingId, passengerId) => {
    try {
        const response = await axios.post(
            `${BASE_URL}/api/tracking/confirm-dropoff`,
            {
                bookingId: bookingId,
                passengerId: passengerId
            }
        );

        if (!response.data.success) {
            throw new Error(response.data.message || "Could not confirm dropoff");
        }

        return response.data;
    } catch (error) {
        console.error("Error confirming dropoff:", error);
        throw error;
    }
};

export const getDefaultSourceAndDestCoords = async (bookingID) => {
    try {
        const existingRouteDetails = await axios.post(`${BASE_URL}/api/bookings/existing-route-details`, { 
             bookingID: bookingID
        });

        if(!existingRouteDetails.data.success){
            throw new Error("Could not fetch existing route details");
        }
        const existingRouteData = existingRouteDetails.data.route;
        let sourceLocationName;
        let destinationLocationName;

        if(existingRouteData.direction_type == BookingDirectionType.FROM_LOC1){
            sourceLocationName = existingRouteData.location_1;
            destinationLocationName = existingRouteData.location_2;
        }else{
            sourceLocationName = existingRouteData.location_2;
            destinationLocationName = existingRouteData.location_1;
        }
        console.log("existingRouteDetails result: ", existingRouteDetails.data);
        console.log("in [getDefaultSourceAndDestCoords] Source Name: ", sourceLocationName);
        console.log("in [getDefaultSourceAndDestCoords] Destination Name: ", destinationLocationName);
        const sourceCoords =  await getSourceInSouthAfrica(sourceLocationName);
        const destCoords =  await getSourceInSouthAfrica(destinationLocationName);

        console.log("in [getDefaultSourceAndDestCoords] result Source Coords: ", sourceCoords);
        console.log("in [getDefaultSourceAndDestCoords] result Destination Coords: ", destCoords);

        return {
            source: sourceCoords,
            destination: destCoords
        };

    } catch (error) {
        console.error("Error fetching existing route details:", error);
        throw error;
    }

}


function getSourceInSouthAfrica(text) {
  return new Promise((resolve, reject) => {
    const geocoderInstance = getGeocoder();
    if (!geocoderInstance) {
      reject("Google Maps API is not loaded");
      return;
    }
    
    geocoderInstance.geocode(
      {
        address: text,
        componentRestrictions: {
          country: "ZA" // South Africa
        }
      },
      (results, status) => {
        if (status !== "OK" || !results.length) {
          reject("No results in South Africa");
          return;
        }

        const topResult = results[0]; // first, best match IN SA

        resolve({
          name: topResult.formatted_address,
          position: {   
          lat: topResult.geometry.location.lat(),
          lng: topResult.geometry.location.lng()},
          placeId: topResult.place_id
        });
      }
    );
  });
}

// Distance calculation API removed - using visual map with WebSocket for real-time tracking instead

export const getBookingDetails = async (bookingId) => {
    try {
        const response = await axios.post(`${BASE_URL}/api/bookings/driver/booking-details`, { 
            bookingId: bookingId
        });
        return response.data;
    } catch (error) {
        console.error("Error fetching booking details:", error);
        throw error;
    }
}

export const getPickupDropoffInfo = async (bookingId) => {
    try {
        const response = await axios.post(`${BASE_URL}/api/bookings/driver/pickup-dropoff-info`, { 
            bookingId: bookingId
        });
        return response.data;
    } catch (error) {
        console.error("Error fetching pickup dropoff info:", error);
        throw error;
    }
}

/**
 * Update vehicle position for real-time tracking
 * @param {number} bookingId - The booking ID
 * @param {Object} vehiclePosition - { lat, lng } coordinates
 * @param {Array} fullPathCoords - Optional array of route coordinates
 * @returns {Promise<Object>} Response with success status
 */
export const updateVehiclePosition = async (bookingId, vehiclePosition, fullPathCoords = null) => {
    try {
        console.log('🚗 [DRIVER] Sending vehicle position update:', { bookingId, vehiclePosition });
        
        const response = await axios.post(
            `${BASE_URL}/api/tracking/update-position`,
            {
                bookingId: bookingId,
                vehiclePosition: JSON.stringify(vehiclePosition),
                fullPathCoords: fullPathCoords ? JSON.stringify(fullPathCoords) : null
            }
        );

        if (response.data.success) {
            console.log('✅ [DRIVER] Vehicle position updated successfully');
        }

        return response.data;
    } catch (error) {
        console.error('❌ [DRIVER] Error updating vehicle position:', error);
        // Don't throw - we don't want to stop simulation if API call fails
        return { success: false, error: error.message };
    }
};