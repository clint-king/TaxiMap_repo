class Simulation{

    constructor(fullPath, driverMarker, map){
        this.fullPath = fullPath;
        this.driverMarker = driverMarker;
        this.map = map;
        this.currentIndex = 0;
        this.intervalId = null;
        this.isRunning = false;
        this.speedKmh = 50; // Average car speed in km/h (50 km/h = ~31 mph, typical city speed)
        this.timeoutId = null;
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
        this.currentIndex = 0;

        // Ensure driver marker exists
        if (!this.driverMarker && this.map) {
            this.driverMarker = new google.maps.Marker({
                position: this.fullPath[0],
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
            
            // Minimum delay of 300ms for realistic car movement (even for very close GPS points)
            // Maximum delay of 2000ms (2 seconds) to prevent too slow updates
            // This ensures smooth, realistic car movement
            const delay = Math.max(300, Math.min(2000, timeMs));
            
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

}

export { Simulation };