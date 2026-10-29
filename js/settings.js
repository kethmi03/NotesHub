import { getCurrentUser, setCurrentUser, getUsers, saveUsers, getNotes, getSavedNotes } from './storage.js';
import { updateNavbarState } from './components.js';
import { showFormMessage } from './auth.js';
import { isFirebaseConfigured, auth, db } from './firebase.js';

export function setupSettingsPage() {
    const fullNameInput = document.getElementById('full-name');
    const emailInput = document.getElementById('email');

    if (!fullNameInput && !emailInput) return;

    let currentUser = getCurrentUser();
    if (!currentUser) return;

    // Available Avatar Presets
    const AVATAR_PRESETS = [
        { id: 'student', icon: 'fa-user-graduate', label: 'Student', color: '#4f46e5', bg: '#eef2ff' },
        { id: 'scholar', icon: 'fa-graduation-cap', label: 'Scholar', color: '#0284c7', bg: '#e0f2fe' },
        { id: 'coder', icon: 'fa-laptop-code', label: 'Developer', color: '#059669', bg: '#ecfdf5' },
        { id: 'reader', icon: 'fa-book-open', label: 'Bookworm', color: '#d97706', bg: '#fef3c7' },
        { id: 'scientist', icon: 'fa-flask', label: 'Scientist', color: '#7c3aed', bg: '#f5f3ff' },
        { id: 'brain', icon: 'fa-brain', label: 'Thinker', color: '#db2777', bg: '#fdf2f8' },
        { id: 'rocket', icon: 'fa-rocket', label: 'Achiever', color: '#ea580c', bg: '#fff7ed' },
        { id: 'user', icon: 'fa-user', label: 'Classic', color: '#475569', bg: '#f1f5f9' }
    ];

    // Helper: update avatar display across the page
    function applyUserAvatar(avatarId) {
        const preset = AVATAR_PRESETS.find(p => p.id === avatarId) || AVATAR_PRESETS[0];

        // Hero Avatar
        const heroAvatar = document.getElementById('profileHeroAvatar');
        if (heroAvatar) {
            heroAvatar.style.background = preset.bg;
            heroAvatar.style.color = preset.color;
            heroAvatar.innerHTML = `<i class="fa-solid ${preset.icon}"></i>`;
        }

        // Sidebar Avatar
        const sidebarAvatar = document.querySelector('.sidebar-user .avatar-large') || document.getElementById('sidebarAvatar');
        if (sidebarAvatar) {
            sidebarAvatar.style.background = preset.bg;
            sidebarAvatar.style.color = preset.color;
            sidebarAvatar.innerHTML = `<i class="fa-solid ${preset.icon}"></i>`;
        }

        // Navbar Avatar
        const navAvatar = document.querySelector('.user-profile-nav .avatar');
        if (navAvatar) {
            navAvatar.style.background = preset.bg;
            navAvatar.style.color = preset.color;
            navAvatar.innerHTML = `<i class="fa-solid ${preset.icon}"></i>`;
        }
    }

    // Populate user details in form & hero card
    function populateUserData() {
        currentUser = getCurrentUser();
        if (!currentUser) return;

        const isAdmin = currentUser.role === 'admin' || currentUser.email?.toLowerCase() === 'admin@gmail.com';
        const displayName = currentUser.name || (isAdmin ? 'NotesHub Admin' : 'Student');
        const userEmail = currentUser.email || '';

        // Form Inputs
        if (fullNameInput) fullNameInput.value = displayName;
        if (emailInput) emailInput.value = userEmail;

        // Hero Card Identity
        const heroName = document.getElementById('heroDisplayName');
        if (heroName) heroName.textContent = displayName;

        const heroEmail = document.getElementById('heroDisplayEmail');
        if (heroEmail) {
            heroEmail.innerHTML = `<i class="fa-regular fa-envelope"></i> <span>${userEmail}</span>`;
        }

        const heroJoined = document.getElementById('heroJoinedDate');
        if (heroJoined) {
            if (currentUser.createdAt) {
                try {
                    const date = new Date(currentUser.createdAt);
                    heroJoined.textContent = `Joined ${date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}`;
                } catch {
                    heroJoined.textContent = 'Joined Oct 2026';
                }
            } else {
                heroJoined.textContent = 'Joined Oct 2026';
            }
        }

        const roleBadge = document.getElementById('headerRoleBadge');
        if (roleBadge) {
            roleBadge.innerHTML = `<i class="fa-solid ${isAdmin ? 'fa-shield-halved' : 'fa-graduation-cap'}"></i> ${isAdmin ? 'Administrator' : 'Student Account'}`;
        }

        // Apply chosen avatar
        applyUserAvatar(currentUser.avatar || (isAdmin ? 'scholar' : 'student'));

        // Calculate live stats
        try {
            const allNotes = getNotes() || [];
            const userNotes = allNotes.filter(n =>
                (n.uploadedBy && userEmail && n.uploadedBy.toLowerCase() === userEmail.toLowerCase()) ||
                (currentUser.uid && n.userId === currentUser.uid)
            );

            let savedCount = 0;
            try {
                savedCount = getSavedNotes().length;
            } catch {
                savedCount = 0;
            }

            const totalDownloads = userNotes.reduce((sum, n) => sum + (parseInt(n.downloads) || 0), 0);

            const uploadsEl = document.getElementById('heroUploadsCount');
            if (uploadsEl) uploadsEl.textContent = userNotes.length;

            const savedEl = document.getElementById('heroSavedCount');
            if (savedEl) savedEl.textContent = savedCount;

            const downloadsEl = document.getElementById('heroDownloadsCount');
            if (downloadsEl) downloadsEl.textContent = totalDownloads;
        } catch (e) {
            console.warn('Could not compute profile stats:', e);
        }
    }

    populateUserData();

    // ==========================================
    // 1. PASSWORD SHOW/HIDE TOGGLES
    // ==========================================
    document.querySelectorAll('.toggle-password-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const wrapper = btn.closest('.password-input-wrapper');
            const input = wrapper ? wrapper.querySelector('input') : null;
            if (!input) return;

            const isPassword = input.type === 'password';
            input.type = isPassword ? 'text' : 'password';

            const icon = btn.querySelector('i');
            if (icon) {
                icon.className = isPassword ? 'fa-regular fa-eye-slash' : 'fa-regular fa-eye';
            }
        });
    });

    // ==========================================
    // 2. AVATAR PICKER MODAL
    // ==========================================
    const openAvatarBtn = document.getElementById('openAvatarModalBtn');
    const avatarModal = document.getElementById('avatarModal');
    const closeAvatarBtn = document.getElementById('closeAvatarModalBtn');
    const presetsGrid = document.getElementById('avatarPresetsGrid');

    if (presetsGrid) {
        presetsGrid.innerHTML = AVATAR_PRESETS.map(preset => `
            <div class="avatar-preset-item ${(currentUser.avatar === preset.id) ? 'selected' : ''}" data-avatar-id="${preset.id}">
                <div style="width: 44px; height: 44px; border-radius: 50%; background: ${preset.bg}; color: ${preset.color}; display: flex; align-items: center; justify-content: center; font-size: 20px;">
                    <i class="fa-solid ${preset.icon}"></i>
                </div>
                <span>${preset.label}</span>
            </div>
        `).join('');

        presetsGrid.querySelectorAll('.avatar-preset-item').forEach(item => {
            item.addEventListener('click', () => {
                const avatarId = item.getAttribute('data-avatar-id');
                presetsGrid.querySelectorAll('.avatar-preset-item').forEach(i => i.classList.remove('selected'));
                item.classList.add('selected');

                currentUser.avatar = avatarId;
                setCurrentUser(currentUser);

                const users = getUsers();
                const userIndex = users.findIndex(u =>
                    (currentUser.uid && u.uid === currentUser.uid) ||
                    (u.email && currentUser.email && u.email.toLowerCase() === currentUser.email.toLowerCase())
                );
                if (userIndex !== -1) {
                    users[userIndex].avatar = avatarId;
                    saveUsers(users);
                }

                applyUserAvatar(avatarId);

                if (avatarModal) avatarModal.style.display = 'none';
            });
        });
    }

    if (openAvatarBtn && avatarModal) {
        openAvatarBtn.addEventListener('click', () => {
            avatarModal.style.display = 'flex';
        });
    }

    if (closeAvatarBtn && avatarModal) {
        closeAvatarBtn.addEventListener('click', () => {
            avatarModal.style.display = 'none';
        });
    }

    if (avatarModal) {
        avatarModal.addEventListener('click', (e) => {
            if (e.target === avatarModal) {
                avatarModal.style.display = 'none';
            }
        });
    }

    // ==========================================
    // 3. ACCOUNT FORM SUBMISSION
    // ==========================================
    const accountForm = document.getElementById('accountForm');
    if (accountForm) {
        accountForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const messageEl = document.getElementById('accountMessage');
            const submitBtn = document.getElementById('saveAccountBtn');
            const newName = fullNameInput ? fullNameInput.value.trim() : '';

            if (!newName) {
                showFormMessage(messageEl, 'error', 'Please enter your full name.');
                return;
            }

            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving...';
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

                // Update UI in sidebar, navbar, and hero
                const sidebarName = document.querySelector('.sidebar-user h3');
                if (sidebarName) sidebarName.textContent = newName;
                updateNavbarState(updatedUser);
                populateUserData();

                showFormMessage(messageEl, 'success', 'Account information updated successfully!');
                setTimeout(() => {
                    if (messageEl) messageEl.style.display = 'none';
                }, 4000);
            } catch (error) {
                console.error('Error saving account settings:', error);
                showFormMessage(messageEl, 'error', 'Failed to update account information.');
            } finally {
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Save Changes';
                }
            }
        });
    }

    // ==========================================
    // 4. PASSWORD FORM SUBMISSION
    // ==========================================
    // Real-time password match indicator
    const newPassInput = document.getElementById('new-password');
    const confirmPassInput = document.getElementById('confirm-password');
    const matchBadge = document.getElementById('passwordMatchBadge');

    function checkPasswordMatch() {
        if (!newPassInput || !confirmPassInput || !matchBadge) return;
        const val1 = newPassInput.value;
        const val2 = confirmPassInput.value;

        if (!val2) {
            matchBadge.className = 'password-match-badge';
            matchBadge.textContent = '';
            return;
        }

        if (val1 === val2) {
            matchBadge.className = 'password-match-badge matched';
            matchBadge.innerHTML = '<i class="fa-solid fa-circle-check"></i> Passwords match';
        } else {
            matchBadge.className = 'password-match-badge unmatched';
            matchBadge.innerHTML = '<i class="fa-solid fa-circle-xmark"></i> Passwords do not match';
        }
    }

    if (newPassInput && confirmPassInput) {
        newPassInput.addEventListener('input', checkPasswordMatch);
        confirmPassInput.addEventListener('input', checkPasswordMatch);
    }

    if (passwordForm) {
        passwordForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const messageEl = document.getElementById('passwordMessage');
            const submitBtn = document.getElementById('savePasswordBtn');
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

            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Updating...';
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
                if (matchBadge) {
                    matchBadge.className = 'password-match-badge';
                    matchBadge.textContent = '';
                }
                setTimeout(() => {
                    if (messageEl) messageEl.style.display = 'none';
                }, 4000);
            } catch (error) {
                console.error('Error updating password:', error);
                const msg = error.code === 'auth/requires-recent-login'
                    ? 'Please log out and log in again before changing your password.'
                    : 'Failed to update password. Please check your credentials and try again.';
                showFormMessage(messageEl, 'error', msg);
            } finally {
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.innerHTML = '<i class="fa-solid fa-lock"></i> Update Password';
                }
            }
        });
    }

    // ==========================================
    // 5. NOTIFICATIONS FORM SUBMISSION
    // ==========================================
    const notificationsForm = document.getElementById('notificationsForm');
    if (notificationsForm) {
        if (currentUser.preferences) {
            const p = currentUser.preferences;
            if (document.getElementById('pref-downloads')) document.getElementById('pref-downloads').checked = p.downloads !== false;
            if (document.getElementById('pref-ratings')) document.getElementById('pref-ratings').checked = p.ratings !== false;
            if (document.getElementById('pref-digest')) document.getElementById('pref-digest').checked = p.digest !== false;
        }

        notificationsForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const messageEl = document.getElementById('notificationsMessage');

            const preferences = {
                downloads: document.getElementById('pref-downloads')?.checked ?? true,
                ratings: document.getElementById('pref-ratings')?.checked ?? true,
                digest: document.getElementById('pref-digest')?.checked ?? true
            };

            currentUser.preferences = preferences;
            setCurrentUser(currentUser);

            const users = getUsers();
            const userIndex = users.findIndex(u =>
                (currentUser.uid && u.uid === currentUser.uid) ||
                (u.email && currentUser.email && u.email.toLowerCase() === currentUser.email.toLowerCase())
            );
            if (userIndex !== -1) {
                users[userIndex].preferences = preferences;
                saveUsers(users);
            }

            showFormMessage(messageEl, 'success', 'Notification preferences saved successfully!');
            setTimeout(() => {
                if (messageEl) messageEl.style.display = 'none';
            }, 3000);
        });
    }

    // ==========================================
    // 6. DEACTIVATE ACCOUNT HANDLER
    // ==========================================
    const deactivateBtn = document.getElementById('deactivateAccountBtn');
    if (deactivateBtn) {
        deactivateBtn.addEventListener('click', async () => {
            const confirmed = window.confirm('Are you sure you want to permanently deactivate your account? All your profile information and saved materials will be deleted.');
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
