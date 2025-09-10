import poolDb from "../config/db.js";

// Get comprehensive analytics data
export const getAnalyticsData = async (req, res) => {
  let db;
  try {
    const { startDate, endDate } = req.query;
    
    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'Start date and end date are required' });
    }

    db = await poolDb.getConnection();

    // Get basic stats
    const stats = await getBasicStats(db, startDate, endDate);
    
    // Get time series data
    const registrations = await getRegistrationTimeSeries(db, startDate, endDate);
    const activeUsers = await getActiveUsersTimeSeries(db, startDate, endDate);
    const routeSearches = await getRouteSearchesTimeSeries(db, startDate, endDate);
    
    // Get activity breakdown
    const activityTypes = await getActivityTypes(db, startDate, endDate);
    
    // Get user analytics
    const users = await getUserAnalytics(db, startDate, endDate);
    
    // Get route analytics
    const routes = await getRouteAnalytics(db, startDate, endDate);
    
    // Get geographic data
    const topLocations = await getTopSearchLocations(db, startDate, endDate);
    const peakHours = await getPeakUsageHours(db, startDate, endDate);
    const provinces = await getProvinceDistribution(db);

    res.json({
      stats,
      registrations,
      activeUsers,
      routeSearches,
      activityTypes,
      users,
      routes,
      topLocations,
      peakHours,
      provinces
    });

  } catch (error) {
    console.error('Error fetching analytics data:', error);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    if (db) db.release();
  }
};

// Get basic statistics
async function getBasicStats(db, startDate, endDate) {
  try {
    // Total users
    const [totalUsersResult] = await db.execute('SELECT COUNT(*) as count FROM users');
    const totalUsers = totalUsersResult[0].count;

    // New registrations in date range
    const [newRegistrationsResult] = await db.execute(
      'SELECT COUNT(*) as count FROM users WHERE created_at BETWEEN ? AND ?',
      [startDate, endDate]
    );
    const newRegistrations = newRegistrationsResult[0].count;

    // Active users (logged in within date range)
    const [activeUsersResult] = await db.execute(
      'SELECT COUNT(DISTINCT user_id) as count FROM user_activities WHERE created_at BETWEEN ? AND ?',
      [startDate, endDate]
    );
    const activeUsers = activeUsersResult[0].count;

    // Total routes
    const [totalRoutesResult] = await db.execute('SELECT COUNT(*) as count FROM routes');
    const totalRoutes = totalRoutesResult[0].count;

    // Route searches in date range
    const [routeSearchesResult] = await db.execute(
      'SELECT COUNT(*) as count FROM user_activities WHERE activity_type = "route_search" AND created_at BETWEEN ? AND ?',
      [startDate, endDate]
    );
    const routeSearches = routeSearchesResult[0].count;

    // Contributors
    const [contributorsResult] = await db.execute('SELECT COUNT(*) as count FROM contributors WHERE status = "active"');
    const contributors = contributorsResult[0].count;

    return {
      totalUsers,
      newRegistrations,
      activeUsers,
      totalRoutes,
      routeSearches,
      contributors
    };
  } catch (error) {
    console.error('Error getting basic stats:', error);
    return {
      totalUsers: 0,
      newRegistrations: 0,
      activeUsers: 0,
      totalRoutes: 0,
      routeSearches: 0,
      contributors: 0
    };
  }
}

// Get registration time series data
async function getRegistrationTimeSeries(db, startDate, endDate) {
  try {
    const [rows] = await db.execute(`
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as count
      FROM users 
      WHERE created_at BETWEEN ? AND ?
      GROUP BY DATE(created_at)
      ORDER BY date
    `, [startDate, endDate]);

    const labels = [];
    const data = [];
    
    // Fill in missing dates with 0
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0];
      labels.push(dateStr);
      
      const dayData = rows.find(row => row.date.toISOString().split('T')[0] === dateStr);
      data.push(dayData ? dayData.count : 0);
    }

    return { labels, data };
  } catch (error) {
    console.error('Error getting registration time series:', error);
    return { labels: [], data: [] };
  }
}

// Get active users time series data
async function getActiveUsersTimeSeries(db, startDate, endDate) {
  try {
    const [rows] = await db.execute(`
      SELECT 
        DATE(created_at) as date,
        COUNT(DISTINCT user_id) as count
      FROM user_activities 
      WHERE created_at BETWEEN ? AND ?
      GROUP BY DATE(created_at)
      ORDER BY date
    `, [startDate, endDate]);

    const labels = [];
    const data = [];
    
    // Fill in missing dates with 0
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0];
      labels.push(dateStr);
      
      const dayData = rows.find(row => row.date.toISOString().split('T')[0] === dateStr);
      data.push(dayData ? dayData.count : 0);
    }

    return { labels, data };
  } catch (error) {
    console.error('Error getting active users time series:', error);
    return { labels: [], data: [] };
  }
}

