import { useMemo, useState } from "react";
import { X, Loader2, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

interface AuthModalProps {
  onSuccess: () => void;
  onClose: () => void;
  packageName: string;
}

type Step = "step1" | "step2" | "step3";
type FlowMode = "login-email" | "login-whatsapp" | "register" | null;

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function isValidSaudiPhone(value: string) {
  return /^((\+966)5\d{8}|05\d{8}|5\d{8})$/.test(value.replace(/\s/g, ""));
}

function isValidNormalizedSaudiPhone(value: string) {
  return /^9665\d{8}$/.test(value);
}

function formatSaudiPhoneInput(raw: string) {
  const digits = raw.replace(/\D/g, "").slice(0, 12);
  if (!digits) return "";
  if (digits.startsWith("966")) return `+${digits}`;
  if (digits.startsWith("05")) return digits;
  if (digits.startsWith("5")) return `0${digits}`;
  return digits;
}

function normalizeSaudiPhone(raw: string) {
  const digits = raw.replace(/\D/g, "");
  if (!digits) return "";
  // Return backend format: 966xxxxxxxxx (no +, no leading 0)
  if (digits.startsWith("966")) return digits;
  if (digits.startsWith("05")) return `966${digits.slice(1)}`;
  if (digits.startsWith("5")) return `966${digits}`;
  return "";
}

function toUiErrorMessage(err: unknown) {
  if (err instanceof TypeError && /failed to fetch/i.test(err.message)) {
    return "تعذر الاتصال بالخادم، تأكد أن السيرفر يعمل";
  }
  if (err instanceof Error && err.message) {
    return err.message;
  }
  return "حدث خطأ";
}

export default function AuthModal({ onSuccess, onClose, packageName }: AuthModalProps) {
  const { refetch } = useAuth();
  const { toast } = useToast();

  const [step, setStep] = useState<Step>("step1");
  const [flowMode, setFlowMode] = useState<FlowMode>(null);

  const [contactInput, setContactInput] = useState("");
  const [otpInput, setOtpInput] = useState("");
  const [verifiedContact, setVerifiedContact] = useState("");

  const [fullName, setFullName] = useState("");
  const [registerEmail, setRegisterEmail] = useState("");
  const [registerPhone, setRegisterPhone] = useState("");
  const [registerVerificationToken, setRegisterVerificationToken] = useState("");
  const [loading, setLoading] = useState(false);

  const isContactEmail = useMemo(() => isValidEmail(contactInput), [contactInput]);

  const modalTitle = useMemo(() => {
    if (step === "step1") return "تسجيل الدخول";
    if (step === "step2") return "أدخل رمز التحقق";
    return "إنشاء حساب جديد";
  }, [step]);

  const resetModal = () => {
    setStep("step1");
    setFlowMode(null);
    setContactInput("");
    setOtpInput("");
    setVerifiedContact("");
    setFullName("");
    setRegisterEmail("");
    setRegisterPhone("");
    setRegisterVerificationToken("");
  };

  const closeModal = () => {
    resetModal();
    onClose();
  };

  const handleStep1 = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!contactInput.trim()) {
      toast({ title: "أدخل رقم الجوال أو البريد", variant: "destructive" });
      return;
    }

    const rawContact = contactInput.trim();
    const normalizedContact = isContactEmail ? rawContact.toLowerCase() : normalizeSaudiPhone(rawContact);

    if (!isContactEmail && !isValidSaudiPhone(rawContact)) {
      toast({ title: "رقم الجوال غير صحيح", description: "استخدم 05xxxxxxxx أو +9665xxxxxxxx", variant: "destructive" });
      return;
    }

    if (!isContactEmail && !isValidNormalizedSaudiPhone(normalizedContact)) {
      toast({ title: "تعذر قراءة رقم الجوال", description: "أعد كتابة الرقم بصيغة 05xxxxxxxx", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const checkRes = await fetch(`${BASE}/api/customer/check-identifier`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier: normalizedContact }),
        credentials: "include",
      });

      const checkData = (await checkRes.json()) as { exists: boolean; error?: string };
      if (!checkRes.ok) {
        throw new Error(checkData.error || "تعذر التحقق من الحساب");
      }

      if (checkData.exists) {
        const loginEndpoint = isContactEmail
          ? `${BASE}/api/customer/send-login-code`
          : `${BASE}/api/customer/send-login-whatsapp-code`;

        const sendRes = await fetch(loginEndpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ identifier: normalizedContact }),
          credentials: "include",
        });
        const sendData = (await sendRes.json()) as { error?: string };
        if (!sendRes.ok) {
          throw new Error(sendData.error || "تعذر إرسال كود التحقق");
        }

        setFlowMode(isContactEmail ? "login-email" : "login-whatsapp");
        setContactInput(normalizedContact);
        setVerifiedContact(normalizedContact);
        setStep("step2");
        toast({ title: isContactEmail ? "تم إرسال رمز التحقق إلى البريد" : "تم إرسال رمز التحقق إلى واتساب" });
        return;
      }

      if (isContactEmail) {
        toast({
          title: "هذا البريد غير مسجل حالياً",
          description: "لإنشاء حساب جديد أدخل رقم الجوال أولاً (توثيق واتساب)",
          variant: "destructive",
        });
        return;
      }

      const sendRegisterRes = await fetch(`${BASE}/api/customer/register/send-whatsapp-code`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: normalizedContact }),
        credentials: "include",
      });
      const sendRegisterData = (await sendRegisterRes.json()) as { error?: string };
      if (!sendRegisterRes.ok) {
        throw new Error(sendRegisterData.error || "تعذر إرسال كود واتساب");
      }

      setFlowMode("register");
      setContactInput(normalizedContact);
      setRegisterPhone(normalizedContact);
      setVerifiedContact(normalizedContact);
      setStep("step2");
      toast({ title: "تم إرسال رمز التحقق إلى واتساب" });
    } catch (err) {
      toast({ title: toUiErrorMessage(err), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleStep2 = async (e: React.FormEvent) => {
    e.preventDefault();

    if (otpInput.trim().length < 4) {
      toast({ title: "أدخل رمز تحقق صحيح", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      if (flowMode === "login-email" || flowMode === "login-whatsapp") {
        const verifyEndpoint = flowMode === "login-email"
          ? `${BASE}/api/customer/verify-login-code`
          : `${BASE}/api/customer/verify-login-whatsapp-code`;

        const verifyRes = await fetch(verifyEndpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ identifier: contactInput.trim(), code: otpInput.trim() }),
          credentials: "include",
        });
        const verifyData = (await verifyRes.json()) as { error?: string };
        if (!verifyRes.ok) {
          throw new Error(verifyData.error || "الكود غير صحيح");
        }

        refetch();
        onSuccess();
        return;
      }

      const verifyRegisterRes = await fetch(`${BASE}/api/customer/register/verify-whatsapp-code`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: registerPhone.trim(), code: otpInput.trim() }),
        credentials: "include",
      });
      const verifyRegisterData = (await verifyRegisterRes.json()) as { error?: string; verificationToken?: string };
      if (!verifyRegisterRes.ok) {
        throw new Error(verifyRegisterData.error || "الكود غير صحيح");
      }

      if (!verifyRegisterData.verificationToken) {
        throw new Error("تعذر تثبيت حالة توثيق الرقم، أعد المحاولة");
      }

      setRegisterVerificationToken(verifyRegisterData.verificationToken);
      setStep("step3");
      toast({ title: "تم التحقق من الرقم" });
    } catch (err) {
      toast({ title: toUiErrorMessage(err), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleStep3 = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!fullName.trim()) {
      toast({ title: "الاسم الكامل مطلوب", variant: "destructive" });
      return;
    }

    if (!registerEmail.trim() || !isValidEmail(registerEmail)) {
      toast({ title: "أدخل بريدًا إلكترونيًا صحيحًا", variant: "destructive" });
      return;
    }

    if (!isValidSaudiPhone(registerPhone)) {
      toast({ title: "رقم الجوال غير صحيح", variant: "destructive" });
      return;
    }

    const generatedPassword = `wa-${Math.random().toString(36).slice(2, 12)}A1`;

    setLoading(true);
    try {
      const res = await fetch(`${BASE}/api/customer/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: registerEmail.trim(),
          password: generatedPassword,
          fullName: fullName.trim(),
          phone: normalizeSaudiPhone(registerPhone),
          verificationToken: registerVerificationToken,
        }),
        credentials: "include",
      });

      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        throw new Error(data.error || "فشل إنشاء الحساب");
      }

      refetch();
      onSuccess();
    } catch (err) {
      toast({ title: toUiErrorMessage(err), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const resendCode = async () => {
    if (!flowMode) return;

    setLoading(true);
    try {
      if (flowMode === "login-email" || flowMode === "login-whatsapp") {
        const resendEndpoint = flowMode === "login-email"
          ? `${BASE}/api/customer/send-login-code`
          : `${BASE}/api/customer/send-login-whatsapp-code`;

        const res = await fetch(resendEndpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ identifier: contactInput.trim() }),
          credentials: "include",
        });
        const data = (await res.json()) as { error?: string };
        if (!res.ok) throw new Error(data.error || "تعذر إعادة إرسال الكود");
      } else {
        const res = await fetch(`${BASE}/api/customer/register/send-whatsapp-code`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phone: registerPhone.trim() }),
          credentials: "include",
        });
        const data = (await res.json()) as { error?: string };
        if (!res.ok) throw new Error(data.error || "تعذر إعادة إرسال الكود");
      }

      toast({ title: "تم إعادة إرسال رمز التحقق" });
    } catch (err) {
      toast({ title: toUiErrorMessage(err), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 px-4 backdrop-blur-sm"
      onClick={(event) => {
        if (event.target === event.currentTarget) closeModal();
      }}
      dir="rtl"
    >
      <div className="relative w-full max-w-[400px] overflow-hidden rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(41,19,74,0.98),rgba(25,10,47,0.98))] p-6 text-center shadow-[0_24px_80px_rgba(0,0,0,0.45)] sm:p-7">
        <div className="pointer-events-none absolute inset-x-10 top-0 h-24 rounded-full bg-primary/20 blur-3xl" />
        <button
          type="button"
          className="absolute right-4 top-4 text-rose-300 transition-colors hover:text-rose-200"
          onClick={closeModal}
          aria-label="إغلاق"
        >
          <X className="h-6 w-6" />
        </button>

        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-white/15 bg-white/5 backdrop-blur">
          <User className="h-8 w-8 text-white/75" />
        </div>

        <h2 className="mb-1 text-lg font-bold text-white">{modalTitle}</h2>
        {step === "step1" && <p className="mb-5 text-xs text-white/50">{packageName}</p>}

        {step === "step1" && (
          <form className="text-right" onSubmit={handleStep1}>
            <div className="mb-4">
              <label className="mb-2 block text-[13px] text-white/70">رقم الجوال أو البريد الإلكتروني</label>
              <Input
                type="text"
                value={contactInput}
                onChange={(e) => {
                  const value = e.target.value;
                  if (/^[+0-9\s-]*$/.test(value)) {
                    setContactInput(formatSaudiPhoneInput(value));
                  } else {
                    setContactInput(value);
                  }
                }}
                placeholder="05x xxx xxxx أو البريد"
                required
                className="h-11 border-white/15 bg-white/6 text-sm text-white placeholder:text-white/35"
                dir="ltr"
              />
            </div>
            <Button type="submit" disabled={loading} className="h-11 w-full bg-gradient-to-r from-primary to-secondary text-white hover:opacity-90">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "دخول"}
            </Button>
          </form>
        )}

        {step === "step2" && (
          <form className="text-right" onSubmit={handleStep2}>
            <div className="mb-4">
              <label className="mb-2 block text-[13px] text-white/70">رمز التحقق</label>
              <Input
                type="text"
                value={otpInput}
                onChange={(e) => setOtpInput(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="أدخل الرمز المكون من 4 إلى 6 أرقام"
                required
                className="h-11 border-white/15 bg-white/6 text-center tracking-[5px] text-white placeholder:text-white/35"
                dir="ltr"
              />
            </div>
            <Button type="submit" disabled={loading} className="h-11 w-full bg-gradient-to-r from-primary to-secondary text-white hover:opacity-90">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "تحقق"}
            </Button>
            <button
              type="button"
              onClick={resendCode}
              disabled={loading}
              className="mt-3 text-xs text-white/50 transition-colors hover:text-white/80"
            >
              إعادة إرسال الرمز
            </button>
            <div className="mt-3 text-center text-xs text-white/45">
              {(flowMode === "login-whatsapp" || flowMode === "register") ? "تم إرسال رمز التحقق إلى رقمك عبر الواتساب" : "تم إرسال رمز التحقق إلى بريدك الإلكتروني"}
            </div>
          </form>
        )}

        {step === "step3" && (
          <form className="text-right" onSubmit={handleStep3}>
            <div className="mb-4">
              <label className="mb-2 block text-[13px] text-white/70">الاسم الكامل</label>
              <Input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="أدخل اسمك الكريم"
                required
                className="h-11 border-white/15 bg-white/6 text-white placeholder:text-white/35"
              />
            </div>
            <div className="mb-4">
              <label className="mb-2 block text-[13px] text-white/70">رقم الجوال المتحقق منه</label>
              <Input type="text" value={verifiedContact} readOnly className="h-11 border-white/10 bg-white/8 text-white/80" dir="ltr" />
            </div>
            <div className="mb-4">
              <label className="mb-2 block text-[13px] text-white/70">البريد الإلكتروني</label>
              <Input
                type="email"
                value={registerEmail}
                onChange={(e) => setRegisterEmail(e.target.value)}
                placeholder="name@example.com"
                required
                className="h-11 border-white/15 bg-white/6 text-white placeholder:text-white/35"
                dir="ltr"
              />
            </div>
            <Button type="submit" disabled={loading} className="h-11 w-full bg-gradient-to-r from-primary to-secondary text-white hover:opacity-90">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "إنشاء حساب"}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
