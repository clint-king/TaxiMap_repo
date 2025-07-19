import axios from "axios";
import * as turf from "@turf/turf";
import popup from "./popup.js";

// === DOM ELEMENTS ===

//toggle button
const fromToggleBtn = document.querySelector(".toggleBtn.from");
const toToggleBtn = document.querySelector(".toggleBtn.to");



//context menu
const confirmationContextMenu = document.querySelector(
  ".menu.markerConfirmation"
);
const confirmationCloseBtn = document.querySelector(
  ".menu.markerConfirmation .close_button"
);
const confirmationNoBtn = document.querySelector(
  ".menu.markerConfirmation .btn.no"
);
const confirmationYesBtn = document.querySelector(
  ".menu.markerConfirmation .btn.yes"
);

//pins
const sourcePin = document.querySelector(".sourcePin");
const destPin = document.querySelector(".destPin");

//cancel menu
const cancelContextMenu = document.querySelector(".menu.cancelRoute");
const cancelCloseBtn = document.querySelector(
  ".menu.cancelRoute .close_button"
);
const cancelNoBtn = document.querySelector(".menu.cancelRoute .btn.no");
const cancelYesBtn = document.querySelector(".menu.cancelRoute .btn.yes");

//search input
const searchContainer = document.querySelector(".search_container");
const currentLocation = document.querySelector(".listSource");
const destinationLocation = document.querySelector(".listDestination");
const inputCurrentLocation = document.querySelector(".search_input.source");
const inputDestinationLocation = document.querySelector(
  ".search_input.destination"
);
const sourceSearchBtn = document.querySelector(".source .fa-search");
const destSearchBtn = document.querySelector(".dest .fa-search");

//prices listing
const priceToogleButton = document.querySelector(
  "#ui_container .toggle-container"
);
const radiusToogleButton = document.querySelector("#map .toggle-container");

//direction prices
const directionContainer = document.querySelector(
  ".direction_container .sub_direction_container"
);
const defaultDirectionButton = document.querySelector(
  ".default_direction_button"
);
let incomingMovement = false;
let movementExists = false;
let taxiMarker = null;
let moveTimer = null;

//arrow button
const ArrowBtn = document.getElementById("toggleBtn");
const mapContainer = document.querySelector(".map_container");
const mapEl = document.getElementById("map");
let isTextDirectionOpen = false;

//feedback
const feedbackBtn = document.querySelector(".feedbackBtn");

//=== VARIABLES ===
const toggleMap = new Map([
  ["from", 0],
  ["to", 0],
]);

//markers
let sourceMarker = null;
let destinationMarker = null;
let generalMarkerCollector = [];

//map control
let lastClickedInside = false;
let mergedBufferFeature;
//confirmation menu vars
let isOpen_confirmationMenu = false;
let isYes = false;
let confirmationMenu_longitude = -500;
let confirmationMenu_latitude = -500;
let confirmationMenu_adresss = "";

//cancel menu
let noDisturbance = true;

//save the coordinates
let sourceCoordinates = { latitude: -500, longitude: -500 };
let destinationCoordinates = { latitude: -500, longitude: -500 };

//Row prices
let sumOfPrices = 0;
let storedListRoutes = [];
let walkingCoords = [];

//sending search Info vars
const listOfProvinces = [
  "Limpopo",
  "Gauteng",
  "Mpumalanga",
  "Western Cape",
  "kwazulu-natal",
  "Eastern Cape",
  "North West",
  "Free State",
  "Northern Cape",
];

//price toggle check
let toggleCheck = false;
//color for prices
const priceColors = [
  "#D2CCA1",
  "#757780",
  "#387780",
  "#A30B37",
  "#EF626C",
  "#361F27",
  "#912F56",
  "#68B684",
  "#C3F73A",
  "#FF36AB",
];

//direction colors
const directionButtonColors = [
  "#CEE6C2",
  "#C3C5F7",
  "#ECB8B8",
  "#ECBDF1",
  "#F1E8BD",
  "#BDE7F1",
  "#BDF1DE",
  "#ECBDF1",
  "#CEE6C2",
];

//direction storage
let directionStorage = [];
let textDirectionAddresses = [];

// === MAP IMPLEMENTATION ===

//mapbox setup
const accessToken =
  "pk.eyJ1IjoiY2xpZXRpbiIsImEiOiJjbTR6eW1icmMxN3dyMmpzODBsZDQwNHN6In0.m5MSK2_0_SFpPPhB5BX86w";
mapboxgl.accessToken = accessToken;

// Initialize the map
const map = new mapboxgl.Map({
  container: "map", // container ID
  style: "mapbox://styles/mapbox/streets-v11", // style URL
  center: [30.0, -25.0], // Default center [lng, lat] (South Africa)
  zoom: 12, // Default zoom
});

//map
map.on("load", () => {
  //Add clickable Area
  HighlightMap();

  // Add a click event listener to the map
  map.on("click", "buffer-layer", async (e) => {
    //indicate a click within the erea to prevent the general check from executing
    lastClickedInside = true;
    //prevents user from marking a location while the context menu id open
    if (isOpen_confirmationMenu === true) {
      console.error("Context menu is already open");
      return;
    }

    //prevents user from marking location without clicking from or To
    if (toggleMap.get("to") === 0 && toggleMap.get("from") === 0) {
      showPopup("Click from or to buttons , to Mark", false);
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
        saveLocationMarkerInfo(lng, lat, address);
      } else {
        console.error("No address found for the clicked location.");
      }
    } catch (error) {
      console.error("Error fetching address:", error);
    }
  });

  //check if there was a click outside the area
  map.on("click", (e) => {
    if (lastClickedInside) {
      lastClickedInside = false;
      return; // Skip duplicate
    }

    const coords = e.lngLat;
    const features = map.queryRenderedFeatures(e.point, {
      layers: ["buffer-layer"],
    });

    if (features.length === 0) {
      showPopup("Click is outside of the radius", false);
    }
  });

  confirmationYesBtn.addEventListener("click", () => {
    isYes = true;
    if (isLocationInfoAvailable()) {
      placeMarker(
        confirmationMenu_longitude,
        confirmationMenu_latitude,
        confirmationMenu_adresss
      );

      defaultLocationMarkerInfo();
      //close menu
      closeConfirmationMenu();
    } else {
      console.error("Not all information is available to be saved");
    }
  });

  //***  END OF LOAD MAP
});

// === EVENT LISTENERS ====



feedbackBtn.addEventListener("click", (event) => {});

sourceSearchBtn.addEventListener("click", async (e) => {
  //get address
  const query = inputCurrentLocation.value;
  if (!query) return;

  getPlaceUsingQueryRequest(query, true);
});

