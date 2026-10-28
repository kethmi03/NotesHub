import { getCurrentUser, getNotes, getSavedNotes, removeSavedNote, saveNoteForLater, reportNote, deleteNote } from './storage.js';
import { getFirebaseNotes, deleteFirebaseNote, reportFirebaseNote, isFirebaseConfigured } from './firebase.js';

const exampleNote = {
    id: 'software-engineering-lectures',
    title: 'Software Engineering Lectures',
    module: 'SE3106',
    gradeLevel: 'Y3S1',
    subject: 'Computer Science',
    description: 'A complete set of lecture notes covering the software development life cycle, agile methodologies, requirements engineering, system design, testing, and maintenance.',
    uploadedBy: 'Sarah Jenkins',
    rating: 4.8,
    reviews: 24,
    downloads: 156,
    type: 'pdf'
};

function getNoteId(note) {
    return String(note.id || note.title);
}

function showMessage(element, message, isError = false) {
    element.textContent = message;
    element.hidden = false;
    element.classList.toggle('error', isError);
}

function getNoteIcon(note) {
    const fileName = (note.fileName || '').toLowerCase();
    const type = (note.type || '').toLowerCase();

    if (type === 'word' || /\.(doc|docx)$/.test(fileName)) return 'fa-file-word';
    if (type === 'powerpoint' || /\.(ppt|pptx)$/.test(fileName)) return 'fa-file-powerpoint';
    return 'fa-file-pdf';
}

async function resolveCurrentNote() {
    const requestedId = new URLSearchParams(window.location.search).get('id');
    if (!requestedId || requestedId === exampleNote.id) return exampleNote;

    const localNotes = getNotes();
    const matchingLocalNote = localNotes.find((note) => getNoteId(note) === requestedId);
    if (matchingLocalNote) return { ...matchingLocalNote, id: getNoteId(matchingLocalNote) };

    if (isFirebaseConfigured) {
        const firebaseNotes = await getFirebaseNotes();
        const matchingFirebaseNote = firebaseNotes.find((note) => note.id === requestedId);
        if (matchingFirebaseNote) return matchingFirebaseNote;
    }

    throw new Error('The requested note could not be found.');
}

function updateNoteDetails(note) {
    const title = note.title || 'Untitled note';
    document.querySelector('.note-header-info h1').textContent = title;
    document.querySelector('.breadcrumb .current').textContent = title;

    const badges = document.querySelectorAll('.note-meta-badges .badge');
    badges[0].innerHTML = `<i class="fa-solid fa-book"></i> ${escapeHtml(note.module || 'Notes')}`;
    badges[1].innerHTML = `<i class="fa-solid fa-calendar"></i> ${escapeHtml(note.gradeLevel || 'All levels')}`;
    badges[2].innerHTML = `<i class="fa-solid fa-star"></i> ${Number(note.rating) || 0} (${Number(note.reviews) || 0} Reviews)`;

    const description = document.querySelector('.note-description p');
    if (description && note.description) description.textContent = note.description;

    const authorName = document.querySelector('.author-profile strong');
    if (authorName) authorName.textContent = note.uploadedByName || note.uploadedBy || 'NotesHub student';

    const fileName = (note.fileName || '').toLowerCase();
    const fileFormat = fileName.split('.').pop()?.toUpperCase();
    const formatValue = document.querySelector('.file-details .detail-row strong');
    if (formatValue && fileFormat && fileFormat !== fileName) formatValue.textContent = fileFormat;

    const downloadButton = document.querySelector('.download-action-btn');
    if (downloadButton && note.fileUrl) {
        downloadButton.addEventListener('click', () => window.open(note.fileUrl, '_blank', 'noopener'));
    } else if (downloadButton) {
        downloadButton.disabled = true;
        downloadButton.title = 'No downloadable file is available for this note.';
    }
}

