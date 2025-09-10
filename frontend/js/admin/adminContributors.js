// Admin Contributors functionality
import { makeAdminRequest, showLoading, showError, formatDate, createStatusBadge } from './adminCommon.js';

let contributorsData = [];

// Load contributors
export async function loadContributors() {
  try {
    showLoading('contributorsContainer');
    
    const response = await makeAdminRequest('contributors');
    const data = await response.json();
    contributorsData = data.contributors;
    updateStats(data.contributors);
    displayContributors(data.contributors);
  } catch (error) {
    console.error('Error loading contributors:', error);
    showError('contributorsContainer', 'Failed to load contributors. Please try again.');
  }
}

// Update stats
function updateStats(contributors) {
  const totalContributors = contributors.length;
  const totalRoutesContributed = contributors.reduce((sum, c) => sum + c.routes_contributed, 0);
  const activeContributors = contributors.filter(c => c.status === 'active').length;

  document.getElementById('totalContributors').textContent = totalContributors;
  document.getElementById('totalRoutesContributed').textContent = totalRoutesContributed;
  document.getElementById('activeContributors').textContent = activeContributors;
}

// Display contributors
function displayContributors(contributors) {
  const container = document.getElementById('contributorsContainer');
  
  if (!contributors || contributors.length === 0) {
    container.innerHTML = '<p>No contributors found.</p>';
    return;
  }

  const contributorsHtml = contributors.map(contributor => `
    <div class="contributor-card">
      <div class="contributor-header">
        <div class="contributor-avatar">
          ${contributor.name.charAt(0).toUpperCase()}
        </div>
        <div class="contributor-info">
          <h3>${contributor.name}</h3>
          <p class="contributor-email">${contributor.email || 'No email'}</p>
          <p class="contributor-region">${contributor.region}</p>
        </div>
        <div class="contributor-stats">
          <div class="stat-item">
            <span class="stat-number">${contributor.routes_contributed}</span>
            <span class="stat-label">Routes</span>
          </div>
          <span class="status-badge ${contributor.status}">${contributor.status}</span>
        </div>
      </div>
      <div class="contributor-details">
        <p><strong>Joined:</strong> ${formatDate(contributor.created_at)}</p>
        <p><strong>Username:</strong> ${contributor.username || 'N/A'}</p>
      </div>
      <div class="contributor-actions">
        <button class="btn btn-primary" onclick="viewContributorDetails(${contributor.ID})">
          <i class="fas fa-eye"></i> View Details
        </button>
        <button class="btn btn-secondary" onclick="viewContributorRoutes(${contributor.ID})">
          <i class="fas fa-route"></i> View Routes
        </button>
      </div>
    </div>
  `).join('');

  container.innerHTML = contributorsHtml;
}

// Sort contributors
export function sortContributors() {
  const sortBy = document.getElementById('contributorSort').value;
  const sorted = [...contributorsData].sort((a, b) => {
    if (sortBy === 'created_at') {
      return new Date(b[sortBy]) - new Date(a[sortBy]);
    }
    return b[sortBy] - a[sortBy];
  });
  displayContributors(sorted);
}

// Filter contributors
export function filterContributors() {
  const filter = document.getElementById('contributorFilter').value;
  let filtered = contributorsData;

  if (filter === 'active') {
    filtered = contributorsData.filter(c => c.status === 'active');
  } else if (filter === 'top') {
    filtered = contributorsData.filter(c => c.routes_contributed >= 5);
  }

  displayContributors(filtered);
}

// Refresh contributors
export function refreshContributors() {
  loadContributors();
}

// View contributor details
export function viewContributorDetails(contributorId) {
  const contributor = contributorsData.find(c => c.ID === contributorId);
  if (!contributor) return;

  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.innerHTML = `
    <div class="modal-content">
      <div class="modal-header">
        <h2>Contributor Details: ${contributor.name}</h2>
        <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">
          <i class="fas fa-times"></i>
        </button>
      </div>
      <div class="modal-body">
        <div class="contributor-detail-info">
          <p><strong>Name:</strong> ${contributor.name}</p>
          <p><strong>Email:</strong> ${contributor.email || 'N/A'}</p>
          <p><strong>Username:</strong> ${contributor.username || 'N/A'}</p>
          <p><strong>Region:</strong> ${contributor.region}</p>
          <p><strong>Routes Contributed:</strong> ${contributor.routes_contributed}</p>
          <p><strong>Status:</strong> ${createStatusBadge(contributor.status)}</p>
          <p><strong>Joined:</strong> ${formatDate(contributor.created_at)}</p>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">
          Close
        </button>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
}

// View contributor routes
export function viewContributorRoutes(contributorId) {
  // Implementation for viewing contributor's routes
  alert('Feature coming soon: View contributor routes');
}
