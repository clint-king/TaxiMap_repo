import pool from "../config/db.js";

const checkUserType = (user, allowedTypes) => {
    if (!allowedTypes.includes(user.user_type)) {
        throw new Error(`Access denied. Required user type: ${allowedTypes.join(' or ')}`);
    }
};

// Shold return true if there is a link and false if there is no link
const verifyDriverAndBookingLink = async (driver_id , booking_id)=>{
    const sql = "SELECT driver_id FROM bookings WHERE ID =?";
    const [booking_driverID] = await pool.execute(sql , [booking_id]);

     if(booking_driverID.length === 0){
        console.log( "booking  was not found [In verifyDriverAndBookingLink]")
        return false;
    }

    const int_bookingDriverID = parseInt(booking_driverID[0].driver_id);

    if(int_bookingDriverID === parseInt(driver_id)){
        return true;
    }

    return false;
}

// verify parcel code upon pickup
export const verifyParcelPickUpCode = async(req,res)=>{
checkUserType(req.user , ['driver']);

//check if the booking is active

//check if the driver is linked to the booking id

//check if the booking_parcels has a matching pickup code

//If the code exists update the status to conformede if not send an error message



}

//verify parcel code upon drop off
export const verifyParcelDropOffCode = async(req,res)=>{
checkUserType(req.user , ['driver']);

//check if the booking is active

//check if the driver is linked to the booking id

//check if the booking_parcels has a matching dropoff code

//If the code exists update the status to confirmed if not send an error message


}

//List of parcels

export const listOfParcelsBooking = async(req,res)=>{
checkUserType(req.user , ['driver' , 'owner', 'admin']);

//check if the booking is pending , fully_paid , active

//list the parcels and make sure the status of all the parcels is pending or in_transit

}

// processing driver/owner's rejection
export const rejectParcel = async(req,res)=>{
checkUserType(req.user , ['driver', 'owner' , 'admin']);

}

export default{
verifyParcelPickUpCode,
verifyParcelDropOffCode,
listOfParcelsBooking
}