destSearchBtn.addEventListener("click", async (e) => {
  //get address
  const query = inputDestinationLocation.value;
  if (!query) return;

  getPlaceUsingQueryRequest(query, false);
});

document.addEventListener("click", (event) => {
  if (
    !searchContainer.contains(event.target) &&
    !currentLocation.contains(event.target) &&
    !destinationLocation.contains(event.target)
  ) {
    currentLocation.innerHTML = "";
    destinationLocation.innerHTML = "";
  }
});

//right click
mapEl.addEventListener("contextmenu", (event) => {
  console.log("Dected right click");
  if (storedListRoutes.length > 0 && noDisturbance === true) {
    openCancelMenu();
  }
});

//cancel menu
cancelCloseBtn.addEventListener("click", () => {
  closeCancelMenu();
});

cancelNoBtn.addEventListener("click", () => {
  closeCancelMenu();
});

//clicking yes in cancel menu
cancelYesBtn.addEventListener("click", (e) => {
  if (storedListRoutes.length > 0) {
    //remove existing
    removeExistingRoutes();

    //remove stored route (dont put this function in removeExistingRoutes() , it will affect price division)
    storedListRoutes.length = 0;
    //remove existing general markers
    removeGeneralMarker();

    //default text directions information
    textDirectionAddresses = [];

    //remove walk coordinates
    walkingCoords = [];

    //remove marker
    if (sourceMarker) {
      sourceMarker.remove();
      console.log("marker is removed");
    }

    if (destinationMarker) {
      destinationMarker.remove();
      console.log("marker is removed");
    }

    //remove the stored coordinates too
    sourceCoordinates = { latitude: -500, longitude: -500 };
    destinationCoordinates = { latitude: -500, longitude: -500 };

    //remove existing price list if present
    removeAllPrices();

    //remove existing directions
    removeAllDirectionBtns();

    //removing directions's moving object
    removeExistingObject();

    //popup
    showPopup("Successfully removed", true);
    //turnoff the pins
    turnOffSourcePin();
    turnOffDestPin();
    //remove the menu
    closeCancelMenu();

  }
});

fromToggleBtn.addEventListener("click", () => {
  //incase the user the to button before from immediately
  if (toggleMap.get("from") === 1) {
    defaultRetreat();
    noDisturbance = true;
    return;
  }

  //remove the Cancel menu if it is open
  closeCancelMenu();

  defaultRetreat();
  //set map to 1
  toggleMap.set("from", 1);
  //change color
  fromToggleBtn.style.backgroundColor = "#FFD52F";
  fromToggleBtn.style.color = "white";

  //make sure the route cancelation is not possible
  noDisturbance = false;
});

ArrowBtn.addEventListener("click", () => {
  const isDown = ArrowBtn.classList.toggle("down");

  if (isDown === true) {
    isTextDirectionOpen = true;
    //Add the other page
    let textMap = null;
    if (textDirectionAddresses && textDirectionAddresses.length > 0) {
      //there is information to display
      textMap = createTextMapContainer(textDirectionAddresses, false);
      mapContainer.insertBefore(textMap, mapEl);
       if (window.innerWidth > 768){
          mapEl.style.width = "75%";
       }
     
    } else {
      //there is no information to display
      console.log("Thee is no Information");
      const arrAddress = ["Oops: Text map is not loaded"];
      textMap = createTextMapContainer(arrAddress, true);
      mapContainer.insertBefore(textMap, mapEl);
      if (window.innerWidth > 768){
           mapEl.style.width = "75%";
           
      }
   
    }

     textMapHeightAdj();
     closeSearchContainer();
  } else {
    isTextDirectionOpen = false;
    removeTextDirections();
    if (window.innerWidth > 768){
       mapEl.style.width = "95%";
    }
  }
});

toToggleBtn.addEventListener("click", () => {
  //incase the user the to button before from immediately
  if (toggleMap.get("to") === 1) {
    defaultRetreat();
    noDisturbance = true;
    return;
  }

  //remove the Cancel menu if it is open
  closeCancelMenu();

  defaultRetreat();
  //set map to 1
  toggleMap.set("to", 1);
  //change color
  toToggleBtn.style.backgroundColor = "#FFD52F";
  toToggleBtn.style.color = "white";

  //make sure the route cancelation is not possible
  noDisturbance = false;
});

confirmationCloseBtn.addEventListener("click", () => {
  closeConfirmationMenu();
  defaultLocationMarkerInfo();
  isYes = false;
});

confirmationNoBtn.addEventListener("click", () => {
  closeConfirmationMenu();
  defaultLocationMarkerInfo();
  isYes = false;
});

//source input
inputCurrentLocation.addEventListener("input", (e) => {
  const value = e.target.value.trim();
  if (value === "") {
    sourceSearchBtn.style.color = "#919191"; // Gray when input is empty
  } else {
    sourceSearchBtn.style.color = "#FFD52F"; // Yellow when input has text
    fetchSuggestions(currentLocation, value);
  }
});

//destination input
inputDestinationLocation.addEventListener("input", (e) => {
  const value = e.target.value.trim();
  if (value === "") {
    destSearchBtn.style.color = "#919191"; // Gray when input is empty
  } else {
    destSearchBtn.style.color = "#FFD52F"; // Yellow when input has text
    fetchSuggestions(destinationLocation, value);
  }
});

//direction button listeners
directionContainer.addEventListener("click", async (e) => {
  const dirBtnEl = e.target.closest(".direction_button");

  if (!directionStorage) {
    console.log("Could not find any  directions stored");
    return;
  }

  const directionButtonInfo = directionStorage[dirBtnEl.id];

  console.log("Direcion combo chosen : ", directionButtonInfo);
  if (!directionButtonInfo) {
    console.log(`Button id = ${dirBtnEl.id} , was nopt found`);
    return;
  }

  //*draw coordinates

  //store the coordinates
  let directionCoords = [];
  directionButtonInfo.forEach((direction) => {
    directionCoords.push(direction.direction_coords);
  });

  console.log("Direction combo chosen : " , directionCoords);
  if (!directionCoords) {
    console.log(`The variable directionCoords is null or  undefined `);
    return;
  }

  //draw the coordinates
  loadMiniRoutes(directionCoords, "Taxi", `D${1}`, "yellow");

  //moving object
  if (movementExists === true) {
    incomingMovement = true;
    movementExists = false;
  }
  await movement(directionCoords.flat(), "#CEE6C2");
});

//default directions
defaultDirectionButton.addEventListener("click", (e) => {
  removeExistingObject();
  redrawCoords();
});

