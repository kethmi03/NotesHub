const USERS_KEY = 'notesHubUsers';
const CURRENT_USER_KEY = 'notesHubCurrentUser';
const NOTES_KEY = 'notesHubNotes';
const SAVED_NOTES_KEY = 'notesHubSavedNotes';
const DELETED_DEFAULT_NOTES_KEY = 'notesHubDeletedDefaults';

export const DEFAULT_SYSTEM_USERS = [
    {
        name: 'NotesHub Admin',
        email: 'admin@gmail.com',
        role: 'admin',
        createdAt: '2026-09-01T00:00:00.000Z',
        status: 'active'
    },
    {
        name: 'Ramuthu theniya',
        email: 'ramuthu@gmail.com',
        role: 'student',
        gradeLevel: 'Grade 12 - 13',
        semester: 'Semester 1',
        createdAt: '2026-10-15T08:30:00.000Z',
        status: 'active'
    },
    {
        name: 'Sarah Jenkins',
        email: 'sarah.jenkins@gmail.com',
        role: 'student',
        gradeLevel: 'Year 3 (Undergraduate)',
        semester: 'Semester 1',
        createdAt: '2026-09-15T10:00:00.000Z',
        status: 'active'
    },
    {
        name: 'Mike Ross',
        email: 'mike.ross@gmail.com',
        role: 'student',
        gradeLevel: 'Year 2 (Undergraduate)',
        semester: 'Semester 1',
        createdAt: '2026-09-18T14:20:00.000Z',
        status: 'active'
    },
    {
        name: 'Emma Watson',
        email: 'emma.watson@gmail.com',
        role: 'student',
        gradeLevel: 'Year 2 (Undergraduate)',
        semester: 'Semester 2',
        createdAt: '2026-09-20T11:15:00.000Z',
        status: 'active'
    },
    {
        name: 'John Doe',
        email: 'john.doe@gmail.com',
        role: 'student',
        gradeLevel: 'Year 3 (Undergraduate)',
        semester: 'Semester 2',
        createdAt: '2026-09-25T09:40:00.000Z',
        status: 'active'
    }
];

export function dispatchDataChange(type, data = {}) {
    try {
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('noteshub:sync', { 
                detail: { type, ...data, timestamp: Date.now() } 
            }));
        }
    } catch (e) {
        // ignore in non-browser environments
    }
}

export function getUsers() {
    try {
        return JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
    } catch (error) {
        return [];
    }
}

export function saveUsers(users) {
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
    dispatchDataChange('users-updated');
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
    dispatchDataChange('notes-updated');
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
    dispatchDataChange('current-user-updated', { user });
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
    dispatchDataChange('saved-notes-updated');
    return true;
}

export function removeSavedNote(noteId) {
    const savedNotes = getSavedNotes();
    const updatedNotes = savedNotes.filter((note) => String(note.id) !== String(noteId));
    localStorage.setItem(getSavedNotesStorageKey(), JSON.stringify(updatedNotes));
    dispatchDataChange('saved-notes-updated');
    return updatedNotes.length !== savedNotes.length;
}

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
        dispatchDataChange('deleted-defaults-updated');
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

    dispatchDataChange('note-deleted', { noteId: idStr });
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
    dispatchDataChange('note-reported', { noteId: idStr, reason });
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
    dispatchDataChange('report-dismissed', { noteId: idStr });
    return true;
}

export function deleteUserAccount(email) {
    if (!email) return false;
    const emailLower = email.toLowerCase();
    const users = getUsers();
    const filtered = users.filter(u => u.email.toLowerCase() !== emailLower);
    saveUsers(filtered);

    const current = getCurrentUser();
    if (current && current.email && current.email.toLowerCase() === emailLower) {
        setCurrentUser(null);
    }

    dispatchDataChange('user-deleted', { email: emailLower });
    return true;
}

export function toggleUserBlock(email) {
    if (!email) return false;
    const emailLower = email.toLowerCase();
    const users = getUsers();
    let user = users.find(u => u.email.toLowerCase() === emailLower);
    
    if (!user) {
        const defaultMatch = DEFAULT_SYSTEM_USERS.find(u => u.email.toLowerCase() === emailLower);
        user = defaultMatch ? { ...defaultMatch, blocked: true, status: 'blocked' } : {
            email: emailLower,
            name: emailLower.split('@')[0],
            role: 'student',
            blocked: true,
            status: 'blocked'
        };
        users.push(user);
    } else {
        user.blocked = !user.blocked;
        user.status = user.blocked ? 'blocked' : 'active';
    }
    saveUsers(users);

    const current = getCurrentUser();
    if (current && current.email && current.email.toLowerCase() === emailLower) {
        current.blocked = user.blocked;
        current.status = user.status;
        setCurrentUser(current);
    }

    dispatchDataChange('user-blocked-toggled', { email: emailLower, blocked: user.blocked });
    return user.blocked;
}

export function toggleUserRole(email) {
    if (!email) return false;
    const emailLower = email.toLowerCase();
    const users = getUsers();
    let user = users.find(u => u.email.toLowerCase() === emailLower);

    if (!user) {
        const defaultMatch = DEFAULT_SYSTEM_USERS.find(u => u.email.toLowerCase() === emailLower);
        user = defaultMatch ? { ...defaultMatch, role: defaultMatch.role === 'admin' ? 'student' : 'admin' } : {
            email: emailLower,
            name: emailLower.split('@')[0],
            role: 'admin',
            status: 'active'
        };
        users.push(user);
    } else {
        user.role = user.role === 'admin' ? 'student' : 'admin';
    }
    saveUsers(users);

    const current = getCurrentUser();
    if (current && current.email && current.email.toLowerCase() === emailLower) {
        current.role = user.role;
        setCurrentUser(current);
    }

    dispatchDataChange('user-role-toggled', { email: emailLower, role: user.role });
    return user.role;
}
