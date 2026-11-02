import {
    getNotes,
    saveNotes,
    updateNoteStatus,
    deleteNote,
    getUsers,
    saveUsers,
    deleteUser,
    toggleUserBlock,
    getCurrentUser,
    addNotification
} from './storage.js';
import { isFirebaseConfigured, getFirebaseNotes, getFirebaseUsers } from './firebase.js';

let activeTab = 'overview';
let activeNoteFilter = 'pending';
let noteSearchQuery = '';
let userSearchQuery = '';
let pendingRejectNoteId = null;

function escapeHtml(str) {
    return String(str || '').replace(/[&<>"']/g, c => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    })[c]);
}

function getNoteFormatIcon(note) {
    const ext = (note.fileName || '').toLowerCase();
    const type = (note.type || '').toLowerCase();
    if (type === 'word' || /\.(doc|docx)$/.test(ext)) return { icon: 'fa-file-word', color: '#0284c7', bg: '#e0f2fe' };
    if (type === 'powerpoint' || /\.(ppt|pptx)$/.test(ext)) return { icon: 'fa-file-powerpoint', color: '#ea580c', bg: '#ffedd5' };
    return { icon: 'fa-file-pdf', color: '#dc2626', bg: '#fee2e2' };
}

export async function setupDashboard() {
    const adminDashboard = document.querySelector('[data-dashboard-role="admin"]');
    if (!adminDashboard) return;

    const currentUser = getCurrentUser();
    if (!currentUser || currentUser.role !== 'admin') {
        window.location.href = 'settings.html';
        return;
    }

    // Update admin username in sidebar
    const sidebarName = document.querySelector('.sidebar-user h3');
    if (sidebarName && currentUser.name) {
        sidebarName.textContent = currentUser.name;
    }

    // Tab Navigation setup
    setupTabs();

    // Setup Modals and Toolbar Listeners
    setupModalsAndEvents();

    // Initial Data Refresh
    refreshDashboard();
}

function setupTabs() {
    const navLinks = document.querySelectorAll('.sidebar-nav a[data-admin-tab]');
    const moderateNotesBtn = document.getElementById('moderateNotesBtn');
    const bannerReviewPendingBtn = document.getElementById('bannerReviewPendingBtn');
    const bannerManageUsersBtn = document.getElementById('bannerManageUsersBtn');
    const viewAllPendingBtn = document.getElementById('viewAllPendingBtn');

    function switchTab(tabName) {
        activeTab = tabName;

        // Update sidebar nav active class
        navLinks.forEach(link => {
            const isMatch = link.getAttribute('data-admin-tab') === tabName;
            link.classList.toggle('active', isMatch);
        });

        // Hide all panes, show target pane
        const panes = {
            overview: document.getElementById('tabOverview'),
            notes: document.getElementById('tabNotes'),
            users: document.getElementById('tabUsers'),
            reports: document.getElementById('tabReports')
        };

        Object.entries(panes).forEach(([name, pane]) => {
            if (pane) {
                pane.style.display = name === tabName ? 'block' : 'none';
                pane.classList.toggle('active', name === tabName);
            }
        });

        // Scroll to top of content smoothly
        window.scrollTo({ top: 0, behavior: 'smooth' });

        // Update data
        refreshDashboard();
    }

    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const tabName = link.getAttribute('data-admin-tab');
            if (tabName) switchTab(tabName);
        });
    });

    if (moderateNotesBtn) {
        moderateNotesBtn.addEventListener('click', (e) => {
            e.preventDefault();
            activeNoteFilter = 'pending';
            switchTab('notes');
        });
    }

    if (bannerReviewPendingBtn) {
        bannerReviewPendingBtn.addEventListener('click', () => {
            activeNoteFilter = 'pending';
            switchTab('notes');
        });
    }

    if (bannerManageUsersBtn) {
        bannerManageUsersBtn.addEventListener('click', () => {
            switchTab('users');
        });
    }

    if (viewAllPendingBtn) {
        viewAllPendingBtn.addEventListener('click', () => {
            activeNoteFilter = 'all';
            switchTab('notes');
        });
    }

    // Stat card quick jumps
    document.querySelectorAll('.stat-clickable[data-jump-tab]').forEach(card => {
        card.addEventListener('click', () => {
            const jumpTab = card.getAttribute('data-jump-tab');
            const jumpFilter = card.getAttribute('data-jump-filter');
            if (jumpFilter && jumpTab === 'notes') {
                activeNoteFilter = jumpFilter;
            }
            if (jumpTab) switchTab(jumpTab);
        });
    });

    // Check URL Hash on load (e.g. #notes or #users)
    const hash = window.location.hash.replace(/^#/, '');
    if (['overview', 'notes', 'users', 'reports'].includes(hash)) {
        switchTab(hash);
    }
}

