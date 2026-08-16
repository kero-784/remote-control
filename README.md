
# Remote Desk

A vanilla HTML5/JS frontend architecture for a secure remote desktop control system. 

## 1. What the project does
This project provides the browser-based Controller interface for remotely managing and accessing authorized computers. Phase 1 delivers a complete PWA frontend with a "Mock Mode" that simulates the WebRTC architecture, live video stream, and coordinate-normalized input capturing without requiring a backend server.

## 2. Architecture
- **Vanilla Frontend:** No React, No NPM, No build tools.
- **PWA:** Includes `manifest.json` and a Service Worker (`sw.js`) for caching and offline UI availability.
- **Mock Mode Engine:** Generates a real 30FPS `MediaStream` via `<canvas>` and maps it to a `<video>` tag, precisely emulating the planned WebRTC payload loop. 
- **Normalized Input:** Captures mouse and keyboard over the video frame, normalizing coordinates (`0.0` to `1.0`) and formatting them into structured JSON ready for WebRTC DataChannels.

## 3. Folder Structure
```text
remote-desktop/
├── index.html         # Redirector
├── login.html         # Auth UI
├── dashboard.html     # Computer management UI
├── remote.html        # Remote session interface
├── css/
│   └── main.css, login.css, dashboard.css, remote.css
├── js/
│   ├── app.js         # PWA setup
│   ├── auth.js        # Mock auth
│   ├── dashboard.js   # UI logic
│   ├── remote.js      # Session controller & Canvas Mock stream
│   ├── websocket.js   # Signaling skeleton
│   ├── webrtc.js      # RTC connection & Datachannel skeleton
│   ├── input.js       # Mouse/KB listener and normalizer
│   └── utils.js       # Helpers
├── assets/icons/      # (Place your 192x192 and 512x512 icons here)
├── manifest.json
└── sw.js
