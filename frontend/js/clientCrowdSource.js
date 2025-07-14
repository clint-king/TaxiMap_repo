import  axios  from 'axios';
import popup from "./popup.js";
 // === DOM ELEMENTS ===

 //label section
  const routeNumber = document.querySelector("#routeId");

 //TaxiRank input section 
 const taxiRInputContainer = document.querySelector(".taxiRInput_container");
 const routeSelect = document.getElementById('routeType');
 const startingTRList = document.querySelector(".inputcontainer.startingInput ul");
 const destTRList = document.querySelector(".inputcontainer.destInput ul");
 const startingTRInput = document.querySelector(".inputcontainer.startingInput input");
 const destTRInput = document.querySelector(".inputcontainer.destInput input");
 const startingTRButton = document.querySelector(".group1 button");
 const destTRButton = document.querySelector(".group2 button");
 const drawBar = document.querySelector(".draw_flag");
 const drawBarText = document.querySelector(".draw_flag span")
 const saveTRInfo = document.querySelector(".saveSession");
 const routeInfoCover = document.querySelector(".routeInfoContainerCover");
 const taxiRankInfoCover = document.querySelector(".sessionInfoContainerCover");
 const sendButton = document.querySelector(".sendBtn");


 //context menu
 const menu = document.querySelector(".menu_wrapper");
 const closeButton = document.querySelector("#close_button");
 const updateButton = document.querySelector('#update_button');
 const searchBox = document.querySelector('.input_line.address textarea');
 const nameBox = document.querySelector('.input_line.name input');
 const provBox = document.querySelector('.input_line.prov input');
 const suggestions = document.getElementById('suggestions');

 //Final Marker context menu
 const finalMarkerMenu = document.querySelector(".menu.finalMarker");
 const cancelBtnfinalMenu = document.querySelector(".menu.finalMarker .close_button")
 const yesBtn = document.querySelector(".menu.finalMarker .btn.yes");
 const noBtn = document.querySelector(".menu.finalMarker .btn.no");

  //Edit Marker context menu
 const editMarkerMenu = document.querySelector(".menu.editMarker");
 const cancelBtnEditMenu = document.querySelector(".menu.editMarker .close_button")
 const editYesBtn = document.querySelector(".menu.editMarker .btn.yes");
 const editNoBtn = document.querySelector(".menu.editMarker .btn.no");

 

 // listmenu 
 const listmenu = document.querySelector(".listmenu");
 const closeButtonListmenu = document.querySelector(".listmenu .close_button");
 const editbtnListMenu = document.querySelector(".btnMenu.Edit");
 const removebtnListMenu = document.querySelector(".btnMenu.Remove");

 //Value for slider
const slider = document.getElementById("priceRange");
const selectedPrice = document.getElementById("selectedPrice");

//message 
const messageTextArea = document.querySelector(".sendBtn");

 // Route adding section
const routeCancelButton = document.querySelector(".routeButton");
const routeAddButton = document.querySelector(".add_button") ;

 //=== CLASSES  ===

 class Route{
   name;
   listOfCoords;
   message;


   constructor(name ){
    this.name = name;
  
   }

   AddMessage(message){
    this.message = message;
   }
  
   AddRouteCoords(listOfCoords){
    if(listOfCoords.length === 0) return false;
    this.listOfCoords = listOfCoords;
    return true;
   }

    RoutePrint(){
    return ` name: ${this.name} , message : ${this.message} , listOfCoords : ${this.listOfCoords}`;
  }


 }

 class TaxiRank{
  ID = Infinity;
  name;
  province;
  address;
  num_routes;
  isNew;
  coord = {longitude:Infinity , latitude:Infinity};


  constructor(name , province , address , num_routes , longitude , latitude  ,  isNew , ID){
    this.name = name;
    this.province = province;
    this.address = address;
    this.num_routes = num_routes;
    this.coord.longitude = longitude;
    this.coord.latitude = latitude;
    this.isNew = isNew;

    if(isNew === false){
      this.ID = ID;
    }

  }

  TaxiRankPrint(){
    return `ID: ${this.ID}  , name: ${this.name} , province: ${this.province} , address: ${this.address} , num_routes: ${this.num_routes} , isNew: ${this.isNew} , coord_longitude: ${this.coord.longitude} , coord_latitude: ${this.coord.latitude} `;
  }

 }

 let routeObj = new Route("1");

 
//=== VARIABLES ===
let coords = [];
let routeCoordinates = [];
let directionSession = false;
let isStraightChosen = true;
let routeMarkers = [];
let listOfRoutes = [];
let saveButtonActive = false;
let routeCount = 1;
let isLoopRoutefinished = false;
let isStartingMarkerListining = true;

let colors = ["#EBA9B7" , "#BCF9F9", "#F9E1BC" , "#C1F9BC" , "#A9C6EB"];
let currentColor = colors[0];

