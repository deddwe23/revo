import { useState, useRef, useEffect } from "react";
import { useParams, Link } from "wouter";
import { motion, useInView, AnimatePresence, useMotionValue, animate as fmAnimate } from "framer-motion";
import {
  Star,
  Clock,
  ArrowRight,
  Shield,
  Zap,
  CheckCircle,
  MessageSquare,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { products, categories } from "@/data/products";

const ALL_REVIEWS = [
  { name: "أحمد العتيبي", date: "منذ 3 أيام", rating: 5, text: "خدمة استثنائية! التسليم كان قبل الموعد المحدد والجودة فاقت التوقعات تماماً. أنصح بها بشدة لكل من يريد نتائج احترافية.", avatar: "أ" },
  { name: "سارة المطيري", date: "منذ أسبوع", rating: 5, text: "من أفضل الخدمات التي تعاملت معها. الفريق محترف وملتزم بالتفاصيل، وكان التواصل سريعاً وواضحاً طوال فترة العمل.", avatar: "س" },
  { name: "فهد الشمري", date: "منذ أسبوعين", rating: 4, text: "نتيجة ممتازة وأسعار تنافسية. سأكون عميلاً دائماً بالتأكيد، التجربة كانت سلسة وممتعة.", avatar: "ف" },
  { name: "نورة القحطاني", date: "منذ شهر", rating: 5, text: "مذهل! لم أتوقع هذا المستوى من الجودة والدقة. تجاوزوا توقعاتي بكثير وسأوصي بهم لكل معارفي.", avatar: "ن" },
  { name: "خالد الدوسري", date: "منذ شهر", rating: 5, text: "تعامل راقٍ ومحترف من البداية للنهاية. الفريق يستمع لاحتياجاتك ويقدم حلولاً إبداعية تناسبك تماماً.", avatar: "خ" },
  { name: "ريم العمري", date: "منذ شهرين", rating: 4, text: "جودة عالية وخدمة ممتازة. الوقت الذي استغرقه التسليم كان معقولاً والنتيجة النهائية كانت أكثر مما طلبت.", avatar: "ر" },
  { name: "محمد البقمي", date: "منذ شهرين", rating: 5, text: "أفضل استثمار قمت به! النتائج تحدث الفارق الفعلي. الفريق متفاني ومبدع ويعطي أكثر مما تدفع.", avatar: "م" },
];

function ReviewsSlider({ rating, gradient }: { rating: number; gradient: string }) {
  const [current, setCurrent] = useState(0);
  const x = useMotionValue(0);

  const CARD_WIDTH = 300;
  const GAP = 16;
  const STEP = CARD_WIDTH + GAP;
  const maxIndex = ALL_REVIEWS.length - 1;

  const goTo = (idx: number) => {
    const clamped = Math.max(0, Math.min(idx, maxIndex));
    setCurrent(clamped);
    fmAnimate(x, -clamped * STEP, { type: "spring", stiffness: 350, damping: 35 });
  };

  const handleDragEnd = () => {
    const currentX = x.get();
    const rawIndex = Math.round(-currentX / STEP);
    goTo(rawIndex);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="mt-14 bg-[hsl(270,50%,6%)] border border-[hsl(270,40%,16%)] rounded-3xl p-6 sm:p-8 overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-white font-black text-xl flex items-center gap-3">
          <span className={`w-1 h-7 bg-gradient-to-b ${gradient} rounded-full`} />
          آراء العملاء
        </h2>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/8 border border-white/10">
            <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
            <span className="text-white font-black text-sm">{rating}</span>
            <span className="text-white/30 text-xs">/ 5</span>
          </div>
          <div className="flex gap-2">
            <motion.button
              whileTap={{ scale: 0.88 }}
              onClick={() => goTo(current + 1)}
              disabled={current === maxIndex}
              className={`w-9 h-9 rounded-full border flex items-center justify-center transition-all ${
                current === maxIndex
                  ? "border-white/8 text-white/15 cursor-not-allowed"
                  : "border-violet-500/40 text-violet-300/70 hover:border-violet-400/70 hover:text-violet-200 hover:bg-violet-500/10"
              }`}
            >
              <ChevronRight className="w-4 h-4" />
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.88 }}
              onClick={() => goTo(current - 1)}
              disabled={current === 0}
              className={`w-9 h-9 rounded-full border flex items-center justify-center transition-all ${
                current === 0
                  ? "border-white/8 text-white/15 cursor-not-allowed"
                  : "border-violet-500/40 text-violet-300/70 hover:border-violet-400/70 hover:text-violet-200 hover:bg-violet-500/10"
              }`}
            >
              <ChevronLeft className="w-4 h-4" />
            </motion.button>
          </div>
        </div>
      </div>

      {/* Drag hint */}
      <p className="text-white/20 text-xs mb-5 flex items-center gap-1.5">
        <span className="text-base leading-none">↔</span> اسحب للتنقل
      </p>

      {/* Slider */}
      <div className="overflow-hidden cursor-grab active:cursor-grabbing" dir="ltr">
        <motion.div
          drag="x"
          dragConstraints={{ left: -(maxIndex * STEP), right: 0 }}
          dragElastic={0.15}
          dragMomentum={false}
          onDragEnd={handleDragEnd}
          style={{ x }}
          className="flex gap-4 select-none"
        >
          {ALL_REVIEWS.map((r, i) => (
            <motion.div
              key={i}
              animate={{
                opacity: i === current ? 1 : Math.abs(i - current) === 1 ? 0.55 : 0.3,
                scale: i === current ? 1 : 0.96,
              }}
              transition={{ duration: 0.25 }}
              className="flex-shrink-0 bg-[hsl(270,45%,8%)] border border-[hsl(270,40%,18%)] rounded-2xl p-5"
              style={{ width: CARD_WIDTH }}
            >
              {/* Author */}
              <div className="flex items-center gap-3 mb-4">
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center text-white font-black text-base flex-shrink-0`}>
                  {r.avatar}
                </div>
                <div>
                  <p className="text-white font-bold text-sm">{r.name}</p>
                  <p className="text-white/25 text-xs">{r.date}</p>
                </div>
              </div>

              {/* Stars */}
              <div className="flex gap-0.5 mb-3">
                {[...Array(5)].map((_, j) => (
                  <Star key={j} className={`w-3.5 h-3.5 ${j < r.rating ? "fill-yellow-400 text-yellow-400" : "fill-white/8 text-white/8"}`} />
                ))}
              </div>

              {/* Review text */}
              <p className="text-white/55 text-sm leading-relaxed">{r.text}</p>

              {/* Verified */}
              <div className="mt-4 flex items-center gap-1.5">
                <CheckCircle className="w-3 h-3 text-green-400" />
                <span className="text-green-400/60 text-xs">عميل موثّق</span>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>

      {/* Dots */}
      <div className="flex justify-center gap-2 mt-6">
        {ALL_REVIEWS.map((_, i) => (
          <motion.button
            key={i}
            onClick={() => goTo(i)}
            animate={{ width: i === current ? 24 : 6, opacity: i === current ? 1 : 0.25 }}
            transition={{ duration: 0.25 }}
            className={`h-1.5 rounded-full bg-gradient-to-r ${gradient} flex-shrink-0`}
          />
        ))}
      </div>
    </motion.div>
  );
}

export default function ProductDetail() {
  const params = useParams<{ id: string }>();
  const product = products.find((p) => p.id === Number(params.id));
  const [ordered, setOrdered] = useState(false);
  const [contacted, setContacted] = useState(false);
  const relatedRef = useRef(null);
  const relatedInView = useInView(relatedRef, { once: true });

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
    setOrdered(false);
    setContacted(false);
  }, [params.id]);

  if (!product) {
    return (
      <div className="min-h-screen bg-[#050508] flex items-center justify-center" dir="rtl">
        <div className="text-center">
          <p className="text-white/20 text-8xl font-mono mb-4">404</p>
          <p className="text-white/40 mb-6">الخدمة غير موجودة</p>
          <Link href="/">
            <button className="px-6 py-3 bg-cyan-500/20 border border-cyan-500/30 text-cyan-400 rounded-xl font-semibold">
              العودة للخدمات
            </button>
          </Link>
        </div>
      </div>
    );
  }

  const related = products.filter((p) => p.category === product.category && p.id !== product.id).slice(0, 4);
  const discount = product.originalPrice
    ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
    : 0;

  return (
    <div className="min-h-screen bg-[#0D0416] relative overflow-x-hidden" dir="rtl">
      {/* Ambient */}
      <div className="fixed inset-0 pointer-events-none">
        <motion.div
          animate={{ opacity: [0.06, 0.12, 0.06] }}
          transition={{ duration: 5, repeat: Infinity }}
          className={`absolute top-0 left-1/4 w-[500px] h-[500px] bg-gradient-to-br ${product.gradient} rounded-full blur-[120px] opacity-10`}
        />
        <div
          className="absolute inset-0 opacity-[0.025]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.3) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }}
        />
      </div>

      <div className="relative mx-auto w-full max-w-none px-4 sm:px-6 py-8 lg:px-0 lg:py-10">
        {/* Breadcrumb */}
        <motion.nav
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-1.5 text-xs mb-8"
        >
          <Link href="/">
            <span className="text-white/35 hover:text-violet-400 transition-colors cursor-pointer">الخدمات</span>
          </Link>
          <span className="text-white/15 mx-1">‹</span>
          <span className="text-white/20">
            {categories.find((c) => c.id === product.category)?.label}
          </span>
          <span className="text-white/15 mx-1">‹</span>
          <span className="text-white/55 font-semibold truncate max-w-[180px]">{product.name}</span>
        </motion.nav>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          {/* Left: Visual Panel */}
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7 }}
            className="sticky top-8"
          >
            {/* Service Display Card */}
            <div className="relative rounded-3xl overflow-hidden aspect-square lg:aspect-[5/4] lg:min-h-[760px]">
              {/* Background gradient */}
              <div className={`absolute inset-0 bg-gradient-to-br ${product.gradient} opacity-20`} />
              <div className="absolute inset-0 bg-[hsl(270,60%,4%)]/70 backdrop-blur-sm" />

              {/* Grid pattern */}
              <div
                className="absolute inset-0 opacity-10"
                style={{
                  backgroundImage:
                    "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)",
                  backgroundSize: "30px 30px",
                }}
              />

              {/* Animated circles */}
              {[...Array(3)].map((_, i) => (
                <motion.div
                  key={i}
                  className={`absolute rounded-full bg-gradient-to-br ${product.gradient} opacity-20`}
                  style={{
                    width: `${120 + i * 80}px`,
                    height: `${120 + i * 80}px`,
                    top: "50%",
                    left: "50%",
                    x: "-50%",
                    y: "-50%",
                  }}
                  animate={{ scale: [1, 1.15, 1], opacity: [0.1, 0.25, 0.1] }}
                  transition={{ duration: 3 + i, repeat: Infinity, delay: i * 0.8 }}
                />
              ))}

              {/* Central Icon */}
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <motion.div
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: "spring", bounce: 0.4, delay: 0.3 }}
                  className={`w-32 h-32 lg:w-52 lg:h-52 rounded-3xl bg-gradient-to-br ${product.gradient} flex items-center justify-center text-7xl lg:text-[7.5rem] shadow-2xl`}
                >
                  {product.icon}
                </motion.div>

                <motion.p
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  className="text-white font-black text-2xl lg:text-6xl mt-6"
                >
                  {product.name}
                </motion.p>
                <p className="text-white/40 text-sm lg:text-base mt-1">{product.nameEn}</p>

                {/* Delivery badge */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.7 }}
                  className="mt-4 flex items-center gap-1.5 bg-white/10 border border-white/15 rounded-full px-4 py-1.5"
                >
                  <Clock className="w-3.5 h-3.5 text-white/60" />
                  <span className="text-white/70 text-xs font-mono">تسليم خلال {product.deliveryDays} يوم</span>
                </motion.div>
              </div>

              {/* Discount Badge */}
              {discount > 0 && (
                <motion.div
                  initial={{ scale: 0, rotate: -30 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: "spring", bounce: 0.5, delay: 0.6 }}
                  className={`absolute top-5 left-5 w-14 h-14 bg-gradient-to-br ${product.gradient} rounded-2xl flex flex-col items-center justify-center shadow-xl`}
                >
                  <span className="text-white text-base font-black">{discount}%</span>
                  <span className="text-white/80 text-xs">خصم</span>
                </motion.div>
              )}

              {/* Popular badge */}
              {product.popular && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.8 }}
                  className="absolute top-5 right-5 flex items-center gap-1 bg-yellow-500/20 border border-yellow-500/30 rounded-full px-3 py-1"
                >
                  <Zap className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                  <span className="text-yellow-300 text-xs font-bold">الأكثر طلبًا</span>
                </motion.div>
              )}
            </div>

            {/* Trust badges */}
            <div className="grid grid-cols-3 gap-3 mt-4">
              {[
                { icon: <Shield className="w-4 h-4" />, text: "ضمان الجودة" },
                { icon: <Zap className="w-4 h-4" />, text: "تسليم سريع" },
                { icon: <CheckCircle className="w-4 h-4" />, text: "تعديلات مجانية" },
              ].map((b, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 + i * 0.1 }}
                  className="bg-[hsl(270,50%,7%)] border border-[hsl(270,40%,16%)] rounded-xl p-3 flex flex-col items-center gap-1.5 text-center"
                >
                  <span className={`bg-gradient-to-br ${product.gradient} bg-clip-text text-transparent`}>{b.icon}</span>
                  <span className="text-white/50 text-xs">{b.text}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Right: Info */}
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7, delay: 0.1 }}
            className="space-y-6"
          >
            {/* Category + badges */}
            <div className="flex flex-wrap items-center gap-2">
              <span className={`text-xs font-bold px-3 py-1.5 rounded-full bg-gradient-to-r ${product.gradient} text-white`}>
                {categories.find((c) => c.id === product.category)?.label}
              </span>
              {product.badge && (
                <span className="text-xs font-bold px-3 py-1.5 rounded-full bg-white/8 border border-white/15 text-white/70">
                  {product.badge}
                </span>
              )}
            </div>

            {/* Name */}
            <div>
              <h1 className="text-3xl sm:text-4xl lg:text-6xl font-black text-white leading-tight">{product.name}</h1>
              <p className="text-white/30 text-sm lg:text-base mt-1 font-mono">{product.nameEn}</p>
            </div>

            {/* Rating */}
            <div className="flex items-center gap-3">
              <div className="flex gap-0.5">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className={`w-4 h-4 lg:w-5 lg:h-5 ${i < Math.floor(product.rating) ? "fill-yellow-400 text-yellow-400" : "fill-white/10 text-white/10"}`} />
                ))}
              </div>
              <span className="text-white font-bold lg:text-lg">{product.rating}</span>
              <span className="text-white/30 text-sm lg:text-sm">({product.reviews.toLocaleString("ar")} تقييم)</span>
            </div>

            {/* Price */}
            <div className={`relative rounded-2xl bg-gradient-to-br ${product.gradient} p-[1px]`}>
              <div className="rounded-2xl bg-gray-950/90 p-5">
                <div className="flex items-end justify-between">
                  <div>
                    <p className="text-white/40 text-xs mb-1">السعر الابتدائي</p>
                    <div className="flex items-baseline gap-2">
                      <span className="text-4xl lg:text-7xl font-black text-white">{product.price.toLocaleString("ar")}</span>
                      <span className="text-white/50 text-lg lg:text-2xl">﷼</span>
                    </div>
                    {product.originalPrice && (
                      <p className="text-white/25 text-sm lg:text-base line-through mt-0.5">
                        {product.originalPrice.toLocaleString("ar")} ﷼
                      </p>
                    )}
                  </div>
                  {product.originalPrice && (
                    <div className="text-right">
                      <p className="text-green-400 text-sm font-bold">
                        وفّر {(product.originalPrice - product.price).toLocaleString("ar")} ﷼
                      </p>
                      <p className="text-white/30 text-xs">بدل السعر الأصلي</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Description */}
            <div className="bg-[hsl(270,50%,7%)] border border-[hsl(270,40%,16%)] rounded-2xl p-5 lg:p-6">
              <h2 className="text-white font-bold text-base lg:text-lg mb-3 flex items-center gap-2">
                <span className={`w-1 h-5 bg-gradient-to-b ${product.gradient} rounded-full`} />
                نبذة عن الخدمة
              </h2>
              <p className="text-white/50 text-sm lg:text-base leading-relaxed">{product.description}</p>
            </div>

            {/* Features */}
            <div className="bg-[hsl(270,50%,7%)] border border-[hsl(270,40%,16%)] rounded-2xl p-5 lg:p-6">
              <h2 className="text-white font-bold text-base lg:text-lg mb-4 flex items-center gap-2">
                <span className={`w-1 h-5 bg-gradient-to-b ${product.gradient} rounded-full`} />
                ما يشمله الطلب
              </h2>
              <div className="space-y-2.5">
                {product.features.map((f, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -15 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.07 }}
                    className="flex items-center gap-3"
                  >
                    <div className={`w-5 h-5 rounded-full bg-gradient-to-br ${product.gradient} flex items-center justify-center flex-shrink-0 lg:w-6 lg:h-6`}>
                      <CheckCircle className="w-3 h-3 lg:w-4 lg:h-4 text-white" />
                    </div>
                    <span className="text-white/65 text-sm lg:text-base">{f}</span>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col lg:flex-row gap-3">
              <motion.button
                onClick={() => { setOrdered(true); setTimeout(() => setOrdered(false), 3000); }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                className={`flex-1 relative overflow-hidden py-4 lg:py-5 rounded-2xl font-black text-white text-base lg:text-lg shadow-xl`}
              >
                <div className={`absolute inset-0 bg-gradient-to-r ${product.gradient}`} />
                <AnimatePresence mode="wait">
                  {ordered ? (
                    <motion.span
                      key="ok"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="relative flex items-center justify-center gap-2"
                    >
                      <CheckCircle className="w-5 h-5" /> تم الطلب بنجاح
                    </motion.span>
                  ) : (
                    <motion.span
                      key="order"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="relative flex items-center justify-center gap-2"
                    >
                      <Zap className="w-5 h-5" /> اطلب الآن
                    </motion.span>
                  )}
                </AnimatePresence>
              </motion.button>

              <motion.button
                onClick={() => { setContacted(true); setTimeout(() => setContacted(false), 2500); }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                className="flex-1 py-4 lg:py-5 rounded-2xl font-black text-white/80 text-base lg:text-lg border border-white/15 bg-white/5 hover:bg-white/10 transition-colors flex items-center justify-center gap-2"
              >
                <AnimatePresence mode="wait">
                  {contacted ? (
                    <motion.span
                      key="sent"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="flex items-center gap-2 text-green-400"
                    >
                      <CheckCircle className="w-5 h-5" /> تم الإرسال
                    </motion.span>
                  ) : (
                    <motion.span
                      key="msg"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="flex items-center gap-2"
                    >
                      <MessageSquare className="w-5 h-5" /> تواصل معنا
                    </motion.span>
                  )}
                </AnimatePresence>
              </motion.button>
            </div>

            {/* Delivery Info */}
            <div className="flex items-center justify-center gap-2 text-white/30 text-xs lg:text-sm font-mono border border-[hsl(270,40%,16%)] rounded-xl py-3 lg:py-4 bg-[hsl(270,50%,6%)]">
              <Clock className="w-3.5 h-3.5 lg:w-4 lg:h-4" />
              <span>التسليم المتوقع: {product.deliveryDays} أيام عمل</span>
            </div>
          </motion.div>
        </div>

        {/* Reviews Slider */}
        <ReviewsSlider rating={product.rating} gradient={product.gradient} />

        {/* Related */}
        {related.length > 0 && (
          <motion.div
            ref={relatedRef}
            initial={{ opacity: 0, y: 30 }}
            animate={relatedInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.7 }}
            className="mt-12"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-white font-black text-xl flex items-center gap-3">
                <span className={`w-1 h-7 bg-gradient-to-b ${product.gradient} rounded-full`} />
                خدمات مشابهة
              </h2>
              <Link href="/">
                <motion.button whileHover={{ x: -3 }} className="flex items-center gap-1 text-white/40 hover:text-white/70 text-xs font-mono transition-colors">
                  <ArrowRight className="w-4 h-4" /> عرض الكل
                </motion.button>
              </Link>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              {related.map((rel, i) => (
                <motion.div
                  key={rel.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={relatedInView ? { opacity: 1, y: 0 } : {}}
                  transition={{ delay: i * 0.08 }}
                  whileHover={{ y: -4, scale: 1.01 }}
                >
                  <Link href={`/products/${rel.id}`}>
                    <div className="relative bg-[hsl(270,50%,7%)] border border-[hsl(270,40%,18%)] rounded-2xl overflow-hidden cursor-pointer group">
                      <div className={`h-0.5 w-full bg-gradient-to-r ${rel.gradient}`} />
                      <div className="p-4 lg:p-5">
                        <div className={`w-10 h-10 lg:w-12 lg:h-12 rounded-xl bg-gradient-to-br ${rel.gradient} flex items-center justify-center text-xl lg:text-2xl mb-3`}>
                          {rel.icon}
                        </div>
                        <p className="text-white font-bold text-sm lg:text-base truncate">{rel.name}</p>
                        <div className="flex items-center gap-1 mt-1 mb-3">
                          <Star className="w-3 h-3 lg:w-4 lg:h-4 fill-yellow-400 text-yellow-400" />
                          <span className="text-white/40 text-xs lg:text-sm">{rel.rating}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-white font-black text-base lg:text-lg">{rel.price.toLocaleString("ar")} <span className="text-white/40 text-xs lg:text-sm font-normal">﷼</span></span>
                          <ArrowUpRight className="w-4 h-4 lg:w-5 lg:h-5 text-white/20 group-hover:text-white/60 transition-colors" />
                        </div>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
