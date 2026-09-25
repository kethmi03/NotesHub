// theme.js
// Set theme immediately to avoid flash of unstyled content
const root = document.documentElement;
const savedTheme = localStorage.getItem('theme');
if (savedTheme === 'dark') {
    root.setAttribute('data-theme', 'dark');
}

const initialThemeIcon = document.querySelector('#theme-toggle i');
if (initialThemeIcon && savedTheme === 'dark') {
    initialThemeIcon.classList.remove('fa-moon');
    initialThemeIcon.classList.add('fa-sun');
}

// Use event delegation so it works with dynamically loaded navbars
document.addEventListener('click', (e) => {
    const toggleBtn = e.target.closest('#theme-toggle');
    if (toggleBtn) {
        e.preventDefault();
        const icon = toggleBtn.querySelector('i');
        const currentTheme = root.getAttribute('data-theme');
        
        if (currentTheme === 'dark') {
            root.removeAttribute('data-theme');
            localStorage.setItem('theme', 'light');
            if (icon) {
                icon.classList.remove('fa-sun');
                icon.classList.add('fa-moon');
            }
        } else {
            root.setAttribute('data-theme', 'dark');
            localStorage.setItem('theme', 'dark');
            if (icon) {
                icon.classList.remove('fa-moon');
                icon.classList.add('fa-sun');
            }
        }
    }
});
