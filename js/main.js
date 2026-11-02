import { loadNavbar, loadFooter, updateNavbarState } from './components.js';
import { handleRegisterSubmit, handleLoginSubmit, handleLogout, setupAuthRedirect, handleProtectedLink } from './auth.js';
import { handleUploadSubmit, setupFileUpload } from './upload.js';
import { setupBrowsePage } from './browse.js';
import { setupDashboard } from './dashboard.js';
import { getCurrentUser, setCurrentUser, getUsers, saveUsers, getNotes, saveNotes } from './storage.js';
import { setupNoteDetails, setupSavedNotes } from './saved-notes.js';

function updateUserInfo() {
    const currentUser = getCurrentUser();

    if (document.querySelector('[data-dashboard-role="admin"]')) return;

    updateNavbarState(currentUser);
    if (!currentUser) return;
    const userName = currentUser.name || 'Student';

    // Update sidebar user info on student dashboard / profile details
    const sidebarName = document.querySelector('.sidebar-user h3');
    if (sidebarName) {
        sidebarName.innerHTML = currentUser.role === 'admin'
            ? `${userName} <span style="display: inline-block; background: #4f46e5; color: white; font-size: 10px; font-weight: 700; padding: 1px 6px; border-radius: 999px; vertical-align: middle; margin-left: 4px;">Admin</span>`
            : userName;
    }

    // For admin users on settings/my-notes/saved-notes, ensure Admin Panel link is accessible
    if (currentUser.role === 'admin') {
        const sidebarNav = document.querySelector('.dashboard-sidebar .sidebar-nav');
        if (sidebarNav && !sidebarNav.querySelector('a[href="dashboard.html"]')) {
            const adminLink = document.createElement('a');
            adminLink.href = 'dashboard.html';
            adminLink.innerHTML = '<i class="fa-solid fa-chart-pie"></i> Admin Overview';
            adminLink.style.color = '#4f46e5';
            adminLink.style.fontWeight = '700';
            sidebarNav.insertBefore(adminLink, sidebarNav.firstChild);
        }
    }

    // Populate profile inputs on profile details page if present
    const fullNameInput = document.getElementById('full-name');
    if (fullNameInput && currentUser.name) fullNameInput.value = currentUser.name;

    const emailInput = document.getElementById('email');
    if (emailInput && currentUser.email) emailInput.value = currentUser.email;

    const gradeLevelInput = document.getElementById('grade-level');
    if (gradeLevelInput && currentUser.gradeLevel) gradeLevelInput.value = currentUser.gradeLevel;

    const semesterInput = document.getElementById('semester');
    if (semesterInput && currentUser.semester) semesterInput.value = currentUser.semester;
}

