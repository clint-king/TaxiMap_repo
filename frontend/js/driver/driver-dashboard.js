// Driver Dashboard JavaScript
import * as bookingApi from "../api/bookingApi.js";

document.addEventListener("DOMContentLoaded", async function () {
  // Check if user is logged in and is a driver
  checkDriverAuthentication();

  // Load driver data
  loadDriverData();

  // Load current trip if any
  await loadCurrentTrip();

  // Load recent trips
  await loadRecentTrips();
});

function checkDriverAuthentication() {
  const userProfile = localStorage.getItem("userProfile");

  if (!userProfile) {
    // Redirect to login if not authenticated
    window.location.href = "/pages/authentication/login.html";
    return;
  }

  const user = JSON.parse(userProfile);

  // Check if user is a driver - allow access for now (can be restricted later)
  // For now, let any logged-in user access the driver portal
  // In production, you would check: user.userType === 'driver' || user.user_type === 'driver'

  // Show driver navigation
  const driverNav = document.getElementById("driverNav");
  const logoutBtn = document.getElementById("logoutBtn");

  if (driverNav) driverNav.style.display = "flex";
  if (logoutBtn) logoutBtn.style.display = "block";

  // Update driver name
  const driverNameElement = document.getElementById("driverName");
  if (driverNameElement) {
    driverNameElement.textContent = user.firstName || user.name || "Driver";
  }
}

function loadDriverData() {
  // Load driver statistics
  const stats = {
    totalTrips: localStorage.getItem("driverTotalTrips") || 0,
    hoursWorked: localStorage.getItem("driverHoursWorked") || "0h",
    rating: localStorage.getItem("driverRating") || "4.8",
  };

  // Update stat elements (only if they exist)
  const totalTripsEl = document.getElementById("totalTrips");
  const hoursWorkedEl = document.getElementById("hoursWorked");
  const ratingEl = document.getElementById("rating");

  if (totalTripsEl) totalTripsEl.textContent = stats.totalTrips;
  if (hoursWorkedEl) hoursWorkedEl.textContent = stats.hoursWorked;
  if (ratingEl) ratingEl.textContent = stats.rating;
}

async function loadCurrentTrip() {
  let latestTrip = [];
  try {
    const result = await bookingApi.getUpcomingTrips();
    console.log("Upcoming Trips:", result);
    if (result.upcomingTrips.length == 0) {
      console.log("No current trip found.");
      return;
    }

    latestTrip = result.upcomingTrips[0];
  } catch (error) {
    console.error("Error loading recent trips:", error);
  }

  //choose the starting and dest location
  let startingLocation;
  let destinationLocation;
  if (latestTrip.direction_type == "FROM_LOC1") {
    startingLocation = latestTrip.location_1 || "Unknown Pickup";
    destinationLocation = latestTrip.location_2 || "Unknown Dropoff";
  } else {
    startingLocation = latestTrip.location_2 || "Unknown Pickup";
    destinationLocation = latestTrip.location_1 || "Unknown Dropoff";
  }

  // Create a fake active trip for testing
  const latestTripObj = {
    id: latestTrip.ID,
    bookingReference: latestTrip.booking_reference || latestTrip.ID,
    status: latestTrip.booking_status || "pending",
    pickupLocation: startingLocation,
    dropoffLocation: destinationLocation,
    seatCount: latestTrip.total_seats - latestTrip.total_seats_available || 1,  
    extraspaceCount: latestTrip.extra_space_count || 0,
    scheduledAt: latestTrip.scheduled_pickup
      ? new Date(latestTrip.scheduled_pickup).toLocaleString("en-ZA", {
          month: "2-digit",
          day: "2-digit",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        })
      : "15  min",
    amountPaid: latestTrip.total_amount_paid || 0,
    amountNeeded: latestTrip.total_amount_needed || 100.0,
  };
  // currentTrip = JSON.stringify(latestTripObj);
  // const trip = JSON.parse(currentTrip);
  displayCurrentTrip(latestTripObj);

  updateDateTime(latestTripObj.scheduledAt);
}

