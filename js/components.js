import { getUserNotifications, markNotificationAsRead, markAllNotificationsAsRead, deleteNotification } from './storage.js';

function ensureFavicon() {
    if (!document.querySelector("link[rel*='icon']")) {
        const link = document.createElement('link');
        link.rel = 'icon';
        link.type = 'image/svg+xml';
        link.href = 'favicon.svg';
        document.head.appendChild(link);
    }
}
export function loadNavbar() {
    ensureFavicon();
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const themeIcon = isDark ? 'fa-sun' : 'fa-moon';

    const navbarHTML = `
    <header class="navbar">
        <a href="index.html" class="logo" title="NotesHub Home">
            <i class="fa-solid fa-book-open"></i>
            <span>Notes<span class="logo-highlight">Hub</span></span>
        </a>
        <nav>
            <a href="index.html" class="nav-link-home">Home</a>
            <a href="browse-notes.html" class="protected-link nav-link-browse">Browse Notes</a>
            <a href="saved-notes.html" class="protected-link nav-link-saved" id="navSavedNotesLink" style="display: none;">Saved Notes</a>
            <a href="index.html#how-it-works" class="nav-link-how">How It Works</a>
            <a href="index.html#about" class="nav-link-about">About</a>
        </nav>
        <div class="nav-buttons">
            <a href="#" id="theme-toggle" class="login-btn" style="padding: 10px; font-size: 18px;" title="Toggle Dark Mode">
                <i class="fa-solid ${themeIcon}"></i>
            </a>
            <div id="auth-buttons-container">
                <a href="login.html" class="login-btn">Login</a>
                <a href="register.html" class="register-btn">Get Started</a>
            </div>
        </div>
    </header>
    `;
    const temp = document.createElement('div');
    temp.innerHTML = navbarHTML;
    const header = temp.querySelector('header');
    const existingHeader = document.querySelector('header.navbar');
    
    if (existingHeader) {
        existingHeader.replaceWith(header);
    } else {
        document.body.prepend(header);
    }
}

export function loadFooter() {
    const footerHTML = `
    <footer>
        <div class="footer-content">
            <div class="footer-brand">
                <a href="index.html" class="logo" title="NotesHub Home">
                    <i class="fa-solid fa-book-open"></i>
                    <span>Notes<span class="logo-highlight">Hub</span></span>
                </a>
                <p>A peer-to-peer academic notes marketplace designed for students.</p>
            </div>
            <div>
                <h4>Platform</h4>
                <a href="browse-notes.html" class="protected-link">Browse Notes</a>
                <a href="upload-note.html" class="protected-link">Upload Notes</a>
                <a href="login.html">Login</a>
                <a href="register.html">Register</a>
            </div>
            <div>
                <h4>Support</h4>
                <a href="#">Help Center</a>
                <a href="#">Contact Us</a>
                <a href="#">Report Content</a>
            </div>
        </div>
        <div class="copyright">
            © 2026 NotesHub. All Rights Reserved.
        </div>
    </footer>
    `;
    const temp = document.createElement('div');
    temp.innerHTML = footerHTML;
    const footer = temp.querySelector('footer');
    const existingFooter = document.querySelector('footer');
    
    if (existingFooter) {
        existingFooter.replaceWith(footer);
    } else {
        document.body.appendChild(footer);
    }
}

export function updateNavbarState(currentUser) {
    const authContainer = document.getElementById('auth-buttons-container');
    const navSavedNotesLink = document.getElementById('navSavedNotesLink');

    if (currentUser) {
        if (navSavedNotesLink) {
            navSavedNotesLink.style.display = 'inline-flex';
            navSavedNotesLink.style.alignItems = 'center';
        }

        const profileUrl = currentUser.role === 'admin' ? 'dashboard.html' : 'settings.html';
        setTimeout(() => setupNotificationCenter(currentUser), 10);
        if (authContainer) {
            authContainer.innerHTML = `
                <div class="user-profile-nav">
                    <!-- Notification Bell Dropdown -->
                    <div class="notif-dropdown-wrapper" id="notifDropdownWrapper">
                        <button type="button" class="notif-bell-btn" id="notifBellBtn" title="Notifications" aria-label="Notifications" aria-expanded="false">
                            <i class="fa-solid fa-bell"></i>
                            <span class="notif-badge" id="notifBadge" style="display: none;">0</span>
                        </button>
                        <div class="notif-dropdown-panel" id="notifPanel" style="display: none;">
                            <div class="notif-panel-header">
                                <div style="display: flex; align-items: center; gap: 8px;">
                                    <i class="fa-solid fa-bell" style="color: #4f46e5;"></i>
                                    <h4 style="margin: 0; font-size: 14px; font-weight: 700;">Notifications</h4>
                                </div>
                                <button type="button" id="notifMarkAllReadBtn" class="notif-header-btn">Mark all read</button>
                            </div>
                            <div class="notif-list" id="notifList">
                                <!-- Dynamic notifications -->
                            </div>
                        </div>
                    </div>

                    <a href="saved-notes.html" class="saved-notes-quick-btn" title="Saved Notes">
                        <i class="fa-solid fa-bookmark"></i>
                    </a>
                    <a href="${profileUrl}" class="user-profile-link" title="${currentUser.role === 'admin' ? 'Admin Overview & Moderation Panel' : 'View Profile & Settings'}">
                        <div class="avatar" ${currentUser.role === 'admin' ? 'style="background: #4f46e5; color: white;"' : ''}>
                            <i class="fa-solid ${currentUser.role === 'admin' ? 'fa-user-shield' : 'fa-user'}"></i>
                        </div>
                        <span>${currentUser.name || (currentUser.role === 'admin' ? 'Admin' : 'Student')}</span>
                        ${currentUser.role === 'admin' ? '<span class="admin-badge" style="background: #4f46e5; color: white; font-size: 10px; font-weight: 700; padding: 2px 7px; border-radius: 999px; text-transform: uppercase; letter-spacing: 0.5px;">Admin</span>' : ''}
                    </a>
                    <button class="logout-btn" title="Logout">
                        <i class="fa-solid fa-right-from-bracket"></i>
                    </button>
                </div>
            `;
        }
    } else {
        if (navSavedNotesLink) {
            navSavedNotesLink.style.display = 'none';
        }
        if (authContainer) {
            authContainer.innerHTML = `
                <a href="login.html" class="login-btn">Login</a>
                <a href="register.html" class="register-btn">Get Started</a>
            `;
        }
    }
    
    // Highlight active link based on current path and hash
    const path = window.location.pathname.split('/').pop() || 'index.html';
    const hash = window.location.hash;
    const fullPath = path + hash;

    document.querySelectorAll('.navbar nav a').forEach(a => {
        a.classList.remove('active');
        const href = a.getAttribute('href');
        
        if (href === fullPath) {
            a.classList.add('active');
        } else if (href === path && !hash) {
            a.classList.add('active');
        }
    });
}

