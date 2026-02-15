import pool from "../config/db.js";
import { redisHelpers } from "../config/redis.js";
import { broadcastVehiclePosition, broadcastCalculatedDistance } from "../config/socket.js";
import { WebSocketServer } from "ws";

const checkUserType = (user, allowedTypes) => {
    if (!allowedTypes.includes(user.user_type)) {
        throw new Error(`Access denied. Required user type: ${allowedTypes.join(' or ')}`);
    }
};

// Haversine formula to calculate distance between two coordinates (in meters)
function calculateHaversineDistance(lat1, lon1, lat2, lon2) {
    const R = 6371000; // Earth's radius in meters
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a = 
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c; // Distance in meters
    return distance;
}

//sending pickup and dropoff coordinates (from passengers and parcels)
export const getBookingWaypoints = async(req,res) =>{
     checkUserType(req.user , ['driver', 'client' , 'admin']);
        const {bookingId} = req.params;


    //check if bookingID exists
        if(!bookingId){
            return res.status(400).json(
                {
                    success:false,
                    message:"booking_id is required"
                }
            );
        }

     //check the status of the booking (fullypaid and active)
      const [bookingActive] = await pool.execute("SELECT booking_status , owner_id , driver_id FROM bookings WHERE ID =?" , [bookingId]);

    if(bookingActive.length === 0){
        return res.status(404).json({
                success: false,
                message: "booking was not found"
            })
    }

    if(bookingActive[0].booking_status != "active" && bookingActive[0].booking_status != "fully_paid"){
        return res.status(400).json(
            {
                success:false,
                message:"booking is not active or fully paid"
            }
        )
    }

    //get driver ID from 
    const [driveResponse] = await pool.execute("SELECT ID FROM driver_profiles WHERE user_id = ?" , [req.user.id]);

    if(driveResponse.length === 0){
        return res.status(404).json({
                success: false,
                message: "driver profile not found"
            })
    }

    //check wether the driver is assigned to the booking (if user is driver)
            //check if the user is supposed to acess the particular 
        if(req.user.user_type === 'driver'){
            if(driveResponse[0].ID != bookingActive[0].driver_id){
                return res.status(400).json(
            {
                success:false,
                message:"user is not permitted"
            }
        )
            }
        }

    let pickup_points = [];
    let dropoff_points = [];
     //get from booking_parcels with parcls table
     const [bookingParcels] = await pool.execute(`SELECT ID , ST_X(pickup_point) AS pickup_lng , ST_Y(pickup_point) AS pickup_lat,
         pickup_address, ST_X(dropoff_point) AS dropoff_lng, ST_Y(dropoff_point) AS dropoff_lat, dropoff_address , status FROM booking_parcels
          WHERE status IN ('confirmed','picked_up' , 'in_transit') AND booking_id = ?`, [bookingId]);


          if(bookingParcels.length > 0){
            bookingParcels.forEach(parcel =>{
                if(parcel.status === 'confirmed'){
                pickup_points.push({
                    id: parcel.ID,
                    position:{
                        lat: Number(parcel.pickup_lat),
                        lng: Number(parcel.pickup_lng)
                    },
                    address: parcel.pickup_address,
                    type: 'parcel',
                    status: parcel.status
                });
            }else{
                return;
            }
            });

            bookingParcels.forEach(parcel =>{
                dropoff_points.push({
                    id: parcel.ID,
                    position:{
                        lat: Number(parcel.dropoff_lat),
                        lng: Number(parcel.dropoff_lng)
                    },
                    address: parcel.dropoff_address,
                    type: 'parcel',
                    status: parcel.status
                });
            });

          }

     //get from booking_passengers
     const [bookingPassengers] = await pool.execute(`SELECT ID , ST_X(pickup_point) AS pickup_lng , ST_Y(pickup_point) AS pickup_lat,
         pickup_address, ST_X(dropoff_point) AS dropoff_lng, ST_Y(dropoff_point) AS dropoff_lat, dropoff_address, booking_passenger_status FROM booking_passengers
          WHERE booking_passenger_status IN ('confirmed','picked_up') AND booking_id = ?`, [bookingId]);

            if(bookingPassengers.length > 0){

                bookingPassengers.forEach(passenger =>{

                    if(passenger.booking_passenger_status === 'confirmed'){
                    pickup_points.push({
                        id: passenger.ID,
                        position:{
                            lat: Number(passenger.pickup_lat),
                            lng: Number(passenger.pickup_lng)
                        },
                        address: passenger.pickup_address,
                        type: 'passenger',
                        status: passenger.booking_passenger_status
                    });
                    }else{
                        return;
                    }
                });

                bookingPassengers.forEach(passenger =>{
                    dropoff_points.push({
                        id: passenger.ID,
                        position:{
                            lat: Number(passenger.dropoff_lat),
                            lng: Number(passenger.dropoff_lng)
                        },
                        address: passenger.dropoff_address,
                        type: 'passenger',
                        status: passenger.booking_passenger_status
                    });
                });
            }

     //send the coordinates if succesful and if not send an error message [pickup_points[] , dropoff_points[]]
     if(pickup_points.length === 0 && dropoff_points.length === 0){
        return  res.status(404).json(
            {
                success:false,
                message:"No waypoints found for this booking"
            }
        )
     }


     return res.status(200).json(
        {
            success:true,
            pickup_points,
            dropoff_points
        }
     );
}


