# Animations

Lume.js works great with animation libraries like [GSAP](https://greensock.com/gsap/) or standard CSS transitions.

## CSS Transitions

The simplest way is to bind a class or style.

```javascript
const store = state({ isOpen: false });

effect(() => {
  const el = document.getElementById('menu');
  el.classList.toggle('open', store.isOpen);
});
```

```css
#menu {
  transition: transform 0.3s;
  transform: translateX(-100%);
}
#menu.open {
  transform: translateX(0);
}
```

## GSAP

Use `effect()` or `$subscribe()` to trigger GSAP animations.

```javascript
import gsap from 'gsap';

const store = state({ x: 0 });

// Animate whenever x changes
store.$subscribe('x', (newX) => {
  gsap.to('.box', { x: newX, duration: 0.5 });
});
```

---

**← Previous: [Routing](routing.md)** | **Next: [Testing](testing.md) →**
