import { getNotes, getSavedNotes, saveNoteForLater, removeSavedNote, getCurrentUser } from './storage.js';
import { getFirebaseNotes, isFirebaseConfigured } from './firebase.js';

// Comprehensive, realistic sample notes
const defaultNotes = [
    {
        id: 'software-engineering-lectures',
        title: "Software Engineering Lectures",
        module: "SE3106",
        gradeLevel: "Y3S1",
        subject: "Computer Science",
        uploadedBy: "Sarah Jenkins",
        rating: 4.8,
        reviews: 24,
        downloads: 156,
        type: "pdf",
        pages: 64,
        description: "Complete lecture notes covering the software development life cycle (SDLC), agile development methodologies, architectural patterns, software testing, and CI/CD pipelines.",
        isTrending: true,
        isPopular: true,
        isTopRated: true,
        isNew: false,
        createdAt: "2026-10-18T10:00:00Z"
    },
    {
        id: 'data-structures-complete-summary',
        title: "Data Structures Complete Summary",
        module: "CS2001",
        gradeLevel: "Y2S1",
        subject: "Computer Science",
        uploadedBy: "Mike Ross",
        rating: 4.9,
        reviews: 42,
        downloads: 312,
        type: "word",
        pages: 48,
        description: "In-depth cheat sheets and code snippets for linked lists, binary search trees, AVL trees, hash tables, Dijkstra algorithms, graph traversals, and dynamic programming.",
        isTrending: true,
        isPopular: true,
        isTopRated: true,
        isNew: false,
        createdAt: "2026-10-22T14:30:00Z"
    },
    {
        id: 'database-management-systems',
        title: "Database Management Systems",
        module: "DB2104",
        gradeLevel: "Y2S2",
        subject: "Computer Science",
        uploadedBy: "Emma Watson",
        rating: 4.5,
        reviews: 18,
        downloads: 89,
        type: "powerpoint",
        pages: 82,
        description: "Visual slides on relational algebra, SQL optimization, B-trees, ACID properties, transaction concurrency control, and NoSQL architecture with MongoDB examples.",
        isTrending: false,
        isPopular: true,
        isTopRated: false,
        isNew: false,
        createdAt: "2026-09-15T09:00:00Z"
    },
    {
        id: 'engineering-calculus-differential-eq',
        title: "Calculus & Differential Equations",
        module: "MATH101",
        gradeLevel: "Undergraduate",
        subject: "Mathematics",
        uploadedBy: "Prof. Alan Baker",
        rating: 4.9,
        reviews: 56,
        downloads: 420,
        type: "pdf",
        pages: 75,
        description: "Step-by-step solutions for multivariable limits, Fourier series, partial differential equations, Laplace transforms, and vector calculus problem sets.",
        isTrending: true,
        isPopular: true,
        isTopRated: true,
        isNew: false,
        createdAt: "2026-10-25T11:00:00Z"
    },
    {
        id: 'computer-networks-past-papers',
        title: "Computer Networks Past Papers",
        module: "NW3002",
        gradeLevel: "Y3S2",
        subject: "Computer Science",
        uploadedBy: "John Doe",
        rating: 4.7,
        reviews: 12,
        downloads: 145,
        type: "pdf",
        pages: 35,
        description: "Comprehensive solved past exam papers spanning OSI model, TCP/IP handshake, subnetting exercises, routing protocols (OSPF, BGP), and network security questions.",
        isTrending: false,
        isPopular: false,
        isTopRated: false,
        isNew: true,
        createdAt: "2026-10-29T16:00:00Z"
    },
    {
        id: 'financial-accounting-principles',
        title: "Financial Accounting & Business Valuation",
        module: "ACC2010",
        gradeLevel: "Y2S1",
        subject: "Business",
        uploadedBy: "Jessica Pearson",
        rating: 4.6,
        reviews: 20,
        downloads: 110,
        type: "word",
        pages: 52,
        description: "Comprehensive study guide on balance sheets, cash flow statement analysis, GAAP vs IFRS rules, working capital management, and company valuation models.",
        isTrending: false,
        isPopular: false,
        isTopRated: false,
        isNew: true,
        createdAt: "2026-10-27T08:00:00Z"
    },
    {
        id: 'quantum-physics-mechanics',
        title: "Quantum Physics & Modern Mechanics",
        module: "PHY300",
        gradeLevel: "Grade 12 - 13",
        subject: "Physics",
        uploadedBy: "Liam Neeson",
        rating: 4.8,
        reviews: 31,
        downloads: 230,
        type: "pdf",
        pages: 40,
        description: "Diagram-rich summary on wave-particle duality, Schrödinger equation, quantum tunneling, atomic spectra, photoelectric effect, and thermodynamics fundamentals.",
        isTrending: true,
        isPopular: true,
        isTopRated: true,
        isNew: false,
        createdAt: "2026-10-12T13:45:00Z"
    },
    {
        id: 'organic-chemistry-reactions',
        title: "Organic Chemistry Reactions & Mechanisms",
        module: "CHEM202",
        gradeLevel: "Grade 12 - 13",
        subject: "Science",
        uploadedBy: "Olivia Wilde",
        rating: 4.7,
        reviews: 28,
        downloads: 185,
        type: "pdf",
        pages: 58,
        description: "High-yield revision maps for nucleophilic substitution (SN1/SN2), elimination (E1/E2), aromatic chemistry, carbon-carbon bond formation, and spectroscopy analysis.",
        isTrending: false,
        isPopular: true,
        isTopRated: false,
        isNew: false,
        createdAt: "2026-09-30T17:15:00Z"
    },
    {
        id: 'microeconomics-market-structures',
        title: "Microeconomics & Market Structures",
        module: "ECON101",
        gradeLevel: "Y1S2",
        subject: "Economics",
        uploadedBy: "David Clark",
        rating: 4.6,
        reviews: 15,
        downloads: 115,
        type: "powerpoint",
        pages: 45,
        description: "Engaging lecture decks on supply/demand elasticity, perfect competition vs monopoly, game theory, consumer surplus, externalities, and public goods.",
        isTrending: false,
        isPopular: false,
        isTopRated: false,
        isNew: true,
        createdAt: "2026-10-28T12:00:00Z"
    },
    {
        id: 'cellular-biology-genetics',
        title: "Cellular Biology & Modern Genetics",
        module: "BIO205",
        gradeLevel: "Grade 12 - 13",
        subject: "Biology",
        uploadedBy: "Rachel Green",
        rating: 4.8,
        reviews: 34,
        downloads: 260,
        type: "pdf",
        pages: 62,
        description: "Full exam review on DNA replication, CRISPR gene editing, transcription & translation, cellular respiration pathways, Mendelian inheritance, and evolutionary biology.",
        isTrending: true,
        isPopular: true,
        isTopRated: true,
        isNew: false,
        createdAt: "2026-10-14T09:30:00Z"
    },
    {
        id: 'fluid-mechanics-thermodynamics',
        title: "Fluid Mechanics & Heat Transfer",
        module: "ME2102",
        gradeLevel: "Y2S2",
        subject: "Engineering",
        uploadedBy: "Harvey Specter",
        rating: 4.8,
        reviews: 22,
        downloads: 178,
        type: "pdf",
        pages: 55,
        description: "Bernoulli equation derivations, Navier-Stokes simplified solutions, boundary layer theory, pipe flow pressure drops, and heat exchanger design principles.",
        isTrending: true,
        isPopular: false,
        isTopRated: true,
        isNew: false,
        createdAt: "2026-10-05T14:00:00Z"
    }
];

