import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence, useScroll, useTransform, useMotionValue, useSpring, useInView } from "framer-motion";
import { 
  Code2, 
  Smartphone, 
  ShoppingCart, 
  Plus,
  Database, 
  LayoutTemplate, 
  Lightbulb, 
  CheckCircle2, 
  Send, 
  ChevronLeft,
  TerminalSquare,
  X,
  Zap,
  Shield,
  Star,
  Search,
  User,
  ChevronDown,
  Quote
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import AuthModal from "@/components/AuthModal";
import PublicHeader from "@/components/store/PublicHeader";
import { RatingsCarousel } from "@/components/RatingsCarousel";
import { addToCart } from "@/lib/cart";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
const WHATSAPP_NUMBER = "966533170903";

const navLinks = [
  { href: "#services", label: "الخدمات" },
  { href: "/products", label: "المنتجات" },
  { href: "#packages", label: "الباقات" },
  { href: "#stats", label: "لماذا أنا" },
  { href: "#reviews", label: "آراء العملاء" },
  { href: "#faq", label: "الأسئلة الشائعة" },
  { href: "#contact", label: "تواصل معي" },
];

const packages = [
  {
    id: "basic",
    name: "الباقة الأساسية",
    subtitle: "مثالية للمشاريع الناشئة",
    priceSar: 1500,
    icon: Zap,
    color: "from-blue-500/20 to-cyan-500/20",
    borderColor: "border-blue-500/30",
    glowColor: "rgba(59,130,246,0.3)",
    textColor: "text-blue-400",
    features: ["موقع بسيط", "تصميم متجاوب", "5 صفحات", "تسليم في 7 أيام"],
    popular: false,
  },
  {
    id: "pro",
    name: "الباقة الاحترافية",
    subtitle: "للمشاريع المتوسطة والمتنامية",
    priceSar: 4500,
    icon: Star,
    color: "from-primary/30 to-secondary/30",
    borderColor: "border-primary",
    glowColor: "rgba(124,58,237,0.4)",
    textColor: "text-primary",
    features: ["موقع متكامل", "لوحة تحكم مخصصة", "15 صفحة", "قاعدة بيانات متطورة", "تسليم في 21 يوم"],
    popular: true,
  },
  {
    id: "premium",
    name: "الباقة المميزة",
    subtitle: "حلول شاملة للشركات الكبرى",
    priceSar: 12000,
    icon: Shield,
    color: "from-purple-500/20 to-pink-500/20",
    borderColor: "border-purple-500/30",
    glowColor: "rgba(168,85,247,0.3)",
    textColor: "text-purple-400",
    features: ["حل برمجي متكامل", "تطبيق جوال iOS & Android", "دعم فني 3 أشهر", "تسليم في 45 يوم"],
    popular: false,
  },
];

interface StoreProduct {
  slug: string;
  title: string;
  description: string;
  price_sar: number;
  delivery_details: string | null;
  is_active: boolean;
}

interface StoreSettings {
  store_name?: string | null;
  support_email?: string | null;
  whatsapp_number: string | null;
  tiktok_url: string | null;
  instagram_url: string | null;
  currency?: string | null;
}

interface HomeServiceItem {
  title: string;
  desc: string;
}

interface HomeContent {
  heroLine1: string;
  heroLine2: string;
  heroSubtitle: string;
  packagesSubtitle: string;
  footerDescription: string;
  services: HomeServiceItem[];
}

function mapProductsToUi(products: StoreProduct[]) {
  const styleSeeds = [
    {
      icon: Zap,
      color: "from-blue-500/20 to-cyan-500/20",
      borderColor: "border-blue-500/30",
      glowColor: "rgba(59,130,246,0.3)",
      textColor: "text-blue-400",
      popular: false,
    },
    {
      icon: Star,
      color: "from-primary/30 to-secondary/30",
      borderColor: "border-primary",
      glowColor: "rgba(124,58,237,0.4)",
      textColor: "text-primary",
      popular: true,
    },
    {
      icon: Shield,
      color: "from-purple-500/20 to-pink-500/20",
      borderColor: "border-purple-500/30",
      glowColor: "rgba(168,85,247,0.3)",
      textColor: "text-purple-400",
      popular: false,
    },
  ];

  return products.map((product, index) => {
    const style = styleSeeds[index % styleSeeds.length] ?? styleSeeds[0];
    const features = [
      product.description,
      product.delivery_details ? `التسليم: ${product.delivery_details}` : null,
      "دعم فني مستمر",
    ].filter(Boolean) as string[];

    return {
      id: product.slug,
      name: product.title,
      subtitle: product.description || "خدمة رقمية احترافية",
      priceSar: Number(product.price_sar || 0),
      features,
      ...style,
    };
  });
}

function CountUp({ target, suffix = "", formatter }: { target: number; suffix?: string; formatter?: (value: number) => string }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true });

  useEffect(() => {
    if (!inView) return;
    let start = 0;
    const duration = 1800;
    const step = target / (duration / 16);
    const timer = setInterval(() => {
      start += step;
      if (start >= target) { setCount(target); clearInterval(timer); }
      else setCount(Math.floor(start));
    }, 16);
    return () => clearInterval(timer);
  }, [inView, target]);

  return <div ref={ref}>{formatter ? formatter(count) : `${count}${suffix}`}</div>;
}

