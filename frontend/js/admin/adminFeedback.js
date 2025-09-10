// Admin Feedback functionality
import { makeAdminRequest, showLoading, showError, formatDate, createStatusBadge } from './adminCommon.js';

let feedbackData = [];

// Load feedback
export async function loadFeedback() {
  try {
    showLoading('feedbackContainer');
    
    const response = await makeAdminRequest('feedback');
    const data = await response.json();
    feedbackData = data.feedback;
    displayFeedback(data.feedback);
  } catch (error) {
    console.error('Error loading feedback:', error);
    showError('feedbackContainer', 'Failed to load feedback. Please try again.');
  }
}

// Display feedback
function displayFeedback(feedback) {
  const container = document.getElementById('feedbackContainer');
  
  if (!feedback || feedback.length === 0) {
    container.innerHTML = '<p>No feedback found.</p>';
    return;
  }

  const feedbackHtml = feedback.map(item => `
    <div class="feedback-card">
      <div class="feedback-header">
        <div class="feedback-type">
          <span class="type-badge ${item.feedback_type}">${item.feedback_type}</span>
        </div>
        <div class="feedback-status">
          <span class="status-badge ${item.status}">${item.status}</span>
        </div>
        <div class="feedback-date">
          ${formatDate(item.created_at)}
        </div>
      </div>
      <div class="feedback-content">
        <h3>${item.subject}</h3>
        <p>${item.message}</p>
        ${item.user_email ? `<p><strong>From:</strong> ${item.user_email}</p>` : ''}
      </div>
      ${item.status === 'pending' ? `
        <div class="feedback-actions">
          <button class="btn btn-success" onclick="updateFeedbackStatus(${item.ID}, 'reviewed')">
            <i class="fas fa-check"></i> Mark as Reviewed
          </button>
          <button class="btn btn-primary" onclick="respondToFeedback(${item.ID})">
            <i class="fas fa-reply"></i> Respond
          </button>
        </div>
      ` : ''}
      ${item.admin_response ? `
        <div class="admin-response">
          <h4>Admin Response:</h4>
          <p>${item.admin_response}</p>
        </div>
      ` : ''}
    </div>
  `).join('');

  container.innerHTML = feedbackHtml;
}

// Filter feedback
export function filterFeedback() {
  const filter = document.getElementById('feedbackFilter').value;
  let filtered = feedbackData;

  if (filter !== 'all') {
    if (filter === 'pending' || filter === 'reviewed') {
      filtered = feedbackData.filter(item => item.status === filter);
    } else {
      filtered = feedbackData.filter(item => item.feedback_type === filter);
    }
  }

  displayFeedback(filtered);
}

// Refresh feedback
export function refreshFeedback() {
  loadFeedback();
}

// Update feedback status
export async function updateFeedbackStatus(feedbackId, status) {
  try {
    const response = await makeAdminRequest(`feedback/${feedbackId}`, {
      method: 'PUT',
      body: JSON.stringify({ status })
    });

    if (response.ok) {
      alert('Feedback status updated successfully!');
      loadFeedback();
    }
  } catch (error) {
    console.error('Error updating feedback status:', error);
    alert('Error updating feedback status. Please try again.');
  }
}

// Respond to feedback
export function respondToFeedback(feedbackId) {
  const response = prompt('Enter your response to this feedback:');
  if (!response) {
    return;
  }

  updateFeedbackWithResponse(feedbackId, response);
}

// Update feedback with response
async function updateFeedbackWithResponse(feedbackId, adminResponse) {
  try {
    const response = await makeAdminRequest(`feedback/${feedbackId}`, {
      method: 'PUT',
      body: JSON.stringify({ 
        status: 'reviewed',
        admin_response: adminResponse
      })
    });

    if (response.ok) {
      alert('Response sent successfully!');
      loadFeedback();
    }
  } catch (error) {
    console.error('Error updating feedback:', error);
    alert('Error sending response. Please try again.');
  }
}
