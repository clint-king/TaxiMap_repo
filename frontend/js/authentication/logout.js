// Shared Logout Functionality
import axios from "axios";
import { BASE_URL } from "../AddressSelection.js";

axios.defaults.withCredentials = true;

// Global logout function
export async function handleLogout() {
  try {
    // Call backend logout endpoint
    await axios.post(`${BASE_URL}/auth/logout`);
  } catch (error) {
    console.error("Error during logout:", error);
  } finally {
    // Clear local storage
    localStorage.removeItem("userProfile");
    localStorage.removeItem("userType");
    localStorage.removeItem("activityLog");
    
    // Clear payment processing data to prevent showing processing state for different users
    localStorage.removeItem("yocoRedirectData");
    sessionStorage.removeItem("yocoRedirectData");
    sessionStorage.removeItem("yocoPaymentId");
    sessionStorage.removeItem("yocoRedirectBookingId");
    sessionStorage.removeItem("yocoPaymentToken");
    sessionStorage.removeItem("yocoPaymentResponse");

    // Redirect to home page
    window.location.href = "/index.html";
  }
}

// Add logout button to navigation
export function addLogoutButtonToNav() {
  // Find the navigation links container (try both nav-links and nav_group)
  const navLinks =
    document.querySelector(".nav-links") ||
    document.querySelector(".nav_group");

  if (navLinks && !document.getElementById("logoutBtn")) {
    // Create logout button
    const logoutBtn = document.createElement("a");
    logoutBtn.id = "logoutBtn";
    logoutBtn.className = "nav-logout-btn";
    logoutBtn.innerHTML = '<i class="fas fa-sign-out-alt"></i> Logout';
    logoutBtn.href = "#";
    logoutBtn.addEventListener("click", async (e) => {
      e.preventDefault();
      await handleLogout();
    });

    // Add to navigation
    navLinks.appendChild(logoutBtn);
  }
}

// Check if user is logged in and show/hide logout button accordingly
export function checkAuthStatus() {
  const userProfile = localStorage.getItem("userProfile");
  const logoutBtn = document.getElementById("logoutBtn");
  let storedUserType = localStorage.getItem("userType"); // 'client' | 'driver' | 'owner'

  if (userProfile) {
    // If userType not stored, attempt to infer from profile or fetch from backend
    if (!storedUserType) {
      try {
        const parsed = JSON.parse(userProfile);
        if (parsed?.user_type) {
          storedUserType = parsed.user_type;
          localStorage.setItem("userType", storedUserType);
        }
      } catch {}
    }

    //render role based navigation
    const render = (type) => renderRoleBasedNavigation(type);

    if (storedUserType) {
      // Render role-based navigation
      render(storedUserType);
    } else {
      // Fallback: fetch profile from backend to determine role
      fetchAndSetUserType()
        .then(render)
        .catch(() => render(null));
    }

    // User is logged in, show logout button
    if (!logoutBtn) {
      addLogoutButtonToNav();
    }
  } else {
    // User is not logged in, hide logout button
    if (logoutBtn) {
      logoutBtn.remove();
    }
    // Reset to public navigation
    renderRoleBasedNavigation(null);
  }
}

// Check if user is authenticated and redirect to home if not
export function requireAuth() {
  const userProfile = localStorage.getItem("userProfile");

  if (!userProfile) {
    // User is not logged in, redirect to home page
    console.log("User not authenticated, redirecting to home page");
    window.location.href = "/index.html";
    return false;
  }

  return true;
}

