export const setItemsInLocalStorage = (key, value) => {
  if (!key || !value) return;

  const valueToStore =
    typeof value !== 'string' ? JSON.stringify(value) : value;
  localStorage.setItem(key, valueToStore);
};

export const getItemFromLocalStorage = (key) => {
  if (!key) return null;
  return localStorage.getItem(key);
};

export const removeItemFromLocalStorage = (key) => {
  if (!key) return;
  localStorage.removeItem(key);
};
