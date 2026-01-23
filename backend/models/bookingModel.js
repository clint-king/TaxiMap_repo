import poolDb from "../config/db.js";

const checkBooking = async (bookingID , userID) =>{
let db;
try{
 db = await poolDb.getConnection();
 const [rows] = await db.execute(`SELECT *  FROM booking_passengers bp
JOIN bookings b ON b.ID = bp.booking_id
WHERE b.ID = ? AND bp.user_id = ? AND bp.status IN ('confirmed','dropped-off') ` , [bookingID , userID]);

const [rows1] = await db.execute(`SELECT *  FROM booking_parcels bp
JOIN bookings b ON b.ID = bp.booking_id
WHERE b.ID = ? AND bp.user_id = ? AND bp.status IN ('confirmed','dropped-off')` , [bookingID , userID]);

const parcels = rows[0] &&  rows[0].length !== 0 ? rows[0]  : null;
const passengerList = rows1[0] && rows1[0].length !== 0 ? rows1[0] : null;

return {
    parcel:parcels,
    passenger:passengerList
}

}catch(error){
    console.log(error);
    return null;
}finally{
   if(db) db.release();
}
}

// ============================================
// DRIVER ROUTES
// ============================================
const getDriverBookingDetails = async (bookingId) =>{   
    let db;
    try{
        db = await poolDb.getConnection();
        const [rows] = await db.execute(`SELECT bookings.ID as booking_id , bookings.booking_status as booking_status ,
            bookings.booking_reference as booking_reference ,bookings.scheduled_pickup as scheduled_pickup , bookings.total_seats_available as total_seats_available ,
            bookings.total_seats as total_seats , bookings.direction_type as direction_type,bookings.seat_parcel_count +  bookings.extraspace_count  as total_parcels, vehicles.make as vehicle_make ,
            vehicles.model as vehicle_model , vehicles.color as vehicle_color , vehicles.registration_number as vehicle_registration_number , existing_routes.location_1 as location_1 ,
            existing_routes.location_2 as location_2 , existing_routes.route_name as route_name , existing_routes.distance_km as distance_km , existing_routes.typical_duration_hours as typical_duration_hours
            FROM bookings 
            LEFT JOIN vehicles ON bookings.vehicle_id = vehicles.ID
            LEFT JOIN existing_routes ON bookings.existing_route_id = existing_routes.ID
            WHERE bookings.ID = ?` , [bookingId]);
        return rows[0];
    }catch(error){
        console.log(error);
        return null;
    }finally{
        if(db) db.release();
    }
}

const getPickupDropoffInfo = async (bookingId) =>{
    let db;
    try{
        db = await poolDb.getConnection();
        const [bookingPassengers] = await db.execute(`SELECT * FROM booking_passengers 
            WHERE booking_id = ? AND booking_passenger_status = 'confirmed'` , [bookingId]);

        const [bookingParcels] = await db.execute(`SELECT * FROM 
            booking_parcels WHERE booking_id = ? AND status IN ('confirmed', 'in_transit')` , [bookingId]);

        if(bookingPassengers.length === 0 && bookingParcels.length === 0){
            return null;
        }

        let listOfPickUpInfo = [];
        let listOfDropOffInfo = [];

        if(bookingPassengers.length > 0){
            bookingPassengers.forEach(passenger =>{
                listOfPickUpInfo.push({
                    type: 'passenger',
                    id: passenger.ID,
                    name: passenger.first_name + ' ' + passenger.last_name,
                    phone: passenger.phone,
                    email: passenger.email,
                    pickup_point: passenger.pickup_point,
                    pickup_address: passenger.pickup_address
                });

                listOfDropOffInfo.push({
                    type: 'passenger',
                    id: passenger.ID,
                    name: passenger.first_name + ' ' + passenger.last_name,
                    phone: passenger.phone,
                    email: passenger.email,
                    dropoff_point: passenger.dropoff_point,
                    dropoff_address: passenger.dropoff_address
                });
            });
        }

        if(bookingParcels.length > 0){
            bookingParcels.forEach(parcel =>{
                listOfPickUpInfo.push({
                    type: 'parcel',
                    id: parcel.ID,
                    name: parcel.sender_name,
                    phone: parcel.sender_phone,
                    email: parcel.sender_email,
                    pickup_point: parcel.pickup_point,
                    pickup_address: parcel.pickup_address
                });

                listOfDropOffInfo.push({
                    type: 'parcel',
                    id: parcel.ID,
                    name: parcel.receiver_name,
                    phone: parcel.receiver_phone,
                    email: parcel.receiver_email,
                    dropoff_point: parcel.dropoff_point,
                    dropoff_address: parcel.dropoff_address
                });
            });
        }

        return {
            pickup_info: listOfPickUpInfo,
            dropoff_info: listOfDropOffInfo
        }

    }catch(error){
        console.log(error);
        return null;
    }finally{
        if(db) db.release();
    }

}


// ============================================
// OWNER ROUTES
// ============================================


//list of upcoming trips for owner

