import { getElement, getStorage } from './utils.js';
import { isAuthenticated } from './auth.js';
import { SignalingSocket } from './websocket.js';
import { WebRTCConnection } from './webrtc.js';
import { InputManager } from './input.js';

if (!isAuthenticated()) {
    window.location.replace('./login.html');
}

const urlParams = new URLSearchParams(window.location.search);
const deviceId = urlParams.get('id') || 'dev-001';
const deviceName = urlParams.get('name') || 'Office-PC';

getElement('session-name').innerText = `Session: ${deviceName}`;

const videoElement = getElement('remote-video');
const demoBadge = getElement('demo-badge');

// Load Tunnel URL from Settings, or default to localhost
const tunnelUrl = getStorage('tunnelUrl') || 'ws://127.0.0.1:8080';
console.log(`[Remote] Using Signaling URL: ${tunnelUrl}`);

let signaling = null;
let webrtc = null;
let inputMgr = null;
let mockAnimationId = null;

function initSession() {
    if (signaling) signaling.disconnect();
    if (webrtc) webrtc.close();

    signaling = new SignalingSocket(tunnelUrl, 'controller', deviceId);
    webrtc = new WebRTCConnection(signaling);
    inputMgr = new InputManager(videoElement, webrtc);

    webrtc.onStream = (liveStream) => {
        console.log('[Remote] LIVE stream attached!');
        if (mockAnimationId) cancelAnimationFrame(mockAnimationId);
        
        demoBadge.innerText = 'LIVE STREAM (60 FPS)';
        demoBadge.className = 'badge badge-success';
        videoElement.srcObject = liveStream;
    };

    signaling.onMessage = (data) => {
        if (data.type === 'webrtc_answer') webrtc.handleAnswer(data.sdp);
        else if (data.type === 'ice_candidate') webrtc.handleIceCandidate(data.candidate);
    };

    signaling.connect();
    webrtc.init();
}

initSession();

// Fallback Canvas Mock
function startMockStream() {
    const canvas = document.createElement('canvas');
    canvas.width = 1920;
    canvas.height = 1080;
    const ctx = canvas.getContext('2d');
    let x = 0;
    
    function drawFakeDesktop() {
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(300, 150, 1320, 780);
        
        ctx.fillStyle = '#334155';
        ctx.fillRect(300, 150, 1320, 50);
        
        ctx.fillStyle = '#ffffff';
        ctx.font = '32px Arial';
        ctx.fillText(`Waiting for live connection to: ${deviceName}...`, 350, 280);
        ctx.fillStyle = '#94a3b8';
        ctx.font = '22px Arial';
        ctx.fillText('Open agent.html on the remote computer and authorize screen sharing.', 350, 340);
        
        ctx.fillStyle = '#3b82f6';
        ctx.beginPath();
        ctx.arc((x % (canvas.width - 600)) + 300, 500, 25, 0, Math.PI * 2);
        ctx.fill();
        x += 6;
        
        mockAnimationId = requestAnimationFrame(drawFakeDesktop);
    }
    
    drawFakeDesktop();
    videoElement.srcObject = canvas.captureStream(30);
    videoElement.className = 'scale-fit';
}
startMockStream();

// ==========================================
// TOOLBAR BUTTONS LOGIC
// ==========================================

// 1. Mouse Toggle Button
const btnMouse = getElement('btn-mouse');
btnMouse.addEventListener('click', () => {
    btnMouse.classList.toggle('active');
    const enabled = btnMouse.classList.contains('active');
    inputMgr.toggleMouse(enabled);
});

// 2. Keyboard Toggle Button
const btnKeyboard = getElement('btn-keyboard');
btnKeyboard.addEventListener('click', () => {
    btnKeyboard.classList.toggle('active');
    const enabled = btnKeyboard.classList.contains('active');
    inputMgr.toggleKeyboard(enabled);
});

// 3. Send Clipboard to Remote
getElement('btn-clipboard').addEventListener('click', async () => {
    try {
        const text = await navigator.clipboard.readText();
        webrtc.sendData({ type: 'clipboard_paste', text });
        alert(`Sent clipboard content to remote: "${text.substring(0, 30)}..."`);
    } catch {
        const text = prompt('Enter text to paste into remote computer:');
        if (text) webrtc.sendData({ type: 'clipboard_paste', text });
    }
});

// 4. Send Ctrl+Alt+Del Macro
getElement('btn-cad').addEventListener('click', () => {
    webrtc.sendData({ type: 'macro_cad', action: 'ctrl_alt_del' });
    alert('Sent Ctrl+Alt+Del signal to remote agent!');
});

// 5. Scale Mode (Fit Screen vs 100% Actual Size)
getElement('select-scale').addEventListener('change', (e) => {
    videoElement.className = e.target.value === 'fit' ? 'scale-fit' : 'scale-actual';
});

// 6. Quality Dropdown
getElement('select-quality').addEventListener('change', (e) => {
    webrtc.sendData({ type: 'quality_change', quality: e.target.value });
});

// 7. Fullscreen Button
getElement('btn-fullscreen').addEventListener('click', () => {
    const wrapper = getElement('screen-wrapper');
    if (!document.fullscreenElement) wrapper.requestFullscreen();
    else document.exitFullscreen();
});

// 8. Reconnect Button
getElement('btn-reconnect').addEventListener('click', () => {
    demoBadge.innerText = 'RECONNECTING...';
    demoBadge.className = 'badge badge-warning';
    initSession();
});

// 9. Disconnect Button
getElement('btn-disconnect').addEventListener('click', () => {
    if (signaling) signaling.disconnect();
    if (webrtc) webrtc.close();
    window.location.replace('./dashboard.html');
});
