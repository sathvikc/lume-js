import { state, bindDom } from "lume-js";
import { computed } from "lume-js/addons";

const store = state({ count: 0 });
const cleanup = bindDom(document.body, store);

// Create computed value
const doubleCount = computed(() => store.count * 2);

// Subscribe to computed changes
const unsubComputed = doubleCount.subscribe(val => {
  document.querySelector("#double").textContent = val;
});

// Trigger recomputation when store.count changes
const unsubCount = store.$subscribe("count", () => {
  doubleCount.recompute();
});

document.getElementById("inc").addEventListener("click", () => {
  store.count++;
});

window.addEventListener('beforeunload', () => {
  cleanup();
  unsubComputed();
  unsubCount();
});