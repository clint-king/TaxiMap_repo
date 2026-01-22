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


export default {
    checkBooking,
    getDriverBookingDetails,
    getPickupDropoffInfo,
}
