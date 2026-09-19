import { getNotes, getCurrentUser } from './storage.js';

export function setupDashboard() {
    const dashboardSection = document.querySelector('.dashboard-section');
    if (!dashboardSection) return;

    const currentUser = getCurrentUser();
    if (!currentUser) return;

    const allNotes = getNotes();
    const userNotes = allNotes.filter(n => n.uploadedBy === currentUser.email);

    // Calculate stats
    const totalUploads = userNotes.length;
    
    // Create random mock stats for downloads and views since we don't have a real tracking backend
    let totalDownloads = 0;
    let totalViews = 0;
    
    userNotes.forEach(note => {
        // mock logic
        const views = Math.floor(Math.random() * 50) + 10;
        const downloads = Math.floor(views * 0.4);
        totalViews += views;
        totalDownloads += downloads;
    });

    // Update DOM
    const statCards = document.querySelectorAll('.stat-card h3');
    if (statCards.length >= 4) {
        statCards[0].textContent = totalUploads;
        statCards[1].textContent = totalDownloads;
        statCards[2].textContent = totalViews;
        statCards[3].textContent = '4.8'; // Mock average rating
    }

    // Populate recent notes table/grid
    const notesGrid = document.querySelector('.notes-grid');
    if (notesGrid) {
        notesGrid.innerHTML = '';
        if (userNotes.length === 0) {
            notesGrid.innerHTML = '<p style="grid-column: 1/-1; color: var(--text-muted);">You haven\'t uploaded any notes yet.</p>';
        } else {
            // Show only top 4
            userNotes.slice(-4).reverse().forEach(note => {
                const views = Math.floor(Math.random() * 50) + 10;
                const downloads = Math.floor(views * 0.4);

                let iconHtml = '<i class="fa-solid fa-file-pdf"></i>';
                let bgStyle = '';
                if (note.fileName?.endsWith('.doc') || note.fileName?.endsWith('.docx')) {
                    iconHtml = '<i class="fa-solid fa-file-word"></i>';
                    bgStyle = 'background: #e0f2fe; color: #0284c7;';
                } else if (note.fileName?.endsWith('.ppt') || note.fileName?.endsWith('.pptx')) {
                    iconHtml = '<i class="fa-solid fa-file-powerpoint"></i>';
                    bgStyle = 'background: #fef3c7; color: #d97706;';
                }

                const html = `
                    <div class="note-card-small">
                        <div class="note-icon-small" style="${bgStyle}">
                            ${iconHtml}
                        </div>
                        <div class="note-details">
                            <h4>${note.title}</h4>
                            <p>${note.subject} • ${note.module}</p>
                        </div>
                        <div class="note-stats">
                            <span><i class="fa-solid fa-eye"></i> ${views}</span>
                            <span><i class="fa-solid fa-download"></i> ${downloads}</span>
                        </div>
                        <div class="note-actions">
                            <button class="edit-btn" title="Edit"><i class="fa-solid fa-pen"></i></button>
                            <button class="delete-btn" title="Delete"><i class="fa-solid fa-trash"></i></button>
                        </div>
                    </div>
                `;
                notesGrid.insertAdjacentHTML('beforeend', html);
            });
        }
    }
}