// State
let allNotesList = [];
let currentFilteredNotes = [];
let currentPage = 1;
const ITEMS_PER_PAGE = 6;
let currentViewMode = 'grid';
let activeFormatFilter = 'all';
let activeSpotlightTab = 'trending';
let spotlightCurrentIndex = 0;
let spotlightAutoplayTimer = null;

// Helper: Toast Notifications
export function showToast(message, type = 'success', icon = 'fa-check') {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast-item ${type}`;
    toast.innerHTML = `<i class="fa-solid ${icon}"></i> <span>${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
        toast.classList.add('fade-out');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Helper: Format Icon & Styling
function getFileFormatMeta(note) {
    const fileName = (note.fileName || '').toLowerCase();
    const type = (note.type || '').toLowerCase();

    if (type === 'word' || /\.(doc|docx)$/.test(fileName)) {
        return {
            class: 'word',
            label: 'DOCX',
            icon: 'fa-file-word',
            style: 'background: #e0f2fe; color: #0284c7;'
        };
    }
    if (type === 'powerpoint' || /\.(ppt|pptx)$/.test(fileName)) {
        return {
            class: 'powerpoint',
            label: 'PPTX',
            icon: 'fa-file-powerpoint',
            style: 'background: #fef3c7; color: #d97706;'
        };
    }
    return {
        class: 'pdf',
        label: 'PDF',
        icon: 'fa-file-pdf',
        style: 'background: #fee2e2; color: #dc2626;'
    };
}

// Helper: Check if note is saved in user's library
function isNoteSaved(noteId) {
    try {
        const saved = getSavedNotes();
        return saved.some(n => String(n.id) === String(noteId));
    } catch (e) {
        return false;
    }
}

// ================= SPOTLIGHT / SWAPPING CARDS CAROUSEL =================
function renderSpotlightCards() {
    const track = document.getElementById('spotlightTrack');
    const dotsContainer = document.getElementById('spotlightDots');
    if (!track) return;

    // Filter notes based on active tab
    let spotlightNotes = [];
    if (activeSpotlightTab === 'trending') {
        spotlightNotes = allNotesList.filter(n => n.isTrending || n.downloads > 150);
    } else if (activeSpotlightTab === 'popular') {
        spotlightNotes = [...allNotesList].sort((a, b) => (b.downloads || 0) - (a.downloads || 0));
    } else if (activeSpotlightTab === 'top-rated') {
        spotlightNotes = [...allNotesList].sort((a, b) => (b.rating || 0) - (a.rating || 0));
    } else {
        spotlightNotes = [...allNotesList].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    }

    spotlightNotes = spotlightNotes.slice(0, 6); // Max 6 featured items
    if (spotlightNotes.length === 0) spotlightNotes = allNotesList.slice(0, 4);

    track.innerHTML = '';
    spotlightNotes.forEach((note, index) => {
        const formatMeta = getFileFormatMeta(note);
        const saved = isNoteSaved(note.id);

        let badgeLabel = '🔥 Trending';
        let badgeClass = 'trending';
        if (activeSpotlightTab === 'popular') {
            badgeLabel = '⭐ Popular';
            badgeClass = 'popular';
        } else if (activeSpotlightTab === 'top-rated') {
            badgeLabel = '🏆 Top Rated';
            badgeClass = 'top-rated';
        } else if (activeSpotlightTab === 'new') {
            badgeLabel = '✨ New';
            badgeClass = 'new';
        }

        const card = document.createElement('div');
        card.className = 'spotlight-card';
        card.innerHTML = `
            <span class="spotlight-card-badge ${badgeClass}">${badgeLabel}</span>
            <div class="spotlight-card-top">
                <div class="spotlight-icon ${formatMeta.class}">
                    <i class="fa-solid ${formatMeta.icon}"></i>
                </div>
                <div class="spotlight-meta-info">
                    <span class="spotlight-subject-tag">${note.subject || 'General'}</span>
                    <h4 class="spotlight-card-title">
                        <a href="view-note.html?id=${encodeURIComponent(note.id || note.title)}">${note.title}</a>
                    </h4>
                    <span class="spotlight-module">${note.module || ''} • ${note.gradeLevel || 'Undergraduate'}</span>
                </div>
            </div>
            <div class="spotlight-stats-row">
                <span><i class="fa-solid fa-star"></i> ${note.rating || 4.8} (${note.reviews || 20})</span>
                <span><i class="fa-solid fa-download"></i> ${note.downloads || 100}</span>
                <span><i class="fa-solid fa-file-lines"></i> ${note.pages || 40} pgs</span>
            </div>
            <div class="spotlight-card-actions">
                <button type="button" class="spotlight-btn-preview" data-id="${note.id}">
                    <i class="fa-regular fa-eye"></i> Quick Preview
                </button>
                <a href="view-note.html?id=${encodeURIComponent(note.id || note.title)}" class="spotlight-btn-view">
                    View <i class="fa-solid fa-arrow-right"></i>
                </a>
            </div>
        `;

        card.querySelector('.spotlight-btn-preview').addEventListener('click', () => {
            openQuickPreview(note);
        });

        track.appendChild(card);
    });

    // Update dots
    if (dotsContainer) {
        dotsContainer.innerHTML = '';
        const numCards = spotlightNotes.length;
        const visibleCards = window.innerWidth <= 640 ? 1 : (window.innerWidth <= 1080 ? 2 : 3);
        const numDots = Math.max(1, numCards - visibleCards + 1);

        for (let i = 0; i < numDots; i++) {
            const dot = document.createElement('div');
            dot.className = `spotlight-dot ${i === spotlightCurrentIndex ? 'active' : ''}`;
            dot.addEventListener('click', () => {
                spotlightCurrentIndex = i;
                updateSpotlightPosition();
            });
            dotsContainer.appendChild(dot);
        }
    }

    spotlightCurrentIndex = 0;
    updateSpotlightPosition();
}

function updateSpotlightPosition() {
    const track = document.getElementById('spotlightTrack');
    const dotsContainer = document.getElementById('spotlightDots');
    if (!track) return;

    const cards = track.querySelectorAll('.spotlight-card');
    if (cards.length === 0) return;

    const cardWidth = cards[0].offsetWidth + 20; // 20px gap
    const visibleCards = window.innerWidth <= 640 ? 1 : (window.innerWidth <= 1080 ? 2 : 3);
    const maxIndex = Math.max(0, cards.length - visibleCards);

    if (spotlightCurrentIndex > maxIndex) spotlightCurrentIndex = 0;
    if (spotlightCurrentIndex < 0) spotlightCurrentIndex = maxIndex;

    track.style.transform = `translateX(-${spotlightCurrentIndex * cardWidth}px)`;

    if (dotsContainer) {
        const dots = dotsContainer.querySelectorAll('.spotlight-dot');
        dots.forEach((dot, idx) => {
            dot.classList.toggle('active', idx === spotlightCurrentIndex);
        });
    }
}

function setupSpotlightShowcase() {
    // Tabs click
    const tabs = document.querySelectorAll('.spotlight-tab');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            activeSpotlightTab = tab.getAttribute('data-tab');
            renderSpotlightCards();
        });
    });

    // Nav buttons
    const prevBtn = document.getElementById('spotlightPrev');
    const nextBtn = document.getElementById('spotlightNext');

    if (prevBtn) {
        prevBtn.addEventListener('click', () => {
            spotlightCurrentIndex--;
            updateSpotlightPosition();
        });
    }

    if (nextBtn) {
        nextBtn.addEventListener('click', () => {
            spotlightCurrentIndex++;
            updateSpotlightPosition();
        });
    }

    // Auto-advance spotlight every 6 seconds
    const showcase = document.querySelector('.spotlight-showcase');
    function startAutoplay() {
        stopAutoplay();
        spotlightAutoplayTimer = setInterval(() => {
            spotlightCurrentIndex++;
            updateSpotlightPosition();
        }, 6000);
    }
    function stopAutoplay() {
        if (spotlightAutoplayTimer) clearInterval(spotlightAutoplayTimer);
    }

    if (showcase) {
        showcase.addEventListener('mouseenter', stopAutoplay);
        showcase.addEventListener('mouseleave', startAutoplay);
    }

    window.addEventListener('resize', () => {
        updateSpotlightPosition();
    });

    startAutoplay();
}

