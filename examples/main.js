import { state, bindDom } from "lume-js";

const store = state({
  count: 0,
  user: state({
    name: "Alice"
  })
});

bindDom(document.body, store);

document.getElementById("inc").addEventListener("click", () => {
  store.count++;
});

document.getElementById("changeName").addEventListener("click", () => {
  store.user.name = store.user.name === "Alice" ? "Bob" : "Alice";
});
