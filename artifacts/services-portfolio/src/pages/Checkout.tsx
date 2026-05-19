import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useLocation } from "wouter";
import { ArrowRight, CheckCircle2, FileText, ImageIcon, Upload, X } from "lucide-react";
import PublicHeader from "@/components/store/PublicHeader";
import StoreBreadcrumbs from "@/components/store/StoreBreadcrumbs";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import AuthModal from "@/components/AuthModal";
import { RatingSubmitForm } from "@/components/RatingSubmitForm";
import {
  CartItem,
  clearCart,
  clearSelectedCouponCode,
  getCartItems,
  getSelectedCouponCode,
  subscribeCartUpdates,
} from "@/lib/cart";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

interface StoreSettings {
  bank_name: string | null;
  beneficiary_name: string | null;
  iban: string | null;
  account_number: string | null;
  currency?: string | null;
}

interface CouponValidation {
  code: string;
  discountSar: number;
}

export default function Checkout() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { customer, loading: authLoading, refetch } = useAuth();

  const [items, setItems] = useState<CartItem[]>([]);
  const [cartReady, setCartReady] = useState(false);
  const [checkoutReady, setCheckoutReady] = useState(false);
  const [settings, setSettings] = useState<StoreSettings | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [loadingSubmit, setLoadingSubmit] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [orderId, setOrderId] = useState<number | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState<CouponValidation | null>(null);

  useEffect(() => {
    const sync = () => {
      const cartItems = getCartItems();
      setItems(cartItems);
      setCartReady(true);
    };

    sync();
    return subscribeCartUpdates(sync);
  }, []);

  useEffect(() => {
    void (async () => {
      setCheckoutReady(false);
      try {
        const [settingsRes, couponCode] = await Promise.all([
          fetch(`${BASE}/api/store/settings`),
          Promise.resolve(getSelectedCouponCode()),
        ]);

        if (settingsRes.ok) {
          const data = await settingsRes.json() as { settings?: StoreSettings | null };
          setSettings(data.settings ?? null);
        }

        if (couponCode) {
          const couponRes = await fetch(`${BASE}/api/store/coupons/validate`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ code: couponCode }),
          });

          if (couponRes.ok) {
            const couponData = await couponRes.json() as {
              coupon?: { code: string; discountSar: number };
            };

            if (couponData.coupon) {
              setAppliedCoupon({
                code: couponData.coupon.code,
                discountSar: Number(couponData.coupon.discountSar || 0),
              });
            }
          } else {
            clearSelectedCouponCode();
          }
        }
      } catch {
        // Keep checkout usable even if API calls fail temporarily.
      } finally {
        setCheckoutReady(true);
      }
    })();
  }, []);

  const currency = settings?.currency || items[0]?.currency || "SAR";

  const priceSummary = useMemo(() => {
    const base = items.reduce((sum, item) => sum + item.priceSar * item.quantity, 0);
    const discount = Math.min(appliedCoupon?.discountSar ?? 0, base);
    const final = Math.max(0, base - discount);
    return { base, discount, final };
  }, [items, appliedCoupon]);

  const hasBankDetails = Boolean(settings?.bank_name && settings?.beneficiary_name && settings?.iban && settings?.account_number);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const picked = event.target.files?.[0];
    if (!picked) return;

    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "application/pdf"];
    if (!allowedTypes.includes(picked.type)) {
      toast({ title: "نوع الملف غير مدعوم", description: "يرجى رفع صورة أو PDF", variant: "destructive" });
      return;
    }

    if (picked.size > 10 * 1024 * 1024) {
      toast({ title: "الملف كبير جداً", description: "الحد الأقصى 10 ميغابايت", variant: "destructive" });
      return;
    }

    setFile(picked);
  };

  const submitOrder = async () => {
    if (items.length === 0) {
      toast({ title: "السلة فارغة", variant: "destructive" });
      return;
    }

    if (!file) {
      toast({ title: "إيصال التحويل مطلوب", variant: "destructive" });
      return;
    }

    if (!customer) {
      setShowAuthModal(true);
      return;
    }

    setLoadingSubmit(true);
    try {
      const selectedCouponCode = getSelectedCouponCode();

      const formData = new FormData();
      formData.append(
        "items",
        JSON.stringify(items.map((i) => ({ packageId: i.id, quantity: Math.max(1, i.quantity) }))),
      );
      formData.append("customerName", customer.fullName);
      if (selectedCouponCode) {
        formData.append("couponCode", selectedCouponCode);
      }
      formData.append("receipt", file);

      const res = await fetch(`${BASE}/api/orders`, {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      const data = await res.json() as { error?: string; orderId?: number };
      if (!res.ok) {
        throw new Error(data.error || "تعذر إرسال الطلب");
      }

      clearCart();
      clearSelectedCouponCode();
      setOrderId(data.orderId ?? null);
      setSubmitted(true);
    } catch (err) {
      toast({ title: err instanceof Error ? err.message : "حدث خطأ", variant: "destructive" });
    } finally {
      setLoadingSubmit(false);
    }
  };

  if (authLoading || !cartReady || !checkoutReady) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (items.length === 0 && !submitted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4" dir="rtl">
        <PublicHeader />
        <div className="glass-panel rounded-3xl p-10 text-center max-w-md w-full">
          <h2 className="text-2xl font-black mb-3">لا توجد عناصر في السلة</h2>
          <p className="text-white/50 mb-6">أضف باقة أولاً ثم أكمل إلى صفحة الدفع.</p>
          <Button onClick={() => navigate("/")} className="rounded-full bg-gradient-to-r from-primary to-secondary text-white px-8">
            العودة للرئيسية
          </Button>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4" dir="rtl">
        <PublicHeader />
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full glass-panel p-10 rounded-3xl"
        >
          <div className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-10 h-10 text-green-400" />
          </div>
          <h2 className="text-2xl font-bold mb-3 text-center">تم استلام طلب الدفع</h2>
          <p className="text-white/60 mb-8 text-center">تم إرسال طلبك بنجاح وسيتم مراجعته قريبًا.</p>
          
          {/* Rating Form */}
          {orderId && (
            <div className="mb-6">
              <RatingSubmitForm 
                orderId={orderId}
                onSuccess={() => {
                  // Optionally navigate after rating
                }}
              />
            </div>
          )}

          <div className="flex flex-col gap-3">
            <Button onClick={() => navigate("/dashboard")} className="rounded-full bg-gradient-to-r from-primary to-secondary text-white">
              عرض طلباتي
            </Button>
            <Button onClick={() => navigate("/")} variant="outline" className="rounded-full border-white/15 text-white/70 hover:bg-white/5">
              العودة للرئيسية
            </Button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <PublicHeader
        menuItems={[
          { label: "الرئيسية", onClick: () => navigate("/") },
          { label: "المنتجات", onClick: () => navigate("/products") },
          { label: "السلة", onClick: () => navigate("/cart") },
        ]}
      />

      <StoreBreadcrumbs
        items={[
          { label: "الرئيسية", href: "/" },
          { label: "سلة المشتريات", href: "/cart" },
          { label: "إتمام الدفع" },
        ]}
        theme="dark"
      />

      {showAuthModal && (
        <AuthModal
          packageName="كل عناصر السلة"
          onClose={() => setShowAuthModal(false)}
          onSuccess={() => {
            setShowAuthModal(false);
            refetch();
            void submitOrder();
          }}
        />
      )}

      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-0 right-0 w-[640px] h-[320px] rounded-full bg-primary/10 blur-[100px]" />
        <div className="absolute bottom-0 left-0 w-[460px] h-[260px] rounded-full bg-secondary/10 blur-[100px]" />
      </div>

      <section className="relative z-10 mx-auto mt-6 max-w-6xl px-4 md:mt-8 md:px-6">
        <div className="rounded-3xl border border-white/10 bg-[linear-gradient(120deg,rgba(124,58,237,0.14),rgba(59,130,246,0.12),rgba(15,23,42,0.4))] px-5 py-5 shadow-[0_10px_35px_rgba(7,11,28,0.4)] md:px-7">
          <h1 className="text-xl font-black text-white md:text-2xl">إتمام الدفع بخطوات واضحة</h1>
          <p className="mt-2 text-sm leading-7 text-white/65 md:text-[0.95rem]">ارفع الإيصال وأكمل الطلب بسرعة مع عرض تفصيلي للمبلغ النهائي.</p>
        </div>
      </section>

      <main className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 py-6 grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6">
        <section className="rounded-3xl border border-white/10 bg-[linear-gradient(180deg,rgba(30,38,80,0.72),rgba(22,12,44,0.82))] p-6 shadow-[0_14px_34px_rgba(9,12,31,0.42)]">
          <div className="mb-5 flex items-start justify-between gap-4">
            <div>
              <h1 className="text-xl font-black">تفاصيل الدفع</h1>
              <p className="mt-1 text-xs text-white/45">طريقة الدفع: تحويل بنكي فقط</p>
            </div>
            <button onClick={() => navigate("/cart")} className="flex items-center gap-2 text-white/70 transition-colors hover:text-white">
              <ArrowRight className="h-4 w-4" />
              الرجوع إلى السلة
            </button>
          </div>

          <div className="space-y-4 mb-6">
            <label className="text-sm text-white/70 block">العناصر المطلوبة من السلة</label>
            <div className="space-y-2 rounded-2xl border border-white/10 bg-white/5 p-3">
              {items.map((item) => (
                <div key={item.id} className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-black/10 px-3 py-2 text-sm">
                  <div className="min-w-0">
                    <p className="font-semibold truncate">{item.name}</p>
                    <p className="text-white/50 text-xs">الكمية: {item.quantity}</p>
                  </div>
                  <span className="font-bold text-primary">{item.priceSar * item.quantity} {item.currency}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-yellow-500/20 bg-yellow-500/5 p-4 mb-6">
            <h3 className="font-semibold mb-3">بيانات التحويل البنكي</h3>
            {!hasBankDetails && (
              <p className="text-amber-200 text-sm mb-3">لم يتم استكمال بيانات التحويل من لوحة الإدارة بعد.</p>
            )}
            <div className="space-y-2 text-sm">
              <div className="flex justify-between gap-3"><span className="text-white/50">البنك</span><span>{settings?.bank_name || "غير متوفر"}</span></div>
              <div className="flex justify-between gap-3"><span className="text-white/50">اسم المستفيد</span><span>{settings?.beneficiary_name || "غير متوفر"}</span></div>
              <div className="flex justify-between gap-3"><span className="text-white/50">الآيبان</span><span className="font-mono text-xs sm:text-sm">{settings?.iban || "غير متوفر"}</span></div>
              <div className="flex justify-between gap-3"><span className="text-white/50">رقم الحساب</span><span className="font-mono text-xs sm:text-sm">{settings?.account_number || "غير متوفر"}</span></div>
            </div>
          </div>

          <div className="space-y-2 mb-4">
            <label className="text-sm font-semibold text-white/70 block">إيصال التحويل</label>
            <input
              type="file"
              accept="image/jpeg,image/jpg,image/png,application/pdf"
              onChange={handleFileChange}
              className="hidden"
              id="checkout-receipt-upload"
            />
            {file ? (
              <div className="flex items-center justify-between gap-3 p-4 rounded-xl bg-white/5 border border-primary/30">
                <div className="flex items-center gap-3 min-w-0">
                  {file.type === "application/pdf" ? <FileText className="w-5 h-5 text-primary shrink-0" /> : <ImageIcon className="w-5 h-5 text-primary shrink-0" />}
                  <span className="text-sm text-white/80 truncate">{file.name}</span>
                </div>
                <button type="button" onClick={() => setFile(null)} className="text-white/40 hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <label htmlFor="checkout-receipt-upload" className="flex flex-col items-center justify-center gap-3 p-8 rounded-xl border-2 border-dashed border-white/15 hover:border-primary/50 cursor-pointer transition-colors group">
                <Upload className="w-8 h-8 text-white/30 group-hover:text-primary transition-colors" />
                <div className="text-center">
                  <p className="text-sm font-medium text-white/60">اضغط لرفع إيصال التحويل</p>
                  <p className="text-xs text-white/30 mt-1">JPG / PNG / PDF حتى 10MB</p>
                </div>
              </label>
            )}
          </div>
        </section>

        <aside className="rounded-3xl border border-white/10 bg-[linear-gradient(180deg,rgba(30,38,80,0.72),rgba(22,12,44,0.82))] p-6 h-fit sticky top-24 shadow-[0_14px_34px_rgba(9,12,31,0.42)]">
          <h2 className="text-lg font-black mb-4">ملخص الدفع</h2>
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between text-white/70">
              <span>سعر الباقة</span>
              <span>{priceSummary.base} {currency}</span>
            </div>
            {priceSummary.discount > 0 && appliedCoupon && (
              <div className="flex items-center justify-between text-green-300">
                <span>خصم الكوبون ({appliedCoupon.code})</span>
                <span>-{priceSummary.discount} {currency}</span>
              </div>
            )}
            <div className="h-px bg-white/10 my-2" />
            <div className="flex items-center justify-between text-base font-black">
              <span>الإجمالي النهائي</span>
              <span className="text-primary">{priceSummary.final} {currency}</span>
            </div>
          </div>

          {!customer && (
            <p className="mt-4 text-xs text-amber-200/90 leading-6">
              سيتم طلب تسجيل الدخول قبل إرسال الطلب.
            </p>
          )}

          <Button
            onClick={() => void submitOrder()}
            disabled={loadingSubmit || items.length === 0}
            className="w-full mt-6 h-12 rounded-xl bg-gradient-to-r from-primary to-secondary text-white font-bold"
          >
            {loadingSubmit ? "جاري إرسال الطلب..." : "تأكيد الدفع وإرسال الطلب"}
          </Button>
        </aside>
      </main>
    </div>
  );
}