// ================= NOTE CARDS RENDERING =================
function renderNotes(notes) {
    const grid = document.getElementById('marketplaceGrid');
    const resultsCount = document.getElementById('resultsCount');
    if (!grid) return;

    grid.innerHTML = '';
    currentFilteredNotes = notes;

    if (resultsCount) {
        resultsCount.textContent = `Showing ${notes.length} note${notes.length === 1 ? '' : 's'}`;
    }

    if (notes.length === 0) {
        grid.innerHTML = `
            <div class="empty-notes-state">
                <div class="empty-icon-circle">
                    <i class="fa-solid fa-magnifying-glass"></i>
                </div>
                <h3>No study notes found</h3>
                <p>We couldn't find any materials matching your criteria. Try adjusting your search keywords, grade ranges, or subject filters.</p>
                <button type="button" class="empty-reset-btn" id="emptyResetFiltersBtn">
                    <i class="fa-solid fa-rotate-left"></i> Reset All Filters
                </button>
            </div>
        `;
        document.getElementById('emptyResetFiltersBtn')?.addEventListener('click', resetAllFilters);
        renderPagination(0);
        return;
    }

    // Paginate notes
    const totalPages = Math.ceil(notes.length / ITEMS_PER_PAGE);
    if (currentPage > totalPages) currentPage = 1;
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const paginatedNotes = notes.slice(startIndex, startIndex + ITEMS_PER_PAGE);

    paginatedNotes.forEach(note => {
        const formatMeta = getFileFormatMeta(note);
        const noteId = String(note.id || note.title);
        const saved = isNoteSaved(noteId);

        const card = document.createElement('div');
        card.className = 'market-card reveal active';
        card.innerHTML = `
            <div class="market-card-top">
                <div class="card-top-badges">
                    <span class="format-badge ${formatMeta.class}">${formatMeta.label}</span>
                    <span class="subject-badge">${note.subject || 'General'}</span>
                </div>

                <button class="card-bookmark-btn ${saved ? 'saved' : ''}" data-id="${noteId}" title="${saved ? 'Remove from Saved' : 'Save for Later'}">
                    <i class="fa-${saved ? 'solid' : 'regular'} fa-bookmark"></i>
                </button>

                <div class="note-icon-large" style="${formatMeta.style}">
                    <i class="fa-solid ${formatMeta.icon}"></i>
                </div>

                <div class="card-hover-overlay">
                    <button class="quick-preview-hover-btn" data-id="${noteId}">
                        <i class="fa-regular fa-eye"></i> Quick Preview
                    </button>
                </div>
            </div>

            <div class="market-card-body">
                <div class="card-module-row">
                    <span class="module-code">${note.module || 'Note'}</span>
                    <span class="grade-pill">${note.gradeLevel || 'Undergraduate'}</span>
                </div>

                <h3><a href="view-note.html?id=${encodeURIComponent(noteId)}">${note.title}</a></h3>

                <p class="note-excerpt">${note.description || 'Comprehensive class summary and study material compiled for students.'}</p>

                <div class="author-info">
                    <div class="avatar-small"><i class="fa-solid fa-user"></i></div>
                    <span>By ${note.uploadedByName || note.uploadedBy || 'Student'}</span>
                    <i class="fa-solid fa-circle-check verified-icon" title="Verified Contributor"></i>
                </div>

                <div class="market-stats">
                    <div class="stat-group">
                        <span class="stat-item"><i class="fa-solid fa-star"></i> ${note.rating || 4.8} (${note.reviews || 0})</span>
                        <span class="stat-item"><i class="fa-solid fa-download"></i> ${note.downloads || 0}</span>
                    </div>
                    <a href="view-note.html?id=${encodeURIComponent(noteId)}" class="card-view-link">
                        View Note <i class="fa-solid fa-arrow-right"></i>
                    </a>
                </div>
            </div>
        `;

        // Bookmark Toggle
        const bookmarkBtn = card.querySelector('.card-bookmark-btn');
        bookmarkBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            toggleBookmark(note, bookmarkBtn);
        });

        // Quick Preview
        const previewBtn = card.querySelector('.quick-preview-hover-btn');
        previewBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            openQuickPreview(note);
        });

        grid.appendChild(card);
    });

    renderPagination(totalPages);
}

