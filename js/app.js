
// Main entry point for PWA registration
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        // Adjust path for GitHub pages automatically relying on relative
        navigator.serviceWorker.register('./sw.js')
            .then(reg => console.log('Service Worker registered.', reg.scope))
            .catch(err => console.error('Service Worker registration failed:', err));
    });
}