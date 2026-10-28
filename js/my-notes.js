import { getCurrentUser, getNotes, deleteNote } from './storage.js';
import { getFirebaseNotes, deleteFirebaseNote, isFirebaseConfigured } from './firebase.js';

export async function setupMyNotesPage() {
    const myNotesGrid = document.getElementById('myNotesGrid');
    if (!myNotesGrid) return;

    const currentUser = getCurrentUser();
    if (!currentUser) return;

    const searchInput = document.getElementById('myNotesSearch');
    const sortSelect = document.getElementById('myNotesSort');

    async function loadAndRenderMyNotes() {
        try {
            const allNotes = isFirebaseConfigured ? await getFirebaseNotes() : getNotes();
            
            // Filter notes belonging to currently logged in user
            let userNotes = allNotes.filter(n =>
                (n.uploadedBy && currentUser.email && n.uploadedBy.toLowerCase() === currentUser.email.toLowerCase()) ||
                (currentUser.uid && n.userId === currentUser.uid)
            );

            // Filter by search query
            const term = (searchInput?.value || '').toLowerCase().trim();
            if (term) {
                userNotes = userNotes.filter(n =>
                    (n.title || '').toLowerCase().includes(term) ||
                    (n.module || '').toLowerCase().includes(term) ||
                    (n.subject || '').toLowerCase().includes(term)
                );
            }

            // Sort
            const sortBy = sortSelect?.value || 'recent';
            if (sortBy === 'downloads') {
                userNotes.sort((a, b) => (Number(b.downloads) || 0) - (Number(a.downloads) || 0));
            } else if (sortBy === 'rating') {
                userNotes.sort((a, b) => (Number(b.rating) || 0) - (Number(a.rating) || 0));
            } else {
                userNotes.sort((a, b) => new Date(b.uploadedAt || 0) - new Date(a.uploadedAt || 0));
            }

            if (userNotes.length === 0) {
                myNotesGrid.innerHTML = `
                    <div class="saved-notes-empty" style="grid-column: 1 / -1; padding: 45px 20px; text-align: center; background: white; border-radius: 12px; border: 1px dashed var(--border-light);">
                        <i class="fa-solid fa-cloud-arrow-up" style="font-size: 38px; color: var(--primary-color); margin-bottom: 14px; display: block;"></i>
                        <h3 style="font-size: 18px; margin-bottom: 6px; color: var(--text-dark);">No Uploaded Notes Yet</h3>
                        <p style="color: var(--text-secondary); font-size: 14px; max-width: 440px; margin: 0 auto 18px;">
                            ${term ? 'No notes matched your search term.' : 'You haven\'t uploaded any notes yet. Share your study guides, slides, or summaries to help fellow students!'}
                        </p>
                        <a href="upload-note.html" class="primary-btn" style="display: inline-block; padding: 11px 22px; text-decoration: none; border-radius: 8px; font-weight: 600;">Upload New Note</a>
                    </div>
                `;
                return;
            }

            myNotesGrid.innerHTML = userNotes.map(note => {
                const noteId = String(note.id || note.title);
                const fileName = (note.fileName || '').toLowerCase();
                let iconClass = 'fa-file-pdf';
                if (/\.(doc|docx)$/.test(fileName) || note.type === 'word') iconClass = 'fa-file-word';
                else if (/\.(ppt|pptx)$/.test(fileName) || note.type === 'powerpoint') iconClass = 'fa-file-powerpoint';

                const isReported = note.reported || Number(note.reportCount) > 0;
                const statusBadge = isReported 
                    ? '<span style="background: #fee2e2; color: #dc2626; font-size: 11px; padding: 2px 6px; border-radius: 4px; font-weight: 700; margin-left: 6px;">Reported</span>'
                    : (note.status === 'pending' ? '<span style="background: #fef3c7; color: #d97706; font-size: 11px; padding: 2px 6px; border-radius: 4px; font-weight: 700; margin-left: 6px;">Pending</span>' : '');

                const uploadDate = note.uploadedAt ? new Date(note.uploadedAt).toLocaleDateString() : 'Recently';

                return `
                    <div class="note-card-small">
                        <div class="note-icon-small">
                            <i class="fa-solid ${iconClass}"></i>
                        </div>
                        <div class="note-details">
                            <h4>
                                <a href="view-note.html?id=${encodeURIComponent(noteId)}" style="color: inherit; text-decoration: none;">
                                    ${escapeHtml(note.title || 'Untitled Note')}
                                </a>
                                ${statusBadge}
                            </h4>
                            <p>${escapeHtml(note.gradeLevel || 'General')} • ${escapeHtml(note.module || note.subject || 'Notes')}</p>
                            <p style="font-size: 12px; color: var(--text-secondary); margin-top: 5px;"><i class="fa-regular fa-clock"></i> Uploaded ${uploadDate}</p>
                        </div>
                        <div class="note-stats">
                            <span><i class="fa-solid fa-download"></i> ${note.downloads || 0}</span>
                            <span><i class="fa-solid fa-star" style="color: #f59e0b;"></i> ${note.rating || '5.0'}</span>
                        </div>
                        <div class="note-actions">
                            <a href="view-note.html?id=${encodeURIComponent(noteId)}" class="edit-btn" title="View note"><i class="fa-solid fa-eye"></i></a>
                            <button type="button" class="delete-btn" data-delete-my-note="${escapeHtml(noteId)}" title="Delete note"><i class="fa-solid fa-trash"></i></button>
                        </div>
                    </div>
                `;
            }).join('');

            // Attach delete listeners
            myNotesGrid.querySelectorAll('[data-delete-my-note]').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    e.stopPropagation();
                    const idToDelete = btn.getAttribute('data-delete-my-note');
                    if (confirm('Are you sure you want to permanently delete this note?')) {
                        deleteNote(idToDelete);
                        if (isFirebaseConfigured) {
                            await deleteFirebaseNote(idToDelete);
                        }
                        await loadAndRenderMyNotes();
                    }
                });
            });
        } catch (error) {
            console.error('Error loading my notes:', error);
        }
    }

    if (searchInput) {
        searchInput.addEventListener('input', loadAndRenderMyNotes);
    }
    if (sortSelect) {
        sortSelect.addEventListener('change', loadAndRenderMyNotes);
    }

    await loadAndRenderMyNotes();
    window.addEventListener('storage', () => loadAndRenderMyNotes());
    window.addEventListener('noteshub:sync', () => loadAndRenderMyNotes());
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
