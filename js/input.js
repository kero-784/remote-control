
// Browser Input Capture System (Phase 5)

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
        // Mouse Events
        this.target.addEventListener('mousemove', (e) => this.handleMouse('mouse_move', e));
        this.target.addEventListener('mousedown', (e) => this.handleMouse('mouse_down', e));
        this.target.addEventListener('mouseup', (e) => this.handleMouse('mouse_up', e));
        this.target.addEventListener('wheel', (e) => this.handleWheel(e), { passive: false });
        this.target.addEventListener('dblclick', (e) => this.handleMouse('double_click', e));
        
        // Prevent context menu on right click
        this.target.addEventListener('contextmenu', e => e.preventDefault());

        // Keyboard Events (Bound to window but check focus/hover state ideally)
        window.addEventListener('keydown', (e) => this.handleKey('key_down', e));
        window.addEventListener('keyup', (e) => this.handleKey('key_up', e));
    }

    getNormalizedCoords(e) {
        const rect = this.target.getBoundingClientRect();
        // Calculate coordinate 0.0 to 1.0 based on element bounds
        let x = (e.clientX - rect.left) / rect.width;
        let y = (e.clientY - rect.top) / rect.height;
        
        // Clamp values just in case
        x = Math.max(0, Math.min(1, x));
        y = Math.max(0, Math.min(1, y));
        
        return { x: x.toFixed(4), y: y.toFixed(4) };
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
        e.preventDefault(); // Prevent page scroll
        
        this.webrtc.sendData({
            type: 'mouse_wheel',
            deltaX: e.deltaX,
            deltaY: e.deltaY
        });
    }

    handleKey(type, e) {
        if (!this.keyboardEnabled) return;
        
        // Don't intercept F5, F12, etc unless strictly necessary
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