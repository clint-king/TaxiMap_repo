import  axios  from 'axios';
import * as turf from '@turf/turf';


// === DOM ELEMENTS ===
const addRouteButton  = document.querySelector(".button.add");
const contextMenu = document.querySelector(".menu_wrapper");
const closeButton = document.querySelector("#close_button");
const coordinatesTextArea = document.querySelector(".input_line.coord textarea");
const routeNameEl = document.querySelector("#routeName");
const suggestionList = document.querySelector("#suggestions");
const destinationInput = document.querySelector(".routeInput.dest_input");
const updateButton = document.querySelector("#update_button");
const gridTable = document.querySelector(".grid-table");
const directionContainer = document.querySelector(".direction_container");
const toogleButton  = document.querySelector(".toggle-container");
const AddMiniCoordsBtn = document.querySelector(".coordinate_subContainer.miniCoords button") ;
const AddDirectionBtn = document.querySelector(".coordinate_subContainer.directionCoords button");
const coordsInput = document.querySelector(".coords_container");
const coordsInput_cancelBtn = document.querySelector("#coordsCancelBtn");
const coordsInput_saveBtn = document.querySelector("#coordsSaveBtn");
const coordsInput_textArea = document.querySelector(".coords_container textarea");
const numMiniCoords = document.querySelector("#miniCoords_num");
const numDireCoords = document.querySelector("#direCoords_num");
const taxiRankBigName = document.querySelector("#taxiRankName_label");
const fromTaxiRankCircleLabel = document.querySelector("#fromContainerLabel");
const toTaxiRankCirccleLabel = document.querySelector("#toContainerLabel");
const routeChosenLabel = document.querySelector("#routeChosenLabel");
const deleteButtton = document.querySelector(".btn.del")

const sliderContainer = document.querySelector(".price-slider-container");
const checkBoxContainer = document.querySelector(".checkboxConatiner");
const coordinateContainer = document.querySelector(".coordinate_container");


const directionButtonColors = ["#CEE6C2" , "#C3C5F7" , "#ECB8B8" , "#ECBDF1" , "#F1E8BD" , "#BDE7F1" , "#BDF1DE"];
let directionsInfoStorage = [];
let coordsInserted = new Map([
    ['miniroutes', []],
    ['directions', []]
  ]);
let choosenCoords;
let isWalkChoosen = false;

//Value for slider
const slider = document.getElementById("priceRange");
const selectedPrice = document.getElementById("selectedPrice");

//Imcreating a temporary list of suggestions
let taxiRanks = []; // Store fetched taxi ranks

// === MAP IMPLEMENTATION ===

const accessToken = 'pk.eyJ1IjoiY2xpZXRpbiIsImEiOiJjbTR6eW1icmMxN3dyMmpzODBsZDQwNHN6In0.m5MSK2_0_SFpPPhB5BX86w'; 
 mapboxgl.accessToken = accessToken;

// // Initialize the map
const map = new mapboxgl.Map({
  container: 'map', // container ID
  style: 'mapbox://styles/mapbox/streets-v11', // style URL
  center: [30.0, -25.0], // Default center [lng, lat] (South Africa)
  zoom: 12, // Default zoom
});

