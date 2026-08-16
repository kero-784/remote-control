export class SignalingSocket {
    constructor(url, role = 'controller', deviceId = 'dev-001') {
        this.url = url;
        this.role = role;
        this.deviceId = deviceId;
        this.socket = null;
        this.onMessage = null;
        this.messageQueue = [];
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

            // 2. Send any messages that were waiting in queue
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
                console.error('[WebSocket] Error parsing message:', err);
            }
        };

        this.socket.onerror = (err) => console.error('[WebSocket Error]:', err);
        this.socket.onclose = () => console.log('[WebSocket] Disconnected.');
    }

    send(data) {
        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
            this.socket.send(JSON.stringify(data));
        } else {
            console.log('[WebSocket] Socket connecting, queuing message:', data.type || 'unknown');
            this.messageQueue.push(data);
        }
    }

    sendToAgent(data) {
        data.targetId = this.deviceId;
        this.send(data);
    }

    disconnect() {
        if (this.socket) {
            this.socket.close();
        }
    }
}
