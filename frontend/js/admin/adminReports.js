// Admin Reports functionality
import { makeAdminRequest, showLoading, showError, formatDate, formatCurrency, createStatusBadge, debounce } from './adminCommon.js';
import { escapeHTML } from '../utils/sanitize.js';

// Global variables for charts
let charts = {};
let reportData = {};

// Initialize reports
export async function initializeReports() {
  setDefaultDateRange();
  await loadReportData();
  createCharts();
  populateTables();
}

// Set default date range
function setDefaultDateRange() {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 30);

  document.getElementById('startDate').value = startDate.toISOString().split('T')[0];
  document.getElementById('endDate').value = endDate.toISOString().split('T')[0];
}

// Update date range based on selection
export function updateDateRange() {
  const days = parseInt(document.getElementById('dateRange').value);
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  document.getElementById('startDate').value = startDate.toISOString().split('T')[0];
  document.getElementById('endDate').value = endDate.toISOString().split('T')[0];
  
  updateReports();
}

// Load report data from API
async function loadReportData() {
  try {
    const startDate = document.getElementById('startDate').value;
    const endDate = document.getElementById('endDate').value;

    const response = await makeAdminRequest(`reports?startDate=${startDate}&endDate=${endDate}`);
    reportData = await response.json();
    console.log('Report data loaded:', reportData);
    updateStats();
  } catch (error) {
    console.error('Error loading report data:', error);
    // Use mock data for demonstration
    reportData = generateMockData();
    updateStats();
  }
}

// Generate mock data for demonstration
function generateMockData() {
  const startDate = new Date(document.getElementById('startDate').value);
  const endDate = new Date(document.getElementById('endDate').value);
  const days = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));

  return {
    stats: {
      totalUsers: 1250,
      newRegistrations: 45,
      activeUsers: 320,
      totalRoutes: 180,
      routeSearches: 1250,
      contributors: 25
    },
    registrations: generateTimeSeriesData(days, 0, 10),
    activeUsers: generateTimeSeriesData(days, 50, 150),
    routeSearches: generateTimeSeriesData(days, 20, 80),
    activityTypes: [
      { type: 'Route Search', count: 1250 },
      { type: 'Profile Update', count: 320 },
      { type: 'Route Contribution', count: 45 },
      { type: 'Feedback', count: 25 }
    ],
    users: generateMockUsers(),
    routes: generateMockRoutes(),
    topLocations: [
      { location: 'Johannesburg CBD', searches: 450 },
      { location: 'Cape Town CBD', searches: 320 },
      { location: 'Durban CBD', searches: 280 },
      { location: 'Pretoria CBD', searches: 200 }
    ],
    peakHours: generateHourlyData(),
    provinces: [
      { province: 'Gauteng', routes: 85, users: 450 },
      { province: 'Western Cape', routes: 45, users: 320 },
      { province: 'KwaZulu-Natal', routes: 35, users: 280 },
      { province: 'Eastern Cape', routes: 15, users: 200 }
    ]
  };
}

// Generate time series data
function generateTimeSeriesData(days, min, max) {
  const data = [];
  const labels = [];
  const startDate = new Date(document.getElementById('startDate').value);

  for (let i = 0; i < days; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);
    labels.push(date.toISOString().split('T')[0]);
    data.push(Math.floor(Math.random() * (max - min + 1)) + min);
  }

  return { labels, data };
}

// Generate mock users
function generateMockUsers() {
  const users = [];
  const names = ['John Doe', 'Jane Smith', 'Mike Johnson', 'Sarah Wilson', 'David Brown'];
  const emails = ['john@example.com', 'jane@example.com', 'mike@example.com', 'sarah@example.com', 'david@example.com'];

  for (let i = 1; i <= 50; i++) {
    const name = names[i % names.length];
    const email = emails[i % emails.length].replace('@', `${i}@`);
    const regDate = new Date();
    regDate.setDate(regDate.getDate() - Math.floor(Math.random() * 365));
    const lastLogin = new Date();
    lastLogin.setDate(lastLogin.getDate() - Math.floor(Math.random() * 30));

    users.push({
      id: i,
      name: `${name} ${i}`,
      email: email,
      registrationDate: regDate.toISOString().split('T')[0],
      lastLogin: lastLogin.toISOString().split('T')[0],
      activityCount: Math.floor(Math.random() * 100),
      routesContributed: Math.floor(Math.random() * 5),
      status: Math.random() > 0.3 ? 'Active' : 'Inactive'
    });
  }

  return users;
}

