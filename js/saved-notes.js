import { getCurrentUser, getNotes, saveNotes, getSavedNotes, removeSavedNote, saveNoteForLater } from './storage.js';
import { getFirebaseNotes, isFirebaseConfigured } from './firebase.js';
import { getUploadedFile } from './file-storage.js';

const exampleNote = {
    id: 'software-engineering-lectures',
    title: 'Software Engineering Complete Lectures',
    module: 'SE3106',
    gradeLevel: 'Y3S1',
    subject: 'Computer Science',
    description: 'This is a complete set of lecture notes for Software Engineering (SE3106). It covers everything from the software development life cycle (SDLC), agile methodologies, requirements engineering, system design, testing, to maintenance.\n\nThe notes are compiled from lecture slides, textbooks, and personal research. Perfectly structured for exam preparation and quick revision.',
    uploadedBy: 'Sarah Jenkins',
    uploadedByName: 'Sarah Jenkins',
    uploadedAt: '2026-09-15T10:00:00.000Z',
    fileSize: '2.4 MB',
    pages: 45,
    rating: 4.8,
    reviews: 2,
    downloads: 156,
    type: 'pdf',
    format: 'PDF',
    tags: ['software-engineering', 'agile', 'sdlc', 'summary'],
    reviewsList: [
        {
            reviewerName: 'Mike Ross',
            rating: 5,
            comment: 'These notes are a lifesaver! Perfectly summarized and very easy to understand. Helped me a lot during the final exams.',
            date: '2 weeks ago'
        },
        {
            reviewerName: 'Emily Chen',
            rating: 4,
            comment: 'Good notes, especially the part about Agile methodologies. Highly recommended.',
            date: '1 month ago'
        }
    ]
};

function getNoteId(note) {
    return String(note.id || note.title);
}

