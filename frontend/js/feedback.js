import axios from "axios";
import popup from "./popup.js";
import { BASE_URL } from "./AddressSelection.js";

axios.defaults.withCredentials = true;

// Feedback modal elements
const feedbackBtn = document.querySelector(".feedbackBtn");
const feedbackModal = document.querySelector(".feedbackModal");
const feedbackCloseBtn = document.querySelector("#feedback_close_button");
const cancelFeedbackBtn = document.querySelector("#cancelFeedback");
const feedbackForm = document.querySelector("#feedbackForm");

// Feedback form elements
const feedbackType = document.querySelector("#feedbackType");
const feedbackSubject = document.querySelector("#feedbackSubject");
const feedbackMessage = document.querySelector("#feedbackMessage");
const feedbackImages = document.querySelector("#feedbackImages");

// Initialize feedback functionality
function initFeedback() {
    if (!feedbackBtn) return;

    // Event listeners
    feedbackBtn.addEventListener("click", openFeedbackModal);
    feedbackCloseBtn.addEventListener("click", closeFeedbackModal);
    cancelFeedbackBtn.addEventListener("click", closeFeedbackModal);
    feedbackForm.addEventListener("submit", handleFeedbackSubmit);

    // Close modal when clicking outside
    feedbackModal.addEventListener("click", (e) => {
        if (e.target === feedbackModal) {
            closeFeedbackModal();
        }
    });
}

// Open feedback modal
function openFeedbackModal() {
    feedbackModal.style.visibility = "visible";
    feedbackForm.reset();
}

// Close feedback modal
function closeFeedbackModal() {
    feedbackModal.style.visibility = "hidden";
    feedbackForm.reset();
}

// Handle feedback form submission
async function handleFeedbackSubmit(e) {
    e.preventDefault();

    const formData = new FormData();
    formData.append("feedback_type", feedbackType.value);
    formData.append("subject", feedbackSubject.value);
    formData.append("message", feedbackMessage.value);

    // Add images if selected
    if (feedbackImages.files.length > 0) {
        for (let i = 0; i < feedbackImages.files.length; i++) {
            formData.append("images", feedbackImages.files[i]);
        }
    }

    try {
        const response = await axios.post(`${BASE_URL}/feedback/submit`, formData, {
            withCredentials: true,
            headers: {
                "Content-Type": "multipart/form-data"
            }
        });

        showPopup("Feedback submitted successfully! Thank you for your input.", true);
        closeFeedbackModal();
    } catch (error) {
        console.error("Error submitting feedback:", error);
        let errorMessage = "Failed to submit feedback. Please try again.";
        
        if (error.response && error.response.data && error.response.data.error) {
            errorMessage = error.response.data.error;
        }
        
        showPopup(errorMessage, false);
    }
}

// Show popup message
function showPopup(message, isSuccess) {
    popup.showSuccessPopup(message, isSuccess);
}

// Export functions
export {
    initFeedback,
    openFeedbackModal,
    closeFeedbackModal
};
