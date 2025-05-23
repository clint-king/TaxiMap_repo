import  axios  from 'axios';
let currentMarker = null; 


mapboxgl.accessToken = 'pk.eyJ1IjoiY2xpZXRpbiIsImEiOiJjbTR6eW1icmMxN3dyMmpzODBsZDQwNHN6In0.m5MSK2_0_SFpPPhB5BX86w'; // Replace with your Mapbox access token

// Initialize the map
const map = new mapboxgl.Map({
  container: 'map', // container ID
  style: 'mapbox://styles/mapbox/streets-v11', // style URL
  center: [30.0, -25.0], // Default center [lng, lat] (South Africa)
  zoom: 12, // Default zoom
});

//bound fit South Africa
map.fitBounds([
[18.13518613880771,-34.966345196944445],
[33.105929612928605, -22.069255932789716]
]);

//stores marker objects
let allMarkerObjects = [];

//store the iD OF THE ROW THAT REQUETED DELETE
let delRankID = -1;

//Get coordinates of the Adresss
async function getCoordinates(address) {
  const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(address)}.json?access_token=${mapboxgl.accessToken}`;
  
  try {
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.features && data.features.length > 0) {
      const [longitude, latitude] = data.features[0].center;
      console.log(`Coordinates: Longitude - ${longitude}, Latitude - ${latitude}`);
      return { longitude, latitude };
    } else {
      console.error('No results found for the address.');
    }
  } catch (error) {
    console.error('Error fetching data:', error);
  }
}


// // Initialize Directions API control
// const directions = new MapboxDirections({
//   accessToken: mapboxgl.accessToken,
//   unit: 'metric', // Use 'imperial' for miles
//   profile: 'mapbox/driving', // Driving directions
//   controls: {
//     inputs: false,  // Disable the input fields for origin and destination
//     instructions: true, // Enable instructions to guide the user
//   },
// });

// // Add Directions Control to the map
// map.addControl(directions, 'top-left');

// Function to get user's current location and calculate route
// function getCurrentLocation() {
//   if (navigator.geolocation) {
//     navigator.geolocation.getCurrentPosition(
//       (position) => {
//         const { latitude, longitude } = position.coords;
//         map.setCenter([longitude, latitude]);

//         // Set the origin to the user's current location
//         directions.setOrigin([longitude, latitude]);

//         // Define destination (you can change this dynamically)
//         const destination = [30.6, -25.5]; // Replace with real destination

//         // Define some waypoints for multi-leg route (example waypoints where the person changes taxis)
//         const waypoints = [
//           [30.2, -25.2], // First taxi stop
//           [30.4, -25.4]  // Second taxi stop
//         ];

//         // Set the destination and waypoints
//         directions.setDestination(destination);
//         directions.setWaypoints([directions.getOrigin(), ...waypoints, directions.getDestination()]);

//         // Watch for changes and update the route dynamically
//         directions.on('route', function(e) {
//           // Optionally, you can customize the behavior when the route is updated
//           console.log('Route updated:', e.route);
//         });
//       },
//       (error) => {
//         console.error('Error getting current location:', error);
//         alert('Unable to get your current location.');
//       },
//       { enableHighAccuracy: true }
//     );
//   } else {
//     alert('Geolocation is not supported by your browser.');
//   }
// }

// Get user's current location when the page loads
//getCurrentLocation();

//UI

// Select the button and menu
const AddButton = document.querySelector(".button.add");
const menu = document.querySelector(".menu_wrapper");
const closeButton = document.querySelector("#close_button");
const updateButton = document.querySelector('#update_button');
const searchBox = document.querySelector('.input_line.address textarea');
const suggestions = document.getElementById('suggestions');
const provinceBox = document.querySelector(".input_line.prov input");
const nameBox =  document.querySelector(".input_line.name input");
const uiContainer = document.querySelector("#ui_container");
const deleteMenu = document.querySelector(".menu.deleting");
const executeDeleteBtn = document.querySelector(".btn.deleting");
const editMenu = document.querySelector(".menu.editing");
const deleteCloseButton = document.querySelector("#del_close_button");
const editCloseButton = document.querySelector("#editing_close_button");



//Grid elements
const gridTableDiv = document.querySelector(".grid-table");
const gridRowContainer = document.querySelector(".grid-row-container");

const taxiRankAddInfo = {
  name: '',
  coord: {longitude:'' , latitude:''},
  province: '',
  address: ''
};

let mapIdCount = 0;


// **** Mapbox capabilities  *****
// Fetch suggestions from the Mapbox Geocoding API

async function fetchSuggestions(query) {
  if (!query) {
    suggestions.innerHTML = ''; // Clear suggestions if input is empty
    return;
  }

  const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${mapboxgl.accessToken}&autocomplete=true&limit=5`;
  try {
    const response = await fetch(url);
    const data = await response.json();

    // Populate the dropdown with suggestions
    suggestions.innerHTML = '';
    if (data.features.length > 0) {
      data.features.forEach((feature) => {
        const li = document.createElement('li');
        li.textContent = feature.place_name;
        li.style.padding = '10px';
        li.style.cursor = 'pointer';

        // On click, set the map view to the selected location
        li.addEventListener('click', () => {
          const [longitude, latitude] = feature.center;

          console.log('Selected coordinates:', longitude, latitude );
      

          taxiRankAddInfo.coord.longitude = longitude;
          taxiRankAddInfo.coord.latitude = latitude;

           // Remove the old marker if it exists
       if (currentMarker) {
        currentMarker.remove();
        console.log("marker is removed");
      }
          // Add marker and center the map
         currentMarker =  new mapboxgl.Marker()
            .setLngLat([longitude, latitude])
            .addTo(map);

          map.flyTo({ center: [longitude, latitude], zoom: 12 });

          // Clear suggestions and update input value
          searchBox.value = feature.place_name;
          taxiRankAddInfo.address =  feature.place_name;
          suggestions.innerHTML = '';
        });

        suggestions.appendChild(li);
      });
    }
  } catch (error) {
    console.error('Error fetching suggestions:', error);
  }
}

