/** Defer property access so existing storage readers can catch a browser denial. */
export const browserStorage: Pick<Storage, 'getItem' | 'setItem'> = {
  getItem: (key) => window.localStorage.getItem(key),
  setItem: (key, value) => window.localStorage.setItem(key, value),
};
