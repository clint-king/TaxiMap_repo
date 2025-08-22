import poolDb from "../config/db.js";
import { stringify, v4 as uuidv4 } from 'uuid';
import  Graph from "../src/Graph.js";
import dijkstra from "../src/Dijkstra.js";
import geolib from'geolib';
import RouteModel from '../models/routeModel.js';





export const findingPath = async(req,res)=>{
    let closestTaxiCount = {value: 0};
    const {sourceCoords , sourceProvince , destinationCoords , destinationProvince}  = req.body;
    if(!sourceCoords || !sourceProvince || !destinationCoords || !destinationProvince){
        return res.status(400).send("Missing required fields");
    }
    //count of farms a
    let countObj = {countSource:0 , countDest:0};
    let arrObj = {sourceArr:[] , destArr:[]};

    console.log("Fields : " , sourceCoords , sourceProvince , destinationCoords , destinationProvince);
    //get routes in the provinces of the source and destination points only (Filtering function)
    const routes = await filterAreas(sourceProvince , destinationProvince);
    console.log('Routes : ' , routes);
    if((await routes).status != 200){
        return res.status((await routes).status).send((await routes).message);
    }

    //Format routes in a way that can be easily processed by the incoming functions
    const formatedRoutes = formatRoutes(routes.result.routes , routes.result.miniRoutes);
    if(formatedRoutes === null){
        console.log("Could not format routes");
        return res.status(400).send("Internal server error");
    }
    console.log("formatedRoutes : " , formatedRoutes);


    let closestRouteInfo = await closestTaxiRanksF(arrObj, countObj , formatedRoutes , sourceCoords , destinationCoords , closestTaxiCount);

    if(closestRouteInfo.status != 200){
        console.error(closestRouteInfo.message);
        return res.status(closestRouteInfo.status).send("Internal server error");
    }

    console.log("ClosestRouteInfo : " , closestRouteInfo.value);

    // =============================================== THE SECOND PART ================================================ 
    //Check if routes connect 
    const ranksIDs = closestRouteInfo.value.closestTaxiRanks.result;
    const commonPath = routesConnectionCheck(ranksIDs.firstR_taxiRankSource , ranksIDs.firstR_taxiRankDestination , ranksIDs.secR_taxiRankSource , ranksIDs.secR_taxiRankDestination);

    //return shortPath when the routes connect
    if(commonPath.flag === true){
        const response = await shortPath(closestRouteInfo.value.routeCloseToSource , closestRouteInfo.value.routeCloseToDest , ranksIDs , sourceCoords , destinationCoords);
        return res.status(response.status).send(response.result);
    }

    //================================================ END OF THE SECOND PART =====================================================

     // *** When routes Dont connect

     //create a graph
    const graph = insertInGraph(formatedRoutes);

    //choose taxiRank
    let sourceTaxiRankRank;
    let destinationTaxiRank;
    //check if source has a left destination (sourceLong > destinationLong) 
    if(sourceCoords.longitude > destinationCoords.longitude){
        sourceTaxiRankRank =  ranksIDs.firstR_taxiRankSource;
        destinationTaxiRank = ranksIDs.secR_taxiRankDestination;

    }else if(sourceCoords.longitude < destinationCoords.longitude){
    //check if source has a right destination (sourceLong < destinationLong)
    sourceTaxiRankRank = ranksIDs.firstR_taxiRankDestination;
    destinationTaxiRank = ranksIDs.secR_taxiRankSource;
    }else{
     //check when longitudes are equal

     //check which one is on top
    }
  

    let fastestPathResults;
    let flag = true;
    while(flag){
    //get the fastest path utilising the graph
    console.log("Print input , firstR_taxiRankSource : " , sourceTaxiRankRank, " secR_taxiRankDestination : " , destinationTaxiRank);
     fastestPathResults =  getBestPath(graph , `${sourceTaxiRankRank}` , `${destinationTaxiRank}`);
    console.log("Path : " , fastestPathResults);

    if(fastestPathResults.path.length === 0){
        console.log("Could not get the Fastest path in [findingPath]");
        closestRouteInfo = await closestTaxiRanksF(arrObj, countObj , formatedRoutes , sourceCoords , destinationCoords , closestTaxiCount);
        console.log(" closestRouteInfo in a while loop :" ,  closestRouteInfo);
        console.log("countSource : " , countObj.countSource);
        console.log("countDest : " , countObj.countDest);
        //checking 
        if(closestRouteInfo.status != 200){
            console.error(closestRouteInfo.message);
            return res.status(closestRouteInfo.status).send("Internal server error");
        }
    }else{
        // NEW: Validate that all routes in the path actually exist
        console.log("Dijkstra found path:", fastestPathResults.path);
        const pathValidation = validatePathExists(formatedRoutes, fastestPathResults.path);
        
        if(pathValidation.isValid){
            console.log("✅ Path validation successful, proceeding with route selection");
            flag = false; // Path is valid, proceed
        } else {
            console.log(`❌ Path validation failed: Missing route between ${pathValidation.missingConnection.from} and ${pathValidation.missingConnection.to}`);
            console.log("Trying next closest routes...");
            
            // Continue the while loop to try next closest routes
            closestRouteInfo = await closestTaxiRanksF(arrObj, countObj, formatedRoutes, sourceCoords, destinationCoords, closestTaxiCount);
            console.log(" closestRouteInfo in validation retry:" ,  closestRouteInfo);
            
            if(closestRouteInfo.status != 200){
                console.error(closestRouteInfo.message);
                return res.status(closestRouteInfo.status).send("Internal server error");
            }
            
            // Update the graph with new routes and try again
            const newGraph = insertInGraph(formatedRoutes);
            // Update source and destination taxi ranks for next iteration
            const newRanksIDs = closestRouteInfo.value.closestTaxiRanks.result;
            if(sourceCoords.longitude > destinationCoords.longitude){
                sourceTaxiRankRank = newRanksIDs.firstR_taxiRankSource;
                destinationTaxiRank = newRanksIDs.secR_taxiRankDestination;
            }else if(sourceCoords.longitude < destinationCoords.longitude){
                sourceTaxiRankRank = newRanksIDs.firstR_taxiRankDestination;
                destinationTaxiRank = newRanksIDs.secR_taxiRankSource;
            }
        }
    }
}

    //reset the count
    closestTaxiCount.value = 0;

    //get The Taxi TaxiRank 
    const chosenTaxiRanks = await getChosenTaxiTanks( fastestPathResults.path );
    console.log("Chosen taxi ranks : " , chosenTaxiRanks);

    if(chosenTaxiRanks === null || chosenTaxiRanks.length === 0){
        console.log("chosenTaxiRanks is null or has length of zero");
        return res.status(400).send("Internal server error");
    }

    //Get paths from the Ids of TaxiRanks provided by [fastestPathResults]
    const chosenRoutes = getChosenRoutes(formatedRoutes , fastestPathResults.path , closestRouteInfo.value.routeCloseToSource.closestRoute, closestRouteInfo.value.routeCloseToDest.closestRoute);
    console.log("Chosen routes : " , chosenRoutes);
    if(chosenRoutes.length === 0){
        console.log("Could not get the chosen routes in [getChosenRoutes]=>[findingPath]");
        return res.status(400).send("Internal server error");
    }
     //get directions option 2
     const directionsO2 = await getDirections(chosenRoutes);
     console.log("Directions : " , directionsO2.result);

     if(directionsO2.status != 200){
        console.log(directionsO2.message);
        return res.status(directionsO2.status).send("Internal server error");
       }

    //Make sure the direction is proper
    
    fixRouteDirections(directionsO2 , sourceCoords , destinationCoords);


    //get price option 2
    const priceCollectionO2 = PriceCalc(chosenRoutes);
    console.log("Price list : " ,priceCollectionO2);

    if(priceCollectionO2 === null){
        console.log("Could not get the prices of routes (priceCollectionO2) in [findingPath]");
        return res.status(400).send("Internal server error");
       }

    //final return
    return res.status(200).send({
        sourceCoord: sourceCoords,
        pointCloseToSource: closestRouteInfo.value.routeCloseToSource.closestPoint,
        destCoord: destinationCoords,
        pointCloseToDest: closestRouteInfo.value.routeCloseToDest.closestPoint,
        routes: chosenRoutes,
        prices:priceCollectionO2,
        directions:directionsO2,
        chosenTaxiRanks:chosenTaxiRanks
    });
}

