import nodemailer from "nodemailer";

export function isEmailConfigured() {
  const user = process.env["ADMIN_EMAIL"] || "re32vo@gmail.com";
  const pass = process.env["GMAIL_APP_PASSWORD"]?.replace(/\s+/g, "");
  return Boolean(user && pass);
}

function createTransporter() {
  const user = process.env["ADMIN_EMAIL"] || "re32vo@gmail.com";
  const pass = process.env["GMAIL_APP_PASSWORD"]?.replace(/\s+/g, "");
  if (!user || !pass) return null;
  return nodemailer.createTransport({ service: "gmail", auth: { user, pass } });
}

const ADMIN_EMAIL = process.env["ADMIN_EMAIL"] || "re32vo@gmail.com";

export interface OrderNotificationItem {
  packageName: string;
  quantity: number;
  unitPriceSar: number;
  lineTotalSar: number;
}

export async function sendOrderNotification(order: {
  customerName: string; packageName: string; packageId: string;
  orderId: number; hasReceipt: boolean; customerEmail?: string;
  items?: OrderNotificationItem[];
  totalPriceSar?: number; discountSar?: number; finalPriceSar?: number; couponCode?: string;
}) {
  const transporter = createTransporter();
  if (!transporter) { console.warn("Email not configured"); return false; }

  const itemsHtml = order.items && order.items.length > 0
    ? `
      <tr><td colspan="2" style="padding:12px 8px 4px;color:#aaa;font-size:12px;text-transform:uppercase;letter-spacing:1px;">المنتجات المطلوبة</td></tr>
      <tr><td colspan="2" style="padding:0 8px 8px;">
        <table style="width:100%;border-collapse:collapse;background:#ffffff08;border-radius:8px;overflow:hidden;">
          <thead>
            <tr style="background:#7c3aed20;">
              <th style="padding:8px 12px;text-align:right;color:#aaa;font-weight:normal;font-size:13px;">المنتج</th>
              <th style="padding:8px 12px;text-align:center;color:#aaa;font-weight:normal;font-size:13px;">الكمية</th>
              <th style="padding:8px 12px;text-align:left;color:#aaa;font-weight:normal;font-size:13px;">الإجمالي</th>
            </tr>
          </thead>
          <tbody>
            ${order.items.map(item => `
            <tr style="border-top:1px solid #ffffff10;">
              <td style="padding:8px 12px;font-weight:bold;">${item.packageName}</td>
              <td style="padding:8px 12px;text-align:center;color:#aaa;">${item.quantity}</td>
              <td style="padding:8px 12px;text-align:left;color:#7c3aed;font-weight:bold;">${item.lineTotalSar} ر.س</td>
            </tr>`).join("")}
          </tbody>
        </table>
      </td></tr>`
    : `<tr><td style="padding:8px;color:#aaa;">المنتج:</td><td style="padding:8px;font-weight:bold;">${order.packageName}</td></tr>`;

  const pricingHtml = order.totalPriceSar !== undefined ? `
    <tr><td style="padding:8px;color:#aaa;">المجموع:</td><td style="padding:8px;">${order.totalPriceSar} ر.س</td></tr>
    ${order.couponCode ? `<tr><td style="padding:8px;color:#aaa;">كوبون (${order.couponCode}):</td><td style="padding:8px;color:#22c55e;">- ${order.discountSar} ر.س</td></tr>` : ""}
    <tr style="border-top:1px solid #ffffff20;"><td style="padding:10px 8px;color:#aaa;font-weight:bold;">الإجمالي النهائي:</td><td style="padding:10px 8px;font-weight:bold;color:#7c3aed;font-size:18px;">${order.finalPriceSar} ر.س</td></tr>
  ` : "";

  await transporter.sendMail({
    from: `"ستوديو.كود" <${ADMIN_EMAIL}>`,
    to: ADMIN_EMAIL,
    subject: `طلب جديد #${order.orderId} - ${order.customerName}`,
    html: `
      <div dir="rtl" style="font-family:Arial,sans-serif;max-width:620px;margin:auto;background:#0d0020;color:white;border-radius:12px;padding:32px;">
        <h2 style="color:#7c3aed;margin:0 0 4px;">🛒 طلب جديد وصل!</h2>
        <p style="color:#aaa;margin:0 0 20px;font-size:14px;">تفاصيل الطلب الواردة عبر الموقع</p>
        <hr style="border-color:#ffffff20;"/>
        <table style="width:100%;border-collapse:collapse;margin-top:16px;">
          <tr><td style="padding:8px;color:#aaa;">رقم الطلب:</td><td style="padding:8px;font-weight:bold;">#${order.orderId}</td></tr>
          <tr><td style="padding:8px;color:#aaa;">اسم العميل:</td><td style="padding:8px;font-weight:bold;">${order.customerName}</td></tr>
          <tr><td style="padding:8px;color:#aaa;">البريد الإلكتروني:</td><td style="padding:8px;">${order.customerEmail || "—"}</td></tr>
          <tr><td style="padding:8px;color:#aaa;">إيصال:</td><td style="padding:8px;">${order.hasReceipt ? "✅ تم إرفاق إيصال" : "❌ لا يوجد إيصال"}</td></tr>
          ${itemsHtml}
          ${pricingHtml}
        </table>
        <div style="margin-top:24px;padding:16px;background:#7c3aed15;border:1px solid #7c3aed30;border-radius:8px;">
          <p style="margin:0;color:#aaa;font-size:13px;">يمكنك الاطلاع على الطلب من لوحة التحكم والتحقق من التحويل البنكي.</p>
        </div>
      </div>
    `,
  });
  return true;
}

