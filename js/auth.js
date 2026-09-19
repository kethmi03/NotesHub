import { getUsers, saveUsers, getCurrentUser, setCurrentUser } from './storage.js';

export function showFormMessage(element, type, message) {
    if (!element) return;
    element.textContent = message;
    element.className = `form-message ${type}`;
}

export function handleRegisterSubmit(event) {
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
        const nextPage = new URLSearchParams(window.location.search).get('next') || 'upload-note.html';
        window.location.href = `login.html?next=${encodeURIComponent(nextPage)}`;
    }, 1200);
}

export function handleLoginSubmit(event) {
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

    setCurrentUser({
        name: matchedUser.name,
        email: matchedUser.email
    });

    showFormMessage(messageElement, 'success', 'Login successful!');

    const nextPage = new URLSearchParams(window.location.search).get('next');
    const allowedNextPages = ['browse-notes.html', 'upload-note.html', 'dashboard.html'];

    setTimeout(() => {
        window.location.href = allowedNextPages.includes(nextPage) ? nextPage : 'dashboard.html';
    }, 800);
}

export function handleLogout() {
    setCurrentUser(null);
    window.location.href = 'index.html';
}

export function redirectToAuthPage(event) {
    if (getCurrentUser()) return;
    if (event) event.preventDefault();

    const targetPage = event?.currentTarget?.getAttribute('href') || 'dashboard.html';
    const hasExistingUsers = getUsers().length > 0;
    const authPage = hasExistingUsers ? 'login.html' : 'register.html';
    window.location.href = `${authPage}?next=${encodeURIComponent(targetPage)}`;
}

export function handleProtectedLink(event) {
    const loggedOutPages = ['index.html', 'login.html', 'register.html', ''];
    let currentPage = window.location.pathname.split('/').pop();
    if (currentPage === '') currentPage = 'index.html';

    if (loggedOutPages.includes(currentPage) && !getCurrentUser()) {
        redirectToAuthPage(event);
    }
}

export function setupAuthRedirect() {
    const loggedOutPages = ['index.html', 'login.html', 'register.html', ''];
    let currentPage = window.location.pathname.split('/').pop();
    if (currentPage === '') currentPage = 'index.html';

    if (!loggedOutPages.includes(currentPage) && !getCurrentUser()) {
        window.location.href = 'login.html';
    }
}
