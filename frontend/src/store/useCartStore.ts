import { create } from 'zustand'

export interface CartItem {
  id: number;
  name: string;
  price: number; // in paise
  originalPrice?: number | null; // in paise
  qty: number;
  color: string;
  size: string;
  img: string;
  category: string;
}

interface CartState {
  items: CartItem[];
  addItem: (item: Omit<CartItem, 'qty'> & { qty?: number }) => void;
  removeItem: (id: number, color: string, size: string) => void;
  updateQty: (id: number, color: string, size: string, delta: number) => void;
  clearCart: () => void;
  getCartCount: () => number;
  getCartSubtotal: () => number; // in paise
  getCartTotal: () => number; // in paise
  fetchCartFromBackend: () => Promise<void>;
  syncCart: () => Promise<void>;
}

const syncCartToBackend = async (items: CartItem[]) => {
  const token = localStorage.getItem('heelsup_token');
  if (!token) return;
  try {
    await fetch('/api/cart/sync', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        items: items.map(item => ({
          product_id: item.id,
          size: item.size,
          color: item.color,
          qty: item.qty
        }))
      })
    });
  } catch (err) {
    console.error('Failed to sync cart to backend:', err);
  }
};

export const useCartStore = create<CartState>((set, get) => {
  const savedCart = localStorage.getItem('heelsup_cart');
  let initialItems: CartItem[] = [];
  if (savedCart) {
    try {
      initialItems = JSON.parse(savedCart);
    } catch {
      localStorage.removeItem('heelsup_cart');
    }
  }

  const saveCart = (items: CartItem[]) => {
    localStorage.setItem('heelsup_cart', JSON.stringify(items));
    set({ items });
    syncCartToBackend(items);
  };

  return {
    items: initialItems,
    addItem: (newItem) => {
      const currentItems = get().items;
      const qtyToAdd = newItem.qty || 1;
      
      const existingIndex = currentItems.findIndex(
        (item) =>
          item.id === newItem.id &&
          item.color.toLowerCase() === newItem.color.toLowerCase() &&
          item.size === newItem.size
      );

      let updated: CartItem[];
      if (existingIndex > -1) {
        updated = [...currentItems];
        updated[existingIndex].qty += qtyToAdd;
      } else {
        updated = [...currentItems, { ...newItem, qty: qtyToAdd }];
      }
      saveCart(updated);
    },
    removeItem: (id, color, size) => {
      const filtered = get().items.filter(
        (item) =>
          !(item.id === id &&
            item.color.toLowerCase() === color.toLowerCase() &&
            item.size === size)
      );
      saveCart(filtered);
    },
    updateQty: (id, color, size, delta) => {
      const updated = get().items
        .map((item) => {
          if (
            item.id === id &&
            item.color.toLowerCase() === color.toLowerCase() &&
            item.size === size
          ) {
            return { ...item, qty: Math.max(1, item.qty + delta) };
          }
          return item;
        })
        .filter((item) => item.qty > 0);
      saveCart(updated);
    },
    clearCart: () => {
      saveCart([]);
    },
    getCartCount: () => {
      return get().items.reduce((sum, item) => sum + item.qty, 0);
    },
    getCartSubtotal: () => {
      return get().items.reduce((sum, item) => sum + item.price * item.qty, 0);
    },
    getCartTotal: () => {
      return get().getCartSubtotal();
    },
    syncCart: async () => {
      await syncCartToBackend(get().items);
    },
    fetchCartFromBackend: async () => {
      const token = localStorage.getItem('heelsup_token');
      if (!token) return;
      try {
        const res = await fetch('/api/cart', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        if (data.success && data.data) {
          const items = data.data.map((item: any) => {
            let img = 'assets/placeholder.jpg';
            if (item.images_json) {
              try {
                const imgs = JSON.parse(item.images_json);
                if (imgs && imgs.length > 0) img = imgs[0];
              } catch {}
            }
            return {
              id: item.product_id,
              name: item.name,
              price: item.price,
              originalPrice: item.original_price,
              qty: item.qty,
              color: item.color || 'Default',
              size: item.size || '38',
              img: img,
              category: item.category || ''
            };
          });
          localStorage.setItem('heelsup_cart', JSON.stringify(items));
          set({ items });
        }
      } catch (err) {
        console.error('Failed to fetch cart from backend:', err);
      }
    }
  };
});
