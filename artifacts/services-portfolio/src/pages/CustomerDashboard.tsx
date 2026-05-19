import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useLocation } from "wouter";
import { Package, CheckCircle2, XCircle, Zap, LogOut, User, Search, ArrowRight, Pencil, Save, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

interface OrderItem {
  package_name: string;
  quantity: number;
  unit_price_sar: number;
  line_total_sar: number;
}

interface Order {
  id: number;
  package_id: string;
  package_name: string;
  status: string;
  created_at: string;
  has_receipt: boolean;
  items: OrderItem[];
}

const statusConfig: Record<string, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  pending_review: { label: "تحت المراجعة", color: "#f59e0b", bg: "rgba(245,158,11,0.15)", icon: <Search className="w-4 h-4" /> },
  in_progress:    { label: "جاري التجهيز", color: "#3b82f6", bg: "rgba(59,130,246,0.15)", icon: <Zap className="w-4 h-4" /> },
  completed:      { label: "مكتمل",         color: "#22c55e", bg: "rgba(34,197,94,0.15)",  icon: <CheckCircle2 className="w-4 h-4" /> },
  cancelled:      { label: "ملغي",           color: "#ef4444", bg: "rgba(239,68,68,0.15)", icon: <XCircle className="w-4 h-4" /> },
};

interface Profile {
  id: number;
  email: string;
  fullName: string;
  phone: string | null;
}