// Highlight current page in navigation
function highlightCurrentPage() {
  const currentPath = window.location.pathname;
  const navLinks = document.querySelectorAll(".nav-links a, .nav_group a");

  // Get user type to determine if owner/driver links should be highlighted
  const userType = localStorage.getItem("userType") || 
    (() => {
      try {
        const profile = JSON.parse(localStorage.getItem("userProfile") || "{}");
        return profile.user_type || null;
      } catch {
        return null;
      }
    })();

  // Define booking page patterns - all these pages should highlight "Book Taxi"
  const bookingPagePatterns = [
    "booking-payment.html",
    "booking-passenger-info.html",
    "booking-trip-info.html",
    "booking-select-transport.html",
    "booking-type-selection.html",
    "booking-public.html",
    "trip-status.html",
    "booking-confirmation.html",
    "booking-edit-locations.html",
    "booking-view-locations.html",
    "booking-passenger-management.html"
  ];

  // Define owner page patterns - all these pages should highlight "Owner Dashboard" (only if owner is logged in)
  const ownerPagePatterns = [
    "owner-dashboard.html",
    "owner-drivers.html",
    "owner-driver-post.html",
    "owner-vehicle-post.html",
    "owner-bookings.html",
    "owner-coverage.html",
    "owner-vehicles.html",
    "owner-portal.html"
  ];

  // Define driver page patterns - all these pages should highlight "Driver Dashboard"
  const driverPagePatterns = [
    "driver-dashboard.html",
    "driver-verification.html",
    "driver-trips.html",
    "driver-navigation.html"
  ];

  // Check if current page matches any pattern
  const currentPageName = currentPath.split("/").pop();
  const isBookingPage = bookingPagePatterns.some(pattern => 
    currentPageName.includes(pattern) || currentPath.includes(pattern)
  );
  const isOwnerPage = ownerPagePatterns.some(pattern => 
    currentPageName.includes(pattern) || currentPath.includes("/Owner/") || currentPath.includes("owner-")
  );
  const isDriverPage = driverPagePatterns.some(pattern => 
    currentPageName.includes(pattern) || currentPath.includes("/driver/") || currentPath.includes("driver-")
  );

  // Find the relevant dashboard links
  let bookTaxiLink = null;
  let ownerDashboardLink = null;
  let driverDashboardLink = null;
  
  navLinks.forEach((link) => {
    const linkHref = link.getAttribute("href");
    const linkText = link.textContent.trim().toLowerCase();
    
    // Find "Book Taxi" link
    if (linkHref && (
      linkHref.includes("booking-type-selection.html") ||
      linkText === "book taxi"
    )) {
      bookTaxiLink = link;
    }
    
    // Find "Owner Dashboard" link (only if owner is logged in)
    if (userType === "owner" && linkHref && (
      linkHref.includes("owner-dashboard.html") ||
      linkText === "owner dashboard"
    )) {
      ownerDashboardLink = link;
    }
    
    // Find "Driver Dashboard" link
    if (linkHref && (
      linkHref.includes("driver-dashboard.html") ||
      linkText === "driver dashboard"
    )) {
      driverDashboardLink = link;
    }
  });

  navLinks.forEach((link) => {
    // Remove any existing active class
    link.classList.remove("active");

    // Check if this link matches the current page
    const linkHref = link.getAttribute("href");
    if (linkHref) {
      // Handle different link formats and page variations
      const linkPageName = linkHref.split("/").pop(); // Get just the filename from href

      // Special case: If current page is an owner page and owner is logged in, highlight "Owner Dashboard" link
      if (isOwnerPage && userType === "owner" && link === ownerDashboardLink) {
        link.classList.add("active");
        return;
      }

      // Special case: If current page is a driver page, highlight "Driver Dashboard" link
      if (isDriverPage && link === driverDashboardLink) {
        link.classList.add("active");
        return;
      }

      // Special case: If current page is a booking page, highlight "Book Taxi" link
      if (isBookingPage && link === bookTaxiLink) {
        link.classList.add("active");
        return;
      }

      // Normal matching logic for other pages
      if (
        linkHref === currentPath ||
        linkPageName === currentPageName ||
        (linkHref.includes("client.html") &&
          currentPath.includes("client") &&
          !currentPath.includes("clientCrowdSource")) ||
        (linkHref.includes("clientCrowdSource.html") &&
          currentPath.includes("clientCrowdSource")) ||
        (linkHref.includes("profile.html") &&
          currentPath.includes("profile")) ||
        (linkHref.includes("index.html") && currentPath.includes("index"))
      ) {
        link.classList.add("active");
      }
    }
  });
}

// Initialize logout functionality when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  checkAuthStatus();
  highlightCurrentPage();
});

async function fetchAndSetUserType() {
  try {
    const res = await fetch(`${BASE_URL}/auth/profile`, {
      credentials: "include",
    });
    if (!res.ok) throw new Error("Failed to fetch profile");
    const data = await res.json();
    const type = data?.user?.user_type || data?.user_type || null;
    if (type) {
      localStorage.setItem("userType", type);
    }
    return type;
  } catch (e) {
    console.warn("Unable to fetch user profile for role:", e);
    return null;
  }
}

