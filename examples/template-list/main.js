import { state, bindDom } from 'lume-js';
import { repeat } from 'lume-js/addons';

let nextId = 4;

const store = state({
  people: [
    { id: 1, name: 'Ada',   address: { city: 'London' } },
    { id: 2, name: 'Grace', address: { city: 'New York' } },
    { id: 3, name: 'Edsger', address: { city: 'Rotterdam' } },
  ],
  newName: '',
  newCity: '',
  selected: null,
});

bindDom(document.body, store);

// The entire list: structure comes from the <template>, data from each item.
repeat('#people', store, 'people', {
  key: p => p.id,
  template: true,
  // Moves the 'selected' class between two rows when store.selected changes
  select: { key: 'selected' },
  // create is only needed for behavior (select, remove) — not structure
  create: (p, el) => {
    el.addEventListener('click', () => { store.selected = p.id; });
    el.querySelector('.remove').addEventListener('click', (e) => {
      e.stopPropagation();
      store.people = store.people.filter(x => x.id !== p.id);
    });
  },
});

document.getElementById('add').addEventListener('click', () => {
  if (!store.newName.trim()) return;
  store.people = [
    ...store.people,
    { id: nextId++, name: store.newName.trim(), address: { city: store.newCity.trim() || '—' } },
  ];
  store.newName = '';
  store.newCity = '';
});

document.getElementById('shuffle').addEventListener('click', () => {
  store.people = [...store.people].sort(() => Math.random() - 0.5);
});
