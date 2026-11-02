const USERS_KEY = 'notesHubUsers';
const CURRENT_USER_KEY = 'notesHubCurrentUser';
const NOTES_KEY = 'notesHubNotes';
const SAVED_NOTES_KEY = 'notesHubSavedNotes';
const NOTIFICATIONS_KEY = 'notesHubNotifications';

const DEFAULT_USERS = [
    { name: 'Deshan Siriwardhana', email: 'deshan@gmail.com', role: 'student', gradeLevel: 'Grade 6 - 9', semester: 'Semester 1', joinedAt: '2026-09-01T10:00:00Z', blocked: false },
    { name: 'Sarah Jenkins', email: 'sarah.j@student.sliit.lk', role: 'student', gradeLevel: 'Y3S1', semester: 'Semester 1', joinedAt: '2026-09-10T14:30:00Z', blocked: false },
    { name: 'Mike Ross', email: 'mike.ross@uoc.edu', role: 'student', gradeLevel: 'Y2S1', semester: 'Semester 1', joinedAt: '2026-09-12T08:20:00Z', blocked: false },
    { name: 'Emily Chen', email: 'emily.chen@mit.edu', role: 'student', gradeLevel: 'Undergraduate', semester: 'Semester 2', joinedAt: '2026-09-15T11:00:00Z', blocked: false },
    { name: 'John Doe', email: 'john.doe@uom.lk', role: 'student', gradeLevel: 'Y3S2', semester: 'Semester 2', joinedAt: '2026-09-18T16:45:00Z', blocked: false },
    { name: 'Emma Watson', email: 'emma.w@sliit.lk', role: 'student', gradeLevel: 'Y2S2', semester: 'Semester 2', joinedAt: '2026-09-20T09:15:00Z', blocked: false },
    { name: 'Rachel Green', email: 'rachel.green@harvard.edu', role: 'student', gradeLevel: 'Y1S1', semester: 'Semester 1', joinedAt: '2026-09-22T13:40:00Z', blocked: false },
    { name: 'David Miller', email: 'david.m@student.edu', role: 'student', gradeLevel: 'Y2S1', semester: 'Semester 1', joinedAt: '2026-09-25T15:20:00Z', blocked: false },
    { name: 'NotesHub Admin', email: 'admin@gmail.com', role: 'admin', gradeLevel: 'Faculty', semester: 'All', joinedAt: '2026-08-01T00:00:00Z', blocked: false }
];

export function getUsers() {
    try {
        const raw = localStorage.getItem(USERS_KEY);
        if (!raw) {
            localStorage.setItem(USERS_KEY, JSON.stringify(DEFAULT_USERS));
            return [...DEFAULT_USERS];
        }
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed) || parsed.length === 0) {
            localStorage.setItem(USERS_KEY, JSON.stringify(DEFAULT_USERS));
            return [...DEFAULT_USERS];
        }
        return parsed;
    } catch (error) {
        return [...DEFAULT_USERS];
    }
}

