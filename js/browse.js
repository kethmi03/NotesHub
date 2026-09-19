import { getNotes } from './storage.js';

const defaultNotes = [
    {
        title: "Software Engineering Lectures",
        module: "SE3106",
        gradeLevel: "Y3S1",
        subject: "Computer Science",
        uploadedBy: "Sarah Jenkins",
        rating: 4.8,
        reviews: 24,
        downloads: 156,
        type: "pdf"
    },
    {
        title: "Data Structures Complete Summary",
        module: "CS2001",
        gradeLevel: "Y2S1",
        subject: "Computer Science",
        uploadedBy: "Mike Ross",
        rating: 4.9,
        reviews: 42,
        downloads: 312,
        type: "word"
    },
    {
        title: "Database Management Systems",
        module: "DB2104",
        gradeLevel: "Y2S2",
        subject: "Computer Science",
        uploadedBy: "Emma Watson",
        rating: 4.5,
        reviews: 18,
        downloads: 89,
        type: "powerpoint"
    },
    {
        title: "Computer Networks Past Papers",
        module: "NW3002",
        gradeLevel: "Y3S2",
        subject: "Computer Science",
        uploadedBy: "John Doe",
        rating: 4.7,
        reviews: 12,
        downloads: 45,
        type: "pdf"
    }
];

function renderNotes(notes) {
    const grid = document.querySelector('.marketplace-grid');
    if (!grid) return;
    
    grid.innerHTML = '';
    
    if (notes.length === 0) {
        grid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: var(--text-muted);">No notes found matching your criteria.</p>';
        return;
    }

    notes.forEach(note => {
        let iconHtml = '<i class="fa-solid fa-file-pdf"></i>';
        let bgStyle = '';
        
        if (note.type === 'word' || note.fileName?.endsWith('.doc') || note.fileName?.endsWith('.docx')) {
            iconHtml = '<i class="fa-solid fa-file-word"></i>';
            bgStyle = 'background: #e0f2fe; color: #0284c7;';
        } else if (note.type === 'powerpoint' || note.fileName?.endsWith('.ppt') || note.fileName?.endsWith('.pptx')) {
            iconHtml = '<i class="fa-solid fa-file-powerpoint"></i>';
            bgStyle = 'background: #fef3c7; color: #d97706;';
        }

        const html = `
            <div class="market-card reveal active">
                <div class="market-card-top">
                    <div class="note-icon-large" style="${bgStyle}">
                        ${iconHtml}
                    </div>
                </div>
                <div class="market-card-body">
                    <h3><a href="view-note.html">${note.title}</a></h3>
                    <p class="module">${note.module} • ${note.gradeLevel}</p>
                    <div class="author-info">
                        <div class="avatar-small"><i class="fa-solid fa-user"></i></div>
                        <span>By ${note.uploadedBy}</span>
                    </div>
                    <div class="market-stats">
                        <span><i class="fa-solid fa-star"></i> ${note.rating || 0} (${note.reviews || 0})</span>
                        <span><i class="fa-solid fa-download"></i> ${note.downloads || 0}</span>
                    </div>
                </div>
            </div>
        `;
        grid.insertAdjacentHTML('beforeend', html);
    });
}

function handleFilters() {
    const searchInput = document.querySelector('.search-box input');
    const subjectCheckboxes = document.querySelectorAll('.filter-group:nth-child(2) input[type="checkbox"]');
    
    let allNotes = [...defaultNotes, ...getNotes()];
    
    const term = searchInput.value.toLowerCase();
    
    const activeSubjects = Array.from(subjectCheckboxes)
        .filter(cb => cb.checked)
        .map(cb => cb.parentElement.textContent.trim().toLowerCase());

    let filtered = allNotes.filter(note => {
        const matchesSearch = note.title.toLowerCase().includes(term) || note.module.toLowerCase().includes(term);
        const subject = (note.subject || '').toLowerCase();
        
        // If no subjects checked, don't filter by subject.
        const matchesSubject = activeSubjects.length === 0 || activeSubjects.includes(subject) || activeSubjects.includes('other');
        
        return matchesSearch && matchesSubject;
    });

    renderNotes(filtered);
    
    const resultsText = document.querySelector('.browse-header p');
    if (resultsText) {
        resultsText.textContent = `Showing ${filtered.length} results`;
    }
}

export function setupBrowsePage() {
    const grid = document.querySelector('.marketplace-grid');
    if (!grid) return;

    // Add event listeners to filters
    const searchInput = document.querySelector('.search-box input');
    if (searchInput) {
        searchInput.addEventListener('input', handleFilters);
    }

    const checkboxes = document.querySelectorAll('.custom-checkbox input');
    checkboxes.forEach(cb => {
        cb.addEventListener('change', handleFilters);
    });

    const applyBtn = document.querySelector('.apply-filters-btn');
    if (applyBtn) {
        applyBtn.addEventListener('click', handleFilters);
    }

    // Initial render
    handleFilters();
}
