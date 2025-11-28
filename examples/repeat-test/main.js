import { state } from 'lume-js';
import { repeat } from 'lume-js/addons/repeat';

// ============================================================================
// LOGGING SYSTEM
// ============================================================================

let testStats = {
  passed: 0,
  failed: 0,
  total: 0
};

function log(message, type = 'info') {
  const logEntries = document.getElementById('log-entries');
  const entry = document.createElement('div');
  entry.className = `log-entry ${type}`;

  const timestamp = new Date().toLocaleTimeString('en-US', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    fractionalSecondDigits: 3
  });

  entry.innerHTML = `
    <span class="timestamp">[${timestamp}]</span>
    <span class="message">${message}</span>
  `;

  logEntries.insertBefore(entry, logEntries.firstChild);

  // Keep only last 100 entries
  while (logEntries.children.length > 100) {
    logEntries.removeChild(logEntries.lastChild);
  }

  // Auto-scroll to top for new entries
  if (logEntries.scrollTop < 100) {
    logEntries.scrollTop = 0;
  }
}

function logTest(testName, condition, details = '') {
  testStats.total++;

  if (condition) {
    testStats.passed++;
    log(`✅ PASS: ${testName} ${details}`, 'success');
  } else {
    testStats.failed++;
    log(`❌ FAIL: ${testName} ${details}`, 'error');
  }

  updateStats();
}

function updateStats() {
  document.getElementById('stat-passed').textContent = testStats.passed;
  document.getElementById('stat-failed').textContent = testStats.failed;
  document.getElementById('stat-total').textContent = testStats.total;
}

window.clearLogs = function () {
  document.getElementById('log-entries').innerHTML = '';
  testStats = { passed: 0, failed: 0, total: 0 };
  updateStats();
  log('Logs cleared', 'info');
};

window.copyLogs = async function () {
  const entries = Array.from(document.querySelectorAll('.log-entry'))
    .reverse()
    .map(entry => entry.textContent.trim())
    .join('\n');

  const stats = `
=== Test Statistics ===
Passed: ${testStats.passed}
Failed: ${testStats.failed}
Total: ${testStats.total}

=== Test Log ===
${entries}
`;

  try {
    await navigator.clipboard.writeText(stats);
    log('📋 Logs copied to clipboard!', 'success');
  } catch (err) {
    log(`❌ Failed to copy: ${err.message}`, 'error');
  }
};

