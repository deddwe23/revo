import { useEffect, useState } from "react";
import { useParams, useLocation } from "wouter";
import { ChevronLeft, ArrowRight, LayoutDashboard, TerminalSquare, Send } from "lucide-react";
import PublicHeader from "@/components/store/PublicHeader";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { addToCart } from "@/lib/cart";
import { products, categories } from "@/data/products";

const WHATSAPP_NUMBER = "966533170903";

export default function ProductDetail() {
  const params = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { customer } = useAuth();
  const [showMore, setShowMore] = useState(false);

  const product = products.find((item) => item.id === Number(params.id));

  const whatsappNumber = WHATSAPP_NUMBER;
  const storeName = "REVO | ريفو";
  const supportEmail = null;
  const tiktokUrl = "https://tiktok.com/@studiodotcode";
  const instagramUrl = "https://instagram.com/studiodotcode";
  const currency = "SAR";

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
    setShowMore(false);
  }, [params.id]);

  if (!product) {
    return (
      <div className="min-h-screen bg-[#09070f] flex items-center justify-center" dir="rtl">
        <div className="text-center">
          <p className="text-white/20 text-8xl font-mono mb-4">404</p>
          <p className="text-white/40 mb-6">الخدمة غير موجودة</p>
          <button
            onClick={() => navigate("/")}
            className="px-6 py-3 rounded-3xl bg-gradient-to-r from-primary to-secondary text-white font-bold"
          >
            العودة للرئيسية
          </button>
        </div>
      </div>
    );
  }

  const description = `${product.description} تشمل الخدمة ${product.features.join("، ")}، وتقدم حلًا متكاملًا ومنظمًا يناسب احتياجاتك الرقمية مع تجربة مستخدم سلسة وقابلة للتطوير.`;

  const handleAddToCart = () => {
    addToCart({
      id: String(product.id),
      name: product.name,
      subtitle: product.nameEn,
      priceSar: product.price,
      currency,
    });
    toast({ title: "تمت إضافة المنتج إلى السلة", description: product.name });
  };

  const handleBuyNow = () => {
    addToCart({
      id: String(product.id),
      name: product.name,
      subtitle: product.nameEn,
      priceSar: product.price,
      currency,
    });
    navigate("/checkout");
  };

  return (
    <div className="min-h-screen bg-[#09070f] text-white" dir="rtl">
      <PublicHeader
        menuItems={[
          { label: "الرئيسية", onClick: () => navigate("/") },
          { label: "المنتجات", onClick: () => navigate("/products") },
          ...(customer ? [{ label: "طلباتي", onClick: () => navigate("/dashboard") }] : []),
        ]}
      />

      <main className="w-full max-w-full mx-auto px-4 sm:px-6 py-10">
        <div className="mb-6 flex flex-col items-center gap-4">
          <nav className="inline-flex items-center gap-3 text-sm text-white/80">
            <button
              onClick={() => navigate("/")}
              className="text-sm text-white/80 hover:text-white transition"
            >
              الرئيسية
            </button>
            <ChevronLeft className="w-4 h-4 text-white/50" />
            <button
              onClick={() => navigate("/products")}
              className="text-sm text-white/80 hover:text-white transition"
            >
              المنتجات
            </button>
            <ChevronLeft className="w-4 h-4 text-white/50" />
            <span className="text-sm text-white/60">{product.name}</span>
          </nav>
        </div>

        <div className="overflow-hidden rounded-[2rem] bg-slate-950 border border-white/10 shadow-[0_30px_90px_rgba(0,0,0,0.35)] min-h-[calc(100vh-6rem)]">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center w-full max-w-full">
            <div className="p-8 flex items-center justify-center">
              <div className="relative w-full max-w-[36rem] aspect-square flex items-center justify-center rounded-[2rem] border border-white/10 bg-gradient-to-br from-slate-900 to-slate-800 overflow-hidden">
                <div className="text-center px-6">
                  <div className="mx-auto mb-4 h-24 w-24 rounded-[1.75rem] bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-5xl shadow-xl shadow-primary/20">
                    {product.icon}
                  </div>
                  <p className="text-sm text-white/60">صورة الخدمة</p>
                </div>
              </div>
            </div>

            <div className="px-6 py-8 sm:px-10 sm:py-10 flex flex-col justify-center items-center text-center">
              <div className="space-y-6 w-full max-w-3xl mx-auto">
                <div className="flex flex-col gap-2 items-center text-center">
                  <h2 className="text-3xl font-black">{product.name}</h2>
                  <p className="text-white/60 text-sm">{product.nameEn}</p>
                </div>

                <div className="inline-flex items-baseline justify-center gap-2 rounded-3xl bg-white/5 px-5 py-3 mx-auto">
                  <span className="text-3xl font-black text-secondary">{product.price.toLocaleString("ar")}</span>
                  <span className="text-sm text-white/60">{currency}</span>
                </div>

                <div className="space-y-4">
                  <div className={`relative mx-auto w-full max-w-3xl overflow-hidden rounded-3xl border border-white/10 bg-slate-950/90 p-5 transition-all duration-300 ${showMore ? "max-h-[900px]" : "max-h-[180px]"}`}>
                    <p className="text-white/70 leading-8">{description}</p>
                    {!showMore && (
                      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-[#09070f] to-transparent" />
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowMore((prev) => !prev)}
                    className="mx-auto inline-flex items-center gap-2 text-primary text-sm font-semibold hover:text-secondary transition"
                  >
                    {showMore ? "عرض أقل" : "عرض المزيد"}
                    <ArrowRight className={`w-4 h-4 transition-transform ${showMore ? "rotate-90" : "rotate-0"}`} />
                  </button>
                </div>

                <div className="grid gap-4 w-full max-w-xs mx-auto">
                  <Button
                    onClick={handleAddToCart}
                    className="w-full rounded-3xl bg-gradient-to-r from-primary to-secondary py-4 text-base font-bold text-white shadow-xl shadow-primary/20"
                  >
                    إضافة إلى السلة
                  </Button>
                  <Button
                    onClick={handleBuyNow}
                    className="w-full rounded-3xl border border-white/15 bg-white/5 py-4 text-base font-bold text-white shadow-xl shadow-primary/20"
                  >
                    شراء الآن
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer className="border-t border-white/5 mt-12 relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-14">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10 mb-10">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-[0_0_15px_rgba(124,58,237,0.4)]">
                  <TerminalSquare className="w-5 h-5 text-white" />
                </div>
                <span className="font-bold text-xl">{storeName}</span>
              </div>
              <p className="text-white/40 text-sm leading-relaxed">
                مطور برمجيات محترف متخصص في بناء تطبيقات ويب وجوال متطورة وعصرية.
              </p>
            </div>

            <div>
              <h4 className="font-bold text-white/80 mb-5">تواصل معنا</h4>
              <div className="space-y-3">
                <a
                  href={`https://wa.me/${whatsappNumber}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-3 text-white/50 hover:text-green-400 transition-colors text-sm group"
                >
                  <span className="w-8 h-8 rounded-lg bg-green-500/10 border border-green-500/20 flex items-center justify-center group-hover:bg-green-500/20 transition-colors">
                    <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current text-green-400"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.115.549 4.099 1.51 5.827L.057 23.447a.5.5 0 0 0 .604.604l5.62-1.453A11.952 11.952 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.924 0-3.722-.529-5.254-1.445l-.374-.225-3.886 1.004 1.004-3.886-.225-.374A9.966 9.966 0 0 1 2 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/></svg>
                  </span>
                  <div>
                    <div className="text-white/60 group-hover:text-green-400 transition-colors">واتساب</div>
                    <div className="text-xs text-white/35">{whatsappNumber}</div>
                  </div>
                </a>
                {supportEmail && (
                  <a
                    href={`mailto:${supportEmail}`}
                    className="flex items-center gap-3 text-white/50 hover:text-blue-300 transition-colors text-sm group"
                  >
                    <span className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center group-hover:bg-blue-500/20 transition-colors">
                      <Send className="w-4 h-4 text-blue-300" />
                    </span>
                    <div>
                      <div className="text-white/60 group-hover:text-blue-300 transition-colors">البريد</div>
                      <div className="text-xs text-white/35">{supportEmail}</div>
                    </div>
                  </a>
                )}
              </div>
            </div>

            <div>
              <h4 className="font-bold text-white/80 mb-5">تابعنا</h4>
              <div className="flex gap-3">
                <a
                  href={tiktokUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="w-11 h-11 rounded-xl glass-panel flex items-center justify-center hover:bg-white/10 transition-all hover:-translate-y-1 group border border-white/10"
                  aria-label="TikTok"
                >
                  <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current text-white/50 group-hover:text-white transition-colors">
                    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.17 8.17 0 0 0 4.78 1.52V6.74a4.85 4.85 0 0 1-1.01-.05z"/>
                  </svg>
                </a>
                <a
                  href={instagramUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="w-11 h-11 rounded-xl glass-panel flex items-center justify-center hover:bg-gradient-to-br hover:from-purple-500/20 hover:to-pink-500/20 transition-all hover:-translate-y-1 group border border-white/10"
                  aria-label="Instagram"
                >
                  <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current text-white/50 group-hover:text-white transition-colors">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                  </svg>
                </a>
              </div>
            </div>
          </div>

          <div className="border-t border-white/5 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-white/30 text-sm">
              جميع الحقوق محفوظة &copy; {new Date().getFullYear()} — {storeName}
            </p>
            <a
              href="/admin"
              className="text-white/20 hover:text-white/40 text-xs transition-colors"
            >
              لوحة التحكم
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
