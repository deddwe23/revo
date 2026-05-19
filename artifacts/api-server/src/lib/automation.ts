import { isEmailConfigured, sendCustomEmail } from "./email.js";
import { getWhatsAppWebStatus, sendWhatsAppWebMessage } from "./whatsapp-web.js";

type Queryable = {
  query: (sql: string, params?: unknown[]) => Promise<{ rows: any[] }>;
};

export type AutomationTrigger =
  | "order_created"
  | "customer_signup"
  | "order_completed"
  | "order_status_changed";

type AutomationContext = {
  customerName?: string | null;
  customerEmail?: string | null;
  customerPhone?: string | null;
  orderId?: number | null;
  packageName?: string | null;
  status?: string | null;
};

type AutomationRuleRow = {
  id: number;
  name: string;
  trigger: string;
  action: string;
  action_data: string | null;
};

const DEFAULT_RULES: Array<{ name: string; trigger: AutomationTrigger; action: "send_whatsapp"; actionData: string }> = [
  {
    name: "ترحيب عميل جديد تلقائي",
    trigger: "customer_signup",
    action: "send_whatsapp",
    actionData: "هلا {{customerName}}، تم إنشاء حسابك بنجاح في REVO. سعداء بانضمامك لنا، وأي وقت تحتاج خدمة أو استفسار نحن جاهزون.",
  },
  {
    name: "تأكيد استلام الطلب تلقائي",
    trigger: "order_created",
    action: "send_whatsapp",
    actionData: "مرحباً {{customerName}}، استلمنا طلبك رقم #{{orderId}} الخاص بـ {{packageName}} بنجاح. سنراجع التحويل ونبدأ الإجراءات ونبقيك على اطلاع.",
  },
  {
    name: "تحديث حالة الطلب تلقائي",
    trigger: "order_status_changed",
    action: "send_whatsapp",
    actionData: "أهلًا {{customerName}}، تم تحديث حالة طلبك رقم #{{orderId}} إلى: {{status}}. نتابع طلبك باهتمام ونسعد بخدمتك.",
  },
  {
    name: "إشعار اكتمال الطلب تلقائي",
    trigger: "order_completed",
    action: "send_whatsapp",
    actionData: "مبروك {{customerName}}، تم اكتمال طلبك رقم #{{orderId}} الخاص بـ {{packageName}}. نتمنى أن ينال عملنا رضاك، ويسعدنا خدمتك مجددًا دائمًا.",
  },
];

let defaultsEnsured = false;

function normalizePhone(value: string | null | undefined) {
  return String(value || "").replace(/[^0-9]/g, "");
}

function renderTemplate(template: string | null, context: AutomationContext) {
  const map: Record<string, string> = {
    customerName: String(context.customerName || "عميلنا العزيز"),
    customerEmail: String(context.customerEmail || ""),
    customerPhone: String(context.customerPhone || ""),
    orderId: context.orderId != null ? String(context.orderId) : "",
    packageName: String(context.packageName || "طلبك"),
    status: String(context.status || "تم التحديث"),
  };

  return String(template || "")
    .replace(/\{\{\s*(\w+)\s*\}\}/g, (_, key: string) => map[key] ?? "")
    .trim();
}

function getEmailSubject(trigger: AutomationTrigger, context: AutomationContext) {
  if (trigger === "customer_signup") return "تم إنشاء حسابك بنجاح";
  if (trigger === "order_created") return `تم استلام طلبك${context.orderId ? ` #${context.orderId}` : ""}`;
  if (trigger === "order_completed") return `تم اكتمال طلبك${context.orderId ? ` #${context.orderId}` : ""}`;
  return `تحديث على طلبك${context.orderId ? ` #${context.orderId}` : ""}`;
}

export async function ensureDefaultAutomationRules(pool: Queryable) {
  if (defaultsEnsured) return;

  const existingCountResult = await pool.query(`SELECT COUNT(*)::int AS total FROM automation_rules`);
  const existingCount = Number(existingCountResult.rows[0]?.total ?? 0);
  if (existingCount > 0) {
    defaultsEnsured = true;
    return;
  }

  for (const rule of DEFAULT_RULES) {
    await pool.query(
      `INSERT INTO automation_rules (name, trigger, action, action_data)
       VALUES ($1, $2, $3, $4)`,
      [rule.name, rule.trigger, rule.action, rule.actionData],
    );
  }

  defaultsEnsured = true;
}

export async function runAutomationTrigger(pool: Queryable, trigger: AutomationTrigger, context: AutomationContext) {
  await ensureDefaultAutomationRules(pool);

  const result = await pool.query(
    `SELECT id, name, trigger, action, action_data
     FROM automation_rules
     WHERE enabled = TRUE AND trigger = $1
     ORDER BY created_at ASC`,
    [trigger],
  );

  const rules = result.rows as AutomationRuleRow[];
  if (rules.length === 0) return;

  const webStatus = getWhatsAppWebStatus();

  for (const rule of rules) {
    try {
      if (rule.action === "send_whatsapp") {
        const to = normalizePhone(context.customerPhone);
        if (!to || !webStatus.connected) continue;
        const message = renderTemplate(rule.action_data, context);
        if (!message) continue;
        await sendWhatsAppWebMessage({ to, message });
        continue;
      }

      if (rule.action === "send_email") {
        const to = String(context.customerEmail || "").trim();
        if (!to || !isEmailConfigured()) continue;
        const body = renderTemplate(rule.action_data, context);
        if (!body) continue;
        await sendCustomEmail(to, getEmailSubject(trigger, context), body);
      }
    } catch (error) {
      console.error(`Automation rule failed (${rule.id}:${rule.name}):`, error);
    }
  }
}