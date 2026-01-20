/**
 * Hubify Mail - Main Frontend JavaScript
 */

// API Base URL
const API_BASE = '/api';

// State
let currentEmail = null;
let currentDomains = [];
let pollInterval = null;

// DOM Elements
const elements = {
    emailDisplay: document.getElementById('email-display'),
    btnCopy: document.getElementById('btn-copy'),
    btnRefresh: document.getElementById('btn-refresh'),
    btnNew: document.getElementById('btn-new'),
    btnDelete: document.getElementById('btn-delete'),
    customForm: document.getElementById('custom-form'),
    customLocal: document.getElementById('custom-local'),
    customDomain: document.getElementById('custom-domain'),
    inboxContent: document.getElementById('inbox-content'),
    emailList: document.getElementById('email-list'),
    ttlText: document.getElementById('ttl-text'),
    modal: document.getElementById('email-modal'),
    modalClose: document.getElementById('modal-close'),
    modalSubject: document.getElementById('modal-subject'),
    modalFrom: document.getElementById('modal-from'),
    modalTo: document.getElementById('modal-to'),
    modalDate: document.getElementById('modal-date'),
    modalBody: document.getElementById('modal-body'),
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

function formatTime(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;

    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;

    return date.toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
    });
}

function formatTTL(expiresAt) {
    if (!expiresAt) return 'Email aktif selama 24 jam';

    const expires = new Date(expiresAt);
    const now = new Date();
    const diff = expires - now;

    if (diff <= 0) return 'Email expired';

    const hours = Math.floor(diff / 3600000);
    const minutes = Math.floor((diff % 3600000) / 60000);

    return `⏱️ Expires in ${hours}h ${minutes}m`;
}

// API Functions
async function fetchDomains() {
    try {
        const res = await fetch(`${API_BASE}/domains`);
        const data = await res.json();
        if (data.success) {
            currentDomains = data.data;
            populateDomainSelect();
        }
    } catch (error) {
        console.error('Error fetching domains:', error);
        showToast('Failed to load domains', 'error');
    }
}