// export const AddPendingRoute = async(req,res)=>{
//         const query = "INSERT INTO PendingRoutes(name,price,start_rank_id,end_rank_id, route_type,travel_method) VALUES(?,?,?,?,?,?)";
//     const queryInsertTaxiRank = "INSERT INTO PendingTaxiRank(name , location_coord, province, address) VALUES (?,?,?,?)";
//     const queryMiniRoute = "INSERT INTO PendingMiniRoutes(pending_route_id,message,coords,route_index) VALUES(?,?,?,?)";
//     const queryDirectionRoute = "INSERT INTO PendingDirectionRoutes(pending_route_id,direction_coords,direction_index) VALUES(?,?,?)";

//     let connection ;
// try{
   
   
//     const data = req.body;

//     console.log("Pending route data : " , JSON.stringify(data));
//     const {caseType}  = data;

//     /* *** In this case miniroutes are the same as directions  */
//     // Straight(1) Or Loop(0) | Source [1-> New OR 0-> old]  | Destination [1-> New OR 0-> old]  * Not included when its Loop* 
//     switch(caseType){

//         case "01":{
//           //loop , new
//              const {TRSource, routeInfo}  = data;
//              const { name, coord, province,address} = TRSource;
//              const { price  ,routeType , travelMethod  , listOfMessAndCoords} = routeInfo;

//                connection = await poolDb.getConnection();
//     try{
       
//         await connection.beginTransaction();

//         //insert a new TaxiRank
//        const [newTR]  = await connection.query(queryInsertTaxiRank , [name, JSON.stringify(coord), province,address]);

//         //Add to Route table
//        const  routeName = await generateUniqueRouteID(connection);
//         const [result] = await connection.query(query , [routeName , price  ,newTR.insertId,newTR.insertId, routeType  ,travelMethod]);

//         //Add MiniRoutes
//         for(let i = 0 ; i < listOfMessAndCoords.length ; i++){
//             await connection.query(queryMiniRoute , [result.insertId ,listOfMessAndCoords[i].message ,  JSON.stringify(listOfMessAndCoords[i].Coords) , i+1 ])
//         }
        
//         //Add Directions
//         for(let i = 0; i< listOfMessAndCoords.length ;i++){
//             await connection.query(queryDirectionRoute , [result.insertId , JSON.stringify(listOfMessAndCoords[i].Coords) , i+1])
//         }
        
//         await connection.commit();
//         return res.status(200).json({ message: "Route added successfully", routeId: result.insertId });
//     }catch(error){
//         await connection.rollback(); // Rollback if any query fails
//         console.error("Transaction Failed:", error);
//         return res.status(500).json({ message: "Server error during transaction" });
//     } finally {
//         connection.release(); // Release the database connection
//     }
//                break;
//           }
            
//          case "00":{
//           //loop , old

//           const {TRSource, routeInfo}  = data;

//           const { IDSource} = TRSource;
//           const { price  ,routeType , travelMethod  , listOfMessAndCoords} = routeInfo;


//          connection = await poolDb.getConnection();
//     try{
       
//         await connection.beginTransaction();
//         //Add to Route table
//         const  routeName = await generateUniqueRouteID(connection);
//         const [result] = await connection.query(query , [routeName , price  ,IDSource,IDSource, routeType  ,travelMethod]);

//        //Add MiniRoutes
//         for(let i = 0 ; i < listOfMessAndCoords.length ; i++){
//             await connection.query(queryMiniRoute , [result.insertId ,listOfMessAndCoords[i].message , JSON.stringify( listOfMessAndCoords[i].Coords) , i+1 ])
//         }
        
//         //Add Directions
//         for(let i = 0; i< listOfMessAndCoords.length ;i++){
//             await connection.query(queryDirectionRoute , [result.insertId , JSON.stringify(listOfMessAndCoords[i].Coords) , i+1])
//         }
        
//         await connection.commit();
//         return res.status(200).json({ message: "Route added successfully", routeId: result.insertId });
//     }catch(error){
//         await connection.rollback(); // Rollback if any query fails
//         console.error("Transaction Failed:", error);
//         return res.status(500).json({ message: "Server error during transaction" });
//     } finally {
//         connection.release(); // Release the database connection
//     }



//               break;
//          }
//          case "111":{
//           //straight , new  , new
//              const {TRSource, TRDest, routeInfo}  = data;

//              const { name, coord, province,address} = TRSource;
//              const { nameDest, coordDest, provinceDest,addressDest} = TRDest; 
//              const { price  ,routeType , travelMethod  , listOfMessAndCoords} = routeInfo;


//                       connection = await poolDb.getConnection();
//     try{
       
//         await connection.beginTransaction();

//         //insert a new TaxiRank source
//        const [newTRSource]  = await connection.query(queryInsertTaxiRank , [name, coord, province,address]);

//        //insert a new TaxiRank Destination
//        const [newTRDest]  = await connection.query(queryInsertTaxiRank , [nameDest, coordDest, provinceDest,addressDest]);

//         //Add to Route table
//         const  routeName = await generateUniqueRouteID(connection);
//         const [result] = await connection.query(query , [routeName , price  ,newTRSource.insertId,newTRDest.insertId, routeType ,travelMethod]);

//        //Add MiniRoutes
//         for(let i = 0 ; i < listOfMessAndCoords.length ; i++){
//             await connection.query(queryMiniRoute , [result.insertId ,listOfMessAndCoords[i].message ,  JSON.stringify(listOfMessAndCoords[i].Coords) , i+1 ])
//         }
        
//         //Add Directions
//         for(let i = 0; i< listOfMessAndCoords.length ;i++){
//             await connection.query(queryDirectionRoute , [result.insertId , JSON.stringify(listOfMessAndCoords[i].Coords) , i+1])
//         }
        
//         await connection.commit();
//         return res.status(200).json({ message: "Route added successfully", routeId: result.insertId });
//     }catch(error){
//         await connection.rollback(); // Rollback if any query fails
//         console.error("Transaction Failed:", error);
//         return res.status(500).json({ message: "Server error during transaction" });
//     } finally {
//         connection.release(); // Release the database connection
//     }

//              break;
//          }
           

//          case "100":{
//          //straight , old  , old
//              const {TRSource, TRDest, routeInfo}  = data;

//              const {IDSource} = TRSource;
//              const {IDDest} = TRDest; 
//              const { price  ,routeType , travelMethod  , listOfMessAndCoords} = routeInfo;


//      connection = await poolDb.getConnection();
//     try{
       
//         await connection.beginTransaction();

//         //Add to Route table
//         const  routeName = await generateUniqueRouteID(connection);
//         const [result] = await connection.query(query , [routeName , price  ,IDSource ,IDDest, routeType  ,travelMethod]);

//         //Add MiniRoutes
//         for(let i = 0 ; i < listOfMessAndCoords.length ; i++){
//             await connection.query(queryMiniRoute , [result.insertId ,listOfMessAndCoords[i].message ,  JSON.stringify(listOfMessAndCoords[i].Coords) , i+1 ])
//         }
        
//         //Add Directions
//         for(let i = 0; i< listOfMessAndCoords.length ;i++){
//             await connection.query(queryDirectionRoute , [result.insertId , JSON.stringify(listOfMessAndCoords[i].Coords) , i+1])
//         }
        