function FloatingOrb({ className }: { className: string }) {
  return (
    <motion.div
      className={`absolute rounded-full blur-[80px] pointer-events-none ${className}`}
      animate={{ scale: [1, 1.2, 1], opacity: [0.4, 0.7, 0.4] }}
      transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
    />
  );
}

function MagneticCard({ children, className }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotateX = useSpring(useTransform(y, [-50, 50], [8, -8]), { stiffness: 300, damping: 30 });
  const rotateY = useSpring(useTransform(x, [-50, 50], [-8, 8]), { stiffness: 300, damping: 30 });

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    x.set(e.clientX - rect.left - rect.width / 2);
    y.set(e.clientY - rect.top - rect.height / 2);
  };
  const handleMouseLeave = () => { x.set(0); y.set(0); };

  return (
    <motion.div
      ref={ref}
      style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={className}
    >
      {children}
    </motion.div>
  );
}

const FAQ_ITEMS = [
  { q: "ما هي أنواع المشاريع التي يمكنكم تطويرها؟", a: "نطوّر تطبيقات الويب، تطبيقات الجوال، المتاجر الإلكترونية، لوحات التحكم، وأنظمة إدارة المحتوى. بإمكاننا تنفيذ أي فكرة رقمية ترغب بها." },
  { q: "كم يستغرق تنفيذ المشروع؟", a: "يعتمد الوقت على حجم المشروع وتعقيده. الباقة الأساسية تُسلَّم في 7 أيام، والمتقدمة خلال 14 يوماً، والاحترافية حسب نطاق العمل. سنوضح لك الجدول الزمني بدقة قبل البدء." },
  { q: "هل أحتاج خبرة تقنية للتعامل معكم؟", a: "لا على الإطلاق. نحن نتولى الجانب التقني بالكامل ونشرح لك كل شيء بلغة بسيطة. كل ما تحتاجه هو فكرتك وتواصلك معنا." },
  { q: "ما طرق الدفع المتاحة؟", a: "حالياً ندعم التحويل البنكي المحلي. يمكنك رفع إيصال التحويل مباشرةً من منصتنا وسيتم تأكيد الطلب خلال ساعات." },
  { q: "هل يوجد دعم بعد التسليم؟", a: "نعم. نوفر دعماً فنياً لأي مشكلة تقنية بعد التسليم. كذلك نقدم خدمات الصيانة والتطوير المستمر إن احتجت إضافة مزايا جديدة لاحقاً." },
  { q: "كيف أبدأ؟", a: "ببساطة اختر الباقة المناسبة من قسم الباقات، أضفها للسلة، وأكمل عملية الدفع. أو تواصل معنا مباشرةً عبر واتساب أو نموذج التواصل لمناقشة احتياجاتك." },
];

function FaqSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  return (
    <section id="faq" className="py-28 relative">
      <div className="max-w-3xl mx-auto px-4 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-secondary/30 bg-secondary/10 text-secondary text-xs font-semibold mb-5">
            الأسئلة الشائعة
          </span>
          <h2 className="text-3xl md:text-4xl font-black">
            كل ما تريد <span className="gradient-text">معرفته</span>
          </h2>
        </motion.div>
        <div className="space-y-3">
          {FAQ_ITEMS.map((item, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.06, duration: 0.4 }}
              className="glass-panel rounded-2xl border border-white/10 overflow-hidden"
            >
              <button
                onClick={() => setOpenIndex(openIndex === i ? null : i)}
                className="w-full flex items-center justify-between gap-4 p-5 text-right hover:bg-white/3 transition-colors"
              >
                <span className="font-semibold text-sm leading-relaxed">{item.q}</span>
                <ChevronDown
                  className={`w-4 h-4 text-primary shrink-0 transition-transform duration-300 ${openIndex === i ? "rotate-180" : ""}`}
                />
              </button>
              {openIndex === i && (
                <div className="px-5 pb-5 text-white/60 text-sm leading-7 border-t border-white/8 pt-4">
                  {item.a}
                </div>
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default function Home() {
  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);
  const { customer } = useAuth();
  const { toast } = useToast();

  const { scrollYProgress } = useScroll();
  const heroY = useTransform(scrollYProgress, [0, 0.3], [0, -80]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.25], [1, 0]);

  const handleWhatsApp = (e: React.FormEvent) => {
    e.preventDefault();
    const text =
      `مرحبا، عندي استفسار\n\n` +
      `الاسم: ${name}\n` +
      `الموضوع: ${subject}\n\n` +
      `الرسالة:\n${message}`;
    const url = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(text)}`;
    window.open(url, "_blank");
  };

  const [, navigate] = useLocation();

  const [storeSettings, setStoreSettings] = useState<StoreSettings | null>(null);
  const [storePackages, setStorePackages] = useState(packages);
  const [ratings, setRatings] = useState<Array<{ id: number; rating: number; review_text: string | null; customer_id: number; created_at: string }>>([]);
  const [homeContent, setHomeContent] = useState<HomeContent>({
    heroLine1: "أحوّل أفكارك إلى",
    heroLine2: "واقع رقمي مبهر",
    heroSubtitle: "مطور برمجيات محترف متخصص في بناء تطبيقات ويب وجوال متطورة، سريعة، ومصممة خصيصاً لتنمية أعمالك في العصر الرقمي.",
    packagesSubtitle: "خطط مدروسة لتناسب حجم مشروعك وميزانيتك",
    footerDescription: "مطور برمجيات محترف متخصص في بناء تطبيقات ويب وجوال متطورة وعصرية.",
    services: [
      { title: "تطوير المواقع الإلكترونية", desc: "مواقع سريعة، متجاوبة، ومبنية بأحدث التقنيات لتعكس احترافية علامتك التجارية." },
      { title: "تطوير تطبيقات الجوال", desc: "تطبيقات أصلية وهجينة توفر تجربة مستخدم سلسة على iOS و Android." },
      { title: "متاجر إلكترونية", desc: "منصات تجارة إلكترونية متكاملة مع بوابات دفع آمنة ولوحات تحكم." },
      { title: "تطوير APIs والخدمات الخلفية", desc: "بنى تحتية قوية وقابلة للتوسع لضمان أداء مستقر لتطبيقاتك." },
      { title: "تصميم واجهات المستخدم", desc: "تصاميم UX/UI حديثة تركز على سهولة الاستخدام وجاذبية المظهر." },
      { title: "الاستشارات التقنية", desc: "توجيه تقني لاختيار أفضل التقنيات لضمان نجاح مشروعك بأقل التكاليف." },
    ],
  });

  useEffect(() => {
    void (async () => {
      try {
        const [productsRes, settingsRes, contentRes, ratingsRes] = await Promise.all([
          fetch(`${BASE}/api/store/products`),
          fetch(`${BASE}/api/store/settings`),
          fetch(`${BASE}/api/store/content/home`),
          fetch(`${BASE}/api/ratings`),
        ]);

        if (productsRes.ok) {
          const productsData = await productsRes.json() as { products?: StoreProduct[] };
          const activeProducts = (productsData.products ?? []).filter((p) => p.is_active);
          if (activeProducts.length > 0) {
            setStorePackages(mapProductsToUi(activeProducts));
          }
        }

        if (settingsRes.ok) {
          const settingsData = await settingsRes.json() as { settings?: StoreSettings | null };
          setStoreSettings(settingsData.settings ?? null);
        }

        if (contentRes.ok) {
          const contentData = await contentRes.json() as { content?: { value?: Partial<HomeContent> } };
          const value = contentData.content?.value;
          if (value) {
            setHomeContent((prev) => ({ ...prev, ...value }));
          }
        }

        if (ratingsRes.ok) {
          const ratingsData = await ratingsRes.json() as { ratings?: Array<{ id: number; rating: number; review_text: string | null; customer_id: number; created_at: string }> };
          if (ratingsData.ratings) {
            setRatings(ratingsData.ratings);
          }
        }
      } catch {
        // Keep fallback values when API is unavailable.
      }
    })();
  }, []);

  useEffect(() => {
    if (!searchOpen) return;
    const timer = window.setTimeout(() => searchInputRef.current?.focus(), 120);
    return () => window.clearTimeout(timer);
  }, [searchOpen]);

  const whatsappNumber = storeSettings?.whatsapp_number || WHATSAPP_NUMBER;
  const storeName = storeSettings?.store_name || "REVO | ريفو";
  const supportEmail = storeSettings?.support_email || null;
  const currency = storeSettings?.currency || "SAR";
  const tiktokUrl = storeSettings?.tiktok_url || "https://tiktok.com/@studiodotcode";
  const instagramUrl = storeSettings?.instagram_url || "https://instagram.com/studiodotcode";

  const handlePackageNav = (pkgId: string) => {
    navigate(`/package/${pkgId}`);
  };

  const handleSearchClick = () => {
    const next = !searchOpen;
    setSearchOpen(next);
    if (next) scrollToSection("packages");
  };

  const handleAddToCart = (pkg: { id: string; name: string; subtitle: string; priceSar: number }) => {
    addToCart({
      id: pkg.id,
      name: pkg.name,
      subtitle: pkg.subtitle,
      priceSar: Number(pkg.priceSar || 0),
      currency,
    });

    toast({
      title: "تمت الإضافة إلى السلة",
      description: pkg.name,
    });
  };

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const normalizedSearch = searchQuery.trim().toLowerCase();
  const filteredPackages = storePackages.filter((pkg) => {
    if (!normalizedSearch) return true;
    const searchableText = [pkg.name, pkg.subtitle, ...pkg.features].join(" ").toLowerCase();
    return searchableText.includes(normalizedSearch);
  });

  const fadeUp = {
    initial: { opacity: 0, y: 40 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.7, ease: [0.25, 0.46, 0.45, 0.94] }
  };

  const stagger = {
    animate: { transition: { staggerChildren: 0.12 } }
  };

  const homeHeaderMenu = navLinks.map((link) => ({
    label: link.label,
    onClick: () => {
      if (link.href.startsWith("#")) {
        scrollToSection(link.href.replace("#", ""));
        return;
      }
      navigate(link.href);
    },
  }));

  return (
    <div className="min-h-screen bg-background overflow-x-hidden selection:bg-primary selection:text-white">
      {/* Ambient background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <FloatingOrb className="w-[600px] h-[600px] -top-40 -right-40 bg-primary/25" />
        <FloatingOrb className="w-[500px] h-[500px] top-1/2 -left-32 bg-secondary/20" />
        <FloatingOrb className="w-[700px] h-[700px] -bottom-60 left-1/3 bg-[#4a1082]/20" />
        {/* Grid overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(124,58,237,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(124,58,237,0.03)_1px,transparent_1px)] bg-[size:60px_60px]" />
      </div>

      {/* Scroll progress bar */}
      <motion.div
        className="fixed top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-primary via-secondary to-blue-400 z-[100] origin-left"
        style={{ scaleX: scrollYProgress }}
      />

      <PublicHeader onSearchClick={handleSearchClick} menuItems={homeHeaderMenu} />

      <AnimatePresence>
        {searchOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="relative z-20 overflow-hidden border-b border-white/10 glass-panel"
          >
            <div className="px-4 py-3 sm:px-6">
              <div className="relative max-w-xl mr-auto">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                <Input
                  ref={searchInputRef}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="ابحث عن الباقة المناسبة لك"
                  className="h-11 rounded-xl bg-white/5 border-white/15 pr-10 text-white placeholder:text-white/40"
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <main className="relative z-10">

        {/* ═══ HERO ═══ */}
        <section className="min-h-[95vh] flex items-center pt-16 pb-24 relative">
          <motion.div style={{ y: heroY, opacity: heroOpacity }} className="max-w-7xl mx-auto px-4 sm:px-6 w-full">
            <div className="max-w-4xl mx-auto text-center">

              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5 }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-panel mb-8 text-sm text-white/80"
              >
                <motion.span
                  className="relative flex h-3 w-3"
                  animate={{ scale: [1, 1.3, 1] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                >
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-secondary opacity-75" />
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-secondary" />
                </motion.span>
                متاح لاستقبال مشاريع جديدة
              </motion.div>

              <div className="overflow-hidden mb-2">
                <motion.h1
                  className="text-5xl md:text-7xl lg:text-8xl font-black leading-tight"
                  initial={{ y: 120 }}
                  animate={{ y: 0 }}
                  transition={{ duration: 0.8, delay: 0.1, ease: [0.25, 0.46, 0.45, 0.94] }}
                >
                  {homeContent.heroLine1}
                </motion.h1>
              </div>
              <div className="overflow-hidden mb-8">
                <motion.h1
                  className="text-5xl md:text-7xl lg:text-8xl font-black leading-tight gradient-text"
                  initial={{ y: 120 }}
                  animate={{ y: 0 }}
                  transition={{ duration: 0.8, delay: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
                >
                  {homeContent.heroLine2}
                </motion.h1>
              </div>

              <motion.p
                className="text-lg md:text-xl text-white/60 mb-12 max-w-2xl mx-auto leading-relaxed"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.4 }}
              >
                {homeContent.heroSubtitle}
              </motion.p>

              <motion.div
                className="flex flex-col sm:flex-row items-center justify-center gap-4"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.5 }}
              >
                <motion.a href="#contact" whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }}>
                  <Button size="lg" className="h-14 px-10 text-lg rounded-full bg-primary hover:bg-primary/90 text-white shadow-[0_0_30px_rgba(124,58,237,0.5)] hover:shadow-[0_0_50px_rgba(124,58,237,0.7)] transition-all">
                    ابدأ مشروعك الآن
                    <ChevronLeft className="mr-2 w-5 h-5" />
                  </Button>
                </motion.a>
                <motion.a href="#services" whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }}>
                  <Button size="lg" variant="outline" className="h-14 px-10 text-lg rounded-full border-white/15 hover:bg-white/5 glass-panel">
                    استعرض خدماتي
                  </Button>
                </motion.a>
              </motion.div>
            </div>
          </motion.div>

          {/* Floating shapes decoration */}
          <motion.div
            className="absolute left-8 top-1/3 w-4 h-4 rounded-full bg-secondary/60 hidden lg:block"
            animate={{ y: [-20, 20, -20], opacity: [0.6, 1, 0.6] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            className="absolute right-12 top-1/2 w-6 h-6 rounded-full border-2 border-primary/50 hidden lg:block"
            animate={{ y: [20, -20, 20], rotate: [0, 180, 360] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            className="absolute left-1/4 bottom-24 w-3 h-3 rounded-sm bg-primary/40 hidden lg:block"
            animate={{ y: [-15, 15, -15], rotate: [0, 90, 0] }}
            transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
          />
        </section>

        {/* ═══ SERVICES ═══ */}
        <section id="services" className="py-28 relative">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <motion.div
              initial="initial"
              whileInView="animate"
              viewport={{ once: true, margin: "-80px" }}
              variants={fadeUp}
              className="text-center mb-20"
            >
              <motion.span
                className="inline-block text-sm font-semibold tracking-widest text-secondary uppercase mb-4 opacity-80"
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
              >
                ما أقدمه
              </motion.span>
              <h2 className="text-3xl md:text-5xl font-bold mb-4">
                خدمات <span className="text-primary">برمجية متكاملة</span>
              </h2>
              <p className="text-white/50 max-w-xl mx-auto">
                كل ما تحتاجه لبناء وتطوير منتجك التقني بأعلى معايير الجودة
              </p>
            </motion.div>

            <motion.div
              initial="initial"
              whileInView="animate"
              viewport={{ once: true }}
              variants={stagger}
              className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6"
            >
              {homeContent.services.map((service, idx) => {
                const serviceIcons = [LayoutTemplate, Smartphone, ShoppingCart, Database, Code2, Lightbulb];
                const Icon = serviceIcons[idx % serviceIcons.length] ?? LayoutTemplate;
                return (
                <motion.div
                  key={idx}
                  variants={fadeUp}
                  whileHover={{ y: -8, scale: 1.02 }}
                  className="glass-panel p-8 rounded-3xl glow-box group relative overflow-hidden cursor-default"
                >
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-br from-primary/5 to-secondary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                  />
                  <div className="relative z-10">
                    <motion.div
                      className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center mb-6 group-hover:bg-primary/20 transition-colors duration-300"
                      whileHover={{ rotate: [0, -10, 10, 0] }}
                      transition={{ duration: 0.4 }}
                    >
                      <Icon className="w-7 h-7 text-secondary group-hover:text-primary transition-colors duration-300" />
                    </motion.div>
                    <h3 className="text-xl font-bold mb-3">{service.title}</h3>
                    <p className="text-white/55 leading-relaxed text-sm">{service.desc}</p>
                  </div>
                </motion.div>
              );})}
            </motion.div>
          </div>
        </section>

        {/* ═══ PACKAGES ═══ */}
        <section id="packages" className="py-28 relative z-10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <motion.div
              initial="initial"
              whileInView="animate"
              viewport={{ once: true }}
              variants={fadeUp}
              className="text-center mb-20"
            >
              <motion.span
                className="inline-block text-sm font-semibold tracking-widest text-secondary uppercase mb-4 opacity-80"
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
              >
                الأسعار
              </motion.span>
              <h2 className="text-3xl md:text-5xl font-bold mb-4">
                اختر <span className="text-secondary">باقتك المناسبة</span>
              </h2>
              <p className="text-white/50 max-w-xl mx-auto">{homeContent.packagesSubtitle}</p>
            </motion.div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-center max-w-5xl mx-auto">
              {filteredPackages.map((pkg, idx) => {
                const Icon = pkg.icon;
                return (
                  <MagneticCard key={pkg.id} className="relative">
                    <motion.div
                      initial={{ opacity: 0, y: 60, scale: 0.9 }}
                      whileInView={{ opacity: 1, y: pkg.popular ? -16 : 0, scale: 1 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.7, delay: idx * 0.15, ease: [0.25, 0.46, 0.45, 0.94] }}
                      onClick={() => handlePackageNav(pkg.id)}
                      className={`relative glass-panel rounded-3xl overflow-hidden border ${pkg.borderColor} ${pkg.popular ? "shadow-[0_0_60px_rgba(124,58,237,0.3)] border-2" : ""} cursor-pointer`}
                    >
                      {/* Animated gradient bg */}
                      <motion.div
                        className={`absolute inset-0 bg-gradient-to-br ${pkg.color} opacity-60`}
                        animate={{ opacity: [0.4, 0.7, 0.4] }}
                        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", delay: idx * 0.5 }}
                      />

                      {/* Shimmer effect */}
                      {pkg.popular && (
                        <motion.div
                          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -skew-x-12"
                          animate={{ x: ["-200%", "200%"] }}
                          transition={{ duration: 3, repeat: Infinity, ease: "linear", repeatDelay: 2 }}
                        />
                      )}

                      {/* Popular badge */}
                      {pkg.popular && (
                        <motion.div
                          className="absolute -top-px left-0 right-0 flex justify-center"
                          initial={{ y: -20, opacity: 0 }}
                          whileInView={{ y: 0, opacity: 1 }}
                          viewport={{ once: true }}
                          transition={{ delay: 0.5 }}
                        >
                          <div className="bg-gradient-to-r from-primary to-secondary px-6 py-1.5 rounded-b-2xl text-xs font-bold shadow-lg">
                            الاكثر طلبا
                          </div>
                        </motion.div>
                      )}

                      <div className="relative z-10 p-8 pt-10">
                        {/* Icon */}
                        <motion.div
                          className={`w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center mb-6`}
                          whileHover={{ rotate: 360, scale: 1.1 }}
                          transition={{ duration: 0.6 }}
                          animate={pkg.popular ? { boxShadow: [`0 0 0px ${pkg.glowColor}`, `0 0 20px ${pkg.glowColor}`, `0 0 0px ${pkg.glowColor}`] } : {}}
                        >
                          <Icon className={`w-7 h-7 ${pkg.textColor}`} />
                        </motion.div>

                        <h3 className={`text-2xl font-bold mb-1 ${pkg.popular ? "text-white" : ""}`}>{pkg.name}</h3>
                        <p className="text-white/50 text-sm mb-8">{pkg.subtitle}</p>

                        <div className="mb-6 inline-flex items-baseline gap-2 rounded-2xl border border-white/15 bg-black/20 px-4 py-2">
                          <span className={`text-3xl font-black ${pkg.textColor}`}>{pkg.priceSar ?? 0}</span>
                          <span className="text-sm text-white/60">{currency}</span>
                        </div>

                        <ul className="space-y-4 mb-10">
                          {pkg.features.map((feature, fi) => (
                            <motion.li
                              key={fi}
                              initial={{ opacity: 0, x: 20 }}
                              whileInView={{ opacity: 1, x: 0 }}
                              viewport={{ once: true }}
                              transition={{ delay: idx * 0.15 + fi * 0.08 }}
                              className="flex items-center gap-3 text-white/80"
                            >
                              <motion.div
                                whileHover={{ scale: 1.3, rotate: 360 }}
                                transition={{ duration: 0.3 }}
                              >
                                <CheckCircle2 className={`w-5 h-5 shrink-0 ${pkg.textColor}`} />
                              </motion.div>
                              <span className="text-sm font-medium">{feature}</span>
                            </motion.li>
                          ))}
                        </ul>

                        <div className="flex gap-2">
                          <motion.div className="flex-1" whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                            <Button
                              onClick={() => handlePackageNav(pkg.id)}
                              className={`w-full h-13 rounded-2xl font-bold text-base transition-all duration-300 ${
                                pkg.popular
                                  ? "bg-gradient-to-r from-primary to-secondary hover:opacity-90 text-white shadow-[0_0_25px_rgba(124,58,237,0.5)]"
                                  : "glass-panel hover:bg-white/15 border border-white/15 text-white"
                              }`}
                            >
                              اطلب هذه الباقة
                            </Button>
                          </motion.div>
                          <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                            <Button
                              onClick={(e) => { e.stopPropagation(); handleAddToCart(pkg); }}
                              variant="outline"
                              className="h-13 w-13 rounded-2xl border-white/20 bg-white/5 hover:bg-white/10"
                              aria-label="إضافة إلى السلة"
                              title="إضافة إلى السلة"
                            >
                              <Plus className="w-5 h-5" />
                            </Button>
                          </motion.div>
                        </div>
                      </div>

                      {/* Corner decoration */}
                      <motion.div
                        className={`absolute bottom-0 left-0 w-24 h-24 rounded-tr-full bg-gradient-to-tr ${pkg.color} opacity-30`}
                        animate={{ scale: [1, 1.2, 1] }}
                        transition={{ duration: 4, repeat: Infinity, delay: idx * 0.5 }}
                      />
                    </motion.div>
                  </MagneticCard>
                );
              })}
            </div>
            {filteredPackages.length === 0 && (
              <div className="max-w-2xl mx-auto mt-8 glass-panel border border-white/10 rounded-2xl p-6 text-center">
                <p className="text-white/70">لا توجد نتائج مطابقة للبحث الحالي.</p>
                <button
                  onClick={() => setSearchQuery("")}
                  className="mt-3 text-primary text-sm font-semibold hover:underline"
                >
                  مسح البحث وعرض جميع الباقات
                </button>
              </div>
            )}
          </div>
        </section>

        {/* ═══ WHY ME / STATS ═══ */}
        <section id="stats" className="py-28 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/5 to-transparent pointer-events-none" />
          <div className="max-w-7xl mx-auto px-4 sm:px-6 relative z-10">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
              <motion.div
                initial={{ opacity: 0, x: 60 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8, ease: [0.25, 0.46, 0.45, 0.94] }}
              >
                <motion.span
                  className="inline-block text-sm font-semibold tracking-widest text-secondary uppercase mb-4 opacity-80"
                  initial={{ opacity: 0 }}
                  whileInView={{ opacity: 1 }}
                  viewport={{ once: true }}
                >
                  لماذا أنا
                </motion.span>
                <h2 className="text-3xl md:text-5xl font-bold mb-6">
                  لماذا <span className="gradient-text">تختارني؟</span>
                </h2>
                <p className="text-white/60 mb-10 leading-relaxed">
                  لا أقدم مجرد سطور من الأكواد، بل حلولاً تقنية ذكية مصممة خصيصاً لحل مشكلاتك وتنمية أعمالك.
                </p>
                <div className="space-y-6">
                  {[
                    { title: "جودة لا يعلى عليها", desc: "كود نظيف، قابل للصيانة والتطوير مستقبلاً." },
                    { title: "التزام بالمواعيد", desc: "احترام تام للجدول الزمني المتفق عليه." },
                    { title: "تواصل شفاف", desc: "متابعة مستمرة وإطلاع دائم على سير العمل." }
                  ].map((item, i) => (
                    <motion.div
                      key={i}
                      className="flex gap-4 group"
                      initial={{ opacity: 0, x: 40 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: i * 0.15, duration: 0.6 }}
                      whileHover={{ x: -4 }}
                    >
                      <motion.div
                        className="w-12 h-12 shrink-0 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-primary/20 transition-colors"
                        whileHover={{ rotate: 360 }}
                        transition={{ duration: 0.5 }}
                      >
                        <CheckCircle2 className="w-6 h-6 text-primary" />
                      </motion.div>
                      <div>
                        <h4 className="text-xl font-bold mb-1">{item.title}</h4>
                        <p className="text-white/55 text-sm">{item.desc}</p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>

              <motion.div
                className="grid grid-cols-2 sm:grid-cols-3 gap-4 md:gap-6"
                initial={{ opacity: 0, x: -60 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8 }}
              >
                {[
                  { target: 50, suffix: "+", label: "مشروع مكتمل" },
                  { target: 100, suffix: "%", label: "رضا العملاء" },
                  { target: 5, suffix: "+", label: "سنوات خبرة" },
                  {
                    target: 247,
                    label: "دعم فني",
                    formatter: (value: number) => `${Math.floor(value / 10)}/${value % 10}`,
                  },
                ].map((stat, i) => (
                  <motion.div
                    key={i}
                    className="glass-panel p-8 rounded-3xl text-center glow-box relative overflow-hidden group"
                    initial={{ opacity: 0, scale: 0.7 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.1, duration: 0.5, type: "spring", stiffness: 200 }}
                    whileHover={{ scale: 1.05, y: -4 }}
                  >
                    <motion.div
                      className="absolute inset-0 bg-gradient-to-br from-primary/10 to-secondary/10 opacity-0 group-hover:opacity-100 transition-opacity"
                    />
                    <div className="text-4xl md:text-5xl font-black gradient-text mb-2 relative z-10">
                      <CountUp target={stat.target} suffix={stat.suffix} formatter={stat.formatter} />
                    </div>
                    <div className="text-sm font-medium text-white/70 relative z-10">
                      {stat.label}
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            </div>
          </div>
        </section>

        {/* ═══ REVIEWS ═══ */}
        <section id="reviews" className="py-28 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/3 to-transparent pointer-events-none" />
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="text-center mb-16"
            >
              <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-primary/30 bg-primary/10 text-primary text-xs font-semibold mb-5">
                <Star className="w-3.5 h-3.5 fill-primary" />
                آراء العملاء
              </span>
              <h2 className="text-3xl md:text-4xl font-black">
                ماذا يقول <span className="gradient-text">عملاؤنا</span>
              </h2>
              <p className="text-white/55 mt-3 max-w-xl mx-auto text-sm leading-relaxed">
                تجارب حقيقية من عملاء وثقوا بنا وحولنا أفكارهم إلى منتجات رقمية ناجحة
              </p>
            </motion.div>
            
            {ratings.length > 0 ? (
              <RatingsCarousel ratings={ratings} autoplay={true} autoplayDelay={5000} />
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-5">
                {([
                  { name: "أحمد الشمري", role: "صاحب متجر إلكتروني", text: "تجربة استثنائية! التطبيق اكتمل في الوقت المحدد وبجودة تفوق توقعاتي. التواصل كان سلساً وسريع الاستجابة طوال مدة المشروع.", stars: 5 },
                  { name: "نورة القحطاني", role: "مؤسسة شركة ناشئة", text: "أنجز لي متجراً متكاملاً بواجهة احترافية وأنظمة دفع موثوقة. النتيجة جاوزت التوقعات ومبيعاتي ارتفعت بشكل ملحوظ.", stars: 5 },
                  { name: "فيصل العتيبي", role: "مطور محتوى رقمي", text: "خدمة ممتازة وسعر مناسب جداً. المنتج الذي سلّمه كان نظيفاً ومنظماً. سأتعامل معه مرة أخرى بكل تأكيد.", stars: 5 },
                  { name: "سارة المطيري", role: "مديرة علامة تجارية", text: "كان فاهماً لمتطلباتي من البداية وقدّم اقتراحات ذكية حسّنت المشروع كثيراً. وقت التسليم كان مضبوطاً تماماً.", stars: 5 },
                  { name: "محمد الدوسري", role: "رائد أعمال", text: "صمّم لي تطبيقاً بتقنية حديثة وأداء سريع. الدعم بعد التسليم كان رائعاً وحلّ كل ملاحظاتي الصغيرة.", stars: 5 },
                  { name: "هند العنزي", role: "صاحبة مشروع تعليمي", text: "التعامل كان احترافياً من أول لحظة. أنجز منصتي التعليمية بتصميم جميل وكل الميزات التي طلبتها بدون أي تعقيد.", stars: 5 },
                ] as { name: string; role: string; text: string; stars: number }[]).map((review, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 40 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.08, duration: 0.5 }}
                    className="glass-panel rounded-2xl p-5 border border-white/10 flex flex-col gap-3 hover:border-primary/30 transition-colors"
                  >
                    <Quote className="w-6 h-6 text-primary/50" />
                    <p className="text-white/70 text-sm leading-7 flex-1">{review.text}</p>
                    <div className="flex gap-0.5">
                      {Array.from({ length: review.stars }).map((_, si) => (
                        <Star key={si} className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
                      ))}
                    </div>
                    <div className="border-t border-white/8 pt-3">
                      <p className="font-semibold text-sm">{review.name}</p>
                      <p className="text-white/40 text-xs">{review.role}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* ═══ FAQ ═══ */}
        <FaqSection />

        {/* ═══ CONTACT ═══ */}
        <section id="contact" className="py-28 relative">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <motion.div
              initial={{ opacity: 0, y: 60, scale: 0.95 }}
              whileInView={{ opacity: 1, y: 0, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, ease: [0.25, 0.46, 0.45, 0.94] }}
              className="max-w-2xl mx-auto glass-panel p-8 md:p-14 rounded-[2.5rem] relative overflow-hidden border border-primary/25"
            >
              <motion.div
                className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-secondary/10"
                animate={{ opacity: [0.5, 0.9, 0.5] }}
                transition={{ duration: 4, repeat: Infinity }}
              />
              <motion.div
                className="absolute -top-20 -right-20 w-40 h-40 rounded-full bg-primary/20 blur-3xl"
                animate={{ scale: [1, 1.4, 1] }}
                transition={{ duration: 3, repeat: Infinity }}
              />

              <div className="relative z-10 text-center">
                <motion.h2
                  className="text-3xl md:text-4xl font-bold mb-4"
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                >
                  هل أنت جاهز لبدء <span className="text-secondary">مشروعك؟</span>
                </motion.h2>
                <p className="text-white/60 mb-10 leading-relaxed">
                  تواصل معي الآن للحصول على استشارة مجانية وتحويل فكرتك إلى منتج رقمي ناجح.
                </p>

                <form className="space-y-5 text-right" onSubmit={handleWhatsApp}>
                  {[
                    { label: "الاسم الكريم", placeholder: "أدخل اسمك الكريم", value: name, onChange: setName, type: "input" },
                    { label: "عنوان الرسالة", placeholder: "موضوع رسالتك أو طلبك", value: subject, onChange: setSubject, type: "input" },
                  ].map((field, i) => (
                    <motion.div
                      key={i}
                      className="space-y-1.5"
                      initial={{ opacity: 0, x: 20 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: i * 0.1 }}
                    >
                      <label className="text-sm font-semibold text-white/70 block">{field.label}</label>
                      <Input
                        required
                        placeholder={field.placeholder}
                        value={field.value}
                        onChange={(e) => field.onChange(e.target.value)}
                        className="bg-white/5 border-white/15 h-14 rounded-xl text-white placeholder:text-white/25 focus-visible:ring-primary/50 focus-visible:border-primary transition-all"
                      />
                    </motion.div>
                  ))}
                  <motion.div
                    className="space-y-1.5"
                    initial={{ opacity: 0, x: 20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.2 }}
                  >
                    <label className="text-sm font-semibold text-white/70 block">نص الرسالة</label>
                    <Textarea
                      required
                      placeholder="اكتب تفاصيل مشروعك أو فكرتك هنا..."
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      className="bg-white/5 border-white/15 min-h-[140px] rounded-xl text-white placeholder:text-white/25 focus-visible:ring-primary/50 focus-visible:border-primary resize-none transition-all"
                    />
                  </motion.div>

                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Button
                      type="submit"
                      className="w-full h-14 rounded-xl bg-gradient-to-r from-primary to-secondary hover:opacity-90 text-white text-lg font-bold shadow-[0_0_25px_rgba(124,58,237,0.4)] transition-all flex items-center justify-center gap-3 mt-2"
                    >
                      <Send className="w-5 h-5 rotate-180" />
                      <span>ارسال عبر واتساب</span>
                    </Button>
                  </motion.div>
                </form>
              </div>
            </motion.div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/5 mt-12 relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-14">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10 mb-10">

            {/* Brand */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <div className="flex items-center gap-2 mb-4">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-[0_0_15px_rgba(124,58,237,0.4)]">
                  <TerminalSquare className="w-5 h-5 text-white" />
                </div>
                <span className="font-bold text-xl">{storeName}</span>
              </div>
              <p className="text-white/40 text-sm leading-relaxed">{homeContent.footerDescription}</p>
            </motion.div>

            {/* Contact */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
            >
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
                    <div className="text-xs text-white/35">{whatsappNumber || "أضفه من الإعدادات"}</div>
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
            </motion.div>

            {/* Social */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
            >
              <h4 className="font-bold text-white/80 mb-5">تابعنا</h4>
              <div className="flex gap-3">
                {tiktokUrl && (
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
                )}
                {instagramUrl && (
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
                )}
              </div>
            </motion.div>
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
