
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
        if (authContainer) {
            authContainer.innerHTML = `
                <div class="user-profile-nav">
                    <a href="saved-notes.html" class="saved-notes-quick-btn" title="Saved Notes">
                        <i class="fa-solid fa-bookmark"></i>
                    </a>
                    <a href="${profileUrl}" class="user-profile-link" title="View Profile & Settings">
                        <div class="avatar">
                            <i class="fa-solid fa-user"></i>
                        </div>
                        <span>${currentUser.name || 'Student'}</span>
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