export default function CustomerDashboard() {
  const { customer, loading, logout } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [orders, setOrders] = useState<Order[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({ fullName: "", email: "" });
  const [savingProfile, setSavingProfile] = useState(false);
  // Phone change OTP flow
  const [phoneStep, setPhoneStep] = useState<"idle" | "input" | "otp">("idle");
  const [newPhone, setNewPhone] = useState("");
  const [phoneOtp, setPhoneOtp] = useState("");
  const [sendingPhoneOtp, setSendingPhoneOtp] = useState(false);
  const [confirmingPhone, setConfirmingPhone] = useState(false);

  useEffect(() => {
    if (!loading && !customer) navigate("/");
  }, [loading, customer, navigate]);

  useEffect(() => {
    if (!customer) return;
    setProfileLoading(true);
    // Load profile immediately without waiting for orders
    void (async () => {
      try {
        const profileRes = await fetch(`${BASE}/api/customer/profile`, { credentials: "include" });
        const profileData = await profileRes.json() as { profile?: Profile };
        setProfile(profileData.profile ?? null);
      } catch {
        // Silently fail on profile, orders might still load
      } finally {
        setProfileLoading(false);
      }
    })();
    // Load orders in parallel (don't wait for profile)
    void (async () => {
      try {
        const ordersRes = await fetch(`${BASE}/api/customer/orders`, { credentials: "include" });
        const ordersData = await ordersRes.json() as { orders: Order[] };
        setOrders(ordersData.orders);
      } catch {
        toast({ title: "تعذر تحميل الطلبات", variant: "destructive" });
      } finally {
        setOrdersLoading(false);
      }
    })();
  }, [customer]);

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  const startEditProfile = () => {
    setProfileForm({
      fullName: profile?.fullName ?? customer?.fullName ?? "",
      email: profile?.email ?? customer?.email ?? "",
    });
    setPhoneStep("idle");
    setNewPhone("");
    setPhoneOtp("");
    setEditingProfile(true);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileForm.fullName.trim()) {
      toast({ title: "الاسم لا يمكن أن يكون فارغاً", variant: "destructive" });
      return;
    }
    setSavingProfile(true);
    try {
      const res = await fetch(`${BASE}/api/customer/profile`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullName: profileForm.fullName.trim(), email: profileForm.email.trim() || undefined }),
        credentials: "include",
      });
      const data = await res.json() as { profile?: Profile; error?: string };
      if (!res.ok) throw new Error(data.error ?? "خطأ في الحفظ");
      setProfile(data.profile ?? null);
      setEditingProfile(false);
      toast({ title: "تم تحديث معلوماتك بنجاح" });
    } catch (err) {
      toast({ title: err instanceof Error ? err.message : "خطأ في الحفظ", variant: "destructive" });
    } finally {
      setSavingProfile(false);
    }
  };

  const handleRequestPhoneOtp = async () => {
    if (!newPhone.trim()) {
      toast({ title: "أدخل رقم الجوال الجديد", variant: "destructive" });
      return;
    }
    setSendingPhoneOtp(true);
    try {
      const res = await fetch(`${BASE}/api/customer/profile/request-phone-change`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newPhone: newPhone.trim() }),
        credentials: "include",
      });
      const data = await res.json() as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "تعذر إرسال الكود");
      setPhoneStep("otp");
      toast({ title: "تم إرسال كود التحقق إلى رقمك الجديد عبر الواتساب" });
    } catch (err) {
      toast({ title: err instanceof Error ? err.message : "خطأ في الإرسال", variant: "destructive" });
    } finally {
      setSendingPhoneOtp(false);
    }
  };

  const handleConfirmPhoneChange = async () => {
    if (!phoneOtp.trim()) {
      toast({ title: "أدخل كود التحقق", variant: "destructive" });
      return;
    }
    setConfirmingPhone(true);
    try {
      const res = await fetch(`${BASE}/api/customer/profile/confirm-phone-change`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: phoneOtp.trim() }),
        credentials: "include",
      });
      const data = await res.json() as { profile?: Profile; error?: string };
      if (!res.ok) throw new Error(data.error ?? "كود غير صحيح");
      setProfile(data.profile ?? null);
      setPhoneStep("idle");
      setNewPhone("");
      setPhoneOtp("");
      toast({ title: "تم تغيير رقم الجوال بنجاح" });
    } catch (err) {
      toast({ title: err instanceof Error ? err.message : "خطأ في التحقق", variant: "destructive" });
    } finally {
      setConfirmingPhone(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!customer) return null;

  const stats = {
    total: orders.length,
    pending_review: orders.filter(o => o.status === "pending_review").length,
    in_progress: orders.filter(o => o.status === "in_progress").length,
    completed: orders.filter(o => o.status === "completed").length,
  };

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      {/* Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-0 right-0 w-[600px] h-[400px] rounded-full bg-purple-600/10 blur-[100px]" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[300px] rounded-full bg-blue-600/10 blur-[100px]" />
      </div>

      {/* Header */}
      <div className="relative z-10 border-b border-white/5 bg-black/20 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <button onClick={() => navigate("/")} className="flex items-center gap-2 text-white/60 hover:text-white transition-colors text-sm">
            <ArrowRight className="w-4 h-4" />
            الرئيسية
          </button>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-primary font-bold">REVO</span>
            <span className="text-white font-bold"> | ريفو</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-sm text-white/60">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
                <User className="w-4 h-4 text-white" />
              </div>
              <span className="hidden sm:block">{customer.fullName}</span>
            </div>
            <button onClick={handleLogout} className="flex items-center gap-1 text-white/40 hover:text-red-400 transition-colors text-sm">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <main className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 py-10">
        {/* Welcome */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-10">
          <h1 className="text-3xl font-black mb-1">مرحباً، {customer.fullName.split(" ")[0]} 👋</h1>
          <p className="text-white/50">{customer.email}</p>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-10"
        >
          {[
            { label: "إجمالي الطلبات", value: stats.total, color: "#7c3aed", icon: <Package className="w-5 h-5" /> },
            { label: "تحت المراجعة",   value: stats.pending_review, color: "#f59e0b", icon: <Search className="w-5 h-5" /> },
            { label: "جاري التجهيز",   value: stats.in_progress,   color: "#3b82f6", icon: <Zap className="w-5 h-5" /> },
            { label: "مكتملة",          value: stats.completed,      color: "#22c55e", icon: <CheckCircle2 className="w-5 h-5" /> },
          ].map((stat, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 + i * 0.05 }}
              className="glass-panel p-5 rounded-2xl"
              style={{ borderColor: `${stat.color}30` }}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `${stat.color}20`, color: stat.color }}>
                  {stat.icon}
                </div>
                <span className="text-3xl font-black" style={{ color: stat.color }}>{stat.value}</span>
              </div>
              <p className="text-white/50 text-sm">{stat.label}</p>
            </motion.div>
          ))}
        </motion.div>

        {/* Orders */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass-panel rounded-3xl overflow-hidden"
        >
          <div className="p-6 border-b border-white/5">
            <h2 className="text-xl font-bold">طلباتي</h2>
          </div>

          {ordersLoading ? (
            <div className="p-20 flex justify-center">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : orders.length === 0 ? (
            <div className="p-20 text-center">
              <Package className="w-12 h-12 text-white/20 mx-auto mb-4" />
              <p className="text-white/40 mb-6">لا توجد طلبات حتى الآن</p>
              <Button
                onClick={() => navigate("/")}
                className="rounded-full bg-gradient-to-r from-primary to-secondary text-white px-8"
              >
                استعرض الباقات
              </Button>
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {orders.map((order, i) => {
                const cfg = statusConfig[order.status] ?? statusConfig.pending_review;
                return (
                  <motion.div
                    key={order.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.05 * i }}
                    className="p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center gap-4"
                  >
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/30 to-secondary/30 flex items-center justify-center shrink-0">
                      <Package className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      {order.items && order.items.length > 0 ? (
                        <div className="space-y-0.5">
                          {order.items.map((item, idx) => (
                            <p key={idx} className="font-bold text-white truncate text-sm">
                              {item.package_name}
                              {item.quantity > 1 && <span className="text-white/40 font-normal"> ×{item.quantity}</span>}
                            </p>
                          ))}
                        </div>
                      ) : (
                        <p className="font-bold text-white truncate">{order.package_name}</p>
                      )}
                      <p className="text-white/40 text-sm mt-0.5">
                        #{order.id} · {new Date(order.created_at).toLocaleDateString("ar-SA", { year: "numeric", month: "long", day: "numeric" })}
                        {!order.has_receipt && <span className="text-yellow-400/70 mr-2">· لم يُرفع إيصال</span>}
                      </p>
                      {order.items && order.items.length > 0 && (
                        <p className="text-primary font-black text-sm mt-0.5">
                          {order.items.reduce((sum, i) => sum + i.line_total_sar, 0).toLocaleString("ar-SA")} ر.س
                        </p>
                      )}
                    </div>

                    {/* Status timeline (not for cancelled) */}
                    {order.status !== "cancelled" && (
                      <div className="flex items-center gap-2">
                        {["pending_review", "in_progress", "completed"].map((s, idx) => {
                          const active = s === order.status;
                          const done = order.status === "completed" && idx < 2 ||
                                       order.status === "in_progress" && idx < 1;
                          const sCfg = statusConfig[s];
                          if (!sCfg) return null;
                          return (
                            <div key={s} className="flex items-center gap-1">
                              <div
                                className="w-2 h-2 rounded-full transition-all"
                                style={{ background: active ? sCfg.color : done ? "#22c55e" : "rgba(255,255,255,0.15)", boxShadow: active ? `0 0 8px ${sCfg.color}` : "none" }}
                              />
                              {idx < 2 && <div className="w-4 h-px" style={{ background: done ? "#22c55e" : "rgba(255,255,255,0.1)" }} />}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-semibold shrink-0" style={{ background: cfg.bg, color: cfg.color }}>
                      {cfg.icon}
                      {cfg.label}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </motion.div>

        {/* Profile section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="mt-6 glass-panel rounded-3xl overflow-hidden"
        >
          <div className="p-6 border-b border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <User className="w-5 h-5 text-primary" />
              <h2 className="text-xl font-bold">معلوماتي الشخصية</h2>
            </div>
            {!editingProfile && (
              <button
                onClick={startEditProfile}
                className="flex items-center gap-1.5 text-sm text-primary/80 hover:text-primary transition-colors"
              >
                <Pencil className="w-4 h-4" />
                تعديل
              </button>
            )}
          </div>

          <div className="p-6">
            {!editingProfile ? (
              /* ── View mode ── */
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-0 divide-y sm:divide-y-0 divide-white/5">
                <div className="pb-4 sm:pb-0 sm:pe-6">
                  <p className="text-xs text-white/40 mb-1.5">الاسم الكامل</p>
                  <p className="font-semibold text-white">{profile?.fullName ?? customer?.fullName ?? "—"}</p>
                </div>
                <div className="py-4 sm:py-0 sm:px-6 sm:border-r sm:border-l sm:border-white/8">
                  <p className="text-xs text-white/40 mb-1.5">البريد الإلكتروني</p>
                  <p className="font-semibold text-white/90 break-all text-sm">{profile?.email ?? customer?.email ?? "—"}</p>
                </div>
                <div className="pt-4 sm:pt-0 sm:ps-6">
                  <p className="text-xs text-white/40 mb-1.5">رقم الجوال</p>
                  <p className="font-semibold text-white">{profileLoading ? "..." : profile?.phone ?? "—"}</p>
                </div>
              </div>
            ) : (
              /* ── Edit mode ── */
              <form onSubmit={(e) => void handleSaveProfile(e)} className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-white/60 text-xs mb-1.5">الاسم الكامل</label>
                    <Input
                      value={profileForm.fullName}
                      onChange={(e) => setProfileForm((p) => ({ ...p, fullName: e.target.value }))}
                      placeholder="اسمك الكريم"
                      className="bg-white/5 border-white/15 text-white"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-white/60 text-xs mb-1.5">البريد الإلكتروني</label>
                    <Input
                      type="email"
                      value={profileForm.email}
                      onChange={(e) => setProfileForm((p) => ({ ...p, email: e.target.value }))}
                      placeholder="email@example.com"
                      dir="ltr"
                      className="bg-white/5 border-white/15 text-white"
                    />
                  </div>
                </div>

                {/* Phone change section */}
                <div className="rounded-xl border border-white/10 bg-white/3 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-white/40 mb-0.5">رقم الجوال</p>
                      <p className="text-sm font-semibold text-white">{profileLoading ? "..." : profile?.phone ?? "—"}</p>
                    </div>
                    {phoneStep === "idle" && (
                      <button
                        type="button"
                        onClick={() => setPhoneStep("input")}
                        className="text-xs text-primary hover:text-primary/80 border border-primary/30 rounded-lg px-3 py-1.5 transition-colors"
                      >
                        تغيير الرقم
                      </button>
                    )}
                  </div>

                  {phoneStep === "input" && (
                    <div className="space-y-2 pt-1 border-t border-white/8">
                      <p className="text-xs text-white/50">أدخل رقم جوالك الجديد وسيصلك كود واتساب للتأكيد</p>
                      <div className="flex gap-2">
                        <Input
                          value={newPhone}
                          onChange={(e) => setNewPhone(e.target.value)}
                          placeholder="05xxxxxxxx"
                          dir="ltr"
                          className="bg-white/5 border-white/15 text-white flex-1"
                        />
                        <Button
                          type="button"
                          onClick={() => void handleRequestPhoneOtp()}
                          disabled={sendingPhoneOtp}
                          className="shrink-0 bg-gradient-to-r from-primary to-secondary text-white hover:opacity-90"
                        >
                          {sendingPhoneOtp ? <Loader2 className="w-4 h-4 animate-spin" /> : "إرسال كود"}
                        </Button>
                        <button
                          type="button"
                          onClick={() => { setPhoneStep("idle"); setNewPhone(""); }}
                          className="shrink-0 text-white/40 hover:text-white/70 transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}

                  {phoneStep === "otp" && (
                    <div className="space-y-2 pt-1 border-t border-white/8">
                      <p className="text-xs text-white/50">أدخل كود التحقق المرسل إلى <span className="text-white" dir="ltr">{newPhone}</span></p>
                      <div className="flex gap-2">
                        <Input
                          value={phoneOtp}
                          onChange={(e) => setPhoneOtp(e.target.value)}
                          placeholder="— — — — — —"
                          dir="ltr"
                          maxLength={6}
                          className="bg-white/5 border-white/15 text-white flex-1 tracking-widest text-center"
                        />
                        <Button
                          type="button"
                          onClick={() => void handleConfirmPhoneChange()}
                          disabled={confirmingPhone}
                          className="shrink-0 bg-gradient-to-r from-primary to-secondary text-white hover:opacity-90"
                        >
                          {confirmingPhone ? <Loader2 className="w-4 h-4 animate-spin" /> : "تأكيد"}
                        </Button>
                        <button
                          type="button"
                          onClick={() => { setPhoneStep("input"); setPhoneOtp(""); }}
                          className="shrink-0 text-white/40 hover:text-white/70 transition-colors text-xs"
                        >
                          رجوع
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <Button type="submit" disabled={savingProfile} className="gap-2 bg-gradient-to-r from-primary to-secondary text-white hover:opacity-90">
                    {savingProfile ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    حفظ الاسم والبريد
                  </Button>
                  <button
                    type="button"
                    onClick={() => { setEditingProfile(false); setPhoneStep("idle"); setNewPhone(""); setPhoneOtp(""); }}
                    className="flex items-center gap-1 text-sm text-white/40 hover:text-white/70 transition-colors"
                  >
                    <X className="w-4 h-4" />
                    إلغاء
                  </button>
                </div>
              </form>
            )}
          </div>
        </motion.div>

        {/* New order CTA */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="mt-6 text-center"
        >
          <Button
            onClick={() => navigate("/")}
            variant="outline"
            className="rounded-full border-white/15 text-white/60 hover:text-white hover:bg-white/5 px-8"
          >
            طلب باقة جديدة
          </Button>
        </motion.div>
      </main>
    </div>
  );
}
