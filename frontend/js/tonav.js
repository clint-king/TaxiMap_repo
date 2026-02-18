
// Check authentication status and update navigation
document.addEventListener('DOMContentLoaded', function() {
  const authButtons = document.getElementById('authButtons');
  const fullNav = document.getElementById('fullNav');
  
  // Check if user is logged in
  const isLoggedIn = localStorage.getItem('userProfile') || sessionStorage.getItem('userProfile');
  
  if (isLoggedIn) {
    // User is logged in - show full navigation
    if (authButtons) authButtons.style.display = 'none';
    if (fullNav) fullNav.style.display = 'block';
  } else {
    // User is not logged in - show auth buttons
    if (authButtons) authButtons.style.display = 'block';
    if (fullNav) fullNav.style.display = 'none';
  }
});

function topNavZIndexIncrease() {
const navbar = document.querySelector(".topnav");
if (navbar) navbar.style.zIndex = "3001";
}

function topNavZIndexDecrease() {
const navbar = document.querySelector(".topnav");
if (navbar) navbar.style.zIndex = "3";
}

   // Navigation functions
   function toggleMobileMenu() {
    const mobileMenu = document.getElementById('mobileMenu');
    if (mobileMenu) mobileMenu.classList.toggle('show');
}
