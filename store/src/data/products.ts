export interface Product {
  id: number;
  name: string;
  nameEn: string;
  price: number;
  originalPrice?: number;
  category: string;
  rating: number;
  reviews: number;
  icon: string;
  gradient: string;
  description: string;
  features: string[];
  deliveryDays: number;
  badge?: string;
  popular?: boolean;
}

export const categories = [
  { id: "all", label: "الكل" },
  { id: "design", label: "تصميم" },
  { id: "dev", label: "برمجة" },
  { id: "motion", label: "موشن" },
  { id: "brand", label: "هوية" },
  { id: "ai", label: "ذكاء اصطناعي" },
  { id: "seo", label: "سيو" },
];

export const products: Product[] = [
  {
    id: 1,
    name: "تصميم واجهة تطبيق",
    nameEn: "UI/UX App Design",
    price: 299,
    originalPrice: 499,
    category: "design",
    rating: 4.9,
    reviews: 1284,
    icon: "⬡",
    gradient: "from-cyan-500 to-blue-600",
    description: "تصميم واجهات تطبيقات موبايل وويب احترافية بتجربة مستخدم مذهلة. نقدم تصاميم عصرية وعملية تبرز علامتك التجارية.",
    features: ["شاشات UI كاملة", "Prototype تفاعلي", "ملفات Figma", "3 جولات تعديل", "تسليم خلال 5 أيام"],
    deliveryDays: 5,
    badge: "خصم 40%",
    popular: true,
  },
  {
    id: 2,
    name: "موقع ويب متكامل",
    nameEn: "Full-Stack Website",
    price: 1499,
    category: "dev",
    rating: 4.8,
    reviews: 643,
    icon: "◈",
    gradient: "from-violet-500 to-purple-700",
    description: "تطوير مواقع ويب احترافية بأحدث التقنيات. سرعة فائقة، تصميم متجاوب، وتجربة مستخدم استثنائية.",
    features: ["React / Next.js", "لوحة تحكم", "API متكاملة", "SEO محسّن", "استضافة شهر مجانية"],
    deliveryDays: 14,
    popular: true,
  },
  {
    id: 3,
    name: "هوية بصرية كاملة",
    nameEn: "Brand Identity",
    price: 799,
    originalPrice: 1100,
    category: "brand",
    rating: 4.9,
    reviews: 921,
    icon: "◉",
    gradient: "from-pink-500 to-rose-600",
    description: "هوية بصرية متكاملة تعكس روح علامتك التجارية. شعار، ألوان، خطوط، وكل ما تحتاجه لتميّز حضورك.",
    features: ["شعار احترافي", "دليل الهوية", "قوالب السوشيال", "بطاقة أعمال", "5 تصاميم مقترحة"],
    deliveryDays: 7,
    badge: "خصم 27%",
  },
  {
    id: 4,
    name: "فيديو موشن جرافيك",
    nameEn: "Motion Graphics Video",
    price: 449,
    category: "motion",
    rating: 4.7,
    reviews: 502,
    icon: "▲",
    gradient: "from-amber-500 to-orange-600",
    description: "فيديوهات موشن جرافيك احترافية تروي قصة منتجك بأسلوب بصري مذهل ومؤثر يجذب العملاء.",
    features: ["مدة 60-90 ثانية", "صوت وموسيقى", "4K جودة", "ملفات مفتوحة", "تعديلان مجانيان"],
    deliveryDays: 10,
    popular: true,
  },
  {
    id: 5,
    name: "تطبيق موبايل",
    nameEn: "Mobile Application",
    price: 2999,
    originalPrice: 3999,
    category: "dev",
    rating: 4.9,
    reviews: 218,
    icon: "⬟",
    gradient: "from-emerald-500 to-teal-600",
    description: "تطوير تطبيقات موبايل لـ iOS وAndroid بتقنية React Native. أداء عالٍ وتجربة مستخدم سلسة.",
    features: ["iOS + Android", "لوحة تحكم", "إشعارات push", "دفع إلكتروني", "سنة دعم مجاني"],
    deliveryDays: 30,
    badge: "خصم 25%",
  },
  {
    id: 6,
    name: "حملة سوشيال ميديا",
    nameEn: "Social Media Campaign",
    price: 599,
    category: "design",
    rating: 4.6,
    reviews: 387,
    icon: "◆",
    gradient: "from-sky-500 to-cyan-600",
    description: "تصميم حملات سوشيال ميديا متكاملة. بوستات، ستوريز، وإعلانات بجودة احترافية تجذب الجمهور.",
    features: ["30 تصميم شهري", "قوالب قابلة للتعديل", "تغطية كل المنصات", "كوبي رايتنج", "جدول نشر"],
    deliveryDays: 3,
  },
  {
    id: 7,
    name: "نظام ذكاء اصطناعي",
    nameEn: "AI Integration System",
    price: 1999,
    category: "ai",
    rating: 5.0,
    reviews: 89,
    icon: "✦",
    gradient: "from-fuchsia-500 to-violet-700",
    description: "دمج حلول الذكاء الاصطناعي في منصتك. Chatbot ذكي، تحليل بيانات، وأتمتة العمليات.",
    features: ["ChatBot مخصص", "تحليل البيانات", "API للـ AI", "تدريب النموذج", "تقارير تفاعلية"],
    deliveryDays: 21,
    badge: "حصري",
    popular: true,
  },
  {
    id: 8,
    name: "تحسين SEO متقدم",
    nameEn: "Advanced SEO Optimization",
    price: 349,
    originalPrice: 499,
    category: "seo",
    rating: 4.7,
    reviews: 734,
    icon: "◎",
    gradient: "from-lime-500 to-green-600",
    description: "تحسين محركات البحث بشكل متكامل ومتقدم. استراتيجية محتوى، بناء روابط، وتحسين تقني كامل.",
    features: ["تحليل كامل للموقع", "كلمات مفتاحية", "بناء روابط", "تقرير شهري", "ضمان نتائج 3 أشهر"],
    deliveryDays: 7,
    badge: "خصم 30%",
  },
];
