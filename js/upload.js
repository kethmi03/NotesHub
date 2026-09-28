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

    const currentUser = getCurrentUser();
    const note = {
        title: document.getElementById('note-title').value.trim(),
        subject: document.getElementById('note-subject').value,
        module: document.getElementById('note-module').value.trim(),
        gradeLevel: document.getElementById('note-semester').value,
        description: document.getElementById('note-description').value.trim(),
        tags: document.getElementById('note-tags').value.trim(),
        fileName: file.name,
        uploadedBy: currentUser?.email || 'student',
        uploadedAt: new Date().toISOString()
    };

    if (isFirebaseConfigured) {
        if (!currentUser?.uid) {
            showFormMessage(messageElement, 'error', 'Please log in again before uploading.');
            return;
        }
        try {
            await uploadNoteToFirebase(note, file, currentUser);
        } catch (error) {
            showFormMessage(messageElement, 'error', 'Upload failed. Please try again.');
            return;
        }
    } else {
        const notes = getNotes();
        notes.push(note);
        saveNotes(notes);
    }

    showFormMessage(messageElement, 'success', 'Your note was added successfully.');
    event.target.reset();

    const fileLabel = document.querySelector('#fileUploadArea h3');
    if (fileLabel) fileLabel.textContent = 'Drag & Drop your file here';
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