// ================= BOOKMARK HANDLER =================
function toggleBookmark(note, buttonElement) {
    const noteId = String(note.id || note.title);
    const currentUser = getCurrentUser();

    if (!currentUser) {
        showToast('Please sign in to save notes to your library.', 'info', 'fa-lock');
        return;
    }

    const saved = isNoteSaved(noteId);
    if (saved) {
        removeSavedNote(noteId);
        buttonElement.classList.remove('saved');
        buttonElement.innerHTML = '<i class="fa-regular fa-bookmark"></i>';
        buttonElement.title = 'Save for Later';
        showToast(`Removed "${note.title}" from Saved Notes`, 'info', 'fa-bookmark');
    } else {
        saveNoteForLater({
            id: noteId,
            title: note.title,
            module: note.module,
            gradeLevel: note.gradeLevel,
            subject: note.subject,
            uploadedBy: note.uploadedByName || note.uploadedBy,
            rating: note.rating,
            reviews: note.reviews,
            downloads: note.downloads,
            type: note.type,
            fileName: note.fileName,
            fileUrl: note.fileUrl
        });
        buttonElement.classList.add('saved');
        buttonElement.innerHTML = '<i class="fa-solid fa-bookmark"></i>';
        buttonElement.title = 'Remove from Saved';
        showToast(`Saved "${note.title}" to your library! 🔖`, 'success', 'fa-bookmark');
    }

    // Also update modal save button if open for this note
    const modalSaveBtn = document.getElementById('modalSaveBtn');
    if (modalSaveBtn && modalSaveBtn.getAttribute('data-id') === noteId) {
        const isNowSaved = !saved;
        modalSaveBtn.classList.toggle('saved', isNowSaved);
        modalSaveBtn.innerHTML = `<i class="fa-${isNowSaved ? 'solid' : 'regular'} fa-bookmark"></i> <span>${isNowSaved ? 'Saved in Library' : 'Save for Later'}</span>`;
    }
}

