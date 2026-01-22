import pool from "../config/db.js";
import { redisHelpers } from "../config/redis.js";
import { broadcastVehiclePosition, broadcastCalculatedDistance } from "../config/socket.js";
import { WebSocketServer } from "ws";

const checkUserType = (user, allowedTypes) => {
    if (!allowedTypes.includes(user.user_type)) {
        throw new Error(`Access denied. Required user type: ${allowedTypes.join(' or ')}`);
    }
};


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
          WHERE booking_id = ?`, [bookingId]);


          if(bookingParcels.length > 0){
            bookingParcels.forEach(parcel =>{
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
          WHERE booking_id = ?`, [bookingId]);

            if(bookingPassengers.length > 0){

                bookingPassengers.forEach(passenger =>{
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
    
     //check fullCoords to determine update query
     let updateQuery;
     let params = [];
     if(!fullPathCoords || fullPathCoords === null){
        updateQuery = "UPDATE bookings SET vehicle_location = ?  WHERE ID = ?";
        params.push(vehiclePosition);
       
     }else{
        updateQuery ="UPDATE bookings SET vehicle_location = ? , route_points = ? WHERE ID = ?";
        params.push(vehiclePosition);
        params.push(fullPathCoords);
     }
     

        const [result] = await connection.execute(updateQuery ,[...params,bookingId]);

        if(result.affectedRows <= 0){
            return res.status(403).json({
                success: false,
                message: "Could not update vehicle location details"
            });
        }

        await connection.commit();

        // Store vehicle position in Redis for fast access
        await redisHelpers.setVehiclePosition(bookingId, vehiclePosition, fullPathCoords);

        // Broadcast position update via WebSocket to all clients tracking this booking
        broadcastVehiclePosition(bookingId, {
            vehiclePosition,
            routePoints: fullPathCoords,
            driverId: driveResponse[0].ID
        });

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

//FOR clients to get the calculated distance between the vehicle and the passenger or parcel
export const getCalculatedDistance = async(req,res)=>{
    try {
        checkUserType(req.user , ['client']);
        const {bookingId} = req.params;
        const {passengerId,parcelId,bookingType} = req.body;
      

       // Validate input parameters
       if(!bookingId || (!passengerId && !parcelId) || !bookingType){
        return res.status(400).json({
            success: false,
            message: "bookingId and either passengerId or parcelId and bookingType are required"
        });
       }

       if(bookingType !== 'passenger' && bookingType !== 'parcel'){
        return res.status(400).json({
            success: false,
            message: "Invalid booking type"
        });
       }

       // Get pickup position for passenger or parcel
       const pickupResult = await getPickupPosition(bookingType, passengerId, parcelId, bookingId);
       if(!pickupResult.success){
           return res.status(404).json({
               success: false,
               message: pickupResult.message
           });
       }
       const {lat: pickupLat, lng: pickupLng} = pickupResult;

       // Try to get vehicle position from Redis first (faster)
       let vehiclePositionRaw = null;
       let routePointsRaw = null;
       const redisData = await redisHelpers.getVehiclePosition(bookingId);
       
       if(redisData && redisData.position) {
           vehiclePositionRaw = redisData.position;
           routePointsRaw = redisData.routePoints;
       }

       // Fallback to database if not in Redis
       if(!vehiclePositionRaw || !routePointsRaw) {
           const bookingData = await getBookingRouteAndVehicle(bookingId);
           if(!bookingData.success){
               return res.status(bookingData.message === "Booking not found" ? 404 : 400).json({
                   success: false,
                   message: bookingData.message
               });
           }
           vehiclePositionRaw = bookingData.vehicleLocation;
           routePointsRaw = bookingData.routePoints;
       }

       // Parse route points
       const routeParseResult = parseRoutePoints(routePointsRaw);
       if(!routeParseResult.success){
           return res.status(400).json({
               success: false,
               message: routeParseResult.message
           });
       }

       // Parse vehicle location
       const vehicleParseResult = parseVehicleLocation(vehiclePositionRaw);
       if(!vehicleParseResult.success){
           return res.status(400).json({
               success: false,
               message: vehicleParseResult.message
           });
       }

       // Normalize vehicle location to coordinates
       const vehicleCoordsResult = normalizeVehicleLocation(vehicleParseResult.vehicleLocation);
       if(!vehicleCoordsResult.success){
           return res.status(400).json({
               success: false,
               message: vehicleCoordsResult.message
           });
       }
       const {lat: vehicleLat, lng: vehicleLng} = vehicleCoordsResult;

       // Normalize route points
       const routeNormalizeResult = normalizeRoute(routeParseResult.routePoints);
       if(!routeNormalizeResult.success){
           return res.status(400).json({
               success: false,
               message: routeNormalizeResult.message
           });
       }
       const normalizedRoute = routeNormalizeResult.route;

       // Find passenger's position in route (closest match, max 1km away)
       const passengerIndexResult = findClosestRouteIndex(normalizedRoute, pickupLat, pickupLng, 1.0);
       if(!passengerIndexResult.success){
           return res.status(400).json({
               success: false,
               message: passengerIndexResult.message || "Passenger pickup point is not on the route"
           });
       }
       const passengerIndex = passengerIndexResult.index;

       // Find vehicle's position in route
       const vehicleIndexResult = findClosestRouteIndex(normalizedRoute, vehicleLat, vehicleLng);
       if(!vehicleIndexResult.success){
           return res.status(400).json({
               success: false,
               message: vehicleIndexResult.message || "Vehicle position could not be determined on route"
           });
       }
       const vehicleIndex = vehicleIndexResult.index;

       // Calculate progress metrics (percentage, remaining distance, hasPassed)
       const metrics = calculateProgressMetrics(normalizedRoute, vehicleIndex, passengerIndex);

       // Generate status message
       const statusMessage = generateStatusMessage(metrics.hasPassed, metrics.remainingDistance);

       const responseData = {
           success: true,
           percentage: metrics.percentage,
           remainingDistance: metrics.remainingDistance,
           hasPassed: metrics.hasPassed,
           vehiclePosition: {
               lat: vehicleLat,
               lng: vehicleLng,
               routeIndex: vehicleIndex
           },
           passengerPosition: {
               lat: pickupLat,
               lng: pickupLng,
               routeIndex: passengerIndex
           },
           message: statusMessage
       };

       // Broadcast calculated distance via WebSocket to all clients tracking this booking
       broadcastCalculatedDistance(bookingId, responseData);

       return res.status(200).json(responseData);

    } catch(error) {
        console.error("Error in getCalculatedDistance:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
}



// Helper function to calculate distance between two coordinates using Haversine formula
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Radius of the earth in km
    const dLat = (lat2 - lat1) * (Math.PI / 180);  // Convert degrees to radians
    const dLon = (lon2 - lon1) * (Math.PI / 180); 
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const d = R * c; // Distance in km
    return d;
}

// Get pickup position for passenger or parcel
async function getPickupPosition(bookingType, passengerId, parcelId, bookingId) {
    let query, params, notFoundMessage;
    
    if(bookingType === 'passenger') {
        query = "SELECT ST_X(pickup_point) AS pickup_lng , ST_Y(pickup_point) AS pickup_lat FROM booking_passengers WHERE ID = ? AND booking_id = ?";
        params = [passengerId, bookingId];
        notFoundMessage = "Passenger not found for this booking";
    } else {
        query = "SELECT ST_X(pickup_point) AS pickup_lng , ST_Y(pickup_point) AS pickup_lat FROM booking_parcels WHERE ID = ? AND booking_id = ?";
        params = [parcelId, bookingId];
        notFoundMessage = "Parcel not found for this booking";
    }
    
    const [result] = await pool.execute(query, params);
    
    if(result.length === 0){
        return { success: false, message: notFoundMessage };
    }
    
    return {
        success: true,
        lat: Number(result[0].pickup_lat),
        lng: Number(result[0].pickup_lng)
    };
}

// Get booking route points and vehicle location from database
async function getBookingRouteAndVehicle(bookingId) {
    const [bookingResult] = await pool.execute(
        "SELECT route_points, vehicle_location FROM bookings WHERE ID = ?", 
        [bookingId]
    );

    if(bookingResult.length === 0){
        return { success: false, message: "Booking not found" };
    }

    const routePointsRaw = bookingResult[0].route_points;
    const vehicleLocationRaw = bookingResult[0].vehicle_location;

    if(!routePointsRaw){
        return { success: false, message: "Route points not found for this booking" };
    }

    if(!vehicleLocationRaw){
        return { success: false, message: "Vehicle location not available" };
    }

    return {
        success: true,
        routePoints: routePointsRaw,
        vehicleLocation: vehicleLocationRaw
    };
}

// Parse route points from database format
function parseRoutePoints(routePointsRaw) {
    try {
        const routePoints = typeof routePointsRaw === 'string' ? JSON.parse(routePointsRaw) : routePointsRaw;
        
        if(!Array.isArray(routePoints) || routePoints.length === 0){
            return { success: false, message: "Route points is empty or invalid" };
        }
        
        return { success: true, routePoints };
    } catch(e){
        return { success: false, message: "Invalid route points format" };
    }
}

// Parse vehicle location from various formats (JSON, POINT, array)
function parseVehicleLocation(vehicleLocationRaw) {
    try {
        let vehicleLocation;
        
        if(typeof vehicleLocationRaw === 'string'){
            // Try to parse as JSON first
            try {
                vehicleLocation = JSON.parse(vehicleLocationRaw);
            } catch {
                // Might be POINT format "POINT(lng lat)"
                if(vehicleLocationRaw.startsWith('POINT(')){
                    const pointStr = vehicleLocationRaw.replace('POINT(', '').replace(')', '');
                    const parts = pointStr.split(' ');
                    if(parts.length >= 2){
                        vehicleLocation = {lng: parseFloat(parts[0]), lat: parseFloat(parts[1])};
                    }
                } else {
                    vehicleLocation = vehicleLocationRaw;
                }
            }
        } else {
            vehicleLocation = vehicleLocationRaw;
        }
        
        return { success: true, vehicleLocation };
    } catch(e){
        return { success: false, message: "Invalid vehicle location format" };
    }
}

// Normalize vehicle location to {lat, lng} format
function normalizeVehicleLocation(vehicleLocation) {
    let vehicleLat, vehicleLng;
    
    if(Array.isArray(vehicleLocation)){
        // Format: [lng, lat]
        vehicleLng = Number(vehicleLocation[0]);
        vehicleLat = Number(vehicleLocation[1]);
    } else if(vehicleLocation.lat !== undefined && vehicleLocation.lng !== undefined){
        vehicleLat = Number(vehicleLocation.lat);
        vehicleLng = Number(vehicleLocation.lng);
    } else if(vehicleLocation.latitude !== undefined && vehicleLocation.longitude !== undefined){
        vehicleLat = Number(vehicleLocation.latitude);
        vehicleLng = Number(vehicleLocation.longitude);
    } else {
        return { success: false, message: "Invalid vehicle location coordinates" };
    }
    
    return { success: true, lat: vehicleLat, lng: vehicleLng };
}

// Normalize route points to consistent format [{lat, lng}]
function normalizeRoute(routePoints) {
    const normalizedRoute = routePoints.map(point => {
        if(Array.isArray(point)){
            // Format: [lng, lat]
            return {lat: Number(point[1]), lng: Number(point[0])};
        } else if(point.lat !== undefined && point.lng !== undefined){
            return {lat: Number(point.lat), lng: Number(point.lng)};
        } else if(point.latitude !== undefined && point.longitude !== undefined){
            return {lat: Number(point.latitude), lng: Number(point.longitude)};
        }
        return null;
    }).filter(p => p !== null);

    if(normalizedRoute.length === 0){
        return { success: false, message: "No valid route points found" };
    }
    
    return { success: true, route: normalizedRoute };
}

// Find the closest point index in the route to a given coordinate
function findClosestRouteIndex(normalizedRoute, targetLat, targetLng, maxDistance = Infinity) {
    let closestIndex = -1;
    let minDistance = Infinity;
    
    for(let i = 0; i < normalizedRoute.length; i++){
        const dist = calculateDistance(
            normalizedRoute[i].lat,
            normalizedRoute[i].lng,
            targetLat,
            targetLng
        );
        if(dist < minDistance){
            minDistance = dist;
            closestIndex = i;
        }
    }
    
    if(minDistance > maxDistance){
        return { success: false, message: `Point is more than ${maxDistance}km away from route` };
    }
    
    return { success: true, index: closestIndex, distance: minDistance };
}

// Calculate distance along route between two indices
function calculateRouteDistance(normalizedRoute, startIndex, endIndex) {
    if(startIndex === endIndex) return 0;
    
    let distance = 0;
    const step = startIndex < endIndex ? 1 : -1;
    
    for(let i = startIndex; i !== endIndex; i += step){
        distance += calculateDistance(
            normalizedRoute[i].lat,
            normalizedRoute[i].lng,
            normalizedRoute[i + step].lat,
            normalizedRoute[i + step].lng
        );
    }
    
    return distance;
}

// Calculate percentage and remaining distance along route
function calculateProgressMetrics(normalizedRoute, vehicleIndex, passengerIndex) {
    const hasPassed = vehicleIndex > passengerIndex;
    
    // Calculate distance from start to passenger
    const totalDistanceToPassenger = calculateRouteDistance(normalizedRoute, 0, passengerIndex);
    
    // Calculate distance from start to vehicle
    const totalDistanceToVehicle = calculateRouteDistance(normalizedRoute, 0, vehicleIndex);
    
    // Calculate remaining distance from vehicle to passenger
    const remainingDistance = calculateRouteDistance(
        normalizedRoute, 
        vehicleIndex, 
        passengerIndex
    );
    
    // Calculate percentage (how much of route from start to passenger has been completed)
    let percentage = 0;
    if(totalDistanceToPassenger > 0){
        percentage = (totalDistanceToVehicle / totalDistanceToPassenger) * 100;
        // Cap at 100% if vehicle has passed
        if(hasPassed || percentage > 100){
            percentage = 100;
        }
    }
    
    return {
        percentage: Math.round(percentage * 100) / 100,
        remainingDistance: Math.round(remainingDistance * 100) / 100,
        hasPassed,
        totalDistanceToPassenger,
        totalDistanceToVehicle
    };
}

// Generate response message based on vehicle position
function generateStatusMessage(hasPassed, remainingDistance) {
    if(hasPassed) {
        return "Vehicle has passed the passenger's pickup location";
    }
    return `Vehicle is ${Math.round(remainingDistance * 1000)} meters away along the route`;
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
getCalculatedDistance,
checkBookingStatus,
detectionConformation
}