map.on('load', () => {
// Add a click event listener to the map
map.on('click', async (e) => {
  const { lng, lat } = e.lngLat; // Extract longitude and latitude
  console.log(`Coordinates clicked: Longitude - ${lng}, Latitude - ${lat}`);

  // Fetch the address using reverse geocoding
  const reverseGeocodeUrl = `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${mapboxgl.accessToken}`;
  
  try {
    const response = await fetch(reverseGeocodeUrl);
    const data = await response.json();

    if (data.features && data.features.length > 0) {
      const address = data.features[0].place_name;
      console.log(`Address: ${address}`);

      // Update taxiRankAddInfo with the clicked location
      taxiRankAddInfo.coord.longitude = lng;
      taxiRankAddInfo.coord.latitude = lat;
      taxiRankAddInfo.address = address;

       // Remove the old marker if it exists
       if (currentMarker) {
        currentMarker.remove();
        console.log("Attempt to remove" , currentMarker);
      }

      console.log("CurrentMarker : "+ currentMarker);

      // Add a new marker and set it as the current marker
      currentMarker = new mapboxgl.Marker()
        .setLngLat([lng, lat])
        .addTo(map);

      
      searchBox.value = address;
    } else {
      console.error('No address found for the clicked location.');
    }
  } catch (error) {
    console.error('Error fetching address:', error);
  }
});

//handle row click
gridTableDiv.addEventListener('click' , async (event)=>{
  const row = event.target.closest(".grid-row");
  if(row){
    //remove existing markers and routes
    removeMarker();
    removeExistingRoutes();
    
    //get the row ID
    const id = row.dataset.rank;

    //request information
    const response = await axios.post('http://localhost:3000/admin/getTaxiRank' ,{
      rankID:id
    });

    //read information
    const resultInfo = response.data;

     //load TaxiRank marker
    const addedMarker =  addMarker(resultInfo.taxiR_location_coords.longitude   , resultInfo.taxiR_location_coords.latitude , 'yellow');
    allMarkerObjects.push(addedMarker);

    //load routes
    const coordsList = resultInfo.route_coordsList;
    coordsList.forEach((route)=>{
      loadMiniRoutes(route.coords , route.travelMethod);
    });

    //Collect all coordinates to zoom
    if(coordsList){
      let arrCoords = [];
      coordsList.forEach((route)=>{
        arrCoords.push(route.coords);
      })
  
    if(arrCoords){
        const finalCoords = arrCoords.flat();
        zoomRoute(finalCoords);
    }
    }
   
  }
});
});

deleteCloseButton.addEventListener('click' , ()=>{
  deleteMenu.style.visibility = 'hidden';
  delRankID  = -1;
});

editCloseButton.addEventListener('click' , ()=>{
  editMenu.style.visibility = 'hidden';
});

// Attach event listener to the search box
searchBox.addEventListener('input', (e) => {
  fetchSuggestions(e.target.value);
});