// ================= QUICK PREVIEW MODAL =================
function openQuickPreview(note) {
    const modal = document.getElementById('quickPreviewModal');
    if (!modal) return;

    const formatMeta = getFileFormatMeta(note);
    const noteId = String(note.id || note.title);
    const saved = isNoteSaved(noteId);

    // Format icon
    const formatIcon = document.getElementById('modalFormatIcon');
    if (formatIcon) {
        formatIcon.className = `modal-icon-badge ${formatMeta.class}`;
        formatIcon.innerHTML = `<i class="fa-solid ${formatMeta.icon}"></i>`;
    }

    // Meta pills
    const metaPills = document.getElementById('modalMetaPills');
    if (metaPills) {
        metaPills.innerHTML = `
            <span class="format-badge ${formatMeta.class}">${formatMeta.label}</span>
            <span class="subject-badge">${note.subject || 'General'}</span>
            <span class="module-code">${note.module || ''}</span>
        `;
    }

    // Title & Author
    document.getElementById('modalNoteTitle').textContent = note.title;
    document.getElementById('modalAuthorName').textContent = `By ${note.uploadedByName || note.uploadedBy || 'Student'}`;
    document.getElementById('modalDescription').textContent = note.description || 'Complete study notes compiled for easy reading, exam revision, and coursework review.';

    // Specs
    document.getElementById('modalPages').textContent = `${note.pages || 40} pages`;
    document.getElementById('modalDownloads').textContent = `${note.downloads || 0}+ downloads`;
    document.getElementById('modalRating').textContent = `${note.rating || 4.8}★ (${note.reviews || 0} reviews)`;
    document.getElementById('modalDate').textContent = note.gradeLevel || 'Undergraduate';

    // Open Full Note link
    const openFullBtn = document.getElementById('modalOpenFullBtn');
    if (openFullBtn) {
        openFullBtn.href = `view-note.html?id=${encodeURIComponent(noteId)}`;
    }

    // Save button
    const modalSaveBtn = document.getElementById('modalSaveBtn');
    if (modalSaveBtn) {
        modalSaveBtn.setAttribute('data-id', noteId);
        modalSaveBtn.classList.toggle('saved', saved);
        modalSaveBtn.innerHTML = `<i class="fa-${saved ? 'solid' : 'regular'} fa-bookmark"></i> <span>${saved ? 'Saved in Library' : 'Save for Later'}</span>`;

        // Replace click handler cleanly
        modalSaveBtn.onclick = () => {
            const currentCardBtn = document.querySelector(`.card-bookmark-btn[data-id="${noteId}"]`);
            toggleBookmark(note, currentCardBtn || modalSaveBtn);
        };
    }

    modal.classList.add('active');
    modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
}

