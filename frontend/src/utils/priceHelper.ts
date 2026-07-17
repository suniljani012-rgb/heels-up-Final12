// frontend/src/utils/priceHelper.ts
import { useCartStore } from '../store/useCartStore'

/**
 * Custom hook to calculate location-adjusted product display prices.
 * If base price is >= ₹1599, shipping is free.
 * Otherwise, the shipping fee based on user location (or max fallback of ₹129) is added.
 * Reverts to base price if the global cart subtotal is >= ₹1599.
 */
export function useDisplayPrice() {
  const shippingFeeRupees = useCartStore((state) => state.shippingFeeRupees);
  const items = useCartStore((state) => state.items);
  
  // Calculate cart base subtotal to check if free shipping threshold is met order-wide
  const baseSubtotal = items.reduce((sum, item) => sum + item.price * item.qty, 0);
  const isFreeGlobally = baseSubtotal >= 159900;

  const getDisplayPrice = (priceInPaise: number): number => {
    if (isFreeGlobally || priceInPaise >= 159900) {
      return priceInPaise;
    }
    return priceInPaise + (shippingFeeRupees * 100);
  };

  const getOriginalDisplayPrice = (originalPriceInPaise: number | null | undefined, basePriceInPaise: number): number | null => {
    if (!originalPriceInPaise) return null;
    if (isFreeGlobally || basePriceInPaise >= 159900) {
      return originalPriceInPaise;
    }
    return originalPriceInPaise + (shippingFeeRupees * 100);
  };

  return { getDisplayPrice, getOriginalDisplayPrice, shippingFeeRupees, isFreeGlobally };
}
