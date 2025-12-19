import { state, bindDom } from 'lume-js';

// ============================================================================
// 1. DEBUG PLUGIN
// Logs all state operations for debugging
// ============================================================================

const debugPlugin = {
  name: 'debug',
  
  onInit: () => {
    addDebugLog('init', 'State initialized');
  },
  
  onGet: (key, value) => {
    // Skip internal properties that start with $
    if (typeof key === 'string' && key.startsWith('$')) {
      return value;
    }
    addDebugLog('get', `${key} = ${JSON.stringify(value)}`);
    return value;
  },
  
  onSet: (key, newValue, oldValue) => {
    // Skip internal properties that start with $
    if (typeof key === 'string' && key.startsWith('$')) {
      return newValue;
    }
    addDebugLog('set', `${key}: ${JSON.stringify(oldValue)} → ${JSON.stringify(newValue)}`);
    return newValue;
  },
  
  onSubscribe: (key) => {
    addDebugLog('subscribe', `Subscribed to "${key}"`);
  },
  
  onNotify: (key, value) => {
    // Skip internal properties that start with $
    if (typeof key === 'string' && key.startsWith('$')) {
      return;
    }
    addDebugLog('notify', `Notifying subscribers of "${key}" = ${JSON.stringify(value)}`);
  }
};

function addDebugLog(type, message) {
  const output = document.getElementById('debug-output');
  if (!output) return;
  
  const entry = document.createElement('div');
  entry.className = `log-entry log-${type}`;
  entry.textContent = `[${type.toUpperCase()}] ${message}`;
  output.appendChild(entry);
  output.scrollTop = output.scrollHeight;
}

// Create state with debug plugin
const debugStore = state(
  { name: '', age: 0 },
  { plugins: [debugPlugin] }
);

// Bind to DOM - only bind to debug section
const debugSection = document.getElementById('debug-demo');
if (debugSection) {
  bindDom(debugSection, debugStore);
}

// Clear log button
document.getElementById('clear-debug-log')?.addEventListener('click', () => {
  const output = document.getElementById('debug-output');
  if (output) output.innerHTML = '';
});

// ============================================================================
// 2. VALIDATION PLUGIN
// Validates data before setting, prevents invalid states
// ============================================================================

const validationPlugin = {
  name: 'validation',
  
  onSet: (key, newValue, oldValue) => {
    if (typeof key === 'string' && key.startsWith('$')) {
      return newValue;
    }
    
    if (key === 'email') {
      if (typeof newValue === 'string' && !newValue.includes('@')) {
        showValidationError('email', 'Email must contain @');
        return oldValue;
      }
      showValidationSuccess('email', `Valid: ${newValue}`);
    }
    
    if (key === 'age') {
      if (typeof newValue === 'number' && (newValue < 0 || newValue > 150)) {
        showValidationError('age', 'Age must be between 0 and 150');
        return oldValue;
      }
      showValidationSuccess('age', `Valid: ${newValue}`);
    }
    
    return newValue;
  }
};

function showValidationError(field, message) {
  const statusId = field === 'email' ? 'email-validation-status' : 'age-validation-status';
  const status = document.getElementById(statusId);
  if (!status) return;
  
  status.className = 'error-message';
  status.textContent = `❌ ${message}`;
}

function showValidationSuccess(field, message) {
  if (message.includes('function') || message.includes('$')) {
    return;
  }
  
  const statusId = field === 'email' ? 'email-validation-status' : 'age-validation-status';
  const status = document.getElementById(statusId);
  if (!status) return;
  
  status.className = 'success-message';
  status.textContent = `✓ ${message}`;
}

// Create state with validation plugin
const validationStore = state(
  { email: '', age: 0 },
  { plugins: [validationPlugin] }
);

// Manual binding for validation example (to show validation feedback)
const emailInput = document.getElementById('validate-email');
const ageInput = document.getElementById('validate-age');

