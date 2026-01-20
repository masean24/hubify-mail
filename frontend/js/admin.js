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
};

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
    fetchRecentEmails();
}

// Make functions available globally for inline handlers
window.toggleDomain = toggleDomain;
window.deleteDomain = deleteDomain;

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
    }
});

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