map.on('load', () => {

    // function loadRoute(routeChosen) { 
    //         // Convert mini-routes to GeoJSON
    //         const routeFeatures = {
    //             type: 'Feature',
    //             properties: {},
    //             geometry: {
    //                 type: 'LineString',
    //                 coordinates: routeChosen.coords
    //             }
    //         };

    //         map.addSource(`route-source`, { 
    //             type: 'geojson',
    //             data: {
    //                 type: 'FeatureCollection',
    //                 features: [routeFeatures] 
    //             }
    //         });

    //         // Add layer for lines (mini-routes)
    //         map.addLayer({
    //             id: `route-line`,
    //             type: 'line',
    //             source: `route-source`,
    //             layout: {'line-cap': 'round',
    //             'line-join': 'round'},
    //             paint: {
    //                 'line-color': `blue`,
    //                 'line-width': 4,
    //             }
    //         });


    //         //Animation implementation

    //         const movementCoordinates = smoothenCoordinates(routeChosen.direction_coords);
    //             // Add a moving taxi marker
    //     const taxiMarker = new mapboxgl.Marker({ element: createTaxiElement() })
    //     .setLngLat(movementCoordinates[0]) // Start at first point
    //     .addTo(map);

    // // Animate the taxi along the route
    // let index = 0;
    // function moveTaxi() {
    //     if (index <movementCoordinates.length - 1) {
    //         index++;
    //         taxiMarker.setLngLat(movementCoordinates[index]);
    //         setTimeout(moveTaxi, 1000); // Adjust speed (1000ms = 1 sec per step)
    //     }
    // }

    // moveTaxi(); // Start animation
    // }

       // Create a taxi element for better styling
       
       
  
    // Add click event to each row
    
    
    document.querySelector('.grid-table').addEventListener('click', async (e) => {
        const row = e.target.closest('.grid-row'); 
        if (row) {
            const routeIDName = row.children[0].textContent;

            try {
                const response = await axios.post('http://localhost:3000/admin/getRoute', {
                    uniqueRouteName: routeIDName
                });

                const result = response.data;
                
           
                // Remove existing routes before adding new ones
                 removeExistingRoutes();

                
                loadMiniRoutes(result.miniRoutes_Arr , result.route.travelMethod);

                //LoadDirections
                loadDirections(result.directions_Arr);

                //Load information
                const taxiRankfrom  = await getTaxiRankName(result.route.TaxiRankStart_ID);
                const taxiRankTo = await getTaxiRankName(result.route.TaxiRankDest_ID);

                 showRouteInformation(taxiRankfrom ,taxiRankTo , result.route.name);
                // Choose first direction for Movement
                //movement(result.directions_Arr[0].direction_coords);
                
            } catch (error) {
                console.error("Error fetching routes:", error);
            }
        }
    });
});


// === EVENT LISTENERS ====
// listen for direction click
directionContainer.addEventListener('click' , (e)=>{
    const dirBtnEl  = e.target.closest(".direction_button");
    if(!directionsInfoStorage){
        console.log("Could not find any  directions stored");
        return;
    }
    const directionButtonInfo = directionsInfoStorage[dirBtnEl.id];
    if(directionButtonInfo.direction_coords){
        movement(directionButtonInfo.direction_coords , dirBtnEl.style.backgroundColor);
    }
})
//add route button click
addRouteButton.addEventListener('click' , async ()=>{
    contextMenu.style.visibility = "visible";
    const response = await axios.get('http://localhost:3000/admin/getUniqueRouteName');

    routeNameEl.textContent = response.data.name;
})

//close contextMenu
closeButton.addEventListener("click" , (e)=>{
    coordsInput.style.visibility = 'hidden';
    contextMenu.style.visibility = "hidden";

    //remove information from context menu to default
    numDireCoords.textContent = 0;
    numMiniCoords.textContent = 0;
    destinationInput.value = "";
    slider.value = 0;
    selectedPrice.textContent = 0;
    removeCheck();

  });

//slider 
slider.addEventListener("input", function() {
    selectedPrice.textContent = slider.value;
}); 


// ** slider **
// Fetch taxi ranks when page loads
document.addEventListener("DOMContentLoaded", fetchTaxiRanks);

// Trigger suggestions when user types
destinationInput.addEventListener("input", () => {
    showSuggestions(destinationInput.value);
});

// Hide suggestions when clicking outside
document.addEventListener("click", (event) => {
    if (!destinationInput.contains(event.target) && !suggestionList.contains(event.target)) {
        suggestionList.style.display = 'none';
    }
});

