/**
 * Hubify Mail - Admin Dashboard JavaScript
 */

// API Base URL
const API_BASE = '/api';

// State
let authToken = null;

// DOM Elements
const elements = {
    loginView: document.getElementById('login-view'),
    dashboardView: document.getElementById('dashboard-view'),
    loginForm: document.getElementById('login-form'),
    usernameInput: document.getElementById('username'),
    passwordInput: document.getElementById('password'),
    btnRefreshStats: document.getElementById('btn-refresh-stats'),
    btnLogout: document.getElementById('btn-logout'),
    btnAddDomain: document.getElementById('btn-add-domain'),
    btnCleanup: document.getElementById('btn-cleanup'),
    statToday: document.getElementById('stat-today'),
    statTotal: document.getElementById('stat-total'),
    statInboxes: document.getElementById('stat-inboxes'),
    statExpired: document.getElementById('stat-expired'),
    domainsTable: document.getElementById('domains-table'),
    recentEmailsTable: document.getElementById('recent-emails-table'),
    domainModal: document.getElementById('domain-modal'),
    domainModalClose: document.getElementById('domain-modal-close'),
    addDomainForm: document.getElementById('add-domain-form'),
    newDomainInput: document.getElementById('new-domain'),
    toastContainer: document.getElementById('toast-container'),
    // Names management
    namesGrid: document.getElementById('names-grid'),
    namesCount: document.getElementById('names-count'),
    namesSearch: document.getElementById('names-search'),
    namesFilterGender: document.getElementById('names-filter-gender'),
    namesFilterStatus: document.getElementById('names-filter-status'),
    btnAddName: document.getElementById('btn-add-name'),
    btnBulkAdd: document.getElementById('btn-bulk-add'),
    btnDeleteAllNames: document.getElementById('btn-delete-all-names'),
    nameModal: document.getElementById('name-modal'),
    nameModalClose: document.getElementById('name-modal-close'),
    addNameForm: document.getElementById('add-name-form'),
    newNameInput: document.getElementById('new-name'),
    newNameGender: document.getElementById('new-name-gender'),
    bulkModal: document.getElementById('bulk-modal'),
    bulkModalClose: document.getElementById('bulk-modal-close'),
    bulkAddForm: document.getElementById('bulk-add-form'),
    bulkFile: document.getElementById('bulk-file'),
    bulkTextarea: document.getElementById('bulk-textarea'),
    bulkGender: document.getElementById('bulk-gender'),
};

// State for names
let allNames = [];

// Utils
function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast toast--${type}`;
    toast.textContent = message;
    elements.toastContainer.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

function formatDate(dateString) {
    return new Date(dateString).toLocaleString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}

// Auth Functions
function getAuthHeaders() {
    return {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
    };
}

async function login(username, password) {
    try {
        const res = await fetch(`${API_BASE}/admin/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password }),
        });
        const data = await res.json();

        if (data.success) {
            authToken = data.data.token;
            localStorage.setItem('hubify_admin_token', authToken);
            showDashboard();
            showToast('Login successful!', 'success');
        } else {
            showToast(data.error || 'Login failed', 'error');
        }
    } catch (error) {
        console.error('Login error:', error);
        showToast('Login failed', 'error');
    }
}

function logout() {
    authToken = null;
    localStorage.removeItem('hubify_admin_token');
    showLogin();
    showToast('Logged out', 'success');
}

function showLogin() {
    elements.loginView.classList.remove('hidden');
    elements.dashboardView.classList.add('hidden');
}

function showDashboard() {
    elements.loginView.classList.add('hidden');
    elements.dashboardView.classList.remove('hidden');
    loadDashboardData();
}

// API Functions
async function fetchStats() {
    try {
        const res = await fetch(`${API_BASE}/admin/stats`, {
            headers: getAuthHeaders(),
        });
        const data = await res.json();

        if (data.success) {
            elements.statToday.textContent = data.data.totalEmailsToday;
            elements.statTotal.textContent = data.data.totalEmailsAll;
            elements.statInboxes.textContent = data.data.activeInboxes;
            elements.statExpired.textContent = data.data.expiredInboxes;
        } else if (res.status === 401) {
            logout();
        }
    } catch (error) {
        console.error('Error fetching stats:', error);
    }
}

async function fetchDomains() {
    try {
        const res = await fetch(`${API_BASE}/admin/domains`, {
            headers: getAuthHeaders(),
        });
        const data = await res.json();

        if (data.success) {
            renderDomainsTable(data.data);
        }
    } catch (error) {
        console.error('Error fetching domains:', error);
    }
}

