
export class SignalingSocket {
    constructor(url, role = 'controller', deviceId = 'dev-001') {
        this.url = url;
        this.role = role;
        this.deviceId = deviceId;
        this.socket = null;
        this.onMessage = null;
        this.messageQueue = []; // Queue messages until connected
    }

    connect() {
        console.log(`[WebSocket] Connecting to signaling server: ${this.url}`);
        this.socket = new WebSocket(this.url);

        this.socket.onopen = () => {
            console.log('[WebSocket] Connected! Registering identity...');
            
            // 1. Register identity
            this.socket.send(JSON.stringify({
                type: 'register',
                role: this.role,
                deviceId: this.deviceId
            }));

            // 2. Flush queued WebRTC messages
            while (this.messageQueue.length > 0) {
                const queuedData = this.messageQueue.shift();
                console.log('[WebSocket] Sending queued message:', queuedData.type);
                this.socket.send(JSON.stringify(queuedData));
            }
        };

        this.socket.onmessage = (e) => {
            try {
                const data = JSON.parse(e.data);
                console.log('[WebSocket RX]:', data);
                if (this.onMessage) this.onMessage(data);
            } catch (err) {
