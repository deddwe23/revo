import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "wouter";
import { MessageCircle, KeyRound, Loader2, TerminalSquare, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

async function readJsonResponse<T>(res: Response): Promise<T> {
  const text = await res.text();

  if (!text.trim()) {
    throw new Error("الخادم لم يرجع استجابة. شغّل الخلفية والواجهة معاً بالأمر: pnpm dev");
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error("استجابة الخادم غير صالحة. تأكد أن API شغال وأن الواجهة تعمل عبر Vite proxy.");
  }
}

export default function AdminLogin() {
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const [step, setStep] = useState<"email" | "otp">("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [storeName, setStoreName] = useState("لوحة التحكم");
  const adminPhone = "0533170903";
  const [useEmailLogin, setUseEmailLogin] = useState(false);
  const [sentTo, setSentTo] = useState("");

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch(`${BASE}/api/store/settings`);
        if (!res.ok) return;
        const data = await res.json() as { settings?: { store_name?: string | null } | null };
        if (data.settings?.store_name) {
          setStoreName(data.settings.store_name);
        }
      } catch {
        // Keep fallback title when the API is unavailable.
      }
    })();
  }, []);

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(
        useEmailLogin ? `${BASE}/api/auth/send-otp` : `${BASE}/api/auth/send-whatsapp-otp`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(useEmailLogin ? { email } : { phone: adminPhone }),
          credentials: "include",
        },
      );
      
      if (!res.ok) {
        const data = await readJsonResponse<{ success?: boolean; error?: string }>(res);
        throw new Error(data.error || "فشل إرسال الكود");
      }
      
      const data = await readJsonResponse<{ success: boolean; error?: string }>(res);
      if (!data.success) throw new Error(data.error || "حدث خطأ");

      setSentTo(useEmailLogin ? email : adminPhone);
      toast({
        title: "تم إرسال الكود",
        description: useEmailLogin ? "تحقق من البريد الإلكتروني" : "تحقق من واتساب رقم الإدارة",
      });
      setStep("otp");
    } catch (err) {
      toast({ title: "خطأ", description: err instanceof Error ? err.message : "حاول مرة أخرى", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(`${BASE}/api/auth/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ otp }),
        credentials: "include",
      });
      const data = await readJsonResponse<{ success: boolean; error?: string }>(res);
      if (!res.ok) throw new Error(data.error || "الكود غير صحيح");
      navigate("/admin/dashboard");
    } catch (err) {
      toast({ title: "خطأ", description: err instanceof Error ? err.message : "حاول مرة أخرى", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4" dir="rtl">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-primary/15 blur-[100px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        className="w-full max-w-md glass-panel p-10 rounded-3xl border border-white/10 relative z-10"
      >
        <div className="text-center mb-10">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center mx-auto mb-4 shadow-[0_0_20px_rgba(124,58,237,0.5)]">
            <TerminalSquare className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold">لوحة التحكم</h1>
          <p className="text-white/50 text-sm mt-2">{storeName} — المدير</p>
        </div>

        <AnimatePresence mode="wait">
          {step === "email" ? (
            <motion.form
              key="email"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              onSubmit={handleSendOtp}
              className="space-y-5"
            >
              <div className="space-y-2">
                <label className="text-sm font-semibold text-white/70 block">
                  {useEmailLogin ? "البريد الإلكتروني للإدارة" : "رقم واتساب الإدارة"}
                </label>
                <div className="relative">
                  {useEmailLogin ? (
                    <Mail className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                  ) : (
                    <MessageCircle className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                  )}
                  <Input
                    type={useEmailLogin ? "email" : "text"}
                    required
                    readOnly={!useEmailLogin}
                    value={useEmailLogin ? email : adminPhone}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pr-11 bg-white/5 border-white/15 h-13 rounded-xl text-white placeholder:text-white/25 focus-visible:border-primary"
                  />
                </div>
              </div>
              <Button
                type="submit"
                disabled={loading}
                className="w-full h-13 rounded-xl bg-gradient-to-r from-primary to-secondary text-white font-bold flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                متابعة
              </Button>

              <button
                type="button"
                onClick={() => setUseEmailLogin((prev) => !prev)}
                className="w-full text-center text-sm text-white/55 hover:text-white/80 transition-colors"
              >
                {useEmailLogin ? "تسجيل دخول برقم الجوال" : "تسجيل دخول بالبريد الإلكتروني"}
              </button>
            </motion.form>
          ) : (
            <motion.form
              key="otp"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              onSubmit={handleVerifyOtp}
              className="space-y-5"
            >
              <div className="text-center mb-6 p-4 rounded-xl bg-primary/10 border border-primary/20">
                <p className="text-sm text-white/70">
                  تم إرسال كود التحقق إلى
                </p>
                <p className="font-bold text-primary mt-1" dir="ltr">{sentTo}</p>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-white/70 block">كود التحقق</label>
                <div className="relative">
                  <KeyRound className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                  <Input
                    type="text"
                    required
                    placeholder="أدخل الكود المكون من 6 أرقام"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    className="pr-11 bg-white/5 border-white/15 h-13 rounded-xl text-white placeholder:text-white/25 focus-visible:border-primary tracking-[0.3em] text-center text-xl"
                    maxLength={6}
                  />
                </div>
              </div>
              <Button
                type="submit"
                disabled={loading || otp.length < 6}
                className="w-full h-13 rounded-xl bg-gradient-to-r from-primary to-secondary text-white font-bold flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                دخول
              </Button>
              <button
                type="button"
                onClick={() => { setStep("email"); setOtp(""); }}
                className="w-full text-center text-sm text-white/40 hover:text-white/70 transition-colors"
              >
                العودة وتغيير طريقة الإرسال
              </button>
            </motion.form>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
