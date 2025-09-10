// Admin Pending Routes functionality
import { makeAdminRequest, showLoading, showError, formatDate, createStatusBadge } from './adminCommon.js';

let pendingRoutesData = [];

// Load pending routes
export async function loadPendingRoutes() {
  try {
    showLoading('pendingRoutesContainer');
    
    const response = await makeAdminRequest('pending-routes');
    const data = await response.json();
    pendingRoutesData = data.pendingRoutes;
    displayPendingRoutes(data.pendingRoutes);
  } catch (error) {
    console.error('Error loading pending routes:', error);
    showError('pendingRoutesContainer', 'Failed to load pending routes. Please try again.');
  }
}

// Display pending routes
function displayPendingRoutes(routes) {
  const container = document.getElementById('pendingRoutesContainer');
  
  if (!routes || routes.length === 0) {
    container.innerHTML = '<p>No pending routes found.</p>';
    return;
  }

  const routesHtml = routes.map(route => `
    <div class="pending-route-card">
      <div class="route-header">
        <h3>${route.name}</h3>
        <span class="status-badge ${route.status}">${route.status}</span>
      </div>
      <div class="route-details">
        <p><strong>From:</strong> ${route.start_rank_name}</p>
        <p><strong>To:</strong> ${route.end_rank_name}</p>
        <p><strong>Price:</strong> R${route.price}</p>
        <p><strong>Type:</strong> ${route.route_type}</p>
        <p><strong>Method:</strong> ${route.travel_method}</p>
        <p><strong>Contributor:</strong> ${route.username} (${route.email})</p>
        <p><strong>Submitted:</strong> ${formatDate(route.created_at)}</p>
      </div>
      <div class="route-actions">
        <button class="btn btn-success" onclick="approveRoute(${route.ID})">
          <i class="fas fa-check"></i> Approve
        </button>
        <button class="btn btn-danger" onclick="rejectRoute(${route.ID})">
          <i class="fas fa-times"></i> Reject
        </button>
        <button class="btn btn-primary" onclick="viewRouteDetails(${route.ID})">
          <i class="fas fa-eye"></i> View Details
        </button>
      </div>
    </div>
  `).join('');

  container.innerHTML = routesHtml;
}

// Approve route
export async function approveRoute(routeId) {
  if (!confirm('Are you sure you want to approve this route?')) {
    return;
  }

  try {
    const response = await makeAdminRequest(`pending-routes/${routeId}/approve`, {
      method: 'PUT'
    });

    if (response.ok) {
      alert('Route approved successfully!');
      loadPendingRoutes();
    }
  } catch (error) {
    console.error('Error approving route:', error);
    alert('Error approving route. Please try again.');
  }
}

// Reject route
export async function rejectRoute(routeId) {
  const reason = prompt('Please provide a reason for rejection:');
  if (!reason) {
    return;
  }

  try {
    const response = await makeAdminRequest(`pending-routes/${routeId}/reject`, {
      method: 'PUT',
      body: JSON.stringify({ reason })
    });

    if (response.ok) {
      alert('Route rejected successfully!');
      loadPendingRoutes();
    }
  } catch (error) {
    console.error('Error rejecting route:', error);
    alert('Error rejecting route. Please try again.');
  }
}

// View route details
export async function viewRouteDetails(routeId) {
  try {
    const response = await makeAdminRequest(`pending-routes/${routeId}`);
    const data = await response.json();
    showRouteDetailsModal(data.route);
  } catch (error) {
    console.error('Error fetching route details:', error);
    alert('Error loading route details. Please try again.');
  }
}

// Show route details modal
function showRouteDetailsModal(route) {
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.innerHTML = `
    <div class="modal-content">
      <div class="modal-header">
        <h2>Route Details: ${route.name}</h2>
        <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">
          <i class="fas fa-times"></i>
        </button>
      </div>
      <div class="modal-body">
        <div class="route-info">
          <h3>Basic Information</h3>
          <p><strong>Start:</strong> ${route.start_rank_name}</p>
          <p><strong>End:</strong> ${route.end_rank_name}</p>
          <p><strong>Price:</strong> R${route.price}</p>
          <p><strong>Type:</strong> ${route.route_type}</p>
          <p><strong>Method:</strong> ${route.travel_method}</p>
        </div>
        <div class="route-coordinates">
          <h3>Route Coordinates</h3>
          <p><strong>Mini Routes:</strong> ${route.miniRoutes ? route.miniRoutes.length : 0}</p>
          <p><strong>Direction Routes:</strong> ${route.directionRoutes ? route.directionRoutes.length : 0}</p>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-success" onclick="approveRoute(${route.ID}); this.closest('.modal-overlay').remove();">
          <i class="fas fa-check"></i> Approve
        </button>
        <button class="btn btn-danger" onclick="rejectRoute(${route.ID}); this.closest('.modal-overlay').remove();">
          <i class="fas fa-times"></i> Reject
        </button>
        <button class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">
          Close
        </button>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
}

// Filter pending routes
export function filterPendingRoutes() {
  const filter = document.getElementById('statusFilter').value;
  let filteredRoutes = pendingRoutesData;

  if (filter !== 'all') {
    filteredRoutes = pendingRoutesData.filter(route => route.status === filter);
  }

  displayPendingRoutes(filteredRoutes);
}

// Refresh pending routes
export function refreshPendingRoutes() {
  loadPendingRoutes();
}