//         await connection.commit();
//         return res.status(200).json({ message: "Route added successfully", routeId: result.insertId });
//     }catch(error){
//         await connection.rollback(); // Rollback if any query fails
//         console.error("Transaction Failed:", error);
//         return res.status(500).json({ message: "Server error during transaction" });
//     } finally {
//         connection.release(); // Release the database connection
//     }


//              break;
//          }
            
//          case "110":{
//         //straight , new  , old
//             const {TRSource, TRDest, routeInfo}  = data;

//             const {  name, coord, province,address} = TRSource;
//              const {IDDest} = TRDest; 
//             const { price  ,routeType , travelMethod  , listOfMessAndCoords} = routeInfo;


             
//                       connection = await poolDb.getConnection();
//     try{
       
//         await connection.beginTransaction();

//         //insert a new TaxiRank source
//        const [newTRSource]  = await connection.query(queryInsertTaxiRank , [name, coord, province,address]);

//         //Add to Route table
//         const  routeName = await generateUniqueRouteID(connection);
//         const [result] = await connection.query(query , [routeName , price  ,newTRSource.insertId,IDDest, routeType  ,travelMethod]);

//        //Add MiniRoutes
//         for(let i = 0 ; i < listOfMessAndCoords.length ; i++){
//             await connection.query(queryMiniRoute , [result.insertId ,listOfMessAndCoords[i].message , JSON.stringify( listOfMessAndCoords[i].Coords) , i+1 ])
//         }
        
//         //Add Directions
//         for(let i = 0; i< listOfMessAndCoords.length ;i++){
//             await connection.query(queryDirectionRoute , [result.insertId , JSON.stringify( listOfMessAndCoords[i].Coords) , i+1])
//         }
        
//         await connection.commit();
//         return res.status(200).json({ message: "Route added successfully", routeId: result.insertId });
//     }catch(error){
//         await connection.rollback(); // Rollback if any query fails
//         console.error("Transaction Failed:", error);
//         return res.status(500).json({ message: "Server error during transaction" });
//     } finally {
//         connection.release(); // Release the database connection
//     }


//              break;
//          }
            

//          case "101":{
//         //straight , old  , new
//             const {TRSource, TRDest, routeInfo}  = data;

//             const {IDSource} = TRSource;
//              const {  nameDest, coordDest, provinceDest,addressDest} = TRDest; 
//             const { price  ,routeType , travelMethod  , listOfMessAndCoords} = routeInfo;


             
//     connection = await poolDb.getConnection();
//     try{
       
//         await connection.beginTransaction();

//        //insert a new TaxiRank Destination
//        const [newTRDest]  = await connection.query(queryInsertTaxiRank , [nameDest, coordDest, provinceDest,addressDest]);

//         //Add to Route table
//         const  routeName = await generateUniqueRouteID(connection);
//         const [result] = await connection.query(query , [routeName , price  , IDSource ,newTRDest.insertId, routeType ,travelMethod]);

//         //Add MiniRoutes
//         for(let i = 0 ; i < listOfMessAndCoords.length ; i++){
//             await connection.query(queryMiniRoute , [result.insertId ,listOfMessAndCoords[i].message , JSON.stringify( listOfMessAndCoords[i].Coords) , i+1 ])
//         }
        
//         //Add Directions
//         for(let i = 0; i< listOfMessAndCoords.length ;i++){
//             await connection.query(queryDirectionRoute , [result.insertId , JSON.stringify(listOfMessAndCoords[i].Coords) , i+1])
//         }
        
//         await connection.commit();
//         return res.status(200).json({ message: "Route added successfully", routeId: result.insertId });
//     }catch(error){
//         await connection.rollback(); // Rollback if any query fails
//         console.error("Transaction Failed:", error);
//         return res.status(500).json({ message: "Server error during transaction" });
//     } finally {
//         connection.release(); // Release the database connection
//     }


//              break;
//          }
            
//     }
 
// }catch(error){
//         console.log(error);
//         return res.status(500).send({message:"Server error"});
//     }
// }

export const AddPendingRoute = async (req, res) => {
    const data = req.body;
    const { caseType } = data;
    const userId = req.user.id; // Get the current user's ID from the request
    let connection;

    console.log("CaseType : " , caseType);
    console.log('Data of the routes : ', data);
    console.log('Current user ID: ', userId);
    try {
        connection = await poolDb.getConnection();
        await connection.beginTransaction();

        if (!handleRouteInsertion[caseType]) {
            throw new Error("Unsupported caseType");
        }

        const routeId = await handleRouteInsertion[caseType](connection, data, userId);

        await connection.commit();
        return res.status(200).json({ message: "Route added successfully", routeId });
    } catch (error) {
        if (connection) await connection.rollback();
        console.error("Transaction Failed:", error);
        return res.status(500).json({ message: "Server error during transaction" });
    } finally {
        if (connection) connection.release();
    }
};

export const listOfAllRoutes = async(req, res) =>{

    try{
        const listOfRoutes = await RouteModel.getAllRoutes();
        if(!listOfRoutes) return res.status(404).json({message:"No routes not found "});

        return res.status(200).send({routes:listOfRoutes , message:"Successful"});
    }catch(error){
        console.log(error);
    }
}

// Helper function to get TaxiRank information by ID
const getTaxiRankById = async (id) => {
    if (!id) {
        throw new Error("TaxiRank ID is required");
    }

    let db;
    try {
        db = await poolDb.getConnection();
        
        const query = "SELECT * FROM taxirank WHERE ID = ?";
        const [rows] = await db.query(query, [id]);
        
        if (!rows || rows.length === 0) {
            return null; // Return null if not found
        }
        
        const taxiRank = rows[0];
        
        // Parse the location_coord if it's stored as JSON string
        if (taxiRank.location_coord) {
            try {
                // Check if it's already an object
                if (typeof taxiRank.location_coord === 'object') {
                    // Already parsed, keep as is
                    console.log("location_coord is already an object");
                } else if (typeof taxiRank.location_coord === 'string') {
                    // Try to parse JSON string
                    taxiRank.location_coord = JSON.parse(taxiRank.location_coord);
                }
            } catch (parseError) {
                console.log("Could not parse location_coord JSON:", parseError);
                // Keep as string if parsing fails
            }
        }
        
        return taxiRank;
        
    } catch (error) {
        console.error("Database error in getTaxiRankById:", error);
        throw error;
    } finally {
        if (db) db.release();
    }
};

// Helper function to check if a TaxiRank with the same name and coordinates exists
const checkExistingPendingTaxiRank = async (taxiRankName, coordinates) => {
    if (!taxiRankName || !coordinates) {
        throw new Error("TaxiRank name and coordinates are required");
    }

    let db;
    try {
        db = await poolDb.getConnection();
        
        // Convert coordinates to JSON string for comparison
        const coordinatesJson = JSON.stringify(coordinates);
        
        const query = `
            SELECT * FROM PendingTaxiRank 
            WHERE name = ? 
            AND location_coord = ? 
            AND exist = true
        `;
        
        const [rows] = await db.query(query, [taxiRankName, coordinatesJson]);
        
        if (!rows || rows.length === 0) {
            return null; // No existing TaxiRank found
        }
        
        const existingTaxiRank = rows[0];
        
        // Parse the location_coord if it's stored as JSON string
        if (existingTaxiRank.location_coord) {
            try {
                // Check if it's already an object
                if (typeof existingTaxiRank.location_coord === 'object') {
                    // Already parsed, keep as is
                    console.log("location_coord is already an object");
                } else if (typeof existingTaxiRank.location_coord === 'string') {
                    // Try to parse JSON string
                    existingTaxiRank.location_coord = JSON.parse(existingTaxiRank.location_coord);
                }
            } catch (parseError) {
                console.log("Could not parse location_coord JSON:", parseError);
                // Keep as string if parsing fails
            }
        }
        
        return existingTaxiRank;
        
    } catch (error) {
        console.error("Database error in checkExistingPendingTaxiRank:", error);
        throw error;
    } finally {
        if (db) db.release();
    }
};


