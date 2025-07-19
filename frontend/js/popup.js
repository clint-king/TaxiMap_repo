 function showSuccessPopup(message , isSuccess , callback) {

  //insert message
  const popup = document.getElementById('informPopup');
  popup.textContent = message;

  // Remove both states just in case
  popup.classList.remove('success', 'error');

  // Add the correct one
  popup.classList.add(isSuccess ? 'success' : 'error');

  //choose color
  popup.classList.add('show');



  setTimeout(() => {
    popup.classList.remove('show');
    if (callback) callback(); 
  }, 3000); // hide after 3 seconds
}


export default { showSuccessPopup };