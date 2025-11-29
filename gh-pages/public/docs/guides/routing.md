# Routing

Lume.js does not have a built-in router, but it's easy to build one or use an existing one.

## Hash-based Routing (Simple)

You can use the URL hash (`#`) to determine which "page" to show.

```javascript
const store = state({
  route: 'home'
});

function handleHash() {
  const hash = window.location.hash.replace('#', '') || 'home';
  store.route = hash;
}

window.addEventListener('hashchange', handleHash);
handleHash(); // Handle initial load
```

Then, use `effect()` to show/hide content:

```javascript
effect(() => {
  document.getElementById('home-page').style.display = 
    store.route === 'home' ? 'block' : 'none';
    
  document.getElementById('about-page').style.display = 
    store.route === 'about' ? 'block' : 'none';
});
```

## History API (Advanced)

For cleaner URLs (no `#`), use the History API. You'll need to intercept link clicks.

```javascript
document.addEventListener('click', (e) => {
  if (e.target.matches('a')) {
    e.preventDefault();
    const href = e.target.getAttribute('href');
    history.pushState(null, '', href);
    store.route = href;
  }
});

window.addEventListener('popstate', () => {
  store.route = window.location.pathname;
});
```

---

**← Previous: [Forms](forms.md)** | **Next: [Animations](animations.md) →**