// Get route searches time series data
async function getRouteSearchesTimeSeries(db, startDate, endDate) {
  try {
    const [rows] = await db.execute(`
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as count
      FROM user_activities 
      WHERE activity_type = "route_search" AND created_at BETWEEN ? AND ?
      GROUP BY DATE(created_at)
      ORDER BY date
    `, [startDate, endDate]);

    const labels = [];
    const data = [];
    
    // Fill in missing dates with 0
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0];
      labels.push(dateStr);
      
      const dayData = rows.find(row => row.date.toISOString().split('T')[0] === dateStr);
      data.push(dayData ? dayData.count : 0);
    }

    return { labels, data };
  } catch (error) {
    console.error('Error getting route searches time series:', error);
    return { labels: [], data: [] };
  }
}

// Get activity types breakdown
async function getActivityTypes(db, startDate, endDate) {
  try {
    const [rows] = await db.execute(`
      SELECT 
        activity_type as type,
        COUNT(*) as count
      FROM user_activities 
      WHERE created_at BETWEEN ? AND ?
      GROUP BY activity_type
      ORDER BY count DESC
    `, [startDate, endDate]);

    return rows.map(row => ({
      type: row.type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()),
      count: row.count
    }));
  } catch (error) {
    console.error('Error getting activity types:', error);
    return [];
  }
}

// Get user analytics
async function getUserAnalytics(db, startDate, endDate) {
  try {
    const [rows] = await db.execute(`
      SELECT 
        u.ID as id,
        u.name,
        u.email,
        u.created_at as registrationDate,
        ua.last_login,
        COALESCE(ua.activity_count, 0) as activityCount,
        COALESCE(c.routes_contributed, 0) as routesContributed,
        CASE 
          WHEN ua.last_login >= DATE_SUB(NOW(), INTERVAL 7 DAY) THEN 'Active'
          WHEN ua.last_login >= DATE_SUB(NOW(), INTERVAL 30 DAY) THEN 'Moderate'
          ELSE 'Inactive'
        END as status
      FROM users u
      LEFT JOIN (
        SELECT 
          user_id,
          MAX(created_at) as last_login,
          COUNT(*) as activity_count
        FROM user_activities 
        WHERE created_at BETWEEN ? AND ?
        GROUP BY user_id
      ) ua ON u.ID = ua.user_id
      LEFT JOIN contributors c ON u.ID = c.user_id
      ORDER BY u.created_at DESC
      LIMIT 100
    `, [startDate, endDate]);

    return rows.map(row => ({
      id: row.id,
      name: row.name,
      email: row.email,
      registrationDate: row.registrationDate.toISOString().split('T')[0],
      lastLogin: row.last_login ? row.last_login.toISOString().split('T')[0] : 'Never',
      activityCount: row.activityCount,
      routesContributed: row.routesContributed,
      status: row.status
    }));
  } catch (error) {
    console.error('Error getting user analytics:', error);
    return [];
  }
}

// Get route analytics
async function getRouteAnalytics(db, startDate, endDate) {
  try {
    const [rows] = await db.execute(`
      SELECT 
        r.ID as id,
        r.name,
        tr_start.name as startLocation,
        tr_end.name as endLocation,
        r.price,
        r.route_type as type,
        COALESCE(ua.search_count, 0) as searchCount,
        r.created_at as createdDate,
        COALESCE(c.name, 'Admin') as contributor
      FROM routes r
      JOIN taxirank tr_start ON r.TaxiRankStart_ID = tr_start.ID
      JOIN taxirank tr_end ON r.TaxiRankDest_ID = tr_end.ID
      LEFT JOIN (
        SELECT 
          JSON_EXTRACT(activity_description, '$.route_id') as route_id,
          COUNT(*) as search_count
        FROM user_activities 
        WHERE activity_type = 'route_search' 
        AND created_at BETWEEN ? AND ?
        GROUP BY route_id
      ) ua ON r.ID = ua.route_id
      LEFT JOIN contributors c ON r.ID IN (
        SELECT pr.ID FROM pendingroutes pr WHERE pr.user_id = c.user_id
      )
      ORDER BY r.created_at DESC
      LIMIT 100
    `, [startDate, endDate]);

    return rows.map(row => ({
      id: `R${row.id.toString().padStart(3, '0')}`,
      name: row.name,
      startLocation: row.startLocation,
      endLocation: row.endLocation,
      price: row.price,
      type: row.type,
      searchCount: row.searchCount,
      createdDate: row.createdDate.toISOString().split('T')[0],
      contributor: row.contributor
    }));
  } catch (error) {
    console.error('Error getting route analytics:', error);
    return [];
  }
}

