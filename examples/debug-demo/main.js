import { state, effect, bindDom } from 'lume-js';
import { createDebugPlugin, debug, repeat } from 'lume-js/addons';

// ============================================================================
// CONFIGURATION - Single source of truth (reactive)
// ============================================================================

const config = state({
    logGet: true,
    logSet: true,
    logNotify: true,
    trace: false
});

// ============================================================================
// STORES
// ============================================================================

const counterStore = state({ count: 0 }, {
    plugins: [createDebugPlugin({
        label: 'counter',
        get logGet() { return config.logGet; },
        get logSet() { return config.logSet; },
        get logNotify() { return config.logNotify; },
        get trace() { return config.trace; }
    })]
});

const userStore = state({ name: '', age: 0 }, {
    plugins: [createDebugPlugin({
        label: 'user',
        get logGet() { return config.logGet; },
        get logSet() { return config.logSet; },
        get logNotify() { return config.logNotify; },
        get trace() { return config.trace; }
    })]
});

// Expose for console
window.counterStore = counterStore;
window.userStore = userStore;
window.debug = debug;

// ============================================================================
// CONSOLE PREVIEW - Using repeat() for log list
// ============================================================================



const consolePreview = document.getElementById('console-preview');
const originalLog = console.log.bind(console);
const originalTrace = console.trace.bind(console);

// Logs stored in reactive state - repeat() will render them
let logIdCounter = 0;
const logsStore = state({
    logs: []  // { id, type, message, html }
});

function addLog(type, message) {
    // Clean formatting codes
    const clean = message.replace(/%c/g, '').replace(/color:[^;]+;?/g, '').replace(/font-weight:[^;]+;?/g, '').trim();

    const html = clean
        .replace(/\[(counter|user)\]/g, '<span class="log-key">[$1]</span>')
        .replace(/(SET|GET|NOTIFY|SUBSCRIBE)/g, '<span class="log-$1" style="text-transform: lowercase">$1</span>');

    const newLog = {
        id: ++logIdCounter,
        type,
        message: clean,
        html
    };

    // Keep last 50 logs (immutable update for repeat)
    const logs = [...logsStore.logs, newLog].slice(-50);
    logsStore.logs = logs;

    // Auto-update stats
    updateStatsQuiet();
}

// Use repeat() to render logs
repeat(consolePreview, logsStore, 'logs', {
    key: log => log.id,
    create: (log, el) => {
        el.className = `log log-${log.type}`;
    },
    update: (log, el) => {
        el.className = `log log-${log.type}`;
        el.innerHTML = log.html;
    }
});

// Auto-scroll when logs change
effect(() => {
    const count = logsStore.logs.length;
    if (count > 0) {
        consolePreview.scrollTop = consolePreview.scrollHeight;
    }
});

console.log = (...args) => {
    originalLog(...args);
    const msg = args.map(a => typeof a === 'string' ? a : JSON.stringify(a)).join(' ');
    if (msg.includes('[counter]') || msg.includes('[user]') || msg.includes('[lume-debug]')) {
        let type = 'info';
        if (msg.includes('SET')) type = 'set';
        else if (msg.includes('GET')) type = 'get';
        else if (msg.includes('NOTIFY')) type = 'notify';
        else if (msg.includes('SUBSCRIBE')) type = 'subscribe';
        addLog(type, msg);
    }
};

console.trace = (...args) => {
    originalTrace(...args);
    const msg = args.map(a => typeof a === 'string' ? a : JSON.stringify(a)).join(' ');
    if (msg.includes('[counter]') || msg.includes('[user]')) {
        addLog('trace', '📍 Stack trace → see DevTools');
    }
};

// ============================================================================
// LIVE STATS
// ============================================================================

// LIVE STATS - Using repeat() for fine-grained table updates
// ============================================================================

const statsStore = state({
    rows: [] // [{ id, store, key, gets, sets, notifies }]
});

function updateStatsQuiet() {
    // stats() is silent - no console output
    const stats = debug.stats();

    // Flatten stats into array for repeat()
    const rows = [];
    for (const [label, data] of Object.entries(stats)) {
        const allKeys = new Set([
            ...Object.keys(data.gets || {}),
            ...Object.keys(data.sets || {}),
            ...Object.keys(data.notifies || {})
        ]);

        for (const key of allKeys) {
            rows.push({
                id: `${label}:${key}`, // Unique key for repeat
                store: label,
                key,
                gets: data.gets?.[key] || 0,
                sets: data.sets?.[key] || 0,
                notifies: data.notifies?.[key] || 0
            });
        }
    }

    // Sort by store then key
    rows.sort((a, b) => {
        if (a.store !== b.store) return a.store.localeCompare(b.store);
        return a.key.localeCompare(b.key);
    });

    statsStore.rows = rows;
}

