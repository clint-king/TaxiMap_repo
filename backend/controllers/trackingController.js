import pool from "../config/db.js";

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

    //check wether the driver is assigned to the booking (if user is driver)
            //check if the user is supposed to acess the particular 
        if(req.user.user_type === 'driver'){
            if(req.user.id != bookingActive[0].driver_id){
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
checkBookingStatus,
detectionConformation
}