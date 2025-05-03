// Sidebar template and functionality combined
const sidebarHTML = `
<aside class="w-64 bg-white shadow-md fixed h-screen overflow-y-auto">
    <div class="p-4 border-b">
        <h2 class="text-xl font-semibold text-gray-800">Panel Admin</h2>
    </div>
    <nav class="mt-4">
        <a href="manajemen-pelanggan.html" class="nav-link block p-3 flex items-center cursor-pointer transition-colors duration-200 hover:bg-blue-50 hover:text-blue-600">
            <i class="fas fa-users w-6"></i>
            <span class="ml-2">Manajemen Pelanggan</span>
        </a>
        <a href="manajemen-device.html" class="nav-link block p-3 flex items-center cursor-pointer transition-colors duration-200 hover:bg-blue-50 hover:text-blue-600">
            <i class="fas fa-laptop w-6"></i>
            <span class="ml-2">Manajemen Device</span>
        </a>
        <a href="manajemen-peminjaman.html" class="nav-link block p-3 flex items-center cursor-pointer transition-colors duration-200 hover:bg-blue-50 hover:text-blue-600">
            <i class="fas fa-exchange-alt w-6"></i>
            <span class="ml-2">Peminjaman Part</span>
        </a>
        <a href="manajemen-garansi.html" class="nav-link block p-3 flex items-center cursor-pointer transition-colors duration-200 hover:bg-blue-50 hover:text-blue-600">
            <i class="fas fa-shield-alt w-6"></i>
            <span class="ml-2">Manajemen Garansi</span>
        </a>
    </nav>
    <div class="absolute bottom-0 w-64 p-4 border-t bg-white">
        <div class="flex items-center">
            <div class="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white">
                <i class="fas fa-user"></i>
            </div>
            <div class="ml-3">
                <p class="text-sm font-medium text-gray-700">Admin</p>
                <p class="text-xs text-gray-500">admin@admin.com</p>
            </div>
        </div>
    </div>
</aside>
`;

// Function to initialize sidebar
function initSidebar() {
    const sidebarElement = document.getElementById('sidebar');
    if (sidebarElement) {
        sidebarElement.innerHTML = sidebarHTML;
        
        // Get current page filename
        const currentPage = window.location.pathname.split('/').pop() || 'index.html';
        
        // Find and highlight current page link
        const currentLink = sidebarElement.querySelector(`a[href="${currentPage}"]`);
        if (currentLink) {
            currentLink.classList.remove('hover:bg-blue-50', 'hover:text-blue-600');
            currentLink.classList.add('bg-blue-50', 'text-blue-600');
        }
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', initSidebar);