export async function setupNoteDetails() {
    const saveButton = document.querySelector('.save-btn');
    if (!saveButton) return;

    saveButton.disabled = true;
    const status = document.querySelector('[data-saved-note-status]');
    let note;

    try {
        note = await resolveCurrentNote();
        updateNoteDetails(note);
    } catch (error) {
        console.error('Could not load note details.', error);
        showMessage(status, 'Unable to load this note. Please try again.', true);
        return;
    }

    note = { ...note, id: getNoteId(note) };
    const refreshButton = () => {
        const saved = getSavedNotes().some((savedNote) => savedNote.id === note.id);
        saveButton.innerHTML = saved
            ? '<i class="fa-solid fa-bookmark"></i> Saved'
            : '<i class="fa-regular fa-bookmark"></i> Save for later';
        saveButton.setAttribute('aria-pressed', String(saved));
    };

    try {
        refreshButton();
        saveButton.disabled = false;
    } catch (error) {
        console.error('Could not read saved notes.', error);
        showMessage(status, 'Unable to read your saved notes. Please check browser storage settings.', true);
        return;
    }

    saveButton.addEventListener('click', () => {
        try {
            const alreadySaved = getSavedNotes().some((savedNote) => savedNote.id === note.id);
            if (alreadySaved) {
                removeSavedNote(note.id);
                showMessage(status, 'Removed from your saved notes.');
            } else {
                saveNoteForLater(note);
                showMessage(status, 'Saved for later. Find it in Saved Notes.');
            }
            refreshButton();
        } catch (error) {
            console.error('Could not update saved notes.', error);
            showMessage(status, 'Could not update saved notes. Please check browser storage settings.', true);
        }
    });

    // Report Note Handler
    const reportButton = document.querySelector('.report-btn');
    if (reportButton) {
        if (note.reported) {
            reportButton.innerHTML = '<i class="fa-solid fa-flag"></i> Reported for Admin Review';
            reportButton.style.color = 'var(--danger-color)';
        }

        reportButton.addEventListener('click', async () => {
            const reason = window.prompt('Please provide a reason for reporting this note:\n(e.g., Inappropriate content, copyright violation, false academic notes, broken file)', 'Inappropriate or broken file');
            if (!reason) return;

            reportNote(note.id, reason);
            if (isFirebaseConfigured) {
                await reportFirebaseNote(note.id, reason);
            }

            reportButton.innerHTML = '<i class="fa-solid fa-flag"></i> Reported for Admin Review';
            reportButton.style.color = 'var(--danger-color)';
            reportButton.disabled = true;
            showMessage(status, 'Thank you. This note has been reported and sent to the administrator for review.');
        });
    }

    // Admin Delete Action
    const currentUser = getCurrentUser();
    const isAdmin = currentUser?.role === 'admin' || currentUser?.email?.toLowerCase() === 'admin@gmail.com';
    const actionCard = document.querySelector('.action-card');
    if (isAdmin && actionCard && !document.getElementById('adminRemoveNoteBtn')) {
        const adminDelBtn = document.createElement('button');
        adminDelBtn.id = 'adminRemoveNoteBtn';
        adminDelBtn.type = 'button';
        adminDelBtn.className = 'danger-btn';
        adminDelBtn.style.width = '100%';
        adminDelBtn.style.marginTop = '15px';
        adminDelBtn.innerHTML = '<i class="fa-solid fa-trash"></i> Delete Note (Admin)';
        adminDelBtn.addEventListener('click', async () => {
            if (confirm(`Admin Action: Are you sure you want to permanently delete "${note.title}"?`)) {
                deleteNote(note.id);
                if (isFirebaseConfigured) {
                    await deleteFirebaseNote(note.id);
                }
                alert('Note has been deleted successfully by Admin.');
                window.location.href = 'browse-notes.html';
            }
        });
        actionCard.appendChild(adminDelBtn);
    }
}