// Generate mock routes
function generateMockRoutes() {
  const routes = [];
  const startLocations = ['Johannesburg CBD', 'Cape Town CBD', 'Durban CBD', 'Pretoria CBD'];
  const endLocations = ['Soweto', 'Khayelitsha', 'Umlazi', 'Mamelodi'];
  const types = ['Straight', 'Loop', 'Reverse'];

  for (let i = 1; i <= 30; i++) {
    const createdDate = new Date();
    createdDate.setDate(createdDate.getDate() - Math.floor(Math.random() * 180));

    routes.push({
      id: `R${i.toString().padStart(3, '0')}`,
      name: `Route ${i}`,
      startLocation: startLocations[i % startLocations.length],
      endLocation: endLocations[i % endLocations.length],
      price: Math.floor(Math.random() * 50) + 10,
      type: types[i % types.length],
      searchCount: Math.floor(Math.random() * 100),
      createdDate: createdDate.toISOString().split('T')[0],
      contributor: `User ${i}`
    });
  }

  return routes;
}

// Generate hourly data
function generateHourlyData() {
  const hours = [];
  for (let i = 0; i < 24; i++) {
    hours.push({
      hour: i,
      searches: Math.floor(Math.random() * 50) + (i >= 6 && i <= 18 ? 20 : 5)
    });
  }
  return hours;
}

// Update stats display
function updateStats() {
  const stats = reportData.stats;
  document.getElementById('totalUsers').textContent = stats.totalUsers.toLocaleString();
  document.getElementById('newRegistrations').textContent = stats.newRegistrations.toLocaleString();
  document.getElementById('activeUsers').textContent = stats.activeUsers.toLocaleString();
  document.getElementById('totalRoutes').textContent = stats.totalRoutes.toLocaleString();
  document.getElementById('routeSearches').textContent = stats.routeSearches.toLocaleString();
  document.getElementById('contributors').textContent = stats.contributors.toLocaleString();
}

// Create all charts
function createCharts() {
  createRegistrationsChart();
  createActiveUsersChart();
  createRouteSearchesChart();
  createActivityTypesChart();
  createTopLocationsChart();
  createPeakHoursChart();
  createProvinceChart();
  createUserLocationChart();
}

// Create registrations chart
function createRegistrationsChart() {
  const ctx = document.getElementById('registrationsChart').getContext('2d');
  charts.registrations = new Chart(ctx, {
    type: 'line',
    data: {
      labels: reportData.registrations.labels,
      datasets: [{
        label: 'New Registrations',
        data: reportData.registrations.data,
        borderColor: '#193148',
        backgroundColor: 'rgba(25, 49, 72, 0.1)',
        tension: 0.4
      }]
    },
    options: {
      responsive: true,
      scales: {
        y: {
          beginAtZero: true
        }
      }
    }
  });
}

// Create active users chart
function createActiveUsersChart() {
  const ctx = document.getElementById('activeUsersChart').getContext('2d');
  charts.activeUsers = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: reportData.activeUsers.labels,
      datasets: [{
        label: 'Active Users',
        data: reportData.activeUsers.data,
        backgroundColor: '#FFD700',
        borderColor: '#193148',
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      scales: {
        y: {
          beginAtZero: true
        }
      }
    }
  });
}

// Create route searches chart
function createRouteSearchesChart() {
  const ctx = document.getElementById('routeSearchesChart').getContext('2d');
  charts.routeSearches = new Chart(ctx, {
    type: 'line',
    data: {
      labels: reportData.routeSearches.labels,
      datasets: [{
        label: 'Route Searches',
        data: reportData.routeSearches.data,
        borderColor: '#28a745',
        backgroundColor: 'rgba(40, 167, 69, 0.1)',
        tension: 0.4
      }]
    },
    options: {
      responsive: true,
      scales: {
        y: {
          beginAtZero: true
        }
      }
    }
  });
}

