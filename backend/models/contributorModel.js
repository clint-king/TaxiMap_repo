import poolDb from "../config/db.js";

// Get all contributors - PUBLIC VERSION (no sensitive data)
const getPublicContributors = async () => {
  let db;
  try {
    db = await poolDb.getConnection();
    const query = `
      SELECT 
        c.ID,
        c.name,
        c.region,
        c.routes_contributed,
        c.status,
        c.created_at
      FROM contributors c
      WHERE c.status = 'active'
      ORDER BY c.routes_contributed DESC, c.created_at DESC
    `;
    
    const [rows] = await db.execute(query);
    return rows;
  } catch (error) {
    console.log('Error getting public contributors:', error);
    return [];
  } finally {
    if (db) db.release();
  }
};

// Get all contributors - ADMIN VERSION (includes email, username)
const getAllContributors = async () => {
  let db;
  try {
    db = await poolDb.getConnection();
    const query = `
      SELECT 
        c.ID,
        c.name,
        c.region,
        c.routes_contributed,
        c.status,
        c.created_at,
        u.email,
        u.username
             FROM contributors c
       LEFT JOIN users u ON c.user_id = u.ID
       WHERE c.status = 'active'
      ORDER BY c.routes_contributed DESC, c.created_at DESC
    `;
    
    const [rows] = await db.execute(query);
    return rows;
  } catch (error) {
    console.log('Error getting contributors:', error);
    return [];
  } finally {
    if (db) db.release();
  }
};

const getContributorByUserId = async (userId) => {
  let db;
  try {
    db = await poolDb.getConnection();
    const query = 'SELECT * FROM contributors WHERE user_id = ?';
    const [rows] = await db.execute(query, [userId]);
    return rows[0] || null;
  } catch (error) {
    console.log('Error getting contributor by user ID:', error);
    return null;
  } finally {
    if (db) db.release();
  }
};

const createContributor = async (contributorData) => {
  let db;
  try {
    db = await poolDb.getConnection();
    const { user_id, name, region } = contributorData;
    
    const query = 'INSERT INTO contributors (user_id, name, region) VALUES (?, ?, ?)';
    const [result] = await db.execute(query, [user_id, name, region]);
    
    return result.insertId;
  } catch (error) {
    console.log('Error creating contributor:', error);
    return null;
  } finally {
    if (db) db.release();
  }
};

const updateContributorRoutes = async (userId, routesCount) => {
  let db;
  try {
    db = await poolDb.getConnection();
    const query = 'UPDATE contributors SET routes_contributed = routes_contributed + ? WHERE user_id = ?';
    const [result] = await db.execute(query, [routesCount, userId]);
    return result.affectedRows > 0;
  } catch (error) {
    console.log('Error updating contributor routes:', error);
    return false;
  } finally {
    if (db) db.release();
  }
};

const getPendingRoutesForUser = async (userId) => {
  let db;
  try {
    db = await poolDb.getConnection();
    const query = `
      SELECT 
        pr.ID,
        pr.name,
        pr.price,
        pr.route_type,
        pr.travel_method,
        pr.status,
        pr.created_at,
        ptr_start.name as start_rank_name,
        ptr_end.name as end_rank_name
      FROM pendingroutes pr
      JOIN pendingtaxirank ptr_start ON pr.start_rank_id = ptr_start.ID
      JOIN pendingtaxirank ptr_end ON pr.end_rank_id = ptr_end.ID
      WHERE pr.user_id = ?
      ORDER BY pr.created_at DESC
    `;
    
    const [rows] = await db.execute(query, [userId]);
    return rows;
  } catch (error) {
    console.log('Error getting pending routes for user:', error);
    return [];
  } finally {
    if (db) db.release();
  }
};

export default {
  getPublicContributors,
  getAllContributors,
  getContributorByUserId,
  createContributor,
  updateContributorRoutes,
  getPendingRoutesForUser
};
