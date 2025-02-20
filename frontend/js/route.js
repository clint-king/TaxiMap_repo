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
const gridRowsEl = document.querySelectorAll(".grid-row ");

//Value for slider
const slider = document.getElementById("priceRange");
const selectedPrice = document.getElementById("selectedPrice");

//Imcreating a temporary list of suggestions
let taxiRanks = []; // Store fetched taxi ranks

// === MAP IMPLEMENTATION ===

 mapboxgl.accessToken = 'pk.eyJ1IjoiY2xpZXRpbiIsImEiOiJjbTR6eW1icmMxN3dyMmpzODBsZDQwNHN6In0.m5MSK2_0_SFpPPhB5BX86w'; // Replace with your Mapbox access token

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
       
       
    function createTaxiElement() {
        const el = document.createElement('div');
        el.style.width = '20px';
        el.style.height = '20px';
        el.style.backgroundColor = 'red';
        el.style.backgroundSize = 'cover';
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
    }
    
    function loadMiniRoutes(miniroutes) {

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
            map.addLayer({
                id: routeLayerId,
                type: 'line',
                source: routeSourceId,
                layout: {
                    'line-cap': 'round',
                    'line-join': 'round'
                },
                paint: {
                    'line-color': 'blue',
                    'line-width': 4,
                }
            });

            arrCoords.push(route.coords);
    
        });

        if(arrCoords){
            const finalCoords = arrCoords.flat();
            zoomRoute(finalCoords);
        }
    }

    function movement(coordinates){
                //Animation implementation

                if(!coordinates){
                    console.log("Coordinates are empty or null [In :movement function]");
                    return;
                }
            const movementCoordinates = smoothenCoordinates(coordinates);
                // Add a moving taxi marker
        const taxiMarker = new mapboxgl.Marker({ element: createTaxiElement() })
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

                console.log("Result : ", result.directions_Arr);
                loadMiniRoutes(result.miniRoutes_Arr);

                //Movement
                movement(result.directions_Arr[0].direction_coords);
                
            } catch (error) {
                console.error("Error fetching routes:", error);
            }
        }
    });
});


// === EVENT LISTENERS ====

//add route button click
addRouteButton.addEventListener('click' , async ()=>{
    contextMenu.style.visibility = "visible";
    const response = await axios.get('http://localhost:3000/admin/getUniqueRouteName');

    routeNameEl.textContent = response.data.name;
})

//close contextMenu
closeButton.addEventListener("click" , (e)=>{
    contextMenu.style.visibility = "hidden";
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

    const response = await axios.post('http://localhost:3000/admin/AddRoute', {
        data:dataCaptured
    });
});



//=== FUNCTIONS ===
const routeList =  async()=>{
    try{

        //Send TaxiRankId
        const rank = getQueryParam('rank');

        const response = await axios.post("http://localhost:3000/admin/listRoutes" , {taxiRankSelected_ID:rank});
        const respondeData = response.data;
        
        //Populate
        respondeData.forEach((route)=>{
            if(createGridRow(route.name,route.price , route.type , route.numOfDirections) != null);
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

// function createGridRow(routeID , type , coords) {
//     // Create the main grid-row div
//     const gridRow = document.createElement("div");
//     gridRow.className = "grid-row";
    
    
//     //RouteID cell
//         const gridCell = document.createElement("div");
//         gridCell.className = "grid-cell";
//         gridCell.textContent = routeID;
//         gridRow.appendChild(gridCell);

//         //type cell
//         const gridCell2 = document.createElement("div");
//         gridCell2.className = "grid-cell";
//         gridCell2.textContent = type;
//         gridRow.appendChild(gridCell2);
    
    
//     // Create the fourth grid-cell with nested elements
//     const fourthCell = document.createElement("div");
//     fourthCell.className = "grid-cell fourth";
    
//     const coordSpan = document.createElement("div");
//     coordSpan.id = "coord-span";
//     coordSpan.textContent = coords;
    
//     const buttonSpan = document.createElement("span");
//     buttonSpan.id = "button-span";
    
//     const button = document.createElement("button");
//     button.className = "button route";
//     button.textContent = "Edit";
    
//     // Append button to buttonSpan, then append both spans to fourthCell
//     buttonSpan.appendChild(button);
//     fourthCell.appendChild(coordSpan);
//     fourthCell.appendChild(buttonSpan);
    
//     // Append fourth cell to the grid-row
//     gridRow.appendChild(fourthCell);
    
//     // Append the whole structure to the body or another container
//     gridTable.appendChild(gridRow); // Change this to your desired container
// }

// Fetch taxi ranks from backend once

function createGridRow(name, price, type, directions) {
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
    
    const delButton = document.createElement("button");
    delButton.classList.add("btn", "del");
    delButton.textContent = "Del";
    
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

async function saveRouteInformation(){
   const coordinates =  coordinatesTextArea.value;
   const price = parseFloat(selectedPrice.textContent);
   const destinationName = destinationInput.value;
   const name = routeNameEl.textContent;
   const startRankId = getQueryParam('rank');  
   //Get the list of all TaxiRanks
   const response = await axios.get('http://localhost:3000/admin/listTaxiRanks');
   const dataReceived = response.data;

   const taxiRank = dataReceived.find((tRank)=>{
    return destinationName === tRank.name});

   //check if the TaxiRankName Exists
   if(!taxiRank){
    return {status:404 , value:"No matching taxiRank was found"};
   }

   return {status:200 ,
    value:{
    name:name,
    price:price,
    coords:coordinates,
    routeType:getValue(),
    TRStart_ID:startRankId,
    TRDest_ID: taxiRank.ID }
   }
}

function getValue() {
    // Get selected radio button
    let selectedDrink = document.querySelector('input[name="type"]:checked');
    let drinkValue = selectedDrink ? selectedDrink.value : null;

    return drinkValue;
}