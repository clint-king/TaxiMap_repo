import mysql from "mysql2/promise";
import dotenv from "dotenv";

dotenv.config();


let pool = null;
console.log("NODE_ENV in db.js: " , process.env.NODE_ENV);
//if(process.env.NODE_ENV == 'development'){
  pool = await mysql.createPool({
  host: 'localhost',
  user: 'TaxiMap_database',
  password: '12345',
  database: 'taximapdb',
  waitForConnections: true,
  connectionLimit: 10,  // for example, adjust as needed
  queueLimit: 0
});
// }else{
//  pool = await mysql.createPool({
//   host: 'turntable.proxy.rlwy.net',
//   port: 16301,
//   user: 'root',
//   password: 'BQGqyvPPCWSjCHKCIjRQsaobCexagOdQ',
//   database: 'railway',
//   waitForConnections: true,
//   connectionLimit: 10,  // for example, adjust as needed
//   queueLimit: 0
// });
//}


console.log("Connection to database is Successful");

export default pool;
