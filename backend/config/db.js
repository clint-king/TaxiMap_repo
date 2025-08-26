import mysql from "mysql2/promise";
import config from "./configurations.js";



console.log("config.env : " , config.env);

 const pool = await mysql.createPool({
  host: config.database.host,
  port:config.database.port,
  user: config.database.user,
  password:config.database.password,
  database: config.database.name,
  waitForConnections: true,
  connectionLimit: 10,  // for example, adjust as needed
  queueLimit: 0
});



console.log("Connection to database is Successful");

export default pool;
