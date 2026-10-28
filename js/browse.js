import { getNotes, getCurrentUser, deleteNote, getDeletedDefaultNoteIds } from './storage.js';
import { getFirebaseNotes, deleteFirebaseNote, isFirebaseConfigured } from './firebase.js';

const defaultNotes = [
    {
        id: 'software-engineering-lectures',
        title: "Software Engineering Lectures",
        module: "SE3106",
        gradeLevel: "Y3S1",
        subject: "Computer Science",
        uploadedBy: "Sarah Jenkins",
        rating: 4.8,
        reviews: 24,
        downloads: 156,
        type: "pdf"
    },
    {
        id: 'data-structures-complete-summary',
        title: "Data Structures Complete Summary",
        module: "CS2001",
        gradeLevel: "Y2S1",
        subject: "Computer Science",
        uploadedBy: "Mike Ross",
        rating: 4.9,
        reviews: 42,
        downloads: 312,
        type: "word"
    },
    {
        id: 'database-management-systems',
        title: "Database Management Systems",
        module: "DB2104",
        gradeLevel: "Y2S2",
        subject: "Computer Science",
        uploadedBy: "Emma Watson",
        rating: 4.5,
        reviews: 18,
        downloads: 89,
        type: "powerpoint"
    },
    {
        id: 'computer-networks-past-papers',
        title: "Computer Networks Past Papers",
        module: "NW3002",
        gradeLevel: "Y3S2",
        subject: "Computer Science",
        uploadedBy: "John Doe",
        rating: 4.7,
        reviews: 12,
        downloads: 45,
        type: "pdf"
    }
];

function renderNotes(notes, onNoteDeleted) {
    const grid = document.querySelector('.marketplace-grid');
    if (!grid) return;
    
    grid.innerHTML = '';
    
    if (notes.length === 0) {
        grid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: var(--text-muted); padding: 40px 0;">No notes found matching your criteria.</p>';
        return;
    }

    const currentUser = getCurrentUser();
    const isAdmin = currentUser?.role === 'admin' || currentUser?.email?.toLowerCase() === 'admin@gmail.com';

    notes.forEach(note => {
        let iconHtml = '<i class="fa-solid fa-file-pdf"></i>';
        let bgStyle = '';
        
        if (note.type === 'word' || note.fileName?.endsWith('.doc') || note.fileName?.endsWith('.docx')) {
            iconHtml = '<i class="fa-solid fa-file-word"></i>';
            bgStyle = 'background: #e0f2fe; color: #0284c7;';
        } else if (note.type === 'powerpoint' || note.fileName?.endsWith('.ppt') || note.fileName?.endsWith('.pptx')) {
            iconHtml = '<i class="fa-solid fa-file-powerpoint"></i>';
            bgStyle = 'background: #fef3c7; color: #d97706;';
        }

        const noteId = String(note.id || note.title);
        const adminDeleteBtn = isAdmin ? `
            <button type="button" class="admin-card-delete-btn" data-delete-note-id="${noteId}" title="Admin: Delete note" style="position: absolute; top: 12px; right: 12px; background: rgba(239, 68, 68, 0.1); color: #dc2626; border: 1px solid rgba(239, 68, 68, 0.3); border-radius: 6px; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: 0.2s;">
                <i class="fa-solid fa-trash"></i>
            </button>
        ` : '';

        const reportedBadge = (isAdmin && note.reported) ? `
            <span style="position: absolute; top: 12px; left: 12px; background: #fee2e2; color: #dc2626; font-size: 11px; font-weight: 700; padding: 3px 7px; border-radius: 4px; display: inline-flex; align-items: center; gap: 4px;">
                <i class="fa-solid fa-flag"></i> Reported
            </span>
        ` : '';

        const html = `
            <div class="market-card reveal active" style="position: relative;">
                ${reportedBadge}
                ${adminDeleteBtn}
                <div class="market-card-top">
                    <div class="note-icon-large" style="${bgStyle}">
                        ${iconHtml}
                    </div>
                </div>
                <div class="market-card-body">
                    <h3><a href="view-note.html?id=${encodeURIComponent(noteId)}">${note.title}</a></h3>
                    <p class="module">${note.module} • ${note.gradeLevel}</p>
                    <div class="author-info">
                        <div class="avatar-small"><i class="fa-solid fa-user"></i></div>
                        <span>By ${note.uploadedByName || note.uploadedBy}</span>
                    </div>
                    <div class="market-stats">
                        <span><i class="fa-solid fa-star"></i> ${note.rating || 0} (${note.reviews || 0})</span>
                        <span><i class="fa-solid fa-download"></i> ${note.downloads || 0}</span>
                    </div>
                </div>
            </div>
        `;
        grid.insertAdjacentHTML('beforeend', html);
    });

    if (isAdmin) {
        grid.querySelectorAll('.admin-card-delete-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const idToDelete = btn.getAttribute('data-delete-note-id');
                if (confirm('Admin: Are you sure you want to permanently delete this note from NotesHub?')) {
                    deleteNote(idToDelete);
                    if (isFirebaseConfigured) {
                        await deleteFirebaseNote(idToDelete);
                    }
                    if (typeof onNoteDeleted === 'function') {
                        onNoteDeleted(idToDelete);
                    }
                }
            });
        });
    }
}

