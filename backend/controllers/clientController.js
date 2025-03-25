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

    console.log("Fields : " , sourceCoords , sourceProvince , destinationCoords , destinationProvince);
    //get routes in proximity to the points
    const routes = await filterAreas(sourceProvince , destinationProvince);
    console.log('Routes : ' , routes);
    if((await routes).status != 200){
        return res.status((await routes).status).send((await routes).message);
    }
    //get the nearest routes 
    const formatedRoutes = formatRoutes(routes.result.routes , routes.result.miniRoutes);
    if(formatedRoutes === null){
        console.log("Could not format routes");
        return res.status(400).send("Internal server error");
    }

    console.log("formatedRoutes : " , formatedRoutes);

    const routeCloseToSource = findClosestRoute(formatedRoutes , sourceCoords);
    const routeCloseToDest = findClosestRoute(formatedRoutes , destinationCoords);

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

    const ranksIDs = closestTaxiRanks.result;
    const commonPath = routesConnectionCheck(ranksIDs.firstR_taxiRankSource , ranksIDs.firstR_taxiRankDestination , ranksIDs.secR_taxiRankSource , ranksIDs.secR_taxiRankDestination);



    if(commonPath.flag === true){
        console.log("Routes have common taxiRanks");
         return res.status(200).send({
            sourceCoord: sourceCoords,
            pointCloseToSource: routeCloseToSource.closestPoint,
            destCoord: destinationCoords,
            pointCloseToDest: routeCloseToDest.closestPoint,
            routeCoords: [routeCloseToSource.closestRoute.coordinates ,routeCloseToDest.closestRoute.coordinates]
        });
    }

    //find the cheapest path
    const graph = insertInGraph(formatedRoutes);
    printGraphConnections(graph);

    console.log("Print input , firstR_taxiRankSource : " , ranksIDs.firstR_taxiRankSource , " secR_taxiRankDestination : " , ranksIDs.secR_taxiRankDestination );
    const fastestPathResults =  getBestPath(graph , ranksIDs.firstR_taxiRankSource , ranksIDs.secR_taxiRankDestination);
    console.log("Path : " , fastestPathResults);
    
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
                `SELECT ID, name, TaxiRankStart_ID, TaxiRankDest_ID, price  
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
        const TaxiRankStart_ID  = route.TaxiRankStart_ID;
        const TaxiRankDest_ID =  route.TaxiRankDest_ID;
        let coordsAr = [];
        miniCoords.forEach((miniCoords)=>{
            if(miniCoords.Route_ID === id){
             coordsAr.push(...convertToGeoFormat(miniCoords.coords));
            }              
        });

        if(!coordsAr){
            console.log(`in route:  ${id} , there are no coords found`);
            return null;
        }
       array.push( {id:id , price:price , TaxiRankStart_ID:TaxiRankStart_ID , TaxiRankDest_ID:TaxiRankDest_ID, coordinates:coordsAr});
    });

    return array;
}

// Insert in a graph
function insertInGraph(listRoutes){
    let graph =  new Graph();

    listRoutes.forEach(route => {
        const price = parseInt(route.price , 10);
        const sourceID = String(route.TaxiRankStart_ID);
        const destId = String(route.TaxiRankDest_ID);
        console.log("Inserted fields : " , price ,sourceID , destId )
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