function setupModalsAndEvents() {
    // Note status filter buttons (Pending, All, Approved, Rejected)
    const filterPills = document.querySelectorAll('#noteStatusFilters .filter-pill');
    filterPills.forEach(pill => {
        pill.addEventListener('click', () => {
            filterPills.forEach(p => p.classList.remove('active'));
            pill.classList.add('active');
            activeNoteFilter = pill.getAttribute('data-filter') || 'all';
            renderNotesSection();
        });
    });

    // Note Search Input
    const noteSearchInput = document.getElementById('adminNotesSearchInput');
    if (noteSearchInput) {
        noteSearchInput.addEventListener('input', (e) => {
            noteSearchQuery = e.target.value.trim().toLowerCase();
            renderNotesSection();
        });
    }

    // User Search Input
    const userSearchInput = document.getElementById('adminUsersSearchInput');
    if (userSearchInput) {
        userSearchInput.addEventListener('input', (e) => {
            userSearchQuery = e.target.value.trim().toLowerCase();
            renderUsersSection();
        });
    }

    // Reject Modal controls
    const rejectModal = document.getElementById('adminRejectModal');
    const rejectCloseBtn = document.getElementById('rejectModalCloseBtn');
    const rejectCancelBtn = document.getElementById('rejectModalCancelBtn');
    const rejectConfirmBtn = document.getElementById('rejectModalConfirmBtn');
    const rejectPresetSelect = document.getElementById('rejectPresetSelect');
    const rejectCustomMsg = document.getElementById('rejectCustomMessage');

    const closeModal = () => {
        if (rejectModal) rejectModal.style.display = 'none';
        pendingRejectNoteId = null;
        if (rejectCustomMsg) rejectCustomMsg.value = '';
    };

    if (rejectCloseBtn) rejectCloseBtn.addEventListener('click', closeModal);
    if (rejectCancelBtn) rejectCancelBtn.addEventListener('click', closeModal);

    if (rejectConfirmBtn) {
        rejectConfirmBtn.addEventListener('click', () => {
            if (!pendingRejectNoteId) return;

            const preset = rejectPresetSelect?.value;
            const custom = rejectCustomMsg?.value.trim();
            const reason = custom || (preset !== 'custom' ? preset : 'Does not meet academic moderation standards.');

            executeRejectNote(pendingRejectNoteId, reason);
            closeModal();
        });
    }

    // Close modal on backdrop click
    if (rejectModal) {
        rejectModal.addEventListener('click', (e) => {
            if (e.target === rejectModal) closeModal();
        });
    }
}

function showStatusAlert(elementId, message, type = 'success') {
    const el = document.getElementById(elementId);
    if (!el) return;
    el.textContent = message;
    el.className = `admin-status-alert ${type}`;
    el.style.display = 'block';
    setTimeout(() => {
        el.style.display = 'none';
    }, 4500);
}

