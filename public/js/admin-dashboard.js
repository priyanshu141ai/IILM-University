// Admin dashboard script (extracted from admin-dashboard.html)
if (!checkAuth('admin')) {}
const { token, user } = getAuth();
document.getElementById('welcomeText').textContent = `👋 Hi, ${user.name}`;

function openAdminPostModal() {
  ['adminPostTitle', 'adminPostUniversity', 'adminPostDeadline', 'adminPostDescription', 'adminPostEligibility'].forEach(id => document.getElementById(id).value = '');
  document.getElementById('adminPostType').value = 'Event';
  document.getElementById('adminPostAlert').innerHTML = '';
  document.getElementById('adminPostModal').classList.add('active');
}

async function publishAdminPost() {
  const payload = {
    type: document.getElementById('adminPostType').value,
    title: document.getElementById('adminPostTitle').value.trim(),
    university: document.getElementById('adminPostUniversity').value.trim(),
    deadline: document.getElementById('adminPostDeadline').value,
    description: document.getElementById('adminPostDescription').value.trim(),
    eligibility: document.getElementById('adminPostEligibility').value.trim()
  };
  const alertBox = document.getElementById('adminPostAlert');
  if (!payload.title || !payload.university || !payload.deadline || !payload.description) {
    alertBox.innerHTML = '<div class="alert alert-error">Please complete all required fields.</div>'; return;
  }
  try {
    const res = await fetch(`${API_BASE}/posts`, { method: 'POST', headers: authHeaders('application/json'), body: JSON.stringify(payload) });
    const data = await res.json();
    if (!res.ok) { alertBox.innerHTML = `<div class="alert alert-error">${escapeHtml(data.message)}</div>`; return; }
    showToast('Information published successfully', 'success');
    closeModal('adminPostModal');
    loadStats();
    loadAllPosts();
  } catch (error) { alertBox.innerHTML = '<div class="alert alert-error">Failed to publish. Please try again.</div>'; }
}

function showSection(section, btn) {
  ['overview', 'users', 'posts', 'responses'].forEach(s => {
    document.getElementById(s + 'Section').style.display = s === section ? 'block' : 'none';
  });
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  if (btn) btn.classList.add('active');
  if (section === 'users') loadUsers();
  if (section === 'posts') loadAllPosts();
  if (section === 'responses') loadAllResponses();
}

async function loadStats() {
  try {
    const res = await fetch(`${API_BASE}/admin/stats`, { headers: authHeaders() });
    const data = await res.json();
    const s = data.stats;
    document.getElementById('statsGrid').innerHTML = `
      <div class="stat-card"><h3>Students</h3><div class="number">${s.totalStudents}</div></div>
      <div class="stat-card success"><h3>Teachers</h3><div class="number">${s.totalTeachers}</div></div>
      <div class="stat-card warning"><h3>Active Posts</h3><div class="number">${s.totalPosts}</div></div>
      <div class="stat-card danger"><h3>Total Responses</h3><div class="number">${s.totalResponses}</div></div>
    `;
    document.getElementById('recentPosts').innerHTML = s.recentPosts.length ? s.recentPosts.map(p => `
      <div class="post-card">
        <span class="post-badge badge-${p.type.toLowerCase().replace(' ', '')}">${escapeHtml(p.type)}</span>
        <h3>${escapeHtml(p.title)}</h3>
        <div class="meta">
          <div class="meta-item">🏛️ ${escapeHtml(p.university)}</div>
          <div class="meta-item">👤 ${escapeHtml(p.postedBy?.name || 'N/A')}</div>
          <div class="meta-item">👥 ${p.responseCount} responses</div>
        </div>
      </div>
    `).join('') : '<p style="color: var(--gray);">No posts yet</p>';
  } catch (err) { showToast('Failed to load stats', 'error'); }
}