// === FUNCTIONS === 

function fixRouteDirections(directionsO2, sourceCoords, destinationCoords) {
    let bearingsArr = []; // stores { id, correctDir }

    for (let i = 0; i < directionsO2.result.length; i++) {
        for (let y = 0; y < directionsO2.result[i].length; y++) {
            const routeID = directionsO2.result[i][y].Route_ID;
            const directionCoords = directionsO2.result[i][y].direction_coords;

            if (i === 0) {
                const result = analyzeRouteDirection(directionCoords, sourceCoords, destinationCoords);
                bearingsArr.push({ id: routeID, correctDir: result });

                if (result === false) {
                    directionsO2.result[i][y].direction_coords = reverseCoordinates(directionCoords);
                }
            } else {
                const valueFound = bearingsArr.find(value => value.id === routeID);
                if (valueFound && valueFound.correctDir === false) {
                    directionsO2.result[i][y].direction_coords = reverseCoordinates(directionCoords);
                }
            }
        }
    }

    // Since directionsO2 is mutated, no need to return anything.
}


function reverseCoordinates(coords) {
  if (!Array.isArray(coords)) {
    throw new Error("Input must be an array of coordinates.");
  }
  return coords.slice().reverse();
}


async function shortPath(routeCloseToSource , routeCloseToDest , ranksIDs , sourceCoords , destinationCoords){
    console.log("Routes have common taxiRanks");

    //price 
    let priceCollectionO1;
    //get directions
    let  directionsO1;
    if(ranksIDs.firstR_taxiRankSource ===  ranksIDs.secR_taxiRankSource && ranksIDs.firstR_taxiRankDestination === ranksIDs.secR_taxiRankDestination){
        directionsO1 =   await getDirections([routeCloseToSource.closestRoute]);
        priceCollectionO1 = PriceCalc([routeCloseToSource.closestRoute]);
    }else{
        directionsO1 =   await getDirections([routeCloseToSource.closestRoute, routeCloseToDest.closestRoute]);
        priceCollectionO1 = PriceCalc([routeCloseToSource.closestRoute, routeCloseToDest.closestRoute]);
    }


    if(priceCollectionO1 === null){
        console.log("Could not get the prices of routes (priceCollectionO1) in [findingPath]");
        return {status:400 , result: "Internal server error"};
       }

       
    if(directionsO1.status != 200){
     console.log(directionsO1.message);
     return {status:directionsO1.status, result:"Internal server error"};
    }
   
      //get The Taxi TaxiRank 
       const formedTaxiIds = [`${ranksIDs.firstR_taxiRankSource}` , `${ranksIDs.firstR_taxiRankDestination}` , `${ranksIDs.secR_taxiRankSource}` ];
       const chosenTaxiRanks1 = await getChosenTaxiTanks(formedTaxiIds);
   
       if(chosenTaxiRanks1 === null || chosenTaxiRanks1.length === 0){
           console.log("chosenTaxiRanks is null or has length of zero");
           return {status:400, result:"Internal server error"};
       }
   

       //modify directions

       fixRouteDirections(directionsO1 , sourceCoords , destinationCoords);

            return{status:200 , result:{
               sourceCoord: sourceCoords,
               pointCloseToSource: routeCloseToSource.closestPoint,
               destCoord: destinationCoords,
               pointCloseToDest: routeCloseToDest.closestPoint,
               routes: [routeCloseToSource.closestRoute ,routeCloseToDest.closestRoute],
               prices:priceCollectionO1,
               directions:directionsO1,
               chosenTaxiRanks:chosenTaxiRanks1
           } };
}

async function closestTaxiRanksF(routeExploredArr , countObject , formatedRoutes , sourceCoords , destinationCoords, closestTaxiCount){
    /*This function is called evertime when a path is not found.Its function is to find another close route , the respects the following
    [It is within 2.1km walking distance , it is not repeating , there is only 5 attempts each side , the route has been found and when not anothe attempt is taken if the rules are allow]
    */
    if (countObject.countSource >= 5 && countObject.countDest >= 5) return {status:400 , message:"the count exceeds 5 on both source and destination" , value:null};
 
    //Loop to make sure the places found are not repeating
        let routeCloseToSource ;
        let routeCloseToDest ;

        //when its the first attempt we check both routes
        if(closestTaxiCount.value === 0){
             routeCloseToSource = findClosestRoute(formatedRoutes , sourceCoords);
             routeCloseToDest = findClosestRoute(formatedRoutes , destinationCoords);

        }else{
        
            //checking source count whether it has 5 attempts , 
            if(countObject.countSource < countObject.countDest  && countObject.countSource < 5){
               const result =  sourceRoute(countObject , routeCloseToSource , routeExploredArr , formatedRoutes , sourceCoords);
               if(!result){
                const destResult = destinationRoute(countObject , routeCloseToDest , routeExploredArr , formatedRoutes , destinationCoords);
                
                //when it returns null , Return no routes were found 
                if(!destResult) return  {status:404 , message:"No new routes were found" , value:null};
                 routeCloseToDest = destResult;
                
               }else{
                routeCloseToSource = result;
               }

           
            
            }else if(countObject.countDest < 5){
                const result = destinationRoute(countObject , routeCloseToDest , routeExploredArr , formatedRoutes , destinationCoords);
                
                if(!result){
                 //run the destination Section
                 const sourceResult =  sourceRoute(countObject , routeCloseToSource , routeExploredArr , formatedRoutes , sourceCoords);
                
                 //when it returns null , Return no routes were found 
                 if(!sourceResult) return  {status:404 , message:"No new routes were found" , value:null};
                    routeCloseToSource = sourceResult;
                 
                }else{
                    routeCloseToDest = result;
                }
              
                
            }else{
                return {status:404 , message:"No new routes were found" , value:null};;
            }

        }
       
    
        if (!routeCloseToSource?.closestRoute || !routeCloseToDest?.closestRoute) {
            console.log("Could not get the closest routes");
            return {status:404 , message:"The routes found were null or inapropriate " , value:null};;
        }
    
        //get the nearest taxiRank
        const closestTaxiRanks = await getTheTaxiRanks(routeCloseToSource.closestRoute.id , routeCloseToDest.closestRoute.id);
    
        //check TaxiRank IDs returned
        if(closestTaxiRanks.status != 200){
            console.log(closestTaxiRanks.message);
            return {status:closestTaxiRanks.status , message:closestTaxiRanks.message , value:null};
        }
        //increase count that is used to detect when the function is called for the first time
        closestTaxiCount.value++;
        return {status:200 , message:"Successful " , value:{ routeCloseToSource, routeCloseToDest, closestTaxiRanks }};
}


function destinationRoute(countObject, routeCloseToDest, routeExploredArr, formatedRoutes , destinationCoords){
    let loopAgain = true;
    while(loopAgain){
    let temp = routeCloseToDest;
    routeCloseToDest = findClosestRoute(formatedRoutes , destinationCoords);
    if(routeCloseToDest.closestRoute === null){
        routeCloseToDest = temp;
        return null;
    }else {
         //loop again if not found
        if (!routeExploredArr.destArr.includes(routeCloseToDest.closestRoute.id)) {
            routeExploredArr.destArr.push(routeCloseToDest.closestRoute.id);
            countObject.countDest++;
            loopAgain= false;
            return routeCloseToDest;
          }else{
            routeCloseToDest = temp;
          }  
    }
    }
} 

