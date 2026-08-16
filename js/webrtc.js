
export class WebRTCConnection {
    constructor(signaling, config) {
        this.signaling = signaling;
        this.peerConnection = null;
        this.dataChannel = null;
        this.config = config || { 
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:stun1.l.google.com:19302' }
            ] 
        };
        
        this.onStream = null;
        this.onDataChannelOpen = null;
        this.onMessage = null;
    }

    async init() {
        console.log('[WebRTC] Initializing PeerConnection...');
        this.peerConnection = new RTCPeerConnection(this.config);

        // 1. Receive LIVE remote screen stream
        this.peerConnection.ontrack = (event) => {
            console.log('[WebRTC] Received LIVE Remote Screen Track!');
            if (this.onStream && event.streams[0]) {
                this.onStream(event.streams[0]);
            }
        };

        // 2. Gather ICE candidates
        this.peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
                this.signaling.sendToAgent({
                    type: 'ice_candidate',
                    candidate: event.candidate
                });
            }
        };
        
        this.setupDataChannel();

        // 3. Create WebRTC Offer
        try {
            const offer = await this.peerConnection.createOffer({
                offerToReceiveVideo: true,
                offerToReceiveAudio: false
            });
            await this.peerConnection.setLocalDescription(offer);
            
            console.log('[WebRTC] Created Offer, dispatching to Agent...');
            this.signaling.sendToAgent({
                type: 'webrtc_offer',
                sdp: offer
            });
        } catch (err) {
            console.error('[WebRTC] Failed to create offer:', err);
        }
    }

    setupDataChannel() {
        this.dataChannel = this.peerConnection.createDataChannel('control', {
            ordered: true
        });
        
        this.dataChannel.onopen = () => { 
            console.log('[WebRTC] DataChannel is OPEN and ready for remote input!');
            if (this.onDataChannelOpen) this.onDataChannelOpen(); 
        };
        
        this.dataChannel.onmessage = (e) => { 
            if (this.onMessage) this.onMessage(e.data); 
        };
    }

    // Process the WebRTC Answer returned by the Windows Agent
    async handleAnswer(sdp) {
        console.log('[WebRTC] Handling Answer from Agent...');
        try {
            await this.peerConnection.setRemoteDescription(new RTCSessionDescription(sdp));
            console.log('[WebRTC] Remote description set successfully! Connection active.');
        } catch (err) {
            console.error('[WebRTC] Error setting remote description:', err);
        }
    }

    // Add ICE candidates received from the Agent
    async handleIceCandidate(candidate) {
        try {
            if (this.peerConnection) {
                await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
            }
        } catch (err) {
            console.error('[WebRTC] Error adding ICE candidate:', err);
        }
    }

    sendData(payload) {
        if (this.dataChannel && this.dataChannel.readyState === 'open') {
            this.dataChannel.send(JSON.stringify(payload));
        } else {
            console.log('[WebRTC Mock DataChannel TX]:', JSON.stringify(payload));
        }
    }

    close() {
        if (this.dataChannel) this.dataChannel.close();
        if (this.peerConnection) this.peerConnection.close();
    }
}
