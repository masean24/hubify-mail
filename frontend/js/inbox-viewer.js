/**
 * Inbox Viewer - Public page for checking email inbox
 * Users enter an email address and see all messages
 */

const API_BASE = '/api';

const elements = {
  emailInput: document.getElementById('email-input'),
  btnSearch: document.getElementById('btn-search'),
  btnRefresh: document.getElementById('btn-refresh'),
  inboxResult: document.getElementById('inbox-result'),
  resultEmail: document.getElementById('result-email'),
  resultLoading: document.getElementById('result-loading'),
  resultList: document.getElementById('result-list'),
  resultEmpty: document.getElementById('result-empty'),
  modal: document.getElementById('email-modal'),
  modalClose: document.getElementById('modal-close'),
  modalSubject: document.getElementById('modal-subject'),
  modalFrom: document.getElementById('modal-from'),
  modalTo: document.getElementById('modal-to'),
  modalDate: document.getElementById('modal-date'),
  modalBody: document.getElementById('modal-body'),
};

let currentEmail = null;
let pollInterval = null;

function showResult() {
  elements.inboxResult.classList.remove('hidden');
}

function setLoading(loading) {
  if (loading) {
    elements.resultLoading.classList.remove('hidden');
    elements.resultList.innerHTML = '';
    elements.resultList.style.display = 'none';
    elements.resultEmpty.classList.add('hidden');
  } else {
    elements.resultLoading.classList.add('hidden');
    elements.resultList.style.display = '';
  }
}

function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function formatTime(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const diff = now - date;
  if (diff < 60000) return 'Baru saja';
  if (diff < 3600000) return `${Math.floor(diff / 60000)} menit lalu`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)} jam lalu`;
  return date.toLocaleString('id-ID', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

async function fetchInbox(showLoadingState = true) {
  const email = currentEmail;
  if (!email) return;

  if (showLoadingState) {
    showResult();
    elements.resultEmail.textContent = email;
    setLoading(true);
  }

  try {
    const res = await fetch(`${API_BASE}/inbox/${encodeURIComponent(email)}`);
    const data = await res.json();

    if (!data.success) {
      elements.resultList.innerHTML = '';
      elements.resultEmpty.classList.remove('hidden');
      elements.resultEmpty.querySelector('p').textContent = data.error || 'Gagal memuat data.';
      return;
    }

    const emails = data.data?.emails || [];

    if (emails.length === 0) {
      elements.resultList.innerHTML = '';
      elements.resultEmpty.classList.remove('hidden');
      elements.resultEmpty.querySelector('p').textContent = 'Belum ada email masuk.';
      return;
    }

    elements.resultEmpty.classList.add('hidden');
    elements.resultList.innerHTML = emails
      .map(
        (item) => `
      <li class="inbox-item" data-id="${item.id}">
        <div class="inbox-item__header">
          <span class="inbox-item__from">${escapeHtml(item.from)}</span>
          <span class="inbox-item__time">${formatTime(item.receivedAt)}</span>
        </div>
        <div class="inbox-item__subject">${escapeHtml(item.subject)}</div>
        <div class="inbox-item__preview">${escapeHtml(item.preview || '')}</div>
      </li>
    `
      )
      .join('');
  } catch (err) {
    console.error(err);
    elements.resultList.innerHTML = '';
    elements.resultEmpty.classList.remove('hidden');
    elements.resultEmpty.querySelector('p').textContent = 'Gagal memuat. Periksa koneksi atau coba lagi.';
  } finally {
    setLoading(false);
  }
}

async function fetchEmailDetail(emailId) {
  try {
    const res = await fetch(`${API_BASE}/email/${emailId}`);
    const data = await res.json();

    if (data.success) {
      showEmailModal(data.data);
    }
  } catch (error) {
    console.error('Error fetching email:', error);
  }
}

function showEmailModal(email) {
  elements.modalSubject.textContent = email.subject;
  elements.modalFrom.textContent = email.from;
  elements.modalTo.textContent = email.to;
  elements.modalDate.textContent = new Date(email.receivedAt).toLocaleString('id-ID');

  elements.modalBody.innerHTML = '';

  if (email.bodyHtml) {
    const iframe = document.createElement('iframe');
    iframe.className = 'email-iframe';
    iframe.sandbox = 'allow-same-origin';
    iframe.style.width = '100%';
    iframe.style.border = 'none';
    iframe.style.minHeight = '300px';

    elements.modalBody.appendChild(iframe);

    const doc = iframe.contentDocument || iframe.contentWindow.document;
    doc.open();
    doc.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <base target="_blank">
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            padding: 10px;
            margin: 0;
            font-size: 14px;
            line-height: 1.5;
            color: #333;
            background: #fff;
          }
          img { max-width: 100%; height: auto; }
          a { color: #0066cc; }
        </style>
      </head>
      <body>${email.bodyHtml}</body>
      </html>
    `);
    doc.close();

    iframe.onload = () => {
      try {
        const height = iframe.contentDocument.body.scrollHeight;
        iframe.style.height = Math.min(height + 20, 500) + 'px';
      } catch (e) {
        iframe.style.height = '400px';
      }
    };
  } else if (email.bodyText) {
    const pre = document.createElement('pre');
    pre.style.whiteSpace = 'pre-wrap';
    pre.style.wordWrap = 'break-word';
    pre.style.fontFamily = 'inherit';
    pre.style.margin = '0';
    pre.textContent = email.bodyText;
    elements.modalBody.appendChild(pre);
  } else {
    elements.modalBody.textContent = '(No content)';
  }

  elements.modal.classList.add('active');
}

function hideEmailModal() {
  elements.modal.classList.remove('active');
}

function startPolling() {
  stopPolling();
  pollInterval = setInterval(() => fetchInbox(false), 5000);
}

function stopPolling() {
  if (pollInterval) {
    clearInterval(pollInterval);
    pollInterval = null;
  }
}

function searchInbox() {
  const email = elements.emailInput.value.trim();
  if (!email) {
    elements.emailInput.focus();
    return;
  }
  if (!email.includes('@')) {
    alert('Masukkan alamat email yang valid.');
    return;
  }

  currentEmail = email;
  elements.btnRefresh.classList.remove('hidden');
  fetchInbox(true);
  startPolling();
}

// Event Listeners
elements.btnSearch.addEventListener('click', searchInbox);
elements.emailInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') searchInbox();
});

elements.btnRefresh.addEventListener('click', () => {
  if (currentEmail) fetchInbox(true);
});

elements.resultList.addEventListener('click', (e) => {
  const item = e.target.closest('.inbox-item');
  if (item) {
    fetchEmailDetail(item.dataset.id);
  }
});

elements.modalClose.addEventListener('click', hideEmailModal);
elements.modal.addEventListener('click', (e) => {
  if (e.target === elements.modal) hideEmailModal();
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') hideEmailModal();
});

// Prefill from localStorage
const savedEmail = localStorage.getItem('hubify_email');
if (savedEmail) {
  elements.emailInput.value = savedEmail;
}
