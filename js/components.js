export function loadNavbar() {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const themeIcon = isDark ? 'fa-sun' : 'fa-moon';

    const navbarHTML = `
    <header class="navbar">
        <div class="logo">
            <i class="fa-solid fa-book-open"></i>
            <span>Notes<span class="logo-highlight">Hub</span></span>
        </div>
        <nav>
            <a href="index.html" class="nav-link-home">Home</a>
            <a href="browse-notes.html" class="protected-link nav-link-browse">Browse Notes</a>
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
                <div class="logo">
                    <i class="fa-solid fa-book-open"></i>
                    <span>Notes<span class="logo-highlight">Hub</span></span>
                </div>
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
    if (!authContainer) return;
    
    if (currentUser) {
        const isAdmin = currentUser.role === 'admin' || currentUser.email?.toLowerCase() === 'admin@gmail.com';
        const dashboardLink = isAdmin ? 'admin-dashboard.html' : 'dashboard.html';
        const adminBadge = isAdmin ? `
            <a href="admin-dashboard.html" class="primary-btn" style="padding: 6px 12px; font-size: 13px; text-decoration: none; border-radius: 6px; display: inline-flex; align-items: center; gap: 6px;">
                <i class="fa-solid fa-shield-halved"></i> Admin Panel
            </a>
        ` : '';

        authContainer.innerHTML = `
            ${adminBadge}
            <div class="user-profile-nav">
                <div class="avatar" style="${isAdmin ? 'background: #eef2ff; color: #4f46e5;' : ''}">
                    <i class="fa-solid ${isAdmin ? 'fa-shield-halved' : 'fa-user'}"></i>
                </div>
                <a href="${dashboardLink}" style="text-decoration: none; color: inherit; font-weight: 600;">${currentUser.name || (isAdmin ? 'Admin' : 'Student')}</a>
                <button class="logout-btn" title="Logout">
                    <i class="fa-solid fa-right-from-bracket"></i>
                </button>
            </div>
        `;

        // If admin, ensure navbar has quick access to upload notes and admin overview
        const nav = document.querySelector('.navbar nav');
        if (isAdmin && nav && !document.querySelector('.nav-link-admin')) {
            const adminLink = document.createElement('a');
            adminLink.href = 'admin-dashboard.html';
            adminLink.className = 'nav-link-admin';
            adminLink.innerHTML = '<i class="fa-solid fa-shield-halved"></i> Admin';
            adminLink.style.fontWeight = '700';
            adminLink.style.color = 'var(--primary-color)';
            nav.appendChild(adminLink);
        }
    } else {
        authContainer.innerHTML = `
            <a href="login.html" class="login-btn">Login</a>
            <a href="register.html" class="register-btn">Get Started</a>
        `;
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
