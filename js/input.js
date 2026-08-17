// High-Precision Coordinate Normalizer
export class InputManager {
    constructor(targetElement, webrtcConnection) {
        this.target = targetElement;
        this.webrtc = webrtcConnection;
        this.mouseEnabled = true;
        this.keyboardEnabled = true;
        
        this.bindEvents();
    }

    toggleMouse(state) { this.mouseEnabled = state; }
    toggleKeyboard(state) { this.keyboardEnabled = state; }

    bindEvents() {
        this.target.addEventListener('mousemove', (e) => this.handleMouse('mouse_move', e));
        this.target.addEventListener('mousedown', (e) => this.handleMouse('mouse_down', e));
        this.target.addEventListener('mouseup', (e) => this.handleMouse('mouse_up', e));
        this.target.addEventListener('wheel', (e) => this.handleWheel(e), { passive: false });
        this.target.addEventListener('dblclick', (e) => this.handleMouse('double_click', e));
        
        this.target.addEventListener('contextmenu', e => e.preventDefault());

        window.addEventListener('keydown', (e) => this.handleKey('key_down', e));
        window.addEventListener('keyup', (e) => this.handleKey('key_up', e));
    }

    // Mathematical Letterbox & Aspect-Ratio Compensation
    getNormalizedCoords(e) {
        const rect = this.target.getBoundingClientRect();
        
        // Find the rendered element (either <img> or <video>)
        const activeMedia = this.target.querySelector('img[style*="display: block"]') || 
                            this.target.querySelector('video') || 
                            this.target;

        const mediaWidth = activeMedia.naturalWidth || activeMedia.videoWidth || 1920;
        const mediaHeight = activeMedia.naturalHeight || activeMedia.videoHeight || 1080;

        const containerWidth = rect.width;
        const containerHeight = rect.height;

        const containerRatio = containerWidth / containerHeight;
        const mediaRatio = mediaWidth / mediaHeight;

        let renderedW, renderedH, offsetX = 0, offsetY = 0;

        if (containerRatio > mediaRatio) {
            // Pillarboxed (Black bars on left & right)
            renderedH = containerHeight;
            renderedW = containerHeight * mediaRatio;
            offsetX = (containerWidth - renderedW) / 2;
        } else {
            // Letterboxed (Black bars on top & bottom)
            renderedW = containerWidth;
            renderedH = containerWidth / mediaRatio;
            offsetY = (containerHeight - renderedH) / 2;
        }

        const clickX = e.clientX - rect.left - offsetX;
        const clickY = e.clientY - rect.top - offsetY;

        let normX = clickX / renderedW;
        let normY = clickY / renderedH;

        // Clamp between 0.0 and 1.0
        normX = Math.max(0, Math.min(1, normX));
        normY = Math.max(0, Math.min(1, normY));

        return { x: normX.toFixed(5), y: normY.toFixed(5) };
    }

    getMouseButton(e) {
        switch(e.button) {
            case 0: return 'left';
            case 1: return 'middle';
            case 2: return 'right';
            default: return 'unknown';
        }
    }

    handleMouse(type, e) {
        if (!this.mouseEnabled) return;
        
        const coords = this.getNormalizedCoords(e);
        const payload = { type, x: coords.x, y: coords.y };
        
        if (type === 'mouse_down' || type === 'mouse_up') {
            payload.button = this.getMouseButton(e);
        }
        
        this.webrtc.sendData(payload);
    }

    handleWheel(e) {
        if (!this.mouseEnabled) return;
        e.preventDefault();
        
        this.webrtc.sendData({
            type: 'mouse_wheel',
            deltaX: e.deltaX,
            deltaY: e.deltaY
        });
    }

    handleKey(type, e) {
        if (!this.keyboardEnabled) return;
        if (e.key === 'F5' || e.key === 'F12') return;
        
        e.preventDefault();
        
        this.webrtc.sendData({
            type: type,
            key: e.key,
            code: e.code,
            ctrl: e.ctrlKey,
            alt: e.altKey,
            shift: e.shiftKey
        });
    }
}
