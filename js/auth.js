
import { getElement, setStorage, getStorage, removeStorage } from './utils.js';

export function isAuthenticated() {
    return getStorage('authToken') !== null;
}

export function logout() {
    removeStorage('authToken');
    removeStorage('userEmail');
    window.location.replace('./login.html');
}

// Bind login form if on login page
const loginForm = getElement('login-form');
if (loginForm) {
    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const email = getElement('email').value;
        const password = getElement('password').value;
        
        // MOCK AUTHENTICATION
        console.log(`Authenticating ${email}...`);
        
        // Store mock token
        setStorage('authToken', 'mock-jwt-token-12345');
        setStorage('userEmail', email);
        
        // Redirect to dashboard
        window.location.replace('./dashboard.html');
    });
}