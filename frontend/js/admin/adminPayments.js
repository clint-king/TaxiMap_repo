// Admin Payments Management
// This file handles the display of booking payments and completed trips due for payment

// Mock data structure - Replace with actual API calls when backend is ready
const mockBookingsData = [
  {
    id: 1,
    bookingId: "BK-2024-001",
    route: "Pretoria to Johannesburg",
    date: "2024-01-15",
    status: "completed",
    totalPaid: 2500.00,
    totalAmount: 2500.00,
    clients: [
      {
        id: 101,
        name: "John Doe",
        type: "passenger",
        amount: 500.00,
        paymentStatus: "paid",
        paymentDate: "2024-01-14"
      },
      {
        id: 102,
        name: "Jane Smith",
        type: "passenger",
        amount: 500.00,
        paymentStatus: "paid",
        paymentDate: "2024-01-14"
      },
      {
        id: 103,
        name: "ABC Company",
        type: "parcel",
        amount: 1500.00,
        paymentStatus: "paid",
        paymentDate: "2024-01-14"
      }
    ],
    owner: {
      id: 201,
      name: "Transport Co.",
      bankName: "Standard Bank",
      accountHolder: "Transport Co. (Pty) Ltd",
      accountNumber: "1234567890",
      branchCode: "051001",
      accountType: "business",
      paymentReference: "TXN-2024-001"
    }
  },
  {
    id: 2,
    bookingId: "BK-2024-002",
    route: "Cape Town to Stellenbosch",
    date: "2024-01-16",
    status: "active",
    totalPaid: 1800.00,
    totalAmount: 2000.00,
    clients: [
      {
        id: 104,
        name: "Mike Johnson",
        type: "passenger",
        amount: 600.00,
        paymentStatus: "paid",
        paymentDate: "2024-01-15"
      },
      {
        id: 105,
        name: "Sarah Williams",
        type: "passenger",
        amount: 600.00,
        paymentStatus: "paid",
        paymentDate: "2024-01-15"
      },
      {
        id: 106,
        name: "XYZ Logistics",
        type: "parcel",
        amount: 600.00,
        paymentStatus: "paid",
        paymentDate: "2024-01-15"
      }
    ],
    owner: {
      id: 202,
      name: "City Transport",
      bankName: "FNB",
      accountHolder: "City Transport",
      accountNumber: "9876543210",
      branchCode: "250655",
      accountType: "business",
      paymentReference: "TXN-2024-002"
    }
  },
  {
    id: 3,
    bookingId: "BK-2024-003",
    route: "Durban to Pietermaritzburg",
    date: "2024-01-17",
    status: "completed",
    totalPaid: 3200.00,
    totalAmount: 3200.00,
    clients: [
      {
        id: 107,
        name: "David Brown",
        type: "passenger",
        amount: 800.00,
        paymentStatus: "paid",
        paymentDate: "2024-01-16"
      },
      {
        id: 108,
        name: "Emily Davis",
        type: "passenger",
        amount: 800.00,
        paymentStatus: "paid",
        paymentDate: "2024-01-16"
      },
      {
        id: 109,
        name: "Global Shipping",
        type: "parcel",
        amount: 1600.00,
        paymentStatus: "paid",
        paymentDate: "2024-01-16"
      }
    ],
    owner: {
      id: 203,
      name: "Coastal Transport",
      bankName: "Nedbank",
      accountHolder: "Coastal Transport Services",
      accountNumber: "5555666677",
      branchCode: "198765",
      accountType: "business",
      paymentReference: "TXN-2024-003"
    }
  }
];

// Tab switching
function switchTab(tabName) {
  // Update tab buttons
  document.querySelectorAll('.tab').forEach(tab => {
    tab.classList.remove('active');
  });
  event.target.classList.add('active');

  // Update tab content
  document.querySelectorAll('.tab-content').forEach(content => {
    content.classList.remove('active');
  });
  document.getElementById(`${tabName}-tab`).classList.add('active');

  // Load appropriate data
  if (tabName === 'bookings') {
    loadBookings();
  } else if (tabName === 'completed') {
    loadCompletedTrips();
  }
}

// Make switchTab globally available
window.switchTab = switchTab;

