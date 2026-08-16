
import { getElement, getStorage, createEl } from './utils.js';
import { logout, isAuthenticated } from './auth.js';

// Protect route
if (!isAuthenticated()) {
    window.location.replace('./login.html');
}

// Bind Logout
const logoutBtn = getElement('logout-btn');
if (logoutBtn) {
    logoutBtn.addEventListener('click', logout);
}

// Set user email
const userDisplay = getElement('user-email-display');
if (userDisplay) {
    userDisplay.innerText = getStorage('userEmail') || 'user@example.com';
}

// Mock Computers Data
const mockComputers = [
    { id: 'dev-001', name: 'Office-PC', os: 'Windows 11', status: 'online', lastSeen: 'Just now' },
    { id: 'dev-002', name: 'Home-PC', os: 'Windows 10', status: 'online', lastSeen: 'Just now' },
    { id: 'dev-003', name: 'Warehouse-PC', os: 'Windows 10', status: 'offline', lastSeen: '2 hours ago' },
    { id: 'dev-004', name: 'Server-Alpha', os: 'Windows Server 2022', status: 'offline', lastSeen: '1 day ago' }
];

function renderDashboard() {
    const grid = getElement('computers-grid');
    if (!grid) return;

    grid.innerHTML = '';
    
    let onlineCount = 0;
    let offlineCount = 0;

    mockComputers.forEach(comp => {
        if (comp.status === 'online') onlineCount++;
        else offlineCount++;

        const card = createEl('div', 'computer-card');
        
        const isOnline = comp.status === 'online';
        const badgeClass = isOnline ? 'badge-success' : 'badge-danger';
        
        card.innerHTML = `
            <div class="card-header">
                <h3>${comp.name}</h3>
                <span class="badge ${badgeClass}">${comp.status.toUpperCase()}</span>
            </div>
            <div class="card-details">
                <p><strong>Device ID:</strong> ${comp.id}</p>
                <p><strong>OS:</strong> ${comp.os}</p>
                <p><strong>Last Seen:</strong> ${comp.lastSeen}</p>
            </div>
            <button class="btn ${isOnline ? 'btn-primary' : ''}" 
                    ${!isOnline ? 'disabled style="background:#555;cursor:not-allowed;"' : ''}
                    onclick="window.connectTo('${comp.id}', '${comp.name}')">
                ${isOnline ? 'Connect' : 'Offline'}
            </button>
        `;
        grid.appendChild(card);
    });

    getElement('stat-online').innerText = onlineCount;
    getElement('stat-offline').innerText = offlineCount;
}

// Expose connect function globally for inline onclick
window.connectTo = (id, name) => {
    // Pass data via URL parameters for the remote page
    window.location.href = `./remote.html?id=${id}&name=${encodeURIComponent(name)}`;
};

// Initialize
renderDashboard();