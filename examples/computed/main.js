import { state, bindDom } from "lume-js";
import { computed } from "lume-js/addons";

const store = state({ count: 0 });
bindDom(document.body, store);

const doubleCount = computed(() => store.count * 2);

const unsubscribe = doubleCount.subscribe(val => {
  document.querySelector("#double").textContent = val;
});

store.subscribe("count", () => doubleCount.recompute());
document.getElementById("inc").addEventListener("click", () => store.count++);

// later, if needed
// unsubscribe();


