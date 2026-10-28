import { 
    getNotes, 
    getUsers, 
    getCurrentUser, 
    getSavedNotes, 
    deleteNote, 
    reportNote, 
    dismissReport, 
    getDeletedDefaultNoteIds,
    deleteUserAccount,
    toggleUserBlock,
    toggleUserRole,
    DEFAULT_SYSTEM_USERS
} from './storage.js';
import { 
    getFirebaseNotes, 
    getFirebaseUsers, 
    deleteFirebaseNote, 
    reportFirebaseNote, 
    dismissFirebaseReport, 
    isFirebaseConfigured 
} from './firebase.js';

const defaultNotes = [
    {
        id: 'software-engineering-lectures',
        title: "Software Engineering Lectures",
        module: "SE3106",
        gradeLevel: "Y3S1",
        subject: "Computer Science",
        uploadedBy: "sarah.jenkins@gmail.com",
        uploadedByName: "Sarah Jenkins",
        rating: 4.8,
        reviews: 24,
        downloads: 156,
        status: "approved",
        type: "pdf"
    },
    {
        id: 'data-structures-complete-summary',
        title: "Data Structures Complete Summary",
        module: "CS2001",
        gradeLevel: "Y2S1",
        subject: "Computer Science",
        uploadedBy: "mike.ross@gmail.com",
        uploadedByName: "Mike Ross",
        rating: 4.9,
        reviews: 42,
        downloads: 312,
        status: "approved",
        type: "word"
    },
    {
        id: 'database-management-systems',
        title: "Database Management Systems",
        module: "DB2104",
        gradeLevel: "Y2S2",
        subject: "Computer Science",
        uploadedBy: "emma.watson@gmail.com",
        uploadedByName: "Emma Watson",
        rating: 4.5,
        reviews: 18,
        downloads: 89,
        status: "approved",
        type: "powerpoint"
    },
    {
        id: 'computer-networks-past-papers',
        title: "Computer Networks Past Papers",
        module: "NW3002",
        gradeLevel: "Y3S2",
        subject: "Computer Science",
        uploadedBy: "john.doe@gmail.com",
        uploadedByName: "John Doe",
        rating: 4.7,
        reviews: 12,
        downloads: 45,
        status: "approved",
        type: "pdf"
    }
];

export async function getAllSystemUsers() {
    let localUsers = [];
    try {
        localUsers = getUsers() || [];
    } catch (e) {
        localUsers = [];
    }

    let fbUsers = [];
    if (isFirebaseConfigured) {
        try {
            fbUsers = (await getFirebaseUsers()) || [];
        } catch (e) {
            console.warn('Could not fetch Firebase users:', e);
            fbUsers = [];
        }
    }

    const map = new Map();

    // 1. Load default system users
    if (Array.isArray(DEFAULT_SYSTEM_USERS)) {
        DEFAULT_SYSTEM_USERS.forEach(u => {
            if (u && u.email) {
                map.set(u.email.toLowerCase(), {
                    name: u.name,
                    email: u.email,
                    role: u.role || 'student',
                    gradeLevel: u.gradeLevel || 'General Student',
                    semester: u.semester || 'Semester 1',
                    createdAt: u.createdAt || '2026-09-01T00:00:00.000Z',
                    status: u.status || 'active',
                    blocked: u.blocked === true || u.status === 'blocked',
                    source: 'system'
                });
            }
        });
    }

    // 2. Merge Firebase users
    if (Array.isArray(fbUsers)) {
        fbUsers.forEach(u => {
            if (u && u.email) {
                const emailLower = u.email.toLowerCase();
                const existing = map.get(emailLower) || {};
                map.set(emailLower, {
                    ...existing,
                    ...u,
                    email: u.email,
                    name: u.name || existing.name || emailLower.split('@')[0],
                    role: u.role || existing.role || (emailLower === 'admin@gmail.com' ? 'admin' : 'student'),
                    status: u.status || existing.status || 'active',
                    blocked: u.blocked === true || existing.blocked === true,
                    source: 'firebase'
                });
            }
        });
    }

    // 3. Merge LocalStorage registered users
    if (Array.isArray(localUsers)) {
        localUsers.forEach(u => {
            if (u && u.email) {
                const emailLower = u.email.toLowerCase();
                const existing = map.get(emailLower) || {};
                map.set(emailLower, {
                    ...existing,
                    ...u,
                    email: u.email,
                    name: u.name || existing.name || emailLower.split('@')[0],
                    role: u.role || existing.role || (emailLower === 'admin@gmail.com' ? 'admin' : 'student'),
                    status: u.status || existing.status || 'active',
                    blocked: u.blocked === true || existing.blocked === true,
                    source: 'local'
                });
            }
        });
    }

    // 4. Merge Current logged in user
    try {
        const current = getCurrentUser();
        if (current && current.email) {
            const emailLower = current.email.toLowerCase();
            const existing = map.get(emailLower) || {};
            map.set(emailLower, {
                ...existing,
                ...current,
                email: current.email,
                name: current.name || existing.name || 'User',
                role: current.role || existing.role || (emailLower === 'admin@gmail.com' ? 'admin' : 'student'),
                status: current.status || existing.status || 'active',
                blocked: current.blocked === true || existing.blocked === true
            });
        }
    } catch (e) {
        // ignore
    }

    return Array.from(map.values());
}

