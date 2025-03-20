import poolDb from "../config/db.js";
import { v4 as uuidv4 } from 'uuid';
const Graph = require("../src/Graph");
const dijkstra = require("../src/Dijkstra");
import geolib from'geolib';


export const getPath = async(req,res)=>{

    const {sourceCoords , sourceProvince , destinationCoords , destinationProvince}  = req.body;
    if(!sourceCoords || !sourceProvince || !destinationCoords || !destinationProvince){
        return res.status(400).send("Missing required fields");
    }

    //get routes in proximity to the points
    const routes = filterAreas(sourceProv , destinationProv);
    if((await routes).status != 200){
        return res.status((await routes).status).send((await routes).message);
    }

    const formatedRoutes = formatRoutes();
    //The routes were found

    //get the nearest routes 

    //get the nearest taxiRank


    //get the cheapest path 

}

// === FUNCTIONS === 

async function filterAreas(sourceProv , destinationProv){
    let db;
    try{
        db =  await poolDb.getConnection();
        try{
            //create transaction 
            await db.beginTransaction()
           
            // * Get the TaxiRanks in the provinces
            let taxiRanksQuery;
            let queryObjects = [];
            if(sourceProv === destinationProv){
                //one province query
                taxiRanksQuery = "SELECT ID , name FROM TaxiRank WHERE province = ?";
                queryObjects = [sourceProv];
            }else{
                //two provinces query
                taxiRanksQuery = "SELECT ID , name  FROM TaxiRank WHERE province = ? OR province = ?";
                queryObjects = [sourceProv , destinationProv];

            }
            const [getTaxiRanks] = await db.query(taxiRanksQuery , queryObjects);

            if(!getTaxiRanks || getTaxiRanks.length === 0){
                return {status:404 , message:"Could not find taxiRanks in the provided provinces"  , result:null};
            }

              // * get the appropriate routes
              const taxiIDs = getTaxiRanks.map((taxiR)=>{
                return taxiR.ID;
              });
              const placeholders = taxiIDs.map(() => "?").join(","); 

              const [getRoutes] = await db.query(`SELECT ID , name , TaxiRankStart_ID , TaxiRankDest_ID , price  FROM Routes WHERE   TaxiRankDest_ID IN (${placeholders})  OR TaxiRankStart_ID IN (${placeholders})` , [taxiIDs]);


              const routeIDs = getTaxiRanks.map((route)=>{
                return route.ID;
              });
              const placeholders_miniroutes = routeIDs.map(() => "?").join(","); 
              const [getMiniCoordinates]  = await db.query(`SELECT * FROM MiniRoute WHERE Route_ID IN(${placeholders_miniroutes})` , [routeIDs]);


            //commit transaction
            await db.commit();

            return {status:200 , message:"Successful"  , result:{routes: getRoutes , miniRoutes:getMiniCoordinates}};
        }catch(error){
            //cancel the transctions
            await db.rollback();
            return {status:500 , message:"Server Error during transcation"  , result:null};
        }finally{
            await db.release();
        }

    }catch(error){
        console.log(error);
        return {status:500 , message:"Server Error"  , result:null}
    }

    
}

function formatRoutes(routes , miniCoords){

    //cheking if the parameters are valid 
    if(!routes || !miniCoords ){
        console.log('there is a missin  parameters [formatRoutes(..)]');
        return null;
    }

    //checking the lengths
    if(routes.length <= 0 || miniCoords.length <= 0){
        console.log('there is a parameter with a length of equal or less than zero [formatRoutes(..)]');
        return null;
    }

    // * formatting process
    let array = [];
    routes.forEach((route)=>{

        const id = route.ID;
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
       array.push( {id:id , coordinates:coordsAr});
    });

    return array;
}

// Insert in a graph
function insertInGraph(listRoutes){
    const graph =  new Graph();

    listRoutes.forEach(route => {
        const price = route.price;
        const sourceID = route.TaxiRankStart_ID;
        const destId = route.TaxiRankDest_ID;
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
async function getTheNearestTaxiRamks(){

}


//converting coordintates
const convertToGeoFormat = (coordinates) => {
    return coordinates.map(coord => ({
        latitude: coord[0],
        longitude: coord[1]
    }));
};




