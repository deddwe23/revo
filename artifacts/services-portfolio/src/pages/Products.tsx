import { useEffect, useState, useMemo, useCallback, memo, type MouseEvent } from "react";
import { Link } from "wouter";
import { Search, Plus, SlidersHorizontal } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { useToast } from "@/hooks/use-toast";
import { addToCart } from "@/lib/cart";
import { products, categories } from "@/data/products";

const ServiceCard = memo(function ServiceCard({
  product,
  onAddToCart,
}: {
  product: (typeof products)[0];
  onAddToCart: (
    product: (typeof products)[0],
    event: MouseEvent<HTMLButtonElement>,
  ) => void;
}) {
  return (
    <div className="h-full">
      <div className="flex h-full flex-col rounded-[2rem] border border-white/10 bg-card overflow-hidden shadow-xl shadow-black/15 transition-transform duration-300 hover:-translate-y-1">
        <div className="group flex-1 flex flex-col">
          <Link
            href={`/products/${product.id}`}
            className="group flex-1 flex flex-col no-underline"
            aria-label={`عرض تفاصيل ${product.name}`}
          >
            <div className="relative aspect-square w-full bg-gradient-to-br from-primary/80 to-secondary/80 flex items-center justify-center text-5xl text-white">
              <span className="text-6xl">{product.icon}</span>
            </div>

            <div className="px-5 py-6 flex flex-col gap-3 flex-1">
              <div>
                <h3 className="text-white font-black text-lg leading-tight mb-1">
                  {product.name}
                </h3>
                <p className="text-white/40 text-xs">{product.nameEn}</p>
              </div>

              <div className="mt-auto">
                <div className="flex items-end gap-2">
                  <span className="text-2xl font-black text-white">
                    {product.price.toLocaleString("ar")}
                  </span>
                  <span className="text-white/40 text-xs">ر.س</span>
                </div>
                {product.originalPrice && (
                  <p className="text-white/25 text-xs line-through mt-1">
                    {product.originalPrice.toLocaleString("ar")} ر.س
                  </p>
                )}
              </div>
            </div>
          </Link>
        </div>

        <div className="p-5 border-t border-white/10 bg-card">
          <button
            type="button"
            onClick={(e) => onAddToCart(product, e)}
            className="w-full inline-flex items-center justify-center gap-2 rounded-3xl bg-gradient-to-r from-primary to-secondary py-3 text-sm font-bold text-white shadow-xl shadow-primary/20 transition-transform duration-200 hover:scale-[1.01]"
          >
            <Plus className="w-4 h-4" /> إضافة للسلة
          </button>
        </div>
      </div>
    </div>
  );
});

