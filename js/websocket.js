// =========================================================================
// ZERO-MAINTENANCE PUBLIC SIGNALING BROKER (No Hosting / No Deno Needed)
// =========================================================================
export class SignalingSocket {
    constructor(url, role = 'controller', deviceId = 'dev-001') {
        this.role = role;
        this.deviceId = deviceId.replace(/\s+/g, '');
        this.socket = null;
        this.onMessage = null;
        this.messageQueue = [];
        
        // Public Free WebRTC Signaling Relay
        this.brokerUrl = `wss://0.peerjs.com/peerjs?key=peerjs&id=${this.role}-${this.deviceId}&token=${Math.random().toString(36).substring(7)}`;
    }

    connect() {
        console.log(`[Signaling] Connecting to public P2P broker for ID: ${this.deviceId}...`);
        this.socket = new WebSocket(this.brokerUrl);

        this.socket.onopen = () => {
            console.log('⚡ [Signaling] Connected to P2P Broker! Ready for handshake.');

            // Flush any queued WebRTC messages
            while (this.messageQueue.length > 0) {
                const queued = this.messageQueue.shift();
                this.socket.send(JSON.stringify(queued));
            }
        };

        this.socket.onmessage = (e) => {
            try {
                const raw = JSON.parse(e.data);
                if (raw.type === 'OFFER' || raw.type === 'ANSWER' || raw.type === 'CANDIDATE') {
                    if (this.onMessage) this.onMessage(raw.payload);
                }
            } catch (err) {
                console.error('[Signaling] Parse error:', err);
            }
        };

        this.socket.onerror = (err) => console.error('[Signaling Error]:', err);
        this.socket.onclose = () => console.log('[Signaling] Broker session ended.');
    }

    sendToAgent(data) {
        const payload = {
            type: data.type === 'webrtc_offer' ? 'OFFER' : (data.type === 'webrtc_answer' ? 'ANSWER' : 'CANDIDATE'),
            src: `${this.role}-${this.deviceId}`,
            dst: `agent-${this.deviceId}`,
            payload: data
        };

        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
            this.socket.send(JSON.stringify(payload));
        } else {
            this.messageQueue.push(payload);
        }
    }

    sendToController(targetId, data) {
        const payload = {
            type: data.type === 'webrtc_offer' ? 'OFFER' : (data.type === 'webrtc_answer' ? 'ANSWER' : 'CANDIDATE'),
            src: `${this.role}-${this.deviceId}`,
            dst: `controller-${this.deviceId}`,
            payload: data
        };

        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
            this.socket.send(JSON.stringify(payload));
        } else {
            this.messageQueue.push(payload);
        }
    }

    disconnect() {
        if (this.socket) this.socket.close();
    }
}
