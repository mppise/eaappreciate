/**
 * Feed Page JavaScript
 * Handles displaying all accomplishments in LinkedIn-style feed with search functionality
 */

let currentPage = 0;
const itemsPerPage = 10;
let allAccomplishments = [];
let filteredAccomplishments = [];
let displayedAccomplishments = [];

// Search and filter state
let currentSearchTerm = '';
let currentImpactFilter = '';
let currentDateFilter = '';

// Initialize page
document.addEventListener('DOMContentLoaded', async () => {
    displayCurrentUser();
    setupSearchHandlers();
    await loadAccomplishments();
});

function displayCurrentUser() {
    const userElement = document.getElementById('current-user');
    const user = EAApp.currentUser;
    userElement.textContent = user.name;
}

function setupSearchHandlers() {
    const searchInput = document.getElementById('search-input');
    const clearSearchBtn = document.getElementById('clear-search');
    const impactFilter = document.getElementById('impact-filter');
    const dateFilter = document.getElementById('date-range');

    // Search input with debouncing
    let searchTimeout;
    searchInput.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            currentSearchTerm = e.target.value.trim();
            toggleClearButton();
            applyFiltersAndDisplay();
        }, 300);
    });

    // Clear search button
    clearSearchBtn.addEventListener('click', () => {
        searchInput.value = '';
        currentSearchTerm = '';
        toggleClearButton();
        applyFiltersAndDisplay();
        searchInput.focus();
    });

    // Filter dropdowns
    impactFilter.addEventListener('change', (e) => {
        currentImpactFilter = e.target.value;
        applyFiltersAndDisplay();
    });

    dateFilter.addEventListener('change', (e) => {
        currentDateFilter = e.target.value;
        applyFiltersAndDisplay();
    });
}

function toggleClearButton() {
    const clearSearchBtn = document.getElementById('clear-search');
    const searchInput = document.getElementById('search-input');

    if (searchInput.value.trim()) {
        clearSearchBtn.style.display = 'block';
    } else {
        clearSearchBtn.style.display = 'none';
    }
}

async function loadAccomplishments() {
    const feedElement = document.getElementById('accomplishments-feed');

    try {
        EAApp.showLoading(feedElement);
        const response = await EAApp.getAllAccomplishments();
        if (response.success) {
            allAccomplishments = response.data;
            applyFiltersAndDisplay();
        } else {
            throw new Error('Failed to load accomplishments');
        }
    } catch (error) {
        console.error('Error loading accomplishments:', error);
        EAApp.showError(feedElement, 'Failed to load accomplishments. Please try again.');
    }
}

function applyFiltersAndDisplay() {
    // Reset pagination when filters change
    currentPage = 0;
    displayedAccomplishments = [];

    // Apply filters to get filtered results
    filteredAccomplishments = filterAccomplishments(allAccomplishments);

    // Display filtered results
    displayFilteredAccomplishments();
}

function filterAccomplishments(accomplishments) {
    return accomplishments.filter(accomplishment => {
        // Text search (fuzzy search across multiple fields)
        const textMatch = fuzzyTextSearch(accomplishment, currentSearchTerm);

        // Impact type filter
        const impactMatch = !currentImpactFilter || accomplishment.impactType === currentImpactFilter;

        // Date range filter
        const dateMatch = dateRangeMatch(accomplishment.createdAt, currentDateFilter);

        return textMatch && impactMatch && dateMatch;
    });
}

function fuzzyTextSearch(accomplishment, searchTerm) {
    if (!searchTerm) return true;

    const searchWords = searchTerm.toLowerCase().split(/\s+/);
    const searchableText = [
        accomplishment.userName,
        accomplishment.aiGeneratedStatement,
        accomplishment.originalStatement,
        accomplishment.impactType,
        accomplishment.responses?.emailAppreciation || '',
        accomplishment.responses?.additionalDetails || ''
    ].join(' ').toLowerCase();

    // Check if all search words are found in the searchable text
    return searchWords.every(word => searchableText.includes(word));
}

function dateRangeMatch(dateString, dateFilter) {
    if (!dateFilter) return true;

    const accomplishmentDate = new Date(dateString);
    const now = new Date();

    switch (dateFilter) {
        case 'today':
            return accomplishmentDate.toDateString() === now.toDateString();

        case 'week':
            const weekAgo = new Date(now);
            weekAgo.setDate(now.getDate() - 7);
            return accomplishmentDate >= weekAgo;

        case 'month':
            const monthAgo = new Date(now);
            monthAgo.setMonth(now.getMonth() - 1);
            return accomplishmentDate >= monthAgo;

        case 'quarter':
            const quarterAgo = new Date(now);
            quarterAgo.setMonth(now.getMonth() - 3);
            return accomplishmentDate >= quarterAgo;

        default:
            return true;
    }
}

