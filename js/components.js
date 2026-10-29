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
        const studentPreset = avatarMap[currentUser.avatar] || avatarMap.student;
        const avatarStyle = isAdmin ? 'background: #eef2ff; color: #4f46e5;' : `background: ${studentPreset.bg}; color: ${studentPreset.color};`;
        const avatarIcon = isAdmin ? 'fa-shield-halved' : studentPreset.icon;

        authContainer.innerHTML = `
            ${adminBadge}
            <div class="user-profile-nav">
                <div class="avatar" style="${avatarStyle}">
                    <i class="fa-solid ${avatarIcon}"></i>
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
