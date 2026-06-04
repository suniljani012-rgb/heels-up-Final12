import { create } from 'zustand'

interface WishlistState {
  items: number[]; // product IDs
  toggleItem: (id: number) => boolean; // returns true if added, false if removed
  hasItem: (id: number) => boolean;
  clearWishlist: () => void;
}

export const useWishlistStore = create<WishlistState>((set, get) => {
  const savedWishlist = localStorage.getItem('heelsup_wishlist');
  let initialItems: number[] = [];
  if (savedWishlist) {
    try {
      initialItems = JSON.parse(savedWishlist);
    } catch {
      localStorage.removeItem('heelsup_wishlist');
    }
  }

  const saveWishlist = (items: number[]) => {
    localStorage.setItem('heelsup_wishlist', JSON.stringify(items));
    set({ items });
  };

  return {
    items: initialItems,
    toggleItem: (id) => {
      const current = get().items;
      const index = current.indexOf(id);
      if (index === -1) {
        saveWishlist([...current, id]);
        return true; // Added
      } else {
        saveWishlist(current.filter((item) => item !== id));
        return false; // Removed
      }
    },
    hasItem: (id) => {
      return get().items.includes(id);
    },
    clearWishlist: () => {
      saveWishlist([]);
    },
  };
});