export default function Products() {
  const isMobile = useIsMobile();
  const [activeCategory, setActiveCategory] = useState(() => {
    if (typeof window === "undefined") return "all";

    const urlCategory = new URLSearchParams(window.location.search).get(
      "category",
    );
    if (!urlCategory) return "all";

    return categories.some((cat) => cat.id === urlCategory)
      ? urlCategory
      : "all";
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("featured");

  const filtered = useMemo(() => {
    const normalizedSearch = searchQuery.trim().toLowerCase();

    return products
      .filter((p) => {
        const matchCat =
          activeCategory === "all" || p.category === activeCategory;
        const matchSearch =
          normalizedSearch.length === 0 ||
          p.name.toLowerCase().includes(normalizedSearch) ||
          p.nameEn.toLowerCase().includes(normalizedSearch);
        return matchCat && matchSearch;
      })
      .sort((a, b) => {
        if (sortBy === "price-asc") return a.price - b.price;
        if (sortBy === "price-desc") return b.price - a.price;
        if (sortBy === "rating") return b.rating - a.rating;
        return 0;
      });
  }, [activeCategory, searchQuery, sortBy]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const params = new URLSearchParams(window.location.search);
    if (activeCategory === "all") {
      params.delete("category");
    } else {
      params.set("category", activeCategory);
    }

    const nextQuery = params.toString();
    const nextUrl = `${window.location.pathname}${nextQuery ? `?${nextQuery}` : ""}`;
    window.history.replaceState({}, "", nextUrl);
  }, [activeCategory]);

  const { toast } = useToast();

  const handleAddToCart = useCallback(
    (product: (typeof products)[0], event: MouseEvent<HTMLButtonElement>) => {
      event.stopPropagation();
      event.preventDefault();
      addToCart({
        id: String(product.id),
        name: product.name,
        subtitle: product.nameEn,
        priceSar: product.price,
        currency: "SAR",
      });
      toast({ title: "تمت الإضافة إلى السلة", description: product.name });
    },
    [toast],
  );

  return (
    <div className="min-h-screen bg-background relative overflow-x-hidden" dir="rtl">
      {!isMobile && (
        <div className="fixed inset-0 pointer-events-none">
          <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-primary/10 rounded-full blur-3xl" />
          <div className="absolute top-1/2 right-[-5%] w-64 h-64 bg-secondary/10 rounded-full blur-3xl" />
          <div className="absolute bottom-1/3 left-[-5%] w-56 h-56 bg-primary/10 rounded-full blur-3xl" />
          <div
            className="absolute inset-0 opacity-[0.02]"
            style={{
              backgroundImage:
                "linear-gradient(rgba(255,255,255,0.35) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.35) 1px, transparent 1px)",
              backgroundSize: "60px 60px",
            }}
          />
        </div>
      )}

      <div className="relative max-w-6xl mx-auto px-4 sm:px-6 py-10">
        <div className="text-center mb-10">
          <div className="mb-6 flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/"
              className="rounded-full border border-white/20 bg-white/5 px-4 py-2 text-sm font-semibold text-white/80 transition-colors hover:bg-white/10 hover:text-white"
            >
              ← العودة للصفحة الرئيسية
            </Link>
            <span className="text-white/40 text-xs">صفحة المنتجات</span>
          </div>

          <p className="text-secondary text-xs font-mono uppercase mb-3 tracking-[0.35em]">
            Digital Services
          </p>

          <h1 className="text-white font-black text-3xl sm:text-5xl tracking-tight mb-4 leading-tight">
            خدماتنا{" "}
            <span className="gradient-text">
              الرقمية
            </span>
          </h1>

          <p className="text-white/35 text-sm max-w-md mx-auto mb-8">
            حلول تقنية وإبداعية متكاملة تصنع الفرق وتبني علامتك في العالم الرقمي
          </p>

          <div className={`flex flex-wrap justify-center ${isMobile ? "gap-3" : "gap-8 sm:gap-14"}`}>
            {[
              { val: "+50", label: "خدمة متاحة" },
              { val: "+2K", label: "عميل سعيد" },
              { val: "4.9★", label: "تقييم" },
            ].map((s, i) => (
              <div key={i} className="text-center">
                <p className={`text-white font-black ${isMobile ? "text-xl" : "text-2xl sm:text-3xl"}`}>
                  {s.val}
                </p>
                <p className="text-white/30 text-[11px] mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-4 mb-8">
          <div className="flex-1 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
          <div className="w-1.5 h-1.5 rounded-full bg-primary/60" />
        </div>

        <div className={`flex flex-col ${isMobile ? "gap-3" : "gap-3"} mb-5 max-w-2xl mx-auto ${isMobile ? "px-0" : ""}`}>
          <div className="relative flex-1">
            <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/25" />
            <input
              type="text"
              placeholder="ابحث عن خدمة..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl pr-10 pl-4 py-3 text-white text-sm placeholder:text-white/20 outline-none focus:border-primary/40 focus:bg-white/10 transition-all"
            />
          </div>
          <div className={`relative ${isMobile ? "w-full" : ""}`}>
            <SlidersHorizontal className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30 pointer-events-none" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="bg-white/5 border border-white/10 rounded-xl pr-9 pl-3 py-3 text-white/60 text-sm outline-none focus:border-primary/40 transition-all cursor-pointer appearance-none min-w-[110px]"
            >
              <option value="featured" className="bg-gray-900">
                الأشهر
              </option>
              <option value="rating" className="bg-gray-900">
                الأعلى تقييماً
              </option>
              <option value="price-asc" className="bg-gray-900">
                السعر ↑
              </option>
              <option value="price-desc" className="bg-gray-900">
                السعر ↓
              </option>
            </select>
          </div>
        </div>

        <div className="flex flex-wrap justify-center gap-2 mb-8">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`relative px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all duration-300 border ${
                activeCategory === cat.id
                  ? "border-primary/50 text-primary bg-primary/10"
                  : "border-white/8 text-white/35 hover:border-white/18 hover:text-white/55"
              }`}
            >
              {activeCategory === cat.id && (
                <div className="absolute inset-0 rounded-full bg-primary/10" />
              )}
              <span className="relative">{cat.label}</span>
            </button>
          ))}
        </div>

        <p className="text-white/20 text-xs text-center mb-6">
          {filtered.length === 1
            ? "خدمة واحدة متاحة"
            : filtered.length <= 10
              ? `${filtered.length} خدمات متاحة`
              : `${filtered.length} خدمة متاحة`}
        </p>

        {filtered.length > 0 ? (
          <div className="grid grid-cols-2 gap-4">
            {filtered.map((product, i) => (
              <ServiceCard
                key={product.id}
                product={product}
                onAddToCart={handleAddToCart}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-24">
            <p className="text-white/15 text-7xl font-mono mb-4">∅</p>
            <p className="text-white/30 font-semibold">لا توجد نتائج</p>
            <button
              onClick={() => {
                setActiveCategory("all");
                setSearchQuery("");
              }}
              className="mt-4 text-secondary/60 hover:text-secondary text-xs font-mono transition-colors"
            >
              مسح الفلاتر
            </button>
          </div>
        )}

        <div className="mt-20 text-center">
          <div className="inline-block relative">
            {!isMobile && (
              <div className="absolute inset-0 bg-gradient-to-r from-primary/20 via-secondary/20 to-primary/20 rounded-2xl blur-xl" />
            )}
            <div className="relative glass-panel border border-white/10 rounded-2xl px-8 py-8">
              <p className="text-white/40 text-xs font-mono mb-2 tracking-widest uppercase">
                خدمة مخصصة
              </p>
              <h3 className="text-white font-black text-xl sm:text-2xl mb-2">
                لم تجد ما تبحث عنه؟
              </h3>
              <p className="text-white/35 text-sm mb-6 max-w-xs mx-auto">
                نبني لك حلاً مخصصاً يناسب احتياجاتك تماماً
              </p>
              <button
                type="button"
                className="px-7 py-3 bg-gradient-to-r from-primary to-secondary text-white font-bold rounded-xl text-sm shadow-lg shadow-primary/30 transition-transform duration-200 hover:scale-[1.02]"
              >
                تواصل معنا مباشرة
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