function closeQuickPreview() {
    const modal = document.getElementById('quickPreviewModal');
    if (!modal) return;
    modal.classList.remove('active');
    modal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
}

// ================= FILTER & SEARCH LOGIC =================
function handleFilters() {
    const searchInput = document.getElementById('searchInput');
    const term = (searchInput?.value || '').trim().toLowerCase();

    // Toggle clear search button
    const clearBtn = document.getElementById('clearSearchBtn');
    if (clearBtn) {
        clearBtn.style.display = term ? 'flex' : 'none';
    }

    // Active Subject checkboxes
    const subjectCheckboxes = document.querySelectorAll('.filter-group:nth-child(2) input[type="checkbox"]:checked');
    const selectedSubjects = Array.from(subjectCheckboxes).map(cb => cb.value.toLowerCase());

    // Active Grade checkboxes
    const gradeCheckboxes = document.querySelectorAll('.filter-group:nth-child(3) input[type="checkbox"]:checked');
    const selectedGrades = Array.from(gradeCheckboxes).map(cb => cb.value.toLowerCase());

    // Semester filter
    const semesterSelect = document.getElementById('semesterSelect');
    const selectedSemester = (semesterSelect?.value || '').toLowerCase();

    // Min Rating filter
    const selectedRatingRadio = document.querySelector('input[name="minRating"]:checked');
    const minRating = parseFloat(selectedRatingRadio?.value || '0');

    // Filter notes
    let filtered = allNotesList.filter(note => {
        // Search matching
        const titleMatch = (note.title || '').toLowerCase().includes(term);
        const moduleMatch = (note.module || '').toLowerCase().includes(term);
        const descMatch = (note.description || '').toLowerCase().includes(term);
        const subjectMatchTerm = (note.subject || '').toLowerCase().includes(term);
        const matchesSearch = !term || titleMatch || moduleMatch || descMatch || subjectMatchTerm;

        // Subject matching
        const noteSubject = (note.subject || '').toLowerCase();
        const matchesSubject = selectedSubjects.length === 0 || selectedSubjects.includes(noteSubject);

        // Grade matching
        const noteGrade = (note.gradeLevel || '').toLowerCase();
        const matchesGrade = selectedGrades.length === 0 || selectedGrades.some(g => noteGrade.includes(g));

        // Semester matching
        const matchesSemester = !selectedSemester || noteGrade.includes(selectedSemester) || (note.module || '').toLowerCase().includes(selectedSemester);

        // Format matching
        const noteType = (note.type || '').toLowerCase();
        const noteFileName = (note.fileName || '').toLowerCase();
        let matchesFormat = true;
        if (activeFormatFilter === 'pdf') {
            matchesFormat = noteType === 'pdf' || noteFileName.endsWith('.pdf');
        } else if (activeFormatFilter === 'word') {
            matchesFormat = noteType === 'word' || /\.(doc|docx)$/.test(noteFileName);
        } else if (activeFormatFilter === 'powerpoint') {
            matchesFormat = noteType === 'powerpoint' || /\.(ppt|pptx)$/.test(noteFileName);
        }

        // Rating matching
        const matchesRating = !minRating || (note.rating || 0) >= minRating;

        return matchesSearch && matchesSubject && matchesGrade && matchesSemester && matchesFormat && matchesRating;
    });

    // Sorting
    const sortSelect = document.getElementById('sortSelect');
    const sortVal = sortSelect?.value || 'popular';

    if (sortVal === 'popular') {
        filtered.sort((a, b) => ((b.downloads || 0) * (b.rating || 1)) - ((a.downloads || 0) * (a.rating || 1)));
    } else if (sortVal === 'rating') {
        filtered.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    } else if (sortVal === 'downloads') {
        filtered.sort((a, b) => (b.downloads || 0) - (a.downloads || 0));
    } else if (sortVal === 'newest') {
        filtered.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    } else if (sortVal === 'title') {
        filtered.sort((a, b) => a.title.localeCompare(b.title));
    }

    currentPage = 1;
    renderNotes(filtered);
    updateActiveFilterBadges(term, selectedSubjects, selectedGrades, selectedSemester);
    updateMobileSummary(selectedSubjects);
}

