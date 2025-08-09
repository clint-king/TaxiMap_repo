import  axios  from 'axios';
import {BASE_URL} from "./AddressSelection.js";

axios.defaults.withCredentials = true;

 // === DOM ELEMENTS ===
//sign up 
 const signupName = document.querySelector(".signupName");
 const signupEmail = document.querySelector(".signupEmail");
 const signupPassword = document.querySelector(".signupPassword");
 const signupConfirm = document.querySelector(".signupConfirm");
 const signupSubmit = document.querySelector(".signupSubmit");

 //log in
 const loginEmail = document.querySelector(".loginEmail");
 const loginPassword = document.querySelector(".loginPassword");
 const loginSubmit = document.querySelector(".loginSubmit");


 //=== VARIABLES ===



// === EVENT LISTENERS ===
if (signupSubmit) {
  signupSubmit.addEventListener("click", async (e) => {
    e.preventDefault();

    if (
      signupName.value.trim() === '' ||
      signupEmail.value.trim() === '' ||
      signupPassword.value.trim() === '' ||
      signupConfirm.value.trim() === ''
    ) {
      return alert("Fill in all inputs");
    }

    if (signupPassword.value !== signupConfirm.value) {
        console.log("Passwords do not match");
      return alert("Passwords do not match");
    }

    try {
      const response = await axios.post(`${BASE_URL}/auth/signup`, {
        name: signupName.value,
        email: signupEmail.value.trim(),
        password: signupPassword.value
      });
      // On success: clear inputs and redirect to login
      signupName.value = '';
      signupEmail.value = '';
      signupPassword.value = '';
      signupConfirm.value = '';
      window.location.href = '/login.html';
    } catch (err) {
      console.error(err);
      alert("Signup failed. Check your details or try again.");
    }
  });
}


if (loginSubmit) {
  loginSubmit.addEventListener("click", async (e) => {
    e.preventDefault();

    // Clear any previous inline error
    const errorEl = document.querySelector('.loginError');
    if (errorEl) errorEl.textContent = '';

    if (loginEmail.value.trim() === '' || loginPassword.value.trim() === '') {
      if (errorEl) errorEl.textContent = 'Please fill in all inputs';
      return;
    }

    try {
      const response = await axios.post(`${BASE_URL}/auth/login`, {
        email: loginEmail.value.trim(),
        password: loginPassword.value
      }, {
  withCredentials: "include"  
});

      const userType = response.data.user_type;

      if (userType === 'admin') {
        window.location.href = '/admin.html';
      } else if (userType === 'client') {
        window.location.href = '/client.html';
      } else {
        if (errorEl) errorEl.textContent = 'Unknown user type.';
      }

    } catch (err) {
      console.error(err);
      // Prefer inline error message
      const message = (err?.response?.status === 401 || err?.response?.status === 400)
        ? 'Email or password is wrong'
        : 'Login failed. Please try again.';
      if (errorEl) errorEl.textContent = message;
    }
  });
}



 //=== FUNCTIONS ===