function displayFilteredAccomplishments() {
    const feedElement = document.getElementById('accomplishments-feed');
    const loadMoreElement = document.getElementById('load-more');

    if (filteredAccomplishments.length === 0) {
        if (allAccomplishments.length === 0) {
            feedElement.innerHTML = `
                <div class="empty-feed">
                    <h3>No accomplishments yet</h3>
                    <p>Be the first to share your achievements!</p>
                    <a href="/submit" class="btn btn-primary">Submit Accomplishment</a>
                </div>
            `;
        } else {
            feedElement.innerHTML = `
                <div class="empty-feed">
                    <h3>No matching accomplishments</h3>
                    <p>Try adjusting your search criteria or filters.</p>
                    <button class="btn" onclick="clearAllFilters()">Clear Filters</button>
                </div>
            `;
        }
        loadMoreElement.style.display = 'none';
        return;
    }

    // Load initial items
    const startIndex = currentPage * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const newItems = filteredAccomplishments.slice(startIndex, endIndex);

    displayedAccomplishments.push(...newItems);

    if (currentPage === 0) {
        // First load - replace content
        feedElement.innerHTML = displayedAccomplishments.map(createAccomplishmentCard).join('');
    } else {
        // Subsequent loads - append content
        const newCardsHTML = newItems.map(createAccomplishmentCard).join('');
        feedElement.insertAdjacentHTML('beforeend', newCardsHTML);
    }

    // Show/hide load more button
    if (displayedAccomplishments.length < filteredAccomplishments.length) {
        loadMoreElement.style.display = 'block';
    } else {
        loadMoreElement.style.display = 'none';
    }
}

function clearAllFilters() {
    // Clear all filter inputs
    document.getElementById('search-input').value = '';
    document.getElementById('impact-filter').value = '';
    document.getElementById('date-range').value = '';

    // Reset filter state
    currentSearchTerm = '';
    currentImpactFilter = '';
    currentDateFilter = '';

    // Hide clear button and refresh display
    toggleClearButton();
    applyFiltersAndDisplay();
}

function createAccomplishmentCard(accomplishment) {
    const thumbnail = accomplishment.userThumbnail || EAApp.getUserThumbnail(accomplishment.userName);
    const formattedDate = EAApp.formatDate(accomplishment.createdAt);

    // Initialize interaction counters if not present
    const congratsCount = accomplishment.congratulationsCount || 0;
    const votesCount = accomplishment.votesCount || 0;

    return `
    <div class="accomplishment-card" data-id="${accomplishment.id}">
      <div class="card-header">
        <img src="${thumbnail}" alt="${accomplishment.userName}" class="user-avatar" onerror="this.src='${EAApp.getUserThumbnail(accomplishment.userName)}'">
        <div class="user-info">
          <div class="user-name">${accomplishment.userName}</div>
          <div class="user-email">${accomplishment.userId}</div>
        </div>
        <div class="header-right">
          <div class="timestamp">${formattedDate}</div>
          <span class="impact-badge impact-${accomplishment.impactType}">
            ${accomplishment.impactType} impact
          </span>
        </div>
      </div>
      <div class="card-content">
        <div class="accomplishment-text">${accomplishment.aiGeneratedStatement}</div>
      </div>
      <div class="interaction-bar">
        <button class="copy-btn" onclick="copyAccomplishment('${accomplishment.id}')" title="Copy accomplishment text">
          <span class="copy-icon">📋</span>
          Copy
        </button>
        <div class="interaction-buttons">
          <button class="interaction-btn congratulations" onclick="toggleCongratulations('${accomplishment.id}')" title="Congratulate">
            <span class="interaction-icon">👏</span>
            <span class="interaction-text">Congratulate</span>
            <span class="interaction-count">&nbsp;(${congratsCount})</span>
          </button>
          <button class="interaction-btn votes" onclick="toggleVote('${accomplishment.id}')" title="Vote for this achievement">
            <span class="interaction-icon">⭐</span>
            <span class="interaction-text">Vote</span>
            <span class="interaction-count">&nbsp;(${votesCount})</span>
          </button>
        </div>
      </div>
    </div>
  `;
}

function loadMoreAccomplishments() {
    currentPage++;
    displayFilteredAccomplishments();
}

// Team Interaction Functions

