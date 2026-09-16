// This script handles static frontend interactions and basic auth flow.

const USERS_KEY = 'notesHubUsers';
const CURRENT_USER_KEY = 'notesHubCurrentUser';

function getUsers() {
    try {
        return JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
    } catch (error) {
        return [];
    }
}

function saveUsers(users) {
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

function getCurrentUser() {
    try {
        return JSON.parse(localStorage.getItem(CURRENT_USER_KEY) || 'null');
    } catch (error) {
        return null;
    }
}

function showFormMessage(element, type, message) {
    if (!element) return;
    element.textContent = message;
    element.className = `form-message ${type}`;
}

function redirectToAuthPage(event) {
    if (event) event.preventDefault();

    const hasExistingUsers = getUsers().length > 0;
    window.location.href = hasExistingUsers ? 'login.html' : 'register.html';
}

function handleProtectedLink(event) {
    const loggedOutPages = ['index.html', 'login.html', 'register.html', ''];
    let currentPage = window.location.pathname.split('/').pop();

    if (currentPage === '') currentPage = 'index.html';

    if (loggedOutPages.includes(currentPage) && !getCurrentUser()) {
        redirectToAuthPage(event);
    }
}

function handleRegisterSubmit(event) {
    event.preventDefault();

    const name = document.getElementById('reg-name')?.value.trim();
    const email = document.getElementById('reg-email')?.value.trim();
    const password = document.getElementById('reg-password')?.value;
    const confirmPassword = document.getElementById('reg-confirm-password')?.value;
    const messageElement = document.getElementById('registerMessage');

    if (!name || !email || !password || !confirmPassword) {
        showFormMessage(messageElement, 'error', 'Please fill in all fields.');
        return;
    }

    if (password !== confirmPassword) {
        showFormMessage(messageElement, 'error', 'Passwords do not match.');
        return;
    }

    const users = getUsers();
    const emailExists = users.some((user) => user.email.toLowerCase() === email.toLowerCase());

    if (emailExists) {
        showFormMessage(messageElement, 'error', 'An account with this email already exists.');
        return;
    }

    users.push({
        name,
        email: email.toLowerCase(),
        password
    });

    saveUsers(users);
    showFormMessage(messageElement, 'success', 'Registration successful! Redirecting to login...');

    event.target.reset();

    setTimeout(() => {
        window.location.href = 'login.html';
    }, 1200);
}

function handleLoginSubmit(event) {
    event.preventDefault();

    const email = document.getElementById('login-email')?.value.trim();
    const password = document.getElementById('login-password')?.value;
    const messageElement = document.getElementById('loginMessage');

    if (!email || !password) {
        showFormMessage(messageElement, 'error', 'Please enter your email and password.');
        return;
    }

    const users = getUsers();
    const matchedUser = users.find((user) =>
        user.email.toLowerCase() === email.toLowerCase() && user.password === password
    );

    if (!matchedUser) {
        showFormMessage(messageElement, 'error', 'Invalid email or password.');
        return;
    }

    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify({
        name: matchedUser.name,
        email: matchedUser.email
    }));

    showFormMessage(messageElement, 'success', 'Login successful!');

    setTimeout(() => {
        window.location.href = 'index.html';
    }, 800);
}

function updateUserInfo() {
    const currentUser = getCurrentUser();
    if (!currentUser) return;

    const userName = currentUser.name || 'Student';

    // Update navbar user name on all pages
    const navName = document.querySelector('.user-profile-nav span');
    if (navName) navName.textContent = userName;

    // Update sidebar user info on dashboard
    const sidebarName = document.querySelector('.sidebar-user h3');
    if (sidebarName) sidebarName.textContent = userName;

    // Update welcome message on dashboard
    const welcomeHeading = document.querySelector('.dashboard-header h2');
    if (welcomeHeading) welcomeHeading.textContent = `Welcome back, ${userName}! 👋`;
}

function handleLogout() {
    localStorage.removeItem(CURRENT_USER_KEY);
    window.location.href = 'index.html';
}

function setupAuthRedirect() {
    const loggedOutPages = ['index.html', 'login.html', 'register.html', ''];
    let currentPage = window.location.pathname.split('/').pop();

    if (currentPage === '') currentPage = 'index.html';

    if (loggedOutPages.includes(currentPage)) {
        return;
    }

    if (!getCurrentUser()) {
        window.location.href = 'login.html';
    }
}

// Add event listeners automatically to all protected links so we don't
// need to manually add onclick to every single <a> tag across all files.
document.addEventListener('DOMContentLoaded', () => {
    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
        registerForm.addEventListener('submit', handleRegisterSubmit);
    }

    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLoginSubmit);
    }

    // Update user info on all pages (browse, upload, dashboard)
    updateUserInfo();

    // Setup logout button
    const logoutBtn = document.querySelector('.logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }

    setupAuthRedirect();

    const protectedLinks = document.querySelectorAll('a[href="upload-note.html"], a[href="browse-notes.html"]');

    protectedLinks.forEach(link => {
        if (!link.hasAttribute('onclick')) {
            link.addEventListener('click', handleProtectedLink);
        }
    });
});
