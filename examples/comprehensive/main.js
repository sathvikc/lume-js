import { state, bindDom } from '../src/index.js';

// Create reactive state
const store = state({
    count: 0,
    user: state({
        name: 'Guest'
    }),
    form: state({
        email: '',
        age: 25,
        bio: '',
        theme: 'light'
    }),
    settings: state({
        notifications: false
    }),
    events: 0
});

// Bind to DOM
const cleanup = bindDom(document.body, store);

// Example 1: Counter
document.getElementById('increment').addEventListener('click', () => {
    store.count++;
});

document.getElementById('decrement').addEventListener('click', () => {
    store.count--;
});

document.getElementById('reset').addEventListener('click', () => {
    store.count = 0;
});

// Example 5: Manual subscriptions
const logEl = document.getElementById('log');
let eventLog = [];

const unsubEvents = store.$subscribe('events', (value) => {
    eventLog.push(`Event #${value} at ${new Date().toLocaleTimeString()}`);
    if (eventLog.length > 5) eventLog.shift();
    logEl.innerHTML = eventLog.join('<br>');
});

document.getElementById('trigger').addEventListener('click', () => {
    store.events++;
});

// Example 6: Cleanup demo
let updateInterval = null;
let timerValue = 0;
let timerUnsub = null;

document.getElementById('startUpdates').addEventListener('click', () => {
    if (updateInterval) return; // Already running

    const timerState = state({ value: 0 });
    timerValue = 0;

    timerUnsub = timerState.$subscribe('value', (val) => {
        document.getElementById('timerDisplay').textContent = val;
    });

    updateInterval = setInterval(() => {
        timerValue++;
        timerState.value = timerValue;
    }, 1000);
});

document.getElementById('stopUpdates').addEventListener('click', () => {
    if (updateInterval) {
        clearInterval(updateInterval);
        updateInterval = null;
    }
    if (timerUnsub) {
        timerUnsub();
        timerUnsub = null;
    }
    document.getElementById('timerDisplay').textContent = 'Stopped';
});

// Log state changes in console for debugging
console.log('🌟 Lume.js initialized!');
console.log('Try changing values and check the console!');

store.$subscribe('count', (val) => {
    console.log('Count changed:', val);
});

store.user.$subscribe('name', (val) => {
    console.log('Name changed:', val);
});

// Cleanup on page unload (good practice)
window.addEventListener('beforeunload', () => {
    cleanup();
    unsubEvents();
    if (timerUnsub) timerUnsub();
});