import mysql from "mysql2/promise";
import dotenv from "dotenv";

dotenv.config();


const pool = await mysql.createPool({
  host: 'localhost',
  user: 'TaxiMap_database',
  password: '12345',
  database: 'taximapdb',
  waitForConnections: true,
  connectionLimit: 10,  // for example, adjust as needed
  queueLimit: 0
});

console.log("Connection to database is Successful");

export default pool;