function escapeNotifHtml(str) {
    return String(str || '').replace(/[&<>"']/g, c => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    })[c]);
}

function formatNotifTimeAgo(isoDate) {
    if (!isoDate) return 'Recently';
    const seconds = Math.floor((new Date() - new Date(isoDate)) / 1000);
    if (seconds < 60) return 'Just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return new Date(isoDate).toLocaleDateString();
}

export function setupNotificationCenter(currentUser) {
    if (!currentUser) return;

    const bellBtn = document.getElementById('notifBellBtn');
    const panel = document.getElementById('notifPanel');
    const badge = document.getElementById('notifBadge');
    const list = document.getElementById('notifList');
    const markAllBtn = document.getElementById('notifMarkAllReadBtn');

    if (!bellBtn || !panel || !list) return;

    function renderNotifications() {
        const notifs = getUserNotifications(currentUser.email, currentUser.name);
        const unreadCount = notifs.filter(n => !n.read).length;

        if (badge) {
            badge.textContent = unreadCount > 9 ? '9+' : unreadCount;
            badge.style.display = unreadCount > 0 ? 'flex' : 'none';
        }

        if (notifs.length === 0) {
            list.innerHTML = `
                <div class="notif-empty">
                    <i class="fa-regular fa-bell-slash"></i>
                    <p>No notifications yet</p>
                    <span>You will be notified when your uploaded notes are approved or rejected.</span>
                </div>
            `;
            return;
        }

        list.innerHTML = notifs.map(n => {
            const isApproved = n.status === 'approved';
            const iconClass = isApproved ? 'approved' : 'rejected';
            const iconFa = isApproved ? 'fa-circle-check' : 'fa-circle-xmark';
            const statusLabel = isApproved ? 'Note Approved!' : 'Note Needs Revisions';
            const timeAgo = formatNotifTimeAgo(n.createdAt);

            return `
                <div class="notif-item ${n.read ? 'read' : 'unread'}" data-notif-id="${n.id}">
                    <div class="notif-item-icon ${iconClass}">
                        <i class="fa-solid ${iconFa}"></i>
                    </div>
                    <div class="notif-item-content">
                        <div class="notif-item-title">${statusLabel}</div>
                        <div class="notif-item-note">"${escapeNotifHtml(n.noteTitle || 'Study Document')}"</div>
                        ${n.adminMessage ? `<div class="notif-item-msg"><strong>Feedback:</strong> ${escapeNotifHtml(n.adminMessage)}</div>` : ''}
                        <div class="notif-item-meta">
                            <span>${timeAgo}</span>
                            <div class="notif-item-actions">
                                ${isApproved && n.noteId ? `<a href="view-note.html?id=${encodeURIComponent(n.noteId)}" class="notif-item-btn" title="View note"><i class="fa-solid fa-eye"></i> View</a>` : ''}
                                ${!n.read ? `<button type="button" class="notif-item-btn mark-read" data-read-id="${n.id}" title="Mark as read"><i class="fa-solid fa-check"></i></button>` : ''}
                                <button type="button" class="notif-item-btn delete-btn" data-del-id="${n.id}" title="Delete notification"><i class="fa-solid fa-trash-can"></i></button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        // Attach listeners
        list.querySelectorAll('[data-read-id]').forEach(btn => {
            btn.onclick = (e) => {
                e.stopPropagation();
                const id = btn.getAttribute('data-read-id');
                markNotificationAsRead(id);
                renderNotifications();
            };
        });

        list.querySelectorAll('[data-del-id]').forEach(btn => {
            btn.onclick = (e) => {
                e.stopPropagation();
                const id = btn.getAttribute('data-del-id');
                deleteNotification(id);
                renderNotifications();
            };
        });
    }

    bellBtn.onclick = (e) => {
        e.stopPropagation();
        const isOpen = panel.style.display === 'block';
        panel.style.display = isOpen ? 'none' : 'block';
        if (!isOpen) {
            renderNotifications();
        }
    };

    if (markAllBtn) {
        markAllBtn.onclick = (e) => {
            e.stopPropagation();
            markAllNotificationsAsRead(currentUser.email, currentUser.name);
            renderNotifications();
        };
    }

    // Close on outside click
    document.addEventListener('click', (e) => {
        if (!panel.contains(e.target) && !bellBtn.contains(e.target)) {
            panel.style.display = 'none';
        }
    });

    renderNotifications();
}