// Load all bookings
function loadBookings() {
  const bookingsList = document.getElementById('bookings-list');
  
  // TODO: Replace with actual API call
  // const response = await fetch('/api/admin/bookings/payments');
  // const bookings = await response.json();
  
  const bookings = mockBookingsData;
  
  if (bookings.length === 0) {
    bookingsList.innerHTML = `
      <div class="empty-state">
        <i class="fas fa-inbox"></i>
        <p>No bookings found</p>
      </div>
    `;
    return;
  }

  bookingsList.innerHTML = bookings.map(booking => `
    <div class="booking-card" onclick="toggleBookingDetails(${booking.id})">
      <div class="booking-header">
        <div class="booking-info">
          <div class="booking-id">Booking ${booking.bookingId}</div>
          <div class="booking-meta">
            <span><i class="fas fa-route"></i> ${booking.route}</span>
            <span><i class="fas fa-calendar"></i> ${formatDate(booking.date)}</span>
            <span class="status-badge status-${booking.status}">${booking.status}</span>
          </div>
        </div>
        <div class="booking-amount">
          <div class="total-amount">R ${formatCurrency(booking.totalPaid)}</div>
          <div class="amount-label">Total Paid</div>
        </div>
        <i class="fas fa-chevron-down expand-icon"></i>
      </div>
      <div class="booking-details">
        <h3 style="margin-bottom: 1rem; color: #01386a;">Clients & Payments</h3>
        <div class="clients-list">
          ${booking.clients.map(client => `
            <div class="client-item">
              <div class="client-info">
                <div class="client-name">${client.name}</div>
                <span class="client-type">${client.type === 'passenger' ? '👤 Passenger' : '📦 Parcel'}</span>
                <div style="margin-top: 0.5rem; font-size: 0.85rem; color: #666;">
                  Paid: ${formatDate(client.paymentDate)} | Status: <span style="color: #28a745; font-weight: 600;">${client.paymentStatus}</span>
                </div>
              </div>
              <div class="client-amount">R ${formatCurrency(client.amount)}</div>
            </div>
          `).join('')}
        </div>
        <div style="margin-top: 1.5rem; padding-top: 1.5rem; border-top: 1px solid #e0e0e0;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <span style="font-weight: 600; color: #333;">Total Amount:</span>
            <span style="font-size: 1.2rem; font-weight: 700; color: #01386a;">R ${formatCurrency(booking.totalAmount)}</span>
          </div>
          <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 0.5rem;">
            <span style="font-weight: 600; color: #333;">Total Paid:</span>
            <span style="font-size: 1.2rem; font-weight: 700; color: #28a745;">R ${formatCurrency(booking.totalPaid)}</span>
          </div>
          ${booking.totalPaid < booking.totalAmount ? `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 0.5rem;">
              <span style="font-weight: 600; color: #333;">Outstanding:</span>
              <span style="font-size: 1.2rem; font-weight: 700; color: #dc3545;">R ${formatCurrency(booking.totalAmount - booking.totalPaid)}</span>
            </div>
          ` : ''}
        </div>
      </div>
    </div>
  `).join('');
}

// Make loadBookings globally available
window.loadBookings = loadBookings;

// Toggle booking details
function toggleBookingDetails(bookingId) {
  const bookingCard = event.currentTarget;
  bookingCard.classList.toggle('expanded');
}

// Make toggleBookingDetails globally available
window.toggleBookingDetails = toggleBookingDetails;