priceToogleButton.addEventListener("click", (e) => {
  ExecutePriceToggleBtn();
});

radiusToogleButton.addEventListener("click", (e) => {
  areaFilterToggleBtn();
});

//=== FUNCTIONS ===

//sending search information
async function sendsearchInfo() {
  if (allMarkersPlaced() === true) {
    //Remove an existsing route first
    removeExistingRoutes();

    //remove existing general markers
    removeGeneralMarker();

    //default text directions information
    textDirectionAddresses = [];

    //remove walk coordinates
    walkingCoords = [];

    //create a new route
    const sourceAdress = inputCurrentLocation.value;
    const destinationAdress = inputDestinationLocation.value;
    console.log("sourceAdress : ", sourceAdress);
    console.log("destinationAdress : ", destinationAdress);

    //geting province of each Adress
    const sourceProv = getProvince(sourceAdress);
    const destinationProv = getProvince(destinationAdress);

    if (
      sourceProv.containsProv === false ||
      destinationProv.containsProv === false
    ) {
      console.log("Could not extract a province");
      console.log("sourceProv : ", sourceProv);
      console.log("destinationProv : ", destinationProv);
      return;
    }

    //getting coordinates
    if (
      sourceCoordinates.latitude != -500 &&
      sourceCoordinates.longitude != -500 &&
      destinationCoordinates.latitude != -500 &&
      destinationCoordinates.longitude != -500
    ) {
      try {
        const response = await axios.post(
          "http://localhost:3000/client/findingPath",
          {
            sourceCoords: sourceCoordinates,
            sourceProvince: sourceProv.province,
            destinationCoords: destinationCoordinates,
            destinationProvince: destinationProv.province,
          },
  {
    withCredentials: true
  }
        );

        const dataReceived = response.data;
        console.log("Route results : ", dataReceived);

        //check if there is no error
        showPopup("route found", true);
        //draw route
        const listOfRoutes = dataReceived.routes;

        //START SECTION TO SEPERATE
        storedListRoutes = listOfRoutes;
        listOfRoutes.forEach((route, index) => {
          console.log(`Drawing route ${index}:`, route);
          loadMiniRoutes(
            route.drawableCoords,
            route.travelMethod,
            index,
            "blue"
          );
        });

        //walking routes

        //source walking
        const sourceRouteCoords =
          listOfRoutes[0].drawableCoords.length > 0
            ? listOfRoutes[0].drawableCoords.flat()
            : listOfRoutes[0].drawableCoords;
        console.log("Source Walking  : ", sourceRouteCoords);

        const sourceCoords = await getAccurateWalkCoords(
          dataReceived.sourceCoord.latitude,
          dataReceived.sourceCoord.longitude,
          dataReceived.pointCloseToSource.latitude,
          dataReceived.pointCloseToSource.longitude,
          sourceRouteCoords
        );
        walkingCoords.push(sourceCoords);

        //destination walking
        const lastRoute = listOfRoutes.length - 1;
        console.log("Route length : ", lastRoute);
        console.log(
          "Destination Walking  : ",
          listOfRoutes[lastRoute].drawableCoords
        );
        const destRouteCoords =
          listOfRoutes[lastRoute].drawableCoords.length > 0
            ? listOfRoutes[lastRoute].drawableCoords.flat()
            : listOfRoutes[lastRoute].drawableCoords;
        const destinationCoords = await getAccurateWalkCoords(
          dataReceived.destCoord.latitude,
          dataReceived.destCoord.longitude,
          dataReceived.pointCloseToDest.latitude,
          dataReceived.pointCloseToDest.longitude,
          destRouteCoords
        );
        console.log("destWalking coords: ", destinationCoords);
        walkingCoords.push(destinationCoords);

        loadMiniRoutes(walkingCoords, "Walk", `W${1}`, "blue");

        const finalCoords = walkingCoords.flat();
        zoomRoute(finalCoords);

        //create Markers

        //start marker
        const lastSourceCoord = sourceCoords.length - 1;
        const sourceAdress = await getAdress(
          sourceCoords[lastSourceCoord][0],
          sourceCoords[lastSourceCoord][1]
        );
        if (listOfRoutes.length === 1) {
          placeMarkerGeneral(
            sourceCoords[lastSourceCoord][0],
            sourceCoords[lastSourceCoord][1],
            "start",
            "👇",
            "Raise the hand sign shown to stop a Taxi",
            sourceAdress,
            dataReceived.chosenTaxiRanks[0].address
          );
        } else if (listOfRoutes.length > 1) {
          placeMarkerGeneral(
            sourceCoords[lastSourceCoord][0],
            sourceCoords[lastSourceCoord][1],
            "start",
            "👆",
            "Raise the hand sign shown to stop a Taxi ",
            sourceAdress,
            `${dataReceived.chosenTaxiRanks[0].address}, [TaxiRank :${dataReceived.chosenTaxiRanks[0].name}]`
          );
        }

        textDirectionAddresses.push(dataReceived.chosenTaxiRanks[0].address);

        //stop Marker
        const lastDestCoord = destinationCoords.length - 1;
        const destAdress = await getAdress(
          destinationCoords[lastDestCoord][0],
          destinationCoords[lastDestCoord][1]
        );
        placeMarkerGeneral(
          destinationCoords[lastDestCoord][0],
          destinationCoords[lastDestCoord][1],
          "stop",
          "🛑",
          `Please ask the Taxi driver to stop at this point`,
          destAdress,
          "Empty"
        );

        //TaxiRank Markers
        const taxiRanksLength = dataReceived.chosenTaxiRanks.length;
        console.log(
          "Taxiranks length : ",
          taxiRanksLength,
          " chosenTaxiRanks : ",
          dataReceived.chosenTaxiRanks
        );

        for (let i = 0; i < taxiRanksLength - 1; i++) {
          let taxiRank = dataReceived.chosenTaxiRanks[i];
          let nextTaxiRank = dataReceived.chosenTaxiRanks[i + 1];
          placeMarkerGeneral(
            taxiRank.location_coord.longitude,
            taxiRank.location_coord.latitude,
            "taxiRank",
            ">>",
            " Take a Taxi that is going to the Next Location(Walk to the Next Location if the Path is in dots)",
            `${taxiRank.address}, [TaxiRank : ${taxiRank.name}] `,
            `${nextTaxiRank.address}, [TaxiRank :${nextTaxiRank.name}]`
          );
          textDirectionAddresses.push(
            `${taxiRank.address}, [TaxiRank : ${taxiRank.name}]`
          );
        }

        // //Last TaxiRank

        if(listOfRoutes.length <= 2){
        const lastTaxiRank = taxiRanksLength - 1;
        placeMarkerGeneral(
          dataReceived.chosenTaxiRanks[lastTaxiRank].location_coord.longitude,
          dataReceived.chosenTaxiRanks[lastTaxiRank].location_coord.latitude,
          "taxiRank",
          ">>",
          "Message",
          `${dataReceived.chosenTaxiRanks[lastTaxiRank].address}, [TaxiRank : ${dataReceived.chosenTaxiRanks[lastTaxiRank].name}]`,
          `${destAdress}`
        );
        textDirectionAddresses.push(
          `${dataReceived.chosenTaxiRanks[lastTaxiRank].address}, [TaxiRank : ${dataReceived.chosenTaxiRanks[lastTaxiRank].name}]`
        );
        }
       
        //store stop adress
        textDirectionAddresses.push(destAdress);

        //check to display text directions immediately
        if (isTextDirectionOpen === true) {
          //remove existing
          removeTextDirections();
          //there is information to display
          const textMap = createTextMapContainer(textDirectionAddresses, false);
          mapContainer.insertBefore(textMap, mapEl);
          mapEl.style.width = "75%";
        }

        //create prices

        //remove existing price list if present
        removeAllPrices();

        //populate the new price list
        const priceInfo = dataReceived.prices;
        const listOfPrices = priceInfo.listOfPrices;

        for (let i = 0; i < listOfPrices.length; i++) {
          const price = listOfPrices[i].price;
          const routeName = listOfRoutes[i].name;
          createPricerow(
            routeName,
            price,
            listOfPrices[i].travelMethod == "Walk" ? "red" : priceColors[i]
          );
        }

        //END SECTION TO SEPERATE

        //create directions

        //remove existing directions
        removeAllDirectionBtns();

        const listOfDirections = dataReceived.directions.result;

        directionStorage = [...listOfDirections]; // destructuring directions

        console.log("**** DIRECTIONS STORED **** : ", directionStorage);
        listOfDirections.forEach((direction, index) => {
          createDirections(
            `D${index + 1}`,
            directionButtonColors[index],
            index
          );
        });

        //check if price toggle is on
        if (toggleCheck === true) {
          ExecutePriceToggleBtn();
        }
      } catch (error) {
        showPopup("No route found", false);
        if (error.response) {
          // The request was made and the server responded with a status code outside 2xx
          console.log("Route results (ERROR):", error.response);
          console.log("Route error data:", error.response.data);
          console.log("Status:", error.response.status);
        } else if (error.request) {
          // The request was made but no response was received
          console.log("No response received:", error.request);
        } else {
          // Something else went wrong setting up the request
          console.log("Error setting up request:", error.message);
        }
      }
    } else {
      console.log("Some coordinates are equal to -500 , which is default");
      return;
    }
  }
}

