import * as ownerApi from '../api/ownerApi.js';

let isEditMode = false;
let currentBankingData = null;

// Initialize page
document.addEventListener('DOMContentLoaded', async function() {
    await loadBankingDetails();
});

// Load banking details
async function loadBankingDetails() {
    try {
        const response = await ownerApi.getBankingDetails();
        
        if (response.success && response.banking) {
            currentBankingData = response.banking;
            displayBankingInfo(response.banking);
        } else {
            // No banking details found - show add form
            showNoBankingInfo();
        }
    } catch (error) {
        console.error('Error loading banking details:', error);
        
        // Check if it's a 404 (endpoint not found) vs no data
        if (error.response && error.response.status === 404) {
            console.error('Banking endpoint not found. Please ensure the server is restarted and routes are registered.');
            showAlert('Unable to connect to banking service. Please contact support.', 'error');
        } else if (error.response && error.response.status === 401) {
            showAlert('Please log in to view banking details.', 'error');
        } else {
            // For other errors (like no banking data), show the add form
            showNoBankingInfo();
        }
    }
}

// Display banking information
function displayBankingInfo(banking) {
    const contentDiv = document.getElementById('bankingInfoContent');
    
    if (!contentDiv) return;

    const bankNameMap = {
        'absa': 'ABSA',
        'capitec': 'Capitec',
        'fnb': 'First National Bank (FNB)',
        'nedbank': 'Nedbank',
        'standard': 'Standard Bank',
        'tymebank': 'TymeBank',
        'african_bank': 'African Bank',
        'other': 'Other'
    };

    const accountTypeMap = {
        'cheque': 'Cheque / Current',
        'savings': 'Savings',
        'transmission': 'Transmission',
        'business': 'Business'
    };

    contentDiv.innerHTML = `
        <div class="banking-info">
            <div class="info-card">
                <div class="info-label">Bank Name</div>
                <div class="info-value">${escapeHtml(bankNameMap[banking.bank_name] || banking.bank_name || 'N/A')}</div>
            </div>
            <div class="info-card">
                <div class="info-label">Account Holder</div>
                <div class="info-value">${escapeHtml(banking.account_holder || 'N/A')}</div>
            </div>
            <div class="info-card">
                <div class="info-label">Account Number</div>
                <div class="info-value">${escapeHtml(maskAccountNumber(banking.account_number) || 'N/A')}</div>
            </div>
            <div class="info-card">
                <div class="info-label">Branch Code</div>
                <div class="info-value">${escapeHtml(banking.branch_code || 'N/A')}</div>
            </div>
            <div class="info-card">
                <div class="info-label">Account Type</div>
                <div class="info-value">${escapeHtml(accountTypeMap[banking.account_type] || banking.account_type || 'N/A')}</div>
            </div>
            ${banking.payment_reference ? `
            <div class="info-card">
                <div class="info-label">Payment Reference</div>
                <div class="info-value">${escapeHtml(banking.payment_reference)}</div>
            </div>
            ` : ''}
        </div>
    `;
}

// Show no banking info message
function showNoBankingInfo() {
    const contentDiv = document.getElementById('bankingInfoContent');
    const displayDiv = document.getElementById('bankingInfoDisplay');
    
    if (!contentDiv || !displayDiv) return;

    contentDiv.innerHTML = `
        <div class="no-banking-info">
            <i class="fas fa-university"></i>
            <h3>No Banking Details Found</h3>
            <p>You haven't added your banking details yet. Add them now to receive payments.</p>
            <button class="add-banking-btn" onclick="toggleEditMode()">
                <i class="fas fa-plus"></i>
                Add Banking Details
            </button>
        </div>
    `;
}

// Toggle edit mode
function toggleEditMode() {
    isEditMode = !isEditMode;
    const displayDiv = document.getElementById('bankingInfoDisplay');
    const formDiv = document.getElementById('bankingForm');
    const formTitle = document.getElementById('formTitle');
    
    if (isEditMode) {
        displayDiv.style.display = 'none';
        formDiv.classList.add('active');
        
        if (currentBankingData) {
            formTitle.textContent = 'Edit Banking Details';
            populateForm(currentBankingData);
        } else {
            formTitle.textContent = 'Add Banking Details';
            clearForm();
        }
    } else {
        displayDiv.style.display = 'block';
        formDiv.classList.remove('active');
    }
}

// Populate form with existing data
function populateForm(banking) {
    document.getElementById('bankName').value = banking.bank_name || '';
    document.getElementById('accountHolder').value = banking.account_holder || '';
    document.getElementById('accountNumber').value = banking.account_number || '';
    document.getElementById('branchCode').value = banking.branch_code || '';
    document.getElementById('accountType').value = banking.account_type || '';
    document.getElementById('paymentReference').value = banking.payment_reference || '';
}

// Clear form
function clearForm() {
    document.getElementById('bankingDetailsForm').reset();
}

// Cancel edit
function cancelEdit() {
    isEditMode = false;
    const displayDiv = document.getElementById('bankingInfoDisplay');
    const formDiv = document.getElementById('bankingForm');
    
    displayDiv.style.display = 'block';
    formDiv.classList.remove('active');
    clearForm();
}

// Save banking details
async function saveBankingDetails(event) {
    event.preventDefault();
    
    const formData = {
        bank_name: document.getElementById('bankName').value,
        account_holder: document.getElementById('accountHolder').value,
        account_number: document.getElementById('accountNumber').value,
        branch_code: document.getElementById('branchCode').value,
        account_type: document.getElementById('accountType').value,
        payment_reference: document.getElementById('paymentReference').value || null
    };

    try {
        let response;
        if (currentBankingData) {
            // Update existing banking details
            response = await ownerApi.updateBankingDetails(formData);
        } else {
            // Create new banking details
            response = await ownerApi.createBankingDetails(formData);
        }

        if (response.success) {
            showAlert('Banking details saved successfully!', 'success');
            currentBankingData = response.banking || formData;
            displayBankingInfo(currentBankingData);
            cancelEdit();
            
            // Reload banking details to get updated data
            setTimeout(() => {
                loadBankingDetails();
            }, 500);
        } else {
            showAlert(response.message || 'Failed to save banking details', 'error');
        }
    } catch (error) {
        console.error('Error saving banking details:', error);
        showAlert('An error occurred while saving banking details', 'error');
    }
}

// Show alert message
function showAlert(message, type) {
    const alertDiv = document.getElementById('alertMessage');
    if (!alertDiv) return;

    alertDiv.textContent = message;
    alertDiv.className = `alert alert-${type} show`;
    
    setTimeout(() => {
        alertDiv.classList.remove('show');
    }, 5000);
}

// Mask account number for display (show only last 4 digits)
function maskAccountNumber(accountNumber) {
    if (!accountNumber) return '';
    if (accountNumber.length <= 4) return accountNumber;
    return '****' + accountNumber.slice(-4);
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Make functions available globally for inline handlers
window.toggleEditMode = toggleEditMode;
window.cancelEdit = cancelEdit;
window.saveBankingDetails = saveBankingDetails;