//edit
let globalMarkerBehind = null;
let globalMarkerFoward = null;
let newDraggableMarker = null;
//removal of markers
let markerChosenForRemoval =null;
let markerChosenForEditing = null;

 //label section
 let labelNumber = 1;

 //TaxiRank input section 
  let gr2HasbeenRemoved = false;
  let taxiRanks = []; // Store fetched taxi ranks
  let startingTaxiRMarker = null;
  let destTaxiRMarker = null;
  let createdStartTaxiRank = null;
  let createdDestTaxiRank= null;
  let contextMenuDetection = {
    startingTR:false,
    destTR:false,
  }

  //context menu
  let chosenTRCreation = {none:true , starting:false , dest:false};

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


  map.on('load', () => {
    

    map.on('click', async (e) => {
      const lngLat = [e.lngLat.lng, e.lngLat.lat];
      
      const longitude = lngLat[0];
      const latitude = lngLat[1];
    
      //check if the state of the application to enable the right clicking
      if(isMarkersPlaced() && saveButtonActive === true){
        directionSession = true;
      }


      if(chosenTRCreation.starting === true || chosenTRCreation.dest === true){

        //ffff
        const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${longitude},${latitude}.json?access_token=${accessToken}`;
        

  try {
    const response = await axios.get(url);
    const address = response.data.features[0]?.place_name;
    console.log('Address:', address);
  
           //context menu processing
      if(chosenTRCreation.starting === true){

        // Remove the old marker if it exists
       if (startingTaxiRMarker) {
        startingTaxiRMarker.remove();
        console.log("marker is removed");
      }


      //remove existing route 
            if(routeExists()){
              removeRouteAndMarker();
            }


          // Add marker and center the map
         startingTaxiRMarker =  new mapboxgl.Marker({color:"green"})
            .setLngLat([longitude, latitude])
            .addTo(map);

          map.flyTo({ center: [longitude, latitude], zoom: 12 });

          //add to coords 
          if(!replaceInCoords(0 , [longitude, latitude])){
            coords.push([longitude, latitude]);
          }
          
          // Clear suggestions and update input value
          searchBox.value =address;
          suggestions.innerHTML = '';
          console.log("starting is clicked , coords array : " , coords);

      }else if(chosenTRCreation.dest === true){

        if (destTaxiRMarker) {
        destTaxiRMarker.remove();
        console.log("marker is removed");
        }

          //remove existing route 
            if(routeExists()){
              removeRouteAndMarker();
            }
          // Add marker and center the map
         destTaxiRMarker =  new mapboxgl.Marker({color:"red"})
            .setLngLat([longitude, latitude])
            .addTo(map);

          map.flyTo({ center: [longitude, latitude], zoom: 12 });

          //add to coords 
          if(!replaceInCoords(1 , [longitude, latitude])){
            coords[1] = [longitude, latitude];
          }

          // Clear suggestions and update input value
           searchBox.value =address;
          suggestions.innerHTML = '';
          console.log("dest is clicked , coords array : " , coords);
      }


      } catch (error) {
    console.error('Error:', error);
    return null;
  }
      }else if(directionSession){

        if(isLoopRoutefinished){
          popup.showSuccessPopup("The route has ended" , false);
          return;
        }

      //START direction clicking
      coords.push(lngLat);

      

      let previous, current;
    
      if (coords.length === 2) {
        // First connection: point 1 → point 2
        previous = coords[0];
        current = coords[1];
        if( isStraightChosen === false){
        routeCoordinates.length = 0; // reset previous route
        routeCoordinates.push(previous);
        }
      } else if (coords.length === 3 && isStraightChosen === true) {
        // Replace route: point 1 → point 3
        previous = coords[0];
        current = coords[2];
        routeCoordinates.length = 0; // reset previous route
        routeCoordinates.push(previous);
      } else if (coords.length > 3 || (coords.length === 3 && isStraightChosen === false)) {
        // Continue from last added point
        previous = coords[coords.length - 2];
        current = coords[coords.length - 1];
      }
    
      if (previous && current) {
        const coordPair = `${previous.join(',')};${current.join(',')}`;
        const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${coordPair}?geometries=geojson&access_token=${accessToken}`;
    
        const response = await fetch(url);
        const data = await response.json();
        const segment = data.routes[0].geometry;
    
        if (coords.length === 3 || (coords.length === 2 && isStraightChosen === false)) {
          routeCoordinates.push(...segment.coordinates.slice(1)); // skip duplicate
        } else if (coords.length > 3) {
          routeCoordinates.push(...segment.coordinates.slice(1));
        }

        updateRouteOnMap({
          type: 'LineString',
          coordinates: routeCoordinates
        });
        
        //make sure this is alway after updateRouteOnMap
        createCustomPointMarker(lngLat);
      }

     
      if(startingTaxiRMarker)  console.log("Coords starting marker : " , [startingTaxiRMarker.getLngLat().lng , startingTaxiRMarker.getLngLat().lat ]);
      if(destTaxiRMarker) console.log("Coords ending marker : " , [destTaxiRMarker.getLngLat().lng , destTaxiRMarker.getLngLat().lat ]);
      if(routeMarkers.length > 0) console.log("routeMarkers : " , routeMarkers);
      console.log("Coords array : ", coords);
   //END OF direction clicking
      }
      

    });
  });

// === EVENT LISTENERS ====
 routeSelect.addEventListener('change', function () {
    const selectedValue = this.value;

    if (selectedValue === 'Straight') {
      if(gr2HasbeenRemoved === true){
        resuscitateTaxiRInputGroup2();
        gr2HasbeenRemoved = false;
      }

      //decides how to process route drawing 
       isStraightChosen = true;
    } else if (selectedValue === 'Loop') {
      gr2HasbeenRemoved = true;
      removeTaxiRInputGroup2();

      //remove dest marker if it exists
        if (destTaxiRMarker) {
        destTaxiRMarker.remove();
        console.log("marker is removed");
      }
      //decides how to process route drawing 
      isStraightChosen = false;
    }
  });


//listening for the the
// addClickListenerToMarker(startingTaxiRMarker, () => {
//   console.log('Starting Taxi Rank Marker clicked!');
// });



//edit menu
cancelBtnEditMenu.addEventListener("click" , ()=>{
closeEditMarkerMenu();
});

editNoBtn.addEventListener("click" , ()=>{
  closeEditMarkerMenu();
});

editYesBtn.addEventListener("click" , ()=>{
recreateRouteAfterEdit();
});

//slider 
slider.addEventListener("input", function() {
    selectedPrice.textContent = slider.value;
}); 

  destTRInput.addEventListener("input", () => {
    if(taxiRanks.length === 0){
      fetchTaxiRanks();
    }

    showSuggestions(destTRInput.value , false);
});

 startingTRInput.addEventListener("input", () => {
   if(taxiRanks.length === 0){
      fetchTaxiRanks();
    }

    showSuggestions(startingTRInput.value , true);
});