// mobileSize funcitons
function textMapHeightAdj(){
      if (window.innerWidth <= 768) {
 const navbar = document.querySelector('.topnav');
const textmap = document.querySelector('#text-map ');
 const height = navbar.offsetHeight;
  textmap.style.top = `${height +40}px`;
      }
  }


  function closeSearchContainer(){
    const searchContainer = document.querySelector(".search_container");
     if(!searchContainer.classList.contains('hidden')){
      searchContainer.classList.add('hidden');
     }
  }

  function popupZindexIncrease(){
    const popup = document.getElementById("popup-container");
    if(popup){
      popup.style.zIndex = "3000";
    }
  }

   function popupZindexDecrease(){
    const popup = document.getElementById("popup-container");
    if(popup){
      popup.style.zIndex = "0";
    }
  }

  function showPopup(message , isSuccess){
    popupZindexIncrease();
    popup.showSuccessPopup(message , isSuccess , popupZindexDecrease);
    
  }


//managing pin colors
function turnOnSourcePin() {
  sourcePin.style.color = "#19AE1E";
}

function turnOffSourcePin() {
  sourcePin.style.color = "#919191";
}

function turnOnDestPin() {
  destPin.style.color = "#F12D13";
}

function turnOffDestPin() {
  destPin.style.color = "#919191";
}

