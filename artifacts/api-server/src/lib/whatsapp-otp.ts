import { getWhatsAppWebStatus, sendWhatsAppWebMessage, startWhatsAppWebConnection } from "./whatsapp-web.js";
import { isWhatsAppConfigured, sendWhatsAppMessage } from "./whatsapp.js";

async function waitForWhatsAppWebConnection(timeoutMs = 12000, intervalMs = 400) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const status = getWhatsAppWebStatus();
    if (status.connected) return true;
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
  return false;
}

function normalizeDigits(value: string) {
  return String(value || "").replace(/[^0-9]/g, "");
}

export function normalizeSaudiPhone(value: string) {
  const digits = normalizeDigits(value);
  if (!digits) return "";
  if (digits.startsWith("966")) return digits;
  if (digits.startsWith("0")) return `966${digits.slice(1)}`;
  return digits;
}

export async function sendOtpViaWhatsApp(input: {
  to: string;
  otp: string;
  purpose: "admin" | "customer";
  preferredChannel?: "web";
}) {
  const to = normalizeSaudiPhone(input.to);
  if (!to || !input.otp) {
    return { success: false as const, error: "بيانات الإرسال غير مكتملة" };
  }

  const message =
    input.purpose === "admin"
      ? `رمز دخول لوحة التحكم: ${input.otp}\nصالح لمدة 10 دقائق.\nلا تشارك الرمز مع أي شخص.`
      : `رمز تسجيل الدخول: ${input.otp}\nصالح لمدة 10 دقائق.\nلا تشارك الرمز مع أي شخص.`;

  const preferredChannel = input.preferredChannel || "web";

  // 1) Try WhatsApp Web first (current default behavior)
  if (preferredChannel === "web") {
    const webStatus = getWhatsAppWebStatus();

    if (!webStatus.connected) {
      try {
        await startWhatsAppWebConnection();
        await waitForWhatsAppWebConnection();
      } catch {
        // Ignore and continue to fallback channel below.
      }
    }

    const refreshedWebStatus = getWhatsAppWebStatus();
    if (refreshedWebStatus.connected) {
      try {
        await sendWhatsAppWebMessage({ to, message });
        return { success: true as const, mode: "web" as const };
      } catch {
        // Continue to Cloud API fallback.
      }
    }
  }

  // 2) Fallback to official WhatsApp Cloud API if configured
  if (isWhatsAppConfigured()) {
    try {
      const cloudResult = await sendWhatsAppMessage({ to, message });
      if (cloudResult.success) {
        return { success: true as const, mode: "cloud" as const };
      }
    } catch {
      // Fall through to unified user-facing error below.
    }
  }

  // Unified non-technical message for frontend users
  return {
    success: false as const,
    error: "تعذر إرسال رمز واتساب حالياً، حاول بعد قليل أو استخدم البريد الإلكتروني.",
  };
}