function setupProfileSettings() {
    // 1. Profile details form
    const profileForm = document.getElementById('profile-details-form');
    if (profileForm) {
        profileForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const messageEl = document.getElementById('profile-status-message');
            const nameInput = document.getElementById('full-name');
            const gradeInput = document.getElementById('grade-level');
            const semesterInput = document.getElementById('semester');

            const newName = nameInput ? nameInput.value.trim() : '';
            if (!newName) {
                if (messageEl) {
                    messageEl.textContent = 'Please enter your full name.';
                    messageEl.className = 'form-message error';
                    messageEl.style.display = 'block';
                }
                return;
            }

            let currentUser = getCurrentUser() || {};
            const updatedUser = {
                ...currentUser,
                name: newName,
                gradeLevel: gradeInput ? gradeInput.value : (currentUser.gradeLevel || '6-9'),
                semester: semesterInput ? semesterInput.value : (currentUser.semester || 's1')
            };

            // Save to localStorage
            setCurrentUser(updatedUser);

            // Update user in users list
            const users = getUsers();
            const userEmail = (currentUser.email || '').toLowerCase();
            const index = users.findIndex(u => (u.email || '').toLowerCase() === userEmail);
            if (index !== -1) {
                users[index] = {
                    ...users[index],
                    name: newName,
                    gradeLevel: updatedUser.gradeLevel,
                    semester: updatedUser.semester
                };
            } else if (userEmail) {
                users.push({
                    email: userEmail,
                    name: newName,
                    gradeLevel: updatedUser.gradeLevel,
                    semester: updatedUser.semester
                });
            }
            saveUsers(users);

            // Refresh UI immediately
            updateUserInfo();

            if (messageEl) {
                messageEl.textContent = 'Profile details updated successfully!';
                messageEl.className = 'form-message success';
                messageEl.style.display = 'block';
                messageEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                setTimeout(() => {
                    messageEl.style.display = 'none';
                }, 4000);
            }
        });
    }

    // 2. Password change form
    const passwordForm = document.getElementById('password-form');
    if (passwordForm) {
        passwordForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const currentPwInput = document.getElementById('current-password');
            const newPwInput = document.getElementById('new-password');
            const confirmPwInput = document.getElementById('confirm-password');
            const messageEl = document.getElementById('password-status-message');

            const currentPw = currentPwInput?.value || '';
            const newPw = newPwInput?.value || '';
            const confirmPw = confirmPwInput?.value || '';

            if (!currentPw || !newPw || !confirmPw) {
                if (messageEl) {
                    messageEl.textContent = 'Please fill in all password fields.';
                    messageEl.className = 'form-message error';
                    messageEl.style.display = 'block';
                }
                return;
            }

            if (newPw !== confirmPw) {
                if (messageEl) {
                    messageEl.textContent = 'New passwords do not match.';
                    messageEl.className = 'form-message error';
                    messageEl.style.display = 'block';
                }
                return;
            }

            if (newPw.length < 6) {
                if (messageEl) {
                    messageEl.textContent = 'New password must be at least 6 characters long.';
                    messageEl.className = 'form-message error';
                    messageEl.style.display = 'block';
                }
                return;
            }

            const currentUser = getCurrentUser();
            const users = getUsers();
            const userIndex = users.findIndex(u => (u.email || '').toLowerCase() === (currentUser?.email || '').toLowerCase());

            if (userIndex !== -1 && users[userIndex].password && users[userIndex].password !== currentPw) {
                if (messageEl) {
                    messageEl.textContent = 'Current password is incorrect.';
                    messageEl.className = 'form-message error';
                    messageEl.style.display = 'block';
                }
                return;
            }

            if (userIndex !== -1) {
                users[userIndex].password = newPw;
                saveUsers(users);
            }

            passwordForm.reset();
            if (messageEl) {
                messageEl.textContent = 'Password updated successfully!';
                messageEl.className = 'form-message success';
                messageEl.style.display = 'block';
                setTimeout(() => {
                    messageEl.style.display = 'none';
                }, 3500);
            }
        });
    }

    // 3. Notification preferences form
    const notificationForm = document.getElementById('notification-form');
    if (notificationForm) {
        notificationForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const messageEl = document.getElementById('notification-status-message');
            if (messageEl) {
                messageEl.textContent = 'Notification preferences saved!';
                messageEl.className = 'form-message success';
                messageEl.style.display = 'block';
                setTimeout(() => {
                    messageEl.style.display = 'none';
                }, 3500);
            }
        });
    }
}

