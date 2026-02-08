/**
 * Main App Router and Utility Functions
 * Handles navigation, API calls, and shared functionality
 */

class EAAppRouter {
    constructor() {
        this.baseURL = window.location.origin;
        this.currentUser = this.getCurrentUser();
    }

    // Get or set current user (for demo purposes, using simple prompt)
    getCurrentUser() {
        let user = localStorage.getItem('ea_current_user');
        let parsedUser = null;

        // Parse existing user if available
        if (user) {
            try {
                parsedUser = JSON.parse(user);
            } catch (e) {
                // Invalid user data, treat as no user
                localStorage.removeItem('ea_current_user');
            }
        }

        // Always re-prompt demo users for their actual email on refresh
        if (!parsedUser || parsedUser.email === 'demo@company.com' || parsedUser.name === 'Demo User') {
            const email = prompt('Enter your email address:') || 'demo@company.com';
            const name = prompt('Enter your full name:') || 'Demo User';
            parsedUser = { email, name };
            localStorage.setItem('ea_current_user', JSON.stringify(parsedUser));
        }

        return parsedUser;
    }

    // Check if current user is a demo user (cannot submit or interact)
    isDemoUser() {
        return this.currentUser && (
            this.currentUser.email === 'demo@company.com' ||
            this.currentUser.name === 'Demo User' ||
            !this.currentUser.email ||
            !this.currentUser.name ||
            this.currentUser.email.trim() === '' ||
            this.currentUser.name.trim() === ''
        );
    }

    // Check if user can submit accomplishments
    canSubmit() {
        return !this.isDemoUser();
    }

    // Check if user can interact with posts (vote/congratulate)
    canInteract() {
        return !this.isDemoUser();
    }

    // Show access denied message for demo users
    showAccessDenied(element, action = 'perform this action') {
        element.innerHTML = `
            <div class="card">
                <div class="card-content" style="text-align: center; padding: var(--spacing-xl);">
                    <h3 style="color: var(--text-secondary); margin-bottom: var(--spacing-md);">Access Restricted</h3>
                    <p style="color: var(--text-secondary); margin-bottom: var(--spacing-lg);">
                        Demo users can only view accomplishments. To ${action}, please provide your actual email and name.
                    </p>
                    <button class="btn btn-primary" onclick="EAApp.switchToRealUser()">
                        Switch to Real User
                    </button>
                </div>
            </div>
        `;
    }

    // Allow user to switch from demo to real user
    switchToRealUser() {
        localStorage.removeItem('ea_current_user');
        location.reload();
    }

    // API call wrapper
    async apiCall(endpoint, options = {}) {
        try {
            const response = await fetch(`${this.baseURL}/api${endpoint}`, {
                headers: {
                    'Content-Type': 'application/json',
                    ...options.headers
                },
                ...options
            });

            if (!response.ok) {
                throw new Error(`API call failed: ${response.statusText}`);
            }

            return await response.json();
        } catch (error) {
            console.error('API call error:', error);
            throw error;
        }
    }

    // Get all accomplishments
    async getAllAccomplishments() {
        return await this.apiCall('/accomplishments');
    }

    // Get user's accomplishments
    async getUserAccomplishments(userId) {
        return await this.apiCall(`/accomplishments/user/${encodeURIComponent(userId)}`);
    }

    // Filter accomplishments
    async filterAccomplishments(filters) {
        const queryString = new URLSearchParams(filters).toString();
        return await this.apiCall(`/accomplishments/filter?${queryString}`);
    }

    // Submit new accomplishment
    async submitAccomplishment(data) {
        return await this.apiCall('/accomplishments', {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }

    // Get accomplishment details
    async getAccomplishmentDetails(id) {
        return await this.apiCall(`/accomplishments/${id}`);
    }

    // Toggle congratulations on an accomplishment
    async toggleCongratulations(accomplishmentId) {
        return await this.apiCall(`/accomplishments/${accomplishmentId}/congratulations`, {
            method: 'POST',
            body: JSON.stringify({ userEmail: this.currentUser.email })
        });
    }

    // Toggle vote on an accomplishment
    async toggleVote(accomplishmentId) {
        return await this.apiCall(`/accomplishments/${accomplishmentId}/vote`, {
            method: 'POST',
            body: JSON.stringify({ userEmail: this.currentUser.email })
        });
    }

    // Format date for display
    formatDate(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const diff = now - date;
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));

        if (days === 0) return 'Today';
        if (days === 1) return 'Yesterday';
        if (days < 7) return `${days} days ago`;
        if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
        return date.toLocaleDateString();
    }

    // Generate user thumbnail
    getUserThumbnail(name) {
        // Validate input parameter
        if (!name || typeof name !== 'string' || name.trim() === '') {
            console.warn('getUserThumbnail: Invalid name parameter:', name);
            return `data:image/svg+xml,${encodeURIComponent(`
        <svg width="50" height="50" xmlns="http://www.w3.org/2000/svg">
          <circle cx="25" cy="25" r="25" fill="#6c757d"/>
          <text x="25" y="32" text-anchor="middle" fill="white" font-family="Arial" font-size="18" font-weight="bold">U</text>
        </svg>
      `)}`;
        }

        // Extract initials safely
        const nameParts = name.trim().split(' ').filter(part => part.length > 0);
        const initials = nameParts.map(part => part[0]).join('').toUpperCase();
        // Fallback to first character if no initials extracted
        const displayInitials = initials || name.trim()[0].toUpperCase();

        const colors = ['#007bff', '#28a745', '#ffc107', '#dc3545', '#6f42c1', '#fd7e14'];
        const color = colors[name.length % colors.length];
        return `data:image/svg+xml,${encodeURIComponent(`
      <svg width="50" height="50" xmlns="http://www.w3.org/2000/svg">
        <circle cx="25" cy="25" r="25" fill="${color}"/>
        <text x="25" y="32" text-anchor="middle" fill="white" font-family="Arial" font-size="18" font-weight="bold">${displayInitials}</text>
      </svg>
    `)}`;
    }

    // Show loading state
    showLoading(element) {
        element.innerHTML = '<div class="loading">Loading...</div>';
    }

    // Show error state
    showError(element, message) {
        element.innerHTML = `<div class="error">Error: ${message}</div>`;
    }
}

// Global app instance
window.EAApp = new EAAppRouter();