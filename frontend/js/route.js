import  axios  from 'axios';



// === DOM ELEMENTS ===

const addRouteButton  = document.querySelector(".button.add");
const contextMenu = document.querySelector(".menu_wrapper");
const closeButton = document.querySelector("#close_button");
const coordinatesTextArea = document.querySelector(".input_line.coord textarea");
const routeNameEl = document.querySelector("#routeName");
const suggestionList = document.querySelector("#suggestions");
const destinationInput = document.querySelector(".routeInput.dest_input");
const updateButton = document.querySelector("#update_button");

//Value for slider
const slider = document.getElementById("priceRange");
const selectedPrice = document.getElementById("selectedPrice");

//Imcreating a temporary list of suggestions
let taxiRanks = []; // Store fetched taxi ranks

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
   console.log("Information " , JSON.stringify(await saveRouteInformation()));
})

//=== FUNCTIONS ===

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

const routeList =  async()=>{
    try{
        const rank = getQueryParam('rank');
        const response = await axios.post("http://localhost:3000/admin/listRoutes" , {taxiRankSelected_ID:rank});
        const respondeData = response.data;
        console.log("Response : "+ respondeData);
    }catch(error){
        console.log("server error : "+ error);
    }
}



// Fetch taxi ranks from backend once
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