// **** functionality Capabilities ****
// Check if both elements exist
if (AddButton && menu && closeButton && updateButton && searchBox && nameBox && provinceBox) {

  // Event listener for click event on AddButton
  AddButton.addEventListener("click", (e) => {
    menu.style.visibility = "visible";
  });

  //Close contextMenu
  closeButton.addEventListener("click" , (e)=>{
    menu.style.visibility = "hidden";
  });

  //Update execution
 updateButton.addEventListener('click' , (e)=>{

//get from name and province textbox
taxiRankAddInfo.name = nameBox.value;
taxiRankAddInfo.province = provinceBox.value;

// Send the data to the server
fetch('http://localhost:3000/admin/addTaxiRank', {
  method: 'POST', // HTTP method
  headers: {
    'Content-Type': 'application/json', // Send data as JSON
  },
  body: JSON.stringify(taxiRankAddInfo), // Convert the data to a JSON string
})
  .then((response) => {
    if (!response.ok) {
      throw new Error('Network response was not ok');
    }
    searchBox.value = "";
    provinceBox.value = "";
    nameBox.value = "";
    addSingleInfoOnTable();
    return response.json(); // Parse the JSON response
  })
  .then((responseData) => {
    console.log('Server response:', responseData);
  })
  .catch((error) => {
    console.error('Error:', error);
  });
  });

} else {
  console.error("Button or menu element not found.");
}

//Table list update
listOnTable();

async function listOnTable() {
  if(gridTableDiv){
  try {
    const response = await axios.get('http://localhost:3000/admin/listTaxiRanks');
    const dataReceived = response.data;
    dataReceived.forEach( async TaxiRankObj=>{
   // Create the parent div with class "grid-row" and id "2"
   createGridRow(TaxiRankObj.ID ,TaxiRankObj.name , TaxiRankObj.province , TaxiRankObj.address , TaxiRankObj.num_routes);

//Adding a Marker
const newMarker = addMarker(TaxiRankObj.coord.longitude , TaxiRankObj.coord.latitude,'red');
allMarkerObjects.push(newMarker);

   //add routes
   await populateMap(TaxiRankObj.ID)
    });
  } catch (error) {
    console.error(error);
  }

}else{
  console.error("An element not found under table list.");
}
}

function createGridRow(ID ,taxiName , provinceName , addressName , numRoutes) {
  const gridRow = document.createElement("div");
  gridRow.className = "grid-row";
  gridRow.dataset.rank = ID;

  const taxiRankName = document.createElement("div");
  taxiRankName.className = "grid-cell";
  taxiRankName.textContent = taxiName;
  gridRow.appendChild(taxiRankName);

  const province = document.createElement("div");
  province.className = "grid-cell";
  province.textContent = provinceName;
  gridRow.appendChild(province);

  const address = document.createElement("div");
  address.className = "grid-cell";
  address.textContent = addressName;
  gridRow.appendChild(address);

  const lastCell = document.createElement("div");
  lastCell.className = "grid-cell";
  lastCell.textContent =numRoutes;

  const multiButton = document.createElement("div");
  multiButton.id = "multi_button";

  const addRouteButton = document.createElement("button");
  addRouteButton.className = "btn route";
  addRouteButton.textContent = "Add route";
  addRouteButton.dataset.rank = ID;
  multiButton.appendChild(addRouteButton);

  const subMultiButton = document.createElement("div");
  subMultiButton.className = "sub_multi_button";

  const editButton = document.createElement("button");
  editButton.className = "btn edit";
  editButton.textContent = "Edit";

  const delButton = document.createElement("button");
  delButton.className = "btn del";
  delButton.textContent = "Del";
  delButton.dataset.rank = ID;

  subMultiButton.appendChild(editButton);
  subMultiButton.appendChild(delButton);

  multiButton.appendChild(subMultiButton);
  lastCell.appendChild(multiButton);
  gridRow.appendChild(lastCell);

  // gridTableDiv.appendChild(gridRow);
  gridRowContainer.appendChild(gridRow);
}