function displayCurrentTrip(trip) {
  const currentTripCard = document.getElementById("currentTripCard");
  if (!currentTripCard) return;

  // Update trip details
  document.getElementById("pickupLocation").textContent =
    trip.pickupLocation || "Pickup Location";
  document.getElementById("dropoffLocation").textContent =
    trip.dropoffLocation || "Dropoff Location";
  document.getElementById("estimatedTime").textContent = `Scheduled time: ${
    trip.scheduledAt || "15 min"
  }`;
  document.getElementById("passengerCount").textContent = `${
    trip.seatCount || 1
  } Seat${trip.seatCount > 1 ? "s" : ""} + ${
    trip.extraspaceCount || 0
  } Extra Space${trip.extraspaceCount > 1 ? "s" : ""}`;

  // Booking reference and amount progress (paid / needed)
  const bookingRefEl = document.getElementById("bookingRef");
  if (bookingRefEl)
    bookingRefEl.textContent = `Booking: ${
      trip.bookingReference || trip.id || "—"
    }`;

  const amountTextEl = document.getElementById("amountText");
  const amountPercentTextEl = document.getElementById("amountPercentText");
  const amountProgressFill = document.getElementById("amountProgressFill");

  const paid = Number(trip.amountPaid ?? trip.paid ?? 0);
  const needed = Number(trip.amountNeeded ?? trip.totalAmount ?? 0);

  if (amountTextEl)
    amountTextEl.textContent = `R${paid.toFixed(2)} / R${needed.toFixed(2)}`;
  let percent = needed <= 0 ? 100 : Math.round((paid / needed) * 100);
  if (percent > 100) percent = 100;
  if (amountPercentTextEl) amountPercentTextEl.textContent = `${percent}%`;
  if (amountProgressFill) {
    amountProgressFill.style.width = `${percent}%`;
    amountProgressFill.style.transition = "width 0.8s ease";
    if (percent >= 100) {
      amountProgressFill.classList.add("complete");
    } else {
      amountProgressFill.classList.remove("complete");
    }
  }

  // Update trip status
  const tripStatus = document.getElementById("tripStatus");
  if (tripStatus) {
    tripStatus.textContent = trip.status || "In Progress";
    tripStatus.className = `trip-status ${
      trip.status?.toLowerCase() || "active"
    }`;
  }

    // Ensure a navigate button exists and send booking id when clicked
  let navBtn = document.getElementById("navigateBtn");
  if (!navBtn) {
    navBtn = document.createElement("button");
    navBtn.id = "navigateBtn";
    navBtn.className = "btn btn-primary navigate-btn";
    navBtn.textContent = "Navigate";
    // Append the button into the current trip card (adjust position if needed)
    currentTripCard.appendChild(navBtn);
  }
  navBtn.onclick = () => {
    const bookingId = trip.id ;
    if (bookingId) {
      sendBookingIdForNavigation(bookingId);
    } else {
      console.warn("No booking id available to navigate.");
    }
  };

  // Show the card
  currentTripCard.style.display = "block";
}

// Add function to send booking id and navigate
function sendBookingIdForNavigation(bookingId) {
  try {
    if (!bookingId) return;
    // Persist id so navigation page can pick it up
    localStorage.setItem("navigationBookingId", bookingId);

    // Non-blocking notify backend (optional, ignored on failure)
    if (typeof BASE_URL !== "undefined" && navigator && navigator.sendBeacon) {
      try {
        navigator.sendBeacon(
          `${BASE_URL}/api/bookings/${encodeURIComponent(bookingId)}/navigation-start`,
          JSON.stringify({ ts: new Date().toISOString() })
        );
      } catch (e) {
        // ignore
      }
    }

    // Navigate to navigation UI, include bookingId as query param for convenience
    window.location.href = `/pages/driver/navigation.html?bookingId=${encodeURIComponent(
      bookingId
    )}`;
  } catch (e) {
    console.error("Error initiating navigation:", e);
  }
}