export async function sendOtpEmail(otp: string) {
  const transporter = createTransporter();
  if (!transporter) { console.warn("Email not configured"); return false; }
  await transporter.sendMail({
    from: `"ستوديو.كود" <${ADMIN_EMAIL}>`,
    to: ADMIN_EMAIL,
    subject: "كود تسجيل الدخول - ستوديو.كود",
    html: `
      <div dir="rtl" style="font-family:Arial,sans-serif;max-width:400px;margin:auto;background:#0d0020;color:white;border-radius:12px;padding:32px;text-align:center;">
        <h2 style="color:#7c3aed;">كود التحقق</h2>
        <p style="color:#aaa;">استخدم الكود التالي لتسجيل الدخول. صالح لمدة 10 دقائق.</p>
        <div style="font-size:48px;font-weight:bold;letter-spacing:12px;color:#00aaff;margin:24px 0;">${otp}</div>
      </div>
    `,
  });
  return true;
}

export async function sendCustomerLoginCodeEmail(to: string, code: string) {
  const transporter = createTransporter();
  if (!transporter) { console.warn("Email not configured"); return false; }

  await transporter.sendMail({
    from: `"ستوديو.كود" <${ADMIN_EMAIL}>`,
    to,
    subject: "رمز تسجيل الدخول",
    html: `
      <div dir="rtl" style="font-family:Arial,sans-serif;max-width:420px;margin:auto;background:#0d0020;color:white;border-radius:12px;padding:32px;text-align:center;">
        <h2 style="color:#7c3aed;margin:0 0 10px;">رمز تسجيل الدخول</h2>
        <p style="color:#aaa;margin:0 0 18px;">استخدم الرمز التالي لإكمال تسجيل الدخول. صالح لمدة 10 دقائق.</p>
        <div style="font-size:44px;font-weight:bold;letter-spacing:10px;color:#00aaff;margin:20px 0;">${code}</div>
      </div>
    `,
  });

  return true;
}

export async function sendCustomEmail(to: string, subject: string, body: string) {
  const transporter = createTransporter();
  if (!transporter) {
    console.warn("Email not configured");
    return false;
  }

  await transporter.sendMail({
    from: `"ستوديو.كود" <${ADMIN_EMAIL}>`,
    to,
    subject,
    html: `
      <div dir="rtl" style="font-family:Arial,sans-serif;max-width:620px;margin:auto;background:#0d0020;color:white;border-radius:12px;padding:28px;">
        <h2 style="margin:0 0 12px;color:#7c3aed;">رسالة من متجرك</h2>
        <div style="white-space:pre-wrap;line-height:1.8;color:#e5e7eb;background:#ffffff08;border:1px solid #ffffff14;border-radius:10px;padding:16px;">
          ${String(body).replace(/</g, "&lt;").replace(/>/g, "&gt;")}
        </div>
      </div>
    `,
  });

  return true;
}

const statusLabels: Record<string, string> = {
  pending_review: "تحت المراجعة",
  in_progress: "جاري التجهيز",
  completed: "مكتمل",
  cancelled: "ملغي",
};

export async function sendOrderStatusEmail(to: string, order: {
  orderId: number; packageName: string; status: string; customerName: string;
}) {
  const transporter = createTransporter();
  if (!transporter) return false;

  const label = statusLabels[order.status] || order.status;
  const color = order.status === "completed" ? "#22c55e" : order.status === "cancelled" ? "#ef4444" : order.status === "in_progress" ? "#3b82f6" : "#f59e0b";

  await transporter.sendMail({
    from: `"ستوديو.كود" <${ADMIN_EMAIL}>`,
    to,
    subject: `تحديث طلبك #${order.orderId} - ${label}`,
    html: `
      <div dir="rtl" style="font-family:Arial,sans-serif;max-width:500px;margin:auto;background:#0d0020;color:white;border-radius:12px;padding:32px;">
        <div style="text-align:center;margin-bottom:24px;">
          <div style="width:60px;height:60px;border-radius:50%;background:${color}20;border:2px solid ${color};display:inline-flex;align-items:center;justify-content:center;font-size:28px;">
            ${order.status === "completed" ? "✓" : order.status === "cancelled" ? "✕" : order.status === "in_progress" ? "⚡" : "🔍"}
          </div>
        </div>
        <h2 style="text-align:center;color:${color};">تم تحديث حالة طلبك</h2>
        <p style="text-align:center;color:#aaa;">مرحباً ${order.customerName}، تم تحديث حالة طلبك إلى:</p>
        <div style="text-align:center;margin:20px 0;">
          <span style="background:${color}20;border:1px solid ${color};color:${color};padding:8px 24px;border-radius:20px;font-weight:bold;font-size:18px;">${label}</span>
        </div>
        <table style="width:100%;border-collapse:collapse;margin-top:16px;background:#ffffff08;border-radius:8px;padding:16px;">
          <tr><td style="padding:8px;color:#aaa;">رقم الطلب:</td><td style="padding:8px;font-weight:bold;">#${order.orderId}</td></tr>
          <tr><td style="padding:8px;color:#aaa;">الباقة:</td><td style="padding:8px;">${order.packageName}</td></tr>
        </table>
        <p style="margin-top:24px;color:#555;font-size:12px;text-align:center;">ستوديو.كود — لأي استفسار تواصل معنا عبر واتساب</p>
      </div>
    `,
  });
  return true;
}
