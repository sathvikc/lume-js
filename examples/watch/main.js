import { state, bindDom } from "lume-js";
import { watch } from "lume-js/addons";

const store = state({ count: 0 });
const cleanup = bindDom(document.body, store);

// watch() now returns unsubscribe function
const unwatch = watch(store, "count", val => {
  console.log("Count changed:", val);
});

document.getElementById("inc").addEventListener("click", () => {
  store.count++;
});

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
  cleanup();
  unwatch();
});