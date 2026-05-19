export interface CartItem {
  id: string;
  name: string;
  subtitle: string;
  priceSar: number;
  currency: string;
  quantity: number;
}

const STORAGE_KEY = "revo.cart.v1";
const CART_EVENT = "revo-cart-updated";
const COUPON_STORAGE_KEY = "revo.coupon.v1";

function canUseStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function readCart(): CartItem[] {
  if (!canUseStorage()) return [];

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];

    return parsed.filter((item): item is CartItem => {
      if (!item || typeof item !== "object") return false;
      const candidate = item as Partial<CartItem>;
      return (
        typeof candidate.id === "string" &&
        typeof candidate.name === "string" &&
        typeof candidate.subtitle === "string" &&
        typeof candidate.priceSar === "number" &&
        typeof candidate.currency === "string" &&
        typeof candidate.quantity === "number"
      );
    });
  } catch {
    return [];
  }
}

function writeCart(cart: CartItem[]) {
  if (!canUseStorage()) return;

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(cart));
  window.dispatchEvent(new Event(CART_EVENT));
}

export function getCartItems() {
  return readCart();
}

export function getCartCount() {
  return readCart().reduce((sum, item) => sum + item.quantity, 0);
}

export function addToCart(item: Omit<CartItem, "quantity">) {
  const current = readCart();
  const existing = current.find((entry) => entry.id === item.id);

  if (existing) {
    existing.quantity += 1;
  } else {
    current.push({ ...item, quantity: 1 });
  }

  writeCart(current);
}

export function updateCartItemQuantity(itemId: string, quantity: number) {
  const current = readCart();
  const normalized = Math.max(0, Math.floor(quantity));
  const next = current
    .map((item) => (item.id === itemId ? { ...item, quantity: normalized } : item))
    .filter((item) => item.quantity > 0);

  writeCart(next);
}

export function removeCartItem(itemId: string) {
  const current = readCart();
  writeCart(current.filter((item) => item.id !== itemId));
}

export function clearCart() {
  writeCart([]);
}

export function getSelectedCouponCode() {
  if (!canUseStorage()) return "";
  return window.localStorage.getItem(COUPON_STORAGE_KEY) ?? "";
}

export function setSelectedCouponCode(code: string) {
  if (!canUseStorage()) return;
  const normalized = code.trim().toUpperCase();
  if (!normalized) {
    window.localStorage.removeItem(COUPON_STORAGE_KEY);
  } else {
    window.localStorage.setItem(COUPON_STORAGE_KEY, normalized);
  }
  window.dispatchEvent(new Event(CART_EVENT));
}

export function clearSelectedCouponCode() {
  if (!canUseStorage()) return;
  window.localStorage.removeItem(COUPON_STORAGE_KEY);
  window.dispatchEvent(new Event(CART_EVENT));
}

export function subscribeCartUpdates(onUpdate: () => void) {
  const handleStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY) onUpdate();
  };

  window.addEventListener(CART_EVENT, onUpdate);
  window.addEventListener("storage", handleStorage);

  return () => {
    window.removeEventListener(CART_EVENT, onUpdate);
    window.removeEventListener("storage", handleStorage);
  };
}
