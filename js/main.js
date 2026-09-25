import { loadNavbar, loadFooter, updateNavbarState } from './components.js';
import { handleRegisterSubmit, handleLoginSubmit, handleLogout, setupAuthRedirect, handleProtectedLink } from './auth.js';
import { handleUploadSubmit, setupFileUpload } from './upload.js';
import { setupBrowsePage } from './browse.js';
import { setupDashboard } from './dashboard.js';
import { getCurrentUser } from './storage.js';

function updateUserInfo() {
    const currentUser = getCurrentUser();
    updateNavbarState(currentUser);

    if (document.querySelector('[data-dashboard-role="admin"]')) return;
    if (!currentUser) return;
    const userName = currentUser.name || 'Student';

    // Update sidebar user info on dashboard
    const sidebarName = document.querySelector('.sidebar-user h3');
    if (sidebarName) sidebarName.textContent = userName;

    // Update welcome message on dashboard
    const welcomeHeading = document.querySelector('.dashboard-header h2');
    if (welcomeHeading) welcomeHeading.textContent = `Welcome back, ${userName}! 👋`;
}

document.addEventListener('DOMContentLoaded', () => {
    // Inject dynamic components
    loadNavbar();
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