function updateActiveFilterBadges(term, subjects, grades, semester) {
    const container = document.getElementById('activeFilterTags');
    if (!container) return;

    container.innerHTML = '';
    const tags = [];

    if (term) tags.push({ type: 'search', label: `Search: "${term}"` });
    subjects.forEach(s => tags.push({ type: 'subject', val: s, label: s }));
    grades.forEach(g => tags.push({ type: 'grade', val: g, label: g }));
    if (semester) tags.push({ type: 'semester', label: `Semester: ${semester.toUpperCase()}` });
    if (activeFormatFilter !== 'all') tags.push({ type: 'format', label: `Format: ${activeFormatFilter.toUpperCase()}` });

    tags.forEach(tag => {
        const tagEl = document.createElement('span');
        tagEl.className = 'active-tag';
        tagEl.innerHTML = `
            <span>${tag.label}</span>
            <button class="active-tag-remove" aria-label="Remove filter">&times;</button>
        `;
        tagEl.querySelector('.active-tag-remove').addEventListener('click', () => {
            removeFilter(tag);
        });
        container.appendChild(tagEl);
    });
}

function removeFilter(tag) {
    if (tag.type === 'search') {
        const input = document.getElementById('searchInput');
        if (input) input.value = '';
    } else if (tag.type === 'subject') {
        const cbs = document.querySelectorAll('.filter-group:nth-child(2) input[type="checkbox"]');
        cbs.forEach(cb => {
            if (cb.value.toLowerCase() === tag.val) cb.checked = false;
        });
        // Also sync chip
        const chips = document.querySelectorAll('.category-chip');
        chips.forEach(c => {
            if (c.getAttribute('data-subject').toLowerCase() === tag.val) {
                c.classList.remove('active');
            }
        });
    } else if (tag.type === 'grade') {
        const cbs = document.querySelectorAll('.filter-group:nth-child(3) input[type="checkbox"]');
        cbs.forEach(cb => {
            if (cb.value.toLowerCase() === tag.val) cb.checked = false;
        });
    } else if (tag.type === 'semester') {
        const semSelect = document.getElementById('semesterSelect');
        if (semSelect) semSelect.value = '';
    } else if (tag.type === 'format') {
        activeFormatFilter = 'all';
        document.querySelectorAll('.format-chip-btn').forEach(btn => {
            btn.classList.toggle('active', btn.getAttribute('data-format') === 'all');
        });
    }
    handleFilters();
}

function resetAllFilters() {
    const searchInput = document.getElementById('searchInput');
    if (searchInput) searchInput.value = '';

    document.querySelectorAll('.filters-sidebar input[type="checkbox"]').forEach(cb => cb.checked = false);

    const semSelect = document.getElementById('semesterSelect');
    if (semSelect) semSelect.value = '';

    const defaultRadio = document.querySelector('input[name="minRating"][value="0"]');
    if (defaultRadio) defaultRadio.checked = true;

    activeFormatFilter = 'all';
    document.querySelectorAll('.format-chip-btn').forEach(btn => {
        btn.classList.toggle('active', btn.getAttribute('data-format') === 'all');
    });

    document.querySelectorAll('.category-chip').forEach(chip => {
        chip.classList.toggle('active', chip.getAttribute('data-subject') === 'all');
    });

    handleFilters();
    showToast('All filters have been reset.', 'info', 'fa-rotate-left');
}

function updateMobileSummary(selectedSubjects) {
    const summary = document.getElementById('mobileSummaryText');
    if (!summary) return;

    if (selectedSubjects.length === 0) {
        summary.textContent = 'All Subjects';
    } else if (selectedSubjects.length === 1) {
        summary.textContent = selectedSubjects[0].charAt(0).toUpperCase() + selectedSubjects[0].slice(1);
    } else {
        summary.textContent = `${selectedSubjects.length} Subjects Active`;
    }
}

// ================= PAGINATION RENDERING =================
function renderPagination(totalPages) {
    const paginationContainer = document.getElementById('paginationContainer');
    const pageNumbers = document.getElementById('pageNumbers');
    const prevBtn = document.getElementById('prevPageBtn');
    const nextBtn = document.getElementById('nextPageBtn');

    if (!paginationContainer || !pageNumbers) return;

    if (totalPages <= 1) {
        paginationContainer.style.display = 'none';
        return;
    }

    paginationContainer.style.display = 'flex';
    pageNumbers.innerHTML = '';

    if (prevBtn) prevBtn.disabled = currentPage === 1;
    if (nextBtn) nextBtn.disabled = currentPage === totalPages;

    for (let i = 1; i <= totalPages; i++) {
        const btn = document.createElement('button');
        btn.className = `page-btn ${i === currentPage ? 'active' : ''}`;
        btn.textContent = i;
        btn.addEventListener('click', () => {
            currentPage = i;
            renderNotes(currentFilteredNotes);
            document.querySelector('.browse-header')?.scrollIntoView({ behavior: 'smooth' });
        });
        pageNumbers.appendChild(btn);
    }

    if (prevBtn) {
        prevBtn.onclick = () => {
            if (currentPage > 1) {
                currentPage--;
                renderNotes(currentFilteredNotes);
                document.querySelector('.browse-header')?.scrollIntoView({ behavior: 'smooth' });
            }
        };
    }

    if (nextBtn) {
        nextBtn.onclick = () => {
            if (currentPage < totalPages) {
                currentPage++;
                renderNotes(currentFilteredNotes);
                document.querySelector('.browse-header')?.scrollIntoView({ behavior: 'smooth' });
            }
        };
    }
}

