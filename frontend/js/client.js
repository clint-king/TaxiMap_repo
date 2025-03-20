import  axios  from 'axios';

 // === DOM ELEMENTS ===

 //toggle button
 const fromToggleBtn = document.querySelector(".toggleBtn.from");
 const toToggleBtn = document.querySelector(".toggleBtn.to");
 const defaultToggleBtn =document.querySelector(".toggleDefaultBtn");

 //context menu
 const confirmationContextMenu = document.querySelector(".menu.markerConfirmation");
 const confirmationCloseBtn = document.querySelector(".menu.close_button");
 const confirmationNoBtn = document.querySelector(".menu.btn.no");
 const confirmationYesBtn = document.querySelector(".menu.btn.yes");


 //search input
 const currentLocation = document.querySelector("#listSource");
 const destinationLocation = document.querySelector('#listDestination');
 const inputCurrentLocation = document.querySelector('.search_input.source');
 const inputDestinationLocation = document.querySelector('.search_input.destination');

 //prices listing
 const rightPriceList = document.querySelector('.listSub_container.list_right');
 const leftPriceList = document.querySelector('.listSub_container.list_left');

 //direction prices
 const directionContainer = document.querySelector('.direction_container');


 //=== VARIABLES ===
 const toggleMap = new Map([
    ["from" , 0],
    ["to" , 0]
 ]);

 //markers
 let sourceMarker = null;
 let destinationMarker = null;

 //confirmation menu vars
 let isOpen_confirmationMenu = false;
 let isYes = false;
 let confirmationMenu_longitude = -1;
 let confirmationMenu_latitude = -1;
 let confirmationMenu_adresss = "";

 //Row prices
 let sumOfPrices = 0;

 // === MAP IMPLEMENTATION ===

 //mapbox setup
const accessToken = 'pk.eyJ1IjoiY2xpZXRpbiIsImEiOiJjbTR6eW1icmMxN3dyMmpzODBsZDQwNHN6In0.m5MSK2_0_SFpPPhB5BX86w'; 
mapboxgl.accessToken = accessToken;

// Initialize the map
const map = new mapboxgl.Map({
    container: 'map', // container ID
    style: 'mapbox://styles/mapbox/streets-v11', // style URL
    center: [30.0, -25.0], // Default center [lng, lat] (South Africa)
    zoom: 12, // Default zoom
  });

  //map
  map.on('load', () => {

    // Add a click event listener to the map
map.on('click', async (e) => {

    //prevents user from marking a location while the context menu id open
    if(isOpen_confirmationMenu === true){
        console.error("Context menu is already open");
        return;
    }
    const { lng, lat } = e.lngLat; // Extract longitude and latitude
    console.log(`Coordinates clicked: Longitude - ${lng}, Latitude - ${lat}`);
  
    // Fetch the address using reverse geocoding
    const reverseGeocodeUrl = `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${mapboxgl.accessToken}`;
    
    try {
      const response = await fetch(reverseGeocodeUrl);
      const data = await response.json();
      const address = data.features[0].place_name;
      if (data.features && data.features.length > 0) {
          //open confirmation context menu
        openConfirmationMenu();

        //Save current information
        saveLocationMarkerInfo(lng , lat , address);

      } else {
        console.error('No address found for the clicked location.');
      }
    } catch (error) {
      console.error('Error fetching address:', error);
    }
  });

  confirmationYesBtn.addEventListener('click' , ()=>{
    isYes = true;
   if(isLocationInfoAvailable()){
    placeMarker(confirmationMenu_longitude , confirmationMenu_latitude , confirmationMenu_adresss);
    defaultLocationMarkerInfo();
   }else{
    console.error("Not all information is available to be saved");
   }
 })

  });

 // === EVENT LISTENERS ====
 fromToggleBtn.addEventListener('click' , ()=>{
    //incase the user the to button before from immediately
    defaultRetreat();
    //set map to 1
    toggleMap.set("from" , 1);
    //change color
    fromToggleBtn.style.backgroundColor = "#F6DC76";
    //default btn
   defaultToggleBtn.style.backgroundImage = "linear-gradient(#cccaca , white)";
 });


 toToggleBtn.addEventListener('click' , ()=>{
    //incase the user the to button before from immediately
    defaultRetreat();
    //set map to 1
    toggleMap.set("to" , 1);
    //change color
    toToggleBtn.style.backgroundColor = "#F6DC76";
    //default btn
   defaultToggleBtn.style.backgroundImage = "linear-gradient(#cccaca , white)";



 });

 confirmationCloseBtn.addEventListener('click' , ()=>{
    closeConfirmationMenu();
    defaultLocationMarkerInfo();
    isYes = false;
 });

 confirmationNoBtn.addEventListener('click' , ()=>{
    closeConfirmationMenu();
    defaultLocationMarkerInfo();
    isYes = false;
 });


 //source input 
 inputCurrentLocation.addEventListener('input' , (e)=>{
    fetchSuggestions(currentLocation , e.target.value );
 });

 //destination input
 inputDestinationLocation.addEventListener('input' , (e)=>{
    fetchSuggestions(destinationLocation , e.target.value);
 })

 //=== FUNCTIONS ===

