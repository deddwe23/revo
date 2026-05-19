import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useLocation } from "wouter";
import { ArrowRight, Minus, Plus, ShoppingCart, TicketPercent, Trash2, X } from "lucide-react";
import PublicHeader from "@/components/store/PublicHeader";
import StoreBreadcrumbs from "@/components/store/StoreBreadcrumbs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import {
  CartItem,
  clearSelectedCouponCode,
  clearCart,
  getCartItems,
  getSelectedCouponCode,
  removeCartItem,
  setSelectedCouponCode,
  subscribeCartUpdates,
  updateCartItemQuantity,
} from "@/lib/cart";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

interface AppliedCoupon {
  code: string;
  discountSar: number;
  remainingUses: number;
}

export default function Cart() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [items, setItems] = useState<CartItem[]>([]);
  const [couponInput, setCouponInput] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<AppliedCoupon | null>(null);
  const [applyingCoupon, setApplyingCoupon] = useState(false);

  useEffect(() => {
    const sync = () => setItems(getCartItems());
    sync();
    return subscribeCartUpdates(sync);
  }, []);

  useEffect(() => {
    const persistedCode = getSelectedCouponCode();
    if (!persistedCode) return;

    setCouponInput(persistedCode);

    void (async () => {
      try {
        const res = await fetch(`${BASE}/api/store/coupons/validate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code: persistedCode }),
        });

        if (!res.ok) {
          clearSelectedCouponCode();
          setAppliedCoupon(null);
          return;
        }

        const data = await res.json() as {
          coupon?: { code: string; discountSar: number; remainingUses: number };
        };

        if (data.coupon) {
          setAppliedCoupon({
            code: data.coupon.code,
            discountSar: Number(data.coupon.discountSar || 0),
            remainingUses: Number(data.coupon.remainingUses || 0),
          });
        }
      } catch {
        // Keep cart usable if coupon validation is temporarily unavailable.
      }
    })();
  }, []);

  const handleApplyCoupon = async () => {
    const normalizedCode = couponInput.trim().toUpperCase();
    if (!normalizedCode) {
      toast({ title: "أدخل رمز الكوبون", variant: "destructive" });
      return;
    }

    setApplyingCoupon(true);
    try {
      const res = await fetch(`${BASE}/api/store/coupons/validate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: normalizedCode }),
      });

      const data = await res.json() as {
        error?: string;
        coupon?: { code: string; discountSar: number; remainingUses: number };
      };

      if (!res.ok || !data.coupon) {
        throw new Error(data.error || "الكوبون غير صالح");
      }

      const coupon = {
        code: data.coupon.code,
        discountSar: Number(data.coupon.discountSar || 0),
        remainingUses: Number(data.coupon.remainingUses || 0),
      };

      setAppliedCoupon(coupon);
      setCouponInput(coupon.code);
      setSelectedCouponCode(coupon.code);

      toast({ title: "تم تفعيل الكوبون", description: `خصم ${coupon.discountSar} SAR` });
    } catch (err) {
      setAppliedCoupon(null);
      clearSelectedCouponCode();
      toast({ title: err instanceof Error ? err.message : "تعذر تطبيق الكوبون", variant: "destructive" });
    } finally {
      setApplyingCoupon(false);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponInput("");
    clearSelectedCouponCode();
  };

  const totals = useMemo(() => {
    const subtotal = items.reduce((sum, item) => sum + item.priceSar * item.quantity, 0);
    const discount = Math.min(appliedCoupon?.discountSar ?? 0, subtotal);
    const total = Math.max(0, subtotal - discount);
    return { subtotal, discount, total };
  }, [items, appliedCoupon]);

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <PublicHeader
        menuItems={[
          { label: "الرئيسية", onClick: () => navigate("/") },
          { label: "المنتجات", onClick: () => navigate("/products") },
          { label: "إتمام الدفع", onClick: () => navigate("/checkout") },
        ]}
      />

	  <StoreBreadcrumbs
		items={[
		  { label: "الرئيسية", href: "/" },
		  { label: "سلة المشتريات" },
		]}
    theme="dark"
	  />

      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute -top-24 right-0 w-[500px] h-[300px] rounded-full bg-primary/15 blur-[100px]" />
        <div className="absolute bottom-0 left-0 w-[420px] h-[260px] rounded-full bg-secondary/15 blur-[100px]" />
      </div>

      <section className="relative z-10 mx-auto mt-6 max-w-6xl px-4 md:mt-8 md:px-6">
        <div className="rounded-3xl border border-white/10 bg-[linear-gradient(120deg,rgba(124,58,237,0.14),rgba(59,130,246,0.12),rgba(15,23,42,0.4))] px-5 py-5 shadow-[0_10px_35px_rgba(7,11,28,0.4)] md:px-7">
          <h1 className="text-xl font-black text-white md:text-2xl">سلة ذكية بخطوة واحدة للدفع</h1>
          <p className="mt-2 text-sm leading-7 text-white/65 md:text-[0.95rem]">راجع العناصر، فعّل الكوبون، ثم انتقل للدفع بنفس تجربة بصرية متناسقة.</p>
        </div>
      </section>

      <main className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 py-6 grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6">
        <section className="rounded-3xl border border-white/10 bg-[linear-gradient(180deg,rgba(30,38,80,0.72),rgba(22,12,44,0.82))] overflow-hidden shadow-[0_14px_34px_rgba(9,12,31,0.42)]">
          <div className="flex items-center justify-between border-b border-white/10 p-5">
            <div>
              <h1 className="text-lg font-black">سلة المشتريات</h1>
              <p className="mt-1 text-sm text-white/70">{items.length} عنصر في السلة</p>
            </div>
            <Button
              variant="outline"
              onClick={clearCart}
              disabled={items.length === 0}
              className="border-white/15 text-white/70 hover:bg-white/5"
            >
              تفريغ السلة
            </Button>
          </div>

          {items.length === 0 ? (
            <div className="p-12 text-center">
              <ShoppingCart className="w-12 h-12 mx-auto text-white/20 mb-4" />
              <h2 className="text-xl font-bold mb-2">سلتك فارغة</h2>
              <p className="text-white/50 mb-6">أضف باقة من الصفحة الرئيسية للمتابعة</p>
              <Button onClick={() => navigate("/")} className="rounded-full bg-gradient-to-r from-primary to-secondary text-white px-8">
                تصفح الباقات
              </Button>
            </div>
          ) : (
            <div className="divide-y divide-white/10">
              {items.map((item, index) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.04 }}
                  className="p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center gap-4"
                >
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-lg truncate">{item.name}</h3>
                    <p className="text-white/50 text-sm truncate">{item.subtitle}</p>
                    <button
                      onClick={() => navigate(`/package/${item.id}`)}
                      className="mt-2 text-primary text-sm hover:underline"
                    >
                      فتح صفحة الباقة
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => updateCartItemQuantity(item.id, item.quantity - 1)}
                      className={`w-9 h-9 rounded-xl border flex items-center justify-center transition-colors ${item.quantity === 1 ? "border-red-500/40 bg-red-500/10 hover:bg-red-500/20 text-red-400" : "border-white/15 bg-white/5 hover:bg-white/10"}`}
                      aria-label={item.quantity === 1 ? "حذف العنصر" : "إنقاص الكمية"}
                      title={item.quantity === 1 ? "سيتم حذف العنصر من السلة" : undefined}
                    >
                      {item.quantity === 1 ? <Trash2 className="w-4 h-4" /> : <Minus className="w-4 h-4" />}
                    </button>
                    <span className="min-w-8 text-center font-bold">{item.quantity}</span>
                    <button
                      onClick={() => updateCartItemQuantity(item.id, item.quantity + 1)}
                      className="w-9 h-9 rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 flex items-center justify-center"
                      aria-label="زيادة الكمية"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="text-left sm:min-w-28">
                    <p className="text-primary font-black text-xl">{item.priceSar * item.quantity}</p>
                    <p className="text-white/50 text-xs">{item.currency}</p>
                  </div>

                  <button
                    onClick={() => removeCartItem(item.id)}
                    className="w-9 h-9 rounded-xl border border-red-500/30 text-red-400 hover:bg-red-500/15 flex items-center justify-center"
                    aria-label="حذف العنصر"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </motion.div>
              ))}
            </div>
          )}
        </section>

        <aside className="rounded-3xl border border-white/10 bg-[linear-gradient(180deg,rgba(30,38,80,0.72),rgba(22,12,44,0.82))] p-6 h-fit sticky top-24 shadow-[0_14px_34px_rgba(9,12,31,0.42)]">
          <h2 className="text-lg font-black mb-5">ملخص الطلب</h2>

          <div className="mb-5 rounded-2xl border border-white/10 bg-white/5 p-3">
            <div className="flex items-center gap-2 mb-2 text-sm text-white/80">
              <TicketPercent className="w-4 h-4 text-primary" />
              إضافة كوبون خصم
            </div>
            <div className="flex gap-2">
              <Input
                value={couponInput}
                onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                placeholder="مثال: REVO50"
                className="bg-black/20 border-white/15 h-10"
              />
              <Button
                type="button"
                onClick={() => void handleApplyCoupon()}
                disabled={applyingCoupon || items.length === 0}
                className="h-10 px-4 rounded-xl bg-primary hover:bg-primary/90 text-white"
              >
                تطبيق
              </Button>
            </div>
            {appliedCoupon && (
              <div className="mt-3 flex items-center justify-between rounded-xl border border-green-500/30 bg-green-500/10 px-3 py-2 text-sm">
                <div>
                  <p className="text-green-300 font-semibold">{appliedCoupon.code}</p>
                  <p className="text-green-200/80 text-xs">خصم {appliedCoupon.discountSar} SAR</p>
                </div>
                <button
                  onClick={handleRemoveCoupon}
                  className="w-7 h-7 rounded-lg border border-green-500/30 text-green-300 hover:bg-green-500/10 flex items-center justify-center"
                  aria-label="إزالة الكوبون"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          <div className="space-y-3 text-sm">
            <div className="flex items-center justify-between text-white/70">
              <span>المجموع</span>
              <span>{totals.subtotal} SAR</span>
            </div>
            {totals.discount > 0 && (
              <div className="flex items-center justify-between text-green-300">
                <span>خصم الكوبون</span>
                <span>-{totals.discount} SAR</span>
              </div>
            )}
            <div className="h-px bg-white/10 my-2" />
            <div className="flex items-center justify-between text-base font-black">
              <span>الإجمالي</span>
              <span className="text-primary">{totals.total} SAR</span>
            </div>
          </div>

          <p className="mt-5 text-xs text-white/50 leading-6">
            أضف المنتجات للسلة ثم انتقل لصفحة الدفع لرفع إيصال التحويل البنكي.
          </p>

          <Button
            onClick={() => {
              if (items.length === 0) {
                navigate("/");
                return;
              }
              navigate("/checkout");
            }}
            className="w-full mt-6 h-12 rounded-xl bg-gradient-to-r from-primary to-secondary text-white font-bold"
            disabled={items.length === 0}
          >
            متابعة إلى الدفع
          </Button>
        </aside>
      </main>
    </div>
  );
}
