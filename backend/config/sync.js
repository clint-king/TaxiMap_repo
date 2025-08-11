import mysql from "mysql2/promise";

// Connection configs
const localConfig = {
      host: 'localhost',
      user: 'TaxiMap_database',
      password: '12345',
      database: 'taximapdb'
    };

const hostedConfig = {
        host: 'turntable.proxy.rlwy.net',
        port: 16301,
        user: 'root',
        password: 'BQGqyvPPCWSjCHKCIjRQsaobCexagOdQ',
        database: 'railway'
      };


      console.log("Connected to Hosted DB:", hostedConfig.host, hostedConfig.database);
      
      // Sync helper (auto-detects max ID from hosted DB)
      async function syncTable(localDb, hostedDb, tableName, columns) {
        // Get highest ID in hosted DB
        const [[{ maxId }]] = await hostedDb.execute(`SELECT MAX(ID) AS maxId FROM ${tableName}`);
        const idThreshold = maxId || 0;
      
        console.log(`\n=== Syncing ${tableName} (IDs > ${idThreshold}) ===`);
      
        // Get only new rows from local DB
        const [newRows] = await localDb.execute(
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
          await hostedDb.execute(insertSql, values);
        }
      
        console.log(`Inserted ${newRows.length} rows into ${tableName}`);
      }
      
      (async () => {
        const localDb = await mysql.createConnection(localConfig);
        const hostedDb = await mysql.createConnection(hostedConfig);
      
        try {
          // 1. taxirank
          await syncTable(localDb, hostedDb, 'taxirank', [
            'ID', 'name', 'location_coord', 'province', 'address', 'num_routes'
          ]);
      
          // 2. routes
          await syncTable(localDb, hostedDb, 'routes', [
            'ID', 'TaxiRankStart_ID', 'TaxiRankDest_ID', 'name', 'price', 
            'travelMethod', 'route_type', 'totalNum_directions', 'totalNum_MiniRoutes'
          ]);
      
          // 3. miniroute
          await syncTable(localDb, hostedDb, 'miniroute', [
            'ID', 'Route_ID', 'coords', 'route_index'
          ]);
      
          // 4. directionroute
          await syncTable(localDb, hostedDb, 'directionroute', [
            'ID', 'Route_ID', 'direction_coords', 'direction_index'
          ]);
      
          console.log("\n✅ Sync completed successfully.");
        } catch (err) {
          console.error("❌ Error syncing:", err);
        } finally {
          await localDb.end();
          await hostedDb.end();
        }
      })();
      