async function addDomain(domain) {
    try {
        const res = await fetch(`${API_BASE}/admin/domains`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({ domain }),
        });
        const data = await res.json();

        if (data.success) {
            showToast('Domain added!', 'success');
            if (data.postfixSyncWarning) showToast(data.postfixSyncWarning, 'warning');
            hideDomainModal();
            fetchDomains();
        } else {
            showToast(data.error || 'Failed to add domain', 'error');
        }
    } catch (error) {
        console.error('Error adding domain:', error);
        showToast('Failed to add domain', 'error');
    }
}

async function toggleDomain(id, isActive) {
    try {
        const res = await fetch(`${API_BASE}/admin/domains/${id}`, {
            method: 'PATCH',
            headers: getAuthHeaders(),
            body: JSON.stringify({ is_active: isActive }),
        });
        const data = await res.json();

        if (data.success) {
            showToast(`Domain ${isActive ? 'enabled' : 'disabled'}!`, 'success');
            if (data.postfixSyncWarning) showToast(data.postfixSyncWarning, 'warning');
            fetchDomains();
        } else {
            showToast(data.error || 'Failed to update domain', 'error');
        }
    } catch (error) {
        console.error('Error updating domain:', error);
        showToast('Failed to update domain', 'error');
    }
}

async function deleteDomain(id) {
    if (!confirm('Are you sure you want to delete this domain?')) return;

    try {
        const res = await fetch(`${API_BASE}/admin/domains/${id}`, {
            method: 'DELETE',
            headers: getAuthHeaders(),
        });
        const data = await res.json();

        if (data.success) {
            showToast('Domain deleted!', 'success');
            if (data.postfixSyncWarning) showToast(data.postfixSyncWarning, 'warning');
            fetchDomains();
        } else {
            showToast(data.error || 'Failed to delete domain', 'error');
        }
    } catch (error) {
        console.error('Error deleting domain:', error);
        showToast('Failed to delete domain', 'error');
    }
}

async function runCleanup() {
    try {
        const res = await fetch(`${API_BASE}/admin/cleanup`, {
            method: 'POST',
            headers: getAuthHeaders(),
        });
        const data = await res.json();

        if (data.success) {
            showToast(data.message, 'success');
            fetchStats();
        } else {
            showToast(data.error || 'Cleanup failed', 'error');
        }
    } catch (error) {
        console.error('Error running cleanup:', error);
        showToast('Cleanup failed', 'error');
    }
}

async function fetchRecentEmails() {
    try {
        const res = await fetch(`${API_BASE}/admin/emails/recent?limit=20`, {
            headers: getAuthHeaders(),
        });
        const data = await res.json();

        if (data.success) {
            renderRecentEmailsTable(data.data);
        }
    } catch (error) {
        console.error('Error fetching recent emails:', error);
    }
}

// UI Functions
function renderDomainsTable(domains) {
    elements.domainsTable.innerHTML = domains
        .map(
            (d) => `
      <tr>
        <td><strong>${escapeHtml(d.domain)}</strong></td>
        <td>
          <span class="badge ${d.is_active ? 'badge--success' : 'badge--danger'}">
            ${d.is_active ? 'Active' : 'Inactive'}
          </span>
        </td>
        <td>${formatDate(d.created_at)}</td>
        <td>
          <button class="btn btn--small ${d.is_active ? 'btn--yellow' : 'btn--green'}" onclick="toggleDomain(${d.id}, ${!d.is_active})">
            ${d.is_active ? 'Disable' : 'Enable'}
          </button>
          <button class="btn btn--small btn--red" onclick="deleteDomain(${d.id})">Delete</button>
        </td>
      </tr>
    `
        )
        .join('');
}

function renderRecentEmailsTable(emails) {
    if (emails.length === 0) {
        elements.recentEmailsTable.innerHTML = `
      <tr><td colspan="4" style="text-align: center;">No emails yet</td></tr>
    `;
        return;
    }

    elements.recentEmailsTable.innerHTML = emails
        .map(
            (e) => `
      <tr>
        <td>${escapeHtml(e.to)}</td>
        <td>${escapeHtml(e.from)}</td>
        <td>${escapeHtml(e.subject)}</td>
        <td>${formatDate(e.receivedAt)}</td>
      </tr>
    `
        )
        .join('');
}

function showDomainModal() {
    elements.domainModal.classList.add('active');
    elements.newDomainInput.value = '';
    elements.newDomainInput.focus();
}

function hideDomainModal() {
    elements.domainModal.classList.remove('active');
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text || '';
    return div.innerHTML;
}

function loadDashboardData() {
    fetchStats();
    fetchDomains();
    fetchNames();
    fetchRecentEmails();
}

// ============================
// NAMES MANAGEMENT FUNCTIONS
// ============================

