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
}

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

      if (existingIndex > -1) {
        const updated = [...currentItems];
        updated[existingIndex].qty += qtyToAdd;
        saveCart(updated);
      } else {
        saveCart([...currentItems, { ...newItem, qty: qtyToAdd }]);
      }
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
      // For now total equals subtotal. If coupons or tax apply, they will compute here
      return get().getCartSubtotal();
    },
  };
});
