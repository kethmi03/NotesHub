import { getNotes, getUsers } from './storage.js';
import { getFirebaseNotes, getFirebaseUsers, isFirebaseConfigured } from './firebase.js';

export async function setupDashboard() {
    const dashboardSection = document.querySelector('.dashboard-section');
    if (!dashboardSection) return;

    const allNotes = isFirebaseConfigured ? await getFirebaseNotes() : getNotes();
    const users = isFirebaseConfigured ? await getFirebaseUsers() : getUsers();
    const metrics = {
        users: users.length,
        notes: allNotes.length,
        pending: allNotes.filter(note => note.status === 'pending' || note.approvalStatus === 'pending').length,
        reported: allNotes.filter(note => note.reported === true || note.reportCount > 0 || note.status === 'reported').length,
        blocked: users.filter(user => user.blocked === true || user.status === 'blocked').length
    };

    Object.entries(metrics).forEach(([metric, value]) => {
        const element = document.querySelector(`[data-admin-stat="${metric}"]`);
        if (element) element.textContent = value;
    });
}