async function toggleCongratulations(accomplishmentId) {
    // Check if user can interact
    if (!EAApp.canInteract()) {
        showToast('Demo users can only view accomplishments. Please provide your actual email to interact.', 'error');
        return;
    }

    try {
        const response = await EAApp.toggleCongratulations(accomplishmentId);
        if (response.success) {
            // Update the UI with new count
            updateInteractionCount(accomplishmentId, 'congratulations', response.data.congratulationsCount, response.data.userCongratulated);

            // Update local data
            const accomplishment = allAccomplishments.find(a => a.id === accomplishmentId);
            if (accomplishment) {
                accomplishment.congratulationsCount = response.data.congratulationsCount;
                accomplishment.userCongratulated = response.data.userCongratulated;
            }
        }
    } catch (error) {
        console.error('Error toggling congratulations:', error);
        // Show user feedback
        showToast('Failed to update congratulations. Please try again.', 'error');
    }
}

async function toggleVote(accomplishmentId) {
    // Check if user can interact
    if (!EAApp.canInteract()) {
        showToast('Demo users can only view accomplishments. Please provide your actual email to interact.', 'error');
        return;
    }

    try {
        const response = await EAApp.toggleVote(accomplishmentId);
        if (response.success) {
            // Update the UI with new count
            updateInteractionCount(accomplishmentId, 'votes', response.data.votesCount, response.data.userVoted);

            // Update local data
            const accomplishment = allAccomplishments.find(a => a.id === accomplishmentId);
            if (accomplishment) {
                accomplishment.votesCount = response.data.votesCount;
                accomplishment.userVoted = response.data.userVoted;
            }
        }
    } catch (error) {
        console.error('Error toggling vote:', error);
        // Show user feedback
        showToast('Failed to update vote. Please try again.', 'error');
    }
}

function updateInteractionCount(accomplishmentId, interactionType, count, isActive) {
    const card = document.querySelector(`[data-id="${accomplishmentId}"]`);
    if (!card) return;

    const button = card.querySelector(`.interaction-btn.${interactionType}`);
    const countElement = button.querySelector('.interaction-count');

    // Update count with consistent formatting
    countElement.innerHTML = `&nbsp;(${count})`;

    // Update active state
    if (isActive) {
        button.classList.add('active');
    } else {
        button.classList.remove('active');
    }
}

async function copyAccomplishment(accomplishmentId) {
    try {
        const accomplishment = allAccomplishments.find(a => a.id === accomplishmentId);
        if (!accomplishment) return;

        // Create copy text
        const copyText = `${accomplishment.aiGeneratedStatement}\n\nThis accomplishment has received ${accomplishment.congratulationsCount || 0} congratulations and ${accomplishment.votesCount || 0} votes on EA Appreciate!`;

        // Copy to clipboard
        await navigator.clipboard.writeText(copyText);

        // Update button to show success
        const card = document.querySelector(`[data-id="${accomplishmentId}"]`);
        const copyButton = card.querySelector('.copy-btn');

        const originalText = copyButton.textContent;
        copyButton.textContent = 'Copied!';
        copyButton.classList.add('copied');

        // Reset after 2 seconds
        setTimeout(() => {
            copyButton.textContent = originalText;
            copyButton.classList.remove('copied');
        }, 2000);

        showToast('Accomplishment copied to clipboard!', 'success');

    } catch (error) {
        console.error('Error copying accomplishment:', error);
        showToast('Failed to copy. Please try again.', 'error');
    }
}

function showToast(message, type = 'info') {
    // Simple toast notification
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    toast.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${type === 'error' ? '#ef4444' : type === 'success' ? '#10b981' : '#3b82f6'};
        color: white;
        padding: 12px 16px;
        border-radius: 6px;
        z-index: 1000;
        font-size: 14px;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        transform: translateX(100%);
        transition: transform 0.3s ease;
    `;

    document.body.appendChild(toast);

    // Animate in
    setTimeout(() => {
        toast.style.transform = 'translateX(0)';
    }, 10);

    // Remove after 3 seconds
    setTimeout(() => {
        toast.style.transform = 'translateX(100%)';
        setTimeout(() => {
            document.body.removeChild(toast);
        }, 300);
    }, 3000);
}

// Infinite scroll functionality (optional enhancement)
window.addEventListener('scroll', () => {
    if ((window.innerHeight + window.scrollY) >= document.body.offsetHeight - 1000) {
        const loadMoreButton = document.getElementById('load-more');
        if (loadMoreButton.style.display === 'block') {
            loadMoreAccomplishments();
        }
    }
});