async function addSingleInfoOnTable(){
  if(gridTableDiv){
    try {
      const response = await axios.get('http://localhost:3000/admin/listTaxiRanks');
      const dataReceived = response.data;

      const lastRowNum  = dataReceived.length -1;
      const TaxiRankObj = dataReceived[lastRowNum];



     // Create the parent div with class "grid-row" and id "2"
     const gridRow = document.createElement("div");
     gridRow.className = "grid-row";
     gridRow.id = "2";
  
  // Create the first grid-cell for name
  const gridCell1 = document.createElement("div");
  gridCell1.className = "grid-cell";
  gridCell1.textContent = TaxiRankObj.name; // Set the text content
  
  // Create the second grid-cell for provinvce
  const gridCell2 = document.createElement("div");
  gridCell2.className = "grid-cell";
  gridCell2.textContent = TaxiRankObj.province;
  
  // Create the third grid-cell
  const gridCell3 = document.createElement("div");
  gridCell3.className = "grid-cell";
  gridCell3.textContent = TaxiRankObj.address;
  
  // Create the fourth grid-cell with nested span and button
  const gridCell4 = document.createElement("div");
  gridCell4.className = "grid-cell fourth";
  gridCell4.textContent = TaxiRankObj.num_routes; // Add the text content
  
  // Create the span inside the fourth grid-cell
  const span = document.createElement("span");
  
  // Create the button inside the span
  const button = document.createElement("button");
  button.className = "button route";
  button.textContent = "Add Route";
  button.dataset.rank = TaxiRankObj.ID;
  
  // Append the button to the span
  span.appendChild(button);
  
  // Append the span to the fourth grid-cell
  gridCell4.appendChild(span);
  
  // Append all grid-cells to the parent grid-row
  gridRow.appendChild(gridCell1);
  gridRow.appendChild(gridCell2);
  gridRow.appendChild(gridCell3);
  gridRow.appendChild(gridCell4);
  // Append the grid-row to the body or a specific container in your HTML
  gridTableDiv.appendChild(gridRow); // Or replace document.body with the target container element
  addMarker(TaxiRankObj.coord.longitude , TaxiRankObj.coord.latitude, 'red');
    } catch (error) {
      console.error(error);
    }
  }else{
    console.error("An element not found under table list.");
  }
}

 function addMarker(lng , lat, color){
  const newMarker = new mapboxgl.Marker({color:color , scale:0.6})
        .setLngLat([lng, lat])
        .addTo(map);

    return newMarker;   
}

function loadMiniRoutes(miniroutes , travelMethod) {

      const routeSourceId = `route-source-${(mapIdCount)}`;
      const routeLayerId = `route-line-${(mapIdCount)}`;

      //Increase for the next load of miniroutes
      mapIdCount++;
        // Remove existing source if it exists
        if (map.getSource(routeSourceId)) {
          map.removeSource(routeSourceId);
      }

      // Remove existing layer if it exists
      if (map.getLayer(routeLayerId)) {
          map.removeLayer(routeLayerId);
      }


      // Convert each mini-route to GeoJSON
      const routeFeatures = {
          type: 'Feature',
          properties: {},
          geometry: {
              type: 'LineString',
              coordinates: miniroutes
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

  
}

async function populateMap(id){
  try{
   const response = await axios.post('http://localhost:3000/admin/getTaxiRank' ,{
    rankID:id
  });
    //read information
    const resultInfo = response.data;
   //load routes
   const coordsList = resultInfo.route_coordsList;
   coordsList.forEach((route)=>{
     loadMiniRoutes(route.coords , route.travelMethod);
   });
  }catch(error){
console.log(error);
  }
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

function removeMarker(){
  if(allMarkerObjects.length > 0){
    allMarkerObjects.forEach((marker)=>{
      marker.remove();
    });

    //empty the array
  allMarkerObjects = [];
  }


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

//Handling Add route button clicks
document.body.addEventListener("click", async function (event) {
  //checking if route is clicked
  if (event.target.classList.contains("route")) {
    const rankID = event.target.dataset.rank;
    console.log("Button clicked for Taxi Rank ID:", rankID);
    window.location.href = `../route.html?rank=${rankID}`;
  }

  //checking if delete is clicked
  if(event.target.classList.contains("del")){
    const rankID = event.target.dataset.rank;
    //make the warning visible , if ok is clicked delete
    deleteMenu.style.visibility = 'visible';
    delRankID = rankID;
  }
});

executeDeleteBtn.addEventListener('click' , async (event)=>{
  if(delRankID < 0){
    return;
  }

  console.log("delRankID : ", delRankID);

   const response = await axios.post('http://localhost:3000/admin/deleteTaxiRank' , {
      taxiRankID:delRankID
    });

    console.log(response);

    if(response.status === 200){
      delRankID = -1;
      deleteMenu.style.visibility = 'hidden';
    }
})

//Handling Add route button clicks
document.addEventListener("DOMContentLoaded", function () {
  const buttons = document.querySelectorAll(".btn.route");

  console.log(buttons);
  buttons.forEach(button => {
    console.log("Checking button");

      button.addEventListener("click", function () {
          const rankId = this.getAttribute("data-rank"); // Get row ID
          console.log("Button selected with RankID: "+ rankId);
          // Redirect to the new page with the rank ID in the URL
          window.location.href = `../route.html?rank=${rankId}`;
      });
  });
});