// Build role-based navigation links
function renderRoleBasedNavigation(userType) {
  // Locate containers if they exist
  const navLinksRoot =
    document.querySelector(".nav-links") ||
    document.querySelector(".nav_group");
  if (!navLinksRoot) return;

  // Prefer a dedicated container for full navigation if present
  let fullNav = navLinksRoot.querySelector("#fullNav");
  let authButtons = navLinksRoot.querySelector("#authButtons");
  // Role-only container we control to avoid clobbering static links (attach at top-level for alignment)
  let roleNav = navLinksRoot.querySelector("#roleNav");

  // If not present, create them to normalize structure
  if (!fullNav) {
    fullNav = document.createElement("div");
    fullNav.id = "fullNav";
    fullNav.className = "full-navigation";
    navLinksRoot.appendChild(fullNav);
  }
  if (!authButtons) {
    authButtons = document.createElement("div");
    authButtons.id = "authButtons";
    authButtons.className = "auth-buttons";
    navLinksRoot.appendChild(authButtons);
  }
  if (!roleNav) {
    roleNav = document.createElement("div");
    roleNav.id = "roleNav";
    navLinksRoot.appendChild(roleNav);
  }

  // Helper to create link
  const mkLink = (href, label, extraClass) => {
    const a = document.createElement("a");
    a.href = href;
    a.textContent = label;
    if (extraClass) a.className = extraClass;
    a.setAttribute("onclick", "topNavZIndexDecrease && topNavZIndexDecrease()");
    return a;
  };
  const hasLinkTo = (endsWith) => {
    const anchors = navLinksRoot.querySelectorAll("a[href]");
    for (const a of anchors) {
      const href = a.getAttribute("href") || "";
      if (href.endsWith(endsWith)) return true;
    }
    return false;
  };

  // Public (not logged in): show auth buttons, hide full nav
  if (!userType) {
    // Do not hide fullNav entirely; pages may have static links inside
    // Just clear role-only items and show auth buttons
    if (roleNav) {
      roleNav.innerHTML = "";
      roleNav.style.display = "none";
    }
    authButtons.style.display = "block";
    // Ensure auth buttons exist
    authButtons.innerHTML = "";
    authButtons.appendChild(
      mkLink("/pages/authentication/login.html", "Login", "btn-login")
    );
    authButtons.appendChild(
      mkLink("/pages/authentication/signup.html", "Sign Up", "btn-signup")
    );
    return;
  }

  // Logged in: hide auth buttons, show full nav
  authButtons.style.display = "none";
  // Ensure role-only container is visible and aligned with existing links
  fullNav.style.display = "block";
  // Reset role-only items before re-render
  roleNav.innerHTML = "";
  roleNav.style.display = "inline-flex";
  roleNav.style.gap = "12px";
  roleNav.style.alignItems = "center";
  roleNav.style.marginLeft = "10px";

  // Hide "Book Taxi" link for driver and owner users
  if (userType === "driver" || userType === "owner") {
    const allNavLinks = navLinksRoot.querySelectorAll("a");
    allNavLinks.forEach((link) => {
      const linkHref = link.getAttribute("href");
      const linkText = link.textContent.trim().toLowerCase();
      // Hide "Book Taxi" link
      if (
        (linkHref && (
          linkHref.includes("booking-type-selection.html") ||
          linkHref.includes("booking-trip-info.html")
        )) ||
        linkText === "book taxi"
      ) {
        link.style.display = "none";
      }
    });
  } else {
    // Show "Book Taxi" link for client users
    const allNavLinks = navLinksRoot.querySelectorAll("a");
    allNavLinks.forEach((link) => {
      const linkHref = link.getAttribute("href");
      const linkText = link.textContent.trim().toLowerCase();
      if (
        (linkHref && (
          linkHref.includes("booking-type-selection.html") ||
          linkHref.includes("booking-trip-info.html")
        )) ||
        linkText === "book taxi"
      ) {
        link.style.display = ""; // Reset to default display
      }
    });
  }

  // Role-specific additions
  if (userType === "driver") {
    // Only add if not already present in static markup
    if (
      !hasLinkTo("/pages/driver/driver-dashboard.html") &&
      !hasLinkTo("driver-dashboard.html")
    ) {
      roleNav.appendChild(
        mkLink("/pages/driver/driver-dashboard.html", "Driver Dashboard")
      );
    }
  } else if (userType === "owner") {
    if (
      !hasLinkTo("/pages/Owner/owner-dashboard.html") &&
      !hasLinkTo("owner-dashboard.html")
    ) {
      roleNav.appendChild(
        mkLink("/pages/Owner/owner-dashboard.html", "Owner Dashboard")
      );
    }
  }

  // Do not manage logout link here; global addLogoutButtonToNav handles it without duplicating if #logoutBtn exists
  
  // Re-highlight current page after navigation is updated (to catch dynamically added dashboard links)
  setTimeout(() => {
    highlightCurrentPage();
  }, 0);
}
