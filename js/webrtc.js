// =========================================================================
// WEBRTC ICE HOLE-PUNCHING & P2P DATACHANNEL ENGINE
// =========================================================================
export class WebRTCConnection {
    constructor(signaling, customConfig) {
        this.signaling = signaling;
        
        // Multi-STUN Pool for 100% NAT Traversal
        this.config = customConfig || {
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:stun1.l.google.com:19302' },
                { urls: 'stun:stun2.l.google.com:19302' },
                { urls: 'stun:stun.cloudflare.com:3478' }
            ],
            iceCandidatePoolSize: 10
        };

        this.peerConnection = null;
        this.inputChannel = null;
        this.controlChannel = null;

        // Event Callbacks
        this.onStream = null;
        this.onP2PConnected = null;
        this.onP2PDisconnected = null;
    }

    async init() {
        console.log('[P2P] Initializing WebRTC PeerConnection with STUN Hole-Punching...');
        this.peerConnection = new RTCPeerConnection(this.config);

        // 1. Monitor Direct Connection State
        this.peerConnection.oniceconnectionstatechange = () => {
            const state = this.peerConnection.iceConnectionState;
            console.log(`[P2P] ICE Connection State: ${state}`);
            
            if (state === 'connected' || state === 'completed') {
                console.log('🎉 [P2P] DIRECT PEER-TO-PEER UDP HOLE-PUNCHED!');
                if (this.onP2PConnected) this.onP2PConnected();
            } else if (state === 'disconnected' || state === 'failed') {
                console.warn('[P2P] Peer connection dropped.');
                if (this.onP2PDisconnected) this.onP2PDisconnected();
            }
        };

        // 2. Receive Direct Hardware 60 FPS Video Stream
        this.peerConnection.ontrack = (event) => {
            console.log('[P2P] Received Direct Remote Screen Video Track!');
            if (this.onStream && event.streams[0]) {
                this.onStream(event.streams[0]);
            }
        };

        // 3. Gather Public NAT Candidates from STUN and send via Signaling
        this.peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
                console.log(`[STUN] Discovered NAT Candidate (${event.candidate.type}): ${event.candidate.candidate.substring(0, 45)}...`);
                this.signaling.sendToAgent({
                    type: 'ice_candidate',
                    candidate: event.candidate
                });
            }
        };

        // 4. Create Unordered Ultra-Low Latency UDP DataChannels
        this.setupDataChannels();

        // 5. Generate SDP Offer with H.264 / VP8 Video Capabilities
        try {
            const offer = await this.peerConnection.createOffer({
                offerToReceiveVideo: true,
                offerToReceiveAudio: false
            });
            await this.peerConnection.setLocalDescription(offer);

            console.log('[P2P] Created WebRTC Offer. Transmitting to remote host...');
            this.signaling.sendToAgent({
                type: 'webrtc_offer',
                sdp: offer
            });
        } catch (err) {
            console.error('[P2P] Failed to create offer:', err);
        }
    }

    setupDataChannels() {
        // FAST MOUSE CHANNEL: Unordered & 0 Retransmits (Pure UDP Speed for zero mouse lag)
        this.inputChannel = this.peerConnection.createDataChannel('mouse_stream', {
            ordered: false,
            maxRetransmits: 0
        });

        // RELIABLE COMMAND CHANNEL: Ordered (For Keystrokes, Clipboard, and Macros)
        this.controlChannel = this.peerConnection.createDataChannel('control_stream', {
            ordered: true
        });

        this.inputChannel.onopen = () => console.log('⚡ [P2P] Low-Latency Mouse UDP Channel OPEN');
        this.controlChannel.onopen = () => console.log('⚡ [P2P] Reliable Keyboard & Control Channel OPEN');
    }

    // Process Answer from Remote PC
    async handleAnswer(sdp) {
        try {
            console.log('[P2P] Setting Remote Session Description (Answer)...');
            await this.peerConnection.setRemoteDescription(new RTCSessionDescription(sdp));
        } catch (err) {
            console.error('[P2P] Error setting remote description:', err);
        }
    }

    // Add ICE Candidate from Remote PC for Hole-Punching
    async handleIceCandidate(candidate) {
        try {
            if (this.peerConnection) {
                await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
            }
        } catch (err) {
            console.error('[P2P] Error adding ICE Candidate:', err);
        }
    }

    // Send input directly over P2P UDP without passing through the signaling server
    sendData(payload) {
        const jsonStr = JSON.stringify(payload);

        // Send mouse movements over the fast unordered channel
        if (payload.type === 'mouse_move') {
            if (this.inputChannel && this.inputChannel.readyState === 'open') {
                this.inputChannel.send(jsonStr);
            }
        } else {
            // Send clicks, keys, and macros over the reliable channel
            if (this.controlChannel && this.controlChannel.readyState === 'open') {
                this.controlChannel.send(jsonStr);
            }
        }
    }

    close() {
        if (this.inputChannel) this.inputChannel.close();
        if (this.controlChannel) this.controlChannel.close();
        if (this.peerConnection) this.peerConnection.close();
    }
}