//getting the adress of a random request typed by the user
async function getPlaceUsingQueryRequest(query, isSource) {
  const endpoint = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
    query
  )}.json?access_token=${accessToken}&limit=1`;

  try {
    const response = await axios.get(endpoint);
    const data = response.data;

    if (data.features && data.features.length > 0) {
      const place = data.features[0];
      const name = place.place_name;
      const [longitude, latitude] = place.center;
      
      const isInside = isPointInBuffer(longitude, latitude);
        if(isInside === false){
  
            showPopup("Click is outside of the radius" , false);
            return; 
        }

      if (isSource === true) {
        // Remove the old marker if it exists
        if (sourceMarker) {
          sourceMarker.remove();
          console.log("marker is removed");
        }

        // Add marker and center the map
        sourceMarker = new mapboxgl.Marker({ color: "green" })
          .setLngLat([longitude, latitude])
          .addTo(map);

        map.flyTo({ center: [longitude, latitude], zoom: 12 });
        saveCoordinates("source", latitude, longitude);
        inputCurrentLocation.value = name;
        currentLocation.innerHTML = "";
        sourceSearchBtn.style.color = "#919191";

        //change pin color
        turnOnSourcePin();
      } else {
        // Remove the old marker if it exists
        if (destinationMarker) {
          destinationMarker.remove();
          console.log("marker is removed");
        }
        // Add marker and center the map
        destinationMarker = new mapboxgl.Marker({ color: "red" })
          .setLngLat([longitude, latitude])
          .addTo(map);

        map.flyTo({ center: [longitude, latitude], zoom: 12 });
        saveCoordinates("destination", latitude, longitude);
        inputDestinationLocation.value = name;
        destinationLocation.innerHTML = "";
        destSearchBtn.style.color = "#919191";

        //change pin color
        turnOnDestPin();
      }

      sendsearchInfo();
      defaultLocationMarkerInfo();
    } else {
      showPopup("No results found.", false);
    }
  } catch (error) {
    console.error(error);
    showPopup("No results found.", false);
  }
}

async function getAdress(lng, lat) {
  const reverseGeocodeUrl = `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${mapboxgl.accessToken}`;

  try {
    const response = await fetch(reverseGeocodeUrl);
    const data = await response.json();
    const address = data.features[0].place_name;
    return address;
  } catch (error) {
    console.log(error);
    return null;
  }
}

function redrawCoords() {
  //draw routes
  if (!storedListRoutes || storedListRoutes.length === 0) return;

  storedListRoutes.forEach((route, index) => {
    console.log(`Drawing route ${index}:`, route);
    loadMiniRoutes(route.drawableCoords, route.travelMethod, index, "blue");
  });
  // walking routes
  console.log("Walking coords [in: redrawCoords ] : ", walkingCoords);

  loadMiniRoutes(walkingCoords, "Walk", `W${2}`, "blue");
  const finalCoords = walkingCoords.flat();
  zoomRoute(finalCoords);
}

async function getAccurateWalkCoords(
  source_lat,
  source_long,
  dest_lat,
  dest_long,
  routeCoords
) {
  const walkCoords = await getWalkCoordinates(
    source_lat,
    source_long,
    dest_lat,
    dest_long
  );

  const routeLine = turf.lineString(routeCoords);
  const walkingLine = turf.lineString(JSON.parse(walkCoords));

  // Get intersection points
  const intersections = turf.lineIntersect(routeLine, walkingLine);

  // Check if there's an intersection
  if (intersections.features.length === 0) {
    console.log("No intersection found.");
    return JSON.parse(walkCoords);
  }

  const firstIntersection = intersections.features[0].geometry.coordinates;
  console.log("First intersection:", firstIntersection);

  const walkCoords2 = await getWalkCoordinates(
    source_lat,
    source_long,
    firstIntersection[1],
    firstIntersection[0]
  );

  if (walkCoords2.length === 0) {
    console.log("Could not form the second coordinates");
    return JSON.parse(walkCoords);
  }

  return JSON.parse(walkCoords2);
}

function getProvince(address) {
  //check if address is not empty
  if (address.length <= 0) {
    console.log("The address is empty");
    return;
  }
  //split the address
  const cleanedAddress = address.replace(/\d+/g, "").trim();
  const wordsInString = cleanedAddress
    .split(",")
    .map((word) => word.trim().toLowerCase());
  let selectedProv = "";
  const containsProv = listOfProvinces.some((province) => {
    const check = wordsInString.includes(province.trim().toLowerCase());
    if (check) {
      selectedProv = province;
    }
    return check;
  });

  return { containsProv: containsProv, province: selectedProv };
}

async function fetchSuggestions(suggestions, query) {
  if (!query) {
    suggestions.innerHTML = ""; // Clear suggestions if input is empty
    return;
  }

  const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
    query
  )}.json?access_token=${mapboxgl.accessToken}&autocomplete=true&limit=10`;
  try {
    const response = await fetch(url);
    const data = await response.json();

    if (suggestions == currentLocation) {
      destinationLocation.innerHTML = "";
    } else {
      currentLocation.innerHTML = "";
    }
    // Populate the dropdown with suggestions
    suggestions.innerHTML = "";
    if (data.features.length > 0) {
      data.features.forEach((feature) => {
        const li = document.createElement("li");
        li.textContent = feature.place_name;
        li.style.padding = "10px";
        li.style.cursor = "pointer";

        // On click, set the map view to the selected location
        li.addEventListener("click", () => {
          const [longitude, latitude] = feature.center;
          const isInside = isPointInBuffer(longitude, latitude);

          if(isInside === false){
            showPopup("Click is outside of the radius" , false);
            return; 
          }


          console.log("Selected coordinates:", longitude, latitude);

          if (currentLocation === suggestions) {
            // Remove the old marker if it exists
            if (sourceMarker) {
              sourceMarker.remove();
              console.log("marker is removed");
            }

            // Add marker and center the map
            sourceMarker = new mapboxgl.Marker({ color: "green" })
              .setLngLat([longitude, latitude])
              .addTo(map);

            map.flyTo({ center: [longitude, latitude], zoom: 12 });

            saveCoordinates("source", latitude, longitude);
            inputCurrentLocation.value = li.textContent;
            suggestions.innerHTML = "";
            sourceSearchBtn.style.color = "#919191";
            sendsearchInfo();
            defaultLocationMarkerInfo();

            //change pin color
            turnOnSourcePin();

          } else if (destinationLocation === suggestions) {
            // Remove the old marker if it exists
            if (destinationMarker) {
              destinationMarker.remove();
              console.log("marker is removed");
            }

            // Add marker and center the map
            destinationMarker = new mapboxgl.Marker({ color: "red" })
              .setLngLat([longitude, latitude])
              .addTo(map);

            map.flyTo({ center: [longitude, latitude], zoom: 12 });

            saveCoordinates("destination", latitude, longitude);
            inputDestinationLocation.value = li.textContent;
            suggestions.innerHTML = "";
            destSearchBtn.style.color = "#919191";
            sendsearchInfo();
            defaultLocationMarkerInfo();

            //change pin color
            turnOnDestPin();

          } else {
            console.error("There was no marker chosen or valid ");
          }
        });

        suggestions.appendChild(li);
      });
    }
  } catch (error) {
    console.error("Error fetching suggestions:", error);
  }
}

//cancel menu management
function openCancelMenu() {
  cancelContextMenu.style.visibility = "visible";
}

function closeCancelMenu() {
  cancelContextMenu.style.visibility = "hidden";
}

//confirmation manu management
function defaultRetreat() {
  if (toggleMap.get("from") === 1) {
    // retreat from source
    fromToggleBtn.style.backgroundColor = "white";
    fromToggleBtn.style.color = "black";
    toggleMap.set("from", 0);
  }

  if (toggleMap.get("to") === 1) {
    //retreat from destination
    toToggleBtn.style.backgroundColor = "white";
    toToggleBtn.style.color = "black";
    toggleMap.set("to", 0);
  }
}

function closeConfirmationMenu() {
  confirmationContextMenu.style.visibility = "hidden";
  isOpen_confirmationMenu = false;
  isYes = false;
}

function openConfirmationMenu() {
  confirmationContextMenu.style.visibility = "visible";
  isOpen_confirmationMenu = true;
}

function saveCoordinates(indicator, lat, long) {
  if (indicator === "source") {
    //insert source information
    sourceCoordinates.latitude = lat;
    sourceCoordinates.longitude = long;
  } else {
    //insert destination information
    destinationCoordinates.latitude = lat;
    destinationCoordinates.longitude = long;
  }
}

function saveLocationMarkerInfo(lng, lat, address) {
  confirmationMenu_longitude = lng;
  confirmationMenu_latitude = lat;
  confirmationMenu_adresss = address;
}
function isLocationInfoAvailable() {
  return (
    confirmationMenu_longitude > -500 &&
    confirmationMenu_latitude > -500 &&
    confirmationMenu_adresss.length > 0
  );
}

function defaultLocationMarkerInfo() {
  confirmationMenu_longitude = -500;
  confirmationMenu_latitude = -500;
  confirmationMenu_adresss = "";
}

