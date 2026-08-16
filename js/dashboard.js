import { getElement, getStorage, setStorage, createEl } from './utils.js';
import { logout, isAuthenticated } from './auth.js';

if (!isAuthenticated()) {
    window.location.replace('./login.html');
}

// Bind Logout
const logoutBtn = getElement('logout-btn');
if (logoutBtn) logoutBtn.addEventListener('click', logout);

// User email display
const userDisplay = getElement('user-email-display');
if (userDisplay) userDisplay.innerText = getStorage('userEmail') || 'user@example.com';

// View Switching Navigation
const navComputers = getElement('nav-computers');
const navRecent = getElement('nav-recent');
const navSettings = getElement('nav-settings');

const viewComputers = getElement('view-computers');
const viewRecent = getElement('view-recent');
const viewSettings = getElement('view-settings');

function switchView(activeNav, activeView) {
    [navComputers, navRecent, navSettings].forEach(n => n.classList.remove('active'));
    [viewComputers, viewRecent, viewSettings].forEach(v => v.style.display = 'none');
    
    activeNav.classList.add('active');
    activeView.style.display = 'block';
}

navComputers.addEventListener('click', (e) => { e.preventDefault(); switchView(navComputers, viewComputers); });
navRecent.addEventListener('click', (e) => { e.preventDefault(); switchView(navRecent, viewRecent); });
navSettings.addEventListener('click', (e) => { e.preventDefault(); switchView(navSettings, viewSettings); });

// Settings: Save Tunnel URL to LocalStorage
const inputTunnel = getElement('setting-tunnel-url');
const savedTunnel = getStorage('tunnelUrl') || 'ws://127.0.0.1:8080';
if (inputTunnel) inputTunnel.value = savedTunnel;

getElement('btn-save-settings').addEventListener('click', () => {
    let val = inputTunnel.value.trim();
    if (val.startsWith('https://')) val = val.replace('https://', 'wss://');
    if (val.startsWith('http://')) val = val.replace('http://', 'ws://');
    
    setStorage('tunnelUrl', val);
    const msg = getElement('save-msg');
    msg.style.display = 'inline';
    setTimeout(() => { msg.style.display = 'none'; }, 3000);
});

// Computers Data
const mockComputers = [
    { id: 'dev-001', name: 'Office-PC', os: 'Windows 11 (64-bit)', status: 'online', lastSeen: 'Active now' },
    { id: 'dev-002', name: 'Home-PC', os: 'Windows 10 Pro', status: 'online', lastSeen: 'Active now' },
    { id: 'dev-003', name: 'Warehouse-PC', os: 'Windows 10 Enterprise', status: 'offline', lastSeen: '2 hours ago' },
    { id: 'dev-004', name: 'Backup-Server', os: 'Windows Server 2022', status: 'offline', lastSeen: 'Yesterday' }
];

function renderDashboard() {
    const grid = getElement('computers-grid');
    if (!grid) return;
    grid.innerHTML = '';
    
    let online = 0, offline = 0;

    mockComputers.forEach(comp => {
        const isOnline = comp.status === 'online';
        if (isOnline) online++; else offline++;

        const card = createEl('div', 'computer-card');
        card.innerHTML = `
            <div class="card-header">
                <h3>${comp.name}</h3>
                <span class="badge ${isOnline ? 'badge-success' : 'badge-danger'}">${comp.status.toUpperCase()}</span>
            </div>
            <div class="card-details">
                <p><strong>Device ID:</strong> <code>${comp.id}</code></p>
                <p><strong>Operating System:</strong> ${comp.os}</p>
                <p><strong>Status:</strong> ${comp.lastSeen}</p>
            </div>
            <button class="btn ${isOnline ? 'btn-primary' : ''}" 
                    ${!isOnline ? 'disabled style="background:#334155;color:#64748b;cursor:not-allowed;"' : ''}
                    onclick="window.connectTo('${comp.id}', '${comp.name}')">
                ${isOnline ? '⚡ Connect Now' : 'Offline'}
            </button>
        `;
        grid.appendChild(card);
    });

    getElement('stat-online').innerText = online;
    getElement('stat-offline').innerText = offline;
}

window.connectTo = (id, name) => {
    // Record recent session
    const recent = getStorage('recentSessions', true) || [];
    recent.unshift({ id, name, time: new Date().toLocaleString() });
    setStorage('recentSessions', recent.slice(0, 5));
    
    window.location.href = `./remote.html?id=${id}&name=${encodeURIComponent(name)}`;
};

renderDashboard();
