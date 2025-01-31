import db from "../config/db.js";
import { v4 as uuidv4 } from 'uuid';

export const AddTaxiRank = async(req , res)=>{
    try{
        const { name, coord, province,address} = req.body; // Extract data from the request body
        console.log('Received data:', { name, coord, province,address });
        const query = "INSERT INTO TaxiRank(name,location_coord,province,address,num_routes) VALUES(?,?,?,?,?)";
        await db.execute(query , [name, coord, province,address,0]);

        return res.status(201).json({message:"Successfully added"});
    }catch(error){
        console.log(error);
        return res.status(500).json({message:"Server error"});
    }
}

export const listTaxiRanks = async(req,res)=>{
    try{
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
    }
}

export const getTaxiRank = async(req,res)=>{
    try{
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
    }
}

export const AddRoute = async(req,res)=>{
try{
    const {name , price , coords , TRStart_ID , TRDest_ID,routeType}  = req.body;

    if (!name || !price || !coords || !TRStart_ID || !TRDest_ID || !routeType) {
        return res.status(400).json({ message: "Missing required fields" });
    }
   
    const query = "INSERT INTO Routes(name,price,coords,TaxiRankStart_ID,TaxiRankDest_ID, route_type) VALUES(?,?,?,?,?,?)";
    const queryTaxiRank = "UPDATE TaxiRank SET num_routes = num_routes+? WHERE ID =?";

    const connection = await db.getConnection();
    try{
       
        await connection.beginTransaction();
        //Add to Route table
        const [result] = await connection.query(query , [name , price , coords ,TRStart_ID,TRDest_ID, routeType ]);

        //Add to Start TaxiRank
        await connection.query(queryTaxiRank , [1 , TRStart_ID]);

        //Add to Dest TaxiRank
        await connection.query(queryTaxiRank , [1 , TRDest_ID]);

        await connection.commit();

        res.status(201).json({ message: "Route added successfully", routeId: result.insertId });


    }catch(error){
        await connection.rollback(); // Rollback if any query fails
        console.error("Transaction Failed:", error.message);
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
    const query = `
    SELECT *
    FROM Routes
    WHERE TaxiRankStart_ID = ? OR TaxiRankDest_ID = ?;`;
    try{

        const {taxiRankSelected_ID} = req.body;

        if(taxiRankSelected_ID != null){
            const result =await db.query(query , [taxiRankSelected_ID,taxiRankSelected_ID ]);
        const array = [];
        if(result || result.length > 0){

            for(let i = 0 ; i < array.length ; i++){
                array[i].push({
                    id: result[i].ID,
                    name: result[i].name,
                    type:result[i].route_type,
                    coordinates: result[i].coords
                });
            }
        }else{
            return res.status(404).json({message:"No Route found"});
        }

        return res.status(200).send(array);
        }else{

            return res.status(404).json({message:"taxiRankSelected_ID is null"});
        }
        
    }catch(error){
        console.log(error);
        return res.status(500).send({message:"Server error"});
    }
}


export const routeSelected = async(req,res) =>{
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
    }
}

//get new uniqueID
export const getUniqueRouteName = async(req,res)=>{
    try{
        const nameRouteID  = await generateUniqueRouteID();
        console.log("RouteId : "+nameRouteID);
        return res.status(200).json({name: nameRouteID, message:"Successfully sent"});
    }catch(error){
        console.log(error);
        return res.status(500).send("Server Error");
    }
}


// == FUNCTION ==
async function generateUniqueRouteID() {
    let isUnique = false;
    let routeID;

    while (!isUnique) {
        routeID = uuidv4().replace(/-/g, '').slice(0, 7).toUpperCase(); // Generate a 7-char ID

        // Check if the ID already exists in the database
        const [rows] = await db.query("SELECT COUNT(*) as count FROM Routes WHERE name = ?", [routeID]);

        if (rows[0].count === 0) {
            isUnique = true; // If no match, it's unique
        }
    }

    console.log("Returning unique routeID: ", routeID);
    return routeID;
}
