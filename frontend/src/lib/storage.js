export const readSavedJson = (key, fallback) => {
  try {
    const savedValue = localStorage.getItem(key);
    return savedValue ? JSON.parse(savedValue) : fallback;
  } catch {
    return fallback;
  }
};

export const normalizeEmail = (email) => email.trim().toLowerCase();

export const wishlistStorageKey = (email) => `fitai-wishlist:${normalizeEmail(email)}`;

export const cartStorageKey = (email) => `fitai-cart:${normalizeEmail(email)}`;

export const saveJson = (key, value) => {
  localStorage.setItem(key, JSON.stringify(value));
};
