import poolDb from "../config/db.js";
import ContributorModel from "../models/contributorModel.js";

// Get all pending routes for admin review
export const getPendingRoutes = async (req, res) => {
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
        u.username,
        u.email,
        ptr_start.name as start_rank_name,
        ptr_start.location_coord as start_coords,
        ptr_end.name as end_rank_name,
        ptr_end.location_coord as end_coords
      FROM PendingRoutes pr
      JOIN users u ON pr.user_id = u.ID
      JOIN PendingTaxiRank ptr_start ON pr.start_rank_id = ptr_start.ID
      JOIN PendingTaxiRank ptr_end ON pr.end_rank_id = ptr_end.ID
      WHERE pr.status = 'pending'
      ORDER BY pr.created_at ASC
    `;
    
    const [rows] = await db.execute(query);
    res.json({ pendingRoutes: rows });
  } catch (error) {
    console.error('Error fetching pending routes:', error);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    if (db) db.release();
  }
};

// Get detailed route information for approval
export const getPendingRouteDetails = async (req, res) => {
  let db;
  try {
    const { routeId } = req.params;
    
    db = await poolDb.getConnection();
    
    // Get route details
    const routeQuery = `
      SELECT 
        pr.*,
        u.username,
        u.email,
        ptr_start.name as start_rank_name,
        ptr_start.location_coord as start_coords,
        ptr_start.province as start_province,
        ptr_start.address as start_address,
        ptr_end.name as end_rank_name,
        ptr_end.location_coord as end_coords,
        ptr_end.province as end_province,
        ptr_end.address as end_address
      FROM PendingRoutes pr
      JOIN users u ON pr.user_id = u.ID
      JOIN PendingTaxiRank ptr_start ON pr.start_rank_id = ptr_start.ID
      JOIN PendingTaxiRank ptr_end ON pr.end_rank_id = ptr_end.ID
      WHERE pr.ID = ?
    `;
    
    const [routeRows] = await db.execute(routeQuery, [routeId]);
    
    if (routeRows.length === 0) {
      return res.status(404).json({ error: 'Route not found' });
    }
    
    // Get mini routes
    const miniRoutesQuery = `
      SELECT * FROM PendingMiniRoutes 
      WHERE pending_route_id = ? 
      ORDER BY route_index
    `;
    const [miniRoutes] = await db.execute(miniRoutesQuery, [routeId]);
    
    // Get direction routes
    const directionRoutesQuery = `
      SELECT * FROM PendingDirectionRoutes 
      WHERE pending_route_id = ? 
      ORDER BY direction_index
    `;
    const [directionRoutes] = await db.execute(directionRoutesQuery, [routeId]);
    
    const routeData = {
      ...routeRows[0],
      miniRoutes,
      directionRoutes
    };
    
    res.json({ route: routeData });
  } catch (error) {
    console.error('Error fetching route details:', error);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    if (db) db.release();
  }
};

// Approve a pending route
export const approveRoute = async (req, res) => {
  let db;
  try {
    const { routeId } = req.params;
    
    db = await poolDb.getConnection();
    await db.beginTransaction();
    
    // Get the pending route details
    const [routeRows] = await db.execute(
      'SELECT * FROM PendingRoutes WHERE ID = ? AND status = "pending"',
      [routeId]
    );
    
    if (routeRows.length === 0) {
      await db.rollback();
      return res.status(404).json({ error: 'Route not found or already processed' });
    }
    
    const pendingRoute = routeRows[0];
    
    // Get taxi rank details
    const [startRankRows] = await db.execute(
      'SELECT * FROM PendingTaxiRank WHERE ID = ?',
      [pendingRoute.start_rank_id]
    );
    
    const [endRankRows] = await db.execute(
      'SELECT * FROM PendingTaxiRank WHERE ID = ?',
      [pendingRoute.end_rank_id]
    );
    
    if (startRankRows.length === 0 || endRankRows.length === 0) {
      await db.rollback();
      return res.status(400).json({ error: 'Taxi rank information missing' });
    }
    
    const startRank = startRankRows[0];
    const endRank = endRankRows[0];
    
    // Insert or get existing taxi ranks
    let startRankId, endRankId;
    
    if (startRank.exist) {
      // Use existing taxi rank
      const [existingStart] = await db.execute(
        'SELECT ID FROM taxirank WHERE name = ? AND location_coord = ?',
        [startRank.name, startRank.location_coord]
      );
      startRankId = existingStart[0].ID;
    } else {
      // Insert new taxi rank
      const [newStartResult] = await db.execute(
        'INSERT INTO taxirank (name, location_coord, province, address, num_routes) VALUES (?, ?, ?, ?, 0)',
        [startRank.name, startRank.location_coord, startRank.province, startRank.address]
      );
      startRankId = newStartResult.insertId;
    }
    
    if (endRank.exist) {
      // Use existing taxi rank
      const [existingEnd] = await db.execute(
        'SELECT ID FROM taxirank WHERE name = ? AND location_coord = ?',
        [endRank.name, endRank.location_coord]
      );
      endRankId = existingEnd[0].ID;
    } else {
      // Insert new taxi rank
      const [newEndResult] = await db.execute(
        'INSERT INTO taxirank (name, location_coord, province, address, num_routes) VALUES (?, ?, ?, ?, 0)',
        [endRank.name, endRank.location_coord, endRank.province, endRank.address]
      );
      endRankId = newEndResult.insertId;
    }
    
    // Insert the route
    const [routeResult] = await db.execute(
      'INSERT INTO routes (name, price, TaxiRankStart_ID, TaxiRankDest_ID, route_type, travelMethod, totalNum_MiniRoutes, totalNum_directions) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [
        pendingRoute.name,
        pendingRoute.price,
        startRankId,
        endRankId,
        pendingRoute.route_type,
        pendingRoute.travel_method,
        0, // Will be updated after mini routes
        0   // Will be updated after direction routes
      ]
    );
    
    const newRouteId = routeResult.insertId;
    
    // Insert mini routes
    const [miniRoutes] = await db.execute(
      'SELECT * FROM PendingMiniRoutes WHERE pending_route_id = ? ORDER BY route_index',
      [routeId]
    );
    
    for (const miniRoute of miniRoutes) {
      await db.execute(
        'INSERT INTO miniroute (Route_ID, coords, route_index) VALUES (?, ?, ?)',
        [newRouteId, miniRoute.coords, miniRoute.route_index]
      );
    }
    
    // Insert direction routes
    const [directionRoutes] = await db.execute(
      'SELECT * FROM PendingDirectionRoutes WHERE pending_route_id = ? ORDER BY direction_index',
      [routeId]
    );
    
    for (const directionRoute of directionRoutes) {
      await db.execute(
        'INSERT INTO directionroute (Route_ID, direction_coords, direction_index) VALUES (?, ?, ?)',
        [newRouteId, directionRoute.direction_coords, directionRoute.direction_index]
      );
    }
    
    // Update route with correct counts
    await db.execute(
      'UPDATE routes SET totalNum_MiniRoutes = ?, totalNum_directions = ? WHERE ID = ?',
      [miniRoutes.length, directionRoutes.length, newRouteId]
    );
    
    // Update taxi rank route counts
    await db.execute(
      'UPDATE taxirank SET num_routes = num_routes + 1 WHERE ID = ?',
      [startRankId]
    );
    
    if (startRankId !== endRankId) {
      await db.execute(
        'UPDATE taxirank SET num_routes = num_routes + 1 WHERE ID = ?',
        [endRankId]
      );
    }
    
    // Update pending route status
    await db.execute(
      'UPDATE PendingRoutes SET status = "approved" WHERE ID = ?',
      [routeId]
    );
    
    // Update or create contributor record
    const existingContributor = await ContributorModel.getContributorByUserId(pendingRoute.user_id);
    
    if (existingContributor) {
      await ContributorModel.updateContributorRoutes(pendingRoute.user_id, 1);
    } else {
             // Get user info to create contributor
       const [userRows] = await db.execute(
         'SELECT username, email FROM users WHERE ID = ?',
         [pendingRoute.user_id]
       );
      
      if (userRows.length > 0) {
        const user = userRows[0];
        const region = `${startRank.province} Routes`;
        await ContributorModel.createContributor({
          user_id: pendingRoute.user_id,
          name: user.username || user.email.split('@')[0],
          region: region
        });
      }
    }
    
    await db.commit();
    
    res.json({ 
      message: 'Route approved successfully',
      routeId: newRouteId,
      startRankId,
      endRankId
    });
    
  } catch (error) {
    if (db) await db.rollback();
    console.error('Error approving route:', error);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    if (db) db.release();
  }
};

// Reject a pending route
export const rejectRoute = async (req, res) => {
  let db;
  try {
    const { routeId } = req.params;
    const { reason } = req.body;
    
    db = await poolDb.getConnection();
    
    const [result] = await db.execute(
      'UPDATE PendingRoutes SET status = "rejected" WHERE ID = ? AND status = "pending"',
      [routeId]
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Route not found or already processed' });
    }
    
    res.json({ message: 'Route rejected successfully' });
    
  } catch (error) {
    console.error('Error rejecting route:', error);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    if (db) db.release();
  }
};

// Get all contributors (static + dynamic)
export const getAllContributors = async (req, res) => {
  try {
    const contributors = await ContributorModel.getAllContributors();
    res.json({ contributors });
  } catch (error) {
    console.error('Error fetching contributors:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export default {
  getPendingRoutes,
  getPendingRouteDetails,
  approveRoute,
  rejectRoute,
  getAllContributors
};