export async function setupDashboard() {
    const isAdminDashboard = document.querySelector('[data-dashboard-role="admin"]');
    const isStudentDashboard = document.querySelector('[data-dashboard-role="student"]');

    if (!isAdminDashboard && !isStudentDashboard) return;

    const currentUser = getCurrentUser();

    // ==========================================
    // 1. ADMIN DASHBOARD LOGIC
    // ==========================================
    if (isAdminDashboard) {
        if (!currentUser || (currentUser.role !== 'admin' && currentUser.email?.toLowerCase() !== 'admin@gmail.com')) {
            window.location.href = 'dashboard.html';
            return;
        }

        let filterUsersRef = null;
        let filterNotesRef = null;

        // TAB SWITCHING SETUP
        const tabs = ['overview', 'notes', 'reports', 'users'];
        function activateTab(tabName) {
            if (!tabs.includes(tabName)) tabName = 'overview';

            tabs.forEach(t => {
                const panel = document.getElementById(`tab-${t}`);
                if (panel) {
                    panel.style.display = (t === tabName) ? 'block' : 'none';
                }

                const navLink = document.querySelector(`.sidebar-nav [data-tab="${t}"]`);
                if (navLink) {
                    navLink.classList.toggle('active', t === tabName);
                }
            });

            if (window.location.hash !== `#${tabName}`) {
                history.replaceState(null, '', `#${tabName}`);
            }

            if (tabName === 'users' && typeof filterUsersRef === 'function') {
                filterUsersRef();
            }
            if (tabName === 'notes' && typeof filterNotesRef === 'function') {
                filterNotesRef();
            }
        }

        // Attach tab listeners
        document.querySelectorAll('.sidebar-nav [data-tab]').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const tab = link.getAttribute('data-tab');
                activateTab(tab);
            });
        });

        // Jump tab buttons across the page
        document.querySelectorAll('[data-jump-tab]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const targetTab = btn.getAttribute('data-jump-tab');
                activateTab(targetTab);
            });
        });

        // Initial tab from hash
        const initialHash = (window.location.hash || '').replace('#', '');
        activateTab(tabs.includes(initialHash) ? initialHash : 'overview');

        // LOAD AND RENDER ADMIN DATA
        async function loadAndRenderAdminData() {
            let firebaseNotes = [];
            if (isFirebaseConfigured) {
                try {
                    firebaseNotes = (await getFirebaseNotes()) || [];
                } catch (e) {
                    firebaseNotes = [];
                }
            }
            const localNotes = getNotes() || [];
            const deletedDefaults = getDeletedDefaultNoteIds() || [];

            const noteMap = new Map();
            localNotes.forEach(n => noteMap.set(String(n.id || n.title), n));
            firebaseNotes.forEach(n => noteMap.set(String(n.id || n.title), { ...noteMap.get(String(n.id || n.title)), ...n }));
            const storedNotes = Array.from(noteMap.values());

            const allNotes = [
                ...defaultNotes.filter(n => !deletedDefaults.includes(String(n.id))),
                ...storedNotes
            ];

            let allUsers = [];
            try {
                allUsers = await getAllSystemUsers();
            } catch (e) {
                console.warn('Could not load system users:', e);
                allUsers = DEFAULT_SYSTEM_USERS || [];
            }

            const reportedNotes = allNotes.filter(n => n.reported === true || Number(n.reportCount) > 0 || n.status === 'reported');
            const pendingNotes = allNotes.filter(n => n.status === 'pending' || n.approvalStatus === 'pending');
            const blockedUsers = allUsers.filter(u => u.blocked === true || u.status === 'blocked');

            // 1. UPDATE STATS COUNTERS
            const metrics = {
                users: allUsers.length,
                notes: allNotes.length,
                pending: pendingNotes.length,
                reported: reportedNotes.length,
                blocked: blockedUsers.length
            };

            Object.entries(metrics).forEach(([metric, value]) => {
                const element = document.querySelector(`[data-admin-stat="${metric}"]`);
                if (element) element.textContent = value;
            });

            // Update badge on sidebar reported link
            const reportBadge = document.getElementById('adminReportCountBadge');
            if (reportBadge) {
                if (reportedNotes.length > 0) {
                    reportBadge.textContent = reportedNotes.length;
                    reportBadge.style.display = 'inline-block';
                } else {
                    reportBadge.style.display = 'none';
                }
            }

            // 2. OVERVIEW SNIPPETS
            const repSnippet = document.getElementById('overviewReportedSnippet');
            if (repSnippet) {
                if (reportedNotes.length === 0) {
                    repSnippet.innerHTML = '<p style="color: var(--text-secondary); font-size: 13px; padding: 15px 0;"><i class="fa-solid fa-check-circle" style="color: #059669;"></i> No pending reports.</p>';
                } else {
                    repSnippet.innerHTML = reportedNotes.slice(0, 3).map(n => `
                        <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid var(--border-light); font-size: 13px;">
                            <div>
                                <strong>${escapeHtml(n.title)}</strong>
                                <div style="color: #dc2626; font-size: 12px;"><i class="fa-solid fa-flag"></i> ${escapeHtml(n.reportReason || 'Flagged')}</div>
                            </div>
                            <button type="button" class="admin-btn-sm admin-btn-delete" data-admin-delete-id="${escapeHtml(String(n.id || n.title))}">Remove</button>
                        </div>
                    `).join('');
                }
            }

            const notesSnippet = document.getElementById('overviewNotesSnippet');
            if (notesSnippet) {
                notesSnippet.innerHTML = allNotes.slice(0, 3).map(n => `
                    <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid var(--border-light); font-size: 13px;">
                        <div>
                            <strong>${escapeHtml(n.title)}</strong>
                            <div style="color: var(--text-secondary); font-size: 12px;">By ${escapeHtml(n.uploadedByName || n.uploadedBy || 'Student')}</div>
                        </div>
                        <a href="view-note.html?id=${encodeURIComponent(String(n.id || n.title))}" class="admin-btn-sm admin-btn-view">View</a>
                    </div>
                `).join('');
            }

            // 3. RENDER REPORTED NOTES TAB
            const reportedContainer = document.getElementById('adminReportedNotesContainer');
            const removeAllReportedBtn = document.getElementById('adminRemoveAllReportedBtn');

            if (removeAllReportedBtn) {
                removeAllReportedBtn.style.display = reportedNotes.length >= 2 ? 'inline-flex' : 'none';
                removeAllReportedBtn.onclick = async () => {
                    if (confirm(`Admin Action: Are you sure you want to permanently delete ALL ${reportedNotes.length} reported notes?`)) {
                        for (const note of reportedNotes) {
                            const id = String(note.id || note.title);
                            deleteNote(id);
                            if (isFirebaseConfigured) await deleteFirebaseNote(id);
                        }
                        await loadAndRenderAdminData();
                    }
                };
            }

            if (reportedContainer) {
                if (reportedNotes.length === 0) {
                    reportedContainer.innerHTML = `
                        <div class="admin-table-container" style="padding: 40px 20px; text-align: center; color: var(--text-secondary);">
                            <i class="fa-solid fa-circle-check" style="font-size: 38px; color: #059669; margin-bottom: 12px; display: block;"></i>
                            <h3 style="font-size: 17px; margin-bottom: 6px; color: var(--text-dark);">Reported Notes Queue is Clean</h3>
                            <p style="font-size: 14px; max-width: 460px; margin: 0 auto;">No notes are currently flagged by users or admins. When notes are reported, they will appear here for review and removal.</p>
                        </div>
                    `;
                } else {
                    reportedContainer.innerHTML = `
                        <div class="admin-table-container">
                            <div class="admin-table-scroll">
                                <table class="admin-table">
                                    <thead>
                                        <tr>
                                            <th>Note Details</th>
                                            <th>Subject / Module</th>
                                            <th>Report Reason</th>
                                            <th>Reports</th>
                                            <th>Author</th>
                                            <th style="text-align: right;">Moderation Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${reportedNotes.map(note => {
                                            const noteId = String(note.id || note.title);
                                            return `
                                                <tr>
                                                    <td>
                                                        <strong>${escapeHtml(note.title || 'Untitled')}</strong>
                                                        <div style="font-size: 12px; color: var(--text-secondary);">${escapeHtml(note.fileName || '')}</div>
                                                    </td>
                                                    <td>${escapeHtml(note.module || note.subject || 'General')}</td>
                                                    <td>
                                                        <span style="color: #dc2626; font-weight: 600;">
                                                            <i class="fa-solid fa-triangle-exclamation"></i> ${escapeHtml(note.reportReason || 'Flagged for review')}
                                                        </span>
                                                    </td>
                                                    <td><span class="admin-badge-status reported">${note.reportCount || 1} report(s)</span></td>
                                                    <td>${escapeHtml(note.uploadedByName || note.uploadedBy || 'Student')}</td>
                                                    <td style="text-align: right;">
                                                        <div class="admin-action-btn-group" style="justify-content: flex-end;">
                                                            <a href="view-note.html?id=${encodeURIComponent(noteId)}" class="admin-btn-sm admin-btn-view" title="Inspect note"><i class="fa-solid fa-eye"></i> View</a>
                                                            <button type="button" class="admin-btn-sm admin-btn-dismiss" data-dismiss-id="${noteId}" title="Dismiss report flag"><i class="fa-solid fa-check"></i> Dismiss</button>
                                                            <button type="button" class="admin-btn-sm admin-btn-delete" data-admin-delete-id="${noteId}" title="Remove note permanently"><i class="fa-solid fa-trash"></i> Remove Note</button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            `;
                                        }).join('')}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    `;

                    // Attach dismiss listeners
                    reportedContainer.querySelectorAll('[data-dismiss-id]').forEach(btn => {
                        btn.addEventListener('click', async () => {
                            const idToDismiss = btn.getAttribute('data-dismiss-id');
                            dismissReport(idToDismiss);
                            if (isFirebaseConfigured) await dismissFirebaseReport(idToDismiss);
                            await loadAndRenderAdminData();
                        });
                    });
                }
            }

            // 4. RENDER MANAGE ALL NOTES TAB
            function renderAllNotesTable(notesList) {
                const allNotesContainer = document.getElementById('adminAllNotesContainer');
                if (!allNotesContainer) return;

                if (notesList.length === 0) {
                    allNotesContainer.innerHTML = `
                        <div class="admin-table-container" style="padding: 35px; text-align: center; color: var(--text-secondary);">
                            <p style="font-size: 15px;"><i class="fa-solid fa-magnifying-glass"></i> No notes found matching your filters.</p>
                        </div>
                    `;
                    return;
                }

                allNotesContainer.innerHTML = `
                    <div class="admin-table-container">
                        <div class="admin-table-scroll">
                            <table class="admin-table">
                                <thead>
                                    <tr>
                                        <th>Title & Module</th>
                                        <th>Author</th>
                                        <th>Downloads & Rating</th>
                                        <th>Status</th>
                                        <th style="text-align: right;">Admin Controls</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${notesList.map(note => {
                                        const noteId = String(note.id || note.title);
                                        const isReported = note.reported || Number(note.reportCount) > 0;
                                        const statusClass = isReported ? 'reported' : (note.status === 'pending' ? 'pending' : 'approved');
                                        const statusLabel = isReported ? 'Reported' : (note.status === 'pending' ? 'Pending' : 'Approved');
                                        const isAuthorAdmin = (note.uploadedBy && note.uploadedBy.toLowerCase() === 'admin@gmail.com') || note.uploadedByName === 'NotesHub Admin';

                                        return `
                                            <tr>
                                                <td>
                                                    <strong><a href="view-note.html?id=${encodeURIComponent(noteId)}" style="color: inherit; text-decoration: none;">${escapeHtml(note.title || 'Untitled')}</a></strong>
                                                    <div style="font-size: 12px; color: var(--text-secondary); margin-top: 2px;">
                                                        ${escapeHtml(note.module || '')} • ${escapeHtml(note.gradeLevel || 'General')}
                                                    </div>
                                                </td>
                                                <td>
                                                    ${escapeHtml(note.uploadedByName || note.uploadedBy || 'Student')}
                                                    ${isAuthorAdmin ? '<span style="font-size: 10px; background: #4f46e5; color: white; padding: 2px 6px; border-radius: 4px; font-weight: 700; margin-left: 4px;">ADMIN</span>' : ''}
                                                </td>
                                                <td>
                                                    <span style="font-size: 13px; color: var(--text-secondary);">
                                                        <i class="fa-solid fa-download"></i> ${note.downloads || 0} &nbsp;•&nbsp;
                                                        <i class="fa-solid fa-star" style="color: #f59e0b;"></i> ${note.rating || '5.0'}
                                                    </span>
                                                </td>
                                                <td><span class="admin-badge-status ${statusClass}">${statusLabel}</span></td>
                                                <td style="text-align: right;">
                                                    <div class="admin-action-btn-group" style="justify-content: flex-end;">
                                                        <a href="view-note.html?id=${encodeURIComponent(noteId)}" class="admin-btn-sm admin-btn-view" title="View note"><i class="fa-solid fa-eye"></i> View</a>
                                                        <button type="button" class="admin-btn-sm admin-btn-flag ${isReported ? 'active-flag' : ''}" data-admin-report-id="${noteId}" title="${isReported ? 'Unflag note' : 'Report / Flag note'}">
                                                            <i class="fa-solid fa-flag"></i> ${isReported ? 'Unflag' : 'Report'}
                                                        </button>
                                                        <button type="button" class="admin-btn-sm admin-btn-delete" data-admin-delete-id="${noteId}" title="Delete note permanently"><i class="fa-solid fa-trash"></i> Delete</button>
                                                    </div>
                                                </td>
                                            </tr>
                                        `;
                                    }).join('')}
                                </tbody>
                            </table>
                        </div>
                    </div>
                `;

                // Attach Report/Flag Listeners
                allNotesContainer.querySelectorAll('[data-admin-report-id]').forEach(btn => {
                    btn.addEventListener('click', async () => {
                        const id = btn.getAttribute('data-admin-report-id');
                        const targetNote = allNotes.find(n => String(n.id || n.title) === id);
                        if (targetNote && targetNote.reported) {
                            if (confirm(`Dismiss flag on "${targetNote.title}"?`)) {
                                dismissReport(id);
                                if (isFirebaseConfigured) await dismissFirebaseReport(id);
                                await loadAndRenderAdminData();
                            }
                        } else {
                            const reason = window.prompt(`Enter reason for reporting "${targetNote?.title || 'note'}":`, 'Inappropriate or infringing content');
                            if (reason) {
                                reportNote(id, reason);
                                if (isFirebaseConfigured) await reportFirebaseNote(id, reason);
                                await loadAndRenderAdminData();
                            }
                        }
                    });
                });
            }

            // Filter logic for notes
            function filterNotes() {
                const searchQ = (document.getElementById('adminNoteSearch')?.value || '').toLowerCase().trim();
                const statusQ = document.getElementById('adminStatusFilter')?.value || 'all';

                const filtered = allNotes.filter(n => {
                    const matchesSearch = (n.title || '').toLowerCase().includes(searchQ) ||
                        (n.module || '').toLowerCase().includes(searchQ) ||
                        (n.uploadedByName || n.uploadedBy || '').toLowerCase().includes(searchQ) ||
                        (n.subject || '').toLowerCase().includes(searchQ);

                    let matchesStatus = true;
                    if (statusQ === 'approved') matchesStatus = !n.reported && n.status !== 'pending';
                    else if (statusQ === 'reported') matchesStatus = n.reported || Number(n.reportCount) > 0;
                    else if (statusQ === 'pending') matchesStatus = n.status === 'pending';

                    return matchesSearch && matchesStatus;
                });

                renderAllNotesTable(filtered);
            }

            const searchInput = document.getElementById('adminNoteSearch');
            if (searchInput) searchInput.oninput = filterNotes;

            const statusSelect = document.getElementById('adminStatusFilter');
            if (statusSelect) statusSelect.onchange = filterNotes;

            filterNotesRef = filterNotes;
            filterNotes();

            // 5. RENDER USERS TAB
            function renderUsersTable(usersList) {
                const usersContainer = document.getElementById('adminUsersContainer');
                if (!usersContainer) return;

                if (usersList.length === 0) {
                    usersContainer.innerHTML = `
                        <div class="admin-table-container" style="padding: 35px; text-align: center; color: var(--text-secondary);">
                            <p style="font-size: 15px;"><i class="fa-solid fa-users-slash"></i> No users found matching your search.</p>
                        </div>
                    `;
                    return;
                }

                usersContainer.innerHTML = `
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; font-size: 13px; color: var(--text-secondary);">
                        <span>Showing <strong>${usersList.length}</strong> registered user(s) in system</span>
                        <span style="font-size: 12px;"><i class="fa-solid fa-users"></i> Platform User Directory</span>
                    </div>
                    <div class="admin-table-container" style="margin-top: 0;">
                        <div class="admin-table-scroll">
                            <table class="admin-table">
                                <thead>
                                    <tr>
                                        <th>User Profile</th>
                                        <th>Email Address</th>
                                        <th>Role</th>
                                        <th>Notes Uploaded</th>
                                        <th>Account Status</th>
                                        <th style="text-align: right;">User Controls</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${usersList.map(u => {
                                        const email = u.email || '';
                                        const isMainAdmin = email.toLowerCase() === 'admin@gmail.com';
                                        const isBlocked = u.blocked === true || u.status === 'blocked';
                                        const userNotesCount = allNotes.filter(n =>
                                            (n.uploadedBy && typeof n.uploadedBy === 'string' && n.uploadedBy.toLowerCase() === email.toLowerCase()) ||
                                            (n.uploadedByName && typeof n.uploadedByName === 'string' && n.uploadedByName.toLowerCase() === (u.name || '').toLowerCase())
                                        ).length;
                                        const role = (u.role || 'student').toLowerCase();
                                        const isAdminRole = role === 'admin';

                                        return `
                                            <tr>
                                                <td>
                                                    <div style="display: flex; align-items: center; gap: 10px;">
                                                        <div class="avatar" style="width: 34px; height: 34px; font-size: 13px; border-radius: 50%; display: flex; align-items: center; justify-content: center; ${isAdminRole ? 'background: #eef2ff; color: #4f46e5; border: 1px solid #c7d2fe;' : 'background: #f1f5f9; color: #475569;'}">
                                                            <i class="fa-solid ${isAdminRole ? 'fa-shield-halved' : 'fa-user'}"></i>
                                                        </div>
                                                        <div>
                                                            <strong style="display: block; color: var(--text-dark);">${escapeHtml(u.name || 'User')}</strong>
                                                            <span style="font-size: 11px; color: var(--text-secondary);">${escapeHtml(u.gradeLevel || 'General Student')}</span>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td>
                                                    <div style="display: flex; align-items: center; gap: 6px; color: var(--text-secondary); font-size: 13px;">
                                                        <i class="fa-regular fa-envelope" style="font-size: 12px;"></i>
                                                        <span>${escapeHtml(email)}</span>
                                                    </div>
                                                </td>
                                                <td>
                                                    <span class="admin-badge-status ${isAdminRole ? 'approved' : 'pending'}">
                                                        <i class="fa-solid ${isAdminRole ? 'fa-shield' : 'fa-graduation-cap'}"></i>
                                                        ${isAdminRole ? 'Administrator' : 'Student'}
                                                    </span>
                                                </td>
                                                <td>
                                                    <span style="font-weight: 700; color: var(--text-dark);">${userNotesCount}</span>
                                                    <span style="color: var(--text-secondary); font-size: 12px;"> note(s)</span>
                                                </td>
                                                <td>
                                                    <span style="color: ${isBlocked ? '#dc2626' : '#059669'}; font-weight: 600; font-size: 13px; display: inline-flex; align-items: center; gap: 5px;">
                                                        <i class="fa-solid ${isBlocked ? 'fa-circle-xmark' : 'fa-circle-check'}"></i> ${isBlocked ? 'Blocked' : 'Active'}
                                                    </span>
                                                </td>
                                                <td style="text-align: right;">
                                                    <div class="admin-action-btn-group" style="justify-content: flex-end;">
                                                        ${!isMainAdmin ? `
                                                            <button type="button" class="admin-btn-sm ${isBlocked ? 'admin-btn-view' : 'admin-btn-dismiss'}" data-toggle-block-email="${escapeHtml(email)}" title="${isBlocked ? 'Unblock user' : 'Block user'}">
                                                                <i class="fa-solid ${isBlocked ? 'fa-unlock' : 'fa-ban'}"></i> ${isBlocked ? 'Unblock' : 'Block'}
                                                            </button>
                                                            <button type="button" class="admin-btn-sm admin-btn-view" data-toggle-role-email="${escapeHtml(email)}" title="Toggle user role">
                                                                <i class="fa-solid fa-user-gear"></i> ${isAdminRole ? 'Make Student' : 'Make Admin'}
                                                            </button>
                                                            <button type="button" class="admin-btn-sm admin-btn-delete" data-delete-user-email="${escapeHtml(email)}" title="Delete user">
                                                                <i class="fa-solid fa-trash"></i> Delete
                                                            </button>
                                                        ` : '<span style="font-size: 12px; color: var(--text-secondary); font-style: italic; padding: 4px 8px; background: var(--bg-secondary); border-radius: 4px;">Primary Admin</span>'}
                                                    </div>
                                                </td>
                                            </tr>
                                        `;
                                    }).join('')}
                                </tbody>
                            </table>
                        </div>
                    </div>
                `;

                // Attach User Action Listeners
                usersContainer.querySelectorAll('[data-toggle-block-email]').forEach(btn => {
                    btn.addEventListener('click', async () => {
                        const email = btn.getAttribute('data-toggle-block-email');
                        toggleUserBlock(email);
                        await loadAndRenderAdminData();
                    });
                });

                usersContainer.querySelectorAll('[data-toggle-role-email]').forEach(btn => {
                    btn.addEventListener('click', async () => {
                        const email = btn.getAttribute('data-toggle-role-email');
                        toggleUserRole(email);
                        await loadAndRenderAdminData();
                    });
                });

                usersContainer.querySelectorAll('[data-delete-user-email]').forEach(btn => {
                    btn.addEventListener('click', async () => {
                        const email = btn.getAttribute('data-delete-user-email');
                        if (confirm(`Are you sure you want to delete the user account for "${email}"?`)) {
                            deleteUserAccount(email);
                            await loadAndRenderAdminData();
                        }
                    });
                });
            }

            function filterUsers() {
                const searchQ = (document.getElementById('adminUserSearch')?.value || '').toLowerCase().trim();
                const roleQ = document.getElementById('adminUserRoleFilter')?.value || 'all';

                const filtered = allUsers.filter(u => {
                    const matchesSearch = (u.name || '').toLowerCase().includes(searchQ) ||
                        (u.email || '').toLowerCase().includes(searchQ);
                    const matchesRole = (roleQ === 'all') || (u.role === roleQ);
                    return matchesSearch && matchesRole;
                });

                renderUsersTable(filtered);
            }

            const userSearch = document.getElementById('adminUserSearch');
            if (userSearch) userSearch.oninput = filterUsers;

            const userRoleFilter = document.getElementById('adminUserRoleFilter');
            if (userRoleFilter) userRoleFilter.onchange = filterUsers;

            filterUsersRef = filterUsers;
            filterUsers();

            // Attach global delete listeners (e.g. from any section)
            document.querySelectorAll('[data-admin-delete-id]').forEach(btn => {
                btn.onclick = async (e) => {
                    e.stopPropagation();
                    const idToDelete = btn.getAttribute('data-admin-delete-id');
                    if (confirm('Admin: Are you sure you want to permanently delete this note from NotesHub?')) {
                        deleteNote(idToDelete);
                        if (isFirebaseConfigured) await deleteFirebaseNote(idToDelete);
                        await loadAndRenderAdminData();
                    }
                };
            });
        }

        await loadAndRenderAdminData();
        window.addEventListener('storage', () => loadAndRenderAdminData());
        window.addEventListener('noteshub:sync', () => loadAndRenderAdminData());
        return;
    }

    // ==========================================
    // 2. STUDENT DASHBOARD LOGIC
    // ==========================================
    if (isStudentDashboard) {
        if (currentUser && (currentUser.role === 'admin' || currentUser.email?.toLowerCase() === 'admin@gmail.com')) {
            window.location.href = 'admin-dashboard.html';
            return;
        }

        const heading = document.getElementById('studentWelcomeHeading');
        if (heading && currentUser) {
            heading.textContent = `Welcome back, ${currentUser.name || 'Student'}! 👋`;
        }

        async function loadAndRenderStudentData() {
            try {
                const activeUser = getCurrentUser();
                if (!activeUser) return;

                if (heading) {
                    heading.textContent = `Welcome back, ${activeUser.name || 'Student'}! 👋`;
                }

                const allNotes = isFirebaseConfigured ? await getFirebaseNotes() : getNotes();
                const userNotes = activeUser
                    ? allNotes.filter(note =>
                        (note.uploadedBy && activeUser.email && note.uploadedBy.toLowerCase() === activeUser.email.toLowerCase()) ||
                        (activeUser.uid && note.userId === activeUser.uid)
                    )
                    : [];

                let savedCount = 0;
                try {
                    savedCount = getSavedNotes().length;
                } catch (err) {
                    savedCount = 0;
                }

                const totalDownloads = userNotes.reduce((acc, note) => acc + (parseInt(note.downloads) || 0), 0);
                const validRatings = userNotes.map(n => parseFloat(n.rating)).filter(r => !isNaN(r) && r > 0);
                const avgRating = validRatings.length > 0
                    ? (validRatings.reduce((sum, r) => sum + r, 0) / validRatings.length).toFixed(1)
                    : '5.0';

                const uploadsEl = document.getElementById('userTotalUploads');
                if (uploadsEl) uploadsEl.textContent = userNotes.length;

                const savedEl = document.getElementById('userSavedNotes');
                if (savedEl) savedEl.textContent = savedCount;

                const downloadsEl = document.getElementById('userTotalDownloads');
                if (downloadsEl) downloadsEl.textContent = totalDownloads;

                const ratingEl = document.getElementById('userAvgRating');
                if (ratingEl) ratingEl.textContent = avgRating;

                // Render Student Recent Uploads
                const grid = document.getElementById('userRecentNotesGrid');
                if (grid) {
                    if (userNotes.length === 0) {
                        grid.innerHTML = `
                            <div class="saved-notes-empty" style="grid-column: 1 / -1; padding: 30px; text-align: center; background: white; border-radius: 12px; border: 1px dashed var(--border-light);">
                                <i class="fa-solid fa-cloud-arrow-up" style="font-size: 32px; color: var(--primary-color); margin-bottom: 12px; display: block;"></i>
                                <h4 style="font-size: 16px; margin-bottom: 6px;">You haven't uploaded any notes yet</h4>
                                <p style="color: var(--text-secondary); font-size: 14px; margin-bottom: 16px;">Share your study material, lecture notes, or revision guides with fellow students.</p>
                                <a href="upload-note.html" class="primary-btn" style="display: inline-block; padding: 10px 18px; font-size: 14px; text-decoration: none; border-radius: 8px;">Upload Notes</a>
                            </div>
                        `;
                    } else {
                        const recent = userNotes.slice(0, 4);
                        grid.innerHTML = recent.map(note => `
                            <div class="note-card-small">
                                <div class="note-icon-small">
                                    <i class="fa-solid ${note.fileName && note.fileName.endsWith('.pdf') ? 'fa-file-pdf' : 'fa-file-lines'}"></i>
                                </div>
                                <div class="note-details">
                                    <h4><a href="view-note.html?id=${note.id}">${escapeHtml(note.title || 'Untitled Note')}</a></h4>
                                    <p>${escapeHtml(note.gradeLevel || 'General')} • ${escapeHtml(note.module || note.subject || 'Academic')}</p>
                                </div>
                                <div class="note-stats">
                                    <span><i class="fa-solid fa-download"></i> ${note.downloads || 0}</span>
                                    <span><i class="fa-solid fa-star"></i> ${note.rating || '5.0'}</span>
                                </div>
                                <div class="note-actions">
                                    <a href="view-note.html?id=${note.id}" title="View Note"><i class="fa-solid fa-eye"></i></a>
                                </div>
                            </div>
                        `).join('');
                    }
                }
            } catch (error) {
                console.error('Error setting up student dashboard:', error);
            }
        }

        await loadAndRenderStudentData();
        window.addEventListener('storage', () => loadAndRenderStudentData());
        window.addEventListener('noteshub:sync', () => loadAndRenderStudentData());
    }
}

function escapeHtml(string) {
    if (!string) return '';
    return String(string)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}