function renderSavedNotes(notes, grid, searchTerm) {
    const filteredNotes = notes.filter((note) =>
        `${note.title || ''} ${note.module || ''} ${note.uploadedByName || note.uploadedBy || ''}`
            .toLowerCase()
            .includes(searchTerm)
    );

    if (filteredNotes.length === 0) {
        grid.innerHTML = '<p class="saved-notes-empty">No saved notes found. <a href="browse-notes.html">Browse notes</a> and save one for later.</p>';
        return;
    }

    grid.innerHTML = filteredNotes.map((note) => {
        const noteId = encodeURIComponent(getNoteId(note));
        const title = escapeHtml(note.title || 'Untitled note');
        const module = escapeHtml(note.module || 'Notes');
        const gradeLevel = escapeHtml(note.gradeLevel || 'All levels');
        const author = escapeHtml(note.uploadedByName || note.uploadedBy || 'NotesHub student');
        const downloadUrl = getSafeDownloadUrl(note.fileUrl);
        const downloadAction = downloadUrl
            ? `<a class="edit-btn" title="Download note" aria-label="Download ${title}" href="${escapeHtml(downloadUrl)}" target="_blank" rel="noopener"><i class="fa-solid fa-download"></i></a>`
            : '';

        return `
            <article class="note-card-small">
                <div class="note-icon-small"><i class="fa-solid ${getNoteIcon(note)}"></i></div>
                <div class="note-details">
                    <h4><a href="view-note.html?id=${noteId}">${title}</a></h4>
                    <p>${gradeLevel} • ${module}</p>
                    <p class="saved-note-author">By: ${author}</p>
                </div>
                <div class="note-stats">
                    <span><i class="fa-solid fa-download"></i> ${Number(note.downloads) || 0}</span>
                    <span><i class="fa-solid fa-star"></i> ${Number(note.rating) || 0}</span>
                </div>
                <div class="note-actions">
                    ${downloadAction}
                    <button class="delete-btn" type="button" data-remove-saved-note="${escapeHtml(getNoteId(note))}" title="Remove from saved notes" aria-label="Remove ${title}"><i class="fa-solid fa-trash"></i></button>
                </div>
            </article>
        `;
    }).join('');
}

function getSafeDownloadUrl(value) {
    if (!value) return '';

    try {
        const url = new URL(value, window.location.href);
        return ['http:', 'https:'].includes(url.protocol) ? url.href : '';
    } catch {
        return '';
    }
}

function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, (character) => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    })[character]);
}

export function setupSavedNotes() {
    const grid = document.querySelector('[data-saved-notes-grid]');
    if (!grid) return;

    const status = document.querySelector('[data-saved-note-status]');
    const searchInput = document.querySelector('[data-saved-notes-search]');
    const sortSelect = document.querySelector('[data-saved-notes-sort]');

    const update = () => {
        try {
            const searchTerm = searchInput.value.trim().toLowerCase();
            const sort = sortSelect.value;
            const savedNotes = getSavedNotes();
            const sortedNotes = [...savedNotes];

            if (sort === 'title') sortedNotes.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
            if (sort === 'rating') sortedNotes.sort((a, b) => (Number(b.rating) || 0) - (Number(a.rating) || 0));
            if (sort === 'recent') sortedNotes.sort((a, b) => (b.savedAt || '').localeCompare(a.savedAt || ''));

            renderSavedNotes(sortedNotes, grid, searchTerm);
        } catch (error) {
            console.error('Could not load saved notes.', error);
            showMessage(status, 'Unable to load your saved notes. Please check browser storage settings.', true);
        }
    };

    searchInput.addEventListener('input', update);
    sortSelect.addEventListener('change', update);
    grid.addEventListener('click', (event) => {
        const removeButton = event.target.closest('[data-remove-saved-note]');
        if (!removeButton) return;

        try {
            removeSavedNote(removeButton.dataset.removeSavedNote);
            showMessage(status, 'Note removed from your saved notes.');
            update();
        } catch (error) {
            console.error('Could not remove saved note.', error);
            showMessage(status, 'Could not remove this note. Please check browser storage settings.', true);
        }
    });

    update();

    window.addEventListener('storage', update);
    window.addEventListener('noteshub:sync', update);

    const currentUser = getCurrentUser();
    const sidebarName = document.querySelector('.sidebar-user h3');
    if (sidebarName && currentUser?.name) sidebarName.textContent = currentUser.name;
}