function sourceRoute(countObject , routeCloseToSource , routeExploredArr , formatedRoutes ,  sourceCoords ){
    let loopAgain = true;
    while(loopAgain){
    let temp = routeCloseToSource;
    routeCloseToSource = findClosestRoute(formatedRoutes , sourceCoords);
    if(routeCloseToSource.closestRoute === null){
        routeCloseToSource = temp;
        return null;
    }else {
         //loop again if not found
        if (!routeExploredArr.sourceArr.includes(routeCloseToSource.closestRoute.id)) {
            routeExploredArr.sourceArr.push(routeCloseToSource.closestRoute.id);
            countObject.countSource++;
            loopAgain= false;
            return routeCloseToSource;
          }else{
            routeCloseToSource = temp;
          }  
    }
    }
}

function analyzeRouteDirection(route, source, destination) {
  if (route.length < 2) {
    console.log("Need at least 2 route points to analyze direction.");
    return;
  }

  // Step 1: Vector from source to destination
  const vectorSD = {
    x: destination.longitude - source.longitude,
    y: destination.latitude - source.latitude
  };

  // Step 2: Vector from first point to last point in the route
  const start = route[0];
  const end = route[route.length - 1];

  const vectorRoute = {
    x: end[0] - start[0],
    y: end[1] - start[1]
  };

  // Step 3: Dot product
  const dot = vectorSD.x * vectorRoute.x + vectorSD.y * vectorRoute.y;

  // Step 4: Interpretation
  if (dot > 0) return true; // Route is heading toward destination
  else if (dot < 0) return false;  // Route is heading back toward source
  else return false // Route is neutral to source/destination
}

async function filterAreas(sourceProv, destinationProv) {
    let db;
    try {
        db = await poolDb.getConnection();
        try {
            // Create transaction
            await db.beginTransaction();

            // * Get the TaxiRanks in the provinces
            let taxiRanksQuery;
            let queryObjects = [];
            if (sourceProv === destinationProv) {
                // One province query
                taxiRanksQuery = "SELECT ID, name FROM taxirank WHERE province = ?";
                queryObjects = [sourceProv];
            } else {
                // Two provinces query
                taxiRanksQuery = "SELECT ID, name FROM taxirank WHERE province IN (?, ?)";
                queryObjects = [sourceProv, destinationProv];
            }
            const [getTaxiRanks] = await db.query(taxiRanksQuery, queryObjects);

            console.log("TaxiRanks filtered:", getTaxiRanks);

            if (!getTaxiRanks || getTaxiRanks.length === 0) {
                return { status: 404, message: "Could not find taxiRanks in the provided provinces", result: null };
            }

            // * Get the appropriate routes
            const taxiIDs = getTaxiRanks.map((taxiR) => taxiR.ID);
            const placeholders = taxiIDs.map(() => "?").join(",");

            const [getRoutes] = await db.query(
                `SELECT ID, name, travelMethod , route_type , TaxiRankStart_ID, TaxiRankDest_ID, price  
                 FROM routes 
                 WHERE TaxiRankDest_ID IN (${placeholders}) 
                 OR TaxiRankStart_ID IN (${placeholders})`,
                [...taxiIDs, ...taxiIDs] // Expand array to match placeholders
            );

            if (!getRoutes || getRoutes.length === 0) {
                return { status: 404, message: "No routes found", result: null };
            }

            // * Get mini-routes (coordinates)
            const routeIDs = getRoutes.map((route) => route.ID);
            if (routeIDs.length === 0) {
                return { status: 200, message: "No miniRoutes found", result: { routes: getRoutes, miniRoutes: [] } };
            }

            const placeholders_miniroutes = routeIDs.map(() => "?").join(",");
            const [getMiniCoordinates] = await db.query(
                `SELECT * FROM miniroute WHERE Route_ID IN (${placeholders_miniroutes})`,
                [...routeIDs]
            );

            // Commit transaction
            await db.commit();

            return { status: 200, message: "Successful", result: { routes: getRoutes, miniRoutes: getMiniCoordinates } };
        } catch (error) {
            // Rollback the transaction on error
            await db.rollback();
            console.error("Transaction Error:", error);
            return { status: 500, message: "Server Error during transaction", result: null };
        } finally {
            if (db) await db.release();
        }
    } catch (error) {
        console.error("Database Connection Error:", error);
        return { status: 500, message: "Server Error", result: null };
    }
}

function formatRoutes(routes , miniCoords){

    //cheking if the parameters are valid 
    if(!routes || !miniCoords ){
        console.log('there is a missin  parameters [formatRoutes(..)]');
        return null;
    }

    //checking the lengths
    if(routes.length === 0 || miniCoords.length === 0){
        console.log('there is a parameter with a length of equal or less than zero [formatRoutes(..)]');
        return null;
    }

    // * formatting process
    let array = [];

    routes.forEach((route)=>{

        const id = route.ID;
        const price = route.price;
        const routeName = route.name;
        const travelMethod = route.travelMethod;
        const routeType = route.route_type;
        const TaxiRankStart_ID  = route.TaxiRankStart_ID;
        const TaxiRankDest_ID =  route.TaxiRankDest_ID;
        let coordsAr = [];
        let drawArray = [];
        miniCoords.forEach((miniCoords)=>{
            if(miniCoords.Route_ID === id){
             coordsAr.push(...convertToGeoFormat(miniCoords.coords));
             drawArray.push(miniCoords.coords);
            }              
        });

        if(!coordsAr){
            console.log(`in route:  ${id} , there are no coords found`);
            return null;
        }
       array.push( {id:id , name:routeName , price:price ,route_type : routeType  ,  travelMethod:travelMethod , TaxiRankStart_ID:TaxiRankStart_ID  ,TaxiRankDest_ID:TaxiRankDest_ID, coordinates:coordsAr , drawableCoords:drawArray });
    });

    return array;
}

async function getChosenTaxiTanks(path) {
    // Check the parameter
    if (path === null || !Array.isArray(path)) {
        console.log("Invalid 'path' parameter in [getChosenTaxiTanks]");
        return null;
    }

    if (path.length === 0) {
        console.log("Path has length of zero");
        return null;
    }

    // Convert to integers
    const intArray = path.map(Number);
    const placeholders = intArray.map(() => '?').join(', ');
    

    // `FROM TaxiRank ID IN(${placeholders})` is incorrect SQL
    const query = `SELECT name, location_coord, address FROM taxirank WHERE ID IN (${placeholders})`;

    let db;
    try {
        db = await poolDb.getConnection();
        const [result] = await db.query(query, intArray); // no need to wrap intArray in another array

        if (!result || result.length === 0) {
            console.log("Result from database query has length of zero [getChosenTaxiTanks]");
            return null;
        }

        return result;
    } catch (error) {
        console.log("Error in getChosenTaxiTanks:", error);
        return null;
    } finally {
        if (db) await db.release();
    }
}

// Insert in a graph
function insertInGraph(listRoutes){
    let graph =  new Graph();

    listRoutes.forEach(route => {
        const price = parseInt(route.price , 10);
        const sourceID = `${route.TaxiRankStart_ID}`;
        const destId = `${route.TaxiRankDest_ID}`;
        console.log("Inserted fields : " , price ,sourceID , destId );
        graph.addEdge(sourceID , destId , price);
    });
  
    return graph;
}

function getBestPath(graph , sourceTaxiRankID , destinationTaxiRankID){
   return  dijkstra(graph , sourceTaxiRankID , destinationTaxiRankID);
}

//getting nearest routes and TaxiRank
function findClosestRoute(routes, randomPlace) {
    let closestRoute = null;
    let closestPoint = null;
    let minDistance = Infinity;
    const MAX_DISTANCE = 5100;

    routes.forEach(route => {
        route.coordinates.forEach(coord => {
            const distance = geolib.getDistance(randomPlace, coord);

            if (distance < minDistance && distance <= MAX_DISTANCE) {
                minDistance = distance;
                closestRoute = route;
                closestPoint = coord;
            }
        });
    });

    return { closestRoute, closestPoint, minDistance };
}

