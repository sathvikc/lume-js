import { bindDom, effect, state } from 'lume-js';
import { computed, repeat } from 'lume-js/addons';

const persisted = JSON.parse(localStorage.getItem('lume_todos') || 'null');

// Simple id generator - start after highest existing ID
const nextId = (() => {
  const maxId = persisted?.todos?.reduce((max, todo) => Math.max(max, todo.id || 0), 0) || 0;
  let i = maxId;
  return () => ++i;
})();

const store = state({
  todos: persisted?.todos ?? [], // plain array, we replace it on changes
  filter: persisted?.filter ?? 'all',
  newTodoTitle: '',
  // derived metrics will be bound via computed
  remaining: 0,
  completed: 0,
});

// Bind static fields
const cleanup = bindDom(document.body, store);

// Derived counts using computed with automatic dependency tracking
const remaining = computed(() => store.todos.filter(t => !t.done).length);
const completed = computed(() => store.todos.filter(t => t.done).length);

// Subscribe to computed values and update DOM directly
remaining.subscribe(value => {
  const el = document.querySelector('[data-bind="remaining"]');
  if (el) el.textContent = value;
});

completed.subscribe(value => {
  const el = document.querySelector('[data-bind="completed"]');
  if (el) el.textContent = value;
});

// Render list using repeat() for automatic updates and element reuse
const listEl = document.getElementById('todo-list');

// Create a computed filtered list
const filteredTodos = computed(() => {
  const filter = store.filter;
  const todos = store.todos;
  if (filter === 'active') return todos.filter(t => !t.done);
  if (filter === 'completed') return todos.filter(t => t.done);
  return todos;
});

// Use repeat to render the filtered todo list with focus preservation
const repeatCleanup = repeat(listEl, filteredTodos, 'value', {
  tag: 'li',
  key: todo => todo.id,
  render: (todo, li) => {
    if (!li.dataset.bound) {
      li.className = 'todo';
      li.innerHTML = `
        <label>
          <input type="checkbox">
          <span class="title"></span>
        </label>
        <div class="right">
          <button class="danger">Delete</button>
        </div>
      `;

      li.querySelector('input').addEventListener('input', () => toggleTodo(todo.id));
      li.querySelector('button').addEventListener('click', () => deleteTodo(todo.id));

      li.dataset.bound = 'true';
    }

    // Update on every render
    const checkbox = li.querySelector('input');
    const titleSpan = li.querySelector('.title');
    checkbox.checked = todo.done;
    titleSpan.textContent = todo.title;
    titleSpan.className = todo.done ? 'title done' : 'title';
  }
});

// Show empty state when no todos match filter
effect(() => {
  const items = filteredTodos.value || [];
  const isEmpty = items.length === 0;

  if (isEmpty && !listEl.querySelector('.empty')) {
    const li = document.createElement('li');
    li.className = 'empty';
    li.textContent = 'Nothing here yet — add a task!';
    listEl.appendChild(li);
  } else if (!isEmpty) {
    const emptyEl = listEl.querySelector('.empty');
    if (emptyEl) emptyEl.remove();
  }
});

function persist() {
  localStorage.setItem('lume_todos', JSON.stringify({ todos: store.todos, filter: store.filter }));
}

// Mutations — replace array to trigger notifications
function addTodo(title) {
  const trimmed = (title || '').trim();
  if (!trimmed) return;
  const todo = { id: nextId(), title: trimmed, done: false };
  // ⚠️ IMPORTANT: Lume requires immutable array updates!
  // See: docs/tutorials/working-with-arrays.md
  store.todos = [todo, ...store.todos];
  store.newTodoTitle = '';
}

function toggleTodo(id) {
  // Immutable update: map to new array
  store.todos = store.todos.map(t => t.id === id ? { ...t, done: !t.done } : t);
}

function deleteTodo(id) {
  // Immutable update: filter to new array
  store.todos = store.todos.filter(t => t.id !== id);
}

function clearCompleted() {
  store.todos = store.todos.filter(t => !t.done);
}

// Wire up form
const form = document.getElementById('new-todo-form');
const input = document.getElementById('new-todo');

form.addEventListener('submit', (e) => {
  e.preventDefault();
  addTodo(store.newTodoTitle);
});

// Toolbar
const filterButtons = Array.from(document.querySelectorAll('[data-filter]'));
function updateFilterUI() {
  filterButtons.forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-filter') === store.filter);
    btn.setAttribute('aria-pressed', btn.classList.contains('active'));
  });
}
filterButtons.forEach(btn => {
  const setFilter = () => {
    store.filter = btn.getAttribute('data-filter');
  };
  btn.addEventListener('click', setFilter);
  btn.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setFilter();
    }
  });
});

document.getElementById('clear-completed').addEventListener('click', clearCompleted);

// Subscriptions
const unsubscribeFilter = store.$subscribe('filter', () => {
  updateFilterUI();
  persist();
});

const unsubscribeTodos = store.$subscribe('todos', persist);

// Initial paint
updateFilterUI();

// Cleanup
window.addEventListener('beforeunload', () => {
  cleanup();
  effectCleanup();
  repeatCleanup();
  unsubscribeTodos();
  unsubscribeFilter();
});