//Marker functions
function placeMarker(lng, lat, address) {
  if (isOpen_confirmationMenu === true) {
    if (isYes === true) {
      if (toggleMap.get("from") === 1) {
        if (sourceMarker) {
          sourceMarker.remove();
          console.log("marker is removed");
        }

        // Add marker and center the map
        sourceMarker = new mapboxgl.Marker({ color: "green" })
          .setLngLat([lng, lat])
          .addTo(map);

        map.flyTo({ center: [lng, lat], zoom: 12 });

        //insert in input
        inputCurrentLocation.value = address;

        //save coordinates to send to backend at the appropriate time
        saveCoordinates("source", lat, lng);

        //set back to defaault
        defaultRetreat();
        noDisturbance = true;

        //source pin switch on
        turnOnSourcePin();
      } else if (toggleMap.get("to") === 1) {
        // Remove the old marker if it exists
        if (destinationMarker) {
          destinationMarker.remove();
          console.log("marker is removed");
        }

        // Add marker and center the map
        destinationMarker = new mapboxgl.Marker({ color: "red" })
          .setLngLat([lng, lat])
          .addTo(map);

        map.flyTo({ center: [lng, lat], zoom: 12 });

        //insert in input
        inputDestinationLocation.value = address;

        //save coordinates to send to backend at the appropriate time
        saveCoordinates("destination", lat, lng);

        //reverse toggle map value
        defaultRetreat();
        noDisturbance = true;

        //destination pin switch on
        turnOnDestPin();
      }

      // check to send data to backend
      sendsearchInfo();
    }
  }
}

function removeGeneralMarker() {
  if (generalMarkerCollector.length === 0) return;

  generalMarkerCollector.forEach((marker) => {
    marker.remove();
  });
}

function placeMarkerGeneral(
  lng,
  lat,
  type,
  imageTxt,
  message,
  msg_currentLocation,
  msg_nextLocation
) {
  let newMarker;
  const emojiMarker = document.createElement("div");
  emojiMarker.className = "custom-mapbox";
  emojiMarker.innerHTML = imageTxt;

  const popupContent = `
  <div class="message">
      <div class="main">${message}</div>
      <p class="currentLocation"> <strong>Current Location : </strong>${msg_currentLocation}</p>
      <p class ="nextLocation"> <strong>Next Location : </strong>${msg_nextLocation}</p>
  </div>
`;

  if (type === "start") {
    //change emoji
    emojiMarker.style.setProperty("--marker-color", "#27548A");
  } else if (type === "stop") {
    //Drop off point
    emojiMarker.style.setProperty("--marker-color", "#00CED1");
  } else {
    //Transition
    emojiMarker.style.setProperty("--marker-color", "#F0F4F7");
  }

  // Add Marker
  newMarker = new mapboxgl.Marker({ element: emojiMarker, anchor: "bottom" }) // Adjust based on pin height
    .setLngLat([lng, lat])
    .setPopup(new mapboxgl.Popup().setHTML(popupContent))
    .addTo(map);

  //add to collector
  if (newMarker) generalMarkerCollector.push(newMarker);
}

function allMarkersPlaced() {
  return sourceMarker != null && destinationMarker != null;
}

function ExecutePriceToggleBtn() {
  const toggle = document.getElementById("toggle");
  toggle.classList.toggle("active");

  // If you want to change labels dynamically, you can do this:
  const offPriceLabel = document.querySelector(".price-off");
  const onPriceLabel = document.querySelector(".price-on");

  if (toggle.classList.contains("active")) {
    offPriceLabel.style.opacity = "0.5"; // Dim Taxi label
    onPriceLabel.style.opacity = "1"; // Highlight Walk label
    removeCheck();
    toggleCheck = true;
    if (storedListRoutes) {
      //remove existing
      removeExistingRoutes();
      //insert new
      storedListRoutes.forEach((route, index) => {
        console.log(`Drawing route ${index}:`, route);

        loadMiniRoutes(
          route.drawableCoords,
          route.travelMethod,
          index,
          priceColors[index]
        );
      });
    } else {
      console.error("listRoutes stored is null");
    }
  } else {
    offPriceLabel.style.opacity = "1"; // Highlight Taxi label
    onPriceLabel.style.opacity = "0.5"; // Dim Walk label
    removeExistingRoutes();
    redrawCoords();
    toggleCheck = false;
  }
}

async function areaFilterToggleBtn() {
  const toggle = document.getElementById("areatoggle");
  toggle.classList.toggle("active");

  if (toggle.classList.contains("active")) {
    console.log("We are on");
    showBufferHighlight();
  } else {
    hideBufferHighlight();
  }
}

// Function to buffer routes and add to the map

function addBufferedRoutesToMap(routes, bufferRadiusKm = 2) {

  if(!mergedBufferFeature || mergedBufferFeature === null){
const geoReader = new jsts.io.GeoJSONReader();
  const geoWriter = new jsts.io.GeoJSONWriter();

  let unionGeometry = null;
  for (let i = 0; i < routes.length; i++) {
    const coords = routes[i];
    if (!coords || coords.length < 2) continue;

    const line = turf.lineString(coords);
    const buffer = turf.buffer(line, bufferRadiusKm, { units: "kilometers" });

    const jstsBuffer = geoReader.read(buffer.geometry);

    if (!unionGeometry) {
      unionGeometry = jstsBuffer;
    } else {
      unionGeometry = unionGeometry.union(jstsBuffer); // Accurately unions without loss
    }
  }

  if (!unionGeometry) {
    console.warn("Nothing to show. Buffer union failed or input was empty.");
    return;
  }

  // Convert final unioned geometry back to Turf format
   mergedBufferFeature = {
    type: "Feature",
    geometry: geoWriter.write(unionGeometry),
    properties: {},
  };
  }
  
  const bufferGeoJSON = {
    type: "FeatureCollection",
    features: [mergedBufferFeature],
  };

  // Mapbox: Add or update source
  if (!map.getSource("route-buffer")) {
    map.addSource("route-buffer", {
      type: "geojson",
      data: bufferGeoJSON,
    });
  } else {
    map.getSource("route-buffer").setData(bufferGeoJSON);
  }

  // Mapbox: Add or update layer
  if (!map.getLayer("buffer-layer")) {
    map.addLayer({
      id: "buffer-layer",
      type: "fill",
      source: "route-buffer",
      layout: {},
      paint: {
        "fill-color": "#0074D9",
        "fill-opacity": 0,
        "fill-outline-color": "#005299",
      },
    });
  }
}

