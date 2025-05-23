import poolDb from "../config/db.js";
import { v4 as uuidv4 } from 'uuid';
import  Graph from "../src/Graph.js";
import dijkstra from "../src/Dijkstra.js";
import geolib from'geolib';


export const findingPath = async(req,res)=>{
    const {sourceCoords , sourceProvince , destinationCoords , destinationProvince}  = req.body;
    if(!sourceCoords || !sourceProvince || !destinationCoords || !destinationProvince){
        return res.status(400).send("Missing required fields");
    }
    //count of farms a
    let countObj = {countSource:0 , countDest:0};
    let arr = [];

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


    //closestTaxiRanksF(arr , countObj , formatedRoutes , sourceCoords , destinationCoords );
    /****************** */

    //get the closest routes to the source and destination points
    const routeCloseToSource = findClosestRoute(formatedRoutes , sourceCoords);
  


    const routeCloseToDest = findClosestRoute(formatedRoutes , destinationCoords);

    if(routeCloseToSource.closestRoute === null || routeCloseToSource.closestRoute === null){
        console.log("Could not get the closest routes in [findingPath]");
        return res.status(400).send("Internal server error");
    }

    console.log("routeCloseToSource : " , routeCloseToSource);
    console.log("routeCloseToDest : ", routeCloseToDest);

    //get the nearest taxiRank
    const closestTaxiRanks = await getTheTaxiRanks(routeCloseToSource.closestRoute.id , routeCloseToDest.closestRoute.id);
    console.log("closestTaxiRanks : " , closestTaxiRanks);

    //check TaxiRank IDs returned
    if((await closestTaxiRanks).status != 200){
        console.log((await closestTaxiRanks).message);
        return res.status((await closestTaxiRanks).status).send((await closestTaxiRanks).message);
    }

    // *** When routes connect
    
    /************************* */


    //Check if routes connect 
    const ranksIDs = closestTaxiRanks.result;
    const commonPath = routesConnectionCheck(ranksIDs.firstR_taxiRankSource , ranksIDs.firstR_taxiRankDestination , ranksIDs.secR_taxiRankSource , ranksIDs.secR_taxiRankDestination);

  

    if(commonPath.flag === true){
        console.log("Routes have common taxiRanks");


 //price  Option 1
 const priceCollectionO1 = PriceCalc([routeCloseToSource.closestRoute, routeCloseToDest.closestRoute]);
 if(priceCollectionO1 === null){
  console.log("Could not get the prices of routes (priceCollectionO1) in [findingPath]");
  return res.status(400).send("Internal server error");
 }


 //get directions option 1
 const directionsO1 = await getDirections([routeCloseToSource.closestRoute, routeCloseToDest.closestRoute]);

 if(directionsO1.status != 200){
  console.log(directionsO1.message);
  return res.status(directionsO1.status).send("Internal server error");
 }

  //   //get The Taxi TaxiRank 
    const formedTaxiIds = ['ranksIDs.firstR_taxiRankSource' , 'ranksIDs.firstR_taxiRankDestination' , 'ranksIDs.secR_taxiRankSource'];
    const chosenTaxiRanks1 = await getChosenTaxiTanks(formedTaxiIds);

    if(chosenTaxiRanks1 === null || chosenTaxiRanks1.length === 0){
        console.log("chosenTaxiRanks is null or has length of zero");
        return res.status(400).send("Internal server error");
    }


         return res.status(200).send({
            sourceCoord: sourceCoords,
            pointCloseToSource: routeCloseToSource.closestPoint,
            destCoord: destinationCoords,
            pointCloseToDest: routeCloseToDest.closestPoint,
            routes: [routeCloseToSource.closestRoute ,routeCloseToDest.closestRoute],
            prices:priceCollectionO1,
            directions:directionsO1,
            chosenTaxiRanks:chosenTaxiRanks1
        });
    }

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
  

    //get the fastest path utilising the graph
    console.log("Print input , firstR_taxiRankSource : " , sourceTaxiRankRank, " secR_taxiRankDestination : " , destinationTaxiRank);
    const fastestPathResults =  getBestPath(graph , `${sourceTaxiRankRank}` , `${destinationTaxiRank}`);
    console.log("Path : " , fastestPathResults);

    if(fastestPathResults.path.length === 0){
        console.log("Could not get the Fastest path in [findingPath]");
        return res.status(400).send("Internal server error");
    }

    //get The Taxi TaxiRank 
    const chosenTaxiRanks = await getChosenTaxiTanks( fastestPathResults.path );

    if(chosenTaxiRanks === null || chosenTaxiRanks.length === 0){
        console.log("chosenTaxiRanks is null or has length of zero");
        return res.status(400).send("Internal server error");
    }

    //Get paths from the Ids of TaxiRanks provided by [fastestPathResults]
    const chosenRoutes = getChosenRoutes(formatedRoutes , fastestPathResults.path , routeCloseToSource.closestRoute, routeCloseToDest.closestRoute);
    console.log("Chosen routes : " , chosenRoutes);
    if(chosenRoutes.length === 0){
        console.log("Could not get the chosen routes in [getChosenRoutes]=>[findingPath]");
        return res.status(400).send("Internal server error");
    }
     //get directions option 2
     const directionsO2 = await getDirections(chosenRoutes);
     console.log("Directions : " , directionsO2.result);

     if(directionsO2.status != 200){3
        console.log(directionsO2.message);
        return res.status(directionsO2.status).send("Internal server error");
       }

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
        pointCloseToSource: routeCloseToSource.closestPoint,
        destCoord: destinationCoords,
        pointCloseToDest: routeCloseToDest.closestPoint,
        routes: chosenRoutes,
        prices:priceCollectionO2,
        directions:directionsO2,
        chosenTaxiRanks:chosenTaxiRanks
    });
}