function handleFilters(allNotes, onNoteDeleted) {
    const searchInput = document.querySelector('.search-box input');
    const subjectCheckboxes = document.querySelectorAll('.filter-group:nth-child(2) input[type="checkbox"]');
    
    const term = searchInput ? searchInput.value.toLowerCase() : '';
    
    const activeSubjects = Array.from(subjectCheckboxes)
        .filter(cb => cb.checked)
        .map(cb => cb.parentElement.textContent.trim().toLowerCase());

    let filtered = allNotes.filter(note => {
        const matchesSearch = (note.title || '').toLowerCase().includes(term) || (note.module || '').toLowerCase().includes(term);
        const subject = (note.subject || '').toLowerCase();
        
        const matchesSubject = activeSubjects.length === 0 || activeSubjects.includes(subject) || activeSubjects.includes('other');
        
        return matchesSearch && matchesSubject;
    });

    renderNotes(filtered, onNoteDeleted);
    
    const resultsText = document.querySelector('.browse-header p');
    if (resultsText) {
        resultsText.textContent = `Showing ${filtered.length} results`;
    }
}

export async function setupBrowsePage() {
    const grid = document.querySelector('.marketplace-grid');
    if (!grid) return;

    const storedNotes = isFirebaseConfigured ? await getFirebaseNotes() : getNotes();
    const deletedDefaults = getDeletedDefaultNoteIds();
    let allNotes = [
        ...defaultNotes.filter(n => !deletedDefaults.includes(String(n.id))),
        ...storedNotes
    ];

    const onNoteDeleted = (deletedId) => {
        allNotes = allNotes.filter(n => String(n.id || n.title) !== String(deletedId));
        handleFilters(allNotes, onNoteDeleted);
    };

    // Add event listeners to filters
    const searchInput = document.querySelector('.search-box input');
    if (searchInput) {
        searchInput.addEventListener('input', () => handleFilters(allNotes, onNoteDeleted));
    }

    const checkboxes = document.querySelectorAll('.custom-checkbox input');
    checkboxes.forEach(cb => {
        cb.addEventListener('change', () => handleFilters(allNotes, onNoteDeleted));
    });

    const applyBtn = document.querySelector('.apply-filters-btn');
    if (applyBtn) {
        applyBtn.addEventListener('click', () => handleFilters(allNotes, onNoteDeleted));
    }

    // Initial render
    handleFilters(allNotes, onNoteDeleted);

    async function refreshBrowseNotes() {
        const updatedStored = isFirebaseConfigured ? await getFirebaseNotes() : getNotes();
        const updatedDeleted = getDeletedDefaultNoteIds();
        allNotes = [
            ...defaultNotes.filter(n => !updatedDeleted.includes(String(n.id))),
            ...updatedStored
        ];
        handleFilters(allNotes, onNoteDeleted);
    }

    window.addEventListener('storage', refreshBrowseNotes);
    window.addEventListener('noteshub:sync', refreshBrowseNotes);
}
