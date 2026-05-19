export type FilterKey = "all" | "programming" | "design" | "ecommerce" | "courses";

export interface FilterItem {
  key: FilterKey;
  label: string;
}

export interface ProductItem {
  id: number;
  slug: string;
  category: Exclude<FilterKey, "all">;
  categoryLabel: string;
  badge: string;
  icon: string;
  gallery: string[];
  title: string;
  description: string;
  fullDescription: string;
  cta: string;
  delay: number;
  price: number;
  oldPrice?: number;
  rating: number;
  reviewsCount: number;
  deliveryTime: string;
  supportLabel: string;
  features: string[];
  requirements: string[];
}

export const filters: FilterItem[] = [
  { key: "all", label: "الكل" },
  { key: "programming", label: "البرمجة" },
  { key: "design", label: "التصميم" },
  { key: "ecommerce", label: "التجارة الإلكترونية" },
  { key: "courses", label: "الدورات" },
];

export const products: ProductItem[] = [
  {
    id: 1,
    slug: "web-profile-site",
    category: "programming",
    categoryLabel: "البرمجة",
    badge: "الأكثر طلباً",
    icon: "💻",
    gallery: ["💻", "📱", "⚙️", "🚀"],
    title: "برمجة موقع تعريفي",
    description: "موقع تفاعلي وسريع متوافق مع كافة الشاشات يعكس احترافية عملك.",
    fullDescription:
      "نقدم لك خدمة برمجة موقع تعريفي متكامل يعكس هوية مشروعك بأحدث التقنيات، مع تجربة استخدام سلسة وتصميم متجاوب ومحسن لمحركات البحث لرفع حضور علامتك التجارية.",
    cta: "طلب الخدمة",
    delay: 0.1,
    price: 1499,
    oldPrice: 2000,
    rating: 4.8,
    reviewsCount: 120,
    deliveryTime: "خلال 5 إلى 7 أيام",
    supportLabel: "دعم فني لمدة شهرين",
    features: [
      "تصميم واجهات UI/UX عصرية ومريحة للعين.",
      "لوحة تحكم سهلة لإدارة المحتوى.",
      "أداء سريع وأكواد نظيفة خالية من الأخطاء.",
      "ربط مع وسائل التواصل الاجتماعي وخرائط جوجل.",
      "دعم فني مجاني لمدة شهرين بعد التسليم.",
    ],
    requirements: [
      "شعار الشركة بصيغة عالية الجودة.",
      "المحتوى النصي الأساسي للصفحات.",
      "بيانات التواصل الرسمية.",
      "ألوان الهوية البصرية أو النمط المفضل.",
    ],
  },
  {
    id: 2,
    slug: "ai-brand-identity",
    category: "design",
    categoryLabel: "التصميم",
    badge: "هوية متكاملة",
    icon: "🎨",
    gallery: ["🎨", "✨", "🧠", "🖼️"],
    title: "تصميم هوية بصرية بالذكاء الاصطناعي",
    description: "ابتكار هوية بصرية فريدة تعبر عن علامتك التجارية بأحدث تقنيات الـ AI.",
    fullDescription:
      "نطوّر لك هوية بصرية متكاملة تبدأ من الفكرة وتنتهي بملفات جاهزة للاستخدام، مع دمج ذكي بين الرؤية الإبداعية والأدوات الحديثة لتسريع الإنجاز ورفع الجودة.",
    cta: "طلب الخدمة",
    delay: 0.2,
    price: 1199,
    oldPrice: 1650,
    rating: 4.7,
    reviewsCount: 86,
    deliveryTime: "خلال 4 إلى 6 أيام",
    supportLabel: "مراجعتان بعد التسليم",
    features: [
      "اقتراحات متعددة للشعار والاتجاه البصري.",
      "اختيار ألوان وخطوط متناسقة مع الهوية.",
      "تصميم تطبيقات أساسية مثل البطاقات والمنشورات.",
      "ملفات نهائية مناسبة للطباعة والنشر الرقمي.",
      "جلسة مراجعة وتعديلات منظمة قبل التسليم.",
    ],
    requirements: [
      "نبذة عن النشاط والجمهور المستهدف.",
      "أي أمثلة أو مراجع قريبة من ذوقك.",
      "الألوان أو العناصر التي تفضلها أو ترفضها.",
    ],
  },
  {
    id: 3,
    slug: "store-launch-service",
    category: "ecommerce",
    categoryLabel: "التجارة الإلكترونية",
    badge: "إطلاق شامل",
    icon: "🛒",
    gallery: ["🛒", "📦", "💳", "📊"],
    title: "إدارة وتأسيس المتاجر",
    description: "تجهيز متجرك بالكامل من الصفر وحتى إطلاق أول حملة مبيعات بنجاح.",
    fullDescription:
      "خدمة شاملة لإطلاق متجر إلكتروني جاهز للبيع، تشمل إعداد المنتجات والتنظيم والصفحات المهمة وربط الدفع والشحن وتجهيز الأساس التسويقي للانطلاقة الأولى.",
    cta: "طلب الخدمة",
    delay: 0.3,
    price: 2499,
    oldPrice: 3200,
    rating: 4.9,
    reviewsCount: 142,
    deliveryTime: "خلال 7 إلى 10 أيام",
    supportLabel: "متابعة تشغيلية بعد الإطلاق",
    features: [
      "إعداد البنية الكاملة للمتجر.",
      "تنظيم الأقسام والمنتجات والخيارات.",
      "ربط وسائل الدفع والشحن.",
      "تهيئة الصفحات الأساسية وسياسات المتجر.",
      "إرشاد تشغيلي قبل الإطلاق.",
    ],
    requirements: [
      "بيانات النشاط التجاري.",
      "قائمة المنتجات أو الخدمات.",
      "صور المنتجات إن وجدت.",
      "وسيلة الدفع والشحن المفضلة.",
    ],
  },
  {
    id: 4,
    slug: "motion-graphics-course",
    category: "courses",
    categoryLabel: "الدورات",
    badge: "محتوى تطبيقي",
    icon: "🎓",
    gallery: ["🎓", "🎬", "📚", "🚀"],
    title: "دورة احتراف الموشن جرافيك",
    description: "تعلم كيف تحرك العناصر وتبني فيديوهات إعلانية تزيد من مبيعاتك.",
    fullDescription:
      "دورة عملية مكثفة تشرح لك مبادئ التحريك، بناء المشاهد الإعلانية، وإخراج الفيديوهات بشكل احترافي مع أمثلة تطبيقية تساعدك على التنفيذ الفوري.",
    cta: "اشترك الآن",
    delay: 0.4,
    price: 699,
    oldPrice: 950,
    rating: 4.6,
    reviewsCount: 64,
    deliveryTime: "وصول فوري بعد التسجيل",
    supportLabel: "ملفات وقوالب مرفقة",
    features: [
      "شرح منظم من البداية إلى المستوى المتقدم.",
      "مشاريع تطبيقية قابلة للتنفيذ مباشرة.",
      "قوالب وأفكار جاهزة للتعديل.",
      "توجيه عملي لتحسين جودة الإخراج النهائي.",
    ],
    requirements: [
      "جهاز مناسب لتشغيل برامج التصميم والتحريك.",
      "أساسيات بسيطة في التعامل مع الحاسب.",
      "رغبة في التطبيق العملي أثناء التعلم.",
    ],
  },
  {
    id: 5,
    slug: "dashboard-systems",
    category: "programming",
    categoryLabel: "البرمجة",
    badge: "مخصص للأعمال",
    icon: "⚙️",
    gallery: ["⚙️", "📈", "🗂️", "🔐"],
    title: "تطوير أنظمة إدارة (Dashboard)",
    description: "لوحات تحكم برمجية خاصة لإدارة بياناتك وعملائك بكل سهولة وأمان.",
    fullDescription:
      "نصمم ونبني لك نظام إدارة مخصص يناسب سير عملك بدقة، مع واجهات واضحة وصلاحيات منظمة وتقارير تساعدك على اتخاذ القرار بشكل أسرع.",
    cta: "طلب الخدمة",
    delay: 0.1,
    price: 2899,
    oldPrice: 3700,
    rating: 4.8,
    reviewsCount: 91,
    deliveryTime: "خلال 10 إلى 14 يوماً",
    supportLabel: "بناء مرن قابل للتوسع",
    features: [
      "صلاحيات متعددة للمستخدمين.",
      "لوحات بيانات وتقارير تشغيلية.",
      "نماذج إدخال ومتابعة منظمة.",
      "إمكانية التوسع حسب احتياج المشروع.",
    ],
    requirements: [
      "شرح واضح لسير العمل الحالي.",
      "الحقول أو البيانات المطلوب إدارتها.",
      "الأدوار المتوقعة داخل النظام.",
    ],
  },
  {
    id: 6,
    slug: "seo-for-stores",
    category: "ecommerce",
    categoryLabel: "التجارة الإلكترونية",
    badge: "نتائج عضوية",
    icon: "📈",
    gallery: ["📈", "🔍", "🛍️", "📣"],
    title: "تحسين محركات البحث SEO للمتاجر",
    description: "تصدر نتائج البحث في جوجل وضاعف زيارات متجرك بشكل مجاني وطبيعي.",
    fullDescription:
      "نراجع متجرك من منظور تقني ومحتوائي ونبني خطة SEO عملية لرفع الظهور العضوي وتحسين صفحات المنتجات والتصنيفات بما يدعم المبيعات على المدى الطويل.",
    cta: "طلب الخدمة",
    delay: 0.2,
    price: 999,
    oldPrice: 1400,
    rating: 4.7,
    reviewsCount: 73,
    deliveryTime: "خلال 5 أيام عمل",
    supportLabel: "خطة تنفيذ واضحة",
    features: [
      "تحليل الكلمات المفتاحية المناسبة.",
      "تحسين صفحات المنتجات والتصنيفات.",
      "تحسين العناصر التقنية الأساسية للمتجر.",
      "توصيات محتوى تساعد على رفع الظهور العضوي.",
    ],
    requirements: [
      "الوصول إلى المتجر أو لوحة التحكم.",
      "معرفة الفئة المستهدفة والكلمات المهمة.",
      "صلاحية لمراجعة الصفحات الحالية.",
    ],
  },
];

export function getProductBySlug(slug?: string) {
  return products.find((product) => product.slug === slug);
}
