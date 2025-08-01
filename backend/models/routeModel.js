import pool from "../config/db.js";
import poolDb from "../config/db.js";

const getAllRoutes = async () => {
  let db;

  try {
    db = await poolDb.getConnection();

    const [result] = await db.execute(`SELECT 
    r.ID AS route_id,
    r.name AS route_name,
    mr.ID AS mini_route_id,
    mr.route_index,
    mr.coords
FROM 
    routes r
JOIN 
    miniroute mr ON r.ID = mr.Route_ID
ORDER BY 
    r.ID, mr.route_index;
`);

return result;
  } catch (error) {
    console.log(error);
    return null;
  } finally {
    if (db) db.release(); // release connection back to the pool
  }
};


export default {
 getAllRoutes
};
