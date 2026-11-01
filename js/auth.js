import { getUsers, saveUsers, getCurrentUser, setCurrentUser } from './storage.js';
import { isFirebaseConfigured, loginWithFirebase, logoutFromFirebase, registerWithFirebase } from './firebase.js';

let isRegistering = false;
let isLoggingIn = false;

export function showFormMessage(element, type, message) {
    if (!element) return;
    element.textContent = message;
    element.className = `form-message ${type}`;
}

export async function handleRegisterSubmit(event) {
    event.preventDefault();

    if (isRegistering) return;

    const name = document.getElementById('reg-name')?.value.trim();
    const email = document.getElementById('reg-email')?.value.trim();
    const password = document.getElementById('reg-password')?.value;
    const confirmPassword = document.getElementById('reg-confirm-password')?.value;
    const messageElement = document.getElementById('registerMessage');
    const submitBtn = event.target.querySelector('button[type="submit"]');

    if (!name || !email || !password || !confirmPassword) {
        showFormMessage(messageElement, 'error', 'Please fill in all fields.');
        return;
    }

    if (password !== confirmPassword) {
        showFormMessage(messageElement, 'error', 'Passwords do not match.');
        return;
    }

    if (password.length < 6) {
        showFormMessage(messageElement, 'error', 'Password must be at least 6 characters long.');
        return;
    }

    isRegistering = true;
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Creating Account...';
    }

    if (isFirebaseConfigured) {
        try {
            await registerWithFirebase(name, email, password);
            showFormMessage(messageElement, 'success', 'Registration successful! Redirecting to login...');
            event.target.reset();
            const nextPage = new URLSearchParams(window.location.search).get('next') || 'browse-notes.html';
            setTimeout(() => {
                window.location.href = `login.html?next=${encodeURIComponent(nextPage)}`;
            }, 1200);
        } catch (error) {
            isRegistering = false;
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = 'Register';
            }
            const messages = {
                'auth/email-already-in-use': 'An account with this email already exists.',
                'auth/operation-not-allowed': 'Email/password sign-in is disabled in Firebase Console.',
                'auth/weak-password': 'Password should be at least 6 characters long.',
                'auth/invalid-email': 'Please enter a valid email address.',
                'auth/network-request-failed': 'Network error. Please check your internet connection and try again.',
                'permission-denied': 'Permission denied. Please publish your Firestore rules.'
            };
            const message = messages[error.code] || `Registration failed (${error.code || 'unknown-error'}). Please try again.`;
            showFormMessage(messageElement, 'error', message);
        }
        return;
    }

    const users = getUsers();
    const emailExists = users.some((user) => user.email.toLowerCase() === email.toLowerCase());

    if (emailExists) {
        isRegistering = false;
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Register';
        }
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

    const nextPage = new URLSearchParams(window.location.search).get('next') || 'browse-notes.html';
    setTimeout(() => {
        window.location.href = `login.html?next=${encodeURIComponent(nextPage)}`;
    }, 1200);
}

export async function handleLoginSubmit(event) {
    event.preventDefault();

    if (isLoggingIn) return;

    const email = document.getElementById('login-email')?.value.trim();
    const password = document.getElementById('login-password')?.value;
    const messageElement = document.getElementById('loginMessage');
    const submitBtn = event.target.querySelector('button[type="submit"]');

    if (!email || !password) {
        showFormMessage(messageElement, 'error', 'Please enter your email and password.');
        return;
    }

    isLoggingIn = true;
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Logging in...';
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

    const allowedNextPages = [
        'browse-notes.html',
        'upload-note.html',
        'dashboard.html',
        'my-notes.html',
        'saved-notes.html',
        'settings.html',
        'view-note.html'
    ];

    if (isFirebaseConfigured) {
        try {
            const user = await loginWithFirebase(email, password);
            setCurrentUser(user);
            showFormMessage(messageElement, 'success', 'Login successful! Redirecting...');
            const nextPage = new URLSearchParams(window.location.search).get('next');
            const targetPage = (nextPage && allowedNextPages.includes(nextPage)) ? nextPage : 'browse-notes.html';
            setTimeout(() => {
                window.location.href = targetPage;
            }, 800);
        } catch (error) {
            isLoggingIn = false;
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = 'Login';
            }
            const messages = {
                'auth/invalid-credential': 'Email or password is incorrect. If you do not have an account yet, create one first.',
                'auth/user-not-found': 'No account was found for this email. Create an account first.',
                'auth/wrong-password': 'Password is incorrect. Please try again.',
                'auth/invalid-email': 'Please enter a valid email address.',
                'auth/operation-not-allowed': 'Email/password sign-in is disabled. Enable it in Firebase Console under Authentication > Sign-in method.',
                'auth/unauthorized-domain': 'This website is not authorized for Firebase sign-in. Add its domain in Firebase Console under Authentication > Settings > Authorized domains.',
                'auth/network-request-failed': 'Could not reach Firebase. Check your internet connection and try again.',
                'auth/too-many-requests': 'Too many attempts. Wait a little while, then try again.'
            };
            showFormMessage(messageElement, 'error', messages[error.code] || `Login failed (${error.code || 'unknown-error'}). Check the Firebase configuration and try again.`);
        }
        return;
    }

    const users = getUsers();
    const matchedUser = users.find((user) =>
        user.email.toLowerCase() === email.toLowerCase() && user.password === password
    );

    if (!matchedUser) {
        isLoggingIn = false;
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Login';
        }
        showFormMessage(messageElement, 'error', 'Invalid email or password.');
        return;
    }

    setCurrentUser({
        name: matchedUser.name,
        email: matchedUser.email
    });

    showFormMessage(messageElement, 'success', 'Login successful! Redirecting...');

    const nextPage = new URLSearchParams(window.location.search).get('next');
    const targetPage = (nextPage && allowedNextPages.includes(nextPage)) ? nextPage : 'browse-notes.html';

    setTimeout(() => {
        window.location.href = targetPage;
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

    const targetPage = event?.currentTarget?.getAttribute('href') || 'browse-notes.html';
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