// Get top search locations
async function getTopSearchLocations(db, startDate, endDate) {
  try {
    const [rows] = await db.execute(`
      SELECT 
        JSON_EXTRACT(activity_description, '$.start_location') as location,
        COUNT(*) as searches
      FROM user_activities 
      WHERE activity_type = 'route_search' 
      AND created_at BETWEEN ? AND ?
      AND JSON_EXTRACT(activity_description, '$.start_location') IS NOT NULL
      GROUP BY location
      ORDER BY searches DESC
      LIMIT 10
    `, [startDate, endDate]);

    return rows.map(row => ({
      location: row.location || 'Unknown',
      searches: row.searches
    }));
  } catch (error) {
    console.error('Error getting top search locations:', error);
    return [];
  }
}

// Get peak usage hours
async function getPeakUsageHours(db, startDate, endDate) {
  try {
    const [rows] = await db.execute(`
      SELECT 
        HOUR(created_at) as hour,
        COUNT(*) as searches
      FROM user_activities 
      WHERE activity_type = 'route_search' 
      AND created_at BETWEEN ? AND ?
      GROUP BY HOUR(created_at)
      ORDER BY hour
    `, [startDate, endDate]);

    const hourlyData = Array.from({ length: 24 }, (_, i) => ({ hour: i, searches: 0 }));
    
    rows.forEach(row => {
      hourlyData[row.hour].searches = row.searches;
    });

    return hourlyData;
  } catch (error) {
    console.error('Error getting peak usage hours:', error);
    return Array.from({ length: 24 }, (_, i) => ({ hour: i, searches: 0 }));
  }
}

// Get province distribution
async function getProvinceDistribution(db) {
  try {
    const [rows] = await db.execute(`
      SELECT 
        tr.province,
        COUNT(DISTINCT r.ID) as routes,
        COUNT(DISTINCT u.ID) as users
      FROM taxirank tr
      LEFT JOIN routes r ON (r.TaxiRankStart_ID = tr.ID OR r.TaxiRankDest_ID = tr.ID)
      LEFT JOIN users u ON u.location LIKE CONCAT('%', tr.province, '%')
      GROUP BY tr.province
      ORDER BY routes DESC
    `);

    return rows.map(row => ({
      province: row.province,
      routes: row.routes,
      users: row.users
    }));
  } catch (error) {
    console.error('Error getting province distribution:', error);
    return [];
  }
}

// Get user activity details
export const getUserActivityDetails = async (req, res) => {
  let db;
  try {
    const { userId, startDate, endDate } = req.query;
    
    db = await poolDb.getConnection();

    let query = `
      SELECT 
        ua.*,
        u.name as user_name,
        u.email
      FROM user_activities ua
      JOIN users u ON ua.user_id = u.ID
      WHERE 1=1
    `;
    
    const params = [];
    
    if (userId) {
      query += ' AND ua.user_id = ?';
      params.push(userId);
    }
    
    if (startDate && endDate) {
      query += ' AND ua.created_at BETWEEN ? AND ?';
      params.push(startDate, endDate);
    }
    
    query += ' ORDER BY ua.created_at DESC LIMIT 100';

    const [rows] = await db.execute(query, params);

    res.json({ activities: rows });

  } catch (error) {
    console.error('Error fetching user activity details:', error);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    if (db) db.release();
  }
};

// Get route usage details
export const getRouteUsageDetails = async (req, res) => {
  let db;
  try {
    const { routeId, startDate, endDate } = req.query;
    
    db = await poolDb.getConnection();

    let query = `
      SELECT 
        ua.*,
        u.name as user_name,
        u.email,
        r.name as route_name
      FROM user_activities ua
      JOIN users u ON ua.user_id = u.ID
      JOIN routes r ON JSON_EXTRACT(ua.activity_description, '$.route_id') = r.ID
      WHERE ua.activity_type = 'route_search'
    `;
    
    const params = [];
    
    if (routeId) {
      query += ' AND r.ID = ?';
      params.push(routeId);
    }
    
    if (startDate && endDate) {
      query += ' AND ua.created_at BETWEEN ? AND ?';
      params.push(startDate, endDate);
    }
    
    query += ' ORDER BY ua.created_at DESC LIMIT 100';

    const [rows] = await db.execute(query, params);

    res.json({ routeUsages: rows });

  } catch (error) {
    console.error('Error fetching route usage details:', error);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    if (db) db.release();
  }
};

export default {
  getAnalyticsData,
  getUserActivityDetails,
  getRouteUsageDetails
};
