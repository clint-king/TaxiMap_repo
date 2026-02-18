import"./AddressSelection-CWIIN_Gi.js";import{s as d,m as l,b as m,f as a,c as b,t as v,l as p}from"./adminCommon-B1qRNhTn.js";import{r as g}from"./logout-DBLdyFVo.js";import"./axios-D4YhIzwJ.js";let s=[];async function c(){try{d("contributorsContainer");const t=await(await l("contributors")).json();s=t.contributors,f(t.contributors),i(t.contributors)}catch(o){console.error("Error loading contributors:",o),m("contributorsContainer","Failed to load contributors. Please try again.")}}function f(o){const t=o.length,n=o.reduce((r,u)=>r+u.routes_contributed,0),e=o.filter(r=>r.status==="active").length;document.getElementById("totalContributors").textContent=t,document.getElementById("totalRoutesContributed").textContent=n,document.getElementById("activeContributors").textContent=e}function i(o){const t=document.getElementById("contributorsContainer");if(!o||o.length===0){t.innerHTML="<p>No contributors found.</p>";return}const n=o.map(e=>`
    <div class="contributor-card">
      <div class="contributor-header">
        <div class="contributor-avatar">
          ${e.name.charAt(0).toUpperCase()}
        </div>
        <div class="contributor-info">
          <h3>${e.name}</h3>
          <p class="contributor-email">${e.email||"No email"}</p>
          <p class="contributor-region">${e.region}</p>
        </div>
        <div class="contributor-stats">
          <div class="stat-item">
            <span class="stat-number">${e.routes_contributed}</span>
            <span class="stat-label">Routes</span>
          </div>
          <span class="status-badge ${e.status}">${e.status}</span>
        </div>
      </div>
      <div class="contributor-details">
        <p><strong>Joined:</strong> ${a(e.created_at)}</p>
        <p><strong>Username:</strong> ${e.username||"N/A"}</p>
      </div>
      <div class="contributor-actions">
        <button class="btn btn-primary" onclick="viewContributorDetails(${e.ID})">
          <i class="fas fa-eye"></i> View Details
        </button>
        <button class="btn btn-secondary" onclick="viewContributorRoutes(${e.ID})">
          <i class="fas fa-route"></i> View Routes
        </button>
      </div>
    </div>
  `).join("");t.innerHTML=n}function C(){const o=document.getElementById("contributorSort").value,t=[...s].sort((n,e)=>o==="created_at"?new Date(e[o])-new Date(n[o]):e[o]-n[o]);i(t)}function w(){const o=document.getElementById("contributorFilter").value;let t=s;o==="active"?t=s.filter(n=>n.status==="active"):o==="top"&&(t=s.filter(n=>n.routes_contributed>=5)),i(t)}function y(){c()}function h(o){const t=s.find(e=>e.ID===o);if(!t)return;const n=document.createElement("div");n.className="modal-overlay",n.innerHTML=`
    <div class="modal-content">
      <div class="modal-header">
        <h2>Contributor Details: ${t.name}</h2>
        <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">
          <i class="fas fa-times"></i>
        </button>
      </div>
      <div class="modal-body">
        <div class="contributor-detail-info">
          <p><strong>Name:</strong> ${t.name}</p>
          <p><strong>Email:</strong> ${t.email||"N/A"}</p>
          <p><strong>Username:</strong> ${t.username||"N/A"}</p>
          <p><strong>Region:</strong> ${t.region}</p>
          <p><strong>Routes Contributed:</strong> ${t.routes_contributed}</p>
          <p><strong>Status:</strong> ${b(t.status)}</p>
          <p><strong>Joined:</strong> ${a(t.created_at)}</p>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">
          Close
        </button>
      </div>
    </div>
  `,document.body.appendChild(n)}function $(o){alert("Feature coming soon: View contributor routes")}window.toggleAdminMobileMenu=v;window.logout=p;window.sortContributors=C;window.filterContributors=w;window.refreshContributors=y;window.viewContributorDetails=h;window.viewContributorRoutes=$;document.addEventListener("DOMContentLoaded",()=>{g(),c()});