// Create activity types chart
function createActivityTypesChart() {
  const ctx = document.getElementById('activityTypesChart').getContext('2d');
  charts.activityTypes = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: reportData.activityTypes.map(item => item.type),
      datasets: [{
        data: reportData.activityTypes.map(item => item.count),
        backgroundColor: [
          '#193148',
          '#FFD700',
          '#28a745',
          '#dc3545'
        ]
      }]
    },
    options: {
      responsive: true
    }
  });
}

// Create top locations chart
function createTopLocationsChart() {
  const ctx = document.getElementById('topLocationsChart').getContext('2d');
  charts.topLocations = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: reportData.topLocations.map(item => item.location),
      datasets: [{
        label: 'Searches',
        data: reportData.topLocations.map(item => item.searches),
        backgroundColor: '#305A84'
      }]
    },
    options: {
      responsive: true,
      scales: {
        y: {
          beginAtZero: true
        }
      }
    }
  });
}

// Create peak hours chart
function createPeakHoursChart() {
  const ctx = document.getElementById('peakHoursChart').getContext('2d');
  charts.peakHours = new Chart(ctx, {
    type: 'line',
    data: {
      labels: reportData.peakHours.map(item => `${item.hour}:00`),
      datasets: [{
        label: 'Searches per Hour',
        data: reportData.peakHours.map(item => item.searches),
        borderColor: '#FFD700',
        backgroundColor: 'rgba(255, 215, 0, 0.1)',
        tension: 0.4
      }]
    },
    options: {
      responsive: true,
      scales: {
        y: {
          beginAtZero: true
        }
      }
    }
  });
}

// Create province chart
function createProvinceChart() {
  const ctx = document.getElementById('provinceChart').getContext('2d');
  charts.provinces = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: reportData.provinces.map(item => item.province),
      datasets: [{
        label: 'Routes',
        data: reportData.provinces.map(item => item.routes),
        backgroundColor: '#193148'
      }, {
        label: 'Users',
        data: reportData.provinces.map(item => item.users),
        backgroundColor: '#FFD700'
      }]
    },
    options: {
      responsive: true,
      scales: {
        y: {
          beginAtZero: true
        }
      }
    }
  });
}

// Create user location chart
function createUserLocationChart() {
  const ctx = document.getElementById('userLocationChart').getContext('2d');
  charts.userLocation = new Chart(ctx, {
    type: 'pie',
    data: {
      labels: reportData.provinces.map(item => item.province),
      datasets: [{
        data: reportData.provinces.map(item => item.users),
        backgroundColor: [
          '#193148',
          '#305A84',
          '#FFD700',
          '#28a745'
        ]
      }]
    },
    options: {
      responsive: true
    }
  });
}

// Populate tables
function populateTables() {
  populateUserTable();
  populateRouteTable();
}

// Populate user table
function populateUserTable() {
  const tbody = document.getElementById('userTableBody');
  tbody.innerHTML = '';

  reportData.users.forEach(user => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${user.id}</td>
      <td>${escapeHTML(user.name || '')}</td>
      <td>${escapeHTML(user.email || '')}</td>
      <td>${formatDate(user.registrationDate)}</td>
      <td>${formatDate(user.lastLogin)}</td>
      <td>${user.activityCount || 0}</td>
      <td>${user.routesContributed || 0}</td>
      <td>${createStatusBadge(user.status)}</td>
    `;
    tbody.appendChild(row);
  });
}

// Populate route table
function populateRouteTable() {
  const tbody = document.getElementById('routeTableBody');
  tbody.innerHTML = '';

  reportData.routes.forEach(route => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${route.id}</td>
      <td>${escapeHTML(route.name || '')}</td>
      <td>${escapeHTML(route.startLocation || '')}</td>
      <td>${escapeHTML(route.endLocation || '')}</td>
      <td>${formatCurrency(route.price || 0)}</td>
      <td>${escapeHTML(route.type || '')}</td>
      <td>${route.searchCount || 0}</td>
      <td>${formatDate(route.createdDate)}</td>
      <td>${escapeHTML(route.contributor || '')}</td>
    `;
    tbody.appendChild(row);
  });
}

