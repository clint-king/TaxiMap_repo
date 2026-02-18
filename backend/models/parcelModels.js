import poolDb from "../config/db.js";

const searchForCode = async(bookingID , code) =>{
    let db;
    try{
        db = await poolDb.getConnection();
        const [rows] = await db.execute(`SELECT bp.* 
            FROM booking_parcels bp
            JOIN bookings b ON bp.booking_id = b.ID
            WHERE b.booking_status IN ('active' , 'fully_paid') AND b.ID = ? AND bp.sender_code = ?` , [bookingID , code]);
        return rows[0];
    }catch(error){
        console.log(error);
        return null;
    }finally{
        if(db) db.release();
    }
}

const updateStatus = async(booking_parcels_ID , status) =>{
    let db;
    try{
        db = await poolDb.getConnection();
        const [result] = await db.execute(`UPDATE booking_parcels SET status = ? WHERE ID = ?` , [status , booking_parcels_ID]);  
        return result.affectedRows > 0;
    }catch(error){
        console.log(error);
        return false;
    }finally{
        if(db) db.release();
    }
}


const getParcels = async(booking_parcels_ID) =>{
    let db;
    try{
        db = await poolDb.getConnection();
        const [result] = await db.execute(`SELECT * FROM parcel WHERE booking_parcels_id = ?` , [booking_parcels_ID]);
        return result;
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
    getParcels
}