async function closestTaxiRanksF(routeExploredArr , countObject , formatedRoutes , sourceCoords , destinationCoords){
    const routeCloseToSource = findClosestRoute(formatedRoutes , sourceCoords);
    const routeCloseToDest = findClosestRoute(formatedRoutes , destinationCoords);

    

    if(routeCloseToSource.closestRoute === null || routeCloseToSource.closestRoute === null){
        console.log("Could not get the closest routes in [findingPath]");
        return res.status(400).send("Internal server error");
    }

    console.log("routeCloseToSource : " , routeCloseToSource);
    console.log("routeCloseToDest : ", routeCloseToDest);

    //get the nearest taxiRank
    const closestTaxiRanks = await getTheTaxiRanks(routeCloseToSource.closestRoute.id , routeCloseToDest.closestRoute.id);
    console.log("closestTaxiRanks : " , closestTaxiRanks);

    //check TaxiRank IDs returned
    if((await closestTaxiRanks).status != 200){
        console.log((await closestTaxiRanks).message);
        return res.status((await closestTaxiRanks).status).send((await closestTaxiRanks).message);
    }

    //save the info in an array 
    routeExploredArr.push()
    //return the needed variables 
}


// === FUNCTIONS === 
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
                taxiRanksQuery = "SELECT ID, name FROM TaxiRank WHERE province = ?";
                queryObjects = [sourceProv];
            } else {
                // Two provinces query
                taxiRanksQuery = "SELECT ID, name FROM TaxiRank WHERE province IN (?, ?)";
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
                 FROM Routes 
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
                `SELECT * FROM MiniRoute WHERE Route_ID IN (${placeholders_miniroutes})`,
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
    const query = `SELECT name, location_coord, address FROM TaxiRank WHERE ID IN (${placeholders})`;

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

    routes.forEach(route => {
        route.coordinates.forEach(coord => {
            const distance = geolib.getDistance(randomPlace, coord);

            if (distance < minDistance) {
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

        const query = "SELECT * FROM Routes WHERE  ID = ?";
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
        const query = "SELECT * FROM DirectionRoute WHERE Route_ID = ?";
        
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
            FROM DirectionRoute 
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

function getChosenRoutes(routes , taxiRanks , routeCloseToSource , routeCloseToDest){

    let chosenRoutes = [];
    let isSourceLoop = false ;
    let isDestLoop = false;
    let properTaxiRankList = [];
    if(routes === null|| taxiRanks === null){
        console.log("Routes or pathRouteIds is null");
        return null;
    }

    if(routes.length === 0 || taxiRanks.length === 0){
        console.log("Routes or pathRouteIds has length of zero");
        return null;
    }

    //check if it is a loop case 
        //add to chosen routes
        chosenRoutes.push(routeCloseToSource);

    if(routeCloseToSource.route_type == "Loop"){
        isSourceLoop = true;
    }

    if(routeCloseToDest.route_type == "Loop"){
        isDestLoop = true;
    }

    //refactoring the list in taxiRanks [FALSE IS WHAT WE ARE LOOKING FOR]
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




    for(let i = 0; i < properTaxiRankList.length-1 ; i++){
        const source =  Number(properTaxiRankList[i]);
        const destination = Number(properTaxiRankList[i+1]);

        routes.forEach((route)=>{
            const routeSource = route.TaxiRankStart_ID ;
            const routeDestination  = route.TaxiRankDest_ID;

            //source check first
            if(routeSource === source){
                if(destination === routeDestination){
                    chosenRoutes.push(route);
                }
            }else if(routeDestination === source){
                if(routeSource === destination){
                    chosenRoutes.push(route);
                }
            }
        });
    }

//add to chosen routes for destination
chosenRoutes.push(routeCloseToDest);
    

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



