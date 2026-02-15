// Import API function for sending vehicle position updates
import { updateVehiclePosition } from '../api/trackingAPi.js';

class Simulation{

    constructor(fullPath, driverMarker, map, bookingId = null){
        this.fullPath = fullPath;
        this.driverMarker = driverMarker;
        this.map = map;
        this.bookingId = bookingId; // Store bookingId for API calls
        this.currentIndex = 0;
        this.intervalId = null;
        this.isRunning = false;
        this.speedKmh = 200; // Increased speed for faster testing (200 km/h = ~124 mph)
        this.timeoutId = null;
        this.lastUpdateTime = 0; // Track last API call to avoid too frequent updates
        this.updateInterval = 1000; // Send position update every 1 second for faster testing
    }

    startSimulation(){
        if (!this.fullPath || this.fullPath.length === 0) {
            console.error("No path available for simulation");
            return;
        }

        if (this.isRunning) {
            console.log("Simulation is already running");
            return;
        }

        this.isRunning = true;
        // Start at 3/4 of the route (75% through) for faster testing
        this.currentIndex = Math.floor(this.fullPath.length * 0.90);
        console.log(`🚀 Starting simulation at 75% of route (index ${this.currentIndex} of ${this.fullPath.length})`);

        // Ensure driver marker exists at starting position (3/4 of route)
        if (!this.driverMarker && this.map) {
            const startPosition = this.fullPath[this.currentIndex];
            const startLat = typeof startPosition.lat === 'function' ? startPosition.lat() : startPosition.lat;
            const startLng = typeof startPosition.lng === 'function' ? startPosition.lng() : startPosition.lng;
            
            this.driverMarker = new google.maps.Marker({
                position: { lat: startLat, lng: startLng },
                map: this.map,
                title: "Driver Location",
                icon: {
                    path: google.maps.SymbolPath.CIRCLE,
                    scale: 20,
                    fillColor: "blue",
                    fillOpacity: 1,
                    strokeColor: "#0D47A1",
                    strokeWeight: 2,
                },
            });
        }

        // Start the simulation loop with realistic car speed
        this.simulateNextStep();

        console.log("Simulation started");
    }
    
    stopSimulation(){
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
        if (this.timeoutId) {
            clearTimeout(this.timeoutId);
            this.timeoutId = null;
        }
        this.isRunning = false;
        console.log("Simulation stopped");
    }
    
    // Calculate distance between two points in kilometers (Haversine formula)
    calculateDistance(lat1, lng1, lat2, lng2) {
        const R = 6371; // Earth's radius in kilometers
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLng = (lng2 - lng1) * Math.PI / 180;
        const a = 
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLng / 2) * Math.sin(dLng / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }
    
    // Simulate next step with realistic timing based on distance
    simulateNextStep() {
        if (!this.isRunning || !this.fullPath || this.currentIndex >= this.fullPath.length) {
            this.stopSimulation();
            console.log("Simulation completed - reached end of path");
            return;
        }

        // Get current and next position
        const currentPosition = this.fullPath[this.currentIndex];
        const currentLat = typeof currentPosition.lat === 'function' ? currentPosition.lat() : currentPosition.lat;
        const currentLng = typeof currentPosition.lng === 'function' ? currentPosition.lng() : currentPosition.lng;
        
        // Update driver marker position
        if (this.driverMarker) {
            this.driverMarker.setPosition({ lat: currentLat, lng: currentLng });
        }

        // Center map on current position and maintain zoom level for navigation
        if (this.map) {
            this.map.setCenter({ lat: currentLat, lng: currentLng });
            // Keep zoom at navigation level (16) if not already set
            if (this.map.getZoom() < 15) {
                this.map.setZoom(16);
            }
        }

        // Update navigation instructions based on current position
        if (window.findCurrentStep) {
            window.findCurrentStep({
                lat: currentLat,
                lng: currentLng
            });
        }

        // Send vehicle position update to server (for WebSocket broadcasting)
        // Only send updates every few seconds to avoid overwhelming the server
        const now = Date.now();
        if (this.bookingId && (now - this.lastUpdateTime >= this.updateInterval)) {
            this.sendVehiclePositionUpdate(currentLat, currentLng);
            this.lastUpdateTime = now;
        }

        // Move to next coordinate
        this.currentIndex++;

        // Calculate delay for next step based on distance
        if (this.currentIndex < this.fullPath.length) {
            const nextPosition = this.fullPath[this.currentIndex];
            const nextLat = typeof nextPosition.lat === 'function' ? nextPosition.lat() : nextPosition.lat;
            const nextLng = typeof nextPosition.lng === 'function' ? nextPosition.lng() : nextPosition.lng;
            
            // Calculate distance in kilometers
            const distanceKm = this.calculateDistance(currentLat, currentLng, nextLat, nextLng);
            
            // Calculate time needed to travel this distance at the set speed
            // time (hours) = distance (km) / speed (km/h)
            // Convert to milliseconds: time (ms) = (distance / speed) * 3600000
            const timeHours = distanceKm / this.speedKmh;
            const timeMs = timeHours * 3600000;
            
            // Minimum delay of 50ms for faster testing (reduced from 300ms)
            // Maximum delay of 500ms for faster testing (reduced from 2000ms)
            // This ensures fast movement for testing geofence detection
            const delay = Math.max(50, Math.min(500, timeMs));
            
            // Schedule next update
            this.timeoutId = setTimeout(() => {
                this.simulateNextStep();
            }, delay);
        } else {
            // Reached end of path
            this.stopSimulation();
            console.log("Simulation completed - reached end of path");
        }

        // Log progress (optional, can be removed)
        if (this.currentIndex % 10 === 0) {
            console.log(`Simulation progress: ${this.currentIndex}/${this.fullPath.length}`);
        }
    }
    
    
    getFullPath(){
        return this.fullPath;
    }

    setSpeed(speedKmh){
        // Set speed in km/h (e.g., 30 for slow city, 50 for normal city, 80 for highway)
        this.speedKmh = speedKmh || 50;
        // If simulation is running, it will use new speed on next step automatically
        // No need to restart, the next simulateNextStep() call will use the new speed
    }

    getCurrentPosition(){
        if (this.currentIndex < this.fullPath.length) {
            return this.fullPath[this.currentIndex];
        }
        return null;
    }

    isSimulationRunning(){
        return this.isRunning;
    }

    // Send vehicle position update to server via API
    async sendVehiclePositionUpdate(lat, lng) {
        if (!this.bookingId) {
            console.warn('⚠️ [SIMULATION] No bookingId provided, skipping position update');
            return;
        }

        const vehiclePosition = { lat, lng };
        
        // Convert fullPath to simple array format for API
        let fullPathCoords = null;
        if (this.fullPath && this.fullPath.length > 0) {
            fullPathCoords = this.fullPath.map(point => {
                const lat = typeof point.lat === 'function' ? point.lat() : point.lat;
                const lng = typeof point.lng === 'function' ? point.lng() : point.lng;
                return { lat, lng };
            });
        }

        try {
            await updateVehiclePosition(this.bookingId, vehiclePosition, fullPathCoords);
        } catch (error) {
            // Error already logged in updateVehiclePosition, just continue simulation
            console.warn('⚠️ [SIMULATION] Failed to send position update, continuing simulation');
        }
    }

    // Set booking ID (useful if bookingId is not available at construction time)
    setBookingId(bookingId) {
        this.bookingId = bookingId;
        console.log('📝 [SIMULATION] Booking ID set:', bookingId);
    }

}

export { Simulation };