//getting TaxiRanks
async function getTheTaxiRanks(firstRouteId , secRouteId){
    let db;

    if(firstRouteId < 0 || secRouteId < 0){
        console.log("There is an invalid argument");
        return;
    }

    try{
        db =await poolDb.getConnection();

        await db.beginTransaction();

        const query = "SELECT * FROM routes WHERE  ID = ?";
        //first route request
        const [getFirstRoute] = await db.query(query , [firstRouteId]);

        if(!getFirstRoute || getFirstRoute.length === 0){
            return {status:404 , message:"Could not find first route" , result:null};
        }

        //second route request
        const [getSecRoute] = await db.query(query , [secRouteId]);

        if(!getSecRoute || getSecRoute.length === 0){
            return {status:404 , message:"Could not find second route" , result:null};
        }

        await db.commit();
        return {status:200 , message:"Successfully found TaxiRanks" ,
             result:{firstR_taxiRankSource: getFirstRoute[0].TaxiRankStart_ID , 
                firstR_taxiRankDestination: getFirstRoute[0].TaxiRankDest_ID ,
                secR_taxiRankSource: getSecRoute[0].TaxiRankStart_ID , 
                secR_taxiRankDestination: getSecRoute[0].TaxiRankDest_ID ,      
        }
        
        }
    }catch(error){
     await db.rollback();
     console.log(error);
     return {status:500 , message:"Server error" , result:null};
    }finally{
        if(db){
            await db.release();
        }
    }
}

function routesConnectionCheck(firstR_trSource ,firstR_trDest  , secR_trSource , secR_trDest ){

    if(!firstR_trSource || !firstR_trDest || !secR_trSource || !secR_trDest){
        console.log("Invalid Argument [routesConnectionCheck()]");
        return {flag:false , commonTaxiR_ID:-1};
    }

    // first check
    if(firstR_trSource === secR_trSource){
        return {flag:true , commonTaxiR_ID:firstR_trSource};
    }

    if(firstR_trSource === secR_trDest){
        return {flag:true , commonTaxiR_ID:firstR_trSource};
    }

    //second batch check
    if(firstR_trDest === secR_trSource){
        return {flag:true , commonTaxiR_ID:firstR_trDest};
    }

    if(firstR_trDest === secR_trDest){
        return {flag:true , commonTaxiR_ID:firstR_trDest};
    }

    return {flag:false , commonTaxiR_ID:-1};
}

function validatePathExists(formatedRoutes, taxiRankPath) {
    console.log("Validating path:", taxiRankPath);
    
    // Check each consecutive pair of taxi ranks in the path
    for (let i = 0; i < taxiRankPath.length - 1; i++) {
        const currentTaxiRank = Number(taxiRankPath[i]);
        const nextTaxiRank = Number(taxiRankPath[i + 1]);
        
        console.log(`Checking connection: ${currentTaxiRank} → ${nextTaxiRank}`);
        
        // Look for a route that connects these two taxi ranks
        const routeExists = formatedRoutes.some(route => {
            const routeSource = route.TaxiRankStart_ID;
            const routeDest = route.TaxiRankDest_ID;
            
            // Check both directions (since routes are bidirectional)
            return (routeSource === currentTaxiRank && routeDest === nextTaxiRank) ||
                   (routeSource === nextTaxiRank && routeDest === currentTaxiRank);
        });
        
        if (!routeExists) {
            console.log(`❌ No route found between taxi ranks ${currentTaxiRank} and ${nextTaxiRank}`);
            return {
                isValid: false,
                missingConnection: {
                    from: currentTaxiRank,
                    to: nextTaxiRank
                }
            };
        }
        
        console.log(`✅ Route found between taxi ranks ${currentTaxiRank} and ${nextTaxiRank}`);
    }
    
    console.log("✅ All connections in path are valid");
    return { isValid: true };
}

function printGraphConnections(graph) {
    // Validate graph structure
    if (!graph || !graph.nodes || typeof graph.nodes !== 'object') {
        console.log("Invalid graph structure");
        return;
    }

    console.log("Graph Connections:");
    // Iterate through each node in the graph
    for (let nodeName in graph.nodes) {
        const node = graph.nodes[nodeName];
        const edges = node.edges;

        // Check if node has any connections
        if (!edges || Object.keys(edges).length === 0) {
            console.log(`${nodeName}: No connections`);
            continue;
        }

        // Print connections for this node
        console.log(`${nodeName}:`);
        for (let neighborName in edges) {
            console.log(`  -> ${neighborName} (weight: ${edges[neighborName]})`);
        }
    }
}

//converting coordintates
const convertToGeoFormat = (coordinates) => {
    return coordinates.map(coord => ({
        latitude: coord[1],
        longitude: coord[0]
    }));
};

//returns a dynamic array with ordered direction coords
async function getDirections(chosenRoutes) {
    let arr = [];
    let db;

    if (!chosenRoutes) {
        return { status: 400, message: "Argument is null or undefined", result: null };
    }

    if (chosenRoutes.length === 0) {
        return { status: 401, message: "Routes have length of zero", result: null };
    }

    try {
        db = await poolDb.getConnection();
        const query = "SELECT * FROM directionroute WHERE Route_ID = ?";
        
        // Use map + Promise.all() to wait for all queries to complete
        const results = await Promise.all(
            chosenRoutes.map(async (route) => {
                const [result] = await db.query(query, [route.id]);
                return result && result.length > 0 ? result : null;
            })
        );

        // Filter out null results (routes not found)
        arr = results.filter((res) => res !== null);

        if (arr.length === 0) {
            return { status: 404, message: "No valid routes found", result: null };
        }

        const orderedDirections = findAllPaths(arr);

        if (orderedDirections.length === 0) {
            return { status: 401, message: "No paths found", result: null };
        }

        //execute directions coords
        return { status: 200, message: "Successfully sent", result: orderedDirections };
    } catch (error) {
        console.log(error);
        return { status: 500, message: "Server error", result: null };
    } finally {
        if (db) await db.release();
    }
}

async function getMinimisedDirections(finalRoutesIds , allDirections ){
    let dynamicArr = [];
    let arr = [];
    let db;
    let directionsLength ;
    //Request total number of cobined route directions
    try{
        db = await poolDb.getConnection();
        directionsLength= await db.query(`SELECT COUNT(*) AS direction_count
            FROM directionroute 
            WHERE Route_ID IN(${finalRoutesIds})
            GROUP BY Route_ID 
            ORDER BY direction_count DESC
            LIMIT 1`);

            if(!directionsLength || directionsLength.length === 0){
                return {status:404 , message:"Could not find the count of directions", result:null};
            }

           
    }catch(error){
        return {status:500 , message:"Server error", result:null};
    }finally{
        if(db) await db.release();
    }
  

    for(let a = 1 ; a <= directionsLength ; a++){
    for(let i = 0 ;i < finalRoutesIds.length ;i++){
        const routeID = finalRoutesIds[i];
        const routeDirections = getRouteDirections(routeID , allDirections);
        const  directions = routeDirections[a];
        arr.push(directions);
    }

    dynamicArr.push(arr);
    arr = [];
}

return dynamicArr;

}

 function expandTaxiRanks(taxiRanks , routeCloseToSourceTRStart , routeCloseToSourceTRDest , routeCloseToDestTRStart , routeCloseToDestTRDest){

    //Source and destination check
    let sourceStart = false;
    let sourceDest = false;

    let destStart = false;
    let destDest = false;

    console.log("routeCloseToSourceTRStart converted to number : " , Number(routeCloseToSourceTRStart));
    console.log("routeCloseToSourceTRDest converted to number : " , Number(routeCloseToSourceTRDest));
    console.log("routeCloseToDestTRStart converted to number : " , Number(routeCloseToDestTRStart));
    console.log("routeCloseToDestTRDest converted to number : " , Number(routeCloseToDestTRDest));
    

    taxiRanks.forEach((taxiRank)=>{
        if(Number(taxiRank) === Number(routeCloseToSourceTRStart)){
            sourceStart = true;
        }
        if(Number(taxiRank) === Number(routeCloseToSourceTRDest)){
            sourceDest = true;
        }


        if(Number(taxiRank) === Number(routeCloseToDestTRStart)){
            destStart = true;
        }
        if(Number(taxiRank) === Number(routeCloseToDestTRDest)){
            destDest = true;
        }
    });


    //source modification
    if(sourceStart === false){
        taxiRanks.unshift(`${routeCloseToSourceTRStart}`);
    }

    if(sourceDest === false){
        taxiRanks.unshift(`${routeCloseToSourceTRDest}`);
    }

    //destination modification
    if(destStart === false){
        taxiRanks.push(`${routeCloseToDestTRStart}`);
    }

    if(destDest === false){
        taxiRanks.push(`${routeCloseToDestTRDest}`);
    }

    return taxiRanks;

}