// Render table rows efficiently reuse DOM elements
repeat('#stats-body', statsStore, 'rows', {
    key: row => row.id,
    create: (row, el) => {
        el.innerHTML = `
            <td class="store">${row.store}</td>
            <td class="key">${row.key}</td>
            <td class="num gets">${row.gets}</td>
            <td class="num sets">${row.sets}</td>
            <td class="num notifies">${row.notifies}</td>
        `;
    },
    update: (row, el) => {
        // Only update numbers (store/key are immutable part of ID)
        el.querySelector('.gets').textContent = row.gets;
        el.querySelector('.sets').textContent = row.sets;
        el.querySelector('.notifies').textContent = row.notifies;
    },
    element: 'tr'
});

// Toggle empty message
effect(() => {
    const isEmpty = statsStore.rows.length === 0;
    const emptyMsg = document.getElementById('stats-empty');
    const table = document.querySelector('.stats-table');

    if (emptyMsg) emptyMsg.style.display = isEmpty ? 'block' : 'none';
    if (table) table.style.display = isEmpty ? 'none' : 'table';
});

// ============================================================================
// LOG OPTIONS - Using effect() for reactive UI sync
// Config is the single source of truth - UI reflects config state
// ============================================================================

function setupOption(id, configKey) {
    const el = document.getElementById(id);

    // Effect: sync UI to config state (reactive)
    effect(() => {
        const isActive = config[configKey];
        if (isActive) {
            el.classList.add('active');
            el.querySelector('.icon').textContent = '✓';
        } else {
            el.classList.remove('active');
            el.querySelector('.icon').textContent = '';
        }
    });

    // Click handler: toggle config (which triggers effect above)
    el.addEventListener('click', () => {
        config[configKey] = !config[configKey];
    });
}

setupOption('opt-get', 'logGet');
setupOption('opt-set', 'logSet');
setupOption('opt-notify', 'logNotify');
setupOption('opt-trace', 'trace');

// ============================================================================
// FILTER - Tag/Chip Style
// ============================================================================

const filterInput = document.getElementById('filter-input');
const filterTagsContainer = document.getElementById('filter-tags');
let activeFilters = [];

function updateFilter() {
    if (activeFilters.length === 0) {
        debug.filter(null);
    } else {
        // Create regex that matches any filter
        const pattern = new RegExp(activeFilters.join('|'));
        debug.filter(pattern);
    }
    renderFilterTags();
}

function addFilter(key) {
    const trimmed = key.trim();
    if (trimmed && !activeFilters.includes(trimmed)) {
        activeFilters.push(trimmed);
        updateFilter();
    }
}

function removeFilter(key) {
    activeFilters = activeFilters.filter(f => f !== key);
    updateFilter();
}

function renderFilterTags() {
    if (activeFilters.length === 0) {
        filterTagsContainer.innerHTML = '';
        return;
    }

    filterTagsContainer.innerHTML = activeFilters.map(f =>
        `<span class="filter-tag">${f}<span class="remove" data-filter="${f}">✕</span></span>`
    ).join('');

    // Add click handlers
    filterTagsContainer.querySelectorAll('.remove').forEach(btn => {
        btn.addEventListener('click', () => removeFilter(btn.dataset.filter));
    });
}

filterInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        addFilter(filterInput.value);
        filterInput.value = '';
    }
});

// ============================================================================
// COUNTER STORE
// ============================================================================

const countDisplay = document.getElementById('count-display');

document.getElementById('increment').addEventListener('click', () => counterStore.count++);
document.getElementById('decrement').addEventListener('click', () => counterStore.count--);
document.getElementById('add-ten').addEventListener('click', () => counterStore.count += 10);
document.getElementById('reset').addEventListener('click', () => counterStore.count = 0);

counterStore.$subscribe('count', (val) => {
    countDisplay.textContent = val;
});

// ============================================================================
// USER STORE
// ============================================================================

const nameDisplay = document.getElementById('name-display');
const ageDisplay = document.getElementById('age-display');

document.getElementById('update-user').addEventListener('click', () => {
    userStore.name = document.getElementById('name-input').value;
    userStore.age = parseInt(document.getElementById('age-input').value) || 0;
});

userStore.$subscribe('name', (val) => nameDisplay.textContent = `"${val}"`);
userStore.$subscribe('age', (val) => ageDisplay.textContent = val);

// ============================================================================
// OTHER CONTROLS
// ============================================================================

document.getElementById('reset-stats').addEventListener('click', () => {
    debug.resetStats();
    updateStatsQuiet();
});

document.getElementById('clear-console').addEventListener('click', () => {
    logsStore.logs = [];  // Clear reactive logs array - repeat() will update DOM
});

// ============================================================================
// INIT
// ============================================================================

originalLog('%c🔍 Debug Demo Ready', 'color: #4CAF50; font-size: 14px; font-weight: bold');
originalLog('Stores: counterStore, userStore | Controls: debug');
