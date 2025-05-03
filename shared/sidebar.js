// Function to insert sidebar and highlight current page
function initializeSidebar(currentPage) {
    // Get the sidebar template
    const sidebarPlaceholder = document.getElementById('sidebar');
    if (!sidebarPlaceholder) return;

    // Insert the sidebar HTML
    sidebarPlaceholder.innerHTML = sidebarTemplate;

    // Highlight current page
    const currentLink = sidebarPlaceholder.querySelector(`a[href="${currentPage}"]`);
    if (currentLink) {
        currentLink.classList.remove('hover:bg-blue-50', 'hover:text-blue-600');
        currentLink.classList.add('bg-blue-50', 'text-blue-600');
    }
}

// Load the sidebar when the DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Get current page filename
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    initializeSidebar(currentPage);
});