async function loadRecentTrips() {
  let recentTrips = [];
  let upcomingList = [];
  try {
    const result = await bookingApi.getUpcomingTrips();
    if (result.upcomingTrips.length <= 1) {
      console.log("No recent trips found.");
      return;
    }
    upcomingList = result.upcomingTrips.slice(1);
  } catch (error) {
    console.error("Error loading recent trips:", error);
  }

  const recentTripsContainer = document.getElementById("recentTrips");
  if (!recentTripsContainer) {
    console.warn("Recent trips container not found");
    return;
  }

  console.log("upcomingList:", upcomingList);

  recentTrips = upcomingList.map((trip) => {
    let startingLocation;
    let destinationLocation;
    if (trip.direction_type == "FROM_LOC1") {
      startingLocation = trip.location_1 || "Unknown Pickup";
      destinationLocation = trip.location_2 || "Unknown Dropoff";
    } else {
      startingLocation = trip.location_2 || "Unknown Pickup";
      destinationLocation = trip.location_1 || "Unknown Dropoff";
    }
    return {
      id: trip.ID,
      bookingReference: trip.booking_reference || trip.ID,
      status: trip.booking_status || "pending",
      pickupLocation: startingLocation,
      dropoffLocation: destinationLocation,
      scheduledAt: trip.scheduled_pickup ? new Date(trip.scheduled_pickup).toLocaleString("en-ZA", {
          month: "2-digit",
          day: "2-digit",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        })
      : "15  min",
      seatCount: trip.total_seats - trip.total_seats_available || 1,
      extraspaceCount: trip.extra_space_count || 0,
      amountPaid: trip.total_amount_paid || 0,
      amountNeeded: trip.total_amount_needed || 0,
    };

  });

  // Display recent trips
  recentTripsContainer.innerHTML = recentTrips
    .map((trip) => {
      const paid = Number(trip.amountPaid ?? trip.paid ?? 0);
      const needed = Number(trip.amountNeeded ?? trip.totalAmount ?? 0);
      let percent = needed <= 0 ? 100 : Math.round((paid / needed) * 100);
      if (percent > 100) percent = 100;
      const percentClass =
        percent >= 100 ? "progress-fill complete" : "progress-fill";
      return `
        <div class="trip-card ${trip.status}">
            <div class="trip-header">
                <div class="trip-id">Trip #${trip.id}</div>
                <div class="trip-status ${trip.status}">${trip.status}</div>
            </div>
            <div class="trip-details">
                <div class="trip-detail">
                    <i class="fas fa-map-marker-alt"></i>
                    <span>${trip.pickupLocation}</span>
                </div>
                <div class="trip-detail">
                    <i class="fas fa-flag-checkered"></i>
                    <span>${trip.dropoffLocation}</span>
                </div>
                <div class="trip-detail">
                    <i class="fas fa-clock"></i>
                    <span>${
                       trip.scheduledAt
                    }</span>
                </div>
                <div class="trip-detail">
                    <i class="fas fa-users"></i>
                    <span>${
    trip.seatCount || 1
  } Seat${trip.seatCount > 1 ? "s" : ""} + ${
    trip.extraspaceCount || 0
  } Extra Space${trip.extraspaceCount > 1 ? "s" : ""}</span>
                </div>

                <div class="trip-detail">
                    <i class="fas fa-receipt"></i>
                    <span class="bookingRef">Booking: ${
                      trip.bookingReference || trip.id
                    }</span>
                </div>

                <div class="trip-detail amount-info" style="flex-direction:column; align-items:flex-start;">
                    <div class="amount-row">
                        <span class="amountText">R${paid.toFixed(
                          2
                        )} / R${needed.toFixed(2)}</span>
                        <span class="amountPercentText">${percent}%</span>
                    </div>
                    <div class="progress" aria-hidden="true">
                        <div class="${percentClass}" style="width:${percent}%;"></div>
                    </div>
                </div>
            </div>
        </div>
    `;
    })
    .join("");
}

