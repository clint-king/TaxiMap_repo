// Contributors page functionality
import { BASE_URL } from './AddressSelection.js';

class ContributorsManager {
  constructor() {
    this.contributors = [];
    this.init();
  }

  async init() {
    await this.loadContributors();
    this.renderContributors();
  }

  async loadContributors() {
    try {
      const response = await fetch(`${BASE_URL}/admin/contributors`);
      if (response.ok) {
        const data = await response.json();
        this.contributors = data.contributors || [];
      } else {
        console.error('Failed to load contributors');
        this.contributors = [];
      }
    } catch (error) {
      console.error('Error loading contributors:', error);
      this.contributors = [];
    }
  }

  renderContributors() {
    const container = document.querySelector('.contributors-grid');
    if (!container) return;

    // Clear existing content
    container.innerHTML = '';

    // Render each contributor
    this.contributors.forEach((contributor, index) => {
      const contributorCard = this.createContributorCard(contributor, index);
      container.appendChild(contributorCard);
    });
  }

  createContributorCard(contributor, index) {
    const card = document.createElement('div');
    card.className = 'contributor-card bg-white rounded-lg shadow-lg p-6 transition duration-300';

    // Generate initials from name
    const initials = contributor.name.split(' ').map(n => n[0]).join('').toUpperCase();
    
    // Color classes for different contributors
    const colorClasses = [
      'bg-primary text-black', // Yellow for first contributor
      'bg-blue-100 text-blue-600',
      'bg-green-100 text-green-600',
      'bg-amber-100 text-amber-600',
      'bg-red-100 text-red-600',
      'bg-teal-100 text-teal-600',
      'bg-indigo-100 text-indigo-600',
      'bg-purple-100 text-purple-600'
    ];

    const colorClass = colorClasses[index % colorClasses.length];
    const badgeClass = colorClass.replace('bg-', 'bg-').replace('text-', 'text-');

    card.innerHTML = `
      <div class="flex items-center mb-4">
        <div class="w-16 h-16 ${colorClass} rounded-full flex items-center justify-center font-bold text-xl">
          ${initials}
        </div>
        <div class="ml-4">
          <h3 class="font-bold">${contributor.name}</h3>
          <span class="text-sm text-gray-500">${contributor.region || 'Route Contributor'}</span>
        </div>
      </div>
      <p class="text-gray-600 mb-4">
        ${this.getContributorDescription(contributor)}
      </p>
      <div class="flex justify-between items-center">
        <span class="${badgeClass} text-xs font-semibold px-3 py-1 rounded-full">
          ${this.getContributorBadge(contributor)}
        </span>
        <span class="text-xs text-gray-500">${this.formatDate(contributor.created_at)}</span>
      </div>
    `;

    return card;
  }

  getContributorDescription(contributor) {
    if (contributor.routes_contributed > 0) {
      return `Contributed ${contributor.routes_contributed} route${contributor.routes_contributed > 1 ? 's' : ''} to our database, helping improve navigation for thousands of commuters.`;
    } else {
      return 'Active community member helping to map and improve taxi routes across South Africa.';
    }
  }

  getContributorBadge(contributor) {
    const routes = contributor.routes_contributed;
    if (routes >= 40) return 'Top Contributor';
    if (routes >= 30) return 'Route Expert';
    if (routes >= 20) return 'Community Leader';
    if (routes >= 10) return 'Data Specialist';
    if (routes >= 5) return 'Regional Expert';
    return 'New Contributor';
  }

  formatDate(dateString) {
    if (!dateString) return 'Recently';
    
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) return 'Since yesterday';
    if (diffDays < 30) return `Since ${diffDays} days ago`;
    if (diffDays < 365) {
      const months = Math.floor(diffDays / 30);
      return `Since ${months} month${months > 1 ? 's' : ''} ago`;
    }
    
    const years = Math.floor(diffDays / 365);
    return `Since ${years} year${years > 1 ? 's' : ''} ago`;
  }
}

// Initialize contributors when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new ContributorsManager();
});