export const updateVehiclePosition = async(req , res)=>{  
     checkUserType(req.user , ['driver']);

     //get the information
     const {fullPathCoords , vehiclePosition,bookingId} = req.body;

     //validate inputs 
     if(!vehiclePosition || !bookingId){
           return res.status(400).json(
                {
                    success:false,
                    message:"either vehiclePosition or bookingId is missing"
                }
            );
     }

     // Parse vehiclePosition if it's a JSON string
     let parsedVehiclePosition = vehiclePosition;
     try {
         if (typeof vehiclePosition === 'string') {
             parsedVehiclePosition = JSON.parse(vehiclePosition);
         }
     } catch (error) {
         console.error('Error parsing vehiclePosition:', error);
         return res.status(400).json({
             success: false,
             message: "Invalid vehiclePosition format"
         });
     }

     // Extract lat and lng from vehiclePosition
     let vehicleLat, vehicleLng;
     if (parsedVehiclePosition.lat !== undefined && parsedVehiclePosition.lng !== undefined) {
         vehicleLat = Number(parsedVehiclePosition.lat);
         vehicleLng = Number(parsedVehiclePosition.lng);
     } else if (parsedVehiclePosition.position) {
         vehicleLat = Number(parsedVehiclePosition.position.lat);
         vehicleLng = Number(parsedVehiclePosition.position.lng);
     } else {
         return res.status(400).json({
             success: false,
             message: "vehiclePosition must contain lat and lng"
         });
     }

     // Parse routePoints if provided
     let parsedRoutePoints = fullPathCoords;
     if (fullPathCoords) {
         try {
             if (typeof fullPathCoords === 'string') {
                 parsedRoutePoints = JSON.parse(fullPathCoords);
             }
         } catch (error) {
             console.error('Error parsing fullPathCoords:', error);
             parsedRoutePoints = null; // Continue without route points if parsing fails
         }
     }

     //validate if user is a driver and should be able to update this booking info

     let connection = null;
     try{
        connection = await pool.getConnection();
        await connection.beginTransaction();

        
    
     //check the status of the booking (fullypaid and active)
     const [bookingActive] = await connection.execute("SELECT booking_status , owner_id , driver_id FROM bookings WHERE ID =?" , [bookingId]);

    if(bookingActive.length === 0){
        return res.status(404).json({
                success: false,
                message: "booking was not found"
            })
    }

    if(bookingActive[0].booking_status != "active" && bookingActive[0].booking_status != "fully_paid"){
        return res.status(400).json(
            {
                success:false,
                message:"booking is not active or fully paid"
            }
        )
    }


       //get driver ID from 
    const [driveResponse] = await connection.execute("SELECT ID FROM driver_profiles WHERE user_id = ?" , [req.user.id]);

    if(driveResponse.length === 0){
        return res.status(404).json({
                success: false,
                message: "driver profile not found"
            })
    }

    //check wether the driver is assigned to the booking (if user is driver)
            //check if the user is supposed to acess the particular 
        if(req.user.user_type === 'driver'){
            if(driveResponse[0].ID != bookingActive[0].driver_id){
                return res.status(400).json(
            {
                success:false,
                message:"user is not permitted"
            }
        )
            }
        }
    
     // Format vehicle_location as MySQL POINT geometry
     // MySQL POINT format: ST_GeomFromText('POINT(lng lat)', 4326)
     // Note: lng comes first, then lat in MySQL POINT format
     const vehicleLocationSQL = `ST_GeomFromText('POINT(${vehicleLng} ${vehicleLat})', 4326)`;
     
     // Format route_points as JSON string (route_points is likely a JSON or TEXT column)
     let routePointsValue = null;
     if (parsedRoutePoints && Array.isArray(parsedRoutePoints) && parsedRoutePoints.length > 0) {
         routePointsValue = JSON.stringify(parsedRoutePoints);
     }

     // Build update query - embed GEOMETRY function directly in SQL, use ? for JSON parameter
     let updateQuery;
     let params = [];
     
     if (!routePointsValue) {
         // Only update vehicle_location (GEOMETRY field)
         updateQuery = `UPDATE bookings SET vehicle_location = ${vehicleLocationSQL} WHERE ID = ?`;
         params = [bookingId];
     } else {
         // Update both vehicle_location (GEOMETRY) and route_points (JSON/TEXT)
         updateQuery = `UPDATE bookings SET vehicle_location = ${vehicleLocationSQL}, route_points = ? WHERE ID = ?`;
         params = [routePointsValue, bookingId];
     }

     console.log('📝 [DRIVER] Executing update query:', updateQuery);
     console.log('📝 [DRIVER] Params:', params);
     console.log('📝 [DRIVER] Vehicle location:', { lat: vehicleLat, lng: vehicleLng });

     const [result] = await connection.execute(updateQuery, params);

        if(result.affectedRows <= 0){
            return res.status(403).json({
                success: false,
                message: "Could not update vehicle location details"
            });
        }

        await connection.commit();

        // Store vehicle position in Redis for fast access
        await redisHelpers.setVehiclePosition(bookingId, vehiclePosition, fullPathCoords);

        // Check geofence for dropoff points (40m radius) - runs in background, doesn't block response
        checkGeofenceForDropoffs(connection, bookingId, vehicleLat, vehicleLng).catch(err => {
            console.error('❌ [GEOFENCE] Background geofence check failed:', err);
        });

        // Use already-parsed variables (parsed earlier in the function)
        // parsedVehiclePosition and parsedRoutePoints are already available from lines 189-228
        
        // SIMPLIFIED: Broadcast position update via WebSocket with complete route data
        console.log(`🚗 [DRIVER] Broadcasting vehicle position update - Booking: ${bookingId}, Route points: ${parsedRoutePoints ? (Array.isArray(parsedRoutePoints) ? parsedRoutePoints.length : 'N/A') : 'none'}`);
        
        broadcastVehiclePosition(bookingId, {
            vehiclePosition: parsedVehiclePosition,
            routePoints: parsedRoutePoints, // Complete route as array of {lat, lng}
            driverId: driveResponse[0].ID
        });
        
        console.log('✅ [DRIVER] Vehicle position broadcast completed');

        return res.status(200).json({
             success: true,
            message: "Vehicle update successfully"
        });

     }catch(error){
        console.log(error);
        if(connection) await connection.rollback();
        return res.status(500).json({
             success: false,
            message: "Internal server error"
        });
     }finally{
        if(connection) connection.release();
     }

}

