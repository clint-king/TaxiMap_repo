import poolDb from "../config/db.js";
import { v4 as uuidv4 } from 'uuid';

export const AddTaxiRank = async(req , res)=>{
    let db;
    try{
        db = await poolDb.getConnection();
        const { name, coord, province,address} = req.body; // Extract data from the request body
        const query = "INSERT INTO TaxiRank(name,location_coord,province,address,num_routes) VALUES(?,?,?,?,?)";
        await db.execute(query , [name, coord, province,address,0]);

        return res.status(201).json({message:"Successfully added"});
    }catch(error){
        console.log(error);
        return res.status(500).json({message:"Server error"});
    }finally {
        if (db) db.release(); // release connection back to the pool
      }
}

export const listTaxiRanks = async(req,res)=>{
    let db;
    try{
        db = await poolDb.getConnection();
        const query = "SELECT * FROM TaxiRank";

        const [listOfTxRanks] = await db.execute(query);
     
        if(listOfTxRanks || listOfTxRanks > 0){
            const dataArr = [];
    
          
            for(let i = 0 ; i < listOfTxRanks.length ;i++){

                dataArr.push({
                    ID:listOfTxRanks[i].ID,
                    name: listOfTxRanks[i].name,
                    coord: listOfTxRanks[i].location_coord,
                    province: listOfTxRanks[i].province,
                    address: listOfTxRanks[i].address,
                    num_routes : listOfTxRanks[i].num_routes
                })
            }
    
            return res.status(200).send(dataArr);
        }else{
            return res.status(404).send("List of TaxiRanks in null")
        }
        
    }catch(error){
        console.log(error);
        return res.status(500).json({message:"Server error"});
    }finally {
        if (db) db.release(); // release connection back to the pool
      }
}

export const getTaxiRank = async(req,res)=>{
    let db;
    try{
        db = await poolDb.getConnection();
        const rankID = req.body.rankID;

        if(!rankID){
            return res.status(400).send("rankID is null");
        }
        const query = "SELECT ID , name , location_coord  FROM TaxiRank WHERE ID = ?";

        const [result] = await db.query(query , [rankID]);

        if(!result || result.length === 0){
            return res.status(404).send(`Could not find TaxiRank ${rankID}`);
        }

       
        return res.json({
            ID:result[0].ID,
            name:result[0].name,
            coords:result[0].location_coord
       });
    }catch(error){
        console.log(error);
        return res.status(500).send("Server error");
    }finally {
        if (db) db.release(); // release connection back to the pool
      }
}

export const AddRoute = async(req,res)=>{
    let connection;
try{
   
    const {TRStart_ID , TRDest_ID, name , price , routeType , travelMethod , numOfMiniRoutes , numOfDirectionRoutes , listOfDirCoords , listOfMiniCoords}  = req.body.data;
    
    
    if (!name  || !TRStart_ID || !TRDest_ID || !routeType || !travelMethod ||
         !numOfMiniRoutes || !numOfDirectionRoutes || !listOfDirCoords || !listOfMiniCoords) {
            console.log("Missing required fields");
        return res.status(400).json({ message: "Missing required fields" });
    }

    console.log("Coordinates : ", listOfMiniCoords);

    const query = "INSERT INTO Routes(name,price,TaxiRankStart_ID,TaxiRankDest_ID, route_type,totalNum_MiniRoutes,totalNum_directions,travelMethod) VALUES(?,?,?,?,?,?,?,?)";
    const queryTaxiRank = "UPDATE TaxiRank SET num_routes = num_routes+? WHERE ID =?";
    const queryMiniRoute = "INSERT INTO MiniRoute(Route_ID,coords,route_index) VALUES(?,?,?)";
    const queryDirectionRoute = "INSERT INTO DirectionRoute(Route_ID,direction_coords) VALUES(?,?)";

     connection = await poolDb.getConnection();
    try{
       
        await connection.beginTransaction();
        //Add to Route table
        const [result] = await connection.query(query , [name , price  ,TRStart_ID,TRDest_ID, routeType ,numOfMiniRoutes , numOfDirectionRoutes ,travelMethod]);

        //Add to Start TaxiRank
        await connection.query(queryTaxiRank , [1 , TRStart_ID]);

        //Add to Dest TaxiRank
        await connection.query(queryTaxiRank , [1 , TRDest_ID]);

        //Add MiniRoutes
        for(let i = 0 ; i < listOfMiniCoords.length ; i++){
            await connection.query(queryMiniRoute , [result.insertId , listOfMiniCoords[i] , i+1 ])
        }
        
        //Add Directions
        for(let i = 0; i< listOfDirCoords.length ;i++){
            await connection.query(queryDirectionRoute , [result.insertId , listOfDirCoords[i]])
        }

        await connection.commit();
        res.status(201).json({ message: "Route added successfully", routeId: result.insertId });
    }catch(error){
        await connection.rollback(); // Rollback if any query fails
        console.error("Transaction Failed:", error);
        res.status(500).json({ message: "Server error during transaction" });
    } finally {
        connection.release(); // Release the database connection
    }
}catch(error){
        console.log(error);
        return res.status(500).send({message:"Server error"});
    }
}

