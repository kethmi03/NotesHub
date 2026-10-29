import { loadNavbar, loadFooter, updateNavbarState } from './components.js';
import { handleRegisterSubmit, handleLoginSubmit, handleLogout, setupAuthRedirect, handleProtectedLink, redirectToAuthPage } from './auth.js';
import { handleUploadSubmit, setupFileUpload } from './upload.js';
import { setupBrowsePage } from './browse.js';
import { setupDashboard } from './dashboard.js';
import { getCurrentUser } from './storage.js';
import { setupNoteDetails, setupSavedNotes } from './saved-notes.js';
import { setupSettingsPage } from './settings.js';
import { setupMyNotesPage } from './my-notes.js';

export function updateUserInfo() {
    const currentUser = getCurrentUser();
    const isAdminDashboard = document.querySelector('[data-dashboard-role="admin"]');

    if (!isAdminDashboard) {
        updateNavbarState(currentUser);
    }

    if (!currentUser) return;

    const isAdmin = currentUser.role === 'admin' || currentUser.email?.toLowerCase() === 'admin@gmail.com';
    const userName = currentUser.name || (isAdmin ? 'NotesHub Admin' : 'Student');

    // 1. Update sidebar user information across any dashboard page
    const sidebarName = document.querySelector('.sidebar-user h3');
    if (sidebarName) sidebarName.textContent = userName;

    const sidebarSubtitle = document.querySelector('.sidebar-user p');
    if (sidebarSubtitle) {
        sidebarSubtitle.textContent = isAdmin ? 'System Administrator' : 'Student Account';
    }

    const sidebarAvatar = document.querySelector('.sidebar-user .avatar-large');
    if (sidebarAvatar) {
        if (isAdmin) {
            sidebarAvatar.style.background = '#eef2ff';
            sidebarAvatar.style.color = '#4f46e5';
            sidebarAvatar.innerHTML = '<i class="fa-solid fa-shield-halved"></i>';
        } else {
            const avatarMap = {
                student: { icon: 'fa-user-graduate', color: '#4f46e5', bg: '#eef2ff' },
                scholar: { icon: 'fa-graduation-cap', color: '#0284c7', bg: '#e0f2fe' },
                coder: { icon: 'fa-laptop-code', color: '#059669', bg: '#ecfdf5' },
                reader: { icon: 'fa-book-open', color: '#d97706', bg: '#fef3c7' },
                scientist: { icon: 'fa-flask', color: '#7c3aed', bg: '#f5f3ff' },
                brain: { icon: 'fa-brain', color: '#db2777', bg: '#fdf2f8' },
                rocket: { icon: 'fa-rocket', color: '#ea580c', bg: '#fff7ed' },
                user: { icon: 'fa-user', color: '#475569', bg: '#f1f5f9' }
            };
            const preset = avatarMap[currentUser.avatar] || avatarMap.student;
            sidebarAvatar.style.background = preset.bg;
            sidebarAvatar.style.color = preset.color;
            sidebarAvatar.innerHTML = `<i class="fa-solid ${preset.icon}"></i>`;
        }
    }

    // 2. Synchronize Overview links in sidebar
    const overviewLinks = document.querySelectorAll('.sidebar-nav a[href="dashboard.html"], .sidebar-nav a[href="admin-dashboard.html"]');
    overviewLinks.forEach(link => {
        if (isAdmin) {
            link.href = 'admin-dashboard.html';
            link.innerHTML = '<i class="fa-solid fa-chart-pie"></i> Admin Overview';
        } else {
            link.href = 'dashboard.html';
            link.innerHTML = '<i class="fa-solid fa-chart-pie"></i> Overview';
        }
    });

    // 3. For Admin viewing student pages (my-notes, saved-notes, settings), inject Admin link in sidebar
    if (isAdmin && !isAdminDashboard) {
        const sidebarNav = document.querySelector('.sidebar-nav');
        if (sidebarNav && !sidebarNav.querySelector('.admin-panel-sidebar-link')) {
            const adminLink = document.createElement('a');
            adminLink.href = 'admin-dashboard.html';
            adminLink.className = 'admin-panel-sidebar-link';
            adminLink.style.background = 'rgba(79, 70, 229, 0.08)';
            adminLink.style.color = '#4f46e5';
            adminLink.style.fontWeight = '700';
            adminLink.innerHTML = '<i class="fa-solid fa-shield-halved"></i> Admin Control Center';
            sidebarNav.prepend(adminLink);
        }
    }

    // 4. Update cancel button on upload-note.html if admin
    const uploadCancelBtn = document.querySelector('.upload-form .cancel-btn');
    if (uploadCancelBtn && isAdmin) {
        uploadCancelBtn.href = 'admin-dashboard.html';
    }

    // 5. Update welcome message on student dashboard
    const isStudentOverview = window.location.pathname.split('/').pop() === 'dashboard.html';
    const welcomeHeading = isStudentOverview ? (document.getElementById('studentWelcomeHeading') || document.querySelector('.dashboard-header h2')) : null;
    if (welcomeHeading) {
        welcomeHeading.textContent = `Welcome back, ${userName}! 👋`;
    }

    // 6. Update settings inputs if present
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

    // Expose auth helper to global window for index.html hero buttons
    if (typeof window !== 'undefined') {
        window.redirectToAuthPage = redirectToAuthPage;
    }

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
    setupMyNotesPage();

    // Attach component-related listeners
    setTimeout(() => {
        updateUserInfo();

        const logoutBtns = document.querySelectorAll('.logout-btn');
        logoutBtns.forEach(btn => {
            btn.addEventListener('click', handleLogout);
        });

        const protectedLinks = document.querySelectorAll('.protected-link, a[href="upload-note.html"], a[href="browse-notes.html"]');
        protectedLinks.forEach(link => {
            link.addEventListener('click', handleProtectedLink);
        });
    }, 50);

    setupAuthRedirect();

    // Listen to real-time cross-tab and cross-component sync events
    window.addEventListener('storage', () => {
        updateUserInfo();
        setupAuthRedirect();
    });
    window.addEventListener('noteshub:sync', () => {
        updateUserInfo();
        setupAuthRedirect();
    });
});

