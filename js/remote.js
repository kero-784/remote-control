
import { getElement } from './utils.js';
import { isAuthenticated } from './auth.js';
import { SignalingSocket } from './websocket.js';
import { WebRTCConnection } from './webrtc.js';
import { InputManager } from './input.js';

// Protect route
if (!isAuthenticated()) {
    window.location.replace('./login.html');
}

// Parse URL params
const urlParams = new URLSearchParams(window.location.search);
const deviceId = urlParams.get('id');
const deviceName = urlParams.get('name') || 'Unknown Device';

getElement('session-name').innerText = `Session: ${deviceName}`;

// System setup
const videoElement = getElement('remote-video');
const signaling = new SignalingSocket('wss://4c3348dbca0325.lhr.life', 'controller', deviceId);
const webrtc = new WebRTCConnection(signaling);
const inputMgr = new InputManager(videoElement, webrtc);

// Connect Mock Architecture
signaling.connect();
webrtc.init();

// ----------------------------------------------------
// MOCK MODE: Generate Fake Video Stream using Canvas
// ----------------------------------------------------
function startMockStream() {
    const canvas = document.createElement('canvas');
    canvas.width = 1920;
    canvas.height = 1080;
    const ctx = canvas.getContext('2d');
    
    let x = 0;
    let y = 100;
    
    function drawFakeDesktop() {
        // Desktop background
        ctx.fillStyle = '#2c3e50';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Fake Window
        ctx.fillStyle = '#ecf0f1';
        ctx.fillRect(400, 200, 1120, 680);
        
        // Window Title bar
        ctx.fillStyle = '#34495e';
        ctx.fillRect(400, 200, 1120, 40);
        
        // Text
        ctx.fillStyle = '#333';
        ctx.font = '40px Arial';
        ctx.fillText(`Connected to: ${deviceName}`, 450, 300);
        ctx.fillText(`Device ID: ${deviceId}`, 450, 360);
        
        // Moving element to prove it's a live stream
        ctx.fillStyle = '#e74c3c';
        ctx.beginPath();
        ctx.arc(x % canvas.width, 500, 30, 0, Math.PI * 2);
        ctx.fill();
        x += 5;
        
        requestAnimationFrame(drawFakeDesktop);
    }
    
    drawFakeDesktop();
    
    // Capture stream at 30 FPS and attach to video element
    const stream = canvas.captureStream(30);
    videoElement.srcObject = stream;
    
    // Default class
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

getElement('btn-cad').addEventListener('click', () => {
    webrtc.sendData({ type: 'macro', action: 'ctrl_alt_del' });
});

getElement('btn-clipboard').addEventListener('click', async () => {
    try {
        const text = await navigator.clipboard.readText();
        webrtc.sendData({ type: 'clipboard', data: text });
        alert('Clipboard sent to remote agent!');
    } catch (err) {
        alert('Clipboard access denied or empty.');
    }
});

getElement('btn-fullscreen').addEventListener('click', () => {
    const wrapper = getElement('screen-wrapper');
    if (!document.fullscreenElement) {
        wrapper.requestFullscreen().catch(err => {
            console.error(`Error attempting to enable fullscreen: ${err.message}`);
        });
    } else {
        document.exitFullscreen();
    }
});

getElement('select-scale').addEventListener('change', (e) => {
    if (e.target.value === 'fit') {
        videoElement.className = 'scale-fit';
    } else {
        videoElement.className = 'scale-actual';
    }
});

getElement('select-quality').addEventListener('change', (e) => {
    webrtc.sendData({ type: 'setting_change', setting: 'quality', value: e.target.value });
});