export function saveUsers(users) {
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

export function deleteUser(email) {
    const targetEmail = (email || '').toLowerCase();
    const users = getUsers().filter(u => (u.email || '').toLowerCase() !== targetEmail);
    saveUsers(users);
    return true;
}

export function toggleUserBlock(email) {
    const targetEmail = (email || '').toLowerCase();
    const users = getUsers();
    const user = users.find(u => (u.email || '').toLowerCase() === targetEmail);
    if (user) {
        user.blocked = !user.blocked;
        saveUsers(users);
        return user.blocked;
    }
    return false;
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

export function updateNoteStatus(noteId, status, rejectionReason = '') {
    const notes = getNotes();
    const targetId = String(noteId);
    const note = notes.find(n => String(n.id || n.title) === targetId);
    if (!note) return null;

    note.status = status;
    note.approvalStatus = status;
    note.reviewedAt = new Date().toISOString();
    if (status === 'rejected') {
        note.rejectionReason = rejectionReason || 'Content did not meet moderation guidelines.';
    } else if (status === 'approved') {
        delete note.rejectionReason;
    }

    saveNotes(notes);
    return note;
}

export function deleteNote(noteId) {
    const targetId = String(noteId);
    const notes = getNotes();
    const updated = notes.filter(n => String(n.id || n.title) !== targetId);
    saveNotes(updated);
    return updated.length !== notes.length;
}

export function getCurrentUser() {
    try {
        const user = JSON.parse(localStorage.getItem(CURRENT_USER_KEY) || 'null');
        if (user) {
            const email = (user.email || '').toLowerCase();
            if (email === 'admin@gmail.com') {
                user.role = 'admin';
            } else {
                user.role = 'student';
            }
        }
        return user;
    } catch (error) {
        return null;
    }
}

export function setCurrentUser(user) {
    if (user) {
        const email = (user.email || '').toLowerCase();
        if (email === 'admin@gmail.com') {
            user.role = 'admin';
        } else {
            user.role = 'student';
        }
        localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
    } else {
        localStorage.removeItem(CURRENT_USER_KEY);
    }
}

function getSavedNotesStorageKey() {
    const currentUser = getCurrentUser();
    const userId = currentUser?.uid || currentUser?.email?.toLowerCase() || currentUser?.name?.toLowerCase() || 'default';
    return `${SAVED_NOTES_KEY}:${userId}`;
}

export function getSavedNotes() {
    try {
        const raw = localStorage.getItem(getSavedNotesStorageKey());
        if (!raw) return [];
        return JSON.parse(raw);
    } catch (error) {
        console.error('Saved notes could not be parsed.', error);
        return [];
    }
}

export function saveNoteForLater(note) {
    if (!note?.id && !note?.title) {
        return false;
    }

    const noteId = String(note.id || note.title);
    const savedNotes = getSavedNotes();
    if (savedNotes.some((savedNote) => String(savedNote.id || savedNote.title) === noteId)) {
        return false;
    }

    savedNotes.unshift({
        ...note,
        id: noteId,
        savedAt: new Date().toISOString()
    });
    localStorage.setItem(getSavedNotesStorageKey(), JSON.stringify(savedNotes));
    return true;
}

export function removeSavedNote(noteId) {
    const targetId = String(noteId);
    const savedNotes = getSavedNotes();
    const updatedNotes = savedNotes.filter((note) => String(note.id || note.title) !== targetId);
    localStorage.setItem(getSavedNotesStorageKey(), JSON.stringify(updatedNotes));
    return updatedNotes.length !== savedNotes.length;
}

// ================= NOTIFICATIONS SYSTEM =================
export function getNotifications() {
    try {
        return JSON.parse(localStorage.getItem(NOTIFICATIONS_KEY) || '[]');
    } catch (error) {
        return [];
    }
}

export function saveNotifications(notifications) {
    localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(notifications));
}

export function addNotification(notification) {
    const list = getNotifications();
    const newNotif = {
        id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        createdAt: new Date().toISOString(),
        read: false,
        ...notification
    };
    list.unshift(newNotif);
    saveNotifications(list);
    return newNotif;
}

export function getUserNotifications(userEmail, userName) {
    const all = getNotifications();
    const email = (userEmail || '').toLowerCase();
    const name = (userName || '').toLowerCase();

    return all.filter(n => {
        const notifEmail = (n.userEmail || '').toLowerCase();
        const notifName = (n.userName || '').toLowerCase();
        if (email && notifEmail && notifEmail === email) return true;
        if (name && notifName && notifName === name) return true;
        return false;
    });
}

export function markNotificationAsRead(notifId) {
    const all = getNotifications();
    const item = all.find(n => n.id === notifId);
    if (item) {
        item.read = true;
        saveNotifications(all);
        return true;
    }
    return false;
}

export function markAllNotificationsAsRead(userEmail, userName) {
    const all = getNotifications();
    const email = (userEmail || '').toLowerCase();
    const name = (userName || '').toLowerCase();

    all.forEach(n => {
        const notifEmail = (n.userEmail || '').toLowerCase();
        const notifName = (n.userName || '').toLowerCase();
        if ((email && notifEmail === email) || (name && notifName === name)) {
            n.read = true;
        }
    });
    saveNotifications(all);
}

export function deleteNotification(notifId) {
    const all = getNotifications().filter(n => n.id !== notifId);
    saveNotifications(all);
}
