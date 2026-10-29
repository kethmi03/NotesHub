import { getCurrentUser, setCurrentUser, getUsers, saveUsers } from './storage.js';
import { updateNavbarState } from './components.js';
import { showFormMessage } from './auth.js';
import { isFirebaseConfigured, auth, db } from './firebase.js';

export function setupSettingsPage() {
    const fullNameInput = document.getElementById('full-name');
    const emailInput = document.getElementById('email');

    if (!fullNameInput && !emailInput) return;

    const currentUser = getCurrentUser();
    if (!currentUser) return;

    // Immediately populate current user details
    if (fullNameInput) fullNameInput.value = currentUser.name || '';
    if (emailInput) emailInput.value = currentUser.email || '';

    // Account Form submit handler
    const accountForm = document.getElementById('accountForm') || document.querySelector('.settings-section:first-of-type form');
    if (accountForm) {
        accountForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const messageEl = document.getElementById('accountMessage');
            const newName = fullNameInput ? fullNameInput.value.trim() : '';

            if (!newName) {
                showFormMessage(messageEl, 'error', 'Please enter your full name.');
                return;
            }

            try {
                // Update Firebase profile and Firestore if configured
                if (isFirebaseConfigured && auth?.currentUser) {
                    try {
                        const { updateProfile } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js');
                        await updateProfile(auth.currentUser, { displayName: newName });
                    } catch (err) {
                        console.warn('Could not update Firebase displayName:', err);
                    }

                    if (currentUser.uid && db) {
                        try {
                            const { doc, setDoc } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js');
                            await setDoc(doc(db, 'users', currentUser.uid), {
                                name: newName
                            }, { merge: true });
                        } catch (err) {
                            console.warn('Could not update Firestore user document:', err);
                        }
                    }
                }

                // Update local storage users list
                const users = getUsers();
                const userIndex = users.findIndex(u =>
                    (currentUser.uid && u.uid === currentUser.uid) ||
                    (u.email && currentUser.email && u.email.toLowerCase() === currentUser.email.toLowerCase())
                );

                if (userIndex !== -1) {
                    users[userIndex].name = newName;
                    saveUsers(users);
                }

                // Update current user session
                const updatedUser = {
                    ...currentUser,
                    name: newName
                };
                setCurrentUser(updatedUser);

                // Update UI in sidebar and navbar
                const sidebarName = document.querySelector('.sidebar-user h3');
                if (sidebarName) sidebarName.textContent = newName;
                updateNavbarState(updatedUser);

                showFormMessage(messageEl, 'success', 'Account information updated successfully!');
                setTimeout(() => {
                    if (messageEl) messageEl.style.display = 'none';
                }, 4000);
            } catch (error) {
                console.error('Error saving account settings:', error);
                showFormMessage(messageEl, 'error', 'Failed to update account information.');
            }
        });
    }

    // Password Form handler
    const passwordForm = document.getElementById('passwordForm');
    if (passwordForm) {
        passwordForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const messageEl = document.getElementById('passwordMessage');
            const currentPass = document.getElementById('current-password')?.value;
            const newPass = document.getElementById('new-password')?.value;
            const confirmPass = document.getElementById('confirm-password')?.value;

            if (!currentPass || !newPass || !confirmPass) {
                showFormMessage(messageEl, 'error', 'Please fill in all password fields.');
                return;
            }

            if (newPass.length < 6) {
                showFormMessage(messageEl, 'error', 'New password must be at least 6 characters long.');
                return;
            }

            if (newPass !== confirmPass) {
                showFormMessage(messageEl, 'error', 'New passwords do not match.');
                return;
            }

            try {
                if (isFirebaseConfigured && auth?.currentUser) {
                    const { updatePassword } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js');
                    await updatePassword(auth.currentUser, newPass);
                } else {
                    const users = getUsers();
                    const user = users.find(u => u.email.toLowerCase() === currentUser.email.toLowerCase());
                    if (user && user.password && user.password !== currentPass) {
                        showFormMessage(messageEl, 'error', 'Current password is incorrect.');
                        return;
                    }
                    if (user) {
                        user.password = newPass;
                        saveUsers(users);
                    }
                }

                showFormMessage(messageEl, 'success', 'Password updated successfully!');
                passwordForm.reset();
                setTimeout(() => {
                    if (messageEl) messageEl.style.display = 'none';
                }, 4000);
            } catch (error) {
                console.error('Error updating password:', error);
                const msg = error.code === 'auth/requires-recent-login'
                    ? 'Please log out and log in again before changing your password.'
                    : 'Failed to update password. Please try again.';
                showFormMessage(messageEl, 'error', msg);
            }
        });
    }

    // Notifications Form handler
    const notificationsForm = document.getElementById('notificationsForm');
    if (notificationsForm) {
        notificationsForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const messageEl = document.getElementById('notificationsMessage');
            showFormMessage(messageEl, 'success', 'Notification preferences saved successfully!');
            setTimeout(() => {
                if (messageEl) messageEl.style.display = 'none';
            }, 3000);
        });
    }

    // Deactivate Account handler
    const deactivateBtn = document.getElementById('deactivateAccountBtn');
    if (deactivateBtn) {
        deactivateBtn.addEventListener('click', async () => {
            const confirmed = window.confirm('Are you sure you want to deactivate your account? All your data will be permanently deleted.');
            if (!confirmed) return;

            try {
                if (isFirebaseConfigured && auth?.currentUser) {
                    const { deleteUser } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js');
                    await deleteUser(auth.currentUser);
                }
                const users = getUsers();
                const filteredUsers = users.filter(u => u.email.toLowerCase() !== currentUser.email.toLowerCase());
                saveUsers(filteredUsers);
                setCurrentUser(null);
                window.location.href = 'index.html';
            } catch (error) {
                console.error('Error deactivating account:', error);
                alert('Account deactivation requires recent authentication. Please re-login and try again.');
            }
        });
    }
}
