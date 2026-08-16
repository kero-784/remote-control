
export class WebRTCConnection {
    constructor(signaling, config) {
        this.signaling = signaling;
        this.peerConnection = null;
        this.dataChannel = null;
        // Standard Google STUN servers (Free)
        this.config = config || { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] };
        
        // Callbacks
        this.onStream = null;
        this.onDataChannelOpen = null;
        this.onMessage = null;
    }

    async init() {
        console.log('[WebRTC] Initializing PeerConnection...');
        this.peerConnection = new RTCPeerConnection(this.config);

        // 1. Listen for remote video track
        this.peerConnection.ontrack = (event) => {
            console.log('[WebRTC] Received remote stream track!');
            if(this.onStream) this.onStream(event.streams[0]);
        };

        // 2. Listen for ICE candidates (Network routing info)
        this.peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
                console.log('[WebRTC] Found ICE Candidate, sending to signaling server...');
                this.signaling.sendToAgent({
                    type: 'ice_candidate',
                    candidate: event.candidate
                });
            }
        };
        
        this.setupDataChannel();

        // 3. Create the WebRTC Offer (The invitation to connect)
        try {
            const offer = await this.peerConnection.createOffer();
            await this.peerConnection.setLocalDescription(offer);
            
            console.log('[WebRTC] Created Offer, sending to Windows Agent...');
            this.signaling.sendToAgent({
                type: 'webrtc_offer',
                sdp: offer
            });
        } catch (err) {
            console.error('[WebRTC] Failed to create offer:', err);
        }
    }

    setupDataChannel() {
        console.log('[WebRTC] Setting up DataChannel...');
        this.dataChannel = this.peerConnection.createDataChannel('control');
        
        this.dataChannel.onopen = () => { 
            console.log('[WebRTC] DataChannel is OPEN!');
            if(this.onDataChannelOpen) this.onDataChannelOpen(); 
        };
        
        this.dataChannel.onmessage = (e) => { 
            if(this.onMessage) this.onMessage(e.data); 
        };
    }

    sendData(payload) {
        // If connected, send via WebRTC. If not, log it (Mock Mode fallback)
        if (this.dataChannel && this.dataChannel.readyState === 'open') {
            this.dataChannel.send(JSON.stringify(payload));
        } else {
            console.log('[WebRTC Mock DataChannel TX]:', JSON.stringify(payload));
        }
    }

    close() {
        console.log('[WebRTC] Closing connection');
        if(this.dataChannel) this.dataChannel.close();
        if(this.peerConnection) this.peerConnection.close();
    }
}
