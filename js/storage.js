const USERS_KEY = 'notesHubUsers';
const CURRENT_USER_KEY = 'notesHubCurrentUser';
const NOTES_KEY = 'notesHubNotes';

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
