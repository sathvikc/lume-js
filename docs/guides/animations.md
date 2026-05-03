# Animations

Lume pairs well with CSS transitions and animation libraries like [GSAP](https://greensock.com/gsap/). Because state changes are plain property writes and effects are plain functions, there is nothing special to learn — hook in wherever you would normally trigger an animation.

## CSS Transitions

The lightest approach: toggle a class in an `effect` and let CSS do the rest.

```javascript
const store = state({ isOpen: false });

effect(() => {
  document.getElementById('menu').classList.toggle('open', store.isOpen);
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

Set `store.isOpen = true` and the menu slides in. No extra API to learn.

## GSAP

Use `effect()` or `watch()` to trigger GSAP animations when state changes. `watch` is the cleaner choice when you need to react to a single key:

```javascript
import gsap from 'gsap';
import { watch } from 'lume-js/addons';

const store = state({ x: 0 });

watch(store, 'x', (newX) => {
  gsap.to('.box', { x: newX, duration: 0.5 });
});
```

Any other GSAP method (`gsap.from`, `gsap.timeline`, etc.) works the same way — just call it inside the callback.

---

**← Previous: [Routing](routing.md)** | **Next: [Testing](testing.md) →**