// Function to show the highlight (make the buffer visible)
function showBufferHighlight() {
  if (map.getLayer("buffer-layer")) {
    map.setPaintProperty("buffer-layer", "fill-opacity", 0.3);
  }
}

// Function to hide the highlight (keep it clickable but invisible)
function hideBufferHighlight() {
  if (map.getLayer("buffer-layer")) {
    map.setPaintProperty("buffer-layer", "fill-opacity", 0);
  }
}

// Example usage from HighlightMap()
async function HighlightMap() {
  try {
    const response = await axios.get(
      "http://localhost:3000/client/listOfAllRoutes",
  {
    withCredentials: true
  }
    );
    const resultInfo = response.data.routes;

    let listOfRoutes = [];
    resultInfo.forEach((currentroute) => {
      listOfRoutes.push(currentroute.coords);
    });

    addBufferedRoutesToMap(listOfRoutes);

    // Optional: auto-hide highlight after a few seconds
    // hideBufferHighlight();
  } catch (error) {
    console.log(error);
  }
}

function isPointInBuffer(lng, lat) {
  const point = turf.point([lng, lat]);
  if(!mergedBufferFeature || mergedBufferFeature === null){
    console.error("Buffer does not exist");
  }
  return turf.booleanPointInPolygon(point, mergedBufferFeature);
}

//creating routes

function loadMiniRoutes(miniroutes, travelMethod, fIndex, color) {
  miniroutes.forEach((route, index) => {
    console.log(`route in loadMiniRoutes ${fIndex}`);
    const routeSourceId = `route-source-${fIndex}-${index}`;
    const routeLayerId = `route-line-${fIndex}-${index}`;

    if (!Array.isArray(route) || route.length === 0) {
      console.error(`Invalid coordinates for route ${index}:`, route);
      return;
    }

    // Remove existing source and layer if they exist
    if (map.getSource(routeSourceId)) {
      map.removeLayer(routeLayerId);
      map.removeSource(routeSourceId);
    }

    // Convert to GeoJSON
    const routeFeatures = {
      type: "Feature",
      properties: {},
      geometry: {
        type: "LineString",
        coordinates: route,
      },
    };

    // Add the source
    map.addSource(routeSourceId, {
      type: "geojson",
      data: {
        type: "FeatureCollection",
        features: [routeFeatures],
      },
    });

    // Choose line styling
    let paintOption =
      travelMethod === "Walk"
        ? {
            "line-color": "#FF0000",
            "line-width": 4,
            "line-dasharray": [0, 2],
          }
        : {
            "line-color": color,
            "line-width": 4,
          };

    // Add the layer
    map.addLayer({
      id: routeLayerId,
      type: "line",
      source: routeSourceId,
      layout: {
        "line-cap": "round",
        "line-join": "round",
      },
      paint: paintOption,
    });
  });
}

function removeExistingRoutes() {
  if (!map.getStyle() || !map.getStyle().layers) return;

  // Get all layers and sources in the map
  const layers = map.getStyle().layers.map((layer) => layer.id);

  layers.forEach((layerId) => {
    if (layerId.startsWith("route-line-")) {
      map.removeLayer(layerId);
    }
  });

  // Get all sources and remove those related to routes
  Object.keys(map.getStyle().sources).forEach((sourceId) => {
    if (sourceId.startsWith("route-source-")) {
      map.removeSource(sourceId);
    }
  });
}

function zoomRoute(coordinates) {
  // Get the bounds of the route
  const bounds = coordinates.reduce((bounds, coord) => {
    return bounds.extend(coord);
  }, new mapboxgl.LngLatBounds(coordinates[0], coordinates[1]));

  // Fit the map to the bounds
  map.fitBounds(bounds, {
    padding: 50, // Add some padding around the route
    maxZoom: 15, // Set a max zoom level to avoid excessive zoom-in
    duration: 2000, // Smooth animation duration in milliseconds
  });
}

//managing route prices
function createPricerow(routeID, price, color) {
  // Select existing lists
  const rightPriceList = document.querySelector(".list_right ul");
  const leftPriceList = document.querySelector(".list_left ul");

  // Create the right row (Route ID)
  const rightRowPrice = document.createElement("li");
  rightRowPrice.className = "rightPriceRow";

  const circle = document.createElement("div");
  circle.className = "route_circle";
  circle.style.backgroundColor = color;

  rightRowPrice.appendChild(circle);
  rightRowPrice.appendChild(document.createTextNode(` ${routeID}`)); // Ensure spacing

  // Create the left row (Price)
  const leftRowPrice = document.createElement("li");
  leftRowPrice.className = "leftPriceRow";
  leftRowPrice.textContent = color === "red" ? "walk" : `R${price}`;

  // Append rows to their respective lists
  rightPriceList.appendChild(rightRowPrice);
  leftPriceList.appendChild(leftRowPrice);

  // Update total sum
  let sumOfPrices = parseInt(
    document
      .querySelector(".total_price p:last-child")
      .textContent.replace("R", ""),
    10
  );
  sumOfPrices += parseInt(price, 10);
  document.querySelector(
    ".total_price p:last-child"
  ).textContent = `R${sumOfPrices}`;
}

function removeAllPrices() {
  const allRightPriceRow = document.querySelectorAll(".rightPriceRow");
  const allLeftPriceRow = document.querySelectorAll(".leftPriceRow");

  if (allRightPriceRow) {
    allRightPriceRow.forEach((row) => {
      row.remove();
    });
  }

  if (allLeftPriceRow) {
    allLeftPriceRow.forEach((row) => {
      row.remove();
    });
  }

  //default total
  document.querySelector(".total_price p:last-child").textContent = `R${0}`;
}

//managing directions
function createDirections(name, color, ID) {
  const directionButton = document.createElement("button");
  directionButton.className = "direction_button";
  directionButton.textContent = name;
  directionButton.id = ID;
  directionButton.backgroundColor = color;
  directionContainer.appendChild(directionButton);
}

function removeAllDirectionBtns() {
  const directionButtons = document.querySelectorAll(".direction_button");
  if (directionButtons) {
    directionButtons.forEach((button) => {
      button.remove();
    });
  }
}