async function loadUsers() {
  const role = document.getElementById('userRoleFilter').value;
  try {
    const res = await fetch(`${API_BASE}/admin/users${role ? '?role=' + role : ''}`, { headers: authHeaders() });
    const data = await res.json();
    const tbody = document.querySelector('#usersTable tbody');
    if (data.users.length === 0) {
      tbody.innerHTML = '<tr><td colspan="8" style="text-align:center; padding: 30px; color: var(--gray);">No users found</td></tr>';
      return;
    }
    tbody.innerHTML = data.users.map(u => `
      <tr>
        <td><strong>${escapeHtml(u.name)}</strong></td>
        <td>${escapeHtml(u.email)}</td>
        <td><span class="status-badge status-${ADMIN_ROLES.includes(u.role) ? 'selected' : u.role === 'teacher' ? 'shortlisted' : 'interested'}">${u.role}</span></td>
        <td>${escapeHtml(u.department) || '-'}</td>
        <td>${escapeHtml(u.studentId) || escapeHtml(u.employeeId) || '-'}</td>
        <td>${u.isActive ? '<span style="color: var(--success);">✅ Active</span>' : '<span style="color: var(--danger);">❌ Inactive</span>'}</td>
        <td>${formatDate(u.createdAt)}</td>
        <td>
          <button class="btn btn-sm btn-warning" onclick="toggleUser('${u._id}')">${u.isActive ? 'Deactivate' : 'Activate'}</button>
        </td>
      </tr>
    `).join('');
  } catch (err) { showToast('Failed to load users', 'error'); }
}

async function toggleUser(id) {
  if (!confirm('Toggle this user status?')) return;
  try {
    await fetch(`${API_BASE}/admin/users/${id}/toggle`, { method: 'PUT', headers: authHeaders() });
    showToast('User status updated', 'success');
    loadUsers();
  } catch (err) { showToast('Failed to update', 'error'); }
}

async function loadAllPosts() {
  const container = document.getElementById('allPosts');
  container.innerHTML = '<div class="loading"><div class="spinner"></div></div>';
  try {
    const res = await fetch(`${API_BASE}/admin/posts`, { headers: authHeaders() });
    const data = await res.json();
    if (data.posts.length === 0) {
      container.innerHTML = '<div class="empty-state"><div class="icon">📝</div><h3>No posts yet</h3></div>';
      return;
    }
    container.innerHTML = data.posts.map(p => `
      <div class="post-card">
        <span class="post-badge badge-${p.type.toLowerCase().replace(' ', '')}">${escapeHtml(p.type)}</span>
        <h3>${escapeHtml(p.title)}</h3>
        <div class="meta">
          <div class="meta-item">🏛️ ${escapeHtml(p.university)}, ${escapeHtml(p.country)}</div>
          <div class="meta-item">👤 ${escapeHtml(p.postedBy?.name || 'N/A')} (${escapeHtml(p.postedBy?.role) || 'unknown'})</div>
          <div class="meta-item">📅 Deadline: ${formatDate(p.deadline)}</div>
          <div class="meta-item">👥 ${p.responseCount} responses | 👁️ ${p.views || 0} views</div>
          <div class="meta-item">${p.isActive ? '✅ Active' : '❌ Inactive'}</div>
        </div>
      </div>
    `).join('');
  } catch (err) { container.innerHTML = '<div class="alert alert-error">Failed to load</div>'; }
}

async function loadAllResponses() {
  try {
    const res = await fetch(`${API_BASE}/admin/responses`, { headers: authHeaders() });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to load responses');
    const tbody = document.querySelector('#responsesTable tbody');
    if (data.responses.length === 0) {
      tbody.innerHTML = '<tr><td colspan="8" style="text-align:center; padding: 30px; color: var(--gray);">No responses yet</td></tr>';
      return;
    }
    tbody.innerHTML = data.responses.map(r => `
      <tr>
        <td><strong>${escapeHtml(r.student?.name || 'N/A')}</strong></td>
        <td>${escapeHtml(r.student?.email || 'N/A')}</td>
        <td>${escapeHtml(r.student?.department) || '-'}</td>
        <td>${escapeHtml(r.post?.title || 'N/A')}</td>
        <td>${escapeHtml(r.post?.type) || '-'}</td>
        <td>${escapeHtml(r.post?.university) || '-'}</td>
        <td><span class="status-badge status-${r.status.toLowerCase()}">${r.status}</span></td>
        <td>${formatDate(r.createdAt)}</td>
      </tr>
    `).join('');
  } catch (err) { showToast('Failed to load responses', 'error'); }
}

loadStats();