// Distance calculation removed - using visual map with WebSocket for real-time tracking instead

// Geofence check function - checks distance to passenger dropoff points and marks as "arrived" if within 40m
// Only checks passengers, not parcels
// Uses Redis cache for faster access, falls back to database if not cached
async function checkGeofenceForDropoffs(connection, bookingId, vehicleLat, vehicleLng) {
    const GEOFENCE_RADIUS_METERS = 40; // 40 meters
    
    console.log(`🔍 [GEOFENCE] Checking geofence for booking ${bookingId} at (${vehicleLat}, ${vehicleLng})`);
    
    // Use a separate connection to avoid issues with the main transaction
    let geofenceConnection = null;
    try {
        // Get a new connection for geofence check (connection from updateVehiclePosition might be released)
        geofenceConnection = await pool.getConnection();
        // Try to get passenger dropoffs from Redis first (faster)
        let passengerDropoffs = await redisHelpers.getPassengerDropoffs(bookingId);
        
        // If not in Redis, fetch from database and cache it
        if (!passengerDropoffs) {
            console.log(`📦 [GEOFENCE] Dropoff points not in Redis, fetching from database for booking ${bookingId}`);
            
            const [dropoffData] = await geofenceConnection.execute(
                `SELECT 
                    ID,
                    first_name,
                    last_name,
                    booking_passenger_status,
                    ST_X(dropoff_point) as dropoff_lng,
                    ST_Y(dropoff_point) as dropoff_lat
                FROM booking_passengers
                WHERE booking_id = ?
                    AND booking_passenger_status IN ('picked_up', 'in_transit')
                    AND dropoff_point IS NOT NULL`,
                [bookingId]
            );

            // Store in Redis for future use
            passengerDropoffs = dropoffData.map(p => ({
                id: p.ID,
                first_name: p.first_name,
                last_name: p.last_name,
                booking_passenger_status: p.booking_passenger_status,
                dropoff_lat: Number(p.dropoff_lat),
                dropoff_lng: Number(p.dropoff_lng)
            }));

            await redisHelpers.setPassengerDropoffs(bookingId, passengerDropoffs);
            console.log(`✅ [GEOFENCE] Cached ${passengerDropoffs.length} dropoff points in Redis`);
            if (passengerDropoffs.length > 0) {
                console.log(`📍 [GEOFENCE] Sample dropoff point:`, {
                    id: passengerDropoffs[0].id,
                    name: `${passengerDropoffs[0].first_name} ${passengerDropoffs[0].last_name}`,
                    lat: passengerDropoffs[0].dropoff_lat,
                    lng: passengerDropoffs[0].dropoff_lng,
                    status: passengerDropoffs[0].booking_passenger_status
                });
            }
        } else {
            console.log(`⚡ [GEOFENCE] Using cached dropoff points from Redis (${passengerDropoffs.length} points)`);
            if (passengerDropoffs.length > 0) {
                console.log(`📍 [GEOFENCE] Sample cached dropoff point:`, {
                    id: passengerDropoffs[0].id,
                    name: `${passengerDropoffs[0].first_name} ${passengerDropoffs[0].last_name}`,
                    lat: passengerDropoffs[0].dropoff_lat,
                    lng: passengerDropoffs[0].dropoff_lng,
                    status: passengerDropoffs[0].booking_passenger_status
                });
            }
        }

        if (passengerDropoffs.length === 0) {
            console.warn(`⚠️ [GEOFENCE] No passenger dropoff points found for booking ${bookingId}.`);
            console.warn(`⚠️ [GEOFENCE] This could mean:`);
            console.warn(`   - No passengers exist for this booking`);
            console.warn(`   - Passengers are not in 'picked_up' or 'in_transit' status`);
            console.warn(`   - Passengers don't have dropoff_point coordinates`);
            geofenceConnection.release();
            return; // Exit early if no dropoff points
        }

        // Calculate distance for each passenger dropoff point
        console.log(`🔍 [GEOFENCE] Checking ${passengerDropoffs.length} passenger dropoff points against vehicle position (${vehicleLat}, ${vehicleLng})`);
        const passengersNearDropoff = [];
        for (const passenger of passengerDropoffs) {
            // Calculate distance using Haversine formula (simpler than MySQL ST_Distance_Sphere for cached data)
            const distance = calculateHaversineDistance(
                vehicleLat,
                vehicleLng,
                passenger.dropoff_lat,
                passenger.dropoff_lng
            );

            console.log(`📏 [GEOFENCE] Passenger ${passenger.id} (${passenger.first_name} ${passenger.last_name}): Distance = ${distance.toFixed(2)}m (threshold: ${GEOFENCE_RADIUS_METERS}m)`);

            if (distance <= GEOFENCE_RADIUS_METERS) {
                console.log(`✅ [GEOFENCE] Passenger ${passenger.id} is within geofence!`);
                passengersNearDropoff.push({
                    ID: passenger.id,
                    first_name: passenger.first_name,
                    last_name: passenger.last_name,
                    booking_passenger_status: passenger.booking_passenger_status,
                    distance_meters: distance
                });
            }
        }

        console.log(`📊 [GEOFENCE] Found ${passengersNearDropoff.length} passenger(s) within ${GEOFENCE_RADIUS_METERS}m radius`);

        // Sort by distance (closest first)
        passengersNearDropoff.sort((a, b) => a.distance_meters - b.distance_meters);

        // Mark passengers as "arrived" if within geofence
        for (const passenger of passengersNearDropoff) {
            if (passenger.booking_passenger_status !== 'arrived') {
                await geofenceConnection.execute(
                    `UPDATE booking_passengers 
                     SET booking_passenger_status = 'arrived',
                         updated_at = NOW()
                     WHERE ID = ?`,
                    [passenger.ID]
                );
                console.log(`✅ [GEOFENCE] Passenger ${passenger.ID} (${passenger.first_name} ${passenger.last_name}) marked as arrived. Distance: ${passenger.distance_meters.toFixed(2)}m`);
                
                // Invalidate Redis cache since passenger status changed
                await redisHelpers.invalidatePassengerDropoffs(bookingId);
            }
        }

        // Broadcast geofence updates via WebSocket if any arrivals detected
        if (passengersNearDropoff.length > 0) {
            console.log(`📡 [GEOFENCE] Broadcasting geofence update for ${passengersNearDropoff.length} passenger(s)`);
            const geofenceData = {
                geofenceUpdate: {
                    passengersArrived: passengersNearDropoff.map(p => ({
                        id: p.ID,
                        name: `${p.first_name} ${p.last_name}`,
                        distance: p.distance_meters
                    }))
                }
            };
            console.log(`📡 [GEOFENCE] Geofence data to broadcast:`, JSON.stringify(geofenceData, null, 2));
            
            const { broadcastVehiclePosition } = await import('../config/socket.js');
            broadcastVehiclePosition(bookingId, geofenceData);
            console.log(`✅ [GEOFENCE] Geofence update broadcasted successfully`);
        } else {
            console.log(`ℹ️ [GEOFENCE] No passengers within ${GEOFENCE_RADIUS_METERS}m radius`);
        }

    } catch (error) {
        console.error('❌ [GEOFENCE] Error checking geofence:', error);
        console.error('❌ [GEOFENCE] Error stack:', error.stack);
        // Don't throw - geofence check failure shouldn't break vehicle position update
    } finally {
        // Release the geofence connection
        if (geofenceConnection) {
            geofenceConnection.release();
            console.log('🔌 [GEOFENCE] Connection released');
        }
    }
}

