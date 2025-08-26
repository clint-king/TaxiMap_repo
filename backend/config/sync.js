import mysql from "mysql2/promise";
import config from "./configurations.js";

// Connection configs - Use config for environment detection (CHANGE THIS TO LOCAL WHEN USING THE SCRIPT)
const localConfig = {
  host: config.database.host, 
  port: config.database.port,
  user: config.database.user,
  password: config.database.password,
  database: config.database.name
};

// Production database config (Railway) (CHANGE THIS TO PRODUCTION WHEN USING THE SCRIPT)
const hostedConfig = {
  host: config.database.host, 
  port: config.database.port,
  user: config.database.user,
  password: config.database.password,
  database: config.database.name
};

// Choose configuration based on environment
const isProduction = config.env === 'production';
const sourceConfig = isProduction ? hostedConfig : localConfig;
const targetConfig = isProduction ? localConfig : hostedConfig;

console.log(`Environment: ${config.env}`);
console.log(`Source DB: ${sourceConfig.host} (${sourceConfig.database})`);
console.log(`Target DB: ${targetConfig.host} (${targetConfig.database})`);

// Sync helper (auto-detects max ID from target DB)
async function syncTable(sourceDb, targetDb, tableName, columns) {
  // Get highest ID in target DB
  const [[{ maxId }]] = await targetDb.execute(`SELECT MAX(ID) AS maxId FROM ${tableName}`);
  const idThreshold = maxId || 0;

  console.log(`\n=== Syncing ${tableName} (IDs > ${idThreshold}) ===`);

  // Get only new rows from source DB
  const [newRows] = await sourceDb.execute(
    `SELECT * FROM ${tableName} WHERE ID > ? ORDER BY ID ASC`,
    [idThreshold]
  );

  if (newRows.length === 0) {
    console.log(`No new rows to insert in ${tableName}`);
    return;
  }

  const placeholders = `(${columns.map(() => '?').join(', ')})`;
  const insertSql = `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES ${placeholders}`;

  for (const row of newRows) {
    const values = columns.map(col => row[col]);
    await targetDb.execute(insertSql, values);
  }

  console.log(`Inserted ${newRows.length} rows into ${tableName}`);
}

(async () => {
  const sourceDb = await mysql.createConnection(sourceConfig);
  const targetDb = await mysql.createConnection(targetConfig);

  try {
    // 1. taxirank
    await syncTable(sourceDb, targetDb, 'taxirank', [
      'ID', 'name', 'location_coord', 'province', 'address', 'num_routes'
    ]);

    // 2. routes
    await syncTable(sourceDb, targetDb, 'routes', [
      'ID', 'TaxiRankStart_ID', 'TaxiRankDest_ID', 'name', 'price', 
      'travelMethod', 'route_type', 'totalNum_directions', 'totalNum_MiniRoutes'
    ]);

    // 3. miniroute
    await syncTable(sourceDb, targetDb, 'miniroute', [
      'ID', 'Route_ID', 'coords', 'route_index'
    ]);

    // 4. directionroute
    await syncTable(sourceDb, targetDb, 'directionroute', [
      'ID', 'Route_ID', 'direction_coords', 'direction_index'
    ]);

    console.log("\n✅ Sync completed successfully.");
  } catch (err) {
    console.error("❌ Error syncing:", err);
  } finally {
    await sourceDb.end();
    await targetDb.end();
  }
})();
      