export function refreshDashboard() {
    const notes = getNotes();
    const users = getUsers();

    // 1. Calculate & Render Metrics
    const metrics = {
        users: users.length,
        notes: notes.length,
        pending: notes.filter(n => n.status === 'pending' || n.approvalStatus === 'pending').length,
        reported: notes.filter(n => n.reported === true || n.reportCount > 0).length,
        blocked: users.filter(u => u.blocked === true).length
    };

    Object.entries(metrics).forEach(([metric, val]) => {
        const el = document.querySelector(`[data-admin-stat="${metric}"]`);
        if (el) el.textContent = val;
    });

    // Sidebar & Banner badges
    const sidebarPending = document.getElementById('sidebarPendingCount');
    if (sidebarPending) {
        sidebarPending.textContent = metrics.pending;
        sidebarPending.style.display = metrics.pending > 0 ? 'inline-block' : 'none';
    }

    const bannerPending = document.getElementById('bannerPendingBadge');
    if (bannerPending) bannerPending.textContent = metrics.pending;

    // Filter pill counts
    const pillPending = document.getElementById('pillCountPending');
    if (pillPending) pillPending.textContent = metrics.pending;

    const pillAll = document.getElementById('pillCountAll');
    if (pillAll) pillAll.textContent = notes.length;

    const approvedCount = notes.filter(n => n.status === 'approved' || (!n.status && !n.isUserUploaded)).length;
    const pillApproved = document.getElementById('pillCountApproved');
    if (pillApproved) pillApproved.textContent = approvedCount;

    const rejectedCount = notes.filter(n => n.status === 'rejected').length;
    const pillRejected = document.getElementById('pillCountRejected');
    if (pillRejected) pillRejected.textContent = rejectedCount;

    // 2. Render Overview Quick List
    renderOverviewPendingList(notes);

    // 3. Render Notes Section
    renderNotesSection();

    // 4. Render Users Section
    renderUsersSection();

    // 5. Render Reports Section
    renderReportsSection();
}

function renderOverviewPendingList(notes) {
    const container = document.getElementById('overviewPendingList');
    if (!container) return;

    const pendingNotes = notes.filter(n => n.status === 'pending' || n.approvalStatus === 'pending');

    if (pendingNotes.length === 0) {
        container.innerHTML = `
            <div class="admin-empty-state">
                <i class="fa-solid fa-circle-check" style="color: #10b981; font-size: 36px; margin-bottom: 10px;"></i>
                <h4>No Pending Approvals!</h4>
                <p>All student submissions have been reviewed. High five!</p>
            </div>
        `;
        return;
    }

    container.innerHTML = pendingNotes.slice(0, 4).map(note => renderAdminNoteCard(note)).join('');
    attachNoteActionListeners(container);
}

function renderNotesSection() {
    const container = document.getElementById('adminNotesList');
    if (!container) return;

    let notes = getNotes();

    // Status filter
    if (activeNoteFilter === 'pending') {
        notes = notes.filter(n => n.status === 'pending' || n.approvalStatus === 'pending');
    } else if (activeNoteFilter === 'approved') {
        notes = notes.filter(n => n.status === 'approved' || (!n.status && !n.isUserUploaded));
    } else if (activeNoteFilter === 'rejected') {
        notes = notes.filter(n => n.status === 'rejected');
    }

    // Search query filter
    if (noteSearchQuery) {
        notes = notes.filter(n => {
            const haystack = [n.title, n.subject, n.module, n.uploadedByName, n.uploadedBy, n.uploadedByEmail]
                .filter(Boolean)
                .join(' ')
                .toLowerCase();
            return haystack.includes(noteSearchQuery);
        });
    }

    // Update active filter pill styling
    document.querySelectorAll('#noteStatusFilters .filter-pill').forEach(pill => {
        pill.classList.toggle('active', pill.getAttribute('data-filter') === activeNoteFilter);
    });

    if (notes.length === 0) {
        let msg = 'No notes match your filter or search.';
        if (activeNoteFilter === 'pending') msg = 'No notes currently pending review.';
        container.innerHTML = `
            <div class="admin-empty-state">
                <i class="fa-solid fa-folder-open" style="font-size: 36px; color: #94a3b8; margin-bottom: 10px;"></i>
                <h4>No Notes Found</h4>
                <p>${msg}</p>
            </div>
        `;
        return;
    }

    container.innerHTML = notes.map(note => renderAdminNoteCard(note)).join('');
    attachNoteActionListeners(container);
}

