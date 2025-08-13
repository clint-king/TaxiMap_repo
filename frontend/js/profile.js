// Profile Page JavaScript
class ProfileManager {
    constructor() {
        this.currentUser = null;
        this.activityLog = [];
        this.init();
    }

    init() {
        this.loadUserData();
        this.setupEventListeners();
        this.loadActivityLog();
        this.setupTabNavigation();
        this.setupPasswordStrength();
        this.setupModalEvents();
    }

    loadUserData() {
        // Load user data from localStorage (for demo purposes)
        const savedUser = localStorage.getItem('userProfile');
        if (savedUser) {
            this.currentUser = JSON.parse(savedUser);
        } else {
            // Default user data
            this.currentUser = {
                firstName: 'John',
                lastName: 'Doe',
                username: 'johndoe',
                email: 'john.doe@example.com',
                phone: '+1 234 567 8900',
                bio: 'Software developer passionate about creating amazing user experiences.',
                location: 'New York, USA',
                profilePicture: null
            };
        }
        this.updateProfileDisplay();
        this.populateForms();
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
            personalForm.firstName.value = this.currentUser.firstName;
            personalForm.lastName.value = this.currentUser.lastName;
            personalForm.username.value = this.currentUser.username;
            personalForm.phone.value = this.currentUser.phone;
            personalForm.bio.value = this.currentUser.bio;
            personalForm.location.value = this.currentUser.location;
        }

        // Populate security forms
        const currentEmail = document.getElementById('currentEmail');
        if (currentEmail) {
            currentEmail.value = this.currentUser.email;
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

    handlePersonalInfoSubmit(event) {
        event.preventDefault();
        const formData = new FormData(event.target);
        const data = Object.fromEntries(formData);

        // Update user data
        Object.assign(this.currentUser, data);
        this.saveUserData();
        this.updateProfileDisplay();
        this.addActivityLog('profile', 'Personal information updated');
        this.showMessage('Personal information updated successfully!', 'success');
    }

    handleEmailChangeSubmit(event) {
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

    confirmEmailChange(data) {
        // Simulate email confirmation process
        this.showMessage('Confirmation email sent to ' + data.newEmail, 'info');
        
        // In a real app, you would wait for email confirmation
        setTimeout(() => {
            this.currentUser.email = data.newEmail;
            this.saveUserData();
            this.updateProfileDisplay();
            this.addActivityLog('security', 'Email address changed');
            this.showMessage('Email address updated successfully!', 'success');
        }, 2000);
    }

    handlePasswordChangeSubmit(event) {
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

    confirmPasswordChange(data) {
        // Simulate password change process
        this.showMessage('Password changed successfully!', 'success');
        this.addActivityLog('security', 'Password changed');
        event.target.reset();
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

    loadActivityLog() {
        // Load activity log from localStorage (for demo purposes)
        const savedLog = localStorage.getItem('activityLog');
        if (savedLog) {
            this.activityLog = JSON.parse(savedLog);
        } else {
            // Default activity log
            this.activityLog = [
                { type: 'login', title: 'Login successful', time: new Date(Date.now() - 1000 * 60 * 30), device: 'Chrome on Windows', ip: '192.168.1.1' },
                { type: 'profile', title: 'Profile picture updated', time: new Date(Date.now() - 1000 * 60 * 60 * 2), device: 'Chrome on Windows', ip: '192.168.1.1' },
                { type: 'security', title: 'Password changed', time: new Date(Date.now() - 1000 * 60 * 60 * 24), device: 'Chrome on Windows', ip: '192.168.1.1' },
                { type: 'login', title: 'Login successful', time: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2), device: 'Safari on iPhone', ip: '192.168.1.2' }
            ];
        }

        this.setupActivityFilters();
        this.renderActivityLog(this.activityLog);
    }

    addActivityLog(type, title) {
        const activity = {
            type,
            title,
            time: new Date(),
            device: 'Chrome on Windows', // In a real app, detect actual device
            ip: '192.168.1.1' // In a real app, get actual IP
        };

        this.activityLog.unshift(activity);
        localStorage.setItem('activityLog', JSON.stringify(this.activityLog));
        this.renderActivityLog(this.activityLog);
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
}

// Mobile menu functionality (copied from client.html/clientCrowdSource.html)
function toggleMobileMenu() {
    const menu = document.getElementById("mobileMenu");
    const isShown = menu.classList.toggle("show");
    
    const topnav = document.querySelector(".topnav");
    if (isShown) {
        topnav.style.zIndex = "3001";
    } else {
        topnav.style.zIndex = "1000";
    }
}

function topNavZIndexDecrease() {
    const navbar = document.querySelector(".topnav");
    navbar.style.zIndex = "3";
}

// Initialize profile manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new ProfileManager();
}); 