//update button
updateButton.addEventListener('click' , async()=>{
    const dataCaptured = (await saveRouteInformation()).value;

    console.log("Data to be sent : "+ JSON.stringify(dataCaptured));
    const response = await axios.post('http://localhost:3000/admin/AddRoute', {
        data:dataCaptured
    });

    console.log("Response from Update button: "+ response);
});

toogleButton.addEventListener('click' , async()=>{
    toggleButton();
});


AddMiniCoordsBtn.addEventListener('click' , async()=>{
    if(coordsInput.style.visibility == "visible"){
        coordsInput.style.visibility = 'hidden';
        coordsInput.style.visibility = 'visible';
    }else{
        coordsInput.style.visibility = 'visible';
    }
    choosenCoords = "miniroutes";
});

AddDirectionBtn.addEventListener('click' , async()=>{
    if(coordsInput.style.visibility == "visible"){
        coordsInput.style.visibility = 'hidden';
        coordsInput.style.visibility = 'visible';
    }else{
        coordsInput.style.visibility = 'visible';
    }

    choosenCoords = "directions";
});

coordsInput_cancelBtn.addEventListener('click' , async()=>{
    coordsInput.style.visibility = 'hidden';
});

coordsInput_saveBtn.addEventListener('click' , async()=>{
    const regex = /^\[\s*\[\s*(-?\d+(\.\d+)?)\s*,\s*(-?\d+(\.\d+)?)\s*\](\s*,\s*\[\s*-?\d+(\.\d+)?\s*,\s*-?\d+(\.\d+)?\s*\]\s*)*\]$/;   
     const extractedText = coordsInput_textArea.value.trim();

    if(choosenCoords == "miniroutes"){
        //Check format
        if(regex.test(extractedText)){
            coordsInserted.get('miniroutes').push(extractedText);
            coordsInput.style.visibility = 'hidden';
            coordsInput_textArea.value = "";
            console.log("Routes : "+ extractedText);
            updateCoordsNumber("mini");
            alert("Successfully Inserted");
           
        }else{
            alert("Failed to insert Information");
        }
    }else if(choosenCoords == "directions"){ 
  //Check format
  if(regex.test(extractedText)){
    coordsInserted.get('directions').push(extractedText);
    coordsInput.style.visibility = 'hidden';
    coordsInput_textArea.value = "";
    updateCoordsNumber("Dire");
    alert("Successfully Inserted"); 
    }else{
        alert("Failed to insert Information");
    }
    }

    console.log(coordsInserted);
});

//Handling Add route button clicks
document.body.addEventListener("click", async function (event) {
    if (event.target.classList.contains("del")) {
      const rankID = event.target.dataset.rank;
    
      console.log("deleteing ID : " , rankID);
      //call delete function
      const response = await axios.post('http://localhost:3000/admin/deleteRoute', {
        routeID: rankID
    });

    if(response.status === 200){
        removeDirections();
        removeExistingRoutes();
        removeRouteInformation();
        removeroutes();
        routeList();
        console.log("Successfully deleted! ✅");
    }else{
        console.log(response);
    }

    }
  });

//=== FUNCTIONS ===

// ** Map functions
function movement(coordinates , color){
    //Animation implementation

    if(!coordinates){
        console.log("Coordinates are empty or null [In :movement function]");
        return;
    }
const movementCoordinates = smoothenCoordinates(coordinates);
    // Add a moving taxi marker
const taxiMarker = new mapboxgl.Marker({ element: createTaxiElement(color) })
.setLngLat(movementCoordinates[0]) // Start at first point
.addTo(map);

// Animate the taxi along the route
let index = 0;
function moveTaxi() {
if (index <movementCoordinates.length - 1) {
if(index === movementCoordinates.length - 2){
    index = 0
}else{
    index++;
}
taxiMarker.setLngLat(movementCoordinates[index]);
setTimeout(moveTaxi, 250); // Adjust speed (1000ms = 1 sec per step)
}
}

moveTaxi(); // Start animation
}