emailInput?.addEventListener('input', (e) => {
  validationStore.email = e.target.value;
});

ageInput?.addEventListener('input', (e) => {
  validationStore.age = parseInt(e.target.value) || 0;
});

// ============================================================================
// 3. HISTORY PLUGIN (Undo/Redo)
// Tracks changes and enables undo/redo functionality
// ============================================================================

const historyPlugin = {
  name: 'history',
  
  onSet: (key, newValue, oldValue) => {
    if (key === 'count' && !history.isUndoRedo) {
      // Push to undo stack
      history.undoStack.push({
        key,
        value: oldValue,
        timestamp: Date.now()
      });
      
      // Clear redo stack on new change
      history.redoStack = [];
      
      updateHistoryUI();
    }
    return newValue;
  }
};

const history = {
  undoStack: [],
  redoStack: [],
  isUndoRedo: false
};

// Create state with history plugin
const historyStore = state(
  { count: 0 },
  { plugins: [historyPlugin] }
);

// Bind to DOM - only bind to history section
const historySection = document.getElementById('history-demo');
if (historySection) {
  bindDom(historySection, historyStore);
}

// Button handlers
document.getElementById('increment')?.addEventListener('click', () => {
  historyStore.count++;
});

document.getElementById('decrement')?.addEventListener('click', () => {
  historyStore.count--;
});

document.getElementById('undo')?.addEventListener('click', () => {
  if (history.undoStack.length === 0) return;
  
  const lastChange = history.undoStack.pop();
  history.redoStack.push({
    key: lastChange.key,
    value: historyStore[lastChange.key],
    timestamp: Date.now()
  });
  
  history.isUndoRedo = true;
  historyStore[lastChange.key] = lastChange.value;
  history.isUndoRedo = false;
  
  updateHistoryUI();
});

document.getElementById('redo')?.addEventListener('click', () => {
  if (history.redoStack.length === 0) return;
  
  const lastUndo = history.redoStack.pop();
  history.undoStack.push({
    key: lastUndo.key,
    value: historyStore[lastUndo.key],
    timestamp: Date.now()
  });
  
  history.isUndoRedo = true;
  historyStore[lastUndo.key] = lastUndo.value;
  history.isUndoRedo = false;
  
  updateHistoryUI();
});

document.getElementById('clear-history')?.addEventListener('click', () => {
  history.undoStack = [];
  history.redoStack = [];
  updateHistoryUI();
});

function updateHistoryUI() {
  const list = document.getElementById('history-list');
  if (!list) return;
  
  list.innerHTML = '';
  
  if (history.undoStack.length === 0 && history.redoStack.length === 0) {
    list.innerHTML = '<li style="color: #999;">No history yet</li>';
    return;
  }
  
  history.undoStack.forEach((entry, index) => {
    const li = document.createElement('li');
    li.textContent = `#${index + 1}: ${entry.key} = ${entry.value}`;
    list.appendChild(li);
  });
}

// Initial UI update
updateHistoryUI();

// ============================================================================
// 4. TRANSFORM PLUGIN
// Transforms values on get/set (e.g., uppercase, formatting)
// ============================================================================

const transformPlugin = {
  name: 'transform',
  
  onSet: (key, newValue) => {
    if (key === 'text' && typeof newValue === 'string') {
      return newValue.toUpperCase();
    }
    return newValue;
  },
  
  onGet: (key, value) => {
    if (key === 'text' && typeof value === 'string') {
      return value.toUpperCase();
    }
    return value;
  }
};

// Create state with transform plugin
const transformStore = state(
  { text: '' },
  { plugins: [transformPlugin] }
);

// Bind to DOM - only bind to transform section
const transformSection = document.getElementById('transform-demo');
if (transformSection) {
  bindDom(transformSection, transformStore);
}

// Show internal value
transformStore.$subscribe('text', (value) => {
  const display = document.getElementById('transform-internal');
  if (display) {
    display.textContent = value || '-';
  }
});
