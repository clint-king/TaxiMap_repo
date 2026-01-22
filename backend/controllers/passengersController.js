import pool from "../config/db.js";
import passengerModels from "../models/passengerModels.js";
import parcelModels from "../models/parcelModels.js";


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

    //get the driver_id from the driver_profiles table
    const [driver_profile] = await pool.execute("SELECT ID FROM driver_profiles WHERE user_id =?" , [driver_id]);
    if(driver_profile.length === 0){
        console.log( "driver profile was not found [In verifyDriverAndBookingLink]")
        return false;
    }
    const driver_profile_id = driver_profile[0].ID;

    if( parseInt(booking_driverID[0].driver_id) === parseInt(driver_profile_id)){
        return true;
    }

    return false;
}
/**
 * Verify passengers during pickups . Searches thorugh the booking_passengers to find a code
 * that matches code_inserted (variable)
 * 
 * @param {number} driver_id 
 * @param {number} booking_id 
 * @param {string} code_inserted
 */
// export const verifyPassengerPickUpCode = async(req,res)=>{

//     checkUserType(req.user , ['driver']);
//     const {driver_id, booking_id,code_inserted} = req.body;

//     //check if the booking is active 
//     const [bookingActive] = await pool.execute("SELECT booking_status FROM bookings WHERE ID =?" , [booking_id]);

//     if(bookingActive.length === 0){
//         return res.status(404).json({
//                 success: false,
//                 message: "booking was not found"
//             })
//     }

//     if(bookingActive[0].booking_status != "active"){
//         return res.status(400).json(
//             {
//                 success:false,
//                 message:"booking is not active"
//             }
//         )
//     }
//     //check if the driver is linked to the booking id
//     const chechLink = verifyDriverAndBookingLink(driver_id ,booking_id); //returns true or false
//     if(chechLink == false){
//          return res.status(400).json(
//             {
//                 success:false,
//                 message:"the driver is not linked to this booking"
//             }
//         )
//     }

//     //check if the code exists in booking_passengers table that references the booking_id above
//     const codeSearch = await passengerModels.searchForCode(booking_id , code_inserted);

//     //If it does not exists send a 404 with a code of not found 
//     if(!codeSearch){
//         return res.status(404).json(
//             {
//                 success:false,
//                 message:"Code not found"
//             }
//         );
//     }

//     //If it exits change the status of the booking_passengers table to confirmed
//     //And then send a successful message

//     const update_status = await passengerModels.updateStatus(codeSearch.ID , 'confirmed');
//     if(!update_status){
//         return res.status(400).json(
//             {
//                success:false,
//                message:"Could not update status" 
//             }
//         )
//     }

//     return res.status(201).json(
//         {
//                 success:true,
//                 codeSearch
//             }
//     )
// } 

export const verifyPassengerOrParcelPickUpCode = async(req,res)=>{
    checkUserType(req.user , ['driver']);
    const { booking_id,code_inserted} = req.body;
    const driver_user_id = req.user.id; // Get driver_id from authenticated user

    //check if the booking is active
    const [bookingActive] = await pool.execute("SELECT booking_status FROM bookings WHERE ID =?" , [booking_id]);
    if(bookingActive.length === 0){
        return res.status(404).json(
            {
                success:false,
                message:"booking was not found"
            }
        )
    }
    if(bookingActive[0].booking_status != "active" && bookingActive[0].booking_status != "fully_paid"){
        return res.status(400).json(
            {
                success:false,
                message:"booking is not active"
            }
        )
    }
    //check if the driver is linked to the booking id
    const chechLink = await verifyDriverAndBookingLink(driver_user_id ,booking_id); //returns true or false
    if(chechLink == false){
        return res.status(400).json(
            {
                success:false,
                message:"the driver is not linked to this booking"
            }
        )
    }


    //check if the code exists in booking_passengers table that references the booking_id above
    const codeSearch = await passengerModels.searchForCode(booking_id , code_inserted);
    const codeSearchParcel = await parcelModels.searchForCode(booking_id , code_inserted);
    if(!codeSearch && !codeSearchParcel){
        return res.status(404).json(
            {
                success:false,
                message:"Code not found"
            }
        )
    }

    if(codeSearch){
        const update_status = await passengerModels.updateStatus(codeSearch.ID , 'confirmed');
        if(!update_status){
            return res.status(400).json(
                {
                    success:false,
                    message:"Could not update status"
                }
            )
        }
    }
    if(codeSearchParcel){
        const update_status = await parcelModels.updateStatus(codeSearchParcel.ID , 'confirmed');
        if(!update_status){
            return res.status(400).json(
                {
                    success:false,
                    message:"Could not update status"
                }
            )
        }
    }

    if(codeSearch){
        return res.status(201).json(
            {
                success:true,
                type: "passenger",
                message:"Code verified successfully",
                values: {
                    first_name: codeSearch.first_name,
                    last_name: codeSearch.last_name,
                    email: codeSearch.email,
                    phone: codeSearch.phone,
                    code: codeSearch.code,
                    booking_passenger_status: codeSearch.booking_passenger_status,
                }
            }
        )
    }
    if(codeSearchParcel){

        //get parcels that are linked to the booking_parcels
        const parcels = await parcelModels.getParcels(codeSearchParcel.ID);
        if(!parcels || parcels.length === 0){
            return res.status(404).json(
                {
                    success:false,
                    message:"Parcels not found"
                }
            )
        }

        //return the parcels that are linked to the booking_id
        return res.status(201).json(
            {
                success:true,
                type: "parcel",
                message:"Code verified successfully",
                values: {
                    sender_name: codeSearchParcel.sender_name,
                    sender_email: codeSearchParcel.sender_email,
                    sender_phone: codeSearchParcel.sender_phone,
                    sender_code: codeSearchParcel.sender_code,
                    booking_parcel_status: codeSearchParcel.booking_parcel_status,
                    parcels: parcels.map(parcel => ({
                        id: parcel.ID,
                        parcel_number: parcel.parcel_number,
                        size: parcel.size,
                        quantity_compared_to_sp: parcel.quantity_compared_to_sp,
                        description: parcel.description,
                        images: parcel.images,
                    }))
                }
            }
        )
    }

    return res.status(404).json(
        {
            success:false,
            message:"Code not found"
        }
    )
}


/**
 * list of passengers with their informations
 * @param {*} req 
 * @param {*} res 
 */
export const listOfBookingPassengers = async(req,res)=>{
   checkUserType(req.user , ['driver', 'owner']);
   const {driver_id, booking_id } = req.body;

   //check if the booking has a booking_status that says fully_paid , active

    //check if the driver is linked to the booking id
   const chechLink = verifyDriverAndBookingLink(driver_id ,booking_id); //returns true or false

   //list all passengers that are linked to the booking_id

   //retrn the list of the passengers if it exists if it doesnt then 

}


export default{
listOfBookingPassengers,
verifyPassengerOrParcelPickUpCode
}