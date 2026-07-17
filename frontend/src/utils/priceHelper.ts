// frontend/src/utils/priceHelper.ts
import { useCartStore } from '../store/useCartStore'

/**
 * Rounds a price in paise to end in either ₹49 or ₹99 in Rupees.
 * E.g., ₹928 -> ₹949, ₹976 -> ₹999.
 */
export function roundToProfessionalPrice(priceInPaise: number): number {
  const rupees = Math.ceil(priceInPaise / 100);
  const hundreds = Math.floor(rupees / 100);
  const remainder = rupees % 100;
  
  let roundedRupees = 0;
  if (remainder <= 49) {
    roundedRupees = hundreds * 100 + 49;
  } else {
    roundedRupees = hundreds * 100 + 99;
  }
  return roundedRupees * 100; // return in paise
}

/**
 * Custom hook to calculate location-adjusted product display prices.
 * If base price is >= ₹1599, shipping is free.
 * Otherwise, the shipping fee based on user location (or max fallback of ₹129) is added.
 * Reverts to base price if the global cart subtotal is >= ₹1599.
 * All display prices are rounded to end in 49 or 99.
 */
export function useDisplayPrice() {
  const shippingFeeRupees = useCartStore((state) => state.shippingFeeRupees);
  const items = useCartStore((state) => state.items);
  
  // Calculate cart base subtotal to check if free shipping threshold is met order-wide
  const baseSubtotal = items.reduce((sum, item) => sum + item.price * item.qty, 0);
  const isFreeGlobally = baseSubtotal >= 159900;

  const getDisplayPrice = (priceInPaise: number): number => {
    if (isFreeGlobally || priceInPaise >= 159900) {
      return roundToProfessionalPrice(priceInPaise);
    }
    const inclusive = priceInPaise + (shippingFeeRupees * 100);
    return roundToProfessionalPrice(inclusive);
  };

  const getOriginalDisplayPrice = (originalPriceInPaise: number | null | undefined, basePriceInPaise: number): number | null => {
    if (!originalPriceInPaise) return null;
    if (isFreeGlobally || basePriceInPaise >= 159900) {
      return roundToProfessionalPrice(originalPriceInPaise);
    }
    const inclusive = originalPriceInPaise + (shippingFeeRupees * 100);
    return roundToProfessionalPrice(inclusive);
  };

  return { getDisplayPrice, getOriginalDisplayPrice, shippingFeeRupees, isFreeGlobally };
}