function updateCoordsNumber(choose){

    if(choose === "mini"){
        let num = parseInt(numMiniCoords.textContent, 10); 
        num++;
        numMiniCoords.textContent = num;
    }else{

        let num = parseInt(numDireCoords.textContent , 10);
        num++;
        numDireCoords.textContent = num;
    }
}

function createTaxiElement(color) {
    const el = document.createElement('div');
    el.classList.add("movingDirectionCircle");
    el.style.width = '20px';
    el.style.height = '20px';
    el.style.backgroundColor = color;
    el.style.backgroundSize = 'cover';
    el.style.border = '2px solid red';
    el.style.borderRadius = '50%'; // Optional: make it round
    return el;
}

function removeExistingRoutes() {
    if (!map.getStyle() || !map.getStyle().layers) return;

    // Get all layers and sources in the map
    const layers = map.getStyle().layers.map(layer => layer.id);

    layers.forEach(layerId => {
        if (layerId.startsWith('route-line-')) {
            map.removeLayer(layerId);
        }
    });

    // Get all sources and remove those related to routes
    Object.keys(map.getStyle().sources).forEach(sourceId => {
        if (sourceId.startsWith('route-source-')) {
            map.removeSource(sourceId);
        }
    });

    //Remove the directions of the previous route
    removeDirections();

    //remove 
}

function loadMiniRoutes(miniroutes , travelMethod) {

    let arrCoords = [];
    miniroutes.forEach((route, index) => {
        const routeSourceId = `route-source-${index}`;
        const routeLayerId = `route-line-${index}`;

        // Convert each mini-route to GeoJSON
        const routeFeatures = {
            type: 'Feature',
            properties: {},
            geometry: {
                type: 'LineString',
                coordinates: route.coords
            }
        };

        // Add a new source for each route
        map.addSource(routeSourceId, { 
            type: 'geojson',
            data: {
                type: 'FeatureCollection',
                features: [routeFeatures] 
            }
        });

        // Add a new layer for each route

        let paintOption ;
        if(travelMethod === 'Walk'){
            paintOption =  {
                    'line-color': '#FF0000', // Line color
                    'line-width': 4,         // Line thickness
                    'line-dasharray': [0, 2] // [dash length, gap length] in units of line-width
                };
        }else{
            paintOption = {
                'line-color': 'blue',
                'line-width': 4,
            }
        }

        map.addLayer({
            id: routeLayerId,
            type: 'line',
            source: routeSourceId,
            layout: {
                'line-cap': 'round',
                'line-join': 'round'
            },
            paint: paintOption
        });

        arrCoords.push(route.coords);

    });

    if(arrCoords){
        const finalCoords = arrCoords.flat();
        zoomRoute(finalCoords);
    }
}

function smoothenCoordinates(coordinates){
    // Convert to a Turf.js LineString
const line = turf.lineString(coordinates);

// Calculate the total length of the route in kilometers
const lineLength = turf.length(line, { units: 'kilometers' });

// Define the number of points you want to generate
const numberOfPoints = 100; // More points = smoother animation

// Calculate interval distance
const interval = lineLength / numberOfPoints;

// Generate evenly spaced points along the route
const smoothCoordinates = [];
for (let i = 0; i <= lineLength; i += interval) {
const interpolatedPoint = turf.along(line, i, { units: 'kilometers' });
smoothCoordinates.push(interpolatedPoint.geometry.coordinates);
}

return smoothCoordinates;
}

