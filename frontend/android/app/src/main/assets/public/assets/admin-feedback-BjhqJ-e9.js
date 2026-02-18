import"./AddressSelection-CWIIN_Gi.js";import{s as c,m as o,b as i,f as l,t as f,l as p}from"./adminCommon-B1qRNhTn.js";import{r as b}from"./logout-DBLdyFVo.js";import"./axios-D4YhIzwJ.js";let n=[];async function d(){try{c("feedbackContainer");const a=await(await o("feedback")).json();n=a.feedback,r(a.feedback)}catch(e){console.error("Error loading feedback:",e),i("feedbackContainer","Failed to load feedback. Please try again.")}}function r(e){const a=document.getElementById("feedbackContainer");if(!e||e.length===0){a.innerHTML="<p>No feedback found.</p>";return}const t=e.map(s=>`
    <div class="feedback-card">
      <div class="feedback-header">
        <div class="feedback-type">
          <span class="type-badge ${s.feedback_type}">${s.feedback_type}</span>
        </div>
        <div class="feedback-status">
          <span class="status-badge ${s.status}">${s.status}</span>
        </div>
        <div class="feedback-date">
          ${l(s.created_at)}
        </div>
      </div>
      <div class="feedback-content">
        <h3>${s.subject}</h3>
        <p>${s.message}</p>
        ${s.user_email?`<p><strong>From:</strong> ${s.user_email}</p>`:""}
      </div>
      ${s.status==="pending"?`
        <div class="feedback-actions">
          <button class="btn btn-success" onclick="updateFeedbackStatus(${s.ID}, 'reviewed')">
            <i class="fas fa-check"></i> Mark as Reviewed
          </button>
          <button class="btn btn-primary" onclick="respondToFeedback(${s.ID})">
            <i class="fas fa-reply"></i> Respond
          </button>
        </div>
      `:""}
      ${s.admin_response?`
        <div class="admin-response">
          <h4>Admin Response:</h4>
          <p>${s.admin_response}</p>
        </div>
      `:""}
    </div>
  `).join("");a.innerHTML=t}function u(){const e=document.getElementById("feedbackFilter").value;let a=n;e!=="all"&&(e==="pending"||e==="reviewed"?a=n.filter(t=>t.status===e):a=n.filter(t=>t.feedback_type===e)),r(a)}function k(){d()}async function g(e,a){try{(await o(`feedback/${e}`,{method:"PUT",body:JSON.stringify({status:a})})).ok&&(alert("Feedback status updated successfully!"),d())}catch(t){console.error("Error updating feedback status:",t),alert("Error updating feedback status. Please try again.")}}function y(e){const a=prompt("Enter your response to this feedback:");a&&v(e,a)}async function v(e,a){try{(await o(`feedback/${e}`,{method:"PUT",body:JSON.stringify({status:"reviewed",admin_response:a})})).ok&&(alert("Response sent successfully!"),d())}catch(t){console.error("Error updating feedback:",t),alert("Error sending response. Please try again.")}}window.toggleAdminMobileMenu=f;window.logout=p;window.filterFeedback=u;window.refreshFeedback=k;window.updateFeedbackStatus=g;window.respondToFeedback=y;document.addEventListener("DOMContentLoaded",()=>{b(),d()});
