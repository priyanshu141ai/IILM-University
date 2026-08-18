// Common utility functions used across all pages

function getAuth() {
  return {
    token: localStorage.getItem('token'),
    user: JSON.parse(localStorage.getItem('user') || '{}')
  };
}

// Admin-equivalent roles used by the frontend for navigation/UI decisions
const ADMIN_ROLES = ['admin', 'ir_admin', 'super_admin'];

// Build authorization headers for API requests
function authHeaders(contentType) {
  const token = localStorage.getItem('token');
  const headers = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (contentType) headers['Content-Type'] = contentType;
  return headers;
}

function checkAuth(requiredRole) {
  const { token, user } = getAuth();
  if (!token || !user.role) {
    window.location.href = 'login.html';
    return false;
  }

  if (requiredRole) {
    // If the page requires admin, accept any admin-equivalent role
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
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.style.opacity = '0', 2700);
  setTimeout(() => toast.remove(), 3000);
}

function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatDate(date) {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric'
  });
}

function logout() {
  if (confirm('Are you sure you want to logout?')) {
    localStorage.clear();
    window.location.href = 'login.html';
  }
}

function closeModal(id) {
  const modal = document.getElementById(id);
  if (modal) modal.classList.remove('active');
}

document.addEventListener('click', event => {
  if (event.target.classList.contains('modal-overlay')) {
    event.target.classList.remove('active');
  }
});

document.addEventListener('keydown', event => {
  if (event.key === 'Escape') document.querySelectorAll('.modal-overlay.active').forEach(modal => modal.classList.remove('active'));
});

async function deactivateAccount() {
  if (!confirm('Deactivate your account? You will be signed out and cannot log in until an administrator reactivates it.')) return;
  try {
    const res = await fetch(`${API_BASE}/auth/deactivate-account`, {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    });
    const data = await res.json();
    if (!res.ok) return showToast(data.message || 'Failed to deactivate account', 'error');
    localStorage.clear();
    alert(data.message);
    window.location.href = 'login.html';
  } catch (error) {
    showToast('Connection error. Please try again.', 'error');
  }
}

async function deleteAccount() {
  if (!confirm('Permanently delete your account and all your posts/responses? This cannot be undone.')) return;
  try {
    const res = await fetch(`${API_BASE}/auth/account`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    });
    const data = await res.json();
    if (!res.ok) return showToast(data.message || 'Failed to delete account', 'error');
    localStorage.clear();
    alert(data.message);
    window.location.href = 'index.html';
  } catch (error) {
    showToast('Connection error. Please try again.', 'error');
  }
}

function notificationPanel() {
  let panel = document.getElementById('notificationPanel');
  if (!panel) {
    panel = document.createElement('div');
    panel.id = 'notificationPanel';
    panel.className = 'notification-panel';
    document.body.appendChild(panel);
  }
  return panel;
}

async function refreshNotificationBadge() {
  const button = document.getElementById('notificationButton');
  const token = localStorage.getItem('token');
  if (!button || !token) return;
  try {
    const res = await fetch(`${API_BASE}/notifications`, { headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json();
    button.innerHTML = `🔔 Alerts${data.unread ? ` <b class="notification-count">${data.unread}</b>` : ''}`;
    const unseen = data.notifications.filter(item => !item.read && !sessionStorage.getItem(`flash-${item._id}`));
    if (unseen.length) showNotificationFlash(unseen);
  } catch (error) { /* The dashboard remains usable if alerts are unavailable. */ }
}

function showNotificationFlash(items) {
  let overlay = document.getElementById('notificationFlash');
  if (overlay) return;
  overlay = document.createElement('div');
  overlay.id = 'notificationFlash';
  overlay.className = 'notification-flash-overlay';
  overlay.innerHTML = `<section class="notification-flash" role="alertdialog" aria-label="New notifications">
    <div class="notification-flash-icon">🔔</div>
    <p class="notification-flash-kicker">IMPORTANT UPDATE</p>
    <h2>You have new information</h2>
    <div class="notification-flash-list"></div>
    <button class="btn btn-primary" onclick="closeNotificationFlash()">Got it</button>
  </section>`;
  document.body.appendChild(overlay);
  const list = overlay.querySelector('.notification-flash-list');
  items.slice(0, 5).forEach(item => {
    sessionStorage.setItem(`flash-${item._id}`, '1');
    const message = document.createElement('p');
    message.textContent = item.message;
    list.appendChild(message);
  });
}

async function closeNotificationFlash() {
  const overlay = document.getElementById('notificationFlash');
  if (overlay) overlay.remove();
  await markAllNotificationsRead();
}

async function toggleNotifications() {
  const panel = notificationPanel();
  if (panel.classList.contains('open')) { panel.classList.remove('open'); return; }
  panel.innerHTML = '<div class="notification-loading">Loading alerts…</div>';
  panel.classList.add('open');
  try {
    const res = await fetch(`${API_BASE}/notifications`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to load alerts');
    panel.innerHTML = `<div class="notification-header"><strong>Alerts</strong><button onclick="markAllNotificationsRead()">Mark all read</button></div>`;
    if (!data.notifications.length) panel.innerHTML += '<div class="notification-empty">No alerts yet.</div>';
    data.notifications.forEach(item => {
      const row = document.createElement('div');
      row.className = `notification-item ${item.read ? '' : 'unread'}`;
      row.innerHTML = `<span>${escapeHtml(item.message)}</span><small>${formatDate(item.createdAt)}</small>`;
      row.onclick = () => markNotificationRead(item._id, row);
      panel.appendChild(row);
    });
    refreshNotificationBadge();
  } catch (error) {
    panel.innerHTML = '<div class="notification-empty">Unable to load alerts.</div>';
  }
}

async function markNotificationRead(id, row) {
  await fetch(`${API_BASE}/notifications/${id}/read`, { method: 'PUT', headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
  row.classList.remove('unread');
  refreshNotificationBadge();
}

async function markAllNotificationsRead() {
  await fetch(`${API_BASE}/notifications/read-all`, { method: 'PUT', headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
  document.querySelectorAll('.notification-item.unread').forEach(row => row.classList.remove('unread'));
  refreshNotificationBadge();
}

window.addEventListener('DOMContentLoaded', () => {
  refreshNotificationBadge();
  setInterval(refreshNotificationBadge, 30000);
});

const API_BASE = '/api';
