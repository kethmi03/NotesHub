import { getNotes, saveNotes, getCurrentUser } from './storage.js';
import { showFormMessage } from './auth.js';
import { isFirebaseConfigured, uploadNoteToFirebase } from './firebase.js';

export async function handleUploadSubmit(event) {
    event.preventDefault();

    const fileInput = document.getElementById('note-file');
    const messageElement = document.getElementById('uploadMessage');
    const file = fileInput?.files[0];

    if (!file) {
        showFormMessage(messageElement, 'error', 'Please choose a notes file to upload.');
        return;
    }

    if (file.size > 20 * 1024 * 1024) {
        showFormMessage(messageElement, 'error', 'The selected file must be smaller than 20MB.');
        return;
    }

    const currentUser = getCurrentUser() || { name: 'Student', email: 'student@noteshub.com' };

    // Determine file type from extension
    const ext = file.name.split('.').pop().toLowerCase();
    let fileType = 'pdf';
    if (['doc', 'docx'].includes(ext)) fileType = 'word';
    else if (['ppt', 'pptx'].includes(ext)) fileType = 'powerpoint';

    const noteId = `note-${Date.now()}`;
    const newNote = {
        id: noteId,
        title: document.getElementById('note-title')?.value.trim() || 'Untitled Note',
        subject: document.getElementById('note-subject')?.value || 'Computer Science',
        module: document.getElementById('note-module')?.value.trim() || 'General',
        gradeLevel: document.getElementById('note-semester')?.value || 'Undergraduate',
        docType: document.getElementById('note-doctype')?.value || 'Lecture Notes',
        description: document.getElementById('note-description')?.value.trim() || 'Student uploaded study material.',
        tags: document.getElementById('note-tags')?.value.trim() || '',
        fileName: file.name,
        type: fileType,
        pages: Math.floor(Math.random() * 25) + 12,
        academicYear: '2025/2026',
        university: currentUser.university || 'University',
        uploadedBy: currentUser.name || 'Student',
        uploadedByName: currentUser.name || 'Student',
        uploadedByEmail: (currentUser.email || '').toLowerCase(),
        uploadedAt: new Date().toISOString(),
        rating: 5.0,
        ratingPercent: 100,
        reviews: 1,
        downloads: 0,
        upvotes: 1,
        isNew: true,
        isTrending: true,
        isPopular: false,
        isTopRated: true,
        status: 'approved'
    };

    // Save note to localStorage immediately so it is instantly available everywhere
    const notes = getNotes();
    notes.unshift(newNote); // Prepend to top so it appears first on browse and my-notes
    saveNotes(notes);

    // If Firebase is active and user has a uid, sync in background without blocking
    if (isFirebaseConfigured && currentUser?.uid) {
        uploadNoteToFirebase(newNote, file, currentUser).catch(err => {
            console.warn('Firebase upload note background sync deferred:', err);
        });
    }

    showFormMessage(messageElement, 'success', 'Note uploaded successfully! Redirecting to your notes...');
    event.target.reset();

    const fileLabel = document.querySelector('#fileUploadArea h3');
    if (fileLabel) fileLabel.textContent = 'Drag & Drop your file here';

    setTimeout(() => {
        window.location.href = 'my-notes.html';
    }, 1200);
}

export function setupFileUpload() {
    const uploadArea = document.getElementById('fileUploadArea');
    const fileInput = document.getElementById('note-file');
    if (!uploadArea || !fileInput) return;

    const updateFileName = () => {
        const fileLabel = uploadArea.querySelector('h3');
        const file = fileInput.files[0];
        if (fileLabel && file) fileLabel.textContent = file.name;
    };

    fileInput.addEventListener('change', updateFileName);
    ['dragenter', 'dragover'].forEach((eventName) => {
        uploadArea.addEventListener(eventName, (event) => {
            event.preventDefault();
            uploadArea.classList.add('drag-over');
        });
    });
    ['dragleave', 'drop'].forEach((eventName) => {
        uploadArea.addEventListener(eventName, (event) => {
            event.preventDefault();
            uploadArea.classList.remove('drag-over');
        });
    });
    uploadArea.addEventListener('drop', (event) => {
        fileInput.files = event.dataTransfer.files;
        updateFileName();
    });
}