function defaultRetreat(){
    if(toggleMap.get("from") === 1){
    // retreat from source
    fromToggleBtn.style.backgroundColor = "#f3f2f2";
    toggleMap.set("from" , 0);
    }
    
    if(toggleMap.get("to") === 1){
    //retreat from destination 
    toToggleBtn.style.backgroundColor = "#f3f2f2";
    toggleMap.set("to" , 0);
    }
   
   //default btn
   defaultToggleBtn.style.backgroundImage = "linear-gradient( #e7be1a,#F6DC76)";
}

async function fetchSuggestions(suggestions, query) {
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

            if(currentLocation === suggestions){
                 // Remove the old marker if it exists
         if (sourceMarker) {
            sourceMarker.remove();
            console.log("marker is removed");
          }

              // Add marker and center the map
              sourceMarker =  new mapboxgl.Marker()
              .setLngLat([longitude, latitude])
              .addTo(map);

            map.flyTo({ center: [longitude, latitude], zoom: 12 });

            }else if(destinationLocation === suggestions){

            // Remove the old marker if it exists
         if (destinationMarker) {
            destinationMarker.remove();
            console.log("marker is removed");
          }

              // Add marker and center the map
              destinationMarker =  new mapboxgl.Marker()
              .setLngLat([longitude, latitude])
              .addTo(map);
  
            map.flyTo({ center: [longitude, latitude], zoom: 12 });

            }else{
                console.error("There was no marker chosen or valid ")
            }
          });
  
          suggestions.appendChild(li);
        });
      }
    } catch (error) {
      console.error('Error fetching suggestions:', error);
    }
}

function routeExecution(){
    if(destinationMarker && destinationMarker){

    }
}

//confirmation manu management

function closeConfirmationMenu(){
    confirmationContextMenu.style.visibility = 'hidden';
    isOpen_confirmationMenu = false;
    isYes = false;
}

function openConfirmationMenu(){
    confirmationContextMenu.style.visibility = 'visible';
    isOpen_confirmationMenu = true;
}

function saveLocationMarkerInfo(lng , lat , address){
    confirmationMenu_longitude = lng ;
    confirmationMenu_latitude = lat;
    confirmationMenu_adresss = address;
}
function isLocationInfoAvailable(){
    return confirmationMenu_longitude > -1 && confirmationMenu_latitude > -1 && confirmationMenu_adresss.length > 0
}

function defaultLocationMarkerInfo(){
    confirmationMenu_longitude = -1 ;
    confirmationMenu_latitude = -1;
    confirmationMenu_adresss = "";
}

function placeMarker(lng , lat , address){
    if(isOpen_confirmationMenu === true){

        if(isYes === true){
            if(toggleMap.get("from") === 1){
                if (sourceMarker) {
                   sourceMarker.remove();
                   console.log("marker is removed");
                 }
       
                     // Add marker and center the map
                     sourceMarker =  new mapboxgl.Marker()
                     .setLngLat([lng, lat])
                     .addTo(map);
       
                   map.flyTo({ center: [lng, lat], zoom: 12 });
       
                    //insert in input
                    inputCurrentLocation.value = address;
       
                   //reverse toggle map value
                   toggleMap.set("from" , 0);
       
                   //set back to defaault
                   defaultRetreat();
       
               }else if(toggleMap.get("to") === 1){
       
                  // Remove the old marker if it exists
                if (destinationMarker) {
                   destinationMarker.remove();
                   console.log("marker is removed");
                 }
       
                     // Add marker and center the map
                     destinationMarker =  new mapboxgl.Marker()
                     .setLngLat([lng, lat])
                     .addTo(map);
         
                   map.flyTo({ center: [lng, lat], zoom: 12 });
       
                   //insert in input
                   inputDestinationLocation.value = address;
       
                   //reverse toggle map value
                   toggleMap.set("to" , 0);
               }  

               
                
        }

    }
}

//managing route prices 
function createPricerow(routeID , price , color){

//create the right row
const rightRowPrice = document.createElement("li");
rightRowPrice.className = "rightPriceRow";
const circle = document.createElement("div");
circle.className = "route_circle";
circle.style.backgroundColor = color;
rightRowPrice.appendChild(circle);
rightRowPrice.textContent = routeID;

//create the left row
const leftRowPrice = document.createElement("li");
leftRowPrice.className = "leftPriceRow";
leftRowPrice.textContent = price;


//append rows 
rightPriceList.appendChild(rightRowPrice);
leftPriceList.appendChild(leftRowPrice);

//add to sum 
sumOfPrices += parseInt(price , 10);
}

function removeAllPrices(){
    const  allRightPriceRow = document.querySelectorAll('.rightPriceRow');
    const allLeftPriceRow = document.querySelectorAll('.leftPriceRow');

    if(allRightPriceRow){
        allRightPriceRow.forEach((row)=>{
            row.remove();
        })
    }

    if(allLeftPriceRow){
        allLeftPriceRow.forEach((row)=>{
            row.remove();
        })
    }

    //default total
    sumOfPrices = 0;
}


//managing directions prices
function createDirections(name , color){
const directionButton = document.createElement('button');
directionButton.className = 'direction_button';
directionButton.textContent = name;
directionButton.backgroundColor = color;
directionContainer.appendChild(directionButton);
}

function removeAllDirectionBtns(){
    const directionButtons = document.querySelectorAll('.direction_button');
    if(directionButtons){
        directionButtons.forEach((button)=>{
            button.remove();
        });
    }
}




