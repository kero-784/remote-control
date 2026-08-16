FILE: js/remote.js
import { getElement, getStorage } from './utils.js';
import { isAuthenticated } from './auth.js';
import { SignalingSocket } from './websocket.js';
import { WebRTCConnection } from './webrtc.js';
import { InputManager } from './input.js';

// 1. Authentication Guard
if (!isAuthenticated()) {
    window.location.replace('./login.html');
}

// 2. Parse URL Parameters
const urlParams = new URLSearchParams(window.location.search);
const deviceId = urlParams.get('id') || 'dev-001';
const deviceName = urlParams.get('name') || 'Office-PC';

getElement('session-name').innerText = `Session: ${deviceName}`;

// 3. DOM Elements
const videoElement = getElement('remote-video');
const demoBadge = getElement('demo-badge');

// 4. Load Tunnel URL from Settings / LocalStorage
const tunnelUrl = getStorage('tunnelUrl') || 'ws://127.0.0.1:8080';
console.log(`[Remote] Connecting to Signaling URL: ${tunnelUrl}`);

// State instances
let signaling = null;
let webrtc = null;
let inputMgr = null;
let mockAnimationId = null;

// ----------------------------------------------------
// Core Session Initializer
// ----------------------------------------------------
function initSession() {
    // Teardown any existing connections if reconnecting
    if (signaling) signaling.disconnect();
    if (webrtc) webrtc.close();

    signaling = new SignalingSocket(tunnelUrl, 'controller', deviceId);
    webrtc = new WebRTCConnection(signaling);

    // 5. Connect Input Engine to BOTH native Windows Agent & WebRTC DataChannel
    inputMgr = new InputManager(videoElement, {
        sendData: (payload) => {
            // Send to Native Windows Agent via WebSocket (for physical cursor/keyboard control)
            if (signaling) {
                signaling.sendToAgent({
                    type: 'remote_input',
                    payload: payload
                });
            }
            
            // Also send over WebRTC P2P DataChannel if open
            if (webrtc) {
                webrtc.sendData(payload);
            }
        }
    });

    // 6. Real Stream Handler (Switches off Mock Mode when live video arrives)
    webrtc.onStream = (liveStream) => {
        console.log('[Remote] LIVE remote screen attached successfully!');
        
        // Stop canvas animation
        if (mockAnimationId) {
            cancelAnimationFrame(mockAnimationId);
            mockAnimationId = null;
        }
        
        demoBadge.innerText = 'LIVE STREAM (60 FPS)';
        demoBadge.className = 'badge badge-success';
        videoElement.srcObject = liveStream;
    };

    // 7. Signaling Message Router
    signaling.onMessage = (data) => {
        if (data.type === 'webrtc_answer') {
            webrtc.handleAnswer(data.sdp);
        } else if (data.type === 'ice_candidate') {
            webrtc.handleIceCandidate(data.candidate);
        }
    };

    signaling.connect();
    webrtc.init();
}

// Start Session
initSession();

// ----------------------------------------------------
// Fallback Canvas Mock Engine (Plays until Agent connects)
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
        ctx.fillText(`Waiting for live connection to: ${deviceName}...`, 350, 280);
        ctx.fillStyle = '#94a3b8';
        ctx.font = '22px Arial';
        ctx.fillText('Open agent.html on the target computer and click "Authorize & Share Screen".', 350, 340);
        
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

// ====================================================
// TOOLBAR BUTTONS & CONTROLS
// ====================================================

// 1. Mouse Toggle Button
const btnMouse = getElement('btn-mouse');
if (btnMouse) {
    btnMouse.addEventListener('click', () => {
        btnMouse.classList.toggle('active');
        const enabled = btnMouse.classList.contains('active');
        if (inputMgr) inputMgr.toggleMouse(enabled);
    });
}

// 2. Keyboard Toggle Button
const btnKeyboard = getElement('btn-keyboard');
if (btnKeyboard) {
    btnKeyboard.addEventListener('click', () => {
        btnKeyboard.classList.toggle('active');
        const enabled = btnKeyboard.classList.contains('active');
        if (inputMgr) inputMgr.toggleKeyboard(enabled);
    });
}

// 3. Send Clipboard to Remote Machine
const btnClipboard = getElement('btn-clipboard');
if (btnClipboard) {
    btnClipboard.addEventListener('click', async () => {
        try {
            const text = await navigator.clipboard.readText();
            if (signaling) {
                signaling.sendToAgent({
                    type: 'remote_input',
                    payload: { type: 'clipboard_paste', text }
                });
            }
            alert(`Pasted clipboard content to remote PC: "${text.substring(0, 30)}..."`);
        } catch {
            const text = prompt('Enter text to paste into remote computer:');
            if (text && signaling) {
                signaling.sendToAgent({
                    type: 'remote_input',
                    payload: { type: 'clipboard_paste', text }
                });
            }
        }
    });
}

// 4. Send Ctrl+Alt+Del Macro
const btnCad = getElement('btn-cad');
if (btnCad) {
    btnCad.addEventListener('click', () => {
        if (signaling) {
            signaling.sendToAgent({
                type: 'remote_input',
                payload: { type: 'macro', action: 'ctrl_alt_del' }
            });
        }
        alert('Sent Ctrl+Alt+Del signal to remote agent!');
    });
}

// 5. Display Scaling Mode (Fit Screen vs 100% Actual Size)
const selectScale = getElement('select-scale');
if (selectScale) {
    selectScale.addEventListener('change', (e) => {
        videoElement.className = e.target.value === 'fit' ? 'scale-fit' : 'scale-actual';
    });
}

// 6. Stream Quality Selector
const selectQuality = getElement('select-quality');
if (selectQuality) {
    selectQuality.addEventListener('change', (e) => {
        if (signaling) {
            signaling.sendToAgent({
                type: 'remote_input',
                payload: { type: 'setting_change', setting: 'quality', value: e.target.value }
            });
        }
    });
}

// 7. Fullscreen Toggle
const btnFullscreen = getElement('btn-fullscreen');
if (btnFullscreen) {
    btnFullscreen.addEventListener('click', () => {
        const wrapper = getElement('screen-wrapper');
        if (!document.fullscreenElement) {
            wrapper.requestFullscreen().catch(err => console.error('Fullscreen error:', err));
        } else {
            document.exitFullscreen();
        }
    });
}

// 8. Reconnect Button
const btnReconnect = getElement('btn-reconnect');
if (btnReconnect) {
    btnReconnect.addEventListener('click', () => {
        demoBadge.innerText = 'RECONNECTING...';
        demoBadge.className = 'badge badge-warning';
        initSession();
    });
}

// 9. Disconnect Button
const btnDisconnect = getElement('btn-disconnect');
if (btnDisconnect) {
    btnDisconnect.addEventListener('click', () => {
        if (signaling) signaling.disconnect();
        if (webrtc) webrtc.close();
        window.location.replace('./dashboard.html');
    });
}
