import axios from 'axios';
import { BASE_URL } from '../AddressSelection.js';

axios.defaults.withCredentials = true;

const geocoder = new google.maps.Geocoder();
 const BookingStatus = {
    PENDING: "pending",
    CONFIRMED: "confirmed",
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

            if(waypoint.status == BookingStatus.PENDING ){
                stopOverValue = true;
            }

            return {
                position: {
                    lat: waypoint.position.lat,
                    lng: waypoint.position.lng
                },
                stopOverValue: stopOverValue
            };
    });


        const dropoff_coordinatesOnly = fullInfo_dropoff_Waypoints.map(waypoint => {
            let stopOverValue = false;

            if(waypoint.status == BookingStatus.PENDING || waypoint.status == BookingStatus.CONFIRMED || waypoint.status == BookingStatus.IN_TRANSIT ){
                stopOverValue = true;
            }
            return {
                position: {
                    lat: waypoint.position.lat,
                    lng: waypoint.position.lng
                },
                stopOverValue: stopOverValue
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
    geocoder.geocode(
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
