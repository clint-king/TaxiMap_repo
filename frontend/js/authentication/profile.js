// Profile Page JavaScript
import axios from 'axios';
import { BASE_URL } from "../AddressSelection.js";

axios.defaults.withCredentials = true;

// Add global axios interceptor for session expiration
axios.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response && (error.response.status === 401 || error.response.status === 403)) {
            console.log('Session expired detected by interceptor');
            
            // Check if user profile exists in localStorage (user is logged in)
            const userProfile = localStorage.getItem('userProfile');
            if (!userProfile) {
                // No user profile, redirect to login
                window.location.href = '/pages/authentication/login.html';
                return Promise.reject(error);
            }
            
            // User profile exists but request failed - this might be a session expiration
            // Only redirect if we're not on the login page and the error is persistent
            const currentPath = window.location.pathname;
            if (!currentPath.includes('login.html') && !currentPath.includes('signup.html')) {
                // Clear local storage
                localStorage.removeItem('userProfile');
                localStorage.removeItem('activityLog');
                
                // Show message to user
                const messageContainer = document.getElementById('messageContainer');
                if (messageContainer) {
                    const messageElement = document.createElement('div');
                    messageElement.className = 'message error';
                    messageElement.textContent = 'Session expired. Redirecting to home page...';
                    messageContainer.appendChild(messageElement);
                }
                
                // Redirect to home page after a short delay
                setTimeout(() => {
                    window.location.href = '/index.html';
                }, 2000);
            }
        }
        return Promise.reject(error);
    }
);

class ProfileManager {
    constructor() {
        this.currentUser = null;
        this.activityLog = [];
        this.init();
    }

    async init() {
        await this.loadUserData();
        this.setupEventListeners();
        this.loadActivityLog();
        this.setupTabNavigation();
        this.setupPasswordStrength();
        this.setupModalEvents();
        this.setupMobileMenu();
        this.setupBookingsTab();
    }

    async loadUserData() {
        try {
            // Try to get user data from backend first
            const response = await axios.get(`${BASE_URL}/auth/profile`);
            if (response.data.success) {
                this.currentUser = response.data.user;
                localStorage.setItem('userProfile', JSON.stringify(this.currentUser));
            } else {
                const savedUser = localStorage.getItem('userProfile');
                if (savedUser) {
                    this.currentUser = JSON.parse(savedUser);
                } else {
                    // No user data found, redirect to home page
                    window.location.href = '/index.html';
                    return;
                }
            }
        } catch (error) {
            console.error('Error loading user data:', error);
            
            // Check if it's an authentication error (401 or 403)
            if (error.response && (error.response.status === 401 || error.response.status === 403)) {
                console.log('Session expired, redirecting to home page');
                localStorage.removeItem('userProfile');
                window.location.href = '/index.html';
                return;
            }
            
            // Fallback to localStorage
            const savedUser = localStorage.getItem('userProfile');
            if (savedUser) {
                this.currentUser = JSON.parse(savedUser);
                console.log("this.currentUser:", this.currentUser);
            } else {
                // No user data found, redirect to home page
                window.location.href = '/index.html';
                return;
            }
        }
        
        if (this.currentUser) {
            this.updateProfileDisplay();
            this.populateForms();
        }
    }

    saveUserData() {
        localStorage.setItem('userProfile', JSON.stringify(this.currentUser));
    }

    updateProfileDisplay() {
        const displayName = document.getElementById('displayName');
        const userHandle = document.getElementById('userHandle');
        const userEmail = document.getElementById('userEmail');
        const profilePicture = document.getElementById('profilePicture');

        if (displayName) {
            displayName.textContent = `${this.currentUser.firstName} ${this.currentUser.lastName}`;
        }
        if (userHandle) {
            userHandle.textContent = `@${this.currentUser.username}`;
        }
        if (userEmail) {
            userEmail.textContent = this.currentUser.email;
        }
        if (profilePicture && this.currentUser.profilePicture) {
            profilePicture.src = this.currentUser.profilePicture;
        }
    }