export const listRoutes = async(req, res) =>{
    let db;
    const query = `
    SELECT *
    FROM Routes
    WHERE TaxiRankStart_ID = ? OR TaxiRankDest_ID = ?;`;
    try{

        db = await  poolDb.getConnection();
        const {taxiRankSelected_ID} = req.body;

        console.log("ID : "+ taxiRankSelected_ID);
        if(taxiRankSelected_ID != null){
            const response =await db.query(query , [taxiRankSelected_ID,taxiRankSelected_ID ]);
            const result = response[0];
        const array = [];
        if(result.length > 0){

            for(let i = 0 ; i < result.length ; i++){
                array.push({
                    id: result[i].ID,
                    name: result[i].name,
                    travelMethod:result[i].travelMethod,
                    numOfDirections:result[i].totalNum_directions,
                    type:result[i].route_type,
                    price: result[i].price
                });
            }
        }else{
            return res.status(404).json({message:"No Route found"});
        }

        console.log("Array : "+ JSON.stringify(array));
        return res.status(200).json(array);
        }else{

            return res.status(404).json({message:"taxiRankSelected_ID is null"});
        }
        
    }catch(error){
        console.log(error);
        return res.status(500).send({message:"Server error"});
    }finally {
        if (db) db.release(); // release connection back to the pool
      }
}

export const routeSelected = async(req,res) =>{
    let db;
    const query = "SELECT * FROM Routes WHERE ID = ?";
    const queryForTaxiRankStart = `SELECT 
    TaxiRank.ID AS TaxiRankID,
    TaxiRank.name AS TaxiRankName
  
FROM 
    Routes
INNER JOIN 
    TaxiRank
ON 
    Routes.TaxiRankStart_ID = TaxiRank.ID;`;

    const queryForTaxiRankDest =   `SELECT 
    TaxiRank.ID AS TaxiRankID,
    TaxiRank.name AS TaxiRankName
    TaxiRank.location_coord AS TaxiRankCoordLocation
  
FROM 
    Routes
INNER JOIN 
    TaxiRank
ON 
    Routes.TaxiRankDest_ID = TaxiRank.ID;`;


    try{
        db = poolDb.getConnection();
        const {selectedRoute_ID} = req.body;

        //Checking if bodyparser selectedRoute_ID is null
        if(selectedRoute_ID){

            //getting route information from the database
            const resultRoute = await db.query(query , [selectedRoute_ID]);
            if(resultRoute || resultRoute.length > 0){

                //getting taxiStart information 
                const resultTaxiStart = await db.query(queryForTaxiRankStart);
                if(resultTaxiStart || resultTaxiStart.length > 0){
                    const resultTaxiDest = await db.query(queryForTaxiRankDest);

                    //getting taxiDest information
                    if(resultTaxiDest || resultTaxiDest.length > 0){

                        //send to the frontEnd
                        return res.send(
                            {
                                routeName: resultRoute[0].name,
                                routeCoords: resultRoute[0].coords,
                                price:resultRoute[0].price,
                                routeType:resultRoute[0].route_type,
                                TaxiStartName: resultTaxiStart[0].TaxiRankName ,
                                TaxiStart_coord: resultTaxiStart[0].TaxiRankCoordLocation ,
                                TaxiDestName: resultTaxiDest[0].TaxiRankName,
                                TaxiDest_coord:resultTaxiDest[0].TaxiRankCoordLocation,
                            }
                        )
                    }

                    return res.status(404).json({message:"resultTaxiDest query failed "});
                }

                return res.status(404).json({message:"resultTaxiStart query failed "});
                }
            return res.status(404).json({message:"resultRoute query failed "});


        }else{
            return res.status(404).json({message:"selectedRoute_ID variable is null"});
        }
    }catch(error){
        return res.status(500).send({message:"Server error"});
    }finally {
        if (db) db.release(); // release connection back to the pool
      }
}

