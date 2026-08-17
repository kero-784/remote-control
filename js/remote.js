import { getElement } from './utils.js';
import { SignalingSocket } from './websocket.js';
import { WebRTCConnection } from './webrtc.js';
import { InputManager } from './input.js';

const urlParams = new URLSearchParams(window.location.search);
const deviceId = urlParams.get('id') || 'dev-001';
const deviceName = urlParams.get('name') || 'Office-PC';

getElement('session-name').innerText = `Session: ${deviceName}`;

const videoElement = getElement('remote-video');
const screenWrapper = getElement('screen-wrapper');
const demoBadge = getElement('demo-badge');

// Hardcoded Cloud Signaling URL
const SIGNALING_URL = 'wss://wise-starling-6165.kero-784.deno.net';

const signaling = new SignalingSocket(SIGNALING_URL, 'controller', deviceId);
const webrtc = new WebRTCConnection(signaling);

// Dispatch mouse/keyboard directly over peer-to-peer UDP
const inputMgr = new InputManager(screenWrapper, {
    sendData: (payload) => {
        webrtc.sendData(payload);
    }
});

let mockAnimationId = null;

// 1. Direct WebRTC Hardware Stream Receiver (60 FPS 1080p)
webrtc.onStream = (liveStream) => {
    console.log('[P2P] Attaching Direct Hardware Video Stream to Screen!');
    
    if (mockAnimationId) {
        cancelAnimationFrame(mockAnimationId);
        mockAnimationId = null;
    }

    demoBadge.innerText = 'DIRECT P2P (60 FPS)';
    demoBadge.className = 'badge badge-success';
    videoElement.srcObject = liveStream;
};

webrtc.onP2PConnected = () => {
    console.log('⚡ Direct P2P Hole-Punch Connection Active!');
};

// 2. Signaling Message Router
signaling.onMessage = (data) => {
    if (data.type === 'webrtc_answer') {
        webrtc.handleAnswer(data.sdp);
    } else if (data.type === 'ice_candidate') {
        webrtc.handleIceCandidate(data.candidate);
    }
};

signaling.connect();
webrtc.init();

// Fallback animation while STUN hole punches
function startMockStream() {
    const canvas = document.createElement('canvas');
    canvas.width = 1920;
    canvas.height = 1080;
    const ctx = canvas.getContext('2d');
    let x = 0;
    
    function draw() {
        ctx.fillStyle = '#0e1117';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        ctx.fillStyle = '#161b22';
        ctx.fillRect(300, 150, 1320, 780);
        
        ctx.fillStyle = '#30363d';
        ctx.fillRect(300, 150, 1320, 50);
        
        ctx.fillStyle = '#ffffff';
        ctx.font = '30px Segoe UI';
        ctx.fillText(`Connecting P2P to: ${deviceName} (${deviceId})...`, 350, 280);
        
        ctx.fillStyle = '#8b949e';
        ctx.font = '20px Segoe UI';
        ctx.fillText('Establishing direct UDP link via STUN hole-punching...', 350, 340);
        
        ctx.fillStyle = '#238636';
        ctx.beginPath();
        ctx.arc((x % (canvas.width - 600)) + 300, 500, 22, 0, Math.PI * 2);
        ctx.fill();
        x += 6;
        
        mockAnimationId = requestAnimationFrame(draw);
    }
    draw();
    videoElement.srcObject = canvas.captureStream(30);
    videoElement.className = 'scale-fit';
}

startMockStream();

// Toolbar Controls
getElement('btn-fullscreen').addEventListener('click', () => {
    if (!document.fullscreenElement) screenWrapper.requestFullscreen();
    else document.exitFullscreen();
});

getElement('btn-disconnect').addEventListener('click', () => {
    webrtc.close();
    signaling.disconnect();
    window.location.replace('./index.html');
});
