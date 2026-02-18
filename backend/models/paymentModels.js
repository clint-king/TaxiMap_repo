import pool from "../config/db.js";

const updatePayment = async () =>{
let db;
try{
 db = await poolDb.getConnection();

}catch(error){
console.log(error);

return null;
}finally{
if (db) db.release(); // release connection back to the pool
}

}

export default{

};