function getChosenRoutes(routes , taxiRanks , routeCloseToSource , routeCloseToDest){

    let chosenRoutes = [];
    let isSourceLoop = false ;
    let isDestLoop = false;
    let properTaxiRankList = [];
    
    console.log("=== getChosenRoutes DEBUG ===");
    console.log("Taxi ranks path:", taxiRanks);
    console.log("Source route:", routeCloseToSource.name, "TaxiRanks:", routeCloseToSource.TaxiRankStart_ID, "→", routeCloseToSource.TaxiRankDest_ID);
    console.log("Dest route:", routeCloseToDest.name, "TaxiRanks:", routeCloseToDest.TaxiRankStart_ID, "→", routeCloseToDest.TaxiRankDest_ID);
    
    if(routes === null|| taxiRanks === null){
        console.log("Routes or pathRouteIds is null");
        return null;
    }

    if(routes.length === 0 || taxiRanks.length === 0){
        console.log("Routes or pathRouteIds has length of zero");
        return null;
    }

    // ESSENTIAL: Add the closest route to source so user can walk to it
    console.log("Adding source route for user access:", routeCloseToSource.name);
    chosenRoutes.push(routeCloseToSource);

    if(routeCloseToSource.route_type == "Loop"){
        isSourceLoop = true;
    }

    if(routeCloseToDest.route_type == "Loop"){
        isDestLoop = true;
    }

    console.log("isSourceLoop : " , isSourceLoop);
    console.log("isDestLoop : " , isDestLoop);
    taxiRanks = expandTaxiRanks(taxiRanks , routeCloseToSource.TaxiRankStart_ID , routeCloseToSource.TaxiRankDest_ID , routeCloseToDest.TaxiRankStart_ID , routeCloseToDest.TaxiRankDest_ID);
    console.log("taxiRanks : " , taxiRanks);
    // Get the taxi ranks that need connecting routes (excluding source and destination)
    if(isSourceLoop === false && isDestLoop === false){
        for(let i = 1 ; i < taxiRanks.length-1 ; i++){
            properTaxiRankList.push(taxiRanks[i]);
        }
    }else if(isSourceLoop === true && isDestLoop === false){
        for(let i = 0 ; i < taxiRanks.length-1 ; i++){
            properTaxiRankList.push(taxiRanks[i]);
        }
    }else if(isSourceLoop === false && isDestLoop === true){
        for(let i = 1 ; i < taxiRanks.length ; i++){
            properTaxiRankList.push(taxiRanks[i]);
        }
    }else{
        for(let i = 0 ; i < taxiRanks.length ; i++){
            properTaxiRankList.push(taxiRanks[i]);
        }
    }

    console.log("Taxi ranks needing connections:", properTaxiRankList);

    // Find connecting routes between consecutive taxi ranks
    for(let i = 0; i < properTaxiRankList.length-1 ; i++){
        const source =  Number(properTaxiRankList[i]);
        const destination = Number(properTaxiRankList[i+1]);
        
        console.log(`Looking for route connecting: ${source} → ${destination}`);

        let connectingRouteFound = false;
        routes.forEach((route)=>{
            const routeSource = route.TaxiRankStart_ID ;
            const routeDestination  = route.TaxiRankDest_ID;

            // Check both directions (bidirectional routes)
            if((routeSource === source && destination === routeDestination) ||
               (routeDestination === source && routeSource === destination)){
                console.log(`✅ Found connecting route: ${route.name} (${routeSource} → ${routeDestination})`);
                chosenRoutes.push(route);
                connectingRouteFound = true;
            }
        });
        
        if(!connectingRouteFound){
            console.log(`❌ No connecting route found between ${source} and ${destination}`);
            return []; // Return empty if no connection found
        }
    }

    // ESSENTIAL: Add the closest route to destination so user can walk from it
    console.log("Adding destination route for user access:", routeCloseToDest.name);
    chosenRoutes.push(routeCloseToDest);
    
    console.log("Final chosen routes:", chosenRoutes.map(r => `${r.name} (${r.TaxiRankStart_ID}→${r.TaxiRankDest_ID})`));
    return chosenRoutes;
}

function PriceCalc(chosenRoutes){
    let listPrices = [];
    let totalPrice = 0.0;

    if(chosenRoutes === null){
        console.log("chosenRoutes is null");
        return null;
    }

    if(chosenRoutes === 0){
        console.log("chosenRoutes has length of zero");
        return null;
    }
    
    chosenRoutes.forEach((route)=>{
        const tempPrice = Number(route.price);
        listPrices.push({name:route.name , price:tempPrice , travelMethod:route.travelMethod});
        totalPrice += tempPrice;
    });

    return {totalPrice: totalPrice , listOfPrices:listPrices };
}

function findAllPaths(locations) {
    if (locations.length === 0) return [];
    
    const paths = [];
    
    function backtrack(currentPath, currentIndex) {
        if (currentIndex === locations.length) {
            paths.push([...currentPath]);
            return;
        }
        
        const currentLocation = locations[currentIndex];
        for (let i = 0; i < currentLocation.length; i++) {
            currentPath.push(currentLocation[i]);
            backtrack(currentPath, currentIndex + 1);
            currentPath.pop();
        }
    }
    
    backtrack([], 0);
    return paths;
}

function getRouteDirections(routeId , allDirections){
return allDirections.filter((direction)=>{
    return direction.Route_ID == routeId
});
}

async function generateUniqueRouteID(connection) {
    let isUnique = false;
    let routeID;
    try{
     
    while (!isUnique) {
        routeID = uuidv4().replace(/-/g, '').slice(0, 7).toUpperCase(); // Generate a 7-char ID
    // Check if the ID already exists in the database
    const [rows] = await connection.query("SELECT COUNT(*) as count FROM routes WHERE name = ?", [routeID]);

    if (rows[0].count === 0) {
        isUnique = true; // If no match, it's unique
    }  
    }
}catch(error){
    console.log(error);
}
    return routeID;
}


//pending route functions 