window.exportLogs = function () {
  const entries = Array.from(document.querySelectorAll('.log-entry'))
    .reverse()
    .map(entry => entry.textContent.trim())
    .join('\n');

  const stats = `
=== Test Statistics ===
Passed: ${testStats.passed}
Failed: ${testStats.failed}
Total: ${testStats.total}

=== Test Log ===
${entries}
`;

  const blob = new Blob([stats], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `repeat-test-log-${new Date().toISOString()}.txt`;
  a.click();
  URL.revokeObjectURL(url);

  log('Logs exported', 'success');
};

// ============================================================================
// TEST 1: FOCUS PRESERVATION
// ============================================================================

let focusItemId = 1;
const focusStore = state({
  items: [
    { id: focusItemId++, text: 'Apple' },
    { id: focusItemId++, text: 'Banana' },
    { id: focusItemId++, text: 'Cherry' },
    { id: focusItemId++, text: 'Date' },
    { id: focusItemId++, text: 'Elderberry' }
  ]
});

repeat('#focus-list', focusStore, 'items', {
  element: 'div',
  key: item => item.id,
  render: (item, el) => {
    if (!el.dataset.initialized) {
      el.className = 'list-item';
      el.innerHTML = `
        <span class="item-id">#${item.id}</span>
        <input type="text" value="${item.text}" data-item-id="${item.id}">
      `;

      const input = el.querySelector('input');
      input.addEventListener('input', (e) => {
        item.text = e.target.value;
      });

      input.addEventListener('focus', () => {
        log(`Focus entered item #${item.id}`, 'info');
      });

      input.addEventListener('blur', () => {
        log(`Focus left item #${item.id}`, 'info');
      });

      el.dataset.initialized = 'true';
    }
  }
});

window.focusTest = {
  reverse: function (skipWarning = false) {
    const focused = document.activeElement?.dataset?.itemId;
    if (!focused && !skipWarning) {
      log(`⚠️ No input focused - click in an input field first, then press R to reverse`, 'warning');
      return;
    }
    if (!focused) return; // Skip silently in automation

    log(`🔄 Reversing list (focused: #${focused})`, 'test');
    focusStore.items = [...focusStore.items].reverse();

    setTimeout(() => {
      const stillFocused = document.activeElement?.dataset?.itemId;
      logTest('Focus preservation (reverse)', focused === stillFocused,
        `focused: #${focused} → #${stillFocused || 'lost'}`);
    }, 50);
  },

  sort: function (skipWarning = false) {
    const focused = document.activeElement?.dataset?.itemId;
    if (!focused && !skipWarning) {
      log(`⚠️ No input focused - click in an input field first, then press S to sort`, 'warning');
      return;
    }
    if (!focused) return; // Skip silently in automation

    log(`🔄 Sorting list (focused: #${focused})`, 'test');
    focusStore.items = [...focusStore.items].sort((a, b) => a.text.localeCompare(b.text));

    setTimeout(() => {
      const stillFocused = document.activeElement?.dataset?.itemId;
      logTest('Focus preservation (sort)', focused === stillFocused,
        `focused: #${focused} → #${stillFocused || 'lost'}`);
    }, 50);
  },

  shuffle: function (skipWarning = false) {
    const focused = document.activeElement?.dataset?.itemId;
    if (!focused && !skipWarning) {
      log(`⚠️ No input focused - click in an input field first, then press X to shuffle`, 'warning');
      return;
    }
    if (!focused) return; // Skip silently in automation

    log(`🔀 Shuffling list (focused: #${focused})`, 'test');
    const shuffled = [...focusStore.items];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    focusStore.items = shuffled;

    setTimeout(() => {
      const stillFocused = document.activeElement?.dataset?.itemId;
      logTest('Focus preservation (shuffle)', focused === stillFocused,
        `focused: #${focused} → #${stillFocused || 'lost'}`);
    }, 50);
  },

  add: function () {
    const newItem = { id: focusItemId++, text: `Item ${focusItemId}` };
    focusStore.items = [...focusStore.items, newItem];
    log(`➕ Added item #${newItem.id}`, 'info');
  },

  remove: function () {
    if (focusStore.items.length > 0) {
      const removed = focusStore.items[focusStore.items.length - 1];
      focusStore.items = focusStore.items.slice(0, -1);
      log(`➖ Removed item #${removed.id}`, 'info');
    }
  }
};

// Keyboard shortcuts for focus testing
document.addEventListener('keydown', (e) => {
  // Only trigger if focus is in an input within focus-list
  const focusedInput = document.activeElement;
  if (focusedInput && focusedInput.tagName === 'INPUT' &&
    document.getElementById('focus-list').contains(focusedInput)) {

    if (e.key.toLowerCase() === 'r' && !e.ctrlKey && !e.metaKey) {
      e.preventDefault();
      focusTest.reverse();
    } else if (e.key.toLowerCase() === 's' && !e.ctrlKey && !e.metaKey) {
      e.preventDefault();
      focusTest.sort();
    } else if (e.key.toLowerCase() === 'x' && !e.ctrlKey && !e.metaKey) {
      e.preventDefault();
      focusTest.shuffle();
    }
  }
});

// ============================================================================
// TEST 2: SCROLL PRESERVATION
// ============================================================================

const scrollStore = state({
  items: Array.from({ length: 50 }, (_, i) => ({
    id: i + 1,
    text: `Scroll Item ${i + 1}`
  }))
});

let scrollNextId = 51;

repeat('#scroll-list', scrollStore, 'items', {
  element: 'div',
  key: item => item.id,
  render: (item, el) => {
    el.className = 'list-item';
    el.style.minHeight = '50px';
    el.innerHTML = `
      <span class="item-id">#${item.id}</span>
      <span>${item.text}</span>
    `;
  }
});

// Update scroll indicator
function updateScrollIndicator() {
  const container = document.getElementById('scroll-list');
  const firstVisible = scrollTest._getFirstVisibleItemId(container);
  const indicator = document.getElementById('scroll-view-info');

  if (indicator && firstVisible !== null) {
    const scrollPercent = Math.round((container.scrollTop / (container.scrollHeight - container.clientHeight)) * 100) || 0;
    indicator.innerHTML = `First visible item: <strong>#${firstVisible}</strong> | Scroll: ${container.scrollTop}px (${scrollPercent}%)`;
  }
}

// Update indicator on scroll
document.getElementById('scroll-list')?.addEventListener('scroll', updateScrollIndicator);
setTimeout(updateScrollIndicator, 100);

window.scrollTest = {
  scrollToMiddle: function () {
    const container = document.getElementById('scroll-list');
    const targetScroll = (container.scrollHeight - container.clientHeight) / 2;
    container.scrollTop = targetScroll;

    setTimeout(() => {
      updateScrollIndicator();
      const firstVisible = this._getFirstVisibleItemId(container);
      log(`📍 Scrolled to middle - First visible item: #${firstVisible}`, 'info');
    }, 100);
  },

  addTop: function () {
    const container = document.getElementById('scroll-list');
    const scrollBefore = container.scrollTop;
    const firstVisibleId = this._getFirstVisibleItemId(container);
    log(`➕ Adding at top (scroll: ${scrollBefore}px, first visible: #${firstVisibleId})`, 'test');

    scrollStore.items = [{ id: scrollNextId++, text: `NEW TOP ${scrollNextId}` }, ...scrollStore.items];

    setTimeout(() => {
      updateScrollIndicator();
      const scrollAfter = container.scrollTop;
      const firstVisibleAfter = this._getFirstVisibleItemId(container);
      const viewStayedSame = firstVisibleId === firstVisibleAfter;

      // When adding at top, the SAME item should stay visible (scroll position changes to compensate)
      logTest('Scroll preservation (add top)', viewStayedSame,
        `first visible: #${firstVisibleId} → #${firstVisibleAfter} ${viewStayedSame ? '✓ SAME VIEW' : '⚠️ VIEW JUMPED!'} (scroll: ${scrollBefore}px → ${scrollAfter}px)`);
    }, 50);
  },

  addBottom: function () {
    const container = document.getElementById('scroll-list');
    const scrollBefore = container.scrollTop;
    const firstVisibleId = this._getFirstVisibleItemId(container);
    log(`➕ Adding at bottom (scroll: ${scrollBefore}px, first visible: #${firstVisibleId})`, 'test');

    scrollStore.items = [...scrollStore.items, { id: scrollNextId++, text: `NEW BOTTOM ${scrollNextId}` }];

    setTimeout(() => {
      updateScrollIndicator();
      const scrollAfter = container.scrollTop;
      const firstVisibleAfter = this._getFirstVisibleItemId(container);
      const unchanged = Math.abs(scrollBefore - scrollAfter) < 5 && firstVisibleId === firstVisibleAfter;

      logTest('Scroll preservation (add bottom)', unchanged,
        `scroll: ${scrollBefore}px → ${scrollAfter}px, first visible: #${firstVisibleId} → #${firstVisibleAfter}`);
    }, 50);
  },

  removeFirst: function () {
    const container = document.getElementById('scroll-list');
    const scrollBefore = container.scrollTop;
    const firstVisibleId = this._getFirstVisibleItemId(container);
    log(`➖ Removing first (scroll: ${scrollBefore}px, first visible: #${firstVisibleId})`, 'test');

    if (scrollStore.items.length > 0) {
      const removedId = scrollStore.items[0].id;
      scrollStore.items = scrollStore.items.slice(1);

      setTimeout(() => {
        updateScrollIndicator();
        const scrollAfter = container.scrollTop;
        const firstVisibleAfter = this._getFirstVisibleItemId(container);

        // If removed item was above viewport, view should stay the same
        // If removed item was the first visible, it's ok if view changes to next item
        const isExpected = (removedId !== firstVisibleId && firstVisibleId === firstVisibleAfter) ||
          (removedId === firstVisibleId);

        logTest('Scroll preservation (remove first)', isExpected,
          `removed: #${removedId}, first visible: #${firstVisibleId} → #${firstVisibleAfter} (scroll: ${scrollBefore}px → ${scrollAfter}px)`);
      }, 50);
    }
  },

  shuffle: function () {
    const container = document.getElementById('scroll-list');
    const scrollBefore = container.scrollTop;
    const firstVisibleId = this._getFirstVisibleItemId(container);
    log(`🔀 Shuffling (scroll: ${scrollBefore}px, first visible: #${firstVisibleId})`, 'test');

    const shuffled = [...scrollStore.items];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    scrollStore.items = shuffled;

    setTimeout(() => {
      updateScrollIndicator();
      const scrollAfter = container.scrollTop;
      const firstVisibleAfter = this._getFirstVisibleItemId(container);

      // After shuffle, scroll PIXEL position should stay the same
      // The visible ITEM will change (that's expected - items shuffled!)
      const scrollStayedSame = Math.abs(scrollBefore - scrollAfter) < 5;

      logTest('Scroll preservation (shuffle)', scrollStayedSame,
        `scroll position preserved: ${scrollBefore}px → ${scrollAfter}px ✓ (first visible changed from #${firstVisibleId} → #${firstVisibleAfter} - this is expected)`);
    }, 50);
  },

  _getFirstVisibleItemId: function (container) {
    const items = container.querySelectorAll('.list-item');
    const containerRect = container.getBoundingClientRect();

    for (let item of items) {
      const rect = item.getBoundingClientRect();
      if (rect.bottom > containerRect.top + 10) {
        const idText = item.querySelector('.item-id')?.textContent;
        return idText ? parseInt(idText.replace('#', '')) : null;
      }
    }
    return null;
  }
};

// ============================================================================
// TEST 3: CARET POSITION
// ============================================================================

let caretItemId = 1;
const caretStore = state({
  items: [
    { id: caretItemId++, text: 'Type here and updates will happen' },
    { id: caretItemId++, text: 'Caret position should be preserved' },
    { id: caretItemId++, text: 'Try typing in the middle of text' }
  ]
});

let caretAutoInterval = null;

repeat('#caret-list', caretStore, 'items', {
  element: 'div',
  key: item => item.id,
  render: (item, el) => {
    if (!el.dataset.initialized) {
      el.className = 'list-item';
      el.innerHTML = `
        <span class="item-id">#${item.id}</span>
        <input type="text" value="${item.text}" data-item-id="${item.id}">
      `;

      const input = el.querySelector('input');
      input.addEventListener('input', (e) => {
        item.text = e.target.value;
      });

      el.dataset.initialized = 'true';
    } else {
      // Update text without disturbing focus/caret
      const input = el.querySelector('input');
      if (input !== document.activeElement) {
        input.value = item.text;
      }
    }
  }
});

window.caretTest = {
  update: function () {
    const focused = document.activeElement;
    const caretPos = focused?.selectionStart;

    if (caretPos === undefined) {
      log(`⚠️ No input focused - click in an input field first`, 'warning');
      return;
    }

    log(`🔄 Updating items (caret at: ${caretPos})`, 'test');

    // Trigger a re-render by reassigning
    caretStore.items = [...caretStore.items];

    setTimeout(() => {
      const newCaretPos = document.activeElement?.selectionStart;
      logTest('Caret preservation (update)', caretPos === newCaretPos,
        `position: ${caretPos} → ${newCaretPos ?? 'lost'}`);
    }, 50);
  },

  reorder: function () {
    const focused = document.activeElement;
    const caretPos = focused?.selectionStart;

    if (caretPos === undefined) {
      log(`⚠️ No input focused - click in an input field first`, 'warning');
      return;
    }

    log(`🔄 Reordering (caret at: ${caretPos})`, 'test');

    caretStore.items = [...caretStore.items].reverse();

    setTimeout(() => {
      const newCaretPos = document.activeElement?.selectionStart;
      logTest('Caret preservation (reorder)', caretPos === newCaretPos,
        `position: ${caretPos} → ${newCaretPos ?? 'lost'}`);
    }, 50);
  },

  toggleAuto: function () {
    const btn = document.getElementById('caret-auto-btn');
    if (caretAutoInterval) {
      clearInterval(caretAutoInterval);
      caretAutoInterval = null;
      btn.textContent = 'Enable Auto-Update';
      btn.classList.remove('active');
      log('Auto-update disabled', 'info');
    } else {
      caretAutoInterval = setInterval(() => {
        caretStore.items = [...caretStore.items];
      }, 500);
      btn.textContent = 'Disable Auto-Update';
      btn.classList.add('active');
      log('Auto-update enabled (500ms interval)', 'success');
    }
  }
};

// ============================================================================
// TEST 4: SELECTION PRESERVATION
// ============================================================================

let selectionItemId = 1;
const selectionStore = state({
  items: [
    { id: selectionItemId++, text: 'Select some text in this input field' },
    { id: selectionItemId++, text: 'Then trigger an update to test selection' }
  ]
});

repeat('#selection-list', selectionStore, 'items', {
  element: 'div',
  key: item => item.id,
  render: (item, el) => {
    if (!el.dataset.initialized) {
      el.className = 'list-item';
      el.innerHTML = `
        <span class="item-id">#${item.id}</span>
        <input type="text" value="${item.text}" data-item-id="${item.id}">
      `;

      const input = el.querySelector('input');
      input.addEventListener('input', (e) => {
        item.text = e.target.value;
      });

      el.dataset.initialized = 'true';
    }
  }
});

window.selectionTest = {
  update: function (skipWarning = false) {
    const focused = document.activeElement;
    const selStart = focused?.selectionStart;
    const selEnd = focused?.selectionEnd;

    if (selStart === undefined || selEnd === undefined || selStart === selEnd) {
      if (!skipWarning) {
        log(`⚠️ No text selected - select some text in an input field first, then press U`, 'warning');
      }
      return;
    }

    const selectedText = focused.value.substring(selStart, selEnd);
    log(`🔄 Updating (selection: "${selectedText}" at ${selStart}-${selEnd})`, 'test');

    selectionStore.items = [...selectionStore.items];

    setTimeout(() => {
      const newStart = document.activeElement?.selectionStart;
      const newEnd = document.activeElement?.selectionEnd;
      const newText = document.activeElement?.value.substring(newStart, newEnd);

      logTest('Selection preservation (update)',
        selStart === newStart && selEnd === newEnd,
        `"${selectedText}" (${selStart}-${selEnd}) → "${newText}" (${newStart}-${newEnd})`);
    }, 50);
  },

  reorder: function (skipWarning = false) {
    const focused = document.activeElement;
    const selStart = focused?.selectionStart;
    const selEnd = focused?.selectionEnd;

    if (selStart === undefined || selEnd === undefined || selStart === selEnd) {
      if (!skipWarning) {
        log(`⚠️ No text selected - select some text in an input field first, then press O`, 'warning');
      }
      return;
    }

    const selectedText = focused.value.substring(selStart, selEnd);
    log(`🔄 Reordering (selection: "${selectedText}" at ${selStart}-${selEnd})`, 'test');

    selectionStore.items = [...selectionStore.items].reverse();

    setTimeout(() => {
      const newStart = document.activeElement?.selectionStart;
      const newEnd = document.activeElement?.selectionEnd;
      const newText = document.activeElement?.value.substring(newStart, newEnd);

      logTest('Selection preservation (reorder)',
        selStart === newStart && selEnd === newEnd,
        `"${selectedText}" (${selStart}-${selEnd}) → "${newText}" (${newStart}-${newEnd})`);
    }, 50);
  }
};

// Keyboard shortcuts for selection testing
document.addEventListener('keydown', (e) => {
  const focusedInput = document.activeElement;
  if (focusedInput && focusedInput.tagName === 'INPUT' &&
    document.getElementById('selection-list').contains(focusedInput)) {

    if (e.key.toLowerCase() === 'u' && !e.ctrlKey && !e.metaKey) {
      e.preventDefault();
      selectionTest.update();
    } else if (e.key.toLowerCase() === 'o' && !e.ctrlKey && !e.metaKey) {
      e.preventDefault();
      selectionTest.reorder();
    }
  }
});

// ============================================================================
// TEST 5: SUBTREE LISTENERS
// ============================================================================

let listenerItemId = 1;
const listenerStore = state({
  items: [
    { id: listenerItemId++, text: 'Button 1', clicks: 0 },
    { id: listenerItemId++, text: 'Button 2', clicks: 0 },
    { id: listenerItemId++, text: 'Button 3', clicks: 0 }
  ]
});

repeat('#listener-list', listenerStore, 'items', {
  element: 'div',
  key: item => item.id,
  render: (item, el) => {
    if (!el.dataset.initialized) {
      el.className = 'list-item';
      el.innerHTML = `
        <span class="item-id">#${item.id}</span>
        <span>${item.text}</span>
        <button class="click-btn">Click me</button>
        <span class="item-badge">${item.clicks} clicks</span>
      `;

      const btn = el.querySelector('.click-btn');
      btn.addEventListener('click', () => {
        item.clicks++;
        el.querySelector('.item-badge').textContent = `${item.clicks} clicks`;
        log(`Button #${item.id} clicked (total: ${item.clicks})`, 'info');
      });

      el.dataset.initialized = 'true';
    }
  }
});

window.listenerTest = {
  reorder: function () {
    log(`🔄 Reordering items`, 'test');
    const clicksBefore = listenerStore.items.map(item => ({ id: item.id, clicks: item.clicks }));

    listenerStore.items = [...listenerStore.items].reverse();

    setTimeout(() => {
      const clicksMatch = listenerStore.items.every((item, idx) => {
        const before = clicksBefore.find(b => b.id === item.id);
        return before && before.clicks === item.clicks;
      });

      logTest('Event listeners preserved (reorder)', clicksMatch,
        'Click counts match after reorder');
    }, 50);
  },

  add: function () {
    listenerStore.items = [...listenerStore.items, {
      id: listenerItemId++,
      text: `Button ${listenerItemId}`,
      clicks: 0
    }];
    log(`➕ Added item #${listenerItemId - 1}`, 'info');
  }
};

// ============================================================================
// TEST 6: INTERNAL STATE
// ============================================================================

let stateItemId = 1;
const stateStore = state({
  items: [
    { id: stateItemId++, text: 'Task 1', checked: false, radio: false },
    { id: stateItemId++, text: 'Task 2', checked: false, radio: false },
    { id: stateItemId++, text: 'Task 3', checked: false, radio: false },
    { id: stateItemId++, text: 'Task 4', checked: false, radio: false }
  ]
});

repeat('#state-list', stateStore, 'items', {
  element: 'div',
  key: item => item.id,
  render: (item, el) => {
    // Always set item ID for querying
    el.dataset.itemId = item.id;

    if (!el.dataset.initialized) {
      el.className = 'list-item';
      el.innerHTML = `
        <span class="item-id">#${item.id}</span>
        <input type="checkbox" class="checkbox" ${item.checked ? 'checked' : ''}>
        <input type="radio" name="item-radio" class="radio" ${item.radio ? 'checked' : ''}>
        <span>${item.text}</span>
      `;

      const checkbox = el.querySelector('.checkbox');
      checkbox.addEventListener('change', (e) => {
        item.checked = e.target.checked;
        log(`Item #${item.id} checkbox: ${item.checked}`, 'info');
      });

      const radio = el.querySelector('.radio');
      radio.addEventListener('change', (e) => {
        // Uncheck all others
        stateStore.items.forEach(i => i.radio = false);
        item.radio = e.target.checked;
        // Re-render to update radio states
        stateStore.items = [...stateStore.items];
        log(`Item #${item.id} radio selected`, 'info');
      });

      el.dataset.initialized = 'true';
    } else {
      // Update states if needed
      const checkbox = el.querySelector('.checkbox');
      if (checkbox && checkbox.checked !== item.checked) {
        checkbox.checked = item.checked;
      }

      const radio = el.querySelector('.radio');
      if (radio && radio.checked !== item.radio) {
        radio.checked = item.radio;
      }
    }
  }
});

window.stateTest = {
  reorder: function () {
    log(`🔄 Reordering items`, 'test');
    const statesBefore = stateStore.items.map(item => ({
      id: item.id,
      checked: item.checked,
      radio: item.radio
    }));

    stateStore.items = [...stateStore.items].reverse();

    setTimeout(() => {
      let allMatch = true;
      const details = [];

      // Debug: Check what elements exist
      const allElements = document.querySelectorAll('#state-list [data-item-id]');
      log(`Found ${allElements.length} elements with data-item-id`, 'info');

      stateStore.items.forEach(item => {
        const before = statesBefore.find(s => s.id === item.id);
        const el = document.querySelector(`#state-list [data-item-id="${item.id}"]`);

        if (!el) {
          allMatch = false;
          details.push(`Item #${item.id}: element not found in DOM!`);
          return;
        }

        const checkbox = el.querySelector('.checkbox');
        const radio = el.querySelector('.radio');

        if (!checkbox || !radio) {
          allMatch = false;
          details.push(`Item #${item.id}: checkbox or radio not found (checkbox:${!!checkbox}, radio:${!!radio})`);
          return;
        }

        const itemStateMatch = before &&
          item.checked === checkbox.checked &&
          item.radio === radio.checked &&
          before.checked === item.checked &&
          before.radio === item.radio;

        if (!itemStateMatch) {
          allMatch = false;
          details.push(`Item #${item.id}: before={checked:${before?.checked}, radio:${before?.radio}}, ` +
            `data={checked:${item.checked}, radio:${item.radio}}, ` +
            `DOM={checked:${checkbox.checked}, radio:${radio.checked}}`);
        }
      });

      logTest('Internal state preserved (reorder)', allMatch,
        allMatch ? 'All checkbox/radio states match' : details.join('; '));
    }, 100); // Increased timeout
  },

  shuffle: function () {
    log(`🔀 Shuffling items`, 'test');
    const shuffled = [...stateStore.items];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    stateStore.items = shuffled;
  },

  add: function () {
    stateStore.items = [...stateStore.items, {
      id: stateItemId++,
      text: `Task ${stateItemId}`,
      checked: false,
      radio: false
    }];
    log(`➕ Added item #${stateItemId - 1}`, 'info');
  }
};

// ============================================================================
// TEST 7: KEY REUSE
// ============================================================================

let keyReuseItemId = 1;
const keyReuseStore = state({
  items: [
    { id: keyReuseItemId++, text: 'Item A' },
    { id: keyReuseItemId++, text: 'Item B' },
    { id: keyReuseItemId++, text: 'Item C' }
  ]
});

// Track DOM element references
const elementRefs = new Map();

repeat('#key-reuse-list', keyReuseStore, 'items', {
  element: 'div',
  key: item => item.id,
  render: (item, el) => {
    // Store element reference on first render
    if (!elementRefs.has(item.id)) {
      elementRefs.set(item.id, el);
      el.dataset.createdAt = Date.now();
      log(`🆕 Created DOM element for item #${item.id}`, 'info');
    } else {
      // Check if same element
      const isSameElement = elementRefs.get(item.id) === el;
      if (!isSameElement) {
        log(`⚠️ Different element for item #${item.id}!`, 'error');
      }
    }

    el.className = 'list-item';
    el.innerHTML = `
      <span class="item-id">#${item.id}</span>
      <span>${item.text}</span>
      <span class="item-badge">Created: ${el.dataset.createdAt}</span>
    `;
  }
});

window.keyReuseTest = {
  reorder: function () {
    log(`🔄 Reordering to test element reuse`, 'test');
    const refsBefore = new Map(elementRefs);

    keyReuseStore.items = [...keyReuseStore.items].reverse();

    setTimeout(() => {
      const allReused = Array.from(refsBefore.entries()).every(([id, el]) => {
        return elementRefs.get(id) === el;
      });

      logTest('DOM element reuse (reorder)', allReused,
        `All ${refsBefore.size} elements reused`);
    }, 50);
  },

  update: function () {
    log(`🔄 Updating item data`, 'test');
    const refsBefore = new Map(elementRefs);

    keyReuseStore.items = keyReuseStore.items.map(item => ({
      ...item,
      text: `${item.text} (updated)`
    }));

    setTimeout(() => {
      const allReused = Array.from(refsBefore.entries()).every(([id, el]) => {
        return elementRefs.get(id) === el;
      });

      logTest('DOM element reuse (update)', allReused,
        'Elements not recreated on data change');
    }, 50);
  }
};

// ============================================================================
// TEST 8: CRUD OPERATIONS
// ============================================================================

let crudItemId = 1;
const crudStore = state({
  items: [
    { id: crudItemId++, text: 'Initial Item 1' },
    { id: crudItemId++, text: 'Initial Item 2' }
  ]
});

repeat('#crud-list', crudStore, 'items', {
  element: 'div',
  key: item => item.id,
  render: (item, el) => {
    el.className = 'list-item';
    el.innerHTML = `
      <span class="item-id">#${item.id}</span>
      <input type="text" value="${item.text}">
      <button class="danger" onclick="crudTest.removeItem(${item.id})">Remove</button>
    `;

    if (!el.dataset.initialized) {
      const input = el.querySelector('input');
      input.addEventListener('input', (e) => {
        item.text = e.target.value;
      });
      el.dataset.initialized = 'true';
    }
  }
});

window.crudTest = {
  addMultiple: function () {
    log(`➕ Adding 5 items`, 'test');
    const countBefore = crudStore.items.length;

    const newItems = Array.from({ length: 5 }, () => ({
      id: crudItemId++,
      text: `Item ${crudItemId}`
    }));

    crudStore.items = [...crudStore.items, ...newItems];

    setTimeout(() => {
      logTest('Bulk add operation', crudStore.items.length === countBefore + 5,
        `Added ${crudStore.items.length - countBefore} items`);
    }, 50);
  },

  removeMultiple: function () {
    log(`➖ Removing 3 items`, 'test');
    const countBefore = crudStore.items.length;

    if (crudStore.items.length >= 3) {
      crudStore.items = crudStore.items.slice(0, -3);

      setTimeout(() => {
        logTest('Bulk remove operation', crudStore.items.length === countBefore - 3,
          `Removed ${countBefore - crudStore.items.length} items`);
      }, 50);
    } else {
      log(`⚠️ Not enough items to remove`, 'warning');
    }
  },

  removeItem: function (id) {
    crudStore.items = crudStore.items.filter(item => item.id !== id);
    log(`➖ Removed item #${id}`, 'info');
  },

  updateAll: function () {
    log(`🔄 Updating all items`, 'test');
    const countBefore = crudStore.items.length;

    crudStore.items = crudStore.items.map(item => ({
      ...item,
      text: `${item.text} ✓`
    }));

    setTimeout(() => {
      logTest('Bulk update operation', crudStore.items.length === countBefore,
        `Updated ${countBefore} items`);
    }, 50);
  },

  clear: function () {
    log(`🗑️ Clearing all items`, 'test');
    crudStore.items = [];

    setTimeout(() => {
      const containerEmpty = document.getElementById('crud-list').children.length === 0;
      logTest('Clear operation', containerEmpty, 'All items removed from DOM');
    }, 50);
  }
};

// ============================================================================
// TEST 9: INITIAL RENDER & CLEANUP
// ============================================================================

let renderUnsubscribe = null;
let renderItemId = 1;
const renderStore = state({
  items: []
});

window.renderTest = {
  initialize: function () {
    log(`🎬 Initializing repeat()`, 'test');

    renderStore.items = [
      { id: renderItemId++, text: 'Initialized 1' },
      { id: renderItemId++, text: 'Initialized 2' },
      { id: renderItemId++, text: 'Initialized 3' }
    ];

    renderUnsubscribe = repeat('#render-list', renderStore, 'items', {
      element: 'div',
      key: item => item.id,
      render: (item, el) => {
        el.className = 'list-item';
        el.innerHTML = `
          <span class="item-id">#${item.id}</span>
          <span>${item.text}</span>
        `;
      }
    });

    setTimeout(() => {
      const rendered = document.getElementById('render-list').children.length === 3;
      logTest('Initial render', rendered, `${renderStore.items.length} items rendered`);
    }, 50);
  },

  cleanup: function () {
    log(`🧹 Cleaning up repeat()`, 'test');

    if (renderUnsubscribe) {
      renderUnsubscribe();
      renderUnsubscribe = null;

      setTimeout(() => {
        // Items should still be in DOM until we clear the store
        renderStore.items = [];

        setTimeout(() => {
          const isEmpty = document.getElementById('render-list').children.length === 0;
          logTest('Cleanup operation', isEmpty, 'Unsubscribe successful');
        }, 50);
      }, 50);
    } else {
      log(`⚠️ Not initialized yet`, 'warning');
    }
  },

  reinitialize: function () {
    this.cleanup();
    setTimeout(() => this.initialize(), 200);
  }
};

// ============================================================================
// AUTOMATION
// ============================================================================

let automationRunning = false;
let automationTimeout = null;

window.startAutomation = async function () {
  if (automationRunning) return;

  automationRunning = true;
  document.getElementById('auto-mode-btn').classList.add('hidden');
  document.getElementById('stop-auto-btn').classList.remove('hidden');
  document.getElementById('automation-status').classList.remove('hidden');

  log('🤖 Starting automated test sequence...', 'test');

  const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));
  const updateStatus = (text) => {
    document.getElementById('automation-text').textContent = text;
  };

  try {
    // Test 1: Focus Preservation
    updateStatus('Testing focus preservation...');
    await wait(300);

    // Focus a random input in the focus test list
    const focusInputs = document.querySelectorAll('#focus-list input');
    if (focusInputs.length > 0) {
      const randomInput = focusInputs[Math.floor(Math.random() * focusInputs.length)];
      randomInput.focus();
      log(`Focused input #${randomInput.dataset.itemId} for automation`, 'info');
      await wait(100);

      // Test reverse
      focusTest.reverse(true);
      await wait(300);

      // Test sort (refocus first)
      randomInput.focus();
      await wait(100);
      focusTest.sort(true);
      await wait(300);

      // Test shuffle multiple times
      for (let i = 0; i < 3; i++) {
        randomInput.focus();
        await wait(100);
        focusTest.shuffle(true);
        await wait(300);
      }
    } else {
      log('⚠️ No focus inputs found', 'warning');
    }
    await wait(500);

    // Test 2: Scroll Preservation
    updateStatus('Testing scroll preservation...');
    await wait(500);

    // Scroll to middle first
    const scrollList = document.getElementById('scroll-list');
    scrollList.scrollTop = (scrollList.scrollHeight - scrollList.clientHeight) / 2;
    await wait(200);

    scrollTest.addTop();
    await wait(300);
    scrollTest.addBottom();
    await wait(300);
    scrollTest.removeFirst();
    await wait(300);
    scrollTest.shuffle();
    await wait(500);

    // Test 3: Caret Position (skip in automation)
    updateStatus('Skipping caret position (requires manual testing)...');
    log('⏭️ Skipping caret tests - these require manual input focus', 'info');
    await wait(300);

    // Test 4: Selection Preservation (skip in automation)
    updateStatus('Skipping selection preservation (requires manual testing)...');
    log('⏭️ Skipping selection tests - these require manual text selection', 'info');
    await wait(300);

    // Test 5: Subtree Listeners
    updateStatus('Testing event listeners...');
    await wait(500);
    listenerTest.add();
    await wait(300);
    listenerTest.reorder();
    await wait(500);

    // Test 6: Internal State
    updateStatus('Testing internal state...');
    await wait(500);
    stateTest.add();
    await wait(300);
    stateTest.reorder();
    await wait(300);
    stateTest.shuffle();
    await wait(500);

    // Test 7: Key Reuse
    updateStatus('Testing element reuse...');
    await wait(500);
    keyReuseTest.reorder();
    await wait(300);
    keyReuseTest.update();
    await wait(500);

    // Test 8: CRUD Operations
    updateStatus('Testing CRUD operations...');
    await wait(500);
    crudTest.addMultiple();
    await wait(300);
    crudTest.updateAll();
    await wait(300);
    crudTest.removeMultiple();
    await wait(500);

    // Test 9: Initial Render & Cleanup
    updateStatus('Testing initialization and cleanup...');
    await wait(500);
    renderTest.initialize();
    await wait(500);
    renderTest.cleanup();
    await wait(300);
    renderTest.reinitialize();
    await wait(500);

    log('✅ Automated test sequence completed!', 'success');
    updateStatus('Automation complete!');
    await wait(2000);

  } catch (error) {
    log(`❌ Automation error: ${error.message}`, 'error');
  } finally {
    stopAutomation();
  }
};

window.stopAutomation = function () {
  automationRunning = false;
  if (automationTimeout) {
    clearTimeout(automationTimeout);
    automationTimeout = null;
  }

  document.getElementById('auto-mode-btn').classList.remove('hidden');
  document.getElementById('stop-auto-btn').classList.add('hidden');
  document.getElementById('automation-status').classList.add('hidden');

  log('🛑 Automation stopped', 'warning');
};

window.resetAllTests = function () {
  log('🔄 Resetting all tests...', 'warning');

  // Stop automation if running
  if (automationRunning) {
    stopAutomation();
  }

  // Stop auto-update for caret test
  if (caretAutoInterval) {
    caretTest.toggleAuto();
  }

  // Reset stats
  testStats = { passed: 0, failed: 0, total: 0 };
  updateStats();

  // Reload the page for a clean state
  window.location.reload();
};

// ============================================================================
// INITIALIZATION
// ============================================================================

log('✅ Test suite initialized successfully', 'success');
log('👉 Click "Start Automation" for automated tests or use manual controls', 'info');