function renderAdminNoteCard(note) {
    const meta = getNoteFormatIcon(note);
    const title = escapeHtml(note.title || 'Untitled Note');
    const uploaderName = escapeHtml(note.uploadedByName || note.uploadedBy || 'Student');
    const uploaderEmail = escapeHtml(note.uploadedByEmail || '');
    const module = escapeHtml(note.module || note.subject || 'General');
    const subject = escapeHtml(note.subject || 'Academic');
    const size = escapeHtml(note.fileSize || 'N/A');
    const pages = note.pages ? note.pages : 1;
    const date = note.uploadedAt ? new Date(note.uploadedAt).toLocaleDateString() : 'Recently';

    const status = note.status || (note.approvalStatus || 'approved');
    let statusPill = `<span class="admin-status-pill approved"><i class="fa-solid fa-circle-check"></i> Approved</span>`;
    if (status === 'pending') {
        statusPill = `<span class="admin-status-pill pending"><i class="fa-solid fa-hourglass-half"></i> Pending Review</span>`;
    } else if (status === 'rejected') {
        statusPill = `<span class="admin-status-pill rejected"><i class="fa-solid fa-circle-xmark"></i> Rejected</span>`;
    }

    const rejectionFeedback = (status === 'rejected' && note.rejectionReason)
        ? `<div class="admin-rejection-callout"><i class="fa-solid fa-comment-dots"></i> <strong>Rejection Reason:</strong> ${escapeHtml(note.rejectionReason)}</div>`
        : '';

    return `
        <div class="admin-note-card ${status}" data-note-id="${note.id}">
            <div class="admin-note-top">
                <div class="admin-note-icon" style="background: ${meta.bg}; color: ${meta.color};">
                    <i class="fa-solid ${meta.icon}"></i>
                </div>
                <div class="admin-note-info">
                    <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                        <h4 class="admin-note-title">
                            <a href="view-note.html?id=${encodeURIComponent(note.id)}" target="_blank" title="Inspect note in new tab">${title}</a>
                        </h4>
                        ${statusPill}
                    </div>
                    <div class="admin-note-sub">
                        <span><i class="fa-solid fa-book"></i> ${module} (${subject})</span>
                        <span>•</span>
                        <span><i class="fa-solid fa-user"></i> ${uploaderName} ${uploaderEmail ? `(${uploaderEmail})` : ''}</span>
                        <span>•</span>
                        <span><i class="fa-solid fa-clock"></i> ${date}</span>
                        <span>•</span>
                        <span>${size} • ${pages} pgs</span>
                    </div>
                    ${rejectionFeedback}
                </div>
            </div>

            <div class="admin-note-actions">
                <a href="view-note.html?id=${encodeURIComponent(note.id)}" target="_blank" class="admin-btn view" title="Open note and review details">
                    <i class="fa-solid fa-eye"></i> View Note
                </a>

                ${status !== 'approved' ? `
                    <button type="button" class="admin-btn approve" data-approve-id="${note.id}" title="Approve note for public library">
                        <i class="fa-solid fa-check"></i> Approve
                    </button>
                ` : ''}

                ${status !== 'rejected' ? `
                    <button type="button" class="admin-btn reject" data-reject-id="${note.id}" title="Reject note with feedback">
                        <i class="fa-solid fa-xmark"></i> Reject
                    </button>
                ` : ''}

                <button type="button" class="admin-btn delete" data-delete-id="${note.id}" title="Remove note permanently">
                    <i class="fa-solid fa-trash"></i> Delete
                </button>
            </div>
        </div>
    `;
}

function attachNoteActionListeners(container) {
    // Approve button click
    container.querySelectorAll('[data-approve-id]').forEach(btn => {
        btn.onclick = () => {
            const noteId = btn.getAttribute('data-approve-id');
            executeApproveNote(noteId);
        };
    });

    // Reject button click -> open modal
    container.querySelectorAll('[data-reject-id]').forEach(btn => {
        btn.onclick = () => {
            const noteId = btn.getAttribute('data-reject-id');
            const notes = getNotes();
            const note = notes.find(n => String(n.id) === String(noteId));

            pendingRejectNoteId = noteId;
            const modal = document.getElementById('adminRejectModal');
            const titleEl = document.getElementById('rejectModalNoteTitle');
            if (titleEl) titleEl.textContent = note ? note.title : 'Untitled';
            if (modal) modal.style.display = 'flex';
        };
    });

    // Delete button click
    container.querySelectorAll('[data-delete-id]').forEach(btn => {
        btn.onclick = () => {
            const noteId = btn.getAttribute('data-delete-id');
            if (confirm('Are you sure you want to permanently delete this note? This action cannot be undone.')) {
                deleteNote(noteId);
                showStatusAlert('adminNotesStatusAlert', 'Note has been permanently removed.', 'success');
                refreshDashboard();
            }
        };
    });
}