async function fetchNames() {
    try {
        const res = await fetch(`${API_BASE}/admin/names`, {
            headers: getAuthHeaders(),
        });
        const data = await res.json();

        if (data.success) {
            allNames = data.data;
            renderNamesGrid(allNames);
        }
    } catch (error) {
        console.error('Error fetching names:', error);
    }
}

async function addName(name, gender) {
    try {
        const res = await fetch(`${API_BASE}/admin/names`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({ name, gender }),
        });
        const data = await res.json();

        if (data.success) {
            showToast('Name added!', 'success');
            hideNameModal();
            fetchNames();
        } else {
            showToast(data.error || 'Failed to add name', 'error');
        }
    } catch (error) {
        console.error('Error adding name:', error);
        showToast('Failed to add name', 'error');
    }
}

async function toggleName(id, isActive) {
    try {
        const res = await fetch(`${API_BASE}/admin/names/${id}`, {
            method: 'PATCH',
            headers: getAuthHeaders(),
            body: JSON.stringify({ is_active: isActive }),
        });
        const data = await res.json();

        if (data.success) {
            showToast(`Name ${isActive ? 'enabled' : 'disabled'}!`, 'success');
            fetchNames();
        } else {
            showToast(data.error || 'Failed to update name', 'error');
        }
    } catch (error) {
        console.error('Error updating name:', error);
        showToast('Failed to update name', 'error');
    }
}

async function deleteName(id) {
    if (!confirm('Are you sure you want to delete this name?')) return;

    try {
        const res = await fetch(`${API_BASE}/admin/names/${id}`, {
            method: 'DELETE',
            headers: getAuthHeaders(),
        });
        const data = await res.json();

        if (data.success) {
            showToast('Name deleted!', 'success');
            fetchNames();
        } else {
            showToast(data.error || 'Failed to delete name', 'error');
        }
    } catch (error) {
        console.error('Error deleting name:', error);
        showToast('Failed to delete name', 'error');
    }
}

async function deleteAllNames() {
    const count = allNames.length;
    if (!confirm(`Are you sure you want to delete ALL ${count} names? This cannot be undone!`)) return;

    try {
        const res = await fetch(`${API_BASE}/admin/names/all`, {
            method: 'DELETE',
            headers: getAuthHeaders(),
        });
        const data = await res.json();

        if (data.success) {
            showToast(`Deleted ${data.deletedCount} names!`, 'success');
            fetchNames();
        } else {
            showToast(data.error || 'Failed to delete names', 'error');
        }
    } catch (error) {
        console.error('Error deleting all names:', error);
        showToast('Failed to delete names', 'error');
    }
}

function renderNamesGrid(names) {
    // Apply filters
    const searchTerm = elements.namesSearch?.value.toLowerCase() || '';
    const genderFilter = elements.namesFilterGender?.value || '';
    const statusFilter = elements.namesFilterStatus?.value || '';

    let filtered = names.filter(n => {
        if (searchTerm && !n.name.toLowerCase().includes(searchTerm)) return false;
        if (genderFilter && n.gender !== genderFilter) return false;
        if (statusFilter === 'active' && !n.is_active) return false;
        if (statusFilter === 'inactive' && n.is_active) return false;
        return true;
    });

    // Update count
    if (elements.namesCount) {
        elements.namesCount.textContent = `(${filtered.length}/${names.length})`;
    }

    if (filtered.length === 0) {
        elements.namesGrid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; padding: 2rem;">No names found</p>';
        return;
    }

    elements.namesGrid.innerHTML = filtered
        .map(n => `
            <div class="name-card ${n.is_active ? '' : 'name-card--inactive'}">
                <div class="name-card__header">
                    <span class="name-card__name">${escapeHtml(n.name)}</span>
                    <span class="name-card__gender name-card__gender--${n.gender}">${n.gender}</span>
                </div>
                <div class="name-card__actions">
                    <button class="btn ${n.is_active ? 'btn--yellow' : 'btn--green'}" onclick="toggleName(${n.id}, ${!n.is_active})">
                        ${n.is_active ? 'Disable' : 'Enable'}
                    </button>
                    <button class="btn btn--red" onclick="deleteName(${n.id})">Del</button>
                </div>
            </div>
        `)
        .join('');
}

function applyNamesFilter() {
    renderNamesGrid(allNames);
}

// Bulk Add Functions
function showBulkModal() {
    elements.bulkModal.classList.add('active');
    elements.bulkTextarea.value = '';
    elements.bulkFile.value = '';
    elements.bulkGender.value = 'neutral';
}

function hideBulkModal() {
    elements.bulkModal.classList.remove('active');
}

