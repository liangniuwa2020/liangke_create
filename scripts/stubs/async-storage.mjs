const store = new Map();

const api = {
  getItem: async (k) => (store.has(k) ? store.get(k) : null),
  setItem: async (k, v) => { store.set(k, v); },
  removeItem: async (k) => { store.delete(k); },
  getAllKeys: async () => Array.from(store.keys()),
  multiGet: async (keys) => keys.map((k) => [k, store.has(k) ? store.get(k) : null]),
  multiSet: async (pairs) => { pairs.forEach(([k, v]) => store.set(k, v)); },
  multiRemove: async (keys) => { keys.forEach((k) => store.delete(k)); },
  clear: async () => { store.clear(); },
  mergeItem: async (k, v) => { store.set(k, v); },
};

export default api;
