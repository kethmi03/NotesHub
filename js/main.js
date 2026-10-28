import { loadNavbar, loadFooter, updateNavbarState } from './components.js';
import { handleRegisterSubmit, handleLoginSubmit, handleLogout, setupAuthRedirect, handleProtectedLink } from './auth.js';
import { handleUploadSubmit, setupFileUpload } from './upload.js';
import { setupBrowsePage } from './browse.js';
import { setupDashboard } from './dashboard.js';
import { getCurrentUser } from './storage.js';
import { setupNoteDetails, setupSavedNotes } from './saved-notes.js';
import { setupSettingsPage } from './settings.js';

function updateUserInfo() {
    const currentUser = getCurrentUser();

    if (document.querySelector('[data-dashboard-role="admin"]')) return;

    updateNavbarState(currentUser);
    if (!currentUser) return;
    const userName = currentUser.name || 'Student';

    // Update sidebar user info on dashboard
    const sidebarName = document.querySelector('.sidebar-user h3');
    if (sidebarName) sidebarName.textContent = userName;

    // Update welcome message on dashboard
    const isOverviewPage = window.location.pathname.split('/').pop() === 'dashboard.html';
    const welcomeHeading = isOverviewPage ? document.querySelector('.dashboard-header h2') : null;
    if (welcomeHeading) welcomeHeading.textContent = `Welcome back, ${userName}! 👋`;

    // Update settings inputs if present
    const fullNameInput = document.getElementById('full-name');
    const emailInput = document.getElementById('email');
    if (fullNameInput && !fullNameInput.dataset.userEdited) {
        fullNameInput.value = currentUser.name || '';
    }
    if (emailInput && !emailInput.dataset.userEdited) {
        emailInput.value = currentUser.email || '';
    }
}

document.addEventListener('DOMContentLoaded', () => {
    // Inject dynamic components
    const isAdminDashboard = document.querySelector('[data-dashboard-role="admin"]');
    if (!isAdminDashboard) loadNavbar();
    loadFooter();

    // Attach form event listeners
    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
        registerForm.addEventListener('submit', handleRegisterSubmit);
    }

    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLoginSubmit);
    }

    const uploadForm = document.getElementById('uploadForm');
    if (uploadForm) {
        uploadForm.addEventListener('submit', handleUploadSubmit);
    }

    setupFileUpload();
    setupBrowsePage();
    setupDashboard();
    setupNoteDetails();
    setupSavedNotes();
    setupSettingsPage();

    // Wait slightly for components to be inserted into DOM, then attach component-related listeners
    setTimeout(() => {
        updateUserInfo();

        const logoutBtn = document.querySelector('.logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', handleLogout);
        }

        const protectedLinks = document.querySelectorAll('.protected-link, a[href="upload-note.html"], a[href="browse-notes.html"]');
        protectedLinks.forEach(link => {
            link.addEventListener('click', handleProtectedLink);
        });
    }, 50);

    setupAuthRedirect();
});
