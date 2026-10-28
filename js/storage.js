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
    const updatedNotes = savedNotes.filter((note) => String(note.id) !== String(noteId));
    localStorage.setItem(getSavedNotesStorageKey(), JSON.stringify(updatedNotes));
    return updatedNotes.length !== savedNotes.length;
}

const DELETED_DEFAULT_NOTES_KEY = 'notesHubDeletedDefaults';

export function getDeletedDefaultNoteIds() {
    try {
        return JSON.parse(localStorage.getItem(DELETED_DEFAULT_NOTES_KEY) || '[]');
    } catch {
        return [];
    }
}

export function markDefaultNoteDeleted(noteId) {
    const list = getDeletedDefaultNoteIds();
    const idStr = String(noteId);
    if (!list.includes(idStr)) {
        list.push(idStr);
        localStorage.setItem(DELETED_DEFAULT_NOTES_KEY, JSON.stringify(list));
    }
}

export function deleteNote(noteId) {
    if (!noteId) return false;
    const idStr = String(noteId);
    markDefaultNoteDeleted(idStr);

    const notes = getNotes();
    const filtered = notes.filter(n => String(n.id) !== idStr && String(n.title) !== idStr);
    saveNotes(filtered);

    try {
        removeSavedNote(idStr);
    } catch {
        // Ignore if user not logged in
    }

    return true;
}

export function reportNote(noteId, reason = 'Flagged for review') {
    if (!noteId) return false;
    const idStr = String(noteId);
    const notes = getNotes();
    const existing = notes.find(n => String(n.id) === idStr || String(n.title) === idStr);

    if (existing) {
        existing.reported = true;
        existing.reportReason = reason;
        existing.reportCount = (existing.reportCount || 0) + 1;
        saveNotes(notes);
    } else {
        notes.push({
            id: idStr,
            reported: true,
            reportReason: reason,
            reportCount: 1,
            reportedAt: new Date().toISOString()
        });
        saveNotes(notes);
    }
    return true;
}

export function dismissReport(noteId) {
    if (!noteId) return false;
    const idStr = String(noteId);
    const notes = getNotes();
    const existing = notes.find(n => String(n.id) === idStr || String(n.title) === idStr);
    if (existing) {
        existing.reported = false;
        existing.reportReason = null;
        saveNotes(notes);
    }
    return true;
}

export function deleteUserAccount(email) {
    if (!email) return false;
    const emailLower = email.toLowerCase();
    const users = getUsers();
    const filtered = users.filter(u => u.email.toLowerCase() !== emailLower);
    saveUsers(filtered);
    return true;
}

export function toggleUserBlock(email) {
    if (!email) return false;
    const emailLower = email.toLowerCase();
    const users = getUsers();
    let user = users.find(u => u.email.toLowerCase() === emailLower);
    if (!user) {
        user = { email: emailLower, name: emailLower.split('@')[0], role: 'student', blocked: true, status: 'blocked' };
        users.push(user);
    } else {
        user.blocked = !user.blocked;
        user.status = user.blocked ? 'blocked' : 'active';
    }
    saveUsers(users);
    return user.blocked;
}

export function toggleUserRole(email) {
    if (!email) return false;
    const emailLower = email.toLowerCase();
    const users = getUsers();
    let user = users.find(u => u.email.toLowerCase() === emailLower);
    if (!user) {
        user = { email: emailLower, name: emailLower.split('@')[0], role: 'admin' };
        users.push(user);
    } else {
        user.role = user.role === 'admin' ? 'student' : 'admin';
    }
    saveUsers(users);
    return user.role;
}
