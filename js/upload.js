import { getNotes, saveNotes, getCurrentUser } from './storage.js';
import { showFormMessage } from './auth.js';
import { isFirebaseConfigured, uploadNoteToFirebase } from './firebase.js';
import { saveUploadedFile } from './file-storage.js';
import { formatFileSize, detectDocumentPages } from './document-parser.js';

export async function handleUploadSubmit(event) {
    event.preventDefault();

    const fileInput = document.getElementById('note-file');
    const messageElement = document.getElementById('uploadMessage');
    const submitBtn = event.target.querySelector('button[type="submit"]');
    const file = fileInput?.files[0];

    if (!file) {
        showFormMessage(messageElement, 'error', 'Please choose a notes file to upload.');
        return;
    }

    if (file.size > 20 * 1024 * 1024) {
        showFormMessage(messageElement, 'error', 'The selected file must be smaller than 20MB.');
        return;
    }

    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Uploading & Analyzing...';
    }

    const currentUser = getCurrentUser() || { name: 'Student', email: 'student@noteshub.com' };

    // Determine file type and format from extension
    const ext = (file.name.split('.').pop() || 'pdf').toLowerCase();
    let fileType = 'pdf';
    if (['doc', 'docx'].includes(ext)) fileType = 'word';
    else if (['ppt', 'pptx'].includes(ext)) fileType = 'powerpoint';

    const noteId = `note-${Date.now()}`;
    const rawTags = document.getElementById('note-tags')?.value.trim() || '';
    const subject = document.getElementById('note-subject')?.value || 'Computer Science';
    const courseModule = document.getElementById('note-module')?.value.trim() || 'General';
    const docType = document.getElementById('note-doctype')?.value || 'Lecture Notes';

    const parsedTags = rawTags
        ? rawTags.split(',').map(t => t.trim().replace(/^#/, '')).filter(Boolean)
        : [subject, courseModule, docType].map(s => s.toLowerCase().replace(/\s+/g, '-'));

    // Detect actual page count from file or user-entered value
    const enteredPages = parseInt(document.getElementById('note-pages')?.value, 10);
    let finalPages = 1;
    if (!isNaN(enteredPages) && enteredPages > 0) {
        finalPages = enteredPages;
    } else {
        finalPages = await detectDocumentPages(file);
    }

    const finalFileSize = formatFileSize(file.size);
    const nowIso = new Date().toISOString();

    const newNote = {
        id: noteId,
        isUserUploaded: true,
        createdAt: nowIso,
        title: document.getElementById('note-title')?.value.trim() || 'Untitled Note',
        subject: subject,
        module: courseModule,
        gradeLevel: document.getElementById('note-semester')?.value || 'Undergraduate',
        docType: docType,
        description: document.getElementById('note-description')?.value.trim() || 'Comprehensive student-curated lecture notes and revision study materials.',
        tags: parsedTags,
        fileName: file.name,
        fileSize: finalFileSize,
        type: fileType,
        format: ext.toUpperCase(),
        pages: finalPages,
        academicYear: '2025/2026',
        university: currentUser.university || 'University',
        uploadedBy: currentUser.name || 'Student',
        uploadedByName: currentUser.name || 'Student',
        uploadedByEmail: (currentUser.email || '').toLowerCase(),
        uploadedAt: nowIso,
        rating: 0,
        ratingPercent: 0,
        reviews: 0,
        reviewsList: [],
        downloads: 0,
        upvotes: 0,
        isNew: true,
        isTrending: true,
        isPopular: false,
        isTopRated: false,
        status: 'pending',
        approvalStatus: 'pending'
    };

    // Store physical file in IndexedDB so download always works
    await saveUploadedFile(noteId, file);

    // Save note metadata to local storage
    const notes = getNotes();
    notes.unshift(newNote); // Prepend so it appears first on browse and my-notes
    saveNotes(notes);

    // Background cloud sync to Firebase if available
    if (isFirebaseConfigured && currentUser?.uid) {
        uploadNoteToFirebase(newNote, file, currentUser).then(fbId => {
            if (fbId) {
                const updatedNotes = getNotes();
                const idx = updatedNotes.findIndex(n => n.id === noteId);
                if (idx !== -1) {
                    updatedNotes[idx].firebaseId = fbId;
                    saveNotes(updatedNotes);
                }
            }
        }).catch(err => {
            console.warn('Firebase upload background sync deferred:', err);
        });
    }

    showFormMessage(messageElement, 'success', `Note uploaded successfully! (${finalFileSize} • ${finalPages} pages). Submitted for admin approval.`);
    event.target.reset();

    const fileLabel = document.getElementById('uploadAreaTitle') || document.querySelector('#fileUploadArea h3');
    if (fileLabel) fileLabel.textContent = 'Drag & Drop your file here';
    const metaBadge = document.getElementById('uploadFileMetaBadge');
    if (metaBadge) metaBadge.style.display = 'none';

    setTimeout(() => {
        window.location.href = `view-note.html?id=${encodeURIComponent(noteId)}`;
    }, 1200);
}

export function setupFileUpload() {
    const uploadArea = document.getElementById('fileUploadArea');
    const fileInput = document.getElementById('note-file');
    if (!uploadArea || !fileInput) return;

    const handleFileSelection = async () => {
        const file = fileInput.files[0];
        if (!file) return;

        const fileLabel = document.getElementById('uploadAreaTitle') || uploadArea.querySelector('h3');
        const metaBadge = document.getElementById('uploadFileMetaBadge');
        const infoText = document.getElementById('detectedFileInfoText');
        const pagesInput = document.getElementById('note-pages');

        if (fileLabel) fileLabel.textContent = file.name;

        const formattedSize = formatFileSize(file.size);

        if (metaBadge && infoText) {
            infoText.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> ${formattedSize} • Analyzing document pages...`;
            metaBadge.style.display = 'block';
        }

        // Detect real page count from file buffer
        const detectedPages = await detectDocumentPages(file);

        if (pagesInput) {
            pagesInput.value = detectedPages;
        }

        if (metaBadge && infoText) {
            infoText.innerHTML = `<i class="fa-solid fa-circle-check" style="color: #10b981;"></i> <strong>${formattedSize}</strong> • <strong>${detectedPages}</strong> Page${detectedPages === 1 ? '' : 's'}`;
        }
    };

    fileInput.addEventListener('change', handleFileSelection);

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
        if (event.dataTransfer.files && event.dataTransfer.files.length > 0) {
            fileInput.files = event.dataTransfer.files;
            handleFileSelection();
        }
    });
}