function zoomRoute(coordinates){
    // Get the bounds of the route
const bounds = coordinates.reduce((bounds, coord) => {
    return bounds.extend(coord);
}, new mapboxgl.LngLatBounds(coordinates[0], coordinates[0]));

// Fit the map to the bounds
map.fitBounds(bounds, {
    padding: 50, // Add some padding around the route
    maxZoom: 15, // Set a max zoom level to avoid excessive zoom-in
    duration: 2000 // Smooth animation duration in milliseconds
});
}
function removeroutes(){
    document.querySelectorAll(".grid-row").forEach(route => route.remove());
}
function removeDirections(){
    document.querySelectorAll(".direction_button").forEach(button => button.remove());
    directionsInfoStorage = [];

    //delete the Moving circle
    deleteMovingCircle();
}


// **Other functions
const routeList =  async()=>{
    try{

        //Send TaxiRankId
        const rank = getQueryParam('rank');

        const response = await axios.post("http://localhost:3000/admin/listRoutes" , {taxiRankSelected_ID:rank});
        const respondeData = response.data;
        
        //Populate
        let type = "";
        respondeData.forEach((route)=>{
            type =  `${route.type} & ${route.travelMethod}`;
            if(createGridRow(route.id , route.name,route.price , type, route.numOfDirections) != null);
        })

    }catch(error){
        console.log("server error : "+ error);
    }
}
routeList();

//Getting TaxiRank Information
const fetchRoutes = async () => {
    try {
        
          const rank_ID = getQueryParam('rank');  
          const response = await axios.post('http://localhost:3000/admin/getTaxiRank', {
            rankID: rank_ID // Send ID in the body of the request
        });


        console.log("Data retrived " + JSON.stringify(response.data, null, 2));
    } catch (error) {
        console.error("Error fetching data:", error);
    }
};
fetchRoutes(); 

// Function to get the query parameter from the URL
function getQueryParam(param) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(param);  // Return the value of the query parameter
}

async function getWalkCoordinates(startCoordsLat , startCoordsLong , destCoordsLat , destCoordsLong){
    const url = `https://api.mapbox.com/directions/v5/mapbox/walking/${startCoordsLong},${startCoordsLat};${destCoordsLong},${destCoordsLat}?geometries=geojson&access_token=${accessToken}`;

try{
    const response = await axios.get(url);

     // Check if the response contains the expected data
     if (!response.data.routes || response.data.routes.length === 0) {
        console.error("Error: No routes found in API response", response.data);
        return null; // Return null or handle the case accordingly
      }
  
      let array =[];
    const route = response.data.routes[0].geometry.coordinates;
    array.push(JSON.stringify(route));
    console.log("Route:", array);
    return array;
}catch(error){
    console.error("Error fetching route:", error);
    return null;
}

}
//toggle functionality
function toggleButton() {
    const toggle = document.getElementById("toggle");
    toggle.classList.toggle("active");

    // If you want to change labels dynamically, you can do this:
    const taxiLabel = document.querySelector(".taxi-label");
    const walkLabel = document.querySelector(".walk-label");

    if (toggle.classList.contains("active")) {
        taxiLabel.style.opacity = "0.5"; // Dim Taxi label
        walkLabel.style.opacity = "1";   // Highlight Walk label
        toogleSelection(true);
        isWalkChoosen = true;

        //Delete Information from the contextMenu extracted from Taxi Option : 
        numDireCoords.textContent = 0;
        numMiniCoords.textContent = 0;
        destinationInput.value = "";
        slider.value = 0;
        selectedPrice.textContent = 0;
        removeCheck();

    } else {
        taxiLabel.style.opacity = "1";   // Highlight Taxi label
        walkLabel.style.opacity = "0.5"; // Dim Walk label
        toogleSelection(false);
        isWalkChoosen = false;

        //Delete Information from the contextMenu extracted from Walk Option : 
        destinationInput.value = "";
    }
}

function showRouteInformation(taxiRankFrom , taxiRankTo , routeName){

    //set the big taxiRankName
    console.log("TaxiFrom : ", taxiRankFrom ,"TaxiTo : ", taxiRankTo , "routeName : " , routeName);
    taxiRankBigName.textContent = taxiRankFrom;

    //set the route
    routeChosenLabel.textContent = routeName;
    //set the circle labels
    fromTaxiRankCircleLabel.textContent =taxiRankFrom;
    toTaxiRankCirccleLabel.textContent = taxiRankTo;
}

