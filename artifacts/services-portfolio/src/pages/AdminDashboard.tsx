import { Suspense, lazy, useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { useLocation } from "wouter";
import {
  Package, CheckCircle2, XCircle, Zap, LogOut, TerminalSquare,
  Download, RefreshCw, Loader2, Users, Search, Mail, Phone, ChevronDown,
  Store, Settings2, Save, Plus, FileText, Ticket, Star, BarChart3, 
  Zap as Automation, Database, Send, AlertTriangle, Sparkles, Clock3, ShieldCheck, Copy, Pencil, X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

const AdminRatingsManager = lazy(() => import("@/components/AdminRatingsManager").then((module) => ({ default: module.AdminRatingsManager })));
const AnalyticsDashboard = lazy(() => import("@/components/AnalyticsDashboard").then((module) => ({ default: module.AnalyticsDashboard })));
const BulkEmailManager = lazy(() => import("@/components/BulkEmailManager").then((module) => ({ default: module.BulkEmailManager })));
const AutomationManager = lazy(() => import("@/components/AutomationManager").then((module) => ({ default: module.AutomationManager })));
const BackupManager = lazy(() => import("@/components/BackupManager").then((module) => ({ default: module.BackupManager })));

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

type OrderStatus = "pending_review" | "in_progress" | "completed" | "cancelled";

interface OrderItem {
  id: number;
  package_id: string;
  package_name: string;
  quantity: number;
  unit_price_sar: number;
  line_total_sar: number;
}

interface Order {
  id: number;
  package_id: string;
  package_name: string;
  customer_name: string;
  customer_email: string | null;
  receipt_filename: string | null;
  has_receipt: boolean;
  status: OrderStatus;
  created_at: string;
  notes: string | null;
  c_full_name: string | null;
  c_phone: string | null;
  items: OrderItem[];
}

interface Customer {
  id: number;
  email: string;
  full_name: string;
  phone: string | null;
  created_at: string;
  order_count: string;
}

interface Stats {
  total: string;
  pending_review: string;
  in_progress: string;
  completed: string;
  cancelled: string;
  total_customers: string;
}

interface Product {
  id: number;
  slug: string;
  title: string;
  description: string;
  price_sar: number;
  delivery_details: string | null;
  is_active: boolean;
  created_at: string;
}

interface StoreSettings {
  store_name: string;
  support_email: string | null;
  whatsapp_number: string | null;
  bank_name: string | null;
  beneficiary_name: string | null;
  iban: string | null;
  account_number: string | null;
  tiktok_url: string | null;
  instagram_url: string | null;
  currency: string;
  order_auto_accept: boolean;
}

interface SiteContent {
  key: string;
  value: Record<string, unknown>;
  updated_at: string;
}

interface HomeServiceItem {
  title: string;
  desc: string;
}

interface HomeContentForm {
  heroLine1: string;
  heroLine2: string;
  heroSubtitle: string;
  packagesSubtitle: string;
  footerDescription: string;
  services: HomeServiceItem[];
}

interface Coupon {
  id: number;
  code: string;
  discount_sar: number;
  max_uses: number;
  remaining_uses: number;
  created_at: string;
  updated_at: string;
}

interface SmartAlert {
  id: string;
  level: "critical" | "warning" | "good";
  title: string;
  description: string;
  ctaLabel: string;
  onClick: () => void;
}

const defaultHomeContent: HomeContentForm = {
  heroLine1: "أحوّل أفكارك إلى",
  heroLine2: "متجر رقمي متكامل",
  heroSubtitle: "واجهة احترافية تعرض خدماتك وباقاتك وتحوّل الزوار إلى طلبات فعلية.",
  packagesSubtitle: "خطط واضحة تساعد العميل على اختيار الباقة المناسبة بسرعة.",
  footerDescription: "منصة رقمية لعرض الخدمات واستقبال الطلبات ومتابعة العملاء.",
  services: [
    { title: "تطوير الواجهات", desc: "واجهات سريعة وواضحة تعكس هوية المتجر وتزيد التحويل." },
    { title: "تطوير الأنظمة الخلفية", desc: "بنية مستقرة لإدارة الطلبات والعملاء والمحتوى." },
    { title: "تشغيل المتجر", desc: "إعدادات تشغيل وتجربة شراء مناسبة لمتجر خدمات رقمية." },
  ],
};

function normalizeHomeContent(value?: Record<string, unknown>): HomeContentForm {
  const services = Array.isArray(value?.["services"])
    ? value["services"]
        .map((item) => {
          if (!item || typeof item !== "object") return null;
          const title = typeof (item as Record<string, unknown>)["title"] === "string" ? String((item as Record<string, unknown>)["title"]) : "";
          const desc = typeof (item as Record<string, unknown>)["desc"] === "string" ? String((item as Record<string, unknown>)["desc"]) : "";
          return { title, desc };
        })
        .filter((item): item is HomeServiceItem => Boolean(item && (item.title || item.desc)))
    : [];

  return {
    heroLine1: typeof value?.["heroLine1"] === "string" ? String(value["heroLine1"]) : defaultHomeContent.heroLine1,
    heroLine2: typeof value?.["heroLine2"] === "string" ? String(value["heroLine2"]) : defaultHomeContent.heroLine2,
    heroSubtitle: typeof value?.["heroSubtitle"] === "string" ? String(value["heroSubtitle"]) : defaultHomeContent.heroSubtitle,
    packagesSubtitle: typeof value?.["packagesSubtitle"] === "string" ? String(value["packagesSubtitle"]) : defaultHomeContent.packagesSubtitle,
    footerDescription: typeof value?.["footerDescription"] === "string" ? String(value["footerDescription"]) : defaultHomeContent.footerDescription,
    services: services.length > 0 ? services : defaultHomeContent.services,
  };
}

const statusConfig: Record<OrderStatus, { label: string; textColor: string; bg: string; border: string; icon: React.ElementType }> = {
  pending_review: { label: "تحت المراجعة", textColor: "text-amber-400",  bg: "bg-amber-400/10",  border: "border-amber-400/25",  icon: Search },
  in_progress:    { label: "جاري التجهيز", textColor: "text-blue-400",   bg: "bg-blue-400/10",   border: "border-blue-400/25",   icon: Zap },
  completed:      { label: "مكتمل",         textColor: "text-green-400",  bg: "bg-green-400/10",  border: "border-green-400/25",  icon: CheckCircle2 },
  cancelled:      { label: "ملغي",          textColor: "text-red-400",    bg: "bg-red-400/10",    border: "border-red-400/25",    icon: XCircle },
};

const ALL_STATUSES: OrderStatus[] = ["pending_review", "in_progress", "completed", "cancelled"];

function AdminTabLoader() {
  return (
    <div className="flex items-center justify-center py-10">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
    </div>
  );
}

export default function AdminDashboard() {
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const [orders, setOrders] = useState<Order[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [settings, setSettings] = useState<StoreSettings | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingProduct, setSavingProduct] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [savingEditProduct, setSavingEditProduct] = useState(false);
  const [tab, setTab] = useState<"orders" | "customers" | "products" | "coupons" | "ratings" | "analytics" | "email" | "automation" | "backup" | "settings" | "content">("orders");
  const [expandedOrder, setExpandedOrder] = useState<number | null>(null);
  const [filterStatus, setFilterStatus] = useState<OrderStatus | "all">("all");
  const [homeContent, setHomeContent] = useState<SiteContent | null>(null);
  const [contentDraft, setContentDraft] = useState<HomeContentForm>(defaultHomeContent);
  const [savingContent, setSavingContent] = useState(false);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [savingCoupon, setSavingCoupon] = useState(false);
  const [deletingCouponId, setDeletingCouponId] = useState<number | null>(null);
  const [deletingOrderId, setDeletingOrderId] = useState<number | null>(null);
  const [deletingCustomerId, setDeletingCustomerId] = useState<number | null>(null);
  const [deletingProductId, setDeletingProductId] = useState<number | null>(null);
  const [deletingAll, setDeletingAll] = useState<"orders" | "customers" | "products" | null>(null);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [editCustomerForm, setEditCustomerForm] = useState({ fullName: "", email: "", phone: "" });
  const [savingCustomer, setSavingCustomer] = useState(false);
  const [newCoupon, setNewCoupon] = useState({
    code: "",
    discountSar: "",
    maxUses: "",
  });
  const [newProduct, setNewProduct] = useState({
    slug: "",
    title: "",
    description: "",
    priceSar: "",
    deliveryDetails: "",
  });
  const [globalQuery, setGlobalQuery] = useState("");
  const [orderSearch, setOrderSearch] = useState("");
  const [orderSort, setOrderSort] = useState<"newest" | "oldest" | "customer">("newest");
  const [onlyWithReceipt, setOnlyWithReceipt] = useState(false);
  const [customerSearch, setCustomerSearch] = useState("");
  const [customerSegment, setCustomerSegment] = useState<"all" | "vip" | "new">("all");
  const [productSearch, setProductSearch] = useState("");
  const [productStatusFilter, setProductStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [couponSearch, setCouponSearch] = useState("");
  const [couponFilter, setCouponFilter] = useState<"all" | "available" | "low" | "exhausted">("all");

  const handleUnauthorized = (res: Response) => {
    if (res.status !== 401) return false;
    toast({ title: "انتهت الجلسة", description: "سجل دخول المدير مرة أخرى للمتابعة.", variant: "destructive" });
    navigate("/admin");
    return true;
  };

  const checkAuth = async () => {
    try {
      const res = await fetch(`${BASE}/api/auth/me`, { credentials: "include" });
      if (res.status === 401) {
        navigate("/admin");
        return false;
      }
      const data = await res.json() as { authenticated: boolean };
      if (!data.authenticated) {
        navigate("/admin");
        return false;
      }
      return true;
    } catch (err) {
      throw new Error("تعذر الاتصال بخادم المصادقة. تأكد من تشغيل backend ثم أعد المحاولة.");
    }
  };

  const fetchData = async () => {
    setError(null);
    setLoading(true);
    try {
      const [ordersRes, statsRes, customersRes, productsRes, couponsRes, settingsRes, contentRes] = await Promise.all([
        fetch(`${BASE}/api/admin/orders`, { credentials: "include" }),
        fetch(`${BASE}/api/admin/stats`, { credentials: "include" }),
        fetch(`${BASE}/api/admin/customers`, { credentials: "include" }),
        fetch(`${BASE}/api/admin/products`, { credentials: "include" }),
        fetch(`${BASE}/api/admin/coupons`, { credentials: "include" }),
        fetch(`${BASE}/api/admin/settings`, { credentials: "include" }),
        fetch(`${BASE}/api/admin/content/home`, { credentials: "include" }),
      ]);
      if (handleUnauthorized(ordersRes)) { return; }
      const ordersData = await ordersRes.json() as { orders: Order[] };
      const statsData = await statsRes.json() as Stats;
      const customersData = await customersRes.json() as { customers: Customer[] };
      const productsData = await productsRes.json() as { products: Product[] };
      const couponsData = await couponsRes.json() as { coupons: Coupon[] };
      const settingsData = await settingsRes.json() as { settings: StoreSettings | null };
      const contentData = contentRes.ok ? await contentRes.json() as { content: SiteContent } : null;
      setOrders(ordersData.orders);
      setStats(statsData);
      setCustomers(customersData.customers);
      setProducts(productsData.products);
      setCoupons(couponsData.coupons);
      setSettings(settingsData.settings);
      setHomeContent(contentData?.content ?? null);
      setContentDraft(normalizeHomeContent(contentData?.content?.value));
    } catch (err) {
      setError(err instanceof Error ? err.message : "تعذر تحميل بيانات لوحة التحكم. تأكد من تشغيل الخلفية ثم أعد المحاولة.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void (async () => {
      try {
        const authenticated = await checkAuth();
        if (authenticated) await fetchData();
      } catch (err) {
        setError(err instanceof Error ? err.message : "تعذر الاتصال بخادم لوحة التحكم.");
        setLoading(false);
      }
    })();
  }, []);

  const handleStatusUpdate = async (orderId: number, newStatus: OrderStatus) => {
    setUpdatingId(orderId);
    try {
      const res = await fetch(`${BASE}/api/admin/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
        credentials: "include",
      });
      if (handleUnauthorized(res)) return;
      if (!res.ok) throw new Error();
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
      toast({ title: "تم تحديث الحالة وإشعار العميل" });
    } catch {
      toast({ title: "خطأ في التحديث", variant: "destructive" });
    } finally {
      setUpdatingId(null);
    }
  };

  const handleLogout = async () => {
    await fetch(`${BASE}/api/auth/logout`, { method: "POST", credentials: "include" });
    navigate("/");
  };

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProduct(true);
    try {
      const res = await fetch(`${BASE}/api/admin/products`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          slug: newProduct.slug,
          title: newProduct.title,
          description: newProduct.description,
          priceSar: Number(newProduct.priceSar || 0),
          deliveryDetails: newProduct.deliveryDetails,
          isActive: true,
        }),
      });
      if (handleUnauthorized(res)) return;
      const data = await res.json() as { error?: string; product?: Product };
      if (!res.ok) throw new Error(data.error || "تعذر إضافة المنتج");
      setProducts((prev) => [data.product as Product, ...prev]);
      setNewProduct({ slug: "", title: "", description: "", priceSar: "", deliveryDetails: "" });
      toast({ title: "تم إضافة المنتج" });
    } catch (err) {
      toast({ title: err instanceof Error ? err.message : "خطأ", variant: "destructive" });
    } finally {
      setSavingProduct(false);
    }
  };

  const toggleProduct = async (product: Product) => {
    try {
      const res = await fetch(`${BASE}/api/admin/products/${product.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ isActive: !product.is_active }),
      });
      if (handleUnauthorized(res)) return;
      const data = await res.json() as { error?: string; product?: Product };
      if (!res.ok) throw new Error(data.error || "تعذر تحديث المنتج");
      setProducts((prev) => prev.map((p) => (p.id === product.id ? (data.product as Product) : p)));
    } catch {
      toast({ title: "تعذر تحديث حالة المنتج", variant: "destructive" });
    }
  };

  const saveEditProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;
    setSavingEditProduct(true);
    try {
      const res = await fetch(`${BASE}/api/admin/products/${editingProduct.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          title: editingProduct.title,
          description: editingProduct.description,
          priceSar: Number(editingProduct.price_sar || 0),
          deliveryDetails: editingProduct.delivery_details,
          isActive: editingProduct.is_active,
        }),
      });
      if (handleUnauthorized(res)) return;
      const data = await res.json() as { error?: string; product?: Product };
      if (!res.ok) throw new Error(data.error || "تعذر تحديث المنتج");
      setProducts((prev) => prev.map((p) => (p.id === editingProduct.id ? (data.product as Product) : p)));
      setEditingProduct(null);
      toast({ title: "تم تحديث المنتج" });
    } catch (err) {
      toast({ title: err instanceof Error ? err.message : "خطأ", variant: "destructive" });
    } finally {
      setSavingEditProduct(false);
    }
  };

  const saveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;
    setSavingSettings(true);
    try {
      const res = await fetch(`${BASE}/api/admin/settings`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          storeName: settings.store_name,
          supportEmail: settings.support_email,
          whatsappNumber: settings.whatsapp_number,
          bankName: settings.bank_name,
          beneficiaryName: settings.beneficiary_name,
          iban: settings.iban,
          accountNumber: settings.account_number,
          tiktokUrl: settings.tiktok_url,
          instagramUrl: settings.instagram_url,
          currency: settings.currency,
          orderAutoAccept: settings.order_auto_accept,
        }),
      });
      if (handleUnauthorized(res)) return;
      const data = await res.json() as { error?: string; settings?: StoreSettings };
      if (!res.ok) throw new Error(data.error || "تعذر حفظ الإعدادات");
      setSettings(data.settings ?? null);
      toast({ title: "تم حفظ إعدادات المتجر" });
    } catch (err) {
      toast({ title: err instanceof Error ? err.message : "تعذر حفظ الإعدادات", variant: "destructive" });
    } finally {
      setSavingSettings(false);
    }
  };

  const saveContent = async (e: React.FormEvent) => {
    e.preventDefault();

    setSavingContent(true);
    try {
      const res = await fetch(`${BASE}/api/admin/content/home`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ value: contentDraft }),
      });

      if (handleUnauthorized(res)) return;

      const data = await res.json() as { error?: string; content?: SiteContent };
      if (!res.ok) throw new Error(data.error || "تعذر حفظ المحتوى");
      setHomeContent(data.content ?? null);
      setContentDraft(normalizeHomeContent(data.content?.value));
      toast({ title: "تم حفظ محتوى الصفحة الرئيسية" });
    } catch (err) {
      toast({ title: err instanceof Error ? err.message : "تعذر حفظ المحتوى", variant: "destructive" });
    } finally {
      setSavingContent(false);
    }
  };

  const updateService = (index: number, field: keyof HomeServiceItem, value: string) => {
    setContentDraft((current) => ({
      ...current,
      services: current.services.map((service, serviceIndex) => (
        serviceIndex === index ? { ...service, [field]: value } : service
      )),
    }));
  };

  const addService = () => {
    setContentDraft((current) => ({
      ...current,
      services: [...current.services, { title: "", desc: "" }],
    }));
  };

  const createCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingCoupon(true);

    try {
      const res = await fetch(`${BASE}/api/admin/coupons`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          code: newCoupon.code,
          discountSar: Number(newCoupon.discountSar || 0),
          maxUses: Number(newCoupon.maxUses || 0),
        }),
      });

      if (handleUnauthorized(res)) return;

      const data = await res.json() as { error?: string; coupon?: Coupon };
      if (!res.ok || !data.coupon) {
        throw new Error(data.error || "تعذر إنشاء الكوبون");
      }

      setCoupons((prev) => [data.coupon as Coupon, ...prev]);
      setNewCoupon({ code: "", discountSar: "", maxUses: "" });
      toast({ title: "تم إنشاء الكوبون" });
    } catch (err) {
      toast({ title: err instanceof Error ? err.message : "تعذر إنشاء الكوبون", variant: "destructive" });
    } finally {
      setSavingCoupon(false);
    }
  };

  const deleteCoupon = async (couponId: number) => {
    setDeletingCouponId(couponId);
    try {
      const res = await fetch(`${BASE}/api/admin/coupons/${couponId}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (handleUnauthorized(res)) return;

      if (!res.ok) {
        const data = await res.json() as { error?: string };
        throw new Error(data.error || "تعذر حذف الكوبون");
      }

      setCoupons((prev) => prev.filter((coupon) => coupon.id !== couponId));
      toast({ title: "تم حذف الكوبون" });
    } catch (err) {
      toast({ title: err instanceof Error ? err.message : "تعذر حذف الكوبون", variant: "destructive" });
    } finally {
      setDeletingCouponId(null);
    }
  };

  const deleteOrder = async (orderId: number) => {
    if (!confirm("هل متأكد من حذف هذا الطلب؟")) return;
    setDeletingOrderId(orderId);
    try {
      const res = await fetch(`${BASE}/api/admin/orders/${orderId}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (handleUnauthorized(res)) return;

      if (!res.ok) {
        const data = await res.json() as { error?: string };
        throw new Error(data.error || "تعذر حذف الطلب");
      }

      setOrders((prev) => prev.filter((order) => order.id !== orderId));
      await fetchData();
      toast({ title: "تم حذف الطلب" });
    } catch (err) {
      toast({ title: err instanceof Error ? err.message : "تعذر حذف الطلب", variant: "destructive" });
    } finally {
      setDeletingOrderId(null);
    }
  };

  const deleteAllOrders = async () => {
    if (!confirm("تحذير: هذا سيحذف جميع الطلبات نهائياً. هل متأكد؟")) return;
    setDeletingAll("orders");
    try {
      const res = await fetch(`${BASE}/api/admin/orders`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirm: "DELETE_ALL_ORDERS" }),
        credentials: "include",
      });

      if (handleUnauthorized(res)) return;

      if (!res.ok) {
        const data = await res.json() as { error?: string };
        throw new Error(data.error || "تعذر حذف جميع الطلبات");
      }

      setOrders([]);
      await fetchData();
      toast({ title: "تم حذف جميع الطلبات" });
    } catch (err) {
      toast({ title: err instanceof Error ? err.message : "تعذر حذف جميع الطلبات", variant: "destructive" });
    } finally {
      setDeletingAll(null);
    }
  };

  const deleteCustomer = async (customerId: number) => {
    if (!confirm("هل متأكد من حذف هذا العميل؟")) return;
    setDeletingCustomerId(customerId);
    try {
      const res = await fetch(`${BASE}/api/admin/customers/${customerId}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (handleUnauthorized(res)) return;

      if (!res.ok) {
        const data = await res.json() as { error?: string };
        throw new Error(data.error || "تعذر حذف العميل");
      }

      setCustomers((prev) => prev.filter((customer) => customer.id !== customerId));
      await fetchData();
      toast({ title: "تم حذف العميل" });
    } catch (err) {
      toast({ title: err instanceof Error ? err.message : "تعذر حذف العميل", variant: "destructive" });
    } finally {
      setDeletingCustomerId(null);
    }
  };

  const deleteAllCustomers = async () => {
    if (!confirm("تحذير: هذا سيحذف جميع العملاء نهائياً. هل متأكد؟")) return;
    setDeletingAll("customers");
    try {
      const res = await fetch(`${BASE}/api/admin/customers`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirm: "DELETE_ALL_CUSTOMERS" }),
        credentials: "include",
      });

      if (handleUnauthorized(res)) return;

      if (!res.ok) {
        const data = await res.json() as { error?: string };
        throw new Error(data.error || "تعذر حذف جميع العملاء");
      }

      setCustomers([]);
      await fetchData();
      toast({ title: "تم حذف جميع العملاء" });
    } catch (err) {
      toast({ title: err instanceof Error ? err.message : "تعذر حذف جميع العملاء", variant: "destructive" });
    } finally {
      setDeletingAll(null);
    }
  };

  const startEditCustomer = (c: Customer) => {
    setEditCustomerForm({ fullName: c.full_name ?? "", email: c.email ?? "", phone: c.phone ?? "" });
    setEditingCustomer(c);
  };

  const handleSaveCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCustomer) return;
    if (!editCustomerForm.fullName.trim()) {
      toast({ title: "الاسم لا يمكن أن يكون فارغاً", variant: "destructive" });
      return;
    }
    setSavingCustomer(true);
    try {
      const res = await fetch(`${BASE}/api/admin/customers/${editingCustomer.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: editCustomerForm.fullName.trim(),
          email: editCustomerForm.email.trim() || undefined,
          phone: editCustomerForm.phone.trim() || undefined,
        }),
        credentials: "include",
      });
      if (handleUnauthorized(res)) return;
      const data = await res.json() as { customer?: { id: number; email: string; fullName: string; phone: string | null }; error?: string };
      if (!res.ok) throw new Error(data.error ?? "خطأ في الحفظ");
      setCustomers((prev) =>
        prev.map((c) =>
          c.id === editingCustomer.id
            ? { ...c, full_name: data.customer?.fullName ?? c.full_name, email: data.customer?.email ?? c.email, phone: data.customer?.phone ?? c.phone }
            : c
        )
      );
      setEditingCustomer(null);
      toast({ title: "تم تحديث بيانات العميل بنجاح" });
    } catch (err) {
      toast({ title: err instanceof Error ? err.message : "خطأ في الحفظ", variant: "destructive" });
    } finally {
      setSavingCustomer(false);
    }
  };

  const deleteProduct = async (productId: number) => {
    if (!confirm("هل متأكد من حذف هذا المنتج؟")) return;
    setDeletingProductId(productId);
    try {
      const res = await fetch(`${BASE}/api/admin/products/${productId}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (handleUnauthorized(res)) return;

      if (!res.ok) {
        const data = await res.json() as { error?: string };
        throw new Error(data.error || "تعذر حذف المنتج");
      }

      setProducts((prev) => prev.filter((product) => product.id !== productId));
      await fetchData();
      toast({ title: "تم حذف المنتج" });
    } catch (err) {
      toast({ title: err instanceof Error ? err.message : "تعذر حذف المنتج", variant: "destructive" });
    } finally {
      setDeletingProductId(null);
    }
  };

  const deleteAllProducts = async () => {
    if (!confirm("تحذير: هذا سيحذف جميع المنتجات نهائياً. هل متأكد؟")) return;
    setDeletingAll("products");
    try {
      const res = await fetch(`${BASE}/api/admin/products`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirm: "DELETE_ALL_PRODUCTS" }),
        credentials: "include",
      });

      if (handleUnauthorized(res)) return;

      if (!res.ok) {
        const data = await res.json() as { error?: string };
        throw new Error(data.error || "تعذر حذف جميع المنتجات");
      }

      setProducts([]);
      await fetchData();
      toast({ title: "تم حذف جميع المنتجات" });
    } catch (err) {
      toast({ title: err instanceof Error ? err.message : "تعذر حذف جميع المنتجات", variant: "destructive" });
    } finally {
      setDeletingAll(null);
    }
  };

  const removeService = (index: number) => {
    setContentDraft((current) => ({
      ...current,
      services: current.services.filter((_, serviceIndex) => serviceIndex !== index),
    }));
  };

  const filteredOrders = filterStatus === "all" ? orders : orders.filter(o => o.status === filterStatus);
  const normalizedOrderSearch = orderSearch.trim().toLowerCase();
  const ordersView = useMemo(() => {
    const filtered = filteredOrders
      .filter((order) => {
        if (onlyWithReceipt && !order.has_receipt) return false;
        if (!normalizedOrderSearch) return true;
        return (
          String(order.id).includes(normalizedOrderSearch) ||
          order.customer_name.toLowerCase().includes(normalizedOrderSearch) ||
          order.package_name.toLowerCase().includes(normalizedOrderSearch) ||
          (order.customer_email || "").toLowerCase().includes(normalizedOrderSearch)
        );
      })
      .slice();

    filtered.sort((a, b) => {
      if (orderSort === "newest") return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      if (orderSort === "oldest") return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      return a.customer_name.localeCompare(b.customer_name, "ar");
    });

    return filtered;
  }, [filteredOrders, onlyWithReceipt, normalizedOrderSearch, orderSort]);

  const normalizedCustomerSearch = customerSearch.trim().toLowerCase();
  const customersView = useMemo(() => {
    return customers.filter((customer) => {
      const orderCount = Number(customer.order_count || 0);
      const isNew = Date.now() - new Date(customer.created_at).getTime() < 1000 * 60 * 60 * 24 * 30;
      if (customerSegment === "vip" && orderCount < 3) return false;
      if (customerSegment === "new" && !isNew) return false;
      if (!normalizedCustomerSearch) return true;
      return (
        customer.full_name.toLowerCase().includes(normalizedCustomerSearch) ||
        customer.email.toLowerCase().includes(normalizedCustomerSearch) ||
        (customer.phone || "").toLowerCase().includes(normalizedCustomerSearch)
      );
    });
  }, [customers, customerSegment, normalizedCustomerSearch]);

  const normalizedProductSearch = productSearch.trim().toLowerCase();
  const productsView = useMemo(() => {
    return products.filter((product) => {
      if (productStatusFilter === "active" && !product.is_active) return false;
      if (productStatusFilter === "inactive" && product.is_active) return false;
      if (!normalizedProductSearch) return true;
      return (
        product.title.toLowerCase().includes(normalizedProductSearch) ||
        product.slug.toLowerCase().includes(normalizedProductSearch) ||
        product.description.toLowerCase().includes(normalizedProductSearch)
      );
    });
  }, [products, productStatusFilter, normalizedProductSearch]);

  const normalizedCouponSearch = couponSearch.trim().toLowerCase();
  const couponsView = useMemo(() => {
    return coupons.filter((coupon) => {
      if (couponFilter === "available" && coupon.remaining_uses <= 0) return false;
      if (couponFilter === "low" && (coupon.remaining_uses <= 0 || coupon.remaining_uses > 5)) return false;
      if (couponFilter === "exhausted" && coupon.remaining_uses > 0) return false;
      if (!normalizedCouponSearch) return true;
      return coupon.code.toLowerCase().includes(normalizedCouponSearch);
    });
  }, [coupons, couponFilter, normalizedCouponSearch]);

  const pendingReviewCount = Number(stats?.pending_review ?? 0);
  const inProgressCount = Number(stats?.in_progress ?? 0);
  const completedCount = Number(stats?.completed ?? 0);
  const totalOrdersCount = Math.max(Number(stats?.total ?? 0), 1);
  const stalledOrdersCount = orders.filter((order) => {
    if (order.status !== "pending_review") return false;
    const ageHours = (Date.now() - new Date(order.created_at).getTime()) / (1000 * 60 * 60);
    return ageHours >= 24;
  }).length;
  const lowCouponsCount = coupons.filter((coupon) => coupon.remaining_uses <= 2).length;

  const operationHealthScore = Math.max(
    0,
    Math.min(
      100,
      Math.round(
        (completedCount / totalOrdersCount) * 70 +
          ((totalOrdersCount - pendingReviewCount) / totalOrdersCount) * 30 -
          stalledOrdersCount * 5,
      ),
    ),
  );

  const smartAlerts = useMemo<SmartAlert[]>(() => {
    const alerts: SmartAlert[] = [];

    if (stalledOrdersCount > 0) {
      alerts.push({
        id: "stalled-orders",
        level: "critical",
        title: "طلبات متوقفة تحتاج تدخل",
        description: `${stalledOrdersCount} طلب تحت المراجعة منذ أكثر من 24 ساعة.`,
        ctaLabel: "افتح الطلبات المتوقفة",
        onClick: () => {
          setTab("orders");
          setFilterStatus("pending_review");
        },
      });
    }

    if (inProgressCount > 8) {
      alerts.push({
        id: "high-in-progress",
        level: "warning",
        title: "ضغط تشغيل مرتفع",
        description: `${inProgressCount} طلب قيد التجهيز الآن، يفضل توزيع العمل أو إرسال تحديثات للعملاء.`,
        ctaLabel: "اذهب للأتمتة",
        onClick: () => setTab("automation"),
      });
    }

    if (lowCouponsCount > 0) {
      alerts.push({
        id: "low-coupons",
        level: "warning",
        title: "كوبونات قاربت على النفاد",
        description: `${lowCouponsCount} كوبون متبقي له استخدامان أو أقل.`,
        ctaLabel: "إدارة الكوبونات",
        onClick: () => setTab("coupons"),
      });
    }

    if (alerts.length === 0) {
      alerts.push({
        id: "all-good",
        level: "good",
        title: "التشغيل مستقر",
        description: "لا توجد مخاطر عاجلة الآن، يمكنك التركيز على النمو والتسويق.",
        ctaLabel: "فتح الإحصائيات",
        onClick: () => setTab("analytics"),
      });
    }

    return alerts;
  }, [stalledOrdersCount, inProgressCount, lowCouponsCount]);

  const normalizedSearch = globalQuery.trim().toLowerCase();

  const matchingOrders = useMemo(() => {
    if (!normalizedSearch) return [] as Order[];
    return orders.filter((order) => {
      return (
        String(order.id).includes(normalizedSearch) ||
        order.customer_name.toLowerCase().includes(normalizedSearch) ||
        order.package_name.toLowerCase().includes(normalizedSearch) ||
        (order.customer_email || "").toLowerCase().includes(normalizedSearch)
      );
    }).slice(0, 5);
  }, [normalizedSearch, orders]);

  const matchingCustomers = useMemo(() => {
    if (!normalizedSearch) return [] as Customer[];
    return customers.filter((customer) => {
      return (
        customer.full_name.toLowerCase().includes(normalizedSearch) ||
        customer.email.toLowerCase().includes(normalizedSearch) ||
        (customer.phone || "").toLowerCase().includes(normalizedSearch)
      );
    }).slice(0, 5);
  }, [normalizedSearch, customers]);

  const matchingProducts = useMemo(() => {
    if (!normalizedSearch) return [] as Product[];
    return products.filter((product) => {
      return (
        product.title.toLowerCase().includes(normalizedSearch) ||
        product.slug.toLowerCase().includes(normalizedSearch) ||
        product.description.toLowerCase().includes(normalizedSearch)
      );
    }).slice(0, 5);
  }, [normalizedSearch, products]);

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4" dir="rtl">
        <div className="glass-panel border border-white/10 rounded-3xl p-8 max-w-2xl text-center">
          <p className="text-sm text-white/50 mb-4">تعذر تحميل لوحة التحكم</p>
          <h1 className="text-2xl font-bold text-white mb-3">{error}</h1>
          <p className="text-white/40 mb-6">تأكد من تشغيل الخلفية والواجهة معًا عبر الأمر <code className="bg-white/5 px-2 py-1 rounded">pnpm dev</code>.</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button onClick={fetchData} variant="outline" className="border-white/10 text-white/80">إعادة المحاولة</Button>
            <Button onClick={() => navigate('/admin')} variant="secondary" className="text-white">العودة إلى صفحة الدخول</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute -top-40 -right-40 w-[600px] h-[600px] rounded-full bg-primary/10 blur-[100px]" />
      </div>

      {/* Topbar */}
      <nav className="sticky top-0 z-50 glass-panel border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
              <TerminalSquare className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-sm sm:text-base">{settings?.store_name || "لوحة التحكم"} — لوحة التحكم</span>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={fetchData} variant="outline" size="sm" className="glass-panel border-white/10 gap-1.5 rounded-full text-xs">
              <RefreshCw className="w-3 h-3" /> تحديث
            </Button>
            <Button onClick={handleLogout} variant="outline" size="sm" className="glass-panel border-red-500/20 text-red-400 hover:bg-red-500/10 gap-1.5 rounded-full text-xs">
              <LogOut className="w-3 h-3" /> خروج
            </Button>
          </div>
        </div>
      </nav>

      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-8">
            {[
              { label: "إجمالي الطلبات", value: stats.total,            color: "#7c3aed", icon: Package },
              { label: "تحت المراجعة",   value: stats.pending_review,   color: "#f59e0b", icon: Search },
              { label: "جاري التجهيز",   value: stats.in_progress,      color: "#3b82f6", icon: Zap },
              { label: "مكتملة",          value: stats.completed,        color: "#22c55e", icon: CheckCircle2 },
              { label: "ملغاة",           value: stats.cancelled,        color: "#ef4444", icon: XCircle },
              { label: "العملاء",          value: stats.total_customers,  color: "#06b6d4", icon: Users },
            ].map((s, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
                className="glass-panel p-4 rounded-2xl cursor-pointer hover:scale-105 transition-transform"
                onClick={() => { if (i < 5) { setTab("orders"); setFilterStatus(i === 0 ? "all" : ALL_STATUSES[i - 1]); } else setTab("customers"); }}>
                <s.icon style={{ color: s.color }} className="w-5 h-5 mb-2" />
                <div className="text-2xl font-black" style={{ color: s.color }}>{s.value}</div>
                <div className="text-xs text-white/40 mt-0.5">{s.label}</div>
              </motion.div>
            ))}
          </div>
        )}

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 mb-6">
          <div className="glass-panel rounded-2xl p-4 border border-white/10 xl:col-span-2">
            <div className="flex items-center justify-between gap-3 mb-3">
              <h3 className="font-semibold text-sm sm:text-base flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" />
                أوامر سريعة وتشخيص فوري
              </h3>
              <span className="text-xs text-white/40">درجة صحة التشغيل: {operationHealthScore}/100</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
              <button
                onClick={() => { setTab("orders"); setFilterStatus("pending_review"); }}
                className="rounded-xl border border-amber-400/25 bg-amber-400/10 px-3 py-2 text-right text-xs hover:bg-amber-400/15 transition-colors"
              >
                <p className="text-amber-300 font-semibold">مراجعة الطلبات المعلقة</p>
                <p className="text-white/60 mt-1">{pendingReviewCount} تحت المراجعة</p>
              </button>

              <button
                onClick={() => setTab("automation")}
                className="rounded-xl border border-blue-400/25 bg-blue-400/10 px-3 py-2 text-right text-xs hover:bg-blue-400/15 transition-colors"
              >
                <p className="text-blue-300 font-semibold">تشغيل حملات واتساب</p>
                <p className="text-white/60 mt-1">من الأتمتة أو الإرسال المباشر</p>
              </button>

              <button
                onClick={() => setTab("coupons")}
                className="rounded-xl border border-fuchsia-400/25 bg-fuchsia-400/10 px-3 py-2 text-right text-xs hover:bg-fuchsia-400/15 transition-colors"
              >
                <p className="text-fuchsia-300 font-semibold">إطلاق كوبون سريع</p>
                <p className="text-white/60 mt-1">عدد الكوبونات الضعيفة: {lowCouponsCount}</p>
              </button>

              <button
                onClick={fetchData}
                className="rounded-xl border border-emerald-400/25 bg-emerald-400/10 px-3 py-2 text-right text-xs hover:bg-emerald-400/15 transition-colors"
              >
                <p className="text-emerald-300 font-semibold">مزامنة كاملة الآن</p>
                <p className="text-white/60 mt-1">تحديث الطلبات والعملاء والإحصائيات</p>
              </button>
            </div>
          </div>

          <div className="glass-panel rounded-2xl p-4 border border-white/10">
            <div className="flex items-center gap-2 mb-3">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <h3 className="font-semibold text-sm">مركز التنبيهات الذكي</h3>
            </div>
            <div className="space-y-2">
              {smartAlerts.slice(0, 2).map((alert) => (
                <button
                  key={alert.id}
                  onClick={alert.onClick}
                  className={`w-full text-right rounded-xl border px-3 py-2 transition-colors ${
                    alert.level === "critical"
                      ? "border-red-400/30 bg-red-400/10 hover:bg-red-400/15"
                      : alert.level === "warning"
                        ? "border-amber-400/30 bg-amber-400/10 hover:bg-amber-400/15"
                        : "border-emerald-400/30 bg-emerald-400/10 hover:bg-emerald-400/15"
                  }`}
                >
                  <p className="text-xs font-semibold flex items-center gap-1.5">
                    {alert.level === "critical" ? <AlertTriangle className="w-3.5 h-3.5" /> : <Clock3 className="w-3.5 h-3.5" />}
                    {alert.title}
                  </p>
                  <p className="text-[11px] text-white/65 mt-1">{alert.description}</p>
                  <p className="text-[11px] text-primary mt-2">{alert.ctaLabel}</p>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="glass-panel rounded-2xl p-4 border border-white/10 mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Search className="w-4 h-4 text-primary" />
            <h3 className="font-semibold text-sm">بحث موحّد (طلبات + عملاء + منتجات)</h3>
          </div>

          <Input
            placeholder="ابحث بالاسم، البريد، رقم الطلب، أو slug المنتج..."
            value={globalQuery}
            onChange={(e) => setGlobalQuery(e.target.value)}
            className="bg-white/5 border-white/15"
          />

          {normalizedSearch && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 mt-3">
              <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                <p className="text-xs text-white/50 mb-2">الطلبات ({matchingOrders.length})</p>
                <div className="space-y-2">
                  {matchingOrders.length === 0 && <p className="text-xs text-white/35">لا نتائج</p>}
                  {matchingOrders.map((order) => (
                    <button
                      key={order.id}
                      onClick={() => {
                        setTab("orders");
                        setExpandedOrder(order.id);
                        setFilterStatus("all");
                      }}
                      className="w-full text-right rounded-lg border border-white/10 px-2 py-1.5 hover:bg-white/10 transition-colors"
                    >
                      <p className="text-xs font-semibold">#{order.id} · {order.customer_name}</p>
                      <p className="text-[11px] text-white/50 truncate">{order.package_name}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                <p className="text-xs text-white/50 mb-2">العملاء ({matchingCustomers.length})</p>
                <div className="space-y-2">
                  {matchingCustomers.length === 0 && <p className="text-xs text-white/35">لا نتائج</p>}
                  {matchingCustomers.map((customer) => (
                    <button
                      key={customer.id}
                      onClick={() => setTab("customers")}
                      className="w-full text-right rounded-lg border border-white/10 px-2 py-1.5 hover:bg-white/10 transition-colors"
                    >
                      <p className="text-xs font-semibold">{customer.full_name}</p>
                      <p className="text-[11px] text-white/50 truncate">{customer.email}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                <p className="text-xs text-white/50 mb-2">المنتجات ({matchingProducts.length})</p>
                <div className="space-y-2">
                  {matchingProducts.length === 0 && <p className="text-xs text-white/35">لا نتائج</p>}
                  {matchingProducts.map((product) => (
                    <button
                      key={product.id}
                      onClick={() => {
                        setTab("products");
                        setEditingProduct(product);
                      }}
                      className="w-full text-right rounded-lg border border-white/10 px-2 py-1.5 hover:bg-white/10 transition-colors"
                    >
                      <p className="text-xs font-semibold">{product.title}</p>
                      <p className="text-[11px] text-white/50 truncate">{product.slug}</p>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 flex-wrap">
          {[
            { id: "orders", label: "الطلبات", icon: Package },
            { id: "customers", label: "العملاء", icon: Users },
            { id: "products", label: "المنتجات", icon: Store },
            { id: "coupons", label: "الكوبونات", icon: Ticket },
            { id: "ratings", label: "التقييمات", icon: Star },
            { id: "analytics", label: "الإحصائيات", icon: BarChart3 },
            { id: "email", label: "البريد الجماعي", icon: Mail },
            { id: "automation", label: "الأتمتة", icon: Automation },
            { id: "backup", label: "النسخ", icon: Database },
            { id: "settings", label: "الإعدادات", icon: Settings2 },
            { id: "content", label: "المحتوى", icon: FileText },
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id as any)}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs sm:text-sm font-semibold transition-all ${tab === t.id ? "bg-primary text-white" : "glass-panel text-white/50 hover:text-white border-white/10"}`}
            >
              <t.icon className="w-4 h-4" />
              <span className="hidden sm:inline">{t.label}</span>
            </button>
          ))}

          {tab === "orders" && (
            <div className="flex gap-2 mr-auto flex-wrap">
              {([["all", "الكل"], ["pending_review", "مراجعة"], ["in_progress", "تجهيز"], ["completed", "مكتمل"], ["cancelled", "ملغي"]] as [string, string][]).map(([val, lbl]) => (
                <button
                  key={val}
                  onClick={() => setFilterStatus(val as OrderStatus | "all")}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${filterStatus === val ? "bg-white/20 text-white" : "text-white/40 hover:text-white"}`}
                >
                  {lbl}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Orders Tab */}
        {tab === "orders" && (
          <div className="glass-panel rounded-3xl overflow-hidden border border-white/10">
            <div className="p-4 border-b border-white/10 bg-white/5 space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                <Input
                  placeholder="بحث بالاسم، البريد، رقم الطلب..."
                  value={orderSearch}
                  onChange={(e) => setOrderSearch(e.target.value)}
                  className="bg-white/5 border-white/15"
                />
                <select
                  value={orderSort}
                  onChange={(e) => setOrderSort(e.target.value as "newest" | "oldest" | "customer")}
                  className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white"
                >
                  <option className="bg-black" value="newest">الأحدث أولاً</option>
                  <option className="bg-black" value="oldest">الأقدم أولاً</option>
                  <option className="bg-black" value="customer">حسب اسم العميل</option>
                </select>
                <label className="inline-flex items-center gap-2 text-sm text-white/70 rounded-lg border border-white/15 px-3 py-2">
                  <input type="checkbox" checked={onlyWithReceipt} onChange={(e) => setOnlyWithReceipt(e.target.checked)} />
                  فقط الطلبات التي تحتوي إيصال
                </label>
              </div>
              <p className="text-xs text-white/40">نتيجة الفلترة الحالية: {ordersView.length} طلب</p>
              <Button
                onClick={deleteAllOrders}
                disabled={deletingAll === "orders" || orders.length === 0}
                variant="outline"
                className="border-red-500/30 text-red-400 hover:bg-red-500/10 gap-1.5 text-xs"
              >
                {deletingAll === "orders" ? <Loader2 className="w-3 h-3 animate-spin" /> : <AlertTriangle className="w-3 h-3" />}
                حذف جميع الطلبات
              </Button>
            </div>
            {loading ? (
              <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
            ) : ordersView.length === 0 ? (
              <div className="text-center py-20 text-white/40"><Package className="w-12 h-12 mx-auto mb-3 opacity-30" />لا توجد طلبات</div>
            ) : (
              <div className="divide-y divide-white/5">
                {ordersView.map((order, i) => {
                  const sc = statusConfig[order.status] ?? statusConfig.pending_review;
                  const StatusIcon = sc.icon;
                  const isExpanded = expandedOrder === order.id;

                  return (
                    <motion.div key={order.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}>
                      {/* Main row */}
                      <div
                        className="flex flex-col sm:flex-row sm:items-center gap-4 p-5 hover:bg-white/3 transition-colors cursor-pointer"
                        onClick={() => setExpandedOrder(isExpanded ? null : order.id)}
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center shrink-0">
                            <Package className="w-4 h-4 text-primary" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-white">{order.customer_name}</span>
                              <span className="text-white/30 text-xs">#{order.id}</span>
                            </div>
                            <div className="text-white/50 text-sm truncate">{order.package_name}</div>
                            {order.customer_email && (
                              <div className="flex items-center gap-1 text-white/30 text-xs mt-0.5">
                                <Mail className="w-3 h-3" />
                                {order.customer_email}
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                          <span className="text-white/40 text-xs hidden sm:block">
                            {new Date(order.created_at).toLocaleDateString("ar-SA", { day: "numeric", month: "short" })}
                          </span>
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-medium ${sc.textColor} ${sc.bg} ${sc.border}`}>
                            <StatusIcon className="w-3 h-3" />
                            {sc.label}
                          </span>
                          {order.has_receipt && (
                            <a href={`${BASE}/api/admin/orders/${order.id}/receipt`} target="_blank" rel="noreferrer"
                              onClick={e => e.stopPropagation()}
                              className="flex items-center gap-1 text-primary hover:underline text-xs shrink-0">
                              <Download className="w-3.5 h-3.5" /> إيصال
                            </a>
                          )}
                          <ChevronDown className={`w-4 h-4 text-white/30 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                        </div>
                      </div>

                      {/* Expanded details */}
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="border-t border-white/5 bg-white/3 px-5 py-5"
                        >
                          {/* Order items */}
                          {order.items && order.items.length > 0 && (
                            <div className="mb-5">
                              <h4 className="text-xs font-bold text-white/40 uppercase tracking-wider mb-3">المنتجات</h4>
                              <div className="space-y-2">
                                {order.items.map((item) => (
                                  <div key={item.id} className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-black/10 px-3 py-2 text-sm">
                                    <div className="min-w-0">
                                      <p className="font-semibold truncate">{item.package_name}</p>
                                      <p className="text-white/40 text-xs">الكمية: {item.quantity} × {item.unit_price_sar} ر.س</p>
                                    </div>
                                    <span className="font-bold text-primary shrink-0">{item.line_total_sar} ر.س</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            {/* Customer info */}
                            <div>
                              <h4 className="text-xs font-bold text-white/40 uppercase tracking-wider mb-3">بيانات العميل</h4>
                              <div className="space-y-2 text-sm">
                                <div className="flex items-center gap-2"><span className="text-white/40">الاسم:</span><span>{order.c_full_name || order.customer_name}</span></div>
                                {order.customer_email && <div className="flex items-center gap-2"><Mail className="w-3.5 h-3.5 text-white/30" /><span className="text-white/70">{order.customer_email}</span></div>}
                                {order.c_phone && <div className="flex items-center gap-2"><Phone className="w-3.5 h-3.5 text-white/30" /><span dir="ltr">{order.c_phone}</span></div>}
                                <div className="flex items-center gap-2"><span className="text-white/40">التاريخ:</span><span className="text-white/60">{new Date(order.created_at).toLocaleString("ar-SA")}</span></div>
                                {order.notes && <div className="flex items-start gap-2 mt-1 rounded-xl bg-white/5 border border-white/10 px-3 py-2"><span className="text-white/40 shrink-0">ملاحظات:</span><span className="text-white/60 text-xs leading-relaxed">{order.notes}</span></div>}
                              </div>
                            </div>

                            {/* Status update */}
                            <div>
                              <h4 className="text-xs font-bold text-white/40 uppercase tracking-wider mb-3">تحديث الحالة</h4>
                              <div className="grid grid-cols-2 gap-2">
                                {ALL_STATUSES.map(s => {
                                  const cfg = statusConfig[s];
                                  const SIcon = cfg.icon;
                                  const isCurrent = order.status === s;
                                  return (
                                    <button
                                      key={s}
                                      disabled={isCurrent || updatingId === order.id}
                                      onClick={() => handleStatusUpdate(order.id, s)}
                                      className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${isCurrent ? `${cfg.bg} ${cfg.textColor} ${cfg.border}` : "border-white/10 text-white/40 hover:border-white/25 hover:text-white"}`}
                                    >
                                      {updatingId === order.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <SIcon className="w-3 h-3" />}
                                      {cfg.label}
                                    </button>
                                  );
                                })}
                              </div>
                              <Button
                                onClick={() => void deleteOrder(order.id)}
                                disabled={deletingOrderId === order.id}
                                variant="outline"
                                className="w-full mt-3 border-red-500/30 text-red-400 hover:bg-red-500/10 gap-1.5 text-xs"
                              >
                                {deletingOrderId === order.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <AlertTriangle className="w-3 h-3" />}
                                حذف هذا الطلب
                              </Button>
                              <p className="text-white/25 text-xs mt-2">سيتلقى العميل إشعار بريدي عند التحديث</p>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Customers Tab */}
        {tab === "customers" && (
          <div className="glass-panel rounded-3xl overflow-hidden border border-white/10">
            <div className="p-4 border-b border-white/10 bg-white/5 space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <Input
                  placeholder="بحث عميل بالاسم أو البريد أو الجوال"
                  value={customerSearch}
                  onChange={(e) => setCustomerSearch(e.target.value)}
                  className="bg-white/5 border-white/15"
                />
                <select
                  value={customerSegment}
                  onChange={(e) => setCustomerSegment(e.target.value as "all" | "vip" | "new")}
                  className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white"
                >
                  <option className="bg-black" value="all">كل العملاء</option>
                  <option className="bg-black" value="vip">VIP (3 طلبات فأكثر)</option>
                  <option className="bg-black" value="new">عملاء جدد (آخر 30 يوم)</option>
                </select>
              </div>
              <p className="text-xs text-white/40">النتائج: {customersView.length} عميل</p>
              <Button
                onClick={deleteAllCustomers}
                disabled={deletingAll === "customers" || customers.length === 0}
                variant="outline"
                className="border-red-500/30 text-red-400 hover:bg-red-500/10 gap-1.5 text-xs"
              >
                {deletingAll === "customers" ? <Loader2 className="w-3 h-3 animate-spin" /> : <AlertTriangle className="w-3 h-3" />}
                حذف جميع العملاء
              </Button>
            </div>
            {loading ? (
              <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
            ) : customersView.length === 0 ? (
              <div className="text-center py-20 text-white/40"><Users className="w-12 h-12 mx-auto mb-3 opacity-30" />لا يوجد عملاء مسجلون</div>
            ) : (
              <div className="divide-y divide-white/5">
                <div className="grid grid-cols-5 px-5 py-3 text-white/30 text-xs uppercase tracking-wider border-b border-white/5">
                  <span>العميل</span><span>البريد</span><span>عدد الطلبات</span><span>تاريخ التسجيل</span><span>إجراءات</span>
                </div>
                {customersView.map((c, i) => (
                  <motion.div key={c.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.04 }}
                    className="grid grid-cols-5 items-center px-5 py-4 hover:bg-white/3 transition-colors gap-4">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/30 to-secondary/30 flex items-center justify-center text-xs font-bold shrink-0">
                        {c.full_name?.charAt(0) || "?"}
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate">{c.full_name || "—"}</p>
                        {c.phone && <p className="text-white/40 text-xs truncate" dir="ltr">{c.phone}</p>}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 text-white/60 text-sm truncate">
                      <Mail className="w-3.5 h-3.5 shrink-0" />{c.email}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-lg font-black text-primary">{c.order_count}</span>
                      <span className="text-white/40 text-xs">طلب</span>
                    </div>
                    <span className="text-white/40 text-xs">
                      {new Date(c.created_at).toLocaleDateString("ar-SA", { year: "numeric", month: "short", day: "numeric" })}
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => startEditCustomer(c)}
                        className="text-primary/80 hover:bg-primary/10 rounded px-2 py-1 text-xs font-semibold border border-primary/30 transition-colors"
                      >
                        تعديل
                      </button>
                      <button
                        onClick={() => void deleteCustomer(c.id)}
                        disabled={deletingCustomerId === c.id}
                        className="text-red-400 hover:bg-red-500/10 rounded px-2 py-1 text-xs font-semibold border border-red-500/30 transition-colors disabled:opacity-50"
                      >
                        {deletingCustomerId === c.id ? "جاري..." : "حذف"}
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Edit Customer Modal */}
        {editingCustomer && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" dir="rtl">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="w-full max-w-md mx-4 rounded-2xl border border-white/10 bg-[linear-gradient(180deg,rgba(41,19,74,0.98),rgba(25,10,47,0.98))] p-6 shadow-2xl"
            >
              <div className="flex items-center justify-between mb-5">
                <h3 className="font-bold text-lg">تعديل بيانات العميل</h3>
                <button onClick={() => setEditingCustomer(null)} className="text-white/40 hover:text-white transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={(e) => void handleSaveCustomer(e)} className="space-y-4">
                <div>
                  <label className="block text-white/60 text-xs mb-1.5">الاسم الكامل</label>
                  <Input
                    value={editCustomerForm.fullName}
                    onChange={(e) => setEditCustomerForm((p) => ({ ...p, fullName: e.target.value }))}
                    placeholder="اسم العميل"
                    className="bg-white/5 border-white/15 text-white"
                    required
                  />
                </div>
                <div>
                  <label className="block text-white/60 text-xs mb-1.5">البريد الإلكتروني</label>
                  <Input
                    type="email"
                    value={editCustomerForm.email}
                    onChange={(e) => setEditCustomerForm((p) => ({ ...p, email: e.target.value }))}
                    placeholder="email@example.com"
                    dir="ltr"
                    className="bg-white/5 border-white/15 text-white"
                  />
                </div>
                <div>
                  <label className="block text-white/60 text-xs mb-1.5">رقم الجوال</label>
                  <Input
                    value={editCustomerForm.phone}
                    onChange={(e) => setEditCustomerForm((p) => ({ ...p, phone: e.target.value }))}
                    placeholder="05xxxxxxxx"
                    dir="ltr"
                    className="bg-white/5 border-white/15 text-white"
                  />
                </div>
                <div className="flex items-center gap-3 pt-1">
                  <Button type="submit" disabled={savingCustomer} className="flex-1 gap-2 bg-gradient-to-r from-primary to-secondary text-white hover:opacity-90">
                    {savingCustomer ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    حفظ التعديلات
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setEditingCustomer(null)} className="border-white/15 text-white/60">
                    إلغاء
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {tab === "products" && (
          <div className="space-y-6">
            <div className="glass-panel rounded-2xl p-4 border border-white/10 space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <Input
                  placeholder="بحث منتج بالاسم أو slug"
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  className="bg-white/5 border-white/15"
                />
                <select
                  value={productStatusFilter}
                  onChange={(e) => setProductStatusFilter(e.target.value as "all" | "active" | "inactive")}
                  className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white"
                >
                  <option className="bg-black" value="all">كل المنتجات</option>
                  <option className="bg-black" value="active">النشطة فقط</option>
                  <option className="bg-black" value="inactive">المعطلة فقط</option>
                </select>
              </div>
              <p className="text-xs text-white/40">المنتجات بعد الفلترة: {productsView.length}</p>
              <Button
                onClick={deleteAllProducts}
                disabled={deletingAll === "products" || products.length === 0}
                variant="outline"
                className="border-red-500/30 text-red-400 hover:bg-red-500/10 gap-1.5 text-xs"
              >
                {deletingAll === "products" ? <Loader2 className="w-3 h-3 animate-spin" /> : <AlertTriangle className="w-3 h-3" />}
                حذف جميع المنتجات
              </Button>
            </div>

            <form onSubmit={handleCreateProduct} className="glass-panel rounded-2xl p-5 border border-white/10 space-y-4">
              <h3 className="font-bold text-lg">إضافة منتج رقمي</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input
                  placeholder="slug مثال: logo-design"
                  value={newProduct.slug}
                  onChange={(e) => setNewProduct((p) => ({ ...p, slug: e.target.value }))}
                  className="bg-white/5 border-white/15"
                  required
                />
                <Input
                  placeholder="اسم المنتج"
                  value={newProduct.title}
                  onChange={(e) => setNewProduct((p) => ({ ...p, title: e.target.value }))}
                  className="bg-white/5 border-white/15"
                  required
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input
                  type="number"
                  min={0}
                  placeholder="السعر بالريال"
                  value={newProduct.priceSar}
                  onChange={(e) => setNewProduct((p) => ({ ...p, priceSar: e.target.value }))}
                  className="bg-white/5 border-white/15"
                  required
                />
                <Input
                  placeholder="معلومة التسليم"
                  value={newProduct.deliveryDetails}
                  onChange={(e) => setNewProduct((p) => ({ ...p, deliveryDetails: e.target.value }))}
                  className="bg-white/5 border-white/15"
                />
              </div>
              <Textarea
                placeholder="وصف المنتج"
                value={newProduct.description}
                onChange={(e) => setNewProduct((p) => ({ ...p, description: e.target.value }))}
                className="bg-white/5 border-white/15 min-h-24"
              />
              <Button disabled={savingProduct} className="rounded-full gap-2 bg-gradient-to-r from-primary to-secondary">
                <Plus className="w-4 h-4" />
                {savingProduct ? "جاري الإضافة..." : "إضافة المنتج"}
              </Button>
            </form>

            <div className="glass-panel rounded-2xl overflow-hidden border border-white/10">
              <div className="p-4 border-b border-white/10 font-semibold">المنتجات الرقمية</div>
              <div className="divide-y divide-white/5">
                {productsView.map((product) => (
                  <div key={product.id}>
                    {editingProduct?.id === product.id ? (
                      <form onSubmit={(e) => void saveEditProduct(e)} className="p-4 space-y-3 bg-white/3">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <Input
                            value={editingProduct.title}
                            onChange={(e) => setEditingProduct((p) => p ? { ...p, title: e.target.value } : p)}
                            className="bg-white/5 border-white/15"
                            placeholder="اسم المنتج"
                            required
                          />
                          <Input
                            type="number"
                            min={0}
                            value={editingProduct.price_sar}
                            onChange={(e) => setEditingProduct((p) => p ? { ...p, price_sar: Number(e.target.value) } : p)}
                            className="bg-white/5 border-white/15"
                            placeholder="السعر بالريال"
                            required
                          />
                        </div>
                        <Input
                          value={editingProduct.delivery_details ?? ""}
                          onChange={(e) => setEditingProduct((p) => p ? { ...p, delivery_details: e.target.value } : p)}
                          className="bg-white/5 border-white/15"
                          placeholder="معلومة التسليم"
                        />
                        <Textarea
                          value={editingProduct.description}
                          onChange={(e) => setEditingProduct((p) => p ? { ...p, description: e.target.value } : p)}
                          className="bg-white/5 border-white/15 min-h-20"
                          placeholder="وصف المنتج"
                        />
                        <div className="flex gap-2">
                          <Button type="submit" disabled={savingEditProduct} className="rounded-full gap-2 bg-gradient-to-r from-primary to-secondary flex-1">
                            <Save className="w-4 h-4" />
                            {savingEditProduct ? "جاري الحفظ..." : "حفظ التعديل"}
                          </Button>
                          <Button type="button" variant="outline" onClick={() => setEditingProduct(null)} className="rounded-full border-white/15">
                            إلغاء
                          </Button>
                        </div>
                      </form>
                    ) : (
                      <div className="p-4 flex flex-col sm:flex-row sm:items-center gap-3">
                        <div className="flex-1">
                          <div className="font-semibold">{product.title}</div>
                          <div className="text-xs text-white/40">{product.slug}</div>
                          <div className="text-sm text-white/70 mt-1">{product.description}</div>
                        </div>
                        <div className="text-primary font-black shrink-0">{product.price_sar} ر.س</div>
                        <button
                          onClick={() => toggleProduct(product)}
                          className={`px-3 py-1.5 rounded-full text-xs border shrink-0 ${product.is_active ? "text-green-400 border-green-400/30 bg-green-400/10" : "text-white/50 border-white/20"}`}
                        >
                          {product.is_active ? "نشط" : "معطل"}
                        </button>
                        <button
                          onClick={() => setEditingProduct(product)}
                          className="px-3 py-1.5 rounded-full text-xs border border-white/20 text-white/60 hover:text-white hover:border-white/40 transition-colors shrink-0"
                        >
                          تعديل
                        </button>
                        <button
                          onClick={() => void deleteProduct(product.id)}
                          disabled={deletingProductId === product.id}
                          className="px-3 py-1.5 rounded-full text-xs border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-colors shrink-0 disabled:opacity-50"
                        >
                          {deletingProductId === product.id ? "جاري..." : "حذف"}
                        </button>
                      </div>
                    )}
                  </div>
                ))}
                {productsView.length === 0 && <div className="p-10 text-center text-white/40">لا توجد منتجات بعد</div>}
              </div>
            </div>
          </div>
        )}

        {tab === "coupons" && (
          <div className="space-y-6">
            <div className="glass-panel rounded-2xl p-4 border border-white/10 space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <Input
                  placeholder="بحث بالكود..."
                  value={couponSearch}
                  onChange={(e) => setCouponSearch(e.target.value.toUpperCase())}
                  className="bg-white/5 border-white/15"
                />
                <select
                  value={couponFilter}
                  onChange={(e) => setCouponFilter(e.target.value as "all" | "available" | "low" | "exhausted")}
                  className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white"
                >
                  <option className="bg-black" value="all">كل الكوبونات</option>
                  <option className="bg-black" value="available">متاحة</option>
                  <option className="bg-black" value="low">قربت تنفد ({"<="}5)</option>
                  <option className="bg-black" value="exhausted">منتهية</option>
                </select>
              </div>
              <p className="text-xs text-white/40">الكوبونات المطابقة: {couponsView.length}</p>
            </div>

            <form onSubmit={createCoupon} className="glass-panel rounded-2xl p-5 border border-white/10 space-y-4">
              <h3 className="font-bold text-lg">إضافة كوبون جديد</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Input
                  placeholder="رمز الكوبون مثال: REVO50"
                  value={newCoupon.code}
                  onChange={(e) => setNewCoupon((current) => ({ ...current, code: e.target.value.toUpperCase() }))}
                  className="bg-white/5 border-white/15"
                  required
                />
                <Input
                  type="number"
                  min={0}
                  placeholder="سعر الكوبون (الخصم بالريال)"
                  value={newCoupon.discountSar}
                  onChange={(e) => setNewCoupon((current) => ({ ...current, discountSar: e.target.value }))}
                  className="bg-white/5 border-white/15"
                  required
                />
                <Input
                  type="number"
                  min={1}
                  placeholder="عدد الأشخاص المسموح لهم"
                  value={newCoupon.maxUses}
                  onChange={(e) => setNewCoupon((current) => ({ ...current, maxUses: e.target.value }))}
                  className="bg-white/5 border-white/15"
                  required
                />
              </div>
              <Button disabled={savingCoupon} className="rounded-full gap-2 bg-gradient-to-r from-primary to-secondary">
                <Plus className="w-4 h-4" />
                {savingCoupon ? "جاري الإنشاء..." : "إضافة كوبون"}
              </Button>
            </form>

            <div className="glass-panel rounded-2xl overflow-hidden border border-white/10">
              <div className="p-4 border-b border-white/10 font-semibold">الكوبونات الفعالة</div>
              <div className="divide-y divide-white/5">
                {couponsView.map((coupon) => (
                  <div key={coupon.id} className="p-4 flex flex-col sm:flex-row sm:items-center gap-3">
                    <div className="flex-1">
                      <div className="font-semibold">{coupon.code}</div>
                      <div className="text-xs text-white/40 mt-1">
                        الخصم: {coupon.discount_sar} ر.س · المتبقي: {coupon.remaining_uses} من {coupon.max_uses}
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(coupon.code);
                        toast({ title: `تم نسخ الكوبون ${coupon.code}` });
                      }}
                      className="px-3 py-1.5 rounded-full text-xs border border-white/20 text-white/60 hover:text-white hover:border-white/40 transition-colors"
                    >
                      <span className="inline-flex items-center gap-1"><Copy className="w-3.5 h-3.5" /> نسخ</span>
                    </button>
                    <button
                      onClick={() => void deleteCoupon(coupon.id)}
                      disabled={deletingCouponId === coupon.id}
                      className="px-3 py-1.5 rounded-full text-xs border border-red-500/30 text-red-400 hover:bg-red-500/10 disabled:opacity-50"
                    >
                      {deletingCouponId === coupon.id ? "جاري الحذف..." : "حذف"}
                    </button>
                  </div>
                ))}
                {couponsView.length === 0 && <div className="p-10 text-center text-white/40">لا توجد كوبونات حالياً</div>}
              </div>
            </div>
          </div>
        )}

        {tab === "settings" && settings && (
          <form onSubmit={saveSettings} className="glass-panel rounded-2xl p-6 border border-white/10 space-y-4 max-w-3xl">
            <h3 className="font-bold text-lg">إعدادات المتجر</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                placeholder="اسم المتجر"
                value={settings.store_name}
                onChange={(e) => setSettings((s) => (s ? { ...s, store_name: e.target.value } : s))}
                className="bg-white/5 border-white/15"
              />
              <Input
                placeholder="عملة المتجر"
                value={settings.currency}
                onChange={(e) => setSettings((s) => (s ? { ...s, currency: e.target.value } : s))}
                className="bg-white/5 border-white/15"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                placeholder="بريد الدعم"
                value={settings.support_email ?? ""}
                onChange={(e) => setSettings((s) => (s ? { ...s, support_email: e.target.value } : s))}
                className="bg-white/5 border-white/15"
              />
              <Input
                placeholder="رقم واتساب"
                value={settings.whatsapp_number ?? ""}
                onChange={(e) => setSettings((s) => (s ? { ...s, whatsapp_number: e.target.value } : s))}
                className="bg-white/5 border-white/15"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                placeholder="اسم البنك"
                value={settings.bank_name ?? ""}
                onChange={(e) => setSettings((s) => (s ? { ...s, bank_name: e.target.value } : s))}
                className="bg-white/5 border-white/15"
              />
              <Input
                placeholder="اسم المستفيد"
                value={settings.beneficiary_name ?? ""}
                onChange={(e) => setSettings((s) => (s ? { ...s, beneficiary_name: e.target.value } : s))}
                className="bg-white/5 border-white/15"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                placeholder="رقم الآيبان"
                value={settings.iban ?? ""}
                onChange={(e) => setSettings((s) => (s ? { ...s, iban: e.target.value } : s))}
                className="bg-white/5 border-white/15"
              />
              <Input
                placeholder="رقم الحساب"
                value={settings.account_number ?? ""}
                onChange={(e) => setSettings((s) => (s ? { ...s, account_number: e.target.value } : s))}
                className="bg-white/5 border-white/15"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                placeholder="رابط تيك توك"
                value={settings.tiktok_url ?? ""}
                onChange={(e) => setSettings((s) => (s ? { ...s, tiktok_url: e.target.value } : s))}
                className="bg-white/5 border-white/15"
              />
              <Input
                placeholder="رابط انستقرام"
                value={settings.instagram_url ?? ""}
                onChange={(e) => setSettings((s) => (s ? { ...s, instagram_url: e.target.value } : s))}
                className="bg-white/5 border-white/15"
              />
            </div>
            <label className="flex items-center gap-2 text-sm text-white/70">
              <input
                type="checkbox"
                checked={settings.order_auto_accept}
                onChange={(e) => setSettings((s) => (s ? { ...s, order_auto_accept: e.target.checked } : s))}
              />
              قبول الطلبات تلقائيًا بدون مراجعة
            </label>
            <Button disabled={savingSettings} className="rounded-full gap-2 bg-gradient-to-r from-primary to-secondary">
              <Save className="w-4 h-4" />
              {savingSettings ? "جاري الحفظ..." : "حفظ الإعدادات"}
            </Button>
          </form>
        )}

        {tab === "content" && (
          <form onSubmit={saveContent} className="glass-panel rounded-2xl p-6 border border-white/10 space-y-4 max-w-4xl">
            <h3 className="font-bold text-lg">محتوى الصفحة الرئيسية</h3>
            <p className="text-sm text-white/50">عدّل النصوص والخدمات مباشرة بدون الحاجة لتحرير JSON يدويًا.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                value={contentDraft.heroLine1}
                onChange={(e) => setContentDraft((current) => ({ ...current, heroLine1: e.target.value }))}
                className="bg-white/5 border-white/15"
                placeholder="السطر الأول للهيرو"
              />
              <Input
                value={contentDraft.heroLine2}
                onChange={(e) => setContentDraft((current) => ({ ...current, heroLine2: e.target.value }))}
                className="bg-white/5 border-white/15"
                placeholder="السطر الثاني للهيرو"
              />
            </div>
            <Textarea
              value={contentDraft.heroSubtitle}
              onChange={(e) => setContentDraft((current) => ({ ...current, heroSubtitle: e.target.value }))}
              className="bg-white/5 border-white/15 min-h-24"
              placeholder="الوصف الرئيسي"
            />
            <Input
              value={contentDraft.packagesSubtitle}
              onChange={(e) => setContentDraft((current) => ({ ...current, packagesSubtitle: e.target.value }))}
              className="bg-white/5 border-white/15"
              placeholder="وصف قسم الباقات"
            />
            <Textarea
              value={contentDraft.footerDescription}
              onChange={(e) => setContentDraft((current) => ({ ...current, footerDescription: e.target.value }))}
              className="bg-white/5 border-white/15 min-h-24"
              placeholder="وصف الفوتر"
            />
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <h4 className="font-semibold">الخدمات المعروضة</h4>
                <Button type="button" onClick={addService} variant="outline" className="rounded-full border-white/15 text-white/80 hover:bg-white/5">
                  <Plus className="w-4 h-4" />
                  إضافة خدمة
                </Button>
              </div>
              {contentDraft.services.map((service, index) => (
                <div key={index} className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm text-white/60">خدمة #{index + 1}</span>
                    <button
                      type="button"
                      onClick={() => removeService(index)}
                      className="text-xs text-red-400 hover:text-red-300 transition-colors"
                    >
                      حذف
                    </button>
                  </div>
                  <Input
                    value={service.title}
                    onChange={(e) => updateService(index, "title", e.target.value)}
                    className="bg-black/20 border-white/10"
                    placeholder="عنوان الخدمة"
                  />
                  <Textarea
                    value={service.desc}
                    onChange={(e) => updateService(index, "desc", e.target.value)}
                    className="bg-black/20 border-white/10 min-h-20"
                    placeholder="وصف الخدمة"
                  />
                </div>
              ))}
            </div>
            {homeContent?.updated_at && (
              <p className="text-xs text-white/30">
                آخر تحديث: {new Date(homeContent.updated_at).toLocaleString("ar-SA")}
              </p>
            )}
            <Button disabled={savingContent} className="rounded-full gap-2 bg-gradient-to-r from-primary to-secondary">
              <Save className="w-4 h-4" />
              {savingContent ? "جاري الحفظ..." : "حفظ المحتوى"}
            </Button>
          </form>
        )}

        {/* Ratings Tab */}
        {tab === "ratings" && (
          <div className="glass-panel rounded-2xl p-6 border border-white/10">
            <h3 className="font-bold text-lg mb-2">إدارة التقييمات</h3>
            <p className="text-sm text-white/50 mb-6">
              الموافقة على التقييمات قبل عرضها على الصفحة الرئيسية أو رفضها وحذفها
            </p>
            <Suspense fallback={<AdminTabLoader />}>
              <AdminRatingsManager onRefresh={fetchData} />
            </Suspense>
          </div>
        )}

        {/* Analytics Tab */}
        {tab === "analytics" && (
          <div className="glass-panel rounded-2xl p-6 border border-white/10">
            <h3 className="font-bold text-lg mb-2">لوحة الإحصائيات</h3>
            <p className="text-sm text-white/50 mb-6">
              رؤية شاملة لأداء متجرك والإيرادات والعملاء
            </p>
            <Suspense fallback={<AdminTabLoader />}>
              <AnalyticsDashboard />
            </Suspense>
          </div>
        )}

        {/* Email Tab */}
        {tab === "email" && (
          <div className="glass-panel rounded-2xl p-6 border border-white/10">
            <h3 className="font-bold text-lg mb-2">البريد الإلكتروني الجماعي</h3>
            <p className="text-sm text-white/50 mb-6">
              أرسل حملات بريدية موجهة لشرائح مختلفة من عملائك
            </p>
            <Suspense fallback={<AdminTabLoader />}>
              <BulkEmailManager />
            </Suspense>
          </div>
        )}

        {/* Automation Tab */}
        {tab === "automation" && (
          <div className="glass-panel rounded-2xl p-6 border border-white/10">
            <h3 className="font-bold text-lg mb-2">الأتمتة والعمليات</h3>
            <p className="text-sm text-white/50 mb-6">
              أنشئ قواعد تلقائية تعمل عند حدوث أحداث معينة
            </p>
            <Suspense fallback={<AdminTabLoader />}>
              <AutomationManager />
            </Suspense>
          </div>
        )}

        {/* Backup Tab */}
        {tab === "backup" && (
          <div className="glass-panel rounded-2xl p-6 border border-white/10">
            <h3 className="font-bold text-lg mb-2">النسخ الاحتياطية</h3>
            <p className="text-sm text-white/50 mb-6">
              احفظ بيانات متجرك بأمان واستعدها عند الحاجة
            </p>
            <Suspense fallback={<AdminTabLoader />}>
              <BackupManager />
            </Suspense>
          </div>
        )}
      </main>
    </div>
  );
}
