import axios from "axios";
import popup from "../popup.js";
import { BASE_URL } from "../AddressSelection.js";

axios.defaults.withCredentials = true;

// Help page elements
const categorySelect = document.querySelector("#categorySelect");
const faqList = document.querySelector("#faqList");
const questionForm = document.querySelector("#questionForm");
const myQuestionsSection = document.querySelector("#myQuestionsSection");
const questionsList = document.querySelector("#questionsList");

// Initialize help page functionality
function initHelp() {
    loadFAQs();
    loadUserQuestions();
    
    // Event listeners
    categorySelect.addEventListener("change", loadFAQs);
    questionForm.addEventListener("submit", handleQuestionSubmit);
}

// Load FAQs
async function loadFAQs() {
    try {
        const category = categorySelect.value;
        const response = await axios.get(`${BASE_URL}/help/faqs?category=${category}`);
        
        displayFAQs(response.data.faqs);
    } catch (error) {
        console.error("Error loading FAQs:", error);
        showError("Failed to load FAQs. Please try again.");
    }
}

// Display FAQs
function displayFAQs(faqs) {
    if (!faqs || faqs.length === 0) {
        faqList.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-question-circle"></i>
                <p>No FAQs found for this category.</p>
            </div>
        `;
        return;
    }

    faqList.innerHTML = faqs.map(faq => `
        <div class="faq-item">
            <div class="faq-question" onclick="toggleFAQ(this)">
                <span class="faq-category">${faq.category}</span>
                <h3>${faq.question}</h3>
                <i class="fas fa-chevron-down faq-toggle"></i>
            </div>
            <div class="faq-answer">
                <p>${faq.answer}</p>
            </div>
        </div>
    `).join("");
}

// Toggle FAQ item
window.toggleFAQ = function(element) {
    const faqItem = element.parentElement;
    const isActive = faqItem.classList.contains("active");
    
    // Close all other FAQs
    document.querySelectorAll(".faq-item").forEach(item => {
        item.classList.remove("active");
    });
    
    // Toggle current FAQ
    if (!isActive) {
        faqItem.classList.add("active");
    }
};

// Load user questions
async function loadUserQuestions() {
    try {
        const response = await axios.get(`${BASE_URL}/help/my-questions`, {
            withCredentials: true
        });
        
        if (response.data.questions && response.data.questions.length > 0) {
            displayUserQuestions(response.data.questions);
            myQuestionsSection.style.display = "block";
        }
    } catch (error) {
        console.error("Error loading user questions:", error);
        // Don't show error for this as it might be due to not being logged in
    }
}

// Display user questions
function displayUserQuestions(questions) {
    questionsList.innerHTML = questions.map(question => `
        <div class="question-item">
            <div class="question-meta">
                <span>Submitted: ${new Date(question.created_at).toLocaleDateString()}</span>
                <span class="question-status status-${question.status}">${question.status}</span>
            </div>
            <div class="question-text">${question.question}</div>
            ${question.admin_answer ? `
                <div class="admin-answer">
                    <h4>Admin Response:</h4>
                    <p>${question.admin_answer}</p>
                </div>
            ` : ''}
        </div>
    `).join("");
}

// Handle question submission
async function handleQuestionSubmit(e) {
    e.preventDefault();

    const formData = new FormData(questionForm);
    const questionData = {
        question: formData.get("question"),
        email: formData.get("email")
    };

    try {
        const response = await axios.post(`${BASE_URL}/help/submit-question`, questionData, {
            withCredentials: true
        });

        showPopup("Question submitted successfully! We'll get back to you soon.", true);
        questionForm.reset();
        
        // Reload user questions to show the new one
        loadUserQuestions();
    } catch (error) {
        console.error("Error submitting question:", error);
        let errorMessage = "Failed to submit question. Please try again.";
        
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

// Show error message
function showError(message) {
    faqList.innerHTML = `
        <div class="loading">
            <i class="fas fa-exclamation-triangle"></i>
            <p>${message}</p>
        </div>
    `;
}

// Initialize when DOM is loaded
document.addEventListener("DOMContentLoaded", initHelp);

// Export functions
export {
    initHelp,
    loadFAQs,
    loadUserQuestions
};