    populateForms() {
        // Populate personal info form
        const personalForm = document.getElementById('personalInfoForm');
        if (personalForm) {
            personalForm.firstName.value = this.currentUser.firstName || '';
            personalForm.lastName.value = this.currentUser.lastName || '';
            personalForm.username.value = this.currentUser.username || '';
            personalForm.phone.value = this.currentUser.phone || '';
            personalForm.location.value = this.currentUser.location || '';
        }

        // Populate security forms
        const currentEmail = document.getElementById('currentEmail');
        if (currentEmail) {
            currentEmail.value = this.currentUser.email || '';
        }
    }

    setupEventListeners() {
        // Profile picture upload
        const profilePictureInput = document.getElementById('profilePictureInput');
        if (profilePictureInput) {
            profilePictureInput.addEventListener('change', (e) => this.handleProfilePictureUpload(e));
        }

        // Form submissions
        const personalInfoForm = document.getElementById('personalInfoForm');
        if (personalInfoForm) {
            personalInfoForm.addEventListener('submit', (e) => this.handlePersonalInfoSubmit(e));
        }

        const emailChangeForm = document.getElementById('emailChangeForm');
        if (emailChangeForm) {
            emailChangeForm.addEventListener('submit', (e) => this.handleEmailChangeSubmit(e));
        }

        const passwordChangeForm = document.getElementById('passwordChangeForm');
        if (passwordChangeForm) {
            passwordChangeForm.addEventListener('submit', (e) => this.handlePasswordChangeSubmit(e));
        }

        // Logout functionality is now handled globally in logout.js
    }

    async handleProfilePictureUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        if (!this.validateImageFile(file)) {
            this.showMessage('Please select a valid image file (JPG, PNG, GIF) under 5MB.', 'error');
            return;
        }