function updateDateTime(scheduledTime) {
  const now = new Date(scheduledTime); // Fixed date for testing

  // Format date (e.g., "Monday, 15 Jan 2024")
  const dateOptions = {
    weekday: "long",
    year: "numeric",
    month: "short",
    day: "numeric",
  };
  const formattedDate = now.toLocaleDateString("en-ZA", dateOptions);

  // Format time (e.g., "14:30")
  const timeOptions = {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  };
  const formattedTime = now.toLocaleTimeString("en-ZA", timeOptions);

  // Update displays
  const dateElement = document.getElementById("currentDate");
  const timeElement = document.getElementById("currentTime");
  const timeLargeElement = document.getElementById("currentTimeLarge");
  dateElement ? (dateElement.textContent = formattedDate !== "Invalid Date" ? formattedDate : "--:--") : "";
  timeElement ? (timeElement.textContent = formattedTime !== "Invalid Date" ? formattedTime : "--:--") : "";
  timeLargeElement ? (timeLargeElement.textContent = formattedTime !== "Invalid Date" ? formattedTime : "--:--") : "";
}

function formatDateTime(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const diffInHours = (now - date) / (1000 * 60 * 60);

  if (diffInHours < 1) {
    const diffInMinutes = Math.floor((now - date) / (1000 * 60));
    return `${diffInMinutes}m ago`;
  } else if (diffInHours < 24) {
    const diffInHours = Math.floor((now - date) / (1000 * 60 * 60));
    return `${diffInHours}h ago`;
  } else if (diffInHours < 48) {
    return "Yesterday";
  } else {
    return date.toLocaleDateString("en-ZA", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  }
}

function checkForNewTrips() {
  // Check for new trip assignments
  const newTrips = JSON.parse(localStorage.getItem("newDriverTrips") || "[]");

  if (newTrips.length > 0) {
    showNewTripNotification(newTrips[0]);
    // Remove the notification after showing
    localStorage.removeItem("newDriverTrips");
  }
}

function showNewTripNotification(trip) {
  // Create notification element
  const notification = document.createElement("div");
  notification.className = "notification success";
  notification.innerHTML = `
        <h4>New Trip Assigned!</h4>
        <p>Trip #${trip.id} - ${trip.pickupLocation} to ${trip.dropoffLocation}</p>
        <button class="btn btn-primary" onclick="acceptTrip('${trip.id}')">Accept Trip</button>
        <button class="btn btn-secondary" onclick="dismissNotification(this)">Dismiss</button>
    `;

  document.body.appendChild(notification);

  // Auto-remove after 10 seconds
  setTimeout(() => {
    if (notification.parentNode) {
      notification.parentNode.removeChild(notification);
    }
  }, 10000);
}

function acceptTrip(tripId) {
  // Accept the trip
  const newTrips = JSON.parse(localStorage.getItem("newDriverTrips") || "[]");
  const trip = newTrips.find((t) => t.id === tripId);

  if (trip) {
    // Move to current trip
    localStorage.setItem("currentDriverTrip", JSON.stringify(trip));

    // Remove from new trips
    const updatedTrips = newTrips.filter((t) => t.id !== tripId);
    localStorage.setItem("newDriverTrips", JSON.stringify(updatedTrips));

    // Update display
    loadCurrentTrip();

    // Show success message
    showSuccessMessage("Trip accepted successfully!");
  }

  // Remove notification
  const notification = event.target.closest(".notification");
  if (notification) {
    notification.remove();
  }
}

function dismissNotification(button) {
  const notification = button.closest(".notification");
  if (notification) {
    notification.remove();
  }
}

function showSuccessMessage(message) {
  const notification = document.createElement("div");
  notification.className = "notification success";
  notification.innerHTML = `
        <i class="fas fa-check-circle"></i>
        <span>${message}</span>
    `;

  document.body.appendChild(notification);

  setTimeout(() => {
    if (notification.parentNode) {
      notification.parentNode.removeChild(notification);
    }
  }, 3000);
}

// Export functions for global access
window.acceptTrip = acceptTrip;
window.dismissNotification = dismissNotification;