function showMessage(element, message, isError = false) {
    if (!element) return;
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

function escapeHtml(value) {
    return String(value || '').replace(/[&<>"']/g, (character) => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    })[character]);
}

async function resolveCurrentNote() {
    const requestedId = new URLSearchParams(window.location.search).get('id');
    if (!requestedId || requestedId === exampleNote.id) return exampleNote;

    const localNotes = getNotes();
    const matchingLocalNote = localNotes.find((note) => getNoteId(note) === requestedId);
    if (matchingLocalNote) return { ...matchingLocalNote, id: getNoteId(matchingLocalNote) };

    if (isFirebaseConfigured) {
        try {
            const firebaseNotes = await getFirebaseNotes();
            const matchingFirebaseNote = firebaseNotes.find((note) => note.id === requestedId);
            if (matchingFirebaseNote) return matchingFirebaseNote;
        } catch (e) {
            console.warn('Firebase note resolve fallback:', e);
        }
    }

    return exampleNote;
}

function renderReviews(note, container, badgeEl) {
    if (!container) return;

    let reviews = note.reviewsList;
    if (!reviews || !Array.isArray(reviews)) {
        reviews = note.id === exampleNote.id ? exampleNote.reviewsList : [];
    }

    if (badgeEl) {
        badgeEl.textContent = reviews.length > 0
            ? `${reviews.length} Review${reviews.length === 1 ? '' : 's'}`
            : 'No reviews yet';
    }

    if (reviews.length === 0) {
        container.innerHTML = `
            <div style="padding: 25px 20px; text-align: center; background: #f8fafc; border-radius: 12px; margin-bottom: 20px; border: 1px dashed #cbd5e1;">
                <div style="font-size: 28px; color: #94a3b8; margin-bottom: 8px;"><i class="fa-regular fa-comment-dots"></i></div>
                <p style="font-weight: 600; color: #475569; margin-bottom: 4px;">No reviews yet</p>
                <p style="font-size: 13px; color: #64748b; margin: 0;">Be the first student to review this study material!</p>
            </div>
        `;
        return;
    }

    container.innerHTML = reviews.map(r => {
        const rating = Number(r.rating) || 5;
        let starsHtml = '';
        for (let i = 1; i <= 5; i++) {
            starsHtml += `<i class="fa-${i <= rating ? 'solid' : 'regular'} fa-star"></i>`;
        }

        return `
            <div class="review-card">
                <div class="review-header">
                    <div class="reviewer-info">
                        <div class="avatar-small"><i class="fa-solid fa-user"></i></div>
                        <strong>${escapeHtml(r.reviewerName || 'Student')}</strong>
                    </div>
                    <div class="review-stars">
                        ${starsHtml}
                    </div>
                </div>
                <p>${escapeHtml(r.comment || 'Helpful study notes!')}</p>
                <span class="review-date">${escapeHtml(r.date || 'Recently')}</span>
            </div>
        `;
    }).join('');
}

function updateNoteDetails(note) {
    const title = note.title || 'Untitled Note';
    document.title = `${title} | NotesHub`;

    // 1. Header & Breadcrumb
    const headerTitle = document.querySelector('.note-header-info h1');
    if (headerTitle) headerTitle.textContent = title;

    const currentBreadcrumb = document.querySelector('.breadcrumb .current');
    if (currentBreadcrumb) currentBreadcrumb.textContent = title;

    const subjectBreadcrumb = document.getElementById('breadcrumbSubject');
    if (subjectBreadcrumb && note.subject) {
        subjectBreadcrumb.textContent = note.subject;
        subjectBreadcrumb.href = `browse-notes.html?subject=${encodeURIComponent(note.subject)}`;
    }

    // 2. Huge File Type Icon
    const hugeIcon = document.querySelector('.note-icon-huge');
    if (hugeIcon) {
        const iconClass = getNoteIcon(note);
        hugeIcon.innerHTML = `<i class="fa-solid ${iconClass}"></i>`;
        if (iconClass === 'fa-file-word') {
            hugeIcon.style.background = '#e0f2fe';
            hugeIcon.style.color = '#0284c7';
        } else if (iconClass === 'fa-file-powerpoint') {
            hugeIcon.style.background = '#ffedd5';
            hugeIcon.style.color = '#ea580c';
        } else {
            hugeIcon.style.background = 'var(--danger-light)';
            hugeIcon.style.color = 'var(--danger-color)';
        }
    }

    // 3. Meta Badges
    const badges = document.querySelectorAll('.note-meta-badges .badge');
    if (badges.length >= 3) {
        badges[0].innerHTML = `<i class="fa-solid fa-book"></i> ${escapeHtml(note.module || 'Notes')}`;
        badges[1].innerHTML = `<i class="fa-solid fa-calendar"></i> ${escapeHtml(note.gradeLevel || 'All levels')}`;
        const ratingVal = note.rating && note.rating > 0 ? Number(note.rating).toFixed(1) : 'New';
        const reviewCount = note.reviewsList ? note.reviewsList.length : (Number(note.reviews) || 0);
        badges[2].innerHTML = `<i class="fa-solid fa-star"></i> ${ratingVal} (${reviewCount} Review${reviewCount === 1 ? '' : 's'})`;
    }

    // 4. Description Content
    const descContainer = document.getElementById('noteDescriptionContainer') || document.querySelector('.note-description');
    if (descContainer) {
        const descText = note.description || 'Comprehensive student-curated lecture notes and revision study materials.';
        const paragraphs = descText.split(/\n+/).filter(Boolean);
        const html = paragraphs.map(p => `<p>${escapeHtml(p)}</p>`).join('');

        const descWrapper = document.getElementById('noteDescriptionContainer');
        if (descWrapper) {
            descWrapper.innerHTML = html;
        } else {
            // Replace existing paragraph elements
            descContainer.querySelectorAll('p').forEach(p => p.remove());
            const h4 = descContainer.querySelector('h4');
            const div = document.createElement('div');
            div.innerHTML = html;
            if (h4) descContainer.insertBefore(div, h4);
            else descContainer.appendChild(div);
        }
    }

    // 5. Tags List
    const tagsList = document.getElementById('noteTagsList') || document.querySelector('.tags-list');
    if (tagsList) {
        let tags = [];
        if (Array.isArray(note.tags)) {
            tags = note.tags;
        } else if (typeof note.tags === 'string' && note.tags.trim()) {
            tags = note.tags.split(',').map(t => t.trim().replace(/^#/, '')).filter(Boolean);
        }
        if (tags.length === 0) {
            tags = [note.subject, note.module, note.docType || 'study-notes'].filter(Boolean);
        }
        tagsList.innerHTML = tags.map(t => {
            const clean = escapeHtml(t.toLowerCase().replace(/\s+/g, '-'));
            return `<span>#${clean}</span>`;
        }).join(' ');
    }

    // 6. File Details Sidebar (Format, Size, Pages, Uploaded)
    const ext = (note.fileName || '').split('.').pop()?.toUpperCase() || (note.format || note.type || 'PDF').toUpperCase();
    const formatEl = document.getElementById('fileDetailFormat');
    if (formatEl) formatEl.textContent = ext;

    const sizeEl = document.getElementById('fileDetailSize');
    if (sizeEl) sizeEl.textContent = note.fileSize || '1.8 MB';

    const pagesEl = document.getElementById('fileDetailPages');
    if (pagesEl) pagesEl.textContent = note.pages || 32;

    const uploadedEl = document.getElementById('fileDetailDate');
    if (uploadedEl) {
        if (note.uploadedAt) {
            uploadedEl.textContent = new Date(note.uploadedAt).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric'
            });
        } else {
            uploadedEl.textContent = 'Sept 15, 2026';
        }
    }

    // 7. Author Profile Card
    const authorName = document.querySelector('.author-profile strong');
    if (authorName) authorName.textContent = note.uploadedByName || note.uploadedBy || 'Student Contributor';

    const authorSub = document.querySelector('.author-profile span');
    if (authorSub) authorSub.textContent = note.subject || 'Student Contributor';

    // 8. Download Note Handler (Real download with IndexedDB / FileUrl / Blob Fallback)
    const downloadButton = document.querySelector('.download-action-btn');
    if (downloadButton) {
        downloadButton.disabled = false;
        downloadButton.title = 'Download this document';

        downloadButton.onclick = async (e) => {
            e.preventDefault();
            downloadButton.disabled = true;
            downloadButton.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Downloading...';

            try {
                // 1. Try to fetch from IndexedDB
                const storedFile = await getUploadedFile(note.id);
                if (storedFile) {
                    const blobUrl = URL.createObjectURL(storedFile);
                    const a = document.createElement('a');
                    a.href = blobUrl;
                    a.download = note.fileName || `${note.title}.${ext.toLowerCase()}`;
                    document.body.appendChild(a);
                    a.click();
                    setTimeout(() => {
                        document.body.removeChild(a);
                        URL.revokeObjectURL(blobUrl);
                    }, 200);
                } else if (note.fileUrl) {
                    // 2. Open cloud storage URL
                    window.open(note.fileUrl, '_blank', 'noopener');
                } else {
                    // 3. Fallback: generate study document file
                    const fileText = `================================================\n${note.title}\n================================================\nCourse / Module : ${note.module || 'N/A'}\nSubject         : ${note.subject || 'N/A'}\nGrade Level     : ${note.gradeLevel || 'N/A'}\nUploaded By     : ${note.uploadedByName || note.uploadedBy || 'Student'}\nUpload Date     : ${note.uploadedAt || new Date().toISOString()}\n\nDESCRIPTION:\n${note.description || 'Verified student study notes.'}\n\n================================================\nDownloaded from NotesHub\n================================================`;
                    const blob = new Blob([fileText], { type: 'text/plain;charset=utf-8' });
                    const blobUrl = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = blobUrl;
                    a.download = note.fileName || `${note.title}.txt`;
                    document.body.appendChild(a);
                    a.click();
                    setTimeout(() => {
                        document.body.removeChild(a);
                        URL.revokeObjectURL(blobUrl);
                    }, 200);
                }

                // Increment download counter
                const allNotes = getNotes();
                const noteIndex = allNotes.findIndex(n => String(n.id) === String(note.id));
                if (noteIndex !== -1) {
                    allNotes[noteIndex].downloads = (allNotes[noteIndex].downloads || 0) + 1;
                    saveNotes(allNotes);
                }
            } catch (err) {
                console.error('Download execution failed:', err);
                alert('Could not download file. Please try again.');
            } finally {
                setTimeout(() => {
                    downloadButton.disabled = false;
                    downloadButton.innerHTML = '<i class="fa-solid fa-cloud-arrow-down"></i> Download Note';
                }, 700);
            }
        };
    }

    // 9. Student Reviews Rendering & Submission
    const reviewsListEl = document.getElementById('reviewsList');
    const reviewsBadgeEl = document.getElementById('reviewsHeaderBadge');
    renderReviews(note, reviewsListEl, reviewsBadgeEl);

    // Review form toggle & submission
    const openReviewBtn = document.getElementById('openReviewBtn');
    const reviewFormContainer = document.getElementById('reviewFormContainer');
    const cancelReviewBtn = document.getElementById('cancelReviewBtn');
    const noteReviewForm = document.getElementById('noteReviewForm');
    const starPicker = document.getElementById('starRatingPicker');

    let selectedRating = 5;

    if (starPicker) {
        const stars = starPicker.querySelectorAll('i');
        stars.forEach(star => {
            star.addEventListener('click', () => {
                selectedRating = parseInt(star.getAttribute('data-rating') || '5', 10);
                stars.forEach((s, idx) => {
                    if (idx < selectedRating) {
                        s.className = 'fa-solid fa-star';
                    } else {
                        s.className = 'fa-regular fa-star';
                    }
                });
            });
        });
    }

    if (openReviewBtn && reviewFormContainer) {
        openReviewBtn.onclick = () => {
            reviewFormContainer.style.display = reviewFormContainer.style.display === 'none' ? 'block' : 'none';
            if (reviewFormContainer.style.display === 'block') {
                document.getElementById('reviewCommentText')?.focus();
            }
        };
    }

    if (cancelReviewBtn && reviewFormContainer) {
        cancelReviewBtn.onclick = () => {
            reviewFormContainer.style.display = 'none';
        };
    }

    if (noteReviewForm) {
        noteReviewForm.onsubmit = (e) => {
            e.preventDefault();
            const commentInput = document.getElementById('reviewCommentText');
            const comment = commentInput ? commentInput.value.trim() : '';
            if (!comment) return;

            const currentUser = getCurrentUser();
            const reviewerName = currentUser?.name || 'Verified Student';

            const newReview = {
                reviewerName,
                rating: selectedRating,
                comment,
                date: 'Just now'
            };

            if (!note.reviewsList || !Array.isArray(note.reviewsList)) {
                note.reviewsList = [];
            }
            note.reviewsList.unshift(newReview);

            // Recalculate average rating
            const totalRating = note.reviewsList.reduce((acc, r) => acc + (Number(r.rating) || 5), 0);
            note.rating = parseFloat((totalRating / note.reviewsList.length).toFixed(1));
            note.reviews = note.reviewsList.length;

            // Save updated note in localStorage
            const allNotes = getNotes();
            const idx = allNotes.findIndex(n => String(n.id) === String(note.id));
            if (idx !== -1) {
                allNotes[idx] = { ...allNotes[idx], ...note };
                saveNotes(allNotes);
            }

            // Update UI
            renderReviews(note, reviewsListEl, reviewsBadgeEl);
            if (badges.length >= 3) {
                badges[2].innerHTML = `<i class="fa-solid fa-star"></i> ${note.rating} (${note.reviews} Review${note.reviews === 1 ? '' : 's'})`;
            }

            noteReviewForm.reset();
            reviewFormContainer.style.display = 'none';
        };
    }
}

export async function setupNoteDetails() {
    const detailsContainer = document.querySelector('.note-header-info');
    if (!detailsContainer) return;

    const saveButton = document.getElementById('saveForLaterBtn') || document.querySelector('.note-action-sidebar .save-btn') || document.querySelector('.save-btn');
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

    if (!saveButton) return;

    note = { ...note, id: getNoteId(note) };

    // State variable to track whether note is currently saved
    let isSaved = false;
    try {
        isSaved = getSavedNotes().some((savedNote) => String(savedNote.id || savedNote.title) === String(note.id));
    } catch (e) {
        console.warn('Could not read saved notes state:', e);
    }

    const updateSaveButtonUI = () => {
        saveButton.setAttribute('aria-pressed', String(isSaved));
        saveButton.classList.toggle('is-saved', isSaved);

        if (isSaved) {
            saveButton.innerHTML = '<i class="fa-solid fa-bookmark" style="color: #ffffff;"></i> Saved';
            saveButton.title = 'Click to remove from saved notes';
        } else {
            saveButton.innerHTML = '<i class="fa-regular fa-bookmark"></i> Save for later';
            saveButton.title = 'Click to save for later';
        }
    };

    updateSaveButtonUI();
    saveButton.disabled = false;

    // Toggle event handler to flip state on click
    saveButton.addEventListener('click', (e) => {
        e.preventDefault();
        try {
            // Flip the isSaved state
            isSaved = !isSaved;

            if (isSaved) {
                saveNoteForLater(note);
                showMessage(status, 'Saved for later. Find it in Saved Notes.');
            } else {
                removeSavedNote(note.id);
                showMessage(status, 'Removed from your saved notes.');
            }

            // Update button appearance and darker background
            updateSaveButtonUI();
        } catch (error) {
            console.error('Could not toggle save state.', error);
            // Revert state on error
            isSaved = !isSaved;
            updateSaveButtonUI();
            showMessage(status, 'Could not update saved notes. Please check browser storage settings.', true);
        }
    });
}

function renderSavedNotes(notes, grid, searchTerm) {
    if (!grid) return;

    const filtered = notes.filter((note) => {
        if (!searchTerm) return true;
        const haystack = [note.title, note.module, note.subject, note.uploadedBy, note.uploadedByName, note.gradeLevel]
            .filter(Boolean)
            .join(' ')
            .toLowerCase();
        return haystack.includes(searchTerm);
    });

    if (filtered.length === 0) {
        grid.innerHTML = `
            <div class="empty-state">
                <i class="fa-regular fa-bookmark"></i>
                <p>No saved notes found.</p>
                <span>Browse study materials and click the bookmark button to save them here.</span>
            </div>
        `;
        return;
    }

    grid.innerHTML = filtered.map((note) => {
        const noteId = encodeURIComponent(getNoteId(note));
        const title = escapeHtml(note.title || 'Untitled note');
        const module = escapeHtml(note.module || 'Notes');
        const gradeLevel = escapeHtml(note.gradeLevel || 'All levels');
        const author = escapeHtml(note.uploadedByName || note.uploadedBy || 'NotesHub student');
        const downloadUrl = note.fileUrl || `view-note.html?id=${noteId}`;
        const downloadAction = `<a class="edit-btn" title="Download note" aria-label="Download ${title}" href="${escapeHtml(downloadUrl)}"><i class="fa-solid fa-download"></i></a>`;

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

    if (searchInput) searchInput.addEventListener('input', update);
    if (sortSelect) sortSelect.addEventListener('change', update);
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

    const currentUser = getCurrentUser();
    const sidebarName = document.querySelector('.sidebar-user h3');
    if (sidebarName && currentUser?.name) sidebarName.textContent = currentUser.name;
}
