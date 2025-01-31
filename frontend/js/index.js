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




//Grid elements
const gridTableDiv = document.querySelector(".grid-table");

const taxiRankAddInfo = {
  name: '',
  coord: {longitude:'' , latitude:''},
  province: '',
  address: ''
};


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
    dataReceived.forEach( TaxiRankObj=>{
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

//Adding a Marker
addMarker(TaxiRankObj.coord.longitude , TaxiRankObj.coord.latitude);

    })
  } catch (error) {
    console.error(error);
  }

}else{
  console.error("An element not found under table list.");
}
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
  addMarker(TaxiRankObj.coord.longitude , TaxiRankObj.coord.latitude);
    } catch (error) {
      console.error(error);
    }
  }else{
    console.error("An element not found under table list.");
  }
}

async function addMarker(lng , lat){
  new mapboxgl.Marker({color:'red' , scale:0.6})
        .setLngLat([lng, lat])
        .addTo(map);
}



//from TaxiRank page to route.html
document.body.addEventListener("click", function (event) {
  if (event.target.classList.contains("route")) {
    const rankID = event.target.dataset.rank;
    console.log("Button clicked for Taxi Rank ID:", rankID);
    window.location.href = `../route.html?rank=${rankID}`;
  }
});



document.addEventListener("DOMContentLoaded", function () {
  const buttons = document.querySelectorAll(".button.route");

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




