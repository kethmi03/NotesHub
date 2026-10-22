const USERS_KEY = 'notesHubUsers';
const CURRENT_USER_KEY = 'notesHubCurrentUser';
const NOTES_KEY = 'notesHubNotes';
const SAVED_NOTES_KEY = 'notesHubSavedNotes';

export function getUsers() {
    try {
        return JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
    } catch (error) {
        return [];
    }
}

export function saveUsers(users) {
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

export function getNotes() {
    try {
        return JSON.parse(localStorage.getItem(NOTES_KEY) || '[]');
    } catch (error) {
        return [];
    }
}

export function saveNotes(notes) {
    localStorage.setItem(NOTES_KEY, JSON.stringify(notes));
}

export function getCurrentUser() {
    try {
        return JSON.parse(localStorage.getItem(CURRENT_USER_KEY) || 'null');
    } catch (error) {
        return null;
    }
}

export function setCurrentUser(user) {
    if (user) {
        localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
    } else {
        localStorage.removeItem(CURRENT_USER_KEY);
    }
}

function getSavedNotesStorageKey() {
    const currentUser = getCurrentUser();
    const userId = currentUser?.uid || currentUser?.email?.toLowerCase();

    if (!userId) {
        throw new Error('A signed-in user is required to manage saved notes.');
    }

    return `${SAVED_NOTES_KEY}:${userId}`;
}

export function getSavedNotes() {
    try {
        return JSON.parse(localStorage.getItem(getSavedNotesStorageKey()) || '[]');
    } catch (error) {
        if (error instanceof SyntaxError) {
            console.error('Saved notes could not be parsed.', error);
            return [];
        }
        throw error;
    }
}

export function saveNoteForLater(note) {
    if (!note?.id) {
        throw new Error('A note ID is required to save a note.');
    }

    const savedNotes = getSavedNotes();
    if (savedNotes.some((savedNote) => savedNote.id === note.id)) return false;

    savedNotes.unshift({ ...note, savedAt: new Date().toISOString() });
    localStorage.setItem(getSavedNotesStorageKey(), JSON.stringify(savedNotes));
    return true;
}

export function removeSavedNote(noteId) {
    const savedNotes = getSavedNotes();
    const updatedNotes = savedNotes.filter((note) => note.id !== noteId);
    localStorage.setItem(getSavedNotesStorageKey(), JSON.stringify(updatedNotes));
    return updatedNotes.length !== savedNotes.length;
}
