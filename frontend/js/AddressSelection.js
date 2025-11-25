// AddressSelection.js
let baseUrl;

// Use environment variable for API base URL
baseUrl = import.meta.env.VITE_API_BASE_URL || 'https://api.teksimap.co.za';

// Print frontend config values to console
// console.log('🎨 FRONTEND CONFIGURATION VALUES:');
// console.log('================================');
// console.log(`API Base URL: ${baseUrl}`);
// console.log(`Mapbox Token: ${import.meta.env.VITE_MAPBOX_TOKEN ? '***SET***' : '***NOT SET***'}`);
// console.log(`Environment: ${import.meta.env.MODE || 'development'}`);
// console.log(`Base URL: ${import.meta.env.BASE_URL || '/'}`);
// console.log('================================');

export const BASE_URL = baseUrl;