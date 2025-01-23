import mysql from "mysql2/promise";
import dotenv from "dotenv";

dotenv.config();


const db = await mysql.createConnection({
  host: 'localhost',
  user: 'TaxiMap_database',
  password: '12345',
  database: 'taximapdb'
});

console.log("Connection to database is Successful");

export default db;
