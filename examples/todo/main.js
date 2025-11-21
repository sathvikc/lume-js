import { state, bindDom, effect } from 'lume-js';
import { computed } from 'lume-js/addons';

// Simple id generator
const nextId = (() => { let i = 0; return () => ++i; })();

const persisted = JSON.parse(localStorage.getItem('lume_todos') || 'null');

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

// Use effect to automatically update store properties when computed values change
const effectCleanup = effect(() => {
  store.remaining = remaining.value;
  store.completed = completed.value;
});

// Render list whenever todos or filter changes
const listEl = document.getElementById('todo-list');

function applyFilter(items, filter) {
  if (filter === 'active') return items.filter(t => !t.done);
  if (filter === 'completed') return items.filter(t => t.done);
  return items;
}

function render() {
  const items = applyFilter(store.todos, store.filter);
  listEl.innerHTML = '';
  if (items.length === 0) {
    const li = document.createElement('li');
    li.className = 'empty';
    li.textContent = 'Nothing here yet — add a task!';
    listEl.appendChild(li);
    return;
  }

  for (const todo of items) {
    const li = document.createElement('li');
    li.className = 'todo';

    const label = document.createElement('label');

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = !!todo.done;
    checkbox.dataset.todoId = todo.id;
    checkbox.addEventListener('input', (e) => {
      const id = parseInt(e.target.dataset.todoId, 10);
      toggleTodo(id, e.target);
    });

    const span = document.createElement('span');
    span.className = 'title' + (todo.done ? ' done' : '');
    span.textContent = todo.title;

    label.appendChild(checkbox);
    label.appendChild(span);
    li.appendChild(label);

    const right = document.createElement('div');
    right.className = 'right';

    const del = document.createElement('button');
    del.className = 'danger';
    del.textContent = 'Delete';
    del.dataset.todoId = todo.id;
    del.addEventListener('click', (e) => {
      const id = parseInt(e.target.dataset.todoId, 10);
      deleteTodo(id);
    });

    right.appendChild(del);
    li.appendChild(right);

    listEl.appendChild(li);
  }
}

function persist() {
  localStorage.setItem('lume_todos', JSON.stringify({ todos: store.todos, filter: store.filter }));
}

// Mutations — replace array to trigger notifications
function addTodo(title) {
  const trimmed = (title || '').trim();
  if (!trimmed) return;
  const todo = { id: nextId(), title: trimmed, done: false };
  store.todos = [todo, ...store.todos];
  store.newTodoTitle = '';
}

function toggleTodo(id, focusedElement) {
  store.todos = store.todos.map(t => t.id === id ? { ...t, done: !t.done } : t);
  // Restore focus after re-render
  if (focusedElement) {
    setTimeout(() => {
      const checkbox = listEl.querySelector(`input[data-todo-id="${id}"]`);
      if (checkbox) checkbox.focus();
    }, 0);
  }
}

function deleteTodo(id) {
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
// Capture unsubscribe functions for symmetrical cleanup
const unsubscribeTodos = store.$subscribe('todos', () => {
  render();
  persist();
});
const unsubscribeFilter = store.$subscribe('filter', () => {
  render();
  updateFilterUI();
  persist();
});

// Initial paint
render();
updateFilterUI();

// Cleanup
window.addEventListener('beforeunload', () => {
  cleanup();
  effectCleanup();
  unsubscribeTodos();
  unsubscribeFilter();
});
