import { useState, useRef, useMemo, useEffect } from "react";
import { motion, useInView, AnimatePresence } from "framer-motion";
import { Link } from "wouter";
import { Star, Search, Zap, Clock, ArrowUpRight, SlidersHorizontal } from "lucide-react";
import { products, categories } from "@/data/products";

const itemVariants = {
  hidden: { opacity: 0, y: 30, scale: 0.96 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94], delay: i * 0.06 },
  }),
};

function ServiceCard({ product, index }: { product: (typeof products)[0]; index: number }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  const [hovered, setHovered] = useState(false);

  return (
    <motion.div
      ref={ref}
      custom={index}
      variants={itemVariants}
      initial="hidden"
      animate={inView ? "visible" : "hidden"}
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
      className="h-full"
    >
      <Link href={`/products/${product.id}`}>
        <div className="relative group cursor-pointer h-full">
          {/* Glow effect */}
          <motion.div
            animate={{ opacity: hovered ? 1 : 0, scale: hovered ? 1 : 0.85 }}
            transition={{ duration: 0.4 }}
            className={`absolute -inset-px rounded-2xl bg-gradient-to-br ${product.gradient} opacity-40 blur-sm`}
          />

          {/* Card */}
          <div className="relative h-full rounded-[2rem] bg-[hsl(270,50%,7%)] border border-white/10 overflow-hidden backdrop-blur-sm shadow-[0_25px_80px_rgba(0,0,0,0.25)] transition-transform duration-300 group-hover:-translate-y-1">
            {/* Top Bar Gradient */}
            <div className={`h-0.5 w-full bg-gradient-to-r ${product.gradient}`} />

            <div className="p-4 sm:p-5 flex flex-col h-full gap-4 items-center text-center">
              <div className="flex flex-col items-center gap-4 w-full">
                <motion.div
                  animate={{ rotate: hovered ? 360 : 0 }}
                  transition={{ duration: 0.8, ease: "easeInOut" }}
                  className={`flex-shrink-0 w-14 h-14 sm:w-16 sm:h-16 rounded-3xl bg-gradient-to-br ${product.gradient} flex items-center justify-center text-white text-xl shadow-lg`}
                >
                  {product.icon}
                </motion.div>

                <div className="flex flex-col items-center gap-2 w-full">
                  <div className="flex flex-col items-center gap-2 w-full">
                    <p className={`text-[10px] sm:text-xs font-semibold uppercase tracking-[0.32em] bg-gradient-to-r ${product.gradient} bg-clip-text text-transparent`}>
                      {categories.find((c) => c.id === product.category)?.label}
                    </p>
                    <div className="flex flex-col items-center gap-1.5">
                      {product.badge && (
                        <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full bg-gradient-to-r ${product.gradient} text-white`}>
                          {product.badge}
                        </span>
                      )}
                      {product.popular && (
                        <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-white/8 text-yellow-300 border border-yellow-500/20 flex items-center gap-1 justify-center">
                          <Zap className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                          <span className="hidden sm:inline">الأكثر طلبًا</span>
                        </span>
                      )}
                    </div>
                  </div>

                  <div>
                    <h3 className="font-black text-white text-base sm:text-lg leading-snug">
                      {product.name}
                    </h3>
                    <p className="text-white/30 text-xs font-mono truncate">{product.nameEn}</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 w-full">
                {product.features.slice(0, 2).map((f, i) => (
                  <div key={i} className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-[11px] text-white/70">
                    {f}
                  </div>
                ))}
              </div>

              <div className="flex flex-col items-center gap-2 text-white/40 text-xs w-full">
                <div className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  <span>{product.deliveryDays} يوم</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-white/60 font-semibold">{product.rating}</span>
                  <span className="text-white/30">({product.reviews.toLocaleString("ar")})</span>
                </div>
              </div>

              <div className="mt-auto flex flex-col items-center gap-3 w-full">
                <div>
                  <div className="flex items-baseline justify-center gap-1">
                    <span className="text-xl sm:text-2xl font-black text-white">
                      {product.price.toLocaleString("ar")}
                    </span>
                    <span className="text-white/40 text-xs">ر.س</span>
                  </div>
                  {product.originalPrice && (
                    <span className="text-white/25 text-[11px] line-through">
                      {product.originalPrice.toLocaleString("ar")} ر.س
                    </span>
                  )}
                </div>

                <motion.div
                  animate={{ x: hovered ? 2 : 0, y: hovered ? -2 : 0 }}
                  transition={{ duration: 0.2 }}
                  className={`w-11 h-11 rounded-3xl bg-gradient-to-br ${product.gradient} flex items-center justify-center shadow-lg`}
                >
                  <ArrowUpRight className="w-4 h-4 text-white" />
                </motion.div>
              </div>
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

export default function Products() {
  const [activeCategory, setActiveCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [sortBy, setSortBy] = useState("featured");

  // Debounce the search input to avoid filtering on every keystroke
  useEffect(() => {
    const id = setTimeout(() => setSearchQuery(searchInput), 220);
    return () => clearTimeout(id);
  }, [searchInput]);

  const filtered = useMemo(() => products
    .filter((p) => {
      const matchCat = activeCategory === "all" || p.category === activeCategory;
      const matchSearch =
        p.name.includes(searchQuery) || p.nameEn.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCat && matchSearch;
    })
    .sort((a, b) => {
      if (sortBy === "price-asc") return a.price - b.price;
      if (sortBy === "price-desc") return b.price - a.price;
      if (sortBy === "rating") return b.rating - a.rating;
      return 0;
    }), [activeCategory, searchQuery, sortBy]);

  return (
    <div className="min-h-screen bg-[#0D0416] relative overflow-x-hidden" dir="rtl">
      {/* Ambient Background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-violet-600/10 rounded-full blur-[120px]" />
        <div className="absolute top-1/2 right-[-5%] w-64 h-64 bg-blue-600/8 rounded-full blur-3xl" />
        <div className="absolute bottom-1/3 left-[-5%] w-56 h-56 bg-violet-700/8 rounded-full blur-3xl" />
        <div
          className="absolute inset-0 opacity-[0.022]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.4) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }}
        />
      </div>

      <div className="relative max-w-6xl mx-auto px-4 sm:px-6 py-10">

        {/* ─── Hero Header ─── */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          className="text-center mb-10"
        >
          {/* Label */}
          <motion.p
            initial={{ opacity: 0, letterSpacing: "0.2em" }}
            animate={{ opacity: 1, letterSpacing: "0.35em" }}
            transition={{ duration: 0.8, delay: 0.1 }}
            className="text-violet-400 text-xs font-mono uppercase mb-3 tracking-[0.35em]"
          >
            Digital Services
          </motion.p>

          {/* Title */}
          <motion.h1
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.15 }}
            className="text-white font-black text-3xl sm:text-5xl tracking-tight mb-4 leading-tight"
          >
            خدماتنا{" "}
            <span className="bg-gradient-to-r from-violet-400 via-blue-400 to-violet-300 bg-clip-text text-transparent">
              الرقمية
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-white/35 text-sm max-w-md mx-auto mb-8"
          >
            حلول تقنية وإبداعية متكاملة تصنع الفرق وتبني علامتك في العالم الرقمي
          </motion.p>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            className="flex justify-center gap-8 sm:gap-14"
          >
            {[
              { val: "+50", label: "خدمة متاحة" },
              { val: "+2K", label: "عميل سعيد" },
              { val: "4.9★", label: "تقييم" },
            ].map((s, i) => (
              <div key={i} className="text-center">
                <p className="text-white font-black text-2xl sm:text-3xl">{s.val}</p>
                <p className="text-white/30 text-xs mt-0.5">{s.label}</p>
              </div>
            ))}
          </motion.div>
        </motion.div>

        {/* ─── Divider ─── */}
        <div className="flex items-center gap-4 mb-8">
          <div className="flex-1 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
          <div className="w-1.5 h-1.5 rounded-full bg-violet-500/60" />
          <div className="flex-1 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
        </div>

        {/* ─── Search + Sort ─── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="flex gap-3 mb-5 max-w-2xl mx-auto"
        >
          <div className="relative flex-1">
            <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/25" />
            <input
              type="text"
              placeholder="ابحث عن خدمة..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl pr-10 pl-4 py-3 text-white text-sm placeholder:text-white/20 outline-none focus:border-violet-500/40 focus:bg-violet-500/5 transition-all"
            />
          </div>
          <div className="relative">
            <SlidersHorizontal className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30 pointer-events-none" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="bg-white/5 border border-white/10 rounded-xl pr-9 pl-3 py-3 text-white/60 text-sm outline-none focus:border-violet-500/40 transition-all cursor-pointer appearance-none min-w-[110px]"
            >
              <option value="featured" className="bg-gray-900">الأشهر</option>
              <option value="rating" className="bg-gray-900">الأعلى تقييماً</option>
              <option value="price-asc" className="bg-gray-900">السعر ↑</option>
              <option value="price-desc" className="bg-gray-900">السعر ↓</option>
            </select>
          </div>
        </motion.div>

        {/* ─── Category Pills – Centered ─── */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.32 }}
          className="flex flex-wrap justify-center gap-2 mb-8"
        >
          {categories.map((cat) => (
            <motion.button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              whileTap={{ scale: 0.94 }}
              className={`relative px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all duration-300 border ${
                activeCategory === cat.id
                  ? "border-violet-500/50 text-violet-300 bg-violet-500/10"
                  : "border-white/8 text-white/35 hover:border-white/18 hover:text-white/55"
              }`}
            >
              {activeCategory === cat.id && (
                <motion.div
                  layoutId="activePill"
                  className="absolute inset-0 rounded-full bg-violet-500/10"
                  transition={{ type: "spring", bounce: 0.2, duration: 0.5 }}
                />
              )}
              <span className="relative">{cat.label}</span>
            </motion.button>
          ))}
        </motion.div>

        {/* Count */}
        <p className="text-white/20 text-xs text-center mb-6">
          {filtered.length === 1
            ? "خدمة واحدة متاحة"
            : filtered.length <= 10
            ? `${filtered.length} خدمات متاحة`
            : `${filtered.length} خدمة متاحة`}
        </p>

        {/* ─── Products Grid ─── */}
        <AnimatePresence mode="wait">
          {filtered.length > 0 ? (
            <motion.div
              key={activeCategory}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="grid grid-cols-2 gap-4"
            >
              {filtered.map((product, i) => (
                <ServiceCard key={product.id} product={product} index={i} />
              ))}
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-24"
            >
              <p className="text-white/15 text-7xl font-mono mb-4">∅</p>
              <p className="text-white/30 font-semibold">لا توجد نتائج</p>
              <button
                onClick={() => { setActiveCategory("all"); setSearchQuery(""); }}
                className="mt-4 text-violet-400/60 hover:text-violet-400 text-xs font-mono transition-colors"
              >
                مسح الفلاتر
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ─── Bottom CTA ─── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="mt-20 text-center"
        >
          <div className="inline-block relative">
            <div className="absolute inset-0 bg-gradient-to-r from-violet-600/20 via-blue-500/20 to-violet-600/20 rounded-2xl blur-xl" />
            <div className="relative bg-white/5 border border-white/10 rounded-2xl px-8 py-8">
              <p className="text-white/40 text-xs font-mono mb-2 tracking-widest uppercase">خدمة مخصصة</p>
              <h3 className="text-white font-black text-xl sm:text-2xl mb-2">لم تجد ما تبحث عنه؟</h3>
              <p className="text-white/35 text-sm mb-6 max-w-xs mx-auto">
                نبني لك حلاً مخصصاً يناسب احتياجاتك تماماً
              </p>
              <motion.button
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.97 }}
                className="px-7 py-3 bg-gradient-to-r from-violet-600 to-blue-500 text-white font-bold rounded-xl text-sm shadow-lg shadow-violet-600/30"
              >
                تواصل معنا مباشرة
              </motion.button>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
