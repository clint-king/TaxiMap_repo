import"./AddressSelection-CWIIN_Gi.js";import{s as c,m as s,b as d,f as l,t as p,l as u}from"./adminCommon-B1qRNhTn.js";import{r as g}from"./logout-DBLdyFVo.js";import"./axios-D4YhIzwJ.js";let a=[];async function r(){try{c("pendingRoutesContainer");const t=await(await s("pending-routes")).json();a=t.pendingRoutes,i(t.pendingRoutes)}catch(e){console.error("Error loading pending routes:",e),d("pendingRoutesContainer","Failed to load pending routes. Please try again.")}}function i(e){const t=document.getElementById("pendingRoutesContainer");if(!e||e.length===0){t.innerHTML="<p>No pending routes found.</p>";return}const n=e.map(o=>`
    <div class="pending-route-card">
      <div class="route-header">
        <h3>${o.name}</h3>
        <span class="status-badge ${o.status}">${o.status}</span>
      </div>
      <div class="route-details">
        <p><strong>From:</strong> ${o.start_rank_name}</p>
        <p><strong>To:</strong> ${o.end_rank_name}</p>
        <p><strong>Price:</strong> R${o.price}</p>
        <p><strong>Type:</strong> ${o.route_type}</p>
        <p><strong>Method:</strong> ${o.travel_method}</p>
        <p><strong>Contributor:</strong> ${o.username} (${o.email})</p>
        <p><strong>Submitted:</strong> ${l(o.created_at)}</p>
      </div>
      <div class="route-actions">
        <button class="btn btn-success" onclick="approveRoute(${o.ID})">
          <i class="fas fa-check"></i> Approve
        </button>
        <button class="btn btn-danger" onclick="rejectRoute(${o.ID})">
          <i class="fas fa-times"></i> Reject
        </button>
        <button class="btn btn-primary" onclick="viewRouteDetails(${o.ID})">
          <i class="fas fa-eye"></i> View Details
        </button>
      </div>
    </div>
  `).join("");t.innerHTML=n}async function m(e){if(confirm("Are you sure you want to approve this route?"))try{(await s(`pending-routes/${e}/approve`,{method:"PUT"})).ok&&(alert("Route approved successfully!"),r())}catch(t){console.error("Error approving route:",t),alert("Error approving route. Please try again.")}}async function v(e){const t=prompt("Please provide a reason for rejection:");if(t)try{(await s(`pending-routes/${e}/reject`,{method:"PUT",body:JSON.stringify({reason:t})})).ok&&(alert("Route rejected successfully!"),r())}catch(n){console.error("Error rejecting route:",n),alert("Error rejecting route. Please try again.")}}async function f(e){try{const n=await(await s(`pending-routes/${e}`)).json();R(n.route)}catch(t){console.error("Error fetching route details:",t),alert("Error loading route details. Please try again.")}}function R(e){const t=document.createElement("div");t.className="modal-overlay",t.innerHTML=`
    <div class="modal-content">
      <div class="modal-header">
        <h2>Route Details: ${e.name}</h2>
        <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">
          <i class="fas fa-times"></i>
        </button>
      </div>
      <div class="modal-body">
        <div class="route-info">
          <h3>Basic Information</h3>
          <p><strong>Start:</strong> ${e.start_rank_name}</p>
          <p><strong>End:</strong> ${e.end_rank_name}</p>
          <p><strong>Price:</strong> R${e.price}</p>
          <p><strong>Type:</strong> ${e.route_type}</p>
          <p><strong>Method:</strong> ${e.travel_method}</p>
        </div>
        <div class="route-coordinates">
          <h3>Route Coordinates</h3>
          <p><strong>Mini Routes:</strong> ${e.miniRoutes?e.miniRoutes.length:0}</p>
          <p><strong>Direction Routes:</strong> ${e.directionRoutes?e.directionRoutes.length:0}</p>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-success" onclick="approveRoute(${e.ID}); this.closest('.modal-overlay').remove();">
          <i class="fas fa-check"></i> Approve
        </button>
        <button class="btn btn-danger" onclick="rejectRoute(${e.ID}); this.closest('.modal-overlay').remove();">
          <i class="fas fa-times"></i> Reject
        </button>
        <button class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">
          Close
        </button>
      </div>
    </div>
  `,document.body.appendChild(t)}function h(){const e=document.getElementById("statusFilter").value;let t=a;e!=="all"&&(t=a.filter(n=>n.status===e)),i(t)}function b(){r()}window.toggleAdminMobileMenu=p;window.logout=u;window.approveRoute=m;window.rejectRoute=v;window.viewRouteDetails=f;window.filterPendingRoutes=h;window.refreshPendingRoutes=b;document.addEventListener("DOMContentLoaded",()=>{g(),r()});