// ================= SETUP MAIN BROWSE PAGE =================
export async function setupBrowsePage() {
    const grid = document.getElementById('marketplaceGrid');
    if (!grid) return;

    // Fetch notes from Firebase or local storage
    const storedNotes = isFirebaseConfigured ? await getFirebaseNotes() : getNotes();
    allNotesList = [...defaultNotes, ...storedNotes];

    // Render Spotlight showcase
    renderSpotlightCards();
    setupSpotlightShowcase();

    // Search input listener
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', () => handleFilters());
    }

    const clearSearchBtn = document.getElementById('clearSearchBtn');
    if (clearSearchBtn) {
        clearSearchBtn.addEventListener('click', () => {
            if (searchInput) searchInput.value = '';
            handleFilters();
        });
    }

    // Checkboxes change listeners
    const checkboxes = document.querySelectorAll('.filters-sidebar input[type="checkbox"]');
    checkboxes.forEach(cb => {
        cb.addEventListener('change', () => {
            // Sync with category chips if subject checkbox changed
            const checkedSubjects = Array.from(document.querySelectorAll('.filter-group:nth-child(2) input[type="checkbox"]:checked')).map(c => c.value);
            const chips = document.querySelectorAll('.category-chip');
            if (checkedSubjects.length === 1) {
                chips.forEach(c => c.classList.toggle('active', c.getAttribute('data-subject') === checkedSubjects[0]));
            } else if (checkedSubjects.length === 0) {
                chips.forEach(c => c.classList.toggle('active', c.getAttribute('data-subject') === 'all'));
            } else {
                chips.forEach(c => c.classList.remove('active'));
            }
            handleFilters();
        });
    });

    // Quick Category Chips
    const categoryChips = document.querySelectorAll('.category-chip');
    categoryChips.forEach(chip => {
        chip.addEventListener('click', () => {
            const subject = chip.getAttribute('data-subject');
            categoryChips.forEach(c => c.classList.remove('active'));
            chip.classList.add('active');

            // Update sidebar subject checkboxes
            const subjectCheckboxes = document.querySelectorAll('.filter-group:nth-child(2) input[type="checkbox"]');
            subjectCheckboxes.forEach(cb => {
                cb.checked = subject !== 'all' && cb.value.toLowerCase() === subject.toLowerCase();
            });

            handleFilters();
        });
    });

    // Semester and Sort selects
    document.getElementById('semesterSelect')?.addEventListener('change', handleFilters);
    document.getElementById('sortSelect')?.addEventListener('change', handleFilters);

    // Format Chips filter
    const formatChips = document.querySelectorAll('.format-chip-btn');
    formatChips.forEach(btn => {
        btn.addEventListener('click', () => {
            formatChips.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            activeFormatFilter = btn.getAttribute('data-format');
            handleFilters();
        });
    });

    // Rating radios
    document.querySelectorAll('input[name="minRating"]').forEach(radio => {
        radio.addEventListener('change', handleFilters);
    });

    // Apply & Reset buttons
    document.getElementById('applyFiltersBtn')?.addEventListener('click', () => {
        handleFilters();
        closeMobileSidebar();
        showToast('Filters applied successfully!', 'success');
    });

    document.getElementById('resetFiltersBtn')?.addEventListener('click', resetAllFilters);

    // View Mode Toggle (Grid vs List)
    const viewButtons = document.querySelectorAll('.view-btn');
    viewButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            viewButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentViewMode = btn.getAttribute('data-view');
            grid.classList.toggle('list-view', currentViewMode === 'list');
        });
    });

    // Mobile Sidebar Drawer
    const mobileToggle = document.getElementById('mobileFilterToggle');
    const closeSidebarBtn = document.getElementById('closeSidebarBtn');
    const sidebarBackdrop = document.getElementById('sidebarBackdrop');
    const filtersSidebar = document.getElementById('filtersSidebar');

    function openMobileSidebar() {
        filtersSidebar?.classList.add('active');
        sidebarBackdrop?.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    function closeMobileSidebar() {
        filtersSidebar?.classList.remove('active');
        sidebarBackdrop?.classList.remove('active');
        document.body.style.overflow = '';
    }

    mobileToggle?.addEventListener('click', openMobileSidebar);
    closeSidebarBtn?.addEventListener('click', closeMobileSidebar);
    sidebarBackdrop?.addEventListener('click', closeMobileSidebar);

    // Modal Close
    document.getElementById('closeModalBtn')?.addEventListener('click', closeQuickPreview);
    document.getElementById('quickPreviewModal')?.addEventListener('click', (e) => {
        if (e.target.id === 'quickPreviewModal') closeQuickPreview();
    });

    window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeQuickPreview();
    });

    // Initial render
    handleFilters();
}