function removeRouteInformation(){
    taxiRankBigName.textContent = "";

    //set the route
    routeChosenLabel.textContent = "";
    //set the circle labels
    fromTaxiRankCircleLabel.textContent ="";
    toTaxiRankCirccleLabel.textContent = "";
}



async function getTaxiRankName(ID){
    try {
        console.log("ID sent : " , ID);
        const response = await axios.post('http://localhost:3000/admin/getTaxiRank', {
            rankID: ID
        });

        if(!response){
            return null;
        }
        return response.data.name;
    } catch (error) {
        console.error('Error fetching taxi ranks:', error);
    }
}

function toogleSelection(isWalk){
    if(isWalk == true){
            //add walk as a class
            contextMenu.classList.add("walk");
            checkBoxContainer.classList.add("walk");
            sliderContainer.classList.add("walk");
            coordinateContainer.classList.add("walk");
            console.log("Walk is on");

    }else{
       
            //remove walk as a class if its already applied
                contextMenu.classList.remove("walk");
                checkBoxContainer.classList.remove("walk");
                sliderContainer.classList.remove("walk");
                coordinateContainer.classList.remove("walk");
                console.log("Walk is off");
            
    }
}

function loadDirections(list){
 
     directionsInfoStorage = [...list];
    let name;
    for(let i = 0 ; i < list.length ; i++){
         name = "D"+(i+1);
        createDirectionButton(name  , i);
    }
}


function createDirectionButton(labelName , generatedID){
    const randNum = Math.floor(Math.random() * directionButtonColors.length);
    const button = document.createElement("button");
    button.classList.add("direction_button");
    button.textContent = labelName;
    button.id = generatedID;
    button.style.backgroundColor = directionButtonColors[randNum];
    directionContainer.append(button);
}


//removing the moving circle (The function is implemented insied removeDirections function)
function deleteMovingCircle(){
    const circle = document.querySelectorAll(".movingDirectionCircle");

    if(circle.length === 0){
        return;
    }

    circle.forEach(c => c.remove());
}

function createGridRow(ID,name, price, type, directions) {
    const row = document.createElement("div");
    row.classList.add("grid-row");
    
    // Helper function to create a grid cell
    function createCell(content) {
        const cell = document.createElement("div");
        cell.classList.add("grid-cell");
        cell.textContent = content;
        return cell;
    }
    
    row.appendChild(createCell(name));
    row.appendChild(createCell(price));
    row.appendChild(createCell(type));
    row.appendChild(createCell(directions));
    
    // Create the fifth cell with buttons
    const buttonCell = document.createElement("div");
    buttonCell.classList.add("grid-cell");
    
    const routeButtonDiv = document.createElement("div");
    routeButtonDiv.id = "route_button";
    
    const editButton = document.createElement("button");
    editButton.classList.add("btn", "edit");
    editButton.textContent = "Edit";
    editButton.dataset.rank = ID;
    
    const delButton = document.createElement("button");
    delButton.classList.add("btn", "del");
    delButton.textContent = "Del";
    delButton.dataset.rank = ID;
    
    routeButtonDiv.appendChild(editButton);
    routeButtonDiv.appendChild(delButton);
    buttonCell.appendChild(routeButtonDiv);
    
    row.appendChild(buttonCell);
    gridTable.appendChild(row);
}

async function fetchTaxiRanks() {
    try {
        const response = await axios.get('http://localhost:3000/admin/listTaxiRanks');
        taxiRanks = response.data; // Store data globally
    } catch (error) {
        console.error('Error fetching taxi ranks:', error);
    }
}