// ================= MY NOTES PAGE HANDLER =================
function setupMyNotes() {
    const grid = document.getElementById('myNotesGrid');
    if (!grid) return;

    const currentUser = getCurrentUser() || {};
    const searchInput = document.getElementById('myNotesSearch');
    const sortSelect = document.getElementById('myNotesSort');
    const statusMsg = document.getElementById('myNotesStatus');

    function renderMyNotes() {
        const allStoredNotes = getNotes();
        const userEmail = (currentUser.email || '').toLowerCase();
        const userName = (currentUser.name || '').toLowerCase();

        // Match notes uploaded by current user or show all user-uploaded notes
        let myNotes = allStoredNotes.filter(n => {
            const noteEmail = (n.uploadedByEmail || n.uploadedBy || '').toLowerCase();
            const noteName = (n.uploadedByName || n.uploadedBy || '').toLowerCase();
            if (userEmail && noteEmail === userEmail) return true;
            if (userName && (noteName === userName || noteEmail === userName)) return true;
            return false;
        });

        // If no user-specific matches, also include any note without an email or marked student
        if (myNotes.length === 0 && allStoredNotes.length > 0) {
            myNotes = allStoredNotes;
        }

        const query = searchInput ? searchInput.value.trim().toLowerCase() : '';
        if (query) {
            myNotes = myNotes.filter(n =>
                (n.title || '').toLowerCase().includes(query) ||
                (n.module || '').toLowerCase().includes(query) ||
                (n.subject || '').toLowerCase().includes(query) ||
                (n.description || '').toLowerCase().includes(query)
            );
        }

        const sortBy = sortSelect ? sortSelect.value : 'recent';
        if (sortBy === 'downloads') {
            myNotes.sort((a, b) => (b.downloads || 0) - (a.downloads || 0));
        } else if (sortBy === 'rating') {
            myNotes.sort((a, b) => (b.rating || 0) - (a.rating || 0));
        } else {
            myNotes.sort((a, b) => new Date(b.uploadedAt || 0) - new Date(a.uploadedAt || 0));
        }

        if (myNotes.length === 0) {
            grid.innerHTML = `
                <div class="empty-notes-state" style="grid-column: 1 / -1; text-align: center; padding: 50px 20px; background: white; border-radius: 12px; border: 1px dashed var(--border-light, #e2e8f0);">
                    <div style="font-size: 44px; color: var(--primary-color, #4361ee); margin-bottom: 12px;">
                        <i class="fa-solid fa-cloud-arrow-up"></i>
                    </div>
                    <h3 style="font-size: 20px; margin-bottom: 8px;">No notes found</h3>
                    <p style="color: #64748b; margin-bottom: 20px;">${query ? 'No notes matched your search term.' : 'You have not uploaded any study materials yet.'}</p>
                    <a href="upload-note.html" class="upload-btn" style="display: inline-flex; width: auto; padding: 12px 24px; text-decoration: none;">
                        <i class="fa-solid fa-plus"></i> Upload Your First Note
                    </a>
                </div>
            `;
            return;
        }

        grid.innerHTML = myNotes.map(note => {
            const ext = (note.fileName || '').toLowerCase();
            let iconClass = 'fa-file-pdf';
            if (note.type === 'word' || /\.(doc|docx)$/.test(ext)) iconClass = 'fa-file-word';
            else if (note.type === 'powerpoint' || /\.(ppt|pptx)$/.test(ext)) iconClass = 'fa-file-powerpoint';

            const uploadedTime = note.uploadedAt ? new Date(note.uploadedAt).toLocaleDateString() : 'Recently';
            const status = note.status || (note.approvalStatus || 'approved');
            let statusBadge = '<span class="badge" style="display:inline-flex; align-items:center; gap:4px; margin-top:4px; background: #dcfce7; color: #15803d; font-weight: 600; padding: 2px 8px; border-radius: 6px; font-size: 11px;"><i class="fa-solid fa-check"></i> Approved</span>';
            if (status === 'pending') {
                statusBadge = '<span class="badge" style="display:inline-flex; align-items:center; gap:4px; margin-top:4px; background: #fef3c7; color: #b45309; font-weight: 600; padding: 2px 8px; border-radius: 6px; font-size: 11px;"><i class="fa-solid fa-hourglass-half"></i> Pending Approval</span>';
            } else if (status === 'rejected') {
                statusBadge = '<span class="badge" style="display:inline-flex; align-items:center; gap:4px; margin-top:4px; background: #fee2e2; color: #b91c1c; font-weight: 600; padding: 2px 8px; border-radius: 6px; font-size: 11px;"><i class="fa-solid fa-xmark"></i> Rejected</span>';
            }
            const rejectionNote = (status === 'rejected' && note.rejectionReason)
                ? ('<p style="font-size: 11px; color: #b91c1c; margin-top: 4px; background: #fff1f2; padding: 4px 8px; border-radius: 4px; border-left: 2px solid #ef4444;">Feedback: ' + note.rejectionReason + '</p>')
                : '';

            return `
                <div class="note-card-small" data-note-id="${note.id}">
                    <div class="note-icon-small">
                        <i class="fa-solid ${iconClass}"></i>
                    </div>
                    <div class="note-details">
                        <h4><a href="view-note.html?id=${encodeURIComponent(note.id)}" style="text-decoration:none; color:inherit;">${note.title}</a></h4>
                        <p>${note.gradeLevel || 'All Levels'} • ${note.module || note.subject || 'General'}${note.pages ? ' • ' + note.pages + ' pgs' : ''}${note.fileSize ? ' • ' + note.fileSize : ''}</p>
                        <div>${statusBadge}</div>
                        ${rejectionNote}
                        <p style="font-size: 12px; color: #666; margin-top: 5px;">Uploaded ${uploadedTime}</p>
                    </div>
                    <div class="note-stats">
                        <span><i class="fa-solid fa-download"></i> ${note.downloads || 0}</span>
                        <span><i class="fa-solid fa-star"></i> ${note.rating || 5.0}</span>
                    </div>
                    <div class="note-actions">
                        <a href="view-note.html?id=${encodeURIComponent(note.id)}" class="edit-btn" title="View note"><i class="fa-solid fa-eye"></i></a>
                        <button type="button" class="delete-btn" data-delete-id="${note.id}" title="Delete note"><i class="fa-solid fa-trash"></i></button>
                    </div>
                </div>
            `;
        }).join('');

        // Attach delete listeners
        grid.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const noteId = btn.getAttribute('data-delete-id');
                if (confirm('Are you sure you want to delete this note?')) {
                    const currentNotes = getNotes().filter(n => String(n.id) !== String(noteId));
                    saveNotes(currentNotes);
                    if (statusMsg) {
                        statusMsg.textContent = 'Note deleted successfully.';
                        statusMsg.className = 'form-message success';
                        statusMsg.style.display = 'block';
                        setTimeout(() => { statusMsg.style.display = 'none'; }, 3000);
                    }
                    renderMyNotes();
                }
            });
        });
    }

    if (searchInput) searchInput.addEventListener('input', renderMyNotes);
    if (sortSelect) sortSelect.addEventListener('change', renderMyNotes);

    renderMyNotes();
}

document.addEventListener('DOMContentLoaded', () => {
    // Inject dynamic components
    const isAdminDashboard = document.querySelector('[data-dashboard-role="admin"]');
    if (!isAdminDashboard) loadNavbar();
    loadFooter();

    // Attach form event listeners
    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
        registerForm.addEventListener('submit', handleRegisterSubmit);
    }

    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLoginSubmit);
    }

    const uploadForm = document.getElementById('uploadForm');
    if (uploadForm) {
        uploadForm.addEventListener('submit', handleUploadSubmit);
    }

    setupFileUpload();
    setupBrowsePage();
    setupDashboard();
    setupNoteDetails();
    setupSavedNotes();
    setupProfileSettings();
    setupMyNotes();

    // Wait slightly for components to be inserted into DOM, then attach component-related listeners
    setTimeout(() => {
        updateUserInfo();

        const logoutBtn = document.querySelector('.logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', handleLogout);
        }

        const protectedLinks = document.querySelectorAll('.protected-link, a[href="upload-note.html"], a[href="browse-notes.html"]');
        protectedLinks.forEach(link => {
            link.addEventListener('click', handleProtectedLink);
        });
    }, 50);

    setupAuthRedirect();
});
