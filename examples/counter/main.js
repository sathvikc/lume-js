import { state, bindDom } from "lume-js";

const store = state({
  count: 0,
  user: state({
    name: "Alice"
  })
});

const cleanup = bindDom(document.body, store);

document.getElementById("inc").addEventListener("click", () => {
  store.count++;
});

document.getElementById("changeName").addEventListener("click", () => {
  store.user.name = store.user.name === "Alice" ? "Bob" : "Alice";
});

// Log changes (optional)
const unsubCount = store.$subscribe('count', (val) => {
  console.log('Count changed:', val);
});

const unsubName = store.user.$subscribe('name', (val) => {
  console.log('Name changed:', val);
});

// Cleanup on page unload (good practice)
window.addEventListener('beforeunload', () => {
  cleanup();
  unsubCount();
  unsubName();
});