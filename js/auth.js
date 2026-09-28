import { getUsers, saveUsers, getCurrentUser, setCurrentUser } from './storage.js';
import { isFirebaseConfigured, loginWithFirebase, logoutFromFirebase, registerWithFirebase } from './firebase.js';

export function showFormMessage(element, type, message) {
    if (!element) return;
    element.textContent = message;
    element.className = `form-message ${type}`;
}

export async function handleRegisterSubmit(event) {
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

    if (isFirebaseConfigured) {
        try {
            await registerWithFirebase(name, email, password);
            showFormMessage(messageElement, 'success', 'Registration successful! Redirecting to login...');
            event.target.reset();
            setTimeout(() => {
                const nextPage = new URLSearchParams(window.location.search).get('next') || 'upload-note.html';
                window.location.href = `login.html?next=${encodeURIComponent(nextPage)}`;
            }, 1200);
        } catch (error) {
            const messages = {
                'auth/email-already-in-use': 'මේ email එකෙන් account එකක් දැනටමත් තියෙනවා.',
                'auth/operation-not-allowed': 'Firebase Console එකේ Email/Password sign-in enable කරන්න.',
                'auth/weak-password': 'Password එක අවම වශයෙන් අක්ෂර 6ක් විය යුතුයි.',
                'auth/invalid-email': 'Email address එක නිවැරදි නැහැ.',
                'auth/network-request-failed': 'Internet connection එක පරීක්ෂා කරන්න.',
                'permission-denied': 'Firestore Rules publish කරන්න. Firestore → Rules → Publish යන්න.'
            };
            const message = messages[error.code] || `Account එක හදන්න බැරි වුණා (${error.code || 'unknown-error'}).`;
            showFormMessage(messageElement, 'error', message);
        }
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

export async function handleLoginSubmit(event) {
    event.preventDefault();

    const email = document.getElementById('login-email')?.value.trim();
    const password = document.getElementById('login-password')?.value;
    const messageElement = document.getElementById('loginMessage');

    if (!email || !password) {
        showFormMessage(messageElement, 'error', 'Please enter your email and password.');
        return;
    }

    if (!isFirebaseConfigured && email.toLowerCase() === 'admin@gmail.com' && password === 'admin123') {
        setCurrentUser({
            name: 'NotesHub Admin',
            email: 'admin@gmail.com',
            role: 'admin'
        });

        showFormMessage(messageElement, 'success', 'Admin login successful! Redirecting...');
        setTimeout(() => {
            window.location.href = 'dashboard.html';
        }, 800);
        return;
    }

    if (isFirebaseConfigured) {
        try {
            const user = await loginWithFirebase(email, password);
            setCurrentUser(user);
            showFormMessage(messageElement, 'success', 'Login successful!');
            const nextPage = new URLSearchParams(window.location.search).get('next');
            const allowedNextPages = ['browse-notes.html', 'upload-note.html', 'dashboard.html'];
            setTimeout(() => {
                window.location.href = allowedNextPages.includes(nextPage) ? nextPage : 'dashboard.html';
            }, 800);
        } catch (error) {
            showFormMessage(messageElement, 'error', 'Invalid email or password.');
        }
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

export async function handleLogout() {
    if (isFirebaseConfigured) await logoutFromFirebase();
    setCurrentUser(null);
    window.location.href = 'index.html';
}

export function redirectToAuthPage(event) {
    if (getCurrentUser()) return;
    if (event) event.preventDefault();

    const targetPage = event?.currentTarget?.getAttribute('href') || 'dashboard.html';
    const hasExistingUsers = isFirebaseConfigured || getUsers().length > 0;
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
