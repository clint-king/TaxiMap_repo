import pool from "../config/db.js";
import passengerModels from "../models/passengerModels.js";


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
/**
 * Verify passengers during pickups . Searches thorugh the booking_passengers to find a code
 * that matches code_inserted (variable)
 * 
 * @param {number} driver_id 
 * @param {number} booking_id 
 * @param {string} code_inserted
 */
export const verifyPassengerPickUpCode = async(req,res)=>{

    checkUserType(req.user , ['driver']);
    const {driver_id, booking_id,code_inserted} = req.body;

    //check if the booking is active 
    const [bookingActive] = await pool.execute("SELECT booking_status FROM bookings WHERE ID =?" , [booking_id]);

    if(bookingActive.length === 0){
        return res.status(404).json({
                success: false,
                message: "booking was not found"
            })
    }

    if(bookingActive[0].booking_status != "active"){
        return res.status(400).json(
            {
                success:false,
                message:"booking is not active"
            }
        )
    }
    //check if the driver is linked to the booking id
    const chechLink = verifyDriverAndBookingLink(driver_id ,booking_id); //returns true or false
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

    //If it does not exists send a 404 with a code of not found 
    if(!codeSearch){
        return res.status(404).json(
            {
                success:false,
                message:"Code not found"
            }
        );
    }

    //If it exits change the status of the booking_passengers table to confirmed
    //And then send a successful message

    const update_status = await passengerModels.updateStatus(codeSearch.ID , 'confirmed');
    if(!update_status){
        return res.status(400).json(
            {
               success:false,
               message:"Could not update status" 
            }
        )
    }

    return res.status(201).json(
        {
                success:true,
                codeSearch
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
verifyPassengerPickUpCode,
listOfBookingPassengers
}