async function generateEmail() {
    if (currentDomains.length === 0) {
        showToast('No domains available', 'error');
        return;
    }

    try {
        const domainId = currentDomains[0].id;
        const res = await fetch(`${API_BASE}/inbox/generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ domainId }),
        });
        const data = await res.json();

        if (data.success) {
            setCurrentEmail(data.data.email, data.data.expiresAt);
            showToast('Email generated!', 'success');
        } else {
            showToast(data.error || 'Failed to generate email', 'error');
        }
    } catch (error) {
        console.error('Error generating email:', error);
        showToast('Failed to generate email', 'error');
    }
}

async function useCustomEmail(localPart, domainId) {
    try {
        const res = await fetch(`${API_BASE}/inbox/custom`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ localPart, domainId }),
        });
        const data = await res.json();

        if (data.success) {
            setCurrentEmail(data.data.email, data.data.expiresAt);
            showToast('Email set!', 'success');
        } else {
            showToast(data.error || 'Failed to set email', 'error');
        }
    } catch (error) {
        console.error('Error setting custom email:', error);
        showToast('Failed to set email', 'error');
    }
}

async function fetchInbox() {
    if (!currentEmail) return;

    try {
        const res = await fetch(`${API_BASE}/inbox/${encodeURIComponent(currentEmail)}`);
        const data = await res.json();

        if (data.success) {
            renderInbox(data.data.emails);
            if (data.data.expiresAt) {
                elements.ttlText.textContent = formatTTL(data.data.expiresAt);
            }
        }
    } catch (error) {
        console.error('Error fetching inbox:', error);
    }
}

async function fetchEmailDetail(emailId) {
    try {
        const res = await fetch(`${API_BASE}/email/${emailId}`);
        const data = await res.json();

        if (data.success) {
            showEmailModal(data.data);
        } else {
            showToast('Failed to load email', 'error');
        }
    } catch (error) {
        console.error('Error fetching email:', error);
        showToast('Failed to load email', 'error');
    }
}

async function deleteInbox() {
    if (!currentEmail) return;

    try {
        const res = await fetch(`${API_BASE}/inbox/${encodeURIComponent(currentEmail)}`, {
            method: 'DELETE',
        });
        const data = await res.json();

        if (data.success) {
            showToast('Inbox deleted!', 'success');
            generateEmail();
        } else {
            showToast(data.error || 'Failed to delete inbox', 'error');
        }
    } catch (error) {
        console.error('Error deleting inbox:', error);
        showToast('Failed to delete inbox', 'error');
    }
}

// UI Functions
function setCurrentEmail(email, expiresAt) {
    currentEmail = email;
    elements.emailDisplay.value = email;
    elements.ttlText.textContent = formatTTL(expiresAt);

    // Save to localStorage
    localStorage.setItem('hubify_email', email);

    // Start polling
    startPolling();

    // Fetch inbox immediately
    fetchInbox();
}

function populateDomainSelect() {
    elements.customDomain.innerHTML = currentDomains
        .map((d) => `<option value="${d.id}">${d.domain}</option>`)
        .join('');
}

function renderInbox(emails) {
    if (!emails || emails.length === 0) {
        elements.inboxContent.classList.remove('hidden');
        elements.emailList.classList.add('hidden');
        return;
    }

    elements.inboxContent.classList.add('hidden');
    elements.emailList.classList.remove('hidden');

    elements.emailList.innerHTML = emails
        .map((email) => `
      <li class="email-item" data-id="${email.id}">
        <div class="email-item__header">
          <span class="email-item__from">${escapeHtml(email.from)}</span>
          <span class="email-item__time">${formatTime(email.receivedAt)}</span>
        </div>
        <div class="email-item__subject">${escapeHtml(email.subject)}</div>
        <div class="email-item__preview">${escapeHtml(email.preview || '')}</div>
      </li>
    `)
        .join('');
}

function showEmailModal(email) {
    elements.modalSubject.textContent = email.subject;
    elements.modalFrom.textContent = email.from;
    elements.modalTo.textContent = email.to;
    elements.modalDate.textContent = new Date(email.receivedAt).toLocaleString('id-ID');

    // Prefer text body, fallback to HTML
    if (email.bodyText) {
        elements.modalBody.textContent = email.bodyText;
    } else if (email.bodyHtml) {
        // Sanitize HTML (basic)
        const temp = document.createElement('div');
        temp.innerHTML = email.bodyHtml;
        elements.modalBody.textContent = temp.textContent || temp.innerText;
    } else {
        elements.modalBody.textContent = '(No content)';
    }

    elements.modal.classList.add('active');
}

function hideEmailModal() {
    elements.modal.classList.remove('active');
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        showToast('Email copied!', 'success');
    }).catch(() => {
        // Fallback
        const input = document.createElement('input');
        input.value = text;
        document.body.appendChild(input);
        input.select();
        document.execCommand('copy');
        document.body.removeChild(input);
        showToast('Email copied!', 'success');
    });
}

// Polling
function startPolling() {
    if (pollInterval) clearInterval(pollInterval);
    pollInterval = setInterval(fetchInbox, 5000);
}

function stopPolling() {
    if (pollInterval) {
        clearInterval(pollInterval);
        pollInterval = null;
    }
}

// Event Listeners
elements.btnCopy.addEventListener('click', () => {
    if (currentEmail) {
        copyToClipboard(currentEmail);
    }
});

elements.btnRefresh.addEventListener('click', () => {
    fetchInbox();
    showToast('Refreshed!', 'success');
});

elements.btnNew.addEventListener('click', generateEmail);

elements.btnDelete.addEventListener('click', () => {
    if (confirm('Delete this inbox and all emails?')) {
        deleteInbox();
    }
});

elements.customForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const localPart = elements.customLocal.value.trim();
    const domainId = elements.customDomain.value;

    if (localPart && domainId) {
        useCustomEmail(localPart, parseInt(domainId));
        elements.customLocal.value = '';
    }
});

elements.emailList.addEventListener('click', (e) => {
    const item = e.target.closest('.email-item');
    if (item) {
        const emailId = item.dataset.id;
        fetchEmailDetail(emailId);
    }
});

elements.modalClose.addEventListener('click', hideEmailModal);

elements.modal.addEventListener('click', (e) => {
    if (e.target === elements.modal) {
        hideEmailModal();
    }
});

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        hideEmailModal();
    }
});

// Initialize
async function init() {
    await fetchDomains();

    // Check for saved email
    const savedEmail = localStorage.getItem('hubify_email');
    if (savedEmail) {
        // Validate saved email domain still exists
        const [, domain] = savedEmail.split('@');
        const domainExists = currentDomains.some((d) => d.domain === domain);

        if (domainExists) {
            setCurrentEmail(savedEmail, null);
            return;
        }
    }

    // Generate new email
    generateEmail();
}

init();
