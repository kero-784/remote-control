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
const screenWrapper = getElement('screen-wrapper');
const demoBadge = getElement('demo-badge');

// Create Native Screen Renderer Image Element
let nativeImg = document.getElementById('remote-screen-img');
if (!nativeImg) {
    nativeImg = document.createElement('img');
    nativeImg.id = 'remote-screen-img';
    nativeImg.className = 'scale-fit';
    nativeImg.style.display = 'none';
    nativeImg.style.userSelect = 'none';
    nativeImg.draggable = false;
    screenWrapper.appendChild(nativeImg);
}

const tunnelUrl = getStorage('tunnelUrl') || 'ws://127.0.0.1:8080';
console.log(`[Remote] Connecting to Signaling URL: ${tunnelUrl}`);

let signaling = null;
let webrtc = null;
let inputMgr = null;
let mockAnimationId = null;

function initSession() {
    if (signaling) signaling.disconnect();
    if (webrtc) webrtc.close();

    signaling = new SignalingSocket(tunnelUrl, 'controller', deviceId);
    webrtc = new WebRTCConnection(signaling);

    // Listen to mouse/keyboard inputs across the screen wrapper
    inputMgr = new InputManager(screenWrapper, {
        sendData: (payload) => {
            if (signaling) {
                signaling.sendToAgent({
                    type: 'remote_input',
                    payload: payload
                });
            }
            if (webrtc) webrtc.sendData(payload);
        }
    });

    // 1. Handle WebRTC Live Stream
    webrtc.onStream = (liveStream) => {
        if (mockAnimationId) { cancelAnimationFrame(mockAnimationId); mockAnimationId = null; }
        nativeImg.style.display = 'none';
        videoElement.style.display = 'block';
        videoElement.srcObject = liveStream;
        demoBadge.innerText = 'LIVE STREAM (60 FPS)';
        demoBadge.className = 'badge badge-success';
    };

    // 2. Handle Incoming Native Screen Frames & WebRTC Handshake
    signaling.onMessage = (data) => {
        if (data.type === 'screen_frame') {
            if (mockAnimationId) { cancelAnimationFrame(mockAnimationId); mockAnimationId = null; }
            videoElement.style.display = 'none';
            nativeImg.style.display = 'block';
            nativeImg.src = 'data:image/jpeg;base64,' + data.image;

            demoBadge.innerText = 'LIVE STREAM (NATIVE AGENT)';
            demoBadge.className = 'badge badge-success';
        } else if (data.type === 'webrtc_answer') {
            webrtc.handleAnswer(data.sdp);
        } else if (data.type === 'ice_candidate') {
            webrtc.handleIceCandidate(data.candidate);
        }
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
        ctx.fillText(`Waiting for connection to: ${deviceName}...`, 350, 280);
        ctx.fillStyle = '#94a3b8';
        ctx.font = '22px Arial';
        ctx.fillText('Launch RemoteDesk.exe on the target computer and click Start Remote Support.', 350, 340);
        
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

// Toolbar Controls
const btnMouse = getElement('btn-mouse');
if (btnMouse) {
    btnMouse.addEventListener('click', () => {
        btnMouse.classList.toggle('active');
        if (inputMgr) inputMgr.toggleMouse(btnMouse.classList.contains('active'));
    });
}

const btnKeyboard = getElement('btn-keyboard');
if (btnKeyboard) {
    btnKeyboard.addEventListener('click', () => {
        btnKeyboard.classList.toggle('active');
        if (inputMgr) inputMgr.toggleKeyboard(btnKeyboard.classList.contains('active'));
    });
}

const selectScale = getElement('select-scale');
if (selectScale) {
    selectScale.addEventListener('change', (e) => {
        const cls = e.target.value === 'fit' ? 'scale-fit' : 'scale-actual';
        videoElement.className = cls;
        nativeImg.className = cls;
    });
}

const btnFullscreen = getElement('btn-fullscreen');
if (btnFullscreen) {
    btnFullscreen.addEventListener('click', () => {
        if (!document.fullscreenElement) screenWrapper.requestFullscreen();
        else document.exitFullscreen();
    });
}

const btnReconnect = getElement('btn-reconnect');
if (btnReconnect) {
    btnReconnect.addEventListener('click', () => {
        demoBadge.innerText = 'RECONNECTING...';
        demoBadge.className = 'badge badge-warning';
        initSession();
    });
}

const btnDisconnect = getElement('btn-disconnect');
if (btnDisconnect) {
    btnDisconnect.addEventListener('click', () => {
        if (signaling) signaling.disconnect();
        if (webrtc) webrtc.close();
        window.location.replace('./dashboard.html');
    });
}