async function movement(coordinates, color) {
  //Animation implementation
  if (movementExists === false) {
    incomingMovement = false;
  }

  movementExists = true;
  if (!coordinates) {
    console.log("Coordinates are empty or null [In :movement function]");
    return;
  }

  if (incomingMovement) {
    return;
  }
  const movementCoordinates = smoothenCoordinates(coordinates);

  removeExistingObject();

  console.log("directions coords of the chosen mode[in movement]  : " ,movementCoordinates );
  // Add a moving taxi marker
  taxiMarker = new mapboxgl.Marker({ element: createTaxiElement(color) })
    .setLngLat(movementCoordinates[0]) // Start at first point
    .addTo(map);

  // Animate the taxi along the route
  let index = 0;
  function moveTaxi() {
    if (taxiMarker === null) return;
    if (index < movementCoordinates.length - 1) {
      if (index === movementCoordinates.length - 2) {
        index = 0;
      } else {
        index++;
      }
      taxiMarker.setLngLat(movementCoordinates[index]);
      moveTimer = setTimeout(moveTaxi, 200); // Adjust speed (1000ms = 1 sec per step)
    }
  }

  moveTaxi(); // Start animation
}

function smoothenCoordinates(coordinates) {
  // Convert to a Turf.js LineString
  const line = turf.lineString(coordinates);

  // Calculate the total length of the route in kilometers
  const lineLength = turf.length(line, { units: "kilometers" });

  // Define the number of points you want to generate
  const numberOfPoints = 1000; // More points = smoother animation

  // Calculate interval distance
  const interval = lineLength / numberOfPoints;

  // Generate evenly spaced points along the route
  const smoothCoordinates = [];
  for (let i = 0; i <= lineLength; i += interval) {
    const interpolatedPoint = turf.along(line, i, { units: "kilometers" });
    smoothCoordinates.push(interpolatedPoint.geometry.coordinates);
  }

  return smoothCoordinates;
}

function removeExistingObject() {
  // STOP previous animation and REMOVE previous marker
  if (moveTimer) {
    clearTimeout(moveTimer); // stop animation loop
    moveTimer = null;
  }

  if (taxiMarker !== null) {
    taxiMarker.remove(); // remove from map
    taxiMarker = null; // clear reference
  }
}

function createTaxiElement(color) {
  const el = document.createElement("div");
  el.classList.add("movingDirectionCircle");
  el.style.width = "20px";
  el.style.height = "20px";
  el.style.backgroundColor = color;
  el.style.backgroundSize = "cover";
  el.style.border = "2px solid red";
  el.style.borderRadius = "50%"; // Optional: make it round
  return el;
}

function RemoveTaxiMarker() {
  if (taxiMarker) {
    taxiMarker.remove();
    taxiMarker = null;
    return true;
  }

  return false;
}
//Direction calculations

// Function to find matching segments between full path and direction path
function getMatchingSegments(fullPath, directionPath, tolerance = 0.0001) {
  let matchingSegments = [];

  for (let i = 0; i < fullPath.length - 1; i++) {
    let segmentStart = fullPath[i];
    let segmentEnd = fullPath[i + 1];

    for (let j = 0; j < directionPath.length - 1; j++) {
      let dirStart = directionPath[j];
      let dirEnd = directionPath[j + 1];

      if (
        areSegmentsClose(segmentStart, segmentEnd, dirStart, dirEnd, tolerance)
      ) {
        matchingSegments.push([segmentStart, segmentEnd]);
        break;
      }
    }
  }

  return matchingSegments;
}

// Helper function to check if two line segments are close
function areSegmentsClose(a1, a2, b1, b2, tolerance) {
  return (
    (distance(a1, b1) < tolerance && distance(a2, b2) < tolerance) ||
    (distance(a1, b2) < tolerance && distance(a2, b1) < tolerance)
  );
}

async function getWalkCoordinates(
  startCoordsLat,
  startCoordsLong,
  destCoordsLat,
  destCoordsLong
) {
  const url = `https://api.mapbox.com/directions/v5/mapbox/walking/${startCoordsLong},${startCoordsLat};${destCoordsLong},${destCoordsLat}?geometries=geojson&access_token=${accessToken}`;

  try {
    const response = await axios.get(url);

    // Check if the response contains the expected data
    if (!response.data.routes || response.data.routes.length === 0) {
      console.error("Error: No routes found in API response", response.data);
      return null; // Return null or handle the case accordingly
    }

    let array = [];
    const route = response.data.routes[0].geometry.coordinates;
    array.push(JSON.stringify(route));
    console.log("Route:", array);
    return array;
  } catch (error) {
    console.error("Error fetching route:", error);
    return null;
  }
}

// Function to calculate distance between two coordinates
function distance(coord1, coord2) {
  let [lon1, lat1] = coord1;
  let [lon2, lat2] = coord2;
  return Math.sqrt(Math.pow(lon2 - lon1, 2) + Math.pow(lat2 - lat1, 2));
}

function removeCheck() {
  let selectedStyle = document.querySelector('input[name="type"]:checked');
  if (selectedStyle) {
    selectedStyle.checked = false;
  }
}

//Managing text directions

// Create a single text node element
function createTextNode(text, showArrow, markerColor, emoji) {
  const textNode = document.createElement("div");
  textNode.classList.add("text-node");

  const emojiMarker = document.createElement("div");
  emojiMarker.classList.add("custom-mapbox");
  emojiMarker.innerHTML = emoji;
  emojiMarker.style.setProperty("--marker-color", markerColor);

  const textDir = document.createElement("div");
  textDir.classList.add("textDir", "bubble");
  textDir.textContent = text;

  textNode.appendChild(emojiMarker);
  textNode.appendChild(textDir);

  if (showArrow === true) {
    const arrowIcon = document.createElement("i");
    arrowIcon.className = "far fa-arrow-alt-circle-down";
    arrowIcon.style.fontSize = "32px";
    textNode.appendChild(arrowIcon);
  }

  return textNode;
}

// Create the whole text map container
function createTextMapContainer(listOfAdresses, isDefault) {
  const container = document.createElement("div");
  container.id = "text-map";

  console.log("List : ", listOfAdresses);
  for (let i = 0; i < listOfAdresses.length; i++) {
    // Hide arrow in last node
    console.log("Im here");
    const showArrow = i !== listOfAdresses.length - 1;
    let textNode = null;
    if (i == 0 && isDefault == false) {
      textNode = createTextNode(listOfAdresses[i], showArrow, "#27548A", "👆");
    } else if (i == 0 && isDefault == true) {
      textNode = createTextNode(listOfAdresses[i], showArrow, "red", "ER");
    } else if (i == listOfAdresses.length - 1) {
      textNode = createTextNode(listOfAdresses[i], showArrow, "#00CED1", "🛑");
    } else {
      textNode = createTextNode(listOfAdresses[i], showArrow, "#F0F4F7", ">>");
    }

    container.appendChild(textNode);
  }

  return container;
}

function removeTextDirections() {
  const container = document.getElementById("text-map");
  if (container) {
    container.innerHTML = ""; // This removes all child elements inside
  }

  container.remove();
}