// Update reports
export async function updateReports() {
  await loadReportData();
  // Update charts with new data
  Object.values(charts).forEach(chart => {
    if (chart && chart.destroy) {
      chart.destroy();
    }
  });
  createCharts();
  populateTables();
}

// Sort user table
export function sortUserTable() {
  const sortBy = document.getElementById('userSort').value;
  reportData.users.sort((a, b) => {
    if (sortBy === 'registrationDate' || sortBy === 'lastLogin') {
      return new Date(b[sortBy]) - new Date(a[sortBy]);
    }
    return b[sortBy] - a[sortBy];
  });
  populateUserTable();
}

// Filter user table
export function filterUserTable() {
  const filter = document.getElementById('userFilter').value;
  let filteredUsers = reportData.users;

  if (filter === 'active') {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    filteredUsers = reportData.users.filter(user => new Date(user.lastLogin) > weekAgo);
  } else if (filter === 'inactive') {
    const monthAgo = new Date();
    monthAgo.setDate(monthAgo.getDate() - 30);
    filteredUsers = reportData.users.filter(user => new Date(user.lastLogin) < monthAgo);
  } else if (filter === 'contributors') {
    filteredUsers = reportData.users.filter(user => user.routesContributed > 0);
  }

  const tbody = document.getElementById('userTableBody');
  tbody.innerHTML = '';

  filteredUsers.forEach(user => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${user.id}</td>
      <td>${escapeHTML(user.name || '')}</td>
      <td>${escapeHTML(user.email || '')}</td>
      <td>${formatDate(user.registrationDate)}</td>
      <td>${formatDate(user.lastLogin)}</td>
      <td>${user.activityCount || 0}</td>
      <td>${user.routesContributed || 0}</td>
      <td>${createStatusBadge(user.status)}</td>
    `;
    tbody.appendChild(row);
  });
}

// Sort route table
export function sortRouteTable() {
  const sortBy = document.getElementById('routeSort').value;
  reportData.routes.sort((a, b) => {
    if (sortBy === 'createdDate') {
      return new Date(b[sortBy]) - new Date(a[sortBy]);
    }
    return b[sortBy] - a[sortBy];
  });
  populateRouteTable();
}

// Filter route table
export function filterRouteTable() {
  const filter = document.getElementById('routeFilter').value;
  let filteredRoutes = reportData.routes;

  if (filter === 'popular') {
    filteredRoutes = reportData.routes.filter(route => route.searchCount > 50);
  } else if (filter === 'recent') {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    filteredRoutes = reportData.routes.filter(route => new Date(route.createdDate) > weekAgo);
  } else if (filter === 'expensive') {
    filteredRoutes = reportData.routes.filter(route => route.price > 30);
  }

  const tbody = document.getElementById('routeTableBody');
  tbody.innerHTML = '';

  filteredRoutes.forEach(route => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${route.id}</td>
      <td>${escapeHTML(route.name || '')}</td>
      <td>${escapeHTML(route.startLocation || '')}</td>
      <td>${escapeHTML(route.endLocation || '')}</td>
      <td>${formatCurrency(route.price || 0)}</td>
      <td>${escapeHTML(route.type || '')}</td>
      <td>${route.searchCount || 0}</td>
      <td>${formatDate(route.createdDate)}</td>
      <td>${escapeHTML(route.contributor || '')}</td>
    `;
    tbody.appendChild(row);
  });
}

// Export reports
export function exportReports() {
  const data = {
    stats: reportData.stats,
    users: reportData.users,
    routes: reportData.routes,
    exportDate: new Date().toISOString()
  };

  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `teksimap-reports-${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
