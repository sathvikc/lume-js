export function state(obj) {
  const listeners = {};

  function notify(key, val) {
    if (listeners[key]) listeners[key].forEach(fn => fn(val));
  }

  const proxy = new Proxy(obj, {
    get(target, key) {
      return target[key];
    },
    set(target, key, value) {
      target[key] = value;
      notify(key, value);
      return true;
    }
  });

  proxy.$subscribe = (key, fn) => {
    if (!listeners[key]) listeners[key] = [];
    listeners[key].push(fn);
    // initialize
    fn(proxy[key]);
  };

  return proxy;
}

// Zero-runtime data-bind init
export function bindDom(root, store) {
  const nodes = root.querySelectorAll("[data-bind]");
  nodes.forEach(el => {
    const path = el.getAttribute("data-bind").split(".");
    const lastKey = path.pop();

    let target = store;
    for (const key of path) {
      target = target[key]; // must be wrapped with state()
    }

    // subscribe once
    target.$subscribe(lastKey, val => {
      if (el.tagName === "INPUT" || el.tagName === "TEXTAREA") el.value = val;
      else el.textContent = val;
    });

    // 2-way binding for inputs
    if (el.tagName === "INPUT" || el.tagName === "TEXTAREA") {
      el.addEventListener("input", e => target[lastKey] = e.target.value);
    }
  });
}
