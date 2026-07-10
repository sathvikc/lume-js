# Routing

Lume does not include a router, and it does not need to. Routing is just state — store the current route in a `state()` object and react to it with `effect()`. Two patterns cover most use cases.

## Hash-based routing

The simplest approach uses the URL hash (`#`). No server configuration required.

```javascript
const store = state({
  route: 'home'
});

function handleHash() {
  const hash = window.location.hash.replace('#', '') || 'home';
  store.route = hash;
}

window.addEventListener('hashchange', handleHash);
handleHash(); // sync with the URL on first load
```

Then use `effect()` to show or hide content based on the current route:

```javascript
effect(() => {
  document.getElementById('home-page').style.display =
    store.route === 'home' ? 'block' : 'none';

  document.getElementById('about-page').style.display =
    store.route === 'about' ? 'block' : 'none';
});
```

Navigating to `#about` sets `store.route = 'about'` and the effect re-runs automatically.

## History API (clean URLs)

For URLs without a `#`, use the History API. You need to intercept link clicks to prevent a full page reload, and handle the browser back button via `popstate`.

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

Your server must return the same HTML file for all routes so that a direct visit or page refresh still works. This is a standard requirement for any single-page app using the History API.

---

<!-- lume:nav -->
**← Previous: [Forms](forms.md)** | **Next: [Animations](animations.md) →**
<!-- /lume:nav -->