const listOfUpcomingTripsOwner = async (ownerProfileId) =>{
    let db;
    try{
        db = await poolDb.getConnection();
        const [rows] = await db.execute(`  SELECT b.direction_type, b.scheduled_pickup, b.booking_status,
            b.booking_reference, b.total_amount_paid, b.total_amount_needed, b.passenger_count , b.seat_parcel_count + b.extraspace_count as total_parcels,
             b.created_at, b.updated_at, er.route_name, er.location_1, er.location_2 , er.distance_km, er.typical_duration_hours
            FROM bookings b
            JOIN existing_routes er ON b.existing_route_id = er.id
            WHERE b.owner_id = ? AND b.booking_status IN ('pending','fully_paid','active') AND b.scheduled_pickup >= CURRENT_DATE ORDER BY b.scheduled_pickup ASC;` , [ownerProfileId]);

        return rows;
    }catch(error){
        console.log(error);
        return null;
    }finally{
        if(db) db.release();
    }
}


//List of all bookings
const listOfAllBookingsOwner = async (ownerProfileId) =>{
    let db;
    try{ 
        db = await poolDb.getConnection();
        const [getBookings] = await db.execute(`  SELECT b.ID as booking_id, b.direction_type, b.scheduled_pickup, b.booking_status,
            b.booking_reference, b.total_amount_paid, b.total_amount_needed, b.passenger_count , b.seat_parcel_count + b.extraspace_count as total_parcels,
             b.created_at, b.updated_at,er.ID as existing_route_id, er.route_name, er.location_1, er.location_2 , er.distance_km, er.typical_duration_hours,
             u_driver.name as driver_name , u_driver.email as driver_email , u_driver.phone as driver_phone , dp.ID as driver_id ,
             dp.verification_status , u_driver.profile_picture as driver_profile_picture, u_driver.ID as user_id
            FROM bookings b
            JOIN existing_routes er ON b.existing_route_id = er.id
            JOIN driver_profiles dp ON b.driver_id = dp.ID
            JOIN users u_driver ON dp.user_id = u_driver.ID
            WHERE b.owner_id = ? ORDER BY b.scheduled_pickup ASC;` , [ownerProfileId]);

            if(!getBookings || getBookings.length === 0){
                return null;
            }

            //get pssengers and parcels per booking
            let listOfBookings = [];
           
            getBookings.forEach( async (booking) =>{
                let listOfPassengers = [];
                let listOfParcels = [];
                const [passengers] = await db.execute(`SELECT * FROM booking_passengers WHERE booking_id = ?` , [booking.booking_id]);
                const [parcels] = await db.execute(`SELECT 
                    booking_parcels.ID as parcel_booking_id,
                    p.ID as parcel_id,
                    booking_parcels.status as parcel_status, 
                    booking_parcels.sender_name as parcel_sender_name, 
                    booking_parcels.sender_phone as parcel_sender_phone,
                    booking_parcels.receiver_name as parcel_receiver_name, 
                    booking_parcels.receiver_phone as parcel_receiver_phone,
                    p.size as parcel_size, 
                    p.images as parcel_images,
                    ST_X(booking_parcels.pickup_point) as parcel_pickup_lng,
                    ST_Y(booking_parcels.pickup_point) as parcel_pickup_lat,
                    ST_X(booking_parcels.dropoff_point) as parcel_dropoff_lng,
                    ST_Y(booking_parcels.dropoff_point) as parcel_dropoff_lat,
                    booking_parcels.pickup_address as parcel_pickup_address, 
                    booking_parcels.dropoff_address as parcel_dropoff_address
                    FROM booking_parcels
                    LEFT JOIN parcel p ON p.booking_parcels_id = booking_parcels.ID
                    WHERE booking_parcels.booking_id = ?` , [booking.booking_id]);

                if(passengers && passengers.length > 0){
                    passengers.forEach(passenger =>{
                        listOfPassengers.push({
                            id: passenger.ID,
                            name: passenger.first_name + ' ' + passenger.last_name,
                            phone: passenger.phone,
                            email: passenger.email,
                            pickup_point: passenger.pickup_point,
                            pickup_address: passenger.pickup_address,
                            dropoff_point: passenger.dropoff_point,
                            dropoff_address: passenger.dropoff_address,
                        });
                    });
                }
             
                if(parcels && parcels.length > 0){
                    parcels.forEach(parcel =>{
                        listOfParcels.push({
                            id: parcel.parcel_id,
                            parcel_id: parcel.parcel_id,
                            parcel_status: parcel.parcel_status,
                            parcel_sender_name: parcel.parcel_sender_name,
                            parcel_sender_phone: parcel.parcel_sender_phone,
                            parcel_receiver_name: parcel.parcel_receiver_name,
                            parcel_receiver_phone: parcel.parcel_receiver_phone,
                            parcel_size: parcel.parcel_size,
                            parcel_images: parcel.parcel_images,
                            parcel_pickup_point: parcel.parcel_pickup_point,
                            parcel_dropoff_point: parcel.parcel_dropoff_point,
                            parcel_pickup_address: parcel.parcel_pickup_address,
                            parcel_dropoff_address: parcel.parcel_dropoff_address
                        });
                    }); 
                }

                listOfBookings.push({
                    id: booking.booking_id,
                    bookingInfo: booking,
                    passengers: listOfPassengers,
                    parcels: listOfParcels
                });

            
            });

        return listOfBookings;
    }catch(error){
        console.log(error);
        return null;
    }finally{
        if(db) db.release();
    }
}

export default {
    checkBooking,
    getDriverBookingDetails,
    getPickupDropoffInfo,
    listOfUpcomingTripsOwner,
    listOfAllBookingsOwner,
}
