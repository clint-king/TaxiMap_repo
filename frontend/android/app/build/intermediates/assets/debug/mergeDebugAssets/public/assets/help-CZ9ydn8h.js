import{B as r}from"./AddressSelection-CWIIN_Gi.js";/* empty css               *//* empty css              */import"./logout-DBLdyFVo.js";import{a as n}from"./axios-D4YhIzwJ.js";import{p}from"./popup-CwFhKe62.js";document.addEventListener("DOMContentLoaded",function(){const e=document.getElementById("authButtons"),t=document.getElementById("fullNav");localStorage.getItem("userProfile")||sessionStorage.getItem("userProfile")?(e.style.display="none",t.style.display="block"):(e.style.display="block",t.style.display="none")});n.defaults.withCredentials=!0;const d=document.querySelector("#categorySelect"),a=document.querySelector("#faqList"),i=document.querySelector("#questionForm"),f=document.querySelector("#myQuestionsSection"),y=document.querySelector("#questionsList");function g(){l(),m(),d.addEventListener("change",l),i.addEventListener("submit",h)}async function l(){try{const e=d.value,t=await n.get(`${r}/help/faqs?category=${e}`);v(t.data.faqs)}catch(e){console.error("Error loading FAQs:",e),L("Failed to load FAQs. Please try again.")}}function v(e){if(!e||e.length===0){a.innerHTML=`
            <div class="empty-state">
                <i class="fas fa-question-circle"></i>
                <p>No FAQs found for this category.</p>
            </div>
        `;return}a.innerHTML=e.map(t=>`
        <div class="faq-item">
            <div class="faq-question" onclick="toggleFAQ(this)">
                <span class="faq-category">${t.category}</span>
                <h3>${t.question}</h3>
                <i class="fas fa-chevron-down faq-toggle"></i>
            </div>
            <div class="faq-answer">
                <p>${t.answer}</p>
            </div>
        </div>
    `).join("")}window.toggleFAQ=function(e){const t=e.parentElement,o=t.classList.contains("active");document.querySelectorAll(".faq-item").forEach(s=>{s.classList.remove("active")}),o||t.classList.add("active")};async function m(){try{const e=await n.get(`${r}/help/my-questions`,{withCredentials:!0});e.data.questions&&e.data.questions.length>0&&(q(e.data.questions),f.style.display="block")}catch(e){console.error("Error loading user questions:",e)}}function q(e){y.innerHTML=e.map(t=>`
        <div class="question-item">
            <div class="question-meta">
                <span>Submitted: ${new Date(t.created_at).toLocaleDateString()}</span>
                <span class="question-status status-${t.status}">${t.status}</span>
            </div>
            <div class="question-text">${t.question}</div>
            ${t.admin_answer?`
                <div class="admin-answer">
                    <h4>Admin Response:</h4>
                    <p>${t.admin_answer}</p>
                </div>
            `:""}
        </div>
    `).join("")}async function h(e){e.preventDefault();const t=new FormData(i),o={question:t.get("question"),email:t.get("email")};try{const s=await n.post(`${r}/help/submit-question`,o,{withCredentials:!0});u("Question submitted successfully! We'll get back to you soon.",!0),i.reset(),m()}catch(s){console.error("Error submitting question:",s);let c="Failed to submit question. Please try again.";s.response&&s.response.data&&s.response.data.error&&(c=s.response.data.error),u(c,!1)}}function u(e,t){p.showSuccessPopup(e,t)}function L(e){a.innerHTML=`
        <div class="loading">
            <i class="fas fa-exclamation-triangle"></i>
            <p>${e}</p>
        </div>
    `}document.addEventListener("DOMContentLoaded",g);