startingTRButton.addEventListener("click" , ()=>{
menu.style.visibility = "visible";

chosenTRCreation.starting = true;
chosenTRCreation.none = false;
chosenTRCreation.dest = false;
});

destTRButton.addEventListener("click" , ()=>{
menu.style.visibility = "visible";

chosenTRCreation.starting = false;
chosenTRCreation.none = false;
chosenTRCreation.dest = true;
});

//save Tr button
saveTRInfo.addEventListener("click" , ()=>{

  //save infomartion
  if(!isMarkersPlaced()){
    alert("Could not save , please make sure you have inserted the price and the Markers are placed");
    return;
  }

  //activate 
  saveButtonActive = true;
  
  //Turn on Draw Bar
  turnOnDrawBar(true);
  //put cover on TR
  taxiRankInfoCover.style.visibility = "visible";
  //release on route
routeInfoCover.style.visibility = "hidden";
});

// noBtn.addEventListener("click" , ()=>{
// closeFinalMarkerMenu();
// });

cancelBtnfinalMenu.addEventListener("click" , ()=>{
  closeFinalMarkerMenu();
});

yesBtn.addEventListener("click" , ()=>{
  lastConnection();
  //close menu after doing the work\
  closeFinalMarkerMenu();
});

noBtn.addEventListener("click" , ()=>{
  lastConnection();
  //close menu after doing the work\
  closeFinalMarkerMenu();
});

//Close contextMenu
closeButton.addEventListener("click" , (e)=>{
   closeContextMenu();
  });

 //Update execution