        try {
            const processedImage = await this.processImage(file);
            this.currentUser.profilePicture = processedImage;
            this.updateProfileDisplay();
            this.saveUserData();
            this.addActivityLog('profile', 'Profile picture updated');
            this.showMessage('Profile picture updated successfully!', 'success');
        } catch (error) {
            this.showMessage('Failed to process image. Please try again.', 'error');
        }
    }

    validateImageFile(file) {
        const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
        const maxSize = 5 * 1024 * 1024; // 5MB

        if (!validTypes.includes(file.type)) {
            return false;
        }

        if (file.size > maxSize) {
            return false;
        }

        return true;
    }

    processImage(file) {
        return new Promise((resolve) => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const img = new Image();

            img.onload = () => {
                // Resize image to max 300x300
                const maxSize = 300;
                let { width, height } = img;

                if (width > height) {
                    if (width > maxSize) {
                        height = (height * maxSize) / width;
                        width = maxSize;
                    }
                } else {
                    if (height > maxSize) {
                        width = (width * maxSize) / height;
                        height = maxSize;
                    }
                }

                canvas.width = width;
                canvas.height = height;

                ctx.drawImage(img, 0, 0, width, height);
                const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
                resolve(dataUrl);
            };

            img.src = URL.createObjectURL(file);
        });
    }

    async handlePersonalInfoSubmit(event) {
        event.preventDefault();
        const formData = new FormData(event.target);
        const data = Object.fromEntries(formData);

        // Filter out empty values and construct name properly
        const updateData = {};
        
        // Handle name construction - only include non-empty parts
        const firstName = data.firstName?.trim() || '';
        const lastName = data.lastName?.trim() || '';
        if (firstName || lastName) {
            updateData.name = `${firstName} ${lastName}`.trim();
        }
        
        // Only include non-empty values
        if (data.username?.trim()) {
            updateData.username = data.username.trim();
        }
        if (data.phone?.trim()) {
            updateData.phone = data.phone.trim();
        }
        if (data.location?.trim()) {
            updateData.location = data.location.trim();
        }
        
        // Always include profile picture if it exists
        if (this.currentUser.profilePicture) {
            updateData.profile_picture = this.currentUser.profilePicture;
        }

        try {
            // Update user data in backend
            const response = await axios.put(`${BASE_URL}/auth/profile`, updateData);

            if (response.data.success) {
                // Update local user data with new values, keeping existing ones for empty fields
                this.currentUser = {
                    ...this.currentUser,
                    firstName: firstName || this.currentUser.firstName || '',
                    lastName: lastName || this.currentUser.lastName || '',
                    username: data.username?.trim() || this.currentUser.username || '',
                    phone: data.phone?.trim() || this.currentUser.phone || '',
                    location: data.location?.trim() || this.currentUser.location || ''
                };
                
                this.saveUserData();
                this.updateProfileDisplay();
                this.addActivityLog('profile', 'Personal information updated');
                this.showMessage('Personal information updated successfully!', 'success');
            } else {
                this.showMessage(response.data.message || 'Failed to update profile', 'error');
            }
        } catch (error) {
            console.error('Error updating profile:', error);
            
            // Check for session expiration
            if (error.response && (error.response.status === 401 || error.response.status === 403)) {
                this.showMessage('Session expired. Please log in again.', 'error');
                setTimeout(() => {
                    this.handleLogout();
                }, 2000);
                return;
            }
            
            const errorMessage = error.response?.data?.message || 'Failed to update profile. Please try again.';
            this.showMessage(errorMessage, 'error');
        }
    }

    async handleEmailChangeSubmit(event) {
        event.preventDefault();
        const formData = new FormData(event.target);
        const data = Object.fromEntries(formData);

        if (data.newEmail === this.currentUser.email) {
            this.showMessage('New email must be different from current email.', 'error');
            return;
        }

        this.showConfirmationModal(
            `Are you sure you want to change your email from ${this.currentUser.email} to ${data.newEmail}? A confirmation email will be sent to the new address.`,
            () => this.confirmEmailChange(data)
        );
    }

    async confirmEmailChange(data) {
        try {
            const response = await axios.put(`${BASE_URL}/auth/change-email`, {
                newEmail: data.newEmail,
                currentPassword: data.emailPassword
            });

            if (response.data.success) {
                if (response.data.emailSent) {
                    this.showMessage('Confirmation email sent to ' + data.newEmail + '. Please check your email to verify the change.', 'info');
                } else {
                    // Development mode - email changed directly
                    this.currentUser.email = data.newEmail;
                    this.saveUserData();
                    this.updateProfileDisplay();
                    this.addActivityLog('security', 'Email address changed');
                    this.showMessage('Email address updated successfully!', 'success');
                }
                
                // Reset the form
                event.target.reset();
            } else {
                this.showMessage(response.data.message || 'Failed to change email', 'error');
            }
        } catch (error) {
            console.error('Error changing email:', error);
            
            // Check for session expiration
            if (error.response && (error.response.status === 401 || error.response.status === 403)) {
                this.showMessage('Session expired. Please log in again.', 'error');
                setTimeout(() => {
                    this.handleLogout();
                }, 2000);
                return;
            }
            
            const errorMessage = error.response?.data?.message || 'Failed to change email. Please try again.';
            this.showMessage(errorMessage, 'error');
        }
    }

    async handlePasswordChangeSubmit(event) {
        event.preventDefault();
        const formData = new FormData(event.target);
        const data = Object.fromEntries(formData);

        if (data.newPassword !== data.confirmPassword) {
            this.showMessage('New passwords do not match.', 'error');
            return;
        }

        const strength = this.checkPasswordStrength(data.newPassword);
        if (strength === 'weak') {
            this.showMessage('Password is too weak. Please choose a stronger password.', 'error');
            return;
        }

        this.showConfirmationModal(
            'Are you sure you want to change your password? You will be logged out of all devices.',
            () => this.confirmPasswordChange(data)
        );
    }

    async confirmPasswordChange(data) {
        try {
            const response = await axios.put(`${BASE_URL}/auth/change-password`, {
                currentPassword: data.currentPassword,
                newPassword: data.newPassword
            });

            if (response.data.success) {
                this.showMessage('Password changed successfully! You will be logged out for security.', 'success');
                this.addActivityLog('security', 'Password changed');
                
                // Reset the form
                event.target.reset();
                
                // Log out the user after password change for security
                setTimeout(() => {
                    this.handleLogout();
                }, 2000);
            } else {
                this.showMessage(response.data.message || 'Failed to change password', 'error');
            }
        } catch (error) {
            console.error('Error changing password:', error);
            
            // Check for session expiration
            if (error.response && (error.response.status === 401 || error.response.status === 403)) {
                this.showMessage('Session expired. Please log in again.', 'error');
                setTimeout(() => {
                    this.handleLogout();
                }, 2000);
                return;
            }
            
            const errorMessage = error.response?.data?.message || 'Failed to change password. Please try again.';
            this.showMessage(errorMessage, 'error');
        }
    }

    checkPasswordStrength(password) {
        const hasLower = /[a-z]/.test(password);
        const hasUpper = /[A-Z]/.test(password);
        const hasNumber = /\d/.test(password);
        const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);
        const isLongEnough = password.length >= 8;

        const score = [hasLower, hasUpper, hasNumber, hasSpecial, isLongEnough].filter(Boolean).length;

        if (score < 3) return 'weak';
        if (score < 4) return 'fair';
        if (score < 5) return 'good';
        return 'strong';
    }

    setupPasswordStrength() {
        const newPasswordInput = document.getElementById('newPassword');
        if (newPasswordInput) {
            newPasswordInput.addEventListener('input', (e) => {
                const strength = this.checkPasswordStrength(e.target.value);
                const strengthFill = document.getElementById('strengthFill');
                const strengthText = document.getElementById('strengthText');

                if (strengthFill && strengthText) {
                    strengthFill.className = `strength-fill ${strength}`;
                    strengthText.textContent = strength.charAt(0).toUpperCase() + strength.slice(1);
                }
            });
        }
    }

    setupTabNavigation() {
        const tabButtons = document.querySelectorAll('.tab-btn');
        const tabPanels = document.querySelectorAll('.tab-panel');

        tabButtons.forEach(button => {
            button.addEventListener('click', () => {
                const targetTab = button.getAttribute('data-tab');

                // Remove active class from all buttons and panels
                tabButtons.forEach(btn => btn.classList.remove('active'));
                tabPanels.forEach(panel => panel.classList.remove('active'));

                // Add active class to clicked button and corresponding panel
                button.classList.add('active');
                document.getElementById(targetTab).classList.add('active');
            });
        });
    }

    setupActivityFilters() {
        const filterButtons = document.querySelectorAll('.filter-btn');
        filterButtons.forEach(button => {
            button.addEventListener('click', () => {
                const filter = button.getAttribute('data-filter');
                
                // Update active filter button
                filterButtons.forEach(btn => btn.classList.remove('active'));
                button.classList.add('active');

                // Filter activity log
                this.filterActivityLog(filter);
            });
        });
    }

    filterActivityLog(filter) {
        const activityList = document.getElementById('activityList');
        if (!activityList) return;

        const filteredActivities = filter === 'all' 
            ? this.activityLog 
            : this.activityLog.filter(activity => activity.type === filter);

        this.renderActivityLog(filteredActivities);
    }

    async loadActivityLog() {
        try {
            // Fetch real activities from backend
            const response = await axios.get(`${BASE_URL}/auth/activities`);
            
            if (response.data.success) {
                this.activityLog = response.data.activities.map(activity => ({
                    type: activity.activity_type,
                    title: activity.activity_title,
                    time: new Date(activity.created_at),
                    device: activity.device_info || 'Unknown',
                    ip: activity.ip_address || 'Unknown',
                    description: activity.activity_description
                }));
            } else {
                // Fallback to empty array if API fails
                this.activityLog = [];
            }
        } catch (error) {
            console.error('Error loading activity log:', error);
            // Fallback to empty array if API fails
            this.activityLog = [];
        }

        this.setupActivityFilters();
        this.renderActivityLog(this.activityLog);
    }

    async addActivityLog(type, title) {
        const activity = {
            type,
            title,
            time: new Date(),
            device: this.getDeviceInfo(),
            ip: 'Unknown' // Will be captured by backend
        };

        // Add to local array for immediate display
        this.activityLog.unshift(activity);
        this.renderActivityLog(this.activityLog);

        // Send to backend (don't wait for response to avoid blocking UI)
        try {
            await axios.post(`${BASE_URL}/auth/activities`, {
                activity_type: type,
                activity_title: title,
                activity_description: `${title} from ${this.getDeviceInfo()}`,
                ip_address: null, // Backend will capture this
                user_agent: navigator.userAgent,
                device_info: this.getDeviceInfo(),
                location_info: null
            });
        } catch (error) {
            console.error('Error logging activity to backend:', error);
        }
    }

    getDeviceInfo() {
        const userAgent = navigator.userAgent;
        if (/Mobile|Android|iPhone|iPad/.test(userAgent)) {
            if (/iPhone/.test(userAgent)) return 'iPhone';
            if (/Android/.test(userAgent)) return 'Android';
            return 'Mobile Device';
        }
        if (/Windows/.test(userAgent)) return 'Windows';
        if (/Mac/.test(userAgent)) return 'Mac';
        if (/Linux/.test(userAgent)) return 'Linux';
        return 'Desktop';
    }

    renderActivityLog(activities) {
        const activityList = document.getElementById('activityList');
        if (!activityList) return;

        activityList.innerHTML = activities.map(activity => this.createActivityItem(activity)).join('');
    }

    createActivityItem(activity) {
        const icon = this.getActivityIcon(activity.type);
        const timeAgo = this.getTimeAgo(activity.time);

        return `
            <div class="activity-item">
                <div class="activity-icon ${activity.type}">
                    <i class="fas ${icon}"></i>
                </div>
                <div class="activity-details">
                    <div class="activity-title">${activity.title}</div>
                    <div class="activity-time">${timeAgo} • ${activity.device} • ${activity.ip}</div>
                </div>
            </div>
        `;
    }

    getActivityIcon(type) {
        const icons = {
            login: 'fa-sign-in-alt',
            profile: 'fa-user-edit',
            security: 'fa-shield-alt'
        };
        return icons[type] || 'fa-info-circle';
    }

    getTimeAgo(date) {
        const now = new Date();
        const diffInSeconds = Math.floor((now - date) / 1000);

        if (diffInSeconds < 60) return 'Just now';
        if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
        if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
        return `${Math.floor(diffInSeconds / 86400)} days ago`;
    }

    setupModalEvents() {
        const modal = document.getElementById('confirmationModal');
        const closeBtn = modal.querySelector('.close');
        const cancelBtn = document.getElementById('cancelBtn');
        const confirmBtn = document.getElementById('confirmBtn');

        closeBtn.addEventListener('click', () => this.hideModal());
        cancelBtn.addEventListener('click', () => this.hideModal());

        window.addEventListener('click', (e) => {
            if (e.target === modal) {
                this.hideModal();
            }
        });
    }

    showConfirmationModal(message, onConfirm) {
        const modal = document.getElementById('confirmationModal');
        const modalMessage = document.getElementById('modalMessage');
        const confirmBtn = document.getElementById('confirmBtn');

        modalMessage.textContent = message;
        modal.style.display = 'block';

        // Remove previous event listeners
        const newConfirmBtn = confirmBtn.cloneNode(true);
        confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);

        // Add new event listener
        newConfirmBtn.addEventListener('click', () => {
            this.hideModal();
            onConfirm();
        });
    }

    hideModal() {
        const modal = document.getElementById('confirmationModal');
        modal.style.display = 'none';
    }

    showMessage(message, type = 'info') {
        const messageContainer = document.getElementById('messageContainer');
        const messageElement = document.createElement('div');
        messageElement.className = `message ${type}`;
        messageElement.textContent = message;

        messageContainer.appendChild(messageElement);

        // Remove message after 5 seconds
        setTimeout(() => {
            if (messageElement.parentNode) {
                messageElement.parentNode.removeChild(messageElement);
            }
        }, 5000);
    }

    setupMobileMenu() {
        // Mobile menu functionality is already defined globally at the bottom of this file
        // This method can be used for any additional mobile menu setup if needed
        console.log('Mobile menu setup completed');
    }

    // === BOOKINGS FUNCTIONALITY ===
    setupBookingsTab() {
        // Setup booking filter buttons
        const bookingFilterButtons = document.querySelectorAll('.booking-filters .filter-btn');
        bookingFilterButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                // Remove active class from all buttons
                bookingFilterButtons.forEach(b => b.classList.remove('active'));
                // Add active class to clicked button
                btn.classList.add('active');
                
                // Show corresponding category
                const filter = btn.getAttribute('data-filter');
                this.showBookingCategory(filter);
            });
        });

        // Load and display bookings
        this.loadBookings();
    }

    loadBookings() {
        // Get bookings from localStorage
        const bookings = this.getBookingsFromStorage();
        
        // Display bookings by category
        this.displayUpcomingBookings(bookings.upcoming);
        this.displayUnpaidBookings(bookings.unpaid);
        this.displayHistoryBookings(bookings.history);
    }

    getBookingsFromStorage() {
        const allBookings = JSON.parse(localStorage.getItem('userBookings') || '[]');
        const now = new Date();

        return {
            upcoming: allBookings.filter(booking => 
                booking.status === 'paid' && 
                new Date(booking.tripDate) > now
            ),
            unpaid: allBookings.filter(booking => 
                booking.status === 'unpaid' || booking.status === 'confirmed'
            ),
            history: allBookings.filter(booking => 
                (booking.status === 'paid' && new Date(booking.tripDate) <= now) ||
                booking.status === 'completed'
            )
        };
    }

    showBookingCategory(category) {
        // Hide all categories
        document.querySelectorAll('.booking-category').forEach(cat => {
            cat.classList.remove('active');
        });
        
        // Show selected category
        const categoryElement = document.getElementById(`${category}-bookings`);
        if (categoryElement) {
            categoryElement.classList.add('active');
        }
    }

    displayUpcomingBookings(bookings) {
        const container = document.getElementById('upcoming-list');
        if (!container) return;

        if (bookings.length === 0) {
            container.innerHTML = this.getEmptyBookingsHTML('upcoming');
            return;
        }

        container.innerHTML = bookings.map(booking => this.getBookingCardHTML(booking, 'upcoming')).join('');
        this.attachBookingEventListeners();
    }

    displayUnpaidBookings(bookings) {
        const container = document.getElementById('unpaid-list');
        if (!container) return;

        if (bookings.length === 0) {
            container.innerHTML = this.getEmptyBookingsHTML('unpaid');
            return;
        }

        container.innerHTML = bookings.map(booking => this.getBookingCardHTML(booking, 'unpaid')).join('');
        this.attachBookingEventListeners();
    }

    displayHistoryBookings(bookings) {
        const container = document.getElementById('history-list');
        if (!container) return;

        if (bookings.length === 0) {
            container.innerHTML = this.getEmptyBookingsHTML('history');
            return;
        }

        container.innerHTML = bookings.map(booking => this.getBookingCardHTML(booking, 'history')).join('');
        this.attachBookingEventListeners();
    }

    getBookingCardHTML(booking, type) {
        const statusClass = booking.status === 'paid' ? 'paid' : booking.status === 'unpaid' || booking.status === 'confirmed' ? 'unpaid' : 'completed';
        const statusText = booking.status === 'paid' ? 'PAID' : booking.status === 'unpaid' || booking.status === 'confirmed' ? 'UNPAID' : 'COMPLETED';

        return `
            <div class="booking-card ${statusClass}" data-booking-id="${booking.id}">
                <div class="booking-card-header">
                    <div class="booking-card-title">
                        <h4><i class="fas fa-taxi"></i> ${booking.routeName || 'Taxi Booking'}</h4>
                        <div class="booking-reference">Ref: ${booking.reference}</div>
                    </div>
                    <div class="booking-status-badge ${statusClass}">${statusText}</div>
                </div>
                <div class="booking-card-body">
                    <div class="booking-detail-item">
                        <div class="booking-detail-label">Trip Date</div>
                        <div class="booking-detail-value">
                            <i class="fas fa-calendar"></i>
                            ${new Date(booking.tripDate).toLocaleDateString()}
                        </div>
                    </div>
                    <div class="booking-detail-item">
                        <div class="booking-detail-label">Passengers</div>
                        <div class="booking-detail-value">
                            <i class="fas fa-users"></i>
                            ${booking.passengers}
                        </div>
                    </div>
                    <div class="booking-detail-item">
                        <div class="booking-detail-label">Total Amount</div>
                        <div class="booking-detail-value">
                            <i class="fas fa-money-bill-wave"></i>
                            R${booking.totalAmount}
                        </div>
                    </div>
                    <div class="booking-detail-item">
                        <div class="booking-detail-label">Booking Date</div>
                        <div class="booking-detail-value">
                            <i class="fas fa-clock"></i>
                            ${new Date(booking.bookingDate).toLocaleDateString()}
                        </div>
                    </div>
                </div>
                <div class="booking-card-footer">
                    ${this.getBookingActionsHTML(booking, type)}
                </div>
            </div>
        `;
    }

    getBookingActionsHTML(booking, type) {
        let actions = '';
        
        if (type === 'unpaid') {
            actions += `
                <button class="booking-btn booking-btn-primary" onclick="profileManager.payForBooking('${booking.id}')">
                    <i class="fas fa-credit-card"></i> Pay Now
                </button>
            `;
        }
        
        actions += `
            <button class="booking-btn booking-btn-secondary" onclick="profileManager.viewBookingDetails('${booking.id}')">
                <i class="fas fa-eye"></i> View Details
            </button>
        `;

        if (type === 'unpaid') {
            actions += `
                <button class="booking-btn booking-btn-danger" onclick="profileManager.cancelBooking('${booking.id}')">
                    <i class="fas fa-times"></i> Cancel
                </button>
            `;
        }

        return actions;
    }

    getEmptyBookingsHTML(type) {
        const messages = {
            upcoming: {
                icon: 'fa-calendar-check',
                title: 'No Upcoming Trips',
                text: 'You don\'t have any upcoming bookings. Book a taxi now!'
            },
            unpaid: {
                icon: 'fa-exclamation-circle',
                title: 'No Unpaid Bookings',
                text: 'All your bookings are paid for!'
            },
            history: {
                icon: 'fa-history',
                title: 'No Trip History',
                text: 'You haven\'t completed any trips yet.'
            }
        };

        const msg = messages[type];
        return `
            <div class="empty-bookings">
                <i class="fas ${msg.icon}"></i>
                <h4>${msg.title}</h4>
                <p>${msg.text}</p>
                ${type === 'upcoming' || type === 'history' ? `
                    <a href="/pages/customer/booking-type-selection.html" class="btn">
                        <i class="fas fa-plus"></i> Book a Taxi
                    </a>
                ` : ''}
            </div>
        `;
    }

    attachBookingEventListeners() {
        // Event listeners are attached via onclick in the HTML
        // This method can be used for additional event listeners if needed
    }

    payForBooking(bookingId) {
        // Get booking details
        const allBookings = JSON.parse(localStorage.getItem('userBookings') || '[]');
        const booking = allBookings.find(b => b.id === bookingId);
        
        if (!booking) {
            this.showMessage('Booking not found', 'error');
            return;
        }

        // Store payment data for the payment page
        localStorage.setItem('paymentData', JSON.stringify({
            bookingId: booking.id,
            routeName: booking.routeName,
            passengers: booking.passengers,
            pricePerPerson: booking.pricePerPerson,
            totalAmount: booking.totalAmount,
            pickupPoints: booking.pickupPoints || [],
            dropoffPoints: booking.dropoffPoints || []
        }));

        // Redirect to payment page
        window.location.href = '/pages/customer/booking-payment.html';
    }

    viewBookingDetails(bookingId) {
        const allBookings = JSON.parse(localStorage.getItem('userBookings') || '[]');
        const booking = allBookings.find(b => b.id === bookingId);
        
        if (!booking) {
            this.showMessage('Booking not found', 'error');
            return;
        }

        // Create and show detailed modal
        let detailsHTML = `
            <div style="text-align: left;">
                <h3 style="margin-bottom: 1rem; color: #01386A;">Booking Details</h3>
                <div style="display: grid; gap: 1rem;">
                    <div><strong>Reference:</strong> ${booking.reference}</div>
                    <div><strong>Route:</strong> ${booking.routeName || 'N/A'}</div>
                    <div><strong>Passengers:</strong> ${booking.passengers}</div>
                    <div><strong>Trip Date:</strong> ${new Date(booking.tripDate).toLocaleDateString()}</div>
                    <div><strong>Total Amount:</strong> R${booking.totalAmount}</div>
                    <div><strong>Status:</strong> ${booking.status.toUpperCase()}</div>
                </div>
            </div>
        `;

        // Show in modal
        const modal = document.getElementById('confirmationModal');
        const modalMessage = document.getElementById('modalMessage');
        const confirmBtn = document.getElementById('confirmBtn');
        
        if (modal && modalMessage) {
            modalMessage.innerHTML = detailsHTML;
            confirmBtn.style.display = 'none';
            modal.style.display = 'block';
        }
    }

    cancelBooking(bookingId) {
        this.showConfirmationModal(
            'Are you sure you want to cancel this booking? This action cannot be undone.',
            () => {
                // Remove booking from storage
                let allBookings = JSON.parse(localStorage.getItem('userBookings') || '[]');
                allBookings = allBookings.filter(b => b.id !== bookingId);
                localStorage.setItem('userBookings', JSON.stringify(allBookings));

                // Reload bookings display
                this.loadBookings();
                this.showMessage('Booking cancelled successfully', 'success');
            }
        );
    }
}

// Mobile menu functionality (copied from client.html/clientCrowdSource.html)
// Make functions globally available for HTML onclick attributes
window.toggleMobileMenu = function() {
    const menu = document.getElementById("mobileMenu");
    const isShown = menu.classList.toggle("show");
    
    const topnav = document.querySelector(".topnav");
    if (isShown) {
        topnav.style.zIndex = "3001";
    } else {
        topnav.style.zIndex = "1000";
    }
};

window.topNavZIndexDecrease = function() {
    const navbar = document.querySelector(".topnav");
    navbar.style.zIndex = "3";
};

// Initialize profile manager when DOM is loaded
let profileManager;
document.addEventListener('DOMContentLoaded', async () => {
    try {
        profileManager = new ProfileManager();
        window.profileManager = profileManager; // Make it globally accessible
        await profileManager.init();
    } catch (error) {
        console.error('Failed to initialize profile manager:', error);
    }
}); 