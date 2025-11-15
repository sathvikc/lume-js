import { state, bindDom } from "lume-js";
import { watch } from "lume-js/addons";

const store = state({ count: 0 });
bindDom(document.body, store);

watch(store, "count", val => console.log("Count changed:", val));

document.getElementById("inc").addEventListener("click", () => store.count++);
