import { getUsers, saveUsers, getCurrentUser, setCurrentUser, registerOrUpdateUser } from './storage.js';
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

    const emailLower = email.toLowerCase();

    // 1. If Firebase is active, attempt registration with Firebase
    if (isFirebaseConfigured) {
        try {
            await registerWithFirebase(name, email, password);
        } catch (error) {
            if (error.code === 'auth/email-already-in-use') {
                showFormMessage(messageElement, 'error', 'මේ email එකෙන් account එකක් දැනටමත් තියෙනවා.');
                return;
            }
            if (error.code === 'auth/weak-password') {
                showFormMessage(messageElement, 'error', 'Password එක අවම වශයෙන් අක්ෂර 6ක් විය යුතුයි.');
                return;
            }
            console.warn('Firebase registration fallback to local storage:', error);
        }
    }

    // 2. ALWAYS save user in LocalStorage so the account is immediately active and visible in admin dashboard
    registerOrUpdateUser({
        name,
        email: emailLower,
        password,
        role: 'student',
        gradeLevel: 'General Student',
        semester: 'Semester 1',
        status: 'active',
        createdAt: new Date().toISOString()
    });

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

    if (email.toLowerCase() === 'admin@gmail.com' && password === 'admin123') {
        setCurrentUser({
            name: 'NotesHub Admin',
            email: 'admin@gmail.com',
            role: 'admin'
        });

        if (isFirebaseConfigured) {
            try {
                await loginWithFirebase('admin@gmail.com', 'admin123');
            } catch (fbErr) {
                console.warn('Admin Firebase login notice:', fbErr);
            }
        }

        showFormMessage(messageElement, 'success', 'Admin login successful! Redirecting...');
        setTimeout(() => {
            window.location.href = 'admin-dashboard.html';
        }, 800);
        return;
    }

    if (isFirebaseConfigured) {
        try {
            const user = await loginWithFirebase(email, password);
            setCurrentUser(user);
            registerOrUpdateUser({
                name: user.name,
                email: user.email,
                role: user.role || 'student',
                status: 'active'
            });
            showFormMessage(messageElement, 'success', 'Login successful!');
            const nextPage = new URLSearchParams(window.location.search).get('next');
            const defaultTarget = user.role === 'admin' ? 'admin-dashboard.html' : 'dashboard.html';
            const allowedNextPages = ['browse-notes.html', 'upload-note.html', 'dashboard.html', 'admin-dashboard.html', 'my-notes.html', 'saved-notes.html', 'settings.html'];
            const targetPage = (nextPage && allowedNextPages.includes(nextPage)) ? nextPage : defaultTarget;
            setTimeout(() => {
                window.location.href = targetPage;
            }, 800);
        } catch (error) {
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
        showFormMessage(messageElement, 'error', 'Invalid email or password.');
        return;
    }

    const userRole = matchedUser.role || (matchedUser.email.toLowerCase() === 'admin@gmail.com' ? 'admin' : 'student');
    setCurrentUser({
        name: matchedUser.name,
        email: matchedUser.email,
        role: userRole
    });

    showFormMessage(messageElement, 'success', 'Login successful!');

    const nextPage = new URLSearchParams(window.location.search).get('next');
    const defaultTarget = userRole === 'admin' ? 'admin-dashboard.html' : 'dashboard.html';
    const allowedNextPages = ['browse-notes.html', 'upload-note.html', 'dashboard.html', 'admin-dashboard.html', 'my-notes.html', 'saved-notes.html', 'settings.html'];
    const targetPage = (nextPage && allowedNextPages.includes(nextPage)) ? nextPage : defaultTarget;

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

    const targetPage = event?.currentTarget?.getAttribute('href') || 'dashboard.html';
    const hasExistingUsers = isFirebaseConfigured || getUsers().length > 0;
    const authPage = hasExistingUsers ? 'login.html' : 'register.html';
    window.location.href = `${authPage}?next=${encodeURIComponent(targetPage)}`;
}

if (typeof window !== 'undefined') {
    window.redirectToAuthPage = redirectToAuthPage;
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

    const currentUser = getCurrentUser();
    if (!loggedOutPages.includes(currentPage) && !currentUser) {
        window.location.href = 'login.html';
        return;
    }

    if (currentUser) {
        // Check if user has been blocked
        const users = getUsers();
        const activeRecord = users.find(u => u.email && currentUser.email && u.email.toLowerCase() === currentUser.email.toLowerCase());
        if (currentUser.blocked === true || currentUser.status === 'blocked' || (activeRecord && (activeRecord.blocked === true || activeRecord.status === 'blocked'))) {
            alert('Your account has been suspended by an administrator.');
            handleLogout();
            return;
        }

        const isAdmin = currentUser.role === 'admin' || currentUser.email?.toLowerCase() === 'admin@gmail.com';
        if (currentPage === 'admin-dashboard.html' && !isAdmin) {
            window.location.href = 'dashboard.html';
        } else if (currentPage === 'dashboard.html' && isAdmin) {
            window.location.href = 'admin-dashboard.html';
        }
    }
}
