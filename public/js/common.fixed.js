// public/js/common.fixed.js - centralized auth headers (replacement for common.js)

const API_BASE = '/api';

function getAuth() {
  return {
    token: localStorage.getItem('token'),
    user: JSON.parse(localStorage.getItem('user') || '{}')
  };
}

const ADMIN_ROLES = ['admin', 'ir_admin', 'super_admin'];

function authHeaders(contentType) {
  const token = localStorage.getItem('token');
  const headers = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (contentType) headers['Content-Type'] = contentType;
  return headers;
}

(function injectAuthIntoFetch() {
  const orig = window.fetch.bind(window);
  window.fetch = (input, init = {}) => {
    init = init || {};
    if (init.headers instanceof Headers) {
      if (!init.headers.has('Authorization')) {
        const t = localStorage.getItem('token');
        if (t) init.headers.set('Authorization', `Bearer ${t}`);
      }
    } else {
      init.headers = init.headers || {};
      if (!('Authorization' in init.headers)) {
        const t = localStorage.getItem('token');
        if (t) init.headers['Authorization'] = `Bearer ${t}`;
      }
    }
    return orig(input, init);
  };
})();

function checkAuth(requiredRole) {
  const { token, user } = getAuth();
  if (!token || !user.role) {
    window.location.href = 'login.html';
    return false;
  }
  if (requiredRole) {
    if (requiredRole === 'admin') {
      if (!ADMIN_ROLES.includes(user.role)) {
        const routes = { student: 'student-dashboard.html', teacher: 'teacher-dashboard.html', admin: 'admin-dashboard.html' };
        window.location.href = routes[user.role] || 'index.html';
        return false;
      }
    } else if (user.role !== requiredRole) {
      const routes = { student: 'student-dashboard.html', teacher: 'teacher-dashboard.html', admin: 'admin-dashboard.html' };
      window.location.href = routes[user.role] || 'index.html';
      return false;
    }
  }
  return true;
}

function showToast(message, type = 'info') {
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  t.textContent = message;
  document.body.appendChild(t);
  setTimeout(() => t.style.opacity = '0', 2700);
  setTimeout(() => t.remove(), 3000);
}

function escapeHtml(s) {
  if (s == null) return '';
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;');
}

function formatDate(d) {
  if (!d) return '-';
  return new Date(d).toLocaleDateString('en-US', { year:'numeric', month:'short', day:'numeric' });
}

function logout() {
  if (confirm('Log out?')) {
    localStorage.clear();
    window.location.href = 'login.html';
  }
}

function closeModal(id) { const m = document.getElementById(id); if (m) m.classList.remove('active'); }

async function deactivateAccount() {
  if (!confirm('Deactivate your account?')) return;
  try {
    const res = await fetch(`${API_BASE}/auth/deactivate-account`, { method: 'PUT', headers: authHeaders() });
    const data = await res.json(); if (!res.ok) return showToast(data.message || 'Failed', 'error');
    localStorage.clear(); alert(data.message); window.location.href = 'login.html';
  } catch { showToast('Connection error', 'error'); }
}

async function deleteAccount() {
  if (!confirm('Permanently delete your account?')) return;
  try {
    const res = await fetch(`${API_BASE}/auth/account`, { method: 'DELETE', headers: authHeaders() });
    const data = await res.json(); if (!res.ok) return showToast(data.message || 'Failed', 'error');
    localStorage.clear(); alert(data.message); window.location.href = 'index.html';
  } catch { showToast('Connection error', 'error'); }
}

function notificationPanel() { let panel = document.getElementById('notificationPanel'); if (!panel) { panel = document.createElement('div'); panel.id='notificationPanel'; panel.className='notification-panel'; document.body.appendChild(panel);} return panel; }

async function refreshNotificationBadge() { const btn = document.getElementById('notificationButton'); if (!btn || !localStorage.getItem('token')) return; try { const res = await fetch(`${API_BASE}/notifications`); if (!res.ok) return; const data = await res.json(); btn.innerHTML = `🔔 Alerts${data.unread ? ` <b class="notification-count">${data.unread}</b>` : ''}`; } catch {} }

async function toggleNotifications() { const panel = notificationPanel(); if (panel.classList.contains('open')) { panel.classList.remove('open'); return;} panel.classList.add('open'); panel.innerHTML = '<div class="notification-loading">Loading…</div>'; try { const res = await fetch(`${API_BASE}/notifications`); const data = await res.json(); if (!res.ok) throw new Error(); panel.innerHTML = `<div class="notification-header"><strong>Alerts</strong><button onclick="markAllNotificationsRead()">Mark all read</button></div>`; if (!data.notifications.length) panel.innerHTML += '<div class="notification-empty">No alerts.</div>'; data.notifications.forEach(item => { const row = document.createElement('div'); row.className = `notification-item ${item.read ? '' : 'unread'}`; row.innerHTML = `<span>${escapeHtml(item.message)}</span><small>${formatDate(item.createdAt)}</small>`; row.onclick = () => markNotificationRead(item._id, row); panel.appendChild(row); }); refreshNotificationBadge(); } catch { panel.innerHTML = '<div class="notification-empty">Unable to load alerts.</div>'; } }

async function markNotificationRead(id,row) { await fetch(`${API_BASE}/notifications/${id}/read`, { method:'PUT', headers: authHeaders() }); if (row) row.classList.remove('unread'); refreshNotificationBadge(); }
async function markAllNotificationsRead() { await fetch(`${API_BASE}/notifications/read-all`, { method:'PUT', headers: authHeaders() }); document.querySelectorAll('.notification-item.unread').forEach(r=>r.classList.remove('unread')); refreshNotificationBadge(); }

window.addEventListener('DOMContentLoaded', () => { refreshNotificationBadge(); setInterval(refreshNotificationBadge, 30000); });