//get new uniqueID
export const getUniqueRouteName = async(req,res)=>{
    let db;
    try{
        db = await poolDb.getConnection();
        const nameRouteID  = await generateUniqueRouteID(db);
        console.log("RouteId : "+nameRouteID);
        return res.status(200).json({name: nameRouteID, message:"Successfully sent"});
    }catch(error){
        console.log(error);
        return res.status(500).send("Server Error");
    }finally {
        if (db) db.release(); // release connection back to the pool
      }
}

//get routeID
export const getRoute = async(req,res)=>{
    let db;
    try{
        const {uniqueRouteName} = req.body;

        if(!uniqueRouteName){
            return res.status(404).send("uniqueRouteName is null or undefined");
        }
        console.log("Name : ", uniqueRouteName);
        //route request
        db = await poolDb.getConnection();

        await db.beginTransaction();
        const [resultRoute] = await db.query('SELECT * FROM Routes WHERE name = ?' ,[uniqueRouteName]);

        const [resultMiniRoutes] = await db.query('SELECT * FROM MiniRoute WHERE Route_ID = ?' , [resultRoute[0].ID]);

        const [resultDirection] = await db.query('SELECT * FROM DirectionRoute WHERE Route_ID = ?' , [resultRoute[0].ID]);

        if(!resultRoute){
            return res.status(404).send("No Route found");
        }else if(!resultMiniRoutes){
            return res.status(404).send("No MiniRoutes found");
        }else if(!resultDirection){
            return res.status(404).send("No directions found");
        }


        const finalResults = {
            route: resultRoute[0],
            miniRoutes_Arr:resultMiniRoutes,
            directions_Arr:resultDirection
        }

        console.log("Result I as follows : ", finalResults);
        return res.status(200).send(finalResults);

    }catch(error){
        console.log(error);
        await connection.rollback(); 
        return res.status(500).send("Server Error");
        }finally{
        if (db) db.release(); // release connection back to the pool
    }
}

//Delete route
export const deleteRoute = async (req, res) => {
    let db;
    try {
        const { routeID } = req.body;

        if (!routeID) {
            return res.status(400).json({ message: "uniqueRouteName is required" });
        }

        db = await poolDb.getConnection();
        await db.beginTransaction();

        //reduce nuumber of routes in a TaxiRank
        
        const [resultDestinationTaxiRank] = await db.query('UPDATE taxirank SET num_routes= num_routes - 1 WHERE ID IN (SELECT TaxiRankStart_ID FROM Routes WHERE ID = ?)' , [routeID]);
        const [resultStartTaxiRank] = await db.query('UPDATE taxirank SET num_routes= num_routes - 1 WHERE ID IN (SELECT TaxiRankDest_ID FROM Routes WHERE ID = ?)' , [routeID]);

        // Delete dependent records (if no cascading deletes)
        const [resultMiniRoutes] = await db.query('DELETE FROM MiniRoute WHERE Route_ID IN (SELECT ID FROM Routes WHERE ID = ?)', [routeID]);
        const [resultDirection] = await db.query('DELETE FROM DirectionRoute WHERE Route_ID IN (SELECT ID FROM Routes WHERE ID = ?)', [routeID]);

        // Delete parent record first (assuming cascading deletes are enabled)
        const [resultRoute] = await db.query('DELETE FROM Routes WHERE ID = ?', [routeID]);
        if (resultRoute.affectedRows === 0) {
            await db.rollback();
            return res.status(404).json({ message: "No Route found" });
        }

        

        // Commit transaction
        await db.commit();

        return res.status(200).json({
            message: "Successfully deleted",
            deletedRoutes: resultRoute.affectedRows,
            deletedMiniRoutes: resultMiniRoutes.affectedRows,
            deletedDirections: resultDirection.affectedRows,
            startTaxiRank:resultStartTaxiRank,
            destinationTaxiRank:resultDestinationTaxiRank
        });

    } catch (error) {
        console.error("Error deleting route:", error.stack);
        if (db) await db.rollback();
        return res.status(500).json({ message: "Server Error", error: error.message });
    } finally {
        if (db) db.release();
    }
};

// == FUNCTION ==
async function generateUniqueRouteID(connection) {
    let isUnique = false;
    let routeID;
    try{
     
    while (!isUnique) {
        routeID = uuidv4().replace(/-/g, '').slice(0, 7).toUpperCase(); // Generate a 7-char ID
    // Check if the ID already exists in the database
    const [rows] = await connection.query("SELECT COUNT(*) as count FROM Routes WHERE name = ?", [routeID]);

    if (rows[0].count === 0) {
        isUnique = true; // If no match, it's unique
    }  
    }
}catch(error){
    console.log(error);
}
    return routeID;
}
