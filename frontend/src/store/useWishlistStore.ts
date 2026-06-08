import { create } from 'zustand'

interface WishlistState {
  items: number[]; // product IDs
  toggleItem: (id: number) => Promise<boolean>; // returns true if added, false if removed
  hasItem: (id: number) => boolean;
  clearWishlist: () => void;
  fetchWishlistFromBackend: () => Promise<void>;
}

const syncWishlistToggle = async (productId: number) => {
  const token = localStorage.getItem('heelsup_token');
  if (!token) return null;
  try {
    const res = await fetch('/api/wishlist/toggle', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ product_id: productId })
    });
    const data = await res.json();
    return data.success ? data.data?.wishlisted : null;
  } catch (err) {
    console.error('Failed to sync wishlist toggle:', err);
    return null;
  }
};

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
    toggleItem: async (id) => {
      const current = get().items;
      const index = current.indexOf(id);
      const token = localStorage.getItem('heelsup_token');
      
      let added = false;
      if (token) {
        // Sync with backend if logged in
        const backendResult = await syncWishlistToggle(id);
        if (backendResult !== null) {
          added = backendResult;
          if (added) {
            saveWishlist([...current.filter(item => item !== id), id]);
          } else {
            saveWishlist(current.filter(item => item !== id));
          }
          return added;
        }
      }
      
      // Fallback or guest behavior (or if sync fails)
      if (index === -1) {
        saveWishlist([...current, id]);
        added = true;
      } else {
        saveWishlist(current.filter((item) => item !== id));
        added = false;
      }
      return added;
    },
    hasItem: (id) => {
      return get().items.includes(id);
    },
    clearWishlist: () => {
      saveWishlist([]);
    },
    fetchWishlistFromBackend: async () => {
      const token = localStorage.getItem('heelsup_token');
      if (!token) return;
      try {
        const res = await fetch('/api/wishlist/ids', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        if (data.success && data.data && Array.isArray(data.data.ids)) {
          saveWishlist(data.data.ids);
        }
      } catch (err) {
        console.error('Failed to fetch wishlist from backend:', err);
      }
    }
  };
});
