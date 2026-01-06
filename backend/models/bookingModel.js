import poolDb from "../config/db.js";

const checkBooking = async (bookingID , userID) =>{
let db;
try{
 db = await poolDb.getConnection();
 const [rows] = await db.execute(`SELECT *  FROM booking_passengers bp
JOIN bookings b ON b.ID = bp.booking_id
WHERE b.ID = ? AND bp.user_id = ? AND bp.status = IN('confirmed','dropped-off') ` , [bookingID , userID]);

const [rows1] = await db.execute(`SELECT *  FROM booking_parcels bp
JOIN bookings b ON b.ID = bp.booking_id
WHERE b.ID = ? AND bp.user_id = ? AND bp.status = IN('confirmed','dropped-off')` , [bookingID , userID]);

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

export default {
    checkBooking
}