// Confirm dropoff endpoint - re-checks distance before finalizing
// Only for passengers (parcels are not checked by geofence)
export const confirmDropoff = async (req, res) => {
    checkUserType(req.user, ['driver']);
    
    const { bookingId, passengerId } = req.body;
    const GEOFENCE_RADIUS_METERS = 40;
    
    if (!bookingId || !passengerId) {
        return res.status(400).json({
            success: false,
            message: "bookingId and passengerId are required"
        });
    }

    let connection = null;
    try {
        connection = await pool.getConnection();
        await connection.beginTransaction();

        // Get current vehicle position from database
        const [bookingData] = await connection.execute(
            `SELECT vehicle_location FROM bookings WHERE ID = ?`,
            [bookingId]
        );

        if (bookingData.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Booking not found"
            });
        }

        const vehicleLocation = bookingData[0].vehicle_location;
        if (!vehicleLocation) {
            return res.status(400).json({
                success: false,
                message: "Vehicle location not available"
            });
        }

        // Extract vehicle coordinates from GEOMETRY field
        const [vehicleCoords] = await connection.execute(
            `SELECT ST_X(vehicle_location) as lng, ST_Y(vehicle_location) as lat 
             FROM bookings WHERE ID = ?`,
            [bookingId]
        );

        if (vehicleCoords.length === 0 || !vehicleCoords[0].lat || !vehicleCoords[0].lng) {
            return res.status(400).json({
                success: false,
                message: "Could not extract vehicle coordinates"
            });
        }

        const vehicleLat = vehicleCoords[0].lat;
        const vehicleLng = vehicleCoords[0].lng;
        const vehiclePointSQL = `ST_GeomFromText('POINT(${vehicleLng} ${vehicleLat})', 4326)`;

        // Re-check distance before confirming passenger dropoff
        const [passenger] = await connection.execute(
            `SELECT 
                ID,
                first_name,
                last_name,
                booking_passenger_status,
                ST_Distance_Sphere(${vehiclePointSQL}, dropoff_point) as distance_meters
            FROM booking_passengers
            WHERE ID = ? AND booking_id = ?`,
            [passengerId, bookingId]
        );

        if (passenger.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Passenger not found"
            });
        }

        if (passenger[0].booking_passenger_status !== 'arrived') {
            return res.status(400).json({
                success: false,
                message: "Passenger must be marked as 'arrived' before confirming dropoff"
            });
        }

        const distance = passenger[0].distance_meters;
        if (distance > GEOFENCE_RADIUS_METERS) {
            return res.status(400).json({
                success: false,
                message: `Vehicle is too far from dropoff point. Distance: ${distance.toFixed(2)}m (required: <= ${GEOFENCE_RADIUS_METERS}m)`
            });
        }

        // Mark as dropped off
        await connection.execute(
            `UPDATE booking_passengers 
             SET booking_passenger_status = 'dropped_off',
                 updated_at = NOW()
             WHERE ID = ?`,
            [passengerId]
        );

        // Invalidate Redis cache since passenger status changed
        await redisHelpers.invalidatePassengerDropoffs(bookingId);

        await connection.commit();

        return res.status(200).json({
            success: true,
            message: "Passenger dropoff confirmed",
            distance: distance
        });

    } catch (error) {
        if (connection) await connection.rollback();
        console.error('❌ [GEOFENCE] Error confirming dropoff:', error);
        return res.status(500).json({
            success: false,
            message: "Failed to confirm dropoff",
            error: error.message
        });
    } finally {
        if (connection) connection.release();
    }
}

//return the percentage based on the vehicle completing the trip
export const getVehiclePositionFullTrip = async(req,res)=>{
   checkUserType(req.user , ['driver', 'client' , 'admin']);
}

//check the status of the booking (tow functions :normal function and  export function (uses normal function))
export const checkBookingStatus = async(req,res)=>{
    //use the result of the getBookingStatus function
    
}

function getBookingStatus(bookingID){
    //query for the status of the booking

}

//detection on arrival and conformation by updating the database(for passengers)
export const detectionConformation = async()=>{
     
}

export default{
getBookingWaypoints,
updateVehiclePosition,
confirmDropoff,
checkBookingStatus,
detectionConformation
}