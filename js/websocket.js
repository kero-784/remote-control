
// Skeleton for future Phase 3 Signaling Server
export class SignalingSocket {
    constructor(url) {
        this.url = url;
        this.socket = null;
        this.onMessage = null;
    }

    connect() {
        console.log(`[WebSocket] Mock connecting to signaling server: ${this.url}`);
        // In real implementation:
        // this.socket = new WebSocket(this.url);
        // this.socket.onmessage = (e) => { this.onMessage && this.onMessage(JSON.parse(e.data)); };
    }

    send(data) {
        console.log(`[WebSocket] Mock sending:`, data);
        // if(this.socket && this.socket.readyState === WebSocket.OPEN) {
        //    this.socket.send(JSON.stringify(data));
        // }
    }
    
    disconnect() {
        console.log(`[WebSocket] Mock disconnecting`);
        // if(this.socket) this.socket.close();
    }
}