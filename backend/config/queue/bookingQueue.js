// queues/bookingQueue.j
import  Bull from 'bull';
import config from '../configurations.js'
// Connect to Redis
const bookingQueue = new Bull("booking-queue", {
  redis: {
    host: config.redis.host,
    port: config.redis.port
  }
});

// Listen for connection ready
bookingQueue.on("ready", () => {
  console.log("✅ Redis connection is ready!");
});

// Listen for errors
bookingQueue.on("error", (err) => {
  console.error("❌ Redis connection error:", err);
});

export default bookingQueue