async function processBulkAdd() {
    let names = [];
    const defaultGender = elements.bulkGender.value;

    // Check file first
    const file = elements.bulkFile.files[0];
    if (file) {
        const text = await file.text();
        names = parseNamesText(text);
    } else {
        // Use textarea
        const text = elements.bulkTextarea.value;
        names = parseNamesText(text);
    }

    if (names.length === 0) {
        showToast('No valid names found', 'error');
        return;
    }

    // Apply default gender to names without gender
    const namesWithGender = names.map(item => ({
        name: item.name,
        gender: item.gender || defaultGender
    }));

    try {
        const res = await fetch(`${API_BASE}/admin/names/bulk`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({ names: namesWithGender }),
        });
        const data = await res.json();

        if (data.success) {
            showToast(`Added ${data.data.added.length} names!`, 'success');
            if (data.data.errors.length > 0) {
                showToast(`${data.data.errors.length} names skipped`, 'error');
            }
            hideBulkModal();
            fetchNames();
        } else {
            showToast(data.error || 'Failed to bulk add', 'error');
        }
    } catch (error) {
        console.error('Error bulk adding:', error);
        showToast('Failed to bulk add names', 'error');
    }
}

function parseNamesText(text) {
    return text
        .split(/[\r\n]+/)  // Split by newlines only
        .map(line => line.trim())
        .filter(line => line.length > 0)
        .map(line => {
            // Check if line has gender (format: name,gender)
            const parts = line.split(',').map(p => p.trim());
            const name = parts[0];
            const gender = parts[1] || null; // null means use default from dropdown

            // Validate name (letters only)
            if (!name || !/^[a-zA-Z]+$/.test(name)) {
                return null;
            }

            // Validate gender if provided
            if (gender && !['male', 'female', 'neutral'].includes(gender.toLowerCase())) {
                return { name, gender: null }; // Invalid gender, use default
            }

            return gender ? { name, gender: gender.toLowerCase() } : { name };
        })
        .filter(item => item !== null);
}

function showNameModal() {
    elements.nameModal.classList.add('active');
    elements.newNameInput.value = '';
    elements.newNameGender.value = 'neutral';
    elements.newNameInput.focus();
}

function hideNameModal() {
    elements.nameModal.classList.remove('active');
}

// Make functions available globally for inline handlers
window.toggleDomain = toggleDomain;
window.deleteDomain = deleteDomain;
window.toggleName = toggleName;
window.deleteName = deleteName;

// Event Listeners
elements.loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const username = elements.usernameInput.value.trim();
    const password = elements.passwordInput.value;
    if (username && password) {
        login(username, password);
    }
});

elements.btnLogout.addEventListener('click', logout);

elements.btnRefreshStats.addEventListener('click', () => {
    loadDashboardData();
    showToast('Refreshed!', 'success');
});

elements.btnAddDomain.addEventListener('click', showDomainModal);

elements.domainModalClose.addEventListener('click', hideDomainModal);

elements.domainModal.addEventListener('click', (e) => {
    if (e.target === elements.domainModal) {
        hideDomainModal();
    }
});

elements.addDomainForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const domain = elements.newDomainInput.value.trim();
    if (domain) {
        addDomain(domain);
    }
});

elements.btnCleanup.addEventListener('click', () => {
    if (confirm('Run cleanup now? This will delete all expired inboxes.')) {
        runCleanup();
    }
});

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        hideDomainModal();
        hideNameModal();
        hideBulkModal();
    }
});

// Names event listeners
elements.btnAddName.addEventListener('click', showNameModal);
elements.btnDeleteAllNames.addEventListener('click', deleteAllNames);

elements.nameModalClose.addEventListener('click', hideNameModal);

elements.nameModal.addEventListener('click', (e) => {
    if (e.target === elements.nameModal) {
        hideNameModal();
    }
});

elements.addNameForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = elements.newNameInput.value.trim();
    const gender = elements.newNameGender.value;
    if (name) {
        addName(name, gender);
    }
});

// Bulk Add event listeners
elements.btnBulkAdd.addEventListener('click', showBulkModal);

elements.bulkModalClose.addEventListener('click', hideBulkModal);

elements.bulkModal.addEventListener('click', (e) => {
    if (e.target === elements.bulkModal) {
        hideBulkModal();
    }
});

elements.bulkAddForm.addEventListener('submit', (e) => {
    e.preventDefault();
    processBulkAdd();
});

// Search and Filter event listeners
elements.namesSearch.addEventListener('input', applyNamesFilter);
elements.namesFilterGender.addEventListener('change', applyNamesFilter);
elements.namesFilterStatus.addEventListener('change', applyNamesFilter);

// Initialize
function init() {
    const savedToken = localStorage.getItem('hubify_admin_token');
    if (savedToken) {
        authToken = savedToken;
        showDashboard();
    } else {
        showLogin();
    }
}

init();
