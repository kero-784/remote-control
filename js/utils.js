
// Utility functions

export function getElement(id) {
    return document.getElementById(id);
}

export function createEl(tag, className = '') {
    const el = document.createElement(tag);
    if (className) el.className = className;
    return el;
}

export function getStorage(key, isJson = false) {
    const data = localStorage.getItem(key);
    if (!data) return null;
    try {
        return isJson ? JSON.parse(data) : data;
    } catch {
        return data;
    }
}

export function setStorage(key, value) {
    const data = typeof value === 'object' ? JSON.stringify(value) : value;
    localStorage.setItem(key, data);
}

export function removeStorage(key) {
    localStorage.removeItem(key);
}

export function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}