// Show filtered suggestions
function showSuggestions(query) {
    suggestionList.innerHTML = ''; // Clear previous suggestions
    if (!query) {
        suggestionList.style.display = 'none';
        return;
    }

    const filteredRanks = taxiRanks.filter(rank =>
        rank.name.toLowerCase().includes(query.toLowerCase())
    );

    if (filteredRanks.length === 0) {
        suggestionList.style.display = 'none';
        return;
    }

    filteredRanks.forEach((taxiRank) => {
        const li = document.createElement('li');
        li.textContent = taxiRank.name;
        li.style.cursor = "pointer";
        li.addEventListener('click', () => {
            destinationInput.value = taxiRank.name;
            suggestionList.style.display = 'none';
        });
        suggestionList.appendChild(li);
    });

    // Position suggestions near input box
    const rect = destinationInput.getBoundingClientRect();
    suggestionList.style.left = `${rect.left}px`;
    suggestionList.style.top = `${rect.bottom}px`;
    suggestionList.style.display = 'block';
}

function getTravelMethod(){
    if(isWalkChoosen){
        return "Walk";
    }else{
        return "Taxi";
    }
}

async function saveRouteInformation(){
    const destinationName = destinationInput.value;
    const startRankId = getQueryParam('rank');

    console.log("startRankId : ", startRankId);
    //Get the list of all TaxiRanks
   const response = await axios.get('http://localhost:3000/admin/listTaxiRanks');
   const dataReceived = response.data;
   const taxiRankFrom = dataReceived.find((tRank)=>{return destinationName === tRank.name});
   const taxiRankTo = dataReceived.find((tBRank)=>{return parseInt(startRankId,10) === tBRank.ID});
   const price = parseFloat(selectedPrice.textContent);
   const name = routeNameEl.textContent;

   //check if the TaxiRankName Exists
   console.log("TaxiRank from : " ,taxiRankFrom , "TaxiRank To : " , taxiRankTo);

   if(!taxiRankFrom ||  !taxiRankTo){
    return {status:404 , value:"A matching taxiRank was not found"};
   }

    if(isWalkChoosen){
        //Walk option chosen

        const startCoords = taxiRankFrom.coord;
        const destinationCoords = taxiRankTo.coord;
        let walkCoordinates = await getWalkCoordinates(startCoords.latitude , startCoords.longitude , destinationCoords.latitude , destinationCoords.longitude);
      
        return {status:200 ,
            value:{
            name:name,
            price:0,
            routeType:'Straight',
            TRStart_ID:startRankId,
            TRDest_ID: taxiRankFrom.ID,
            travelMethod: getTravelMethod(),
            listOfMiniCoords: walkCoordinates,
            listOfDirCoords: walkCoordinates,
            numOfMiniRoutes:1,
            numOfDirectionRoutes:1
        }
           }

    }else{
        //Taxi Option chosen
        if(!coordsInserted.get('miniroutes')   || !coordsInserted.get('directions')){
            console.log("MiniRoutes or Directions is null");
        }


        return {status:200 ,
            value:{
            name:name,
            price:price,
            routeType:getValue(),
            TRStart_ID:startRankId,
            TRDest_ID: taxiRankFrom.ID,
            travelMethod: getTravelMethod(),
            listOfMiniCoords: coordsInserted.get('miniroutes') ,
            listOfDirCoords: coordsInserted.get('directions'),
            numOfMiniRoutes: coordsInserted.get('miniroutes').length,
            numOfDirectionRoutes: coordsInserted.get('directions').length
        }
           }
    }
}

function getValue() {
    // Get selected radio button
    let selectedStyle = document.querySelector('input[name="type"]:checked');
    let styleValue = selectedStyle ? selectedStyle.value : null;

    return styleValue;
}

function removeCheck() {
    let selectedStyle = document.querySelector('input[name="type"]:checked');
    if (selectedStyle) {
        selectedStyle.checked = false;
    }
}