const handleRouteInsertion = {
    "01": async (connection, data, userId) => {
        const { TRSource, routeInfo } = data;

        //insert the taxirank
        const sourceId = await insertTaxiRank(connection, { ...TRSource , exist:false , userId });

        //insert the route
        const routeId = await insertRoute(connection, {
            price: routeInfo.price,
            sourceId:sourceId,
            destId: sourceId,
            routeType: routeInfo.routeType,
            travelMethod: routeInfo.travelMethod,
            userId,
        });

        //inserted miniroutes and directions
        await insertMiniRoutes(connection, routeId, routeInfo.listOfMessAndCoords);
        await insertDirections(connection, routeId, routeInfo.listOfMessAndCoords);
        return routeId;
    },
    "00": async (connection, data, userId) => {
        const { TRSource, routeInfo } = data;
        //get information of the taxirank
        const TRSourceInfo = await getTaxiRankById(TRSource.IDSource);

        //check if it already exists in pendingTaxiRank
        const sourceExist = await checkExistingPendingTaxiRank(TRSourceInfo.name, TRSourceInfo.location_coord);
        let sourceId;
        if(sourceExist){
            //if it exists, use the ID
            sourceId = sourceExist.ID;
        }else{
            //if it doesn't exist, insert it
            sourceId = await insertTaxiRank(connection, {
                name: TRSourceInfo.name,
                coord: TRSourceInfo.location_coord,
                province: TRSourceInfo.province,
                address: TRSourceInfo.address,
                exist: true,
                userId,
            });
        }
        //insert the route
        const routeId = await insertRoute(connection, {
            price: routeInfo.price,
            sourceId: sourceId,
            destId: sourceId,
            routeType: routeInfo.routeType,
            travelMethod: routeInfo.travelMethod,
            userId,
        });
        
        //inserted miniroutes and directions
        await insertMiniRoutes(connection, routeId, routeInfo.listOfMessAndCoords);
        await insertDirections(connection, routeId, routeInfo.listOfMessAndCoords);
        return routeId;
    },
    "111": async (connection, data, userId) => {
        const { TRSource, TRDest, routeInfo } = data;
        const sourceId = await insertTaxiRank(connection, { ...TRSource,exist:false , userId });
        const destId = await insertTaxiRank(connection, {
            name: TRDest.nameDest,
            coord: TRDest.coordDest,
            province: TRDest.provinceDest,
            address: TRDest.addressDest,
            exist: false,
            userId,
        });
        const routeId = await insertRoute(connection, {
            price: routeInfo.price,
            sourceId,
            destId,
            routeType: routeInfo.routeType,
            travelMethod: routeInfo.travelMethod,
            userId,
        });
        await insertMiniRoutes(connection, routeId, routeInfo.listOfMessAndCoords);
        await insertDirections(connection, routeId, routeInfo.listOfMessAndCoords);
        return routeId;
    },
    "100": async (connection, data, userId) => {
    const { TRSource, TRDest, routeInfo } = data;
    const TRSourceInfo = await getTaxiRankById(TRSource.IDSource);

    //check if it already exists in pendingTaxiRank
    const sourceExist = await checkExistingPendingTaxiRank(TRSourceInfo.name, TRSourceInfo.location_coord);
    let sourceId;
    if(sourceExist){
        sourceId = sourceExist.ID;
    }else{
        sourceId = await insertTaxiRank(connection, {
            name: TRSourceInfo.name,
            coord: TRSourceInfo.location_coord,
            province: TRSourceInfo.province,
            address: TRSourceInfo.address,
            exist: true,
            userId,
        });
    }

    const TRDestInfo = await getTaxiRankById(TRDest.IDDest);
    //check if it already exists in pendingTaxiRank
    const destExist = await checkExistingPendingTaxiRank(TRDestInfo.name, TRDestInfo.location_coord);
    let destId;
    if(destExist){
        destId = destExist.ID;
    }else{
        destId = await insertTaxiRank(connection, {
            name: TRDestInfo.name,
            coord: TRDestInfo.location_coord,
            province: TRDestInfo.province,
            address: TRDestInfo.address,
            exist: true,
            userId,
        });
    }

    const routeId = await insertRoute(connection, {
        price: routeInfo.price,
        sourceId:sourceId,
        destId: destId,
        routeType: routeInfo.routeType,
        travelMethod: routeInfo.travelMethod,
        userId,
    });

    await insertMiniRoutes(connection, routeId, routeInfo.listOfMessAndCoords);
    await insertDirections(connection, routeId, routeInfo.listOfMessAndCoords);
    return routeId;
},
"110": async (connection, data, userId) => {
    const { TRSource, TRDest, routeInfo } = data;
    const sourceId = await insertTaxiRank(connection, { ...TRSource, exist:false , userId });

    const TRDestInfo = await getTaxiRankById(TRDest.IDDest);
    //check if it already exists in pendingTaxiRank
    const destExist = await checkExistingPendingTaxiRank(TRDestInfo.name, TRDestInfo.location_coord);
    let destId;
    if(destExist){
        destId = destExist.ID;
    }else{
        destId = await insertTaxiRank(connection, {
            name: TRDestInfo.name,
            coord: TRDestInfo.location_coord,
            province: TRDestInfo.province,
            address: TRDestInfo.address,
            exist: true,
            userId,
        });
    }
    const routeId = await insertRoute(connection, {
        price: routeInfo.price,
        sourceId,
        destId,
        routeType: routeInfo.routeType,
        travelMethod: routeInfo.travelMethod,
        userId,
    });
    await insertMiniRoutes(connection, routeId, routeInfo.listOfMessAndCoords);
    await insertDirections(connection, routeId, routeInfo.listOfMessAndCoords);
    return routeId;
},
"101": async (connection, data, userId) => {
    const { TRSource, TRDest, routeInfo } = data;

    const TRSourceInfo = await getTaxiRankById(TRSource.IDSource);
    //check if it already exists in pendingTaxiRank
    const sourceExist = await checkExistingPendingTaxiRank(TRSourceInfo.name, TRSourceInfo.location_coord);
    let sourceId;
    if(sourceExist){
        sourceId = sourceExist.ID;
    }else{
        sourceId = await insertTaxiRank(connection, {
            name: TRSourceInfo.name,
            coord: TRSourceInfo.location_coord,
            province: TRSourceInfo.province,
            address: TRSourceInfo.address,
            exist: true,
            userId,
        });
    }

    const destId = await insertTaxiRank(connection, {
        name: TRDest.nameDest,
        coord: TRDest.coordDest,
        province: TRDest.provinceDest,
        address: TRDest.addressDest,
        exist: false,
        userId,
    });

    const routeId = await insertRoute(connection, {
        price: routeInfo.price,
        sourceId,
        destId,
        routeType: routeInfo.routeType,
        travelMethod: routeInfo.travelMethod,
        userId,
    });
    await insertMiniRoutes(connection, routeId, routeInfo.listOfMessAndCoords);
    await insertDirections(connection, routeId, routeInfo.listOfMessAndCoords);
    return routeId;
}
};

const insertRoute = async (connection, { price, sourceId, destId, routeType, travelMethod, userId }) => {
    const query = "INSERT INTO pendingroutes(name,price,start_rank_id,end_rank_id, route_type,travel_method,user_id) VALUES(?,?,?,?,?,?,?)";
    const routeName = await generateUniqueRouteID(connection);
    const [result] = await connection.query(query, [routeName, price, sourceId, destId, routeType, travelMethod, userId]);
    return result.insertId;
};

const insertDirections = async (connection, routeId, list) => {
    const query = "INSERT INTO pendingdirectionroutes(pending_route_id,direction_coords,direction_index) VALUES(?,?,?)";
    for (let i = 0; i < list.length; i++) {
        await connection.query(query, [routeId, JSON.stringify(list[i].Coords), i + 1]);
    }
};

const insertMiniRoutes = async (connection, routeId, list) => {
    const query = "INSERT INTO pendingminiroutes(pending_route_id,message,coords,route_index) VALUES(?,?,?,?)";
    for (let i = 0; i < list.length; i++) {
        await connection.query(query, [routeId, list[i].message, JSON.stringify(list[i].Coords), i + 1]);
    }
};

const insertTaxiRank = async (connection, { name, coord, province, address, exist , userId }) => {
    console.log("insertTaxiRank called with:", { name, coord, province, address, userId });
    const query = "INSERT INTO pendingtaxirank(name , location_coord, province, address , exist,user_id) VALUES (?,?,?,?,?,?)";
    const [result] = await connection.query(query, [name, JSON.stringify(coord), province, address, exist, userId]);
    return result.insertId;
};

