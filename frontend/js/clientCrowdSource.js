import  axios  from 'axios';

 // === DOM ELEMENTS ===


//=== VARIABLES ===
let coords = [];
let routeCoordinates = [];
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
      coords.push(lngLat);
    
      new mapboxgl.Marker({ color: 'blue' }).setLngLat(lngLat).addTo(map);
    
      let previous, current;
    
      if (coords.length === 2) {
        // First connection: point 1 → point 2
        previous = coords[0];
        current = coords[1];
      } else if (coords.length === 3) {
        // Replace route: point 1 → point 3
        previous = coords[0];
        current = coords[2];
        routeCoordinates.length = 0; // reset previous route
        routeCoordinates.push(previous);
      } else if (coords.length > 3) {
        // Continue from last added point
        previous = coords[coords.length - 2];
        current = coords[coords.length - 1];
      }
    
      if (previous && current) {
        const coordPair = `${previous.join(',')};${current.join(',')}`;
        const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${coordPair}?geometries=geojson&access_token=${mapboxgl.accessToken}`;
    
        const response = await fetch(url);
        const data = await response.json();
        const segment = data.routes[0].geometry;
    
        if (coords.length === 3) {
          routeCoordinates.push(...segment.coordinates.slice(1)); // skip duplicate
        } else if (coords.length > 3) {
          routeCoordinates.push(...segment.coordinates.slice(1));
        }
    
        updateRouteOnMap({
          type: 'LineString',
          coordinates: routeCoordinates
        });
      }
    });
  });

// === EVENT LISTENERS ====

//=== FUNCTIONS ===

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
        'line-color': '#0074D9',
        'line-width': 4
      }
    });
  }
}