// Load completed trips due for payment
function loadCompletedTrips() {
  const completedTripsList = document.getElementById('completed-trips-list');
  
  // TODO: Replace with actual API call
  // const response = await fetch('/api/admin/bookings/completed-due-payment');
  // const completedTrips = await response.json();
  
  // Filter only completed trips
  const completedTrips = mockBookingsData.filter(booking => booking.status === 'completed');
  
  if (completedTrips.length === 0) {
    completedTripsList.innerHTML = `
      <div class="empty-state">
        <i class="fas fa-check-circle"></i>
        <p>No completed trips due for payment</p>
      </div>
    `;
    return;
  }

  completedTripsList.innerHTML = completedTrips.map(trip => {
    const amountDue = trip.totalPaid * 0.85; // 85% of total paid
    
    return `
      <div class="trip-card">
        <div class="trip-header">
          <div class="trip-info">
            <div class="trip-id">Trip ${trip.bookingId}</div>
            <div style="color: #666; margin-top: 0.5rem;">
              <span><i class="fas fa-route"></i> ${trip.route}</span>
              <span style="margin-left: 1rem;"><i class="fas fa-calendar"></i> ${formatDate(trip.date)}</span>
            </div>
            <span class="trip-status">Completed - Due for Payment</span>
          </div>
          <div class="amount-due">
            <div class="due-amount">R ${formatCurrency(amountDue)}</div>
            <div class="amount-label">Amount Due (85%)</div>
            <div style="margin-top: 0.5rem; font-size: 0.85rem; color: #666;">
              Total Paid: R ${formatCurrency(trip.totalPaid)}
            </div>
          </div>
        </div>

        <div class="owner-section">
          <div class="owner-header">
            <i class="fas fa-building"></i>
            Owner Information & Banking Details
          </div>
          <div class="banking-details">
            <div class="banking-item">
              <span class="banking-label">Owner Name</span>
              <span class="banking-value">${trip.owner.name}</span>
            </div>
            <div class="banking-item">
              <span class="banking-label">Bank Name</span>
              <span class="banking-value">${trip.owner.bankName}</span>
            </div>
            <div class="banking-item">
              <span class="banking-label">Account Holder</span>
              <span class="banking-value">${trip.owner.accountHolder}</span>
            </div>
            <div class="banking-item">
              <span class="banking-label">Account Number</span>
              <span class="banking-value">${trip.owner.accountNumber}</span>
            </div>
            <div class="banking-item">
              <span class="banking-label">Branch Code</span>
              <span class="banking-value">${trip.owner.branchCode}</span>
            </div>
            <div class="banking-item">
              <span class="banking-label">Account Type</span>
              <span class="banking-value">${formatAccountType(trip.owner.accountType)}</span>
            </div>
            <div class="banking-item">
              <span class="banking-label">Payment Reference</span>
              <span class="banking-value">${trip.owner.paymentReference}</span>
            </div>
          </div>
        </div>

        <div style="margin-top: 1.5rem; padding-top: 1.5rem; border-top: 1px solid #e0e0e0;">
          <h4 style="margin-bottom: 1rem; color: #01386a;">Payment Summary</h4>
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem;">
            <div>
              <span style="font-size: 0.85rem; color: #666;">Total Amount Collected</span>
              <div style="font-size: 1.2rem; font-weight: 600; color: #333;">R ${formatCurrency(trip.totalPaid)}</div>
            </div>
            <div>
              <span style="font-size: 0.85rem; color: #666;">Platform Fee (15%)</span>
              <div style="font-size: 1.2rem; font-weight: 600; color: #dc3545;">R ${formatCurrency(trip.totalPaid * 0.15)}</div>
            </div>
            <div>
              <span style="font-size: 0.85rem; color: #666;">Amount Due to Owner (85%)</span>
              <div style="font-size: 1.2rem; font-weight: 700; color: #ff9800;">R ${formatCurrency(amountDue)}</div>
            </div>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

// Make loadCompletedTrips globally available
window.loadCompletedTrips = loadCompletedTrips;

// Filter bookings
function filterBookings() {
  const searchTerm = document.getElementById('booking-search').value.toLowerCase();
  const filterValue = document.getElementById('booking-filter').value;
  
  const bookingCards = document.querySelectorAll('.booking-card');
  
  bookingCards.forEach(card => {
    const bookingId = card.querySelector('.booking-id').textContent.toLowerCase();
    const route = card.querySelector('.booking-meta span').textContent.toLowerCase();
    const status = card.querySelector('.status-badge')?.textContent.toLowerCase() || '';
    
    const matchesSearch = bookingId.includes(searchTerm) || route.includes(searchTerm);
    const matchesFilter = filterValue === 'all' || status === filterValue;
    
    if (matchesSearch && matchesFilter) {
      card.style.display = 'block';
    } else {
      card.style.display = 'none';
    }
  });
}

// Make filterBookings globally available
window.filterBookings = filterBookings;

// Utility functions
function formatCurrency(amount) {
  return new Intl.NumberFormat('en-ZA', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
}

function formatDate(dateString) {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('en-ZA', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  }).format(date);
}

function formatAccountType(type) {
  const types = {
    'cheque': 'Cheque Account',
    'savings': 'Savings Account',
    'transmission': 'Transmission Account',
    'business': 'Business Account'
  };
  return types[type] || type;
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
  loadBookings();
  
  // Add status badge styles
  const style = document.createElement('style');
  style.textContent = `
    .status-badge {
      display: inline-block;
      padding: 0.25rem 0.75rem;
      border-radius: 4px;
      font-size: 0.85rem;
      font-weight: 600;
      text-transform: capitalize;
    }
    .status-completed {
      background: #28a745;
      color: white;
    }
    .status-active {
      background: #17a2b8;
      color: white;
    }
    .status-pending {
      background: #ffc107;
      color: #000;
    }
  `;
  document.head.appendChild(style);
});
