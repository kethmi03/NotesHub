import { getNotes, getUsers, getCurrentUser, getSavedNotes } from './storage.js';
import { getFirebaseNotes, getFirebaseUsers, isFirebaseConfigured } from './firebase.js';

export async function setupDashboard() {
    const isAdminDashboard = document.querySelector('[data-dashboard-role="admin"]');
    const isStudentDashboard = document.querySelector('[data-dashboard-role="student"]');

    if (!isAdminDashboard && !isStudentDashboard) return;

    const currentUser = getCurrentUser();

    // Role-based route guard
    if (isAdminDashboard) {
        if (!currentUser || currentUser.role !== 'admin') {
            window.location.href = 'dashboard.html';
            return;
        }

        // Setup Admin Metrics
        const allNotes = isFirebaseConfigured ? await getFirebaseNotes() : getNotes();
        const users = isFirebaseConfigured ? await getFirebaseUsers() : getUsers();
        const metrics = {
            users: users.length,
            notes: allNotes.length,
            pending: allNotes.filter(note => note.status === 'pending' || note.approvalStatus === 'pending').length,
            reported: allNotes.filter(note => note.reported === true || note.reportCount > 0 || note.status === 'reported').length,
            blocked: users.filter(user => user.blocked === true || user.status === 'blocked').length
        };

        Object.entries(metrics).forEach(([metric, value]) => {
            const element = document.querySelector(`[data-admin-stat="${metric}"]`);
            if (element) element.textContent = value;
        });
        return;
    }

    if (isStudentDashboard) {
        if (currentUser && currentUser.role === 'admin') {
            window.location.href = 'admin-dashboard.html';
            return;
        }

        const heading = document.getElementById('studentWelcomeHeading');
        if (heading && currentUser) {
            heading.textContent = `Welcome back, ${currentUser.name || 'Student'}! 👋`;
        }

        try {
            const allNotes = isFirebaseConfigured ? await getFirebaseNotes() : getNotes();
            const userNotes = currentUser
                ? allNotes.filter(note =>
                    (note.uploadedBy && currentUser.email && note.uploadedBy.toLowerCase() === currentUser.email.toLowerCase()) ||
                    (currentUser.uid && note.userId === currentUser.uid)
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

            // Render Recent Uploads
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
                                <h4><a href="view-note.html?id=${note.id}">${note.title || 'Untitled Note'}</a></h4>
                                <p>${note.gradeLevel || 'General'} • ${note.module || note.subject || 'Academic'}</p>
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
}
