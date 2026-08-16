
import { getElement } from './utils.js';
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

// UPDATE THIS WITH YOUR CURRENT TUNNEL URL
const signaling = new SignalingSocket('wss://4c3348dbca0325.lhr.life', 'controller', deviceId);
const webrtc = new WebRTCConnection(signaling);
const inputMgr = new InputManager(videoElement, webrtc);

let mockAnimationId = null;

// ----------------------------------------------------
// WebRTC Stream Listener (Replaces Mock with Live Stream)
// ----------------------------------------------------
webrtc.onStream = (liveStream) => {
    console.log('[Remote] Attaching LIVE screen stream to video player!');
    
    // Stop the fake mock canvas animation
    if (mockAnimationId) {
        cancelAnimationFrame(mockAnimationId);
    }

    // Switch badge from MOCK MODE to LIVE
    if (demoBadge) {
        demoBadge.innerText = 'LIVE STREAM';
        demoBadge.className = 'badge badge-success';
    }

    // Attach real desktop stream
    videoElement.srcObject = liveStream;
};

// ----------------------------------------------------
// Signaling Message Router
// ----------------------------------------------------
signaling.onMessage = (data) => {
    if (data.type === 'webrtc_answer') {
        webrtc.handleAnswer(data.sdp);
    } else if (data.type === 'ice_candidate') {
        webrtc.handleIceCandidate(data.candidate);
    }
};

// Connect
signaling.connect();
webrtc.init();

// ----------------------------------------------------
// Mock Mode Fallback (Plays until live stream arrives)
// ----------------------------------------------------
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
        ctx.fillText(`Waiting for live video from: ${deviceName} (${deviceId})...`, 350, 280);
        ctx.fillStyle = '#94a3b8';
        ctx.font = '22px Arial';
        ctx.fillText('Authorize screen capture on the Agent machine to start live session.', 350, 340);
        
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

// ----------------------------------------------------
// Toolbar Controls
// ----------------------------------------------------
getElement('btn-disconnect').addEventListener('click', () => {
    webrtc.close();
    signaling.disconnect();
    window.location.replace('./dashboard.html');
});

const btnMouse = getElement('btn-mouse');
btnMouse.addEventListener('click', () => {
    btnMouse.classList.toggle('active');
    inputMgr.toggleMouse(btnMouse.classList.contains('active'));
});

const btnKeyboard = getElement('btn-keyboard');
btnKeyboard.addEventListener('click', () => {
    btnKeyboard.classList.toggle('active');
    inputMgr.toggleKeyboard(btnKeyboard.classList.contains('active'));
});

getElement('btn-fullscreen').addEventListener('click', () => {
    const wrapper = getElement('screen-wrapper');
    if (!document.fullscreenElement) wrapper.requestFullscreen();
    else document.exitFullscreen();
});

getElement('select-scale').addEventListener('change', (e) => {
    videoElement.className = e.target.value === 'fit' ? 'scale-fit' : 'scale-actual';
});