function executeApproveNote(noteId) {
    const updated = updateNoteStatus(noteId, 'approved');
    if (!updated) return;

    // Send student notification
    addNotification({
        userEmail: updated.uploadedByEmail || updated.uploadedBy,
        userName: updated.uploadedByName || updated.uploadedBy,
        noteId: updated.id,
        noteTitle: updated.title,
        status: 'approved',
        adminMessage: 'Your study note has been verified and approved by moderation. It is now published and accessible to all students!'
    });

    showStatusAlert('adminNotesStatusAlert', `Note "${updated.title}" has been approved! The student has been notified.`, 'success');
    refreshDashboard();
}

function executeRejectNote(noteId, reason) {
    const updated = updateNoteStatus(noteId, 'rejected', reason);
    if (!updated) return;

    // Send student notification with admin feedback
    addNotification({
        userEmail: updated.uploadedByEmail || updated.uploadedBy,
        userName: updated.uploadedByName || updated.uploadedBy,
        noteId: updated.id,
        noteTitle: updated.title,
        status: 'rejected',
        adminMessage: reason
    });

    showStatusAlert('adminNotesStatusAlert', `Note "${updated.title}" has been rejected. Feedback was sent to the student.`, 'warning');
    refreshDashboard();
}

// ================= USER MANAGEMENT =================
function renderUsersSection() {
    const tableBody = document.getElementById('adminUsersTableBody');
    if (!tableBody) return;

    let users = getUsers();

    // Counts
    const totalEl = document.getElementById('usersTotalDisplay');
    const activeEl = document.getElementById('usersActiveDisplay');
    const blockedEl = document.getElementById('usersBlockedDisplay');

    if (totalEl) totalEl.textContent = users.length;
    if (activeEl) activeEl.textContent = users.filter(u => !u.blocked).length;
    if (blockedEl) blockedEl.textContent = users.filter(u => u.blocked).length;

    // Filter by query
    if (userSearchQuery) {
        users = users.filter(u => {
            const str = [u.name, u.email, u.role, u.gradeLevel].filter(Boolean).join(' ').toLowerCase();
            return str.includes(userSearchQuery);
        });
    }

    if (users.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="6" style="text-align: center; padding: 40px; color: #94a3b8;">
                    <i class="fa-solid fa-user-slash" style="font-size: 28px; margin-bottom: 8px;"></i>
                    <p style="margin: 0; font-size: 14px;">No users match your search query.</p>
                </td>
            </tr>
        `;
        return;
    }

    tableBody.innerHTML = users.map(user => {
        const isBlocked = user.blocked === true;
        const isAdmin = (user.role === 'admin' || user.email?.toLowerCase() === 'admin@gmail.com');
        const rolePill = isAdmin
            ? `<span class="admin-user-pill admin"><i class="fa-solid fa-shield"></i> Admin</span>`
            : `<span class="admin-user-pill student"><i class="fa-solid fa-graduation-cap"></i> Student</span>`;

        const statusPill = isBlocked
            ? `<span class="admin-user-pill blocked"><i class="fa-solid fa-ban"></i> Blocked</span>`
            : `<span class="admin-user-pill active"><i class="fa-solid fa-circle-check"></i> Active</span>`;

        return `
            <tr data-user-email="${escapeHtml(user.email)}">
                <td>
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <div class="admin-user-avatar ${isAdmin ? 'admin' : ''}">
                            <i class="fa-solid ${isAdmin ? 'fa-user-shield' : 'fa-user'}"></i>
                        </div>
                        <div>
                            <strong>${escapeHtml(user.name || 'Student')}</strong>
                        </div>
                    </div>
                </td>
                <td><code>${escapeHtml(user.email || 'N/A')}</code></td>
                <td>${escapeHtml(user.gradeLevel || 'Undergraduate')} • ${escapeHtml(user.semester || 'Semester 1')}</td>
                <td>${rolePill}</td>
                <td>${statusPill}</td>
                <td style="text-align: right;">
                    <div style="display: inline-flex; gap: 6px;">
                        ${!isAdmin ? `
                            <button type="button" class="admin-table-btn ${isBlocked ? 'unblock' : 'block'}" data-toggle-block="${escapeHtml(user.email)}" title="${isBlocked ? 'Unblock user' : 'Block user'}">
                                <i class="fa-solid ${isBlocked ? 'fa-unlock' : 'fa-ban'}"></i> ${isBlocked ? 'Unblock' : 'Block'}
                            </button>
                            <button type="button" class="admin-table-btn delete" data-delete-user="${escapeHtml(user.email)}" title="Delete user account">
                                <i class="fa-solid fa-trash"></i>
                            </button>
                        ` : `<span style="font-size: 12px; color: #94a3b8; font-style: italic; padding: 4px 8px;">Protected Admin</span>`}
                    </div>
                </td>
            </tr>
        `;
    }).join('');

    // Attach user listeners
    tableBody.querySelectorAll('[data-toggle-block]').forEach(btn => {
        btn.onclick = () => {
            const email = btn.getAttribute('data-toggle-block');
            const nowBlocked = toggleUserBlock(email);
            showStatusAlert('adminUsersStatusAlert', `User ${email} is now ${nowBlocked ? 'blocked' : 'unblocked'}.`, 'success');
            refreshDashboard();
        };
    });

    tableBody.querySelectorAll('[data-delete-user]').forEach(btn => {
        btn.onclick = () => {
            const email = btn.getAttribute('data-delete-user');
            if (confirm(`Are you sure you want to delete user account "${email}"? This will remove their profile.`)) {
                deleteUser(email);
                showStatusAlert('adminUsersStatusAlert', `User ${email} has been deleted.`, 'success');
                refreshDashboard();
            }
        };
    });
}

// ================= REPORTS SECTION =================
function renderReportsSection() {
    const container = document.getElementById('adminReportsList');
    if (!container) return;

    const notes = getNotes();
    const reportedNotes = notes.filter(n => n.reported === true || n.reportCount > 0);

    if (reportedNotes.length === 0) {
        container.innerHTML = `
            <div class="admin-empty-state">
                <i class="fa-solid fa-shield-heart" style="color: #10b981; font-size: 40px; margin-bottom: 12px;"></i>
                <h4>Clean Community Record!</h4>
                <p>No community reports or flags on file. All published documents are complying with platform guidelines.</p>
            </div>
        `;
        return;
    }

    container.innerHTML = reportedNotes.map(note => `
        <div class="admin-report-card">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 15px;">
                <div>
                    <span class="admin-report-badge"><i class="fa-solid fa-flag"></i> Flagged Content</span>
                    <h4 style="margin: 8px 0 4px;"><a href="view-note.html?id=${encodeURIComponent(note.id)}" target="_blank">${escapeHtml(note.title)}</a></h4>
                    <p style="margin: 0; font-size: 13px; color: #64748b;">Uploaded by: ${escapeHtml(note.uploadedByName || note.uploadedBy)} • Module: ${escapeHtml(note.module)}</p>
                    <p style="margin: 8px 0 0; font-size: 13px; background: #fff1f2; color: #b91c1c; padding: 6px 10px; border-radius: 6px;">Report Reason: Student reported content for review.</p>
                </div>
                <div style="display: flex; gap: 8px;">
                    <a href="view-note.html?id=${encodeURIComponent(note.id)}" target="_blank" class="admin-btn view"><i class="fa-solid fa-eye"></i> Inspect</a>
                    <button type="button" class="admin-btn delete" data-delete-id="${note.id}"><i class="fa-solid fa-trash"></i> Remove Note</button>
                </div>
            </div>
        </div>
    `).join('');

    container.querySelectorAll('[data-delete-id]').forEach(btn => {
        btn.onclick = () => {
            const noteId = btn.getAttribute('data-delete-id');
            if (confirm('Remove this reported note?')) {
                deleteNote(noteId);
                refreshDashboard();
            }
        };
    });
}