updateButton.addEventListener('click' , async (e)=>{

  try {
    
    if(chosenTRCreation.starting === true || chosenTRCreation.dest === true){

      //check the adress input
      if(searchBox.value.trim() === ''){
      console.log("Adress is empty");
      return null;
      }
    
      //use lng and lat to get an adress
     const lnglat = coords[coords.length-1];
     const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${lnglat[0]},${lnglat[1]}.json?access_token=${accessToken}`;
    const response = await axios.get(url);
    const address = response.data.features[0]?.place_name;
    console.log('Address:', address);


  if(chosenTRCreation.starting === true){
    //starting context menu
    if(nameBox.value.trim() !== '' && provBox.value.trim() !== ''){

      //save taxiRank
      createdStartTaxiRank = new TaxiRank(nameBox.value , provBox.value ,address , 1,lnglat[0] ,  lnglat[1] , true );
      startingTRInput.value = nameBox.value ;
      contextMenuDetection.startingTR = false;
    }else{
       console.log("Could not save TaxiRank");
       alert("fill all inputs");
    }

  }else if(chosenTRCreation.dest === true){
    //dest context menu
    if(nameBox.value.trim() !== '' && provBox.value.trim() !== ''){
        //save taxiRank 
      createdDestTaxiRank = new TaxiRank(nameBox.value , provBox.value ,address , 1,lnglat[0] ,  lnglat[1] , true );
      destTRInput.value = nameBox.value ;
      contextMenuDetection.destTR = false;
    }else{
       console.log("Could not save TaxiRank");
       alert("fill all inputs");
    }
  }else{
    console.log("Could not save TaxiRank");
 }

  //remove text in TextArea and the otehr inputs
  closeContextMenu();
}

}catch(error){
console.log(error);
return null;
}

  });

searchBox.addEventListener('input', (e) => {
  fetchSuggestions(e.target.value);
});

routeAddButton.addEventListener('click' , ()=>{
  
  //save current route information 
  const isRouteSaved = saveCurrentRoute() ;
  if(isRouteSaved === true){

  //remove 
  removeRouteOnly();

  //Create a new route 
  const num = IncreaseRouteNumber();
  routeObj = new Route(`${num}`);

  //create html
  currentColor = colors[num-1];
  createRouteDiv(`Route${num}` , currentColor);

  //increase count
  routeCount++;

  //allow route creation
  isLoopRoutefinished = false;

  }else{
    console.log("Route object is null");
    return null;
  }
});

sendButton.addEventListener("click" , async()=>{

  //Save current route
  const isCurrentRouteSaved = saveCurrentRoute();

  if(isCurrentRouteSaved === false){
    console.log("ERROR: Last route was not saved!!");
  }
  //TaxiRanks
  console.log("SourceTaxiRank : " , createdStartTaxiRank.TaxiRankPrint());

   if(isStraightChosen === true){
      console.log("DestTaxiRank : " , createdDestTaxiRank.TaxiRankPrint());
   }

  //routes
  console.log("Routes : ");
  listOfRoutes.forEach(route => {
    console.log(route.RoutePrint());
  });

  let routeType;
  let caseType ;
  let TRSource;
  let TRDest;
  let routeInfo;

  if(isStraightChosen === true){
    caseType = "1";
    routeType = "Straight";
  }else{
    caseType = "0";
    routeType = "Loop";
  }

  //TRSource
  if(createdStartTaxiRank.ID === Infinity){
    //new
    caseType += "1";
    TRSource = {name: createdStartTaxiRank.name , coord: createdStartTaxiRank.coord , province: createdStartTaxiRank.province ,address:createdStartTaxiRank.address};
  }else{
    //old
    caseType += "0";
    TRSource = {IDSource:createdStartTaxiRank.ID}
  }

  //TRDest
  if(isStraightChosen === true){
  if(createdDestTaxiRank.ID === Infinity){
    //new
    caseType += "1";
    TRDest = {nameDest: createdDestTaxiRank.name , coordDest:createdDestTaxiRank.coord , provinceDest: createdDestTaxiRank.province ,addressDest: createdDestTaxiRank.address };
  }else{
    //old
    caseType += "0";
    TRDest = {IDDest: createdDestTaxiRank.ID}
  }

  }

  //route
  let listOfMessAndCoords = [];
  listOfRoutes.forEach(route => {
    listOfMessAndCoords.push({message:route.message , Coords: route.listOfCoords});
  });

  const value = parseInt(selectedPrice.textContent, 10);
  routeInfo = { price:value , routeType: routeType , travelMethod:"Taxi" , listOfMessAndCoords:listOfMessAndCoords};


  try{

    let response ;
      if(isStraightChosen === true){
       response = await axios.post('http://localhost:3000/client//AddPendingRoute' , {
          caseType:caseType,
          TRSource:TRSource,
          TRDest:TRDest,
          routeInfo:routeInfo
        });


      }else{

          response = await axios.post('http://localhost:3000/client//AddPendingRoute' , {
          caseType:caseType,
          TRSource:TRSource,
          TRDest:TRDest,
          routeInfo:routeInfo
        });
      }

      if( response.status != 200){
        alert("Could not save");
      }else{
        alert("Saved!!");
      }
  
  }catch(error){
    console.log(error);
    return;
  }

});

//listmenu listeners
closeButtonListmenu.addEventListener("click" , ()=>{
closeListMenu(false);
});

editbtnListMenu.addEventListener("click" , ()=>{
  if(!markerChosenForEditing){
     popup.showSuccessPopup("Could not edit route " , false);
  return;
  }

  editRoute(markerChosenForEditing);
});

removebtnListMenu.addEventListener("click" , (event)=>{

  console.log("coords before removal : " , coords);
  console.log("routeCoordinates before : " , routeCoordinates);
  console.log("routeMarkers before : " , routeMarkers);

 // You can access the DOM element
 if(!markerChosenForRemoval){
  popup.showSuccessPopup("Could not remove route " , false);
  return;
 } 
  removeRoute(markerChosenForRemoval);

  console.log("coords after removal : " , coords);
  console.log("routeCoordinates after : " , routeCoordinates);
  console.log("routeMarkers after : " , routeMarkers);
});

//=== FUNCTIONS ===

//editmenu
function openEditMarkerMenu(){
  editMarkerMenu.style.visibility = "visible";
 }

 function closeEditMarkerMenu(){
  editMarkerMenu.style.visibility = "hidden";
 }
//listmenu 
function openListMenu(){
listmenu.style.visibility = "visible";
}

function closeListMenu(isEditingored){
listmenu.style.visibility = "hidden";
markerChosenForRemoval = null;
if(isEditingored === false) markerChosenForEditing = null;
}


//marker menu
function addClickListenerToMarker(marker, callback) {
  console.log("Checking Marker ! ");
  if (marker && marker.getElement()) {
    marker.getElement().addEventListener('click', callback);
  }
}

function openFinalMarkerMenu(){
  finalMarkerMenu.style.visibility = "visible";
 }

 function closeFinalMarkerMenu(){
  finalMarkerMenu.style.visibility = "hidden";
 }

function updateRouteOnMap(geojson) {
  if (map.getSource('route')) {
    // Update the existing route with new data
    map.getSource('route').setData(geojson);
  } else {
    // Add the route to the map for the first time
    map.addSource('route', {
      type: 'geojson',
      data: geojson
    });

    map.addLayer({
      id: 'route',
      type: 'line',
      source: 'route',
      layout: {
        'line-join': 'round',
        'line-cap': 'round'
      },
      paint: {
        'line-color': currentColor,
        'line-width': 4
      }
    });
  }
}

function saveCurrentRoute(){
  //save route information 
  if(routeObj && routeCount < 5){
    //add route 
    if(!routeCoordinates || routeCoordinates.length === 0){
      console.log("routeCoordinates has no coordinates");
      alert("There is no route has been drawn")
      return null;
    }
    const addroute = routeObj.AddRouteCoords(routeCoordinates);

    if(addroute === false){
      console.log("Could not add route");
    }
    //add message
    if(messageTextArea.value.trim() === ""){
      routeObj.AddMessage("");
    }else{
      routeObj.AddMessage(messageTextArea.value);
    }


     //save route in a list
    listOfRoutes.push(routeObj);
    return true;
  }

  return false;
}

function isMarkersPlaced(){
  let innerFlag = false;
  if(isStraightChosen === true){
  if(destTaxiRMarker != null && startingTaxiRMarker != null){
    innerFlag =  true;
  }
  }else{
    if(startingTaxiRMarker != null){
      innerFlag =  true;
    }
  }

  //check the price if markers are available
  if(innerFlag === true){
 const value = parseInt(selectedPrice.textContent, 10);
  if(value > 0 ){
    return true;
  }
  }
 
  return false;

}

function removeTaxiRInputGroup2() {
    const taxiRInputGroup2 = document.querySelector(".inputTR.group2");
    if (taxiRInputGroup2) {
        taxiRInputGroup2.remove();
        taxiRInputContainer.style.height = "70px";
    } else {
        console.warn("Element .inputTR.group2 not found.");
    }
}

// function resuscitateTaxiRInputGroup2(){
//   //create group2

// // Create the main div
// const div = document.createElement('div');
// div.className = 'inputTR group2';

// // Create the input element
// const input = document.createElement('input');
// input.placeholder = 'Destination taxiRank...';

// // Create the button element
// const button = document.createElement('button');
// button.textContent = 'Create TaxiRank';

// // Append the input and button to the div
// div.appendChild(input);
// div.appendChild(button);

// // Append the div to the body or another container element
// taxiRInputContainer.appendChild(div);

//   //resize the container
//    taxiRInputContainer.style.height = "120px";
// }

// Show filtered suggestions

function resuscitateTaxiRInputGroup2() {
  // Create the main group2 div
  const div = document.createElement('div');
  div.className = 'inputTR group2';

  // Create the inner input container
  const inputContainer = document.createElement('div');
  inputContainer.className = 'inputcontainer destInput';

  // Create input
  const input = document.createElement('input');
  input.placeholder = 'Search destination taxiRank...';

  // Create ul
  const ul = document.createElement('ul');

  // Append input and ul to input container
  inputContainer.appendChild(input);
  inputContainer.appendChild(ul);

  // Create button
  const button = document.createElement('button');
  button.textContent = 'Create new TaxiRank';

  // Append input container and button to group2 div
  div.appendChild(inputContainer);
  div.appendChild(button);

  // Append group2 div to the main container
  taxiRInputContainer.appendChild(div);

  // Resize the container if needed
  taxiRInputContainer.style.height = "120px";
}

function showSuggestions(query ,  isGroup1) {
  let  suggestionList;
  let input;

  if(isGroup1){
    suggestionList = startingTRList;
    input = startingTRInput;
    console.log("Strting section");
  }else{
    suggestionList = destTRList;
    input = destTRInput;
  }
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
        li.style.padding = '10px';
        li.style.cursor = "pointer";
        li.addEventListener('click', () => {
            input.value = taxiRank.name;
            suggestionList.style.display = 'none';
            const currentCoords = [taxiRank.coord.longitude , taxiRank.coord.latitude];

            //remove existing route 
            if(routeExists()){
              removeRouteAndMarker();
            }

            //Add Marker
            if(isGroup1){

            if (startingTaxiRMarker) {
           startingTaxiRMarker.remove();
           console.log("marker is removed");
           }
           
           
            startingTaxiRMarker =  new mapboxgl.Marker({ color: 'green' }).setLngLat(currentCoords).addTo(map);
            coords.push(currentCoords);

             map.flyTo({ center: currentCoords, zoom: 17 });

            addClickListenerToMarker(startingTaxiRMarker, async(e)=>{
               e.stopPropagation(); 
              if(isMarkersPlaced() && saveButtonActive === true){
                isStartingMarkerListining = true;
                openFinalMarkerMenu(); 
              
              } 
             //await lastConnection(true , currentCoords);
            }); 
            //createTaxiRank
            createdStartTaxiRank = new TaxiRank(taxiRank.name ,taxiRank.province , taxiRank.address , 1,taxiRank.coord.longitude , taxiRank.coord.latitude , false , taxiRank.ID );

            }else{

         if (destTaxiRMarker) {
        destTaxiRMarker.remove();
        console.log("marker is removed");
      }

            destTaxiRMarker =  new mapboxgl.Marker({ color: 'red' }).setLngLat(currentCoords).addTo(map);
            coords[1] = currentCoords;

            map.flyTo({ center: currentCoords, zoom: 17 });
             addClickListenerToMarker(destTaxiRMarker, async(e)=>{
              e.stopPropagation(); 
              if(isMarkersPlaced() && saveButtonActive === true){
                openFinalMarkerMenu(); 
                isStartingMarkerListining = false;
              } 
              
              //await lastConnection(false , currentCoords);
            }); 

            //createTaxiRank
            createdDestTaxiRank = new TaxiRank(taxiRank.name ,taxiRank.province , taxiRank.address , 1,taxiRank.coord.longitude , taxiRank.coord.latitude , false ,  taxiRank.ID );
            }
          
        });
        suggestionList.appendChild(li);

        console.log(coords);
    });

    // Position suggestions near input box
    const rect = input.getBoundingClientRect();
    suggestionList.style.display = 'block';
}

async function fetchTaxiRanks() {
    try {
        const response = await axios.get('http://localhost:3000/admin/listTaxiRanks');
        taxiRanks = response.data; // Store data globally
    } catch (error) {
        console.error('Error fetching taxi ranks:', error);
    }
}

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
      
          //remove existing route 
            if(routeExists()){
              removeRouteAndMarker();
            }

            //Add Marker

          if(chosenTRCreation.starting === true){
        // Remove the old marker if it exists
       if (startingTaxiRMarker) {
        startingTaxiRMarker.remove();
        console.log("marker is removed");
      }
          // Add marker and center the map
         startingTaxiRMarker =  new mapboxgl.Marker({color:"green"})
            .setLngLat([longitude, latitude])
            .addTo(map);

          map.flyTo({ center: [longitude, latitude], zoom: 12 });

          //approve the detection
          contextMenuDetection.startingTR = true;

          //add to coords 
          if(!replaceInCoords(0 , [longitude, latitude])){
            coords.push([longitude, latitude]);
          }
          // Clear suggestions and update input value
          searchBox.value = feature.place_name;
          suggestions.innerHTML = '';

          }else if(chosenTRCreation.dest === true){
              if (destTaxiRMarker) {
        destTaxiRMarker.remove();
        console.log("marker is removed");
      }
          // Add marker and center the map
         destTaxiRMarker =  new mapboxgl.Marker({color:"red"})
            .setLngLat([longitude, latitude])
            .addTo(map);

          map.flyTo({ center: [longitude, latitude], zoom: 12 });

          //approve the detection
          contextMenuDetection.destTR = true;

          //add to coords 
          if(!replaceInCoords(1 , [longitude, latitude])){
            coords[1] = [longitude, latitude];
          }

          // Clear suggestions and update input value
          searchBox.value = feature.place_name;
          suggestions.innerHTML = '';
          }

          console.log("Coords array : ", coords);

        });

        suggestions.appendChild(li);
      });
    }
  } catch (error) {
    console.error('Error fetching suggestions:', error);
  }
}

async function lastConnection(){

  if(isStraightChosen === true){
    //straight case

    //check if startingMakrker is clicked (return if so)
    if(isStartingMarkerListining){
      console.log("Wrong Marker clicked");
      return;
    }

    //the right marker was clicked (DestMarker)
    console.log("Destination Marker was clicked (Correct) ");

     if(coords.length >= 3){
    const lastCoord = coords.length -1;
    const markerCoord = destTaxiRMarker.getLngLat();
     const coordPair = `${coords[lastCoord].join(',')};${[markerCoord.lng,markerCoord.lat] .join(',')}`;
        const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${coordPair}?geometries=geojson&access_token=${accessToken}`;
    
        const response = await fetch(url);
        const data = await response.json();
        const segment = data.routes[0].geometry;

        routeCoordinates.push(...segment.coordinates.slice(1)); 

         updateRouteOnMap({
          type: 'LineString',
          coordinates: routeCoordinates
        });

        //end route 
        isLoopRoutefinished = true;
   }else{
    popup.showSuccessPopup("There is no waypoint drawn" , false);
   }
  
  }else{
    //loop case 

     //check if destMakrker is clicked (return if so)
    if(isStartingMarkerListining === false){
      console.log("Wrong Marker clicked");
      return;
    }
    
     //the right marker was clicked (StartingMarker)
    console.log("Starting Marker was clicked (Correct) ");

   if(coords.length >= 2){
    const lastCoord = coords.length -1;
    const markerCoord = startingTaxiRMarker.getLngLat();

     const coordPair = `${coords[lastCoord].join(',')};${[markerCoord.lng,markerCoord.lat] .join(',')}`;
        const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${coordPair}?geometries=geojson&access_token=${accessToken}`;
    
        const response = await fetch(url);
        const data = await response.json();
        const segment = data.routes[0].geometry;

        routeCoordinates.push(...segment.coordinates.slice(1)); 

         updateRouteOnMap({
          type: 'LineString',
          coordinates: routeCoordinates
        });

        //end route 
        isLoopRoutefinished = true;
   }else{
    popup.showSuccessPopup("There is no waypoint drawn" , false);
   }

  }
}

function replaceInCoords(index , value){
  if(coords.length === 0) return false;
  if(index >= 0 && index < coords.length){
    coords[index] = value;
    console.log("coords replication" , coords);
    return true;
  }

  return false;
}

function turnOnDrawBar(flag){
  if(flag === true){
    drawBar.style.backgroundColor  = "#0AFF375c";
    drawBar.classList.add('on');
    drawBarText.textContent = "ON";
  }else{
     drawBar.classList.add('off');
    drawBar.style.backgroundColor  = "#FF0A0A5c";
    drawBarText.textContent = "OFF";
  }
}

function removeRouteOnly(){
  //route remove 
  if (map.getLayer('route')) {
    map.removeLayer('route');
  }
  if (map.getSource('route')) {
    map.removeSource('route');
  }


  //remove the route Markers
      routeMarkers.forEach((marker)=>{
        if(marker){
          marker.remove(); 
        }
      });

    //reset variables
    if(isStraightChosen === true){
 coords.length = 2;
    }else{
coords.length = 1;
    }
     
      routeMarkers.length = 0;
      routeCoordinates.length = 0;


}

function removeRouteAndMarker(){
  //route remove 
  if (map.getLayer('route')) {
    map.removeLayer('route');
  }
  if (map.getSource('route')) {
    map.removeSource('route');
  }

  //remove markers
  if (startingTaxiRMarker) {
        startingTaxiRMarker.remove();
      }

  if (destTaxiRMarker) {
        destTaxiRMarker.remove();
      }

      //remove the route Markers
      routeMarkers.forEach((marker)=>{
        if(marker){
          marker.remove(); 
        }
      });

      //reset variables
      coords.length = 0;
      routeMarkers.length = 0;
      routeCoordinates.length = 0;

      //data
      createdStartTaxiRank = null;
      createdDestTaxiRank = null;
      listOfRoutes = [];
}

function createCustomPointMarker(lngLat) {
  const el = document.createElement('div');
  el.style.width = '10px';
  el.style.height = '10px';
  el.style.borderRadius = '50%';
  el.style.backgroundColor = 'blue';
  el.style.border = '2px solid black';

  const newMarker =  new mapboxgl.Marker(el)
    .setLngLat(lngLat)
    .addTo(map);

    //add to the list for reference
  routeMarkers.push(newMarker);
    //metaDate
    newMarker.coordIndex = coords.length-1;
    newMarker.routeStartingIndex = routeCoordinates.length-1;
    newMarker.routeMarkerIndex = routeMarkers.length-1;
    
  

  
  //add a listener
  newMarker.getElement().addEventListener('contextmenu', (event)=>{
    event.preventDefault();

    if(markerChosenForRemoval === null && markerChosenForEditing === null){
    openListMenu();
    markerChosenForRemoval = newMarker;
    markerChosenForEditing = newMarker; 
    }  
  });


}

function routeExists() {
  return map.getSource('route') !== undefined && map.getLayer('route') !== undefined;
}


function IncreaseRouteNumber(){
   labelNumber = labelNumber + 1;
   routeNumber.textContent = `${labelNumber}`;
  return labelNumber;
}

function createRouteDiv(routeName = "Route1" , col) {
  // Create the main div
  const routeDiv = document.createElement("div");
  routeDiv.className = "route_div";
  routeDiv.style.backgroundColor = col;

  // Add the route name text
  routeDiv.textContent = routeName + " ";

  // Create the button
  const button = document.createElement("button");
  button.style.backgroundColor = col
  button.className = "routeButton";

  // Create the icon
  const icon = document.createElement("i");
  icon.className = "fa fa-times";
  icon.style.fontSize = "12px";
  icon.style.color = "black";
  icon.setAttribute("aria-hidden", "true");

  // Append icon to button, button to div
  button.appendChild(icon);
  routeDiv.appendChild(button);

  // Append the final div to a container (you can change the selector as needed)
  document.querySelector(".addRoute").appendChild(routeDiv);
}

function closeContextMenu(){
   menu.style.visibility = "hidden";
   
  nameBox.value = "";
  provBox.value = "";
  searchBox.value ="";

chosenTRCreation.starting = false;
chosenTRCreation.none = true;
chosenTRCreation.dest = false;

if(contextMenuDetection.startingTR === true){
  contextMenuDetection.startingTR = false;
  if(startingTaxiRMarker){
    startingTaxiRMarker.remove();
  }
}

if(contextMenuDetection.destTR === true){
  contextMenuDetection.destTR = false;
  if(destTaxiRMarker){
    destTaxiRMarker.remove();
  }
}

}

function removeRoute(clickedMarker){  

  const markerCoords = clickedMarker.getLngLat(); // returns { lng: 30.3, lat: -26.0 }
  const routeStartingIndex  = clickedMarker.routeStartingIndex;
  const coordIndex = clickedMarker.coordIndex ;
  const markerIndex = clickedMarker.routeMarkerIndex;

console.log("**MARKER** coordinates found : " , markerCoords);
console.log("**MARKER** routeStartingIndex : " ,routeStartingIndex);
console.log("**MARKER** coordIndex : " , coordIndex);
console.log("**MARKER** routeMarkerIndex : " , markerIndex);


  const source = map.getSource('route');

if (source) {

  updateRouteOnMap({
          type: 'LineString',
          coordinates: routeCoordinates.slice( 0, routeStartingIndex+1)
        });

        for(let i = coordIndex-1 ; i < routeMarkers.length ; i++){
          const marker = routeMarkers[i];
          if(marker){
            marker.remove();
          }
        }

   routeCoordinates =  routeCoordinates.slice( 0, routeStartingIndex+1);
   coords = coords.slice(0 , coordIndex+1);
   routeMarkers.length = markerIndex +1;
}

//close menu
closeListMenu(false);

}

function editRoute(clickedMarker){
  const markerCoords = clickedMarker.getLngLat(); // returns { lng: 30.3, lat: -26.0 }
  const routeStartingIndex  = clickedMarker.routeStartingIndex;
  const coordIndex = clickedMarker.coordIndex ;

console.log("**MARKER** coordinates found : " , markerCoords);
console.log("**MARKER** routeStartingIndex : " ,routeStartingIndex);
console.log("**MARKER** coordIndex : " , coordIndex);

// remove the original  route
tempRouteRemoval();

const index = routeMarkers.findIndex((marker) => {
  return markerCoords.lng === marker.getLngLat().lng &&
         markerCoords.lat === marker.getLngLat().lat;
});


if(index === -1){
console.log("index is -1 ");
  return;
}

let indexBehind = index -1;
if(indexBehind < 0) indexBehind = null;


let indexFoward = index +1;
if(indexFoward >=  routeMarkers.length) indexFoward = null;


const markerBehind = indexBehind !== null ? routeMarkers[indexBehind] : null;
const markerFoward = indexFoward !== null ? routeMarkers[indexFoward] : null; 

console.log("markerBehind : " , markerBehind);
console.log("markerFoward : " , markerFoward);


// the behind portion
let startingIndex ;
if(markerBehind === null){
 startingIndex = 0;
}else{
  startingIndex = markerBehind.routeStartingIndex;
}
console.log("startingIndex : " , startingIndex);
console.log("routeCoordinates : " , routeCoordinates);

if(startingIndex >= 0){
  console.log("firdt index : " , 0 , " startingIndex of markerBehind: " , startingIndex+1);
const routeBehind = routeCoordinates.slice(0 ,startingIndex+1);
  drawRouteBehind(routeBehind , currentColor);
}else{
 console.log("startingIndex : " , startingIndex);
}


//the foward portion
let endingIndex ;
if(markerFoward === null){
  endingIndex = routeCoordinates.length;
}else{
  endingIndex = markerFoward.routeStartingIndex;
}

if(endingIndex >= 0 ){
  const indexOfCurrentMarker  =  routeStartingIndex;
 console.log("indexOfCurrentMarker : " , indexOfCurrentMarker , " endingIndex : " , endingIndex);
  const routeFoward = routeCoordinates.slice(endingIndex , routeCoordinates.length );
  drawRouteFoward(routeFoward , currentColor)
}else{
   console.log("endingIndex : " , endingIndex);
}

//insert global data
globalMarkerBehind = markerBehind;
globalMarkerFoward = markerFoward;
console.log("globalMarkerBehind : " , globalMarkerBehind);
//close menu
closeListMenu(true);

//popup
popup.showSuccessPopup("click in a new area to edit the route" , true);


  // Make the marker draggable if it isn't already
  if (!clickedMarker._draggable) {
    const lngLat = clickedMarker.getLngLat();

    // hide old marker
    clickedMarker.getElement().style.display = "none"; // Hide

    // Create new draggable marker at the same spot
    const newMarker = new mapboxgl.Marker({
      color: 'orange',
      draggable: true
    })
      .setLngLat(lngLat)
      .addTo(map);

    // Copy over any metadata (like index)
    newMarker.coordIndex = clickedMarker.coordIndex;
    newMarker.routeStartingIndex = clickedMarker.routeStartingIndex;

    // Add dragend handler
    newMarker.on('dragend', () => {
      const newPos = newMarker.getLngLat();

      console.log("Dragged and drobbed : ",newPos );
      newDraggableMarker = newMarker;
      openEditMarkerMenu();

      //const i = newMarker.coordIndex;
      //routeCoordinates[i] = [newPos.lng, newPos.lat];

      //updateRouteSegmentBeforeAndAfter(i); // Replace route segments near this point
    });

 }

}

// find index in routeCoordinates [lng:lat]
function findIndexOfCoord(coordToFind) {

console.log("findIndexOfCoord original coord", coordToFind);
  // Helper: round to 6 decimals
  const round = (val) => Math.round(val * 1e6) / 1e6;

  // Round input
  const roundedLng = round(coordToFind[0]);
  const roundedLat = round(coordToFind[1]);

    console.log("findIndexOfCoord coord", [roundedLng , roundedLat]);
  return routeCoordinates.findIndex((coord) => {
    const lng = round(coord[0]);
    const lat = round(coord[1]);
    return lng === roundedLng && lat === roundedLat;
  });
}


function tempRouteRemoval(){
  //route remove 
  if (map.getLayer('route')) {
    map.removeLayer('route');
  }
  if (map.getSource('route')) {
    map.removeSource('route');
  }
  
}


function editRouteArrays(startingIndex, endingIndex, markerIndex , markerPosCoord, newCoords) {
  const deleteCount = endingIndex - startingIndex + 1;
  // Replace the chunk in routeCoordinates with newCoords

  routeCoordinates.splice(startingIndex, deleteCount, ...newCoords);
  coords[markerIndex] = markerPosCoord;

  console.log("Edit routeCoords 2 : " , ...newCoords);
  const newEndingIndex = startingIndex + newCoords.length - 1;
  return newEndingIndex;
}

function simpleEditRouteArrays(startingIndex, endingIndex, newCoords) {
  const deleteCount = endingIndex - startingIndex + 1;
  // Replace the chunk in routeCoordinates with newCoords

  routeCoordinates.splice(startingIndex, deleteCount, ...newCoords);

  console.log("Edit routeCoords 2 : " , ...newCoords);
  const newEndingIndex = startingIndex + newCoords.length - 1;
  return newEndingIndex;
}

//when the removal has happened , we re make the coords without including the removed part and without using the original coords
function drawRouteBehind(coords , color){

  console.log("behind coords : " , coords);

     map.addSource('routeBehind', {
      type: 'geojson',
      data:{
          type: 'LineString',
          coordinates: coords
        }
    });

    map.addLayer({
      id: 'routeBehind',
      type: 'line',
      source: 'routeBehind',
      layout: {
        'line-join': 'round',
        'line-cap': 'round'
      },
      paint: {
        'line-color': color,
        'line-width': 4
      }
    });
}

function drawRouteFoward(coords , color){
    console.log("foward coords : " , coords);

       map.addSource('routeFoward', {
      type: 'geojson',
      data:{
          type: 'LineString',
          coordinates: coords
        }
    });

    map.addLayer({
      id: 'routeFoward',
      type: 'line',
      source: 'routeFoward',
      layout: {
        'line-join': 'round',
        'line-cap': 'round'
      },
      paint: {
        'line-color': color,
        'line-width': 4
      }
    });
}

async function recreateRouteAfterEdit(){

  let markerBehind;
  if(globalMarkerBehind){
    markerBehind = globalMarkerBehind;
  }else{
    markerBehind = startingTaxiRMarker;
  }

 

      console.log("markerBehind in[recreateRouteAfterEdit]: " , markerBehind);
       //BEHIND
       const routeBehind = await routeGeneration([markerBehind.getLngLat().lng , markerBehind.getLngLat().lat],[newDraggableMarker.getLngLat().lng , newDraggableMarker.getLngLat().lat]);
        console.log("Edit routeCoords 1 : " , routeBehind);
        console.log("Routes coord before : " ,routeCoordinates );
        let startingIndex;
        if(!markerBehind.routeStartingIndex){
          startingIndex = 0;

        }else{
          startingIndex = markerBehind.routeStartingIndex;
        }

        console.log("StartingIndex : ", startingIndex);

        const newRouteIndex = editRouteArrays(startingIndex, markerChosenForEditing.routeStartingIndex ,markerChosenForEditing.coordIndex , [newDraggableMarker.getLngLat().lng , newDraggableMarker.getLngLat().lat] , routeBehind);
        console.log("Routes coord after : " ,routeCoordinates);
        
        //revive the hidden marker with the right position 
        markerChosenForEditing.setLngLat([newDraggableMarker.getLngLat().lng , newDraggableMarker.getLngLat().lat]);
        markerChosenForEditing.routeStartingIndex = newRouteIndex;
        markerChosenForEditing.getElement().style.display = "";

      //   //FOWARD
      //    let markerFoward;
      // if(globalMarkerFoward){
      //  markerFoward = globalMarkerFoward;
      //   const routeFoward = await routeGeneration([newDraggableMarker.getLngLat().lng , newDraggableMarker.getLngLat().lat] , [markerFoward.getLngLat().lng , markerFoward.getLngLat().lat]);
      //   const MarkerFowardRouteIndex = simpleEditRouteArrays(newRouteIndex , markerFoward.routeStartingIndex , routeFoward);
      //   markerFoward.routeStartingIndex = MarkerFowardRouteIndex;
      // }
       

        //the other part of the route
        deleteSideRoutes();

        updateRouteOnMap({
          type: 'LineString',
          coordinates: routeCoordinates
        });
        
        console.log("markerChosenForEditing index in Coords : " ,markerChosenForEditing.coordIndex );
        console.log("Coords : " , coords);

        //resetting 
        closeEditMarkerMenu();
        markerChosenForEditing = null;
        if(newDraggableMarker){
          newDraggableMarker.remove();
          newDraggableMarker = null;
        }

 }


async function routeGeneration(coordFrom , coordTo){
 const coordPair = `${coordFrom.join(',')};${coordTo.join(',')}`;
        const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${coordPair}?geometries=geojson&access_token=${accessToken}`;
    
        const response = await fetch(url);
        const data = await response.json();
        const segment = data.routes[0].geometry;

return segment.coordinates;

}

function deleteSideRoutes() {
  const routeIds = ['routeBehind', 'routeFoward'];

  routeIds.forEach((id) => {
    if (map.getLayer(id)) {
      map.removeLayer(id);
    }
    if (map.getSource(id)) {
      map.removeSource(id);
    }
  });

  console.log("Both routeBehind and routeFoward have been removed.");
}






