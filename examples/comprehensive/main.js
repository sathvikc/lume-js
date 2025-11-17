import { state, bindDom, effect } from 'lume-js';

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

// Example 7: Effect - automatic dependency tracking
// Note: This effect reads from two different state objects: store.user (nested state)
// and the root store. If both change synchronously, the effect may run once per
// state that changed (by design with per-state batching).
const effectCleanup = effect(() => {
    const displayText = `Hello ${store.user.name}, count is ${store.count}`;
    console.log('Effect ran:', displayText);
    document.title = `Lume.js Demo - ${displayText}`;
});

// Example 8: Per-state batching demo
// This effect depends on two root-level keys (same state object), so if both
// change synchronously, it should run only once due to per-state batching.
const rootEffectCleanup = effect(() => {
    // Access two root keys so this effect tracks both
    const snapshot = `Root snapshot → count: ${store.count}, events: ${store.events}`;
    console.log('Root effect ran:', snapshot);
});

// Button: Update two root keys in one tick → expect one root effect run
document.getElementById('updateRootTwoKeys')?.addEventListener('click', () => {
    // Both are on the same state object (root)
    store.count++;
    store.events++;
});

// Button: Update across different state objects → may run multi-state effects twice
document.getElementById('updateCrossState')?.addEventListener('click', () => {
    store.count++;
    // Flip between two names to guarantee a change
    store.user.name = store.user.name === 'Guest' ? 'Member' : 'Guest';
});

// Cleanup on page unload (good practice)
window.addEventListener('beforeunload', () => {
    cleanup();
    unsubEvents();
    effectCleanup();
    rootEffectCleanup();
    if (timerUnsub) timerUnsub();
});