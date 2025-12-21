import poolDb from "../config/db.js";

const searchForCode = async(bookingID , code) =>{
    let db;
    try{
        db = await poolDb.getConnection();
        const [rows] = await db.execute(`SELECT bp.*
            FROM
             booking_passengers bp
            JOIN 
             bookings b ON bp.booking_id = b.ID
             WHERE
              b.ID = ? AND bp.code = ? 
            ` , [ bookingID , code]);

            return rows[0];

    }catch(error){
    console.log(error);
    return null;
    }finally{
        if(db) db.release();
    }
}

const updateStatus =  async(booking_passengers_ID , status)=>{
let db;
try{
 db = await poolDb.getConnection();
 const [result] = await db.execute(`UPDATE booking_passengers SET booking_passenger_status = ? WHERE ID = ?` , 
    [status , booking_passengers_ID]);

return result.affectedRows > 0;
}catch(error){
console.log(error);
return false;
}finally{
if(db) db.release();
}
}

//check booking status

const getBookingStatus = async(bookingID) =>{
    let db;
    try{
        db = await poolDb.getConnection();
        const [rows] = await db.execute(`SELECT booking_status FROM bookings WHERE ID = ? ` , [bookingID]);
        return rows[0];
    }catch(error){
        console.log(error);
        return null;
    }finally{
        if(db) db.release();
    }
}

//return a list of passengers
const listOfPassengers = async(bookingID) =>{
    let db;
    try{
        db = await poolDb.getConnection();
        const [rows] = await db.execute(`
            SELECT bp.*
            FROM
             booking_passengers bp
            JOIN 
             bookings b ON bp.booking_id = b.ID
             WHERE
             bp.booking_passenger_status = 'pending' OR bp.booking_passenger_status = 'confirmed'  AND b.ID = ? 
            ` , [bookingID]);

            return rows;
    }catch(error){
    console.log(error);
    return null;
    }finally{
        if(db) db.release();
    }
}

export default{
    searchForCode,
    updateStatus,
    getBookingStatus,
    listOfPassengers
}