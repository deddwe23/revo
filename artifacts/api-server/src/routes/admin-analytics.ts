import { Router, type Request, type Response, type NextFunction } from "express";
import crypto from "crypto";
import pkg from "pg";
import { ensureDefaultAutomationRules } from "../lib/automation.js";
import { sendCustomEmail } from "../lib/email.js";
import {
  disconnectWhatsAppWeb,
  getWhatsAppWebStatus,
  refreshWhatsAppWebQr,
  sendWhatsAppWebMessage,
  startWhatsAppWebConnection,
} from "../lib/whatsapp-web.js";

const { Pool } = pkg;
const pool = new Pool({ connectionString: process.env["DATABASE_URL"] });

const router = Router();

function normalizeAutomationActionData(actionData: unknown) {
  if (actionData === undefined || actionData === null) return null;
  if (typeof actionData === "string") {
    const trimmed = actionData.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
  return JSON.stringify(actionData);
}

// Middleware to require admin
async function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const token = req.cookies?.admin_token as string | undefined;
  if (!token) {
    res.status(401).json({ error: "غير مصرح" });
    return;
  }
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
  const result = await pool.query(
    `SELECT id FROM admin_sessions WHERE token = $1 AND expires_at > NOW()`,
    [tokenHash]
  );
  if (result.rows.length === 0) {
    res.status(401).json({ error: "الجلسة منتهية" });
    return;
  }
  next();
}

// Get analytics data
router.get("/admin/analytics", requireAdmin, async (_req, res) => {
  try {
    // Total revenue (from completed orders with order items)
    const revenueResult = await pool.query(
      `SELECT COALESCE(SUM(oi.line_total_sar), 0) as total_revenue
       FROM orders o
       JOIN order_items oi ON o.id = oi.order_id
       WHERE o.status = 'completed'`
    );

    // Order statistics
    const ordersResult = await pool.query(
      `SELECT 
        COUNT(*) as total_orders,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
        COUNT(CASE WHEN status = 'pending_review' THEN 1 END) as pending,
        COUNT(CASE WHEN status = 'rejected' THEN 1 END) as rejected,
        AVG(CASE WHEN status = 'completed' THEN final_price_sar ELSE NULL END) as avg_order_value
       FROM orders`
    );

    // Customer statistics (fixed to use customers table instead of customer_sessions)
    const customersResult = await pool.query(
      `SELECT 
        COUNT(*) as total_customers,
        COUNT(CASE WHEN created_at > NOW() - INTERVAL '30 days' THEN 1 END) as new_last_30days
       FROM customers`
    );

    // Top products (fixed to use package_id instead of product_ids)
    const topProductsResult = await pool.query(
      `SELECT 
        dp.id, dp.slug, dp.title, dp.price_sar,
        COUNT(oi.id) as sales_count,
        SUM(oi.line_total_sar) as total_revenue
       FROM digital_products dp
       LEFT JOIN order_items oi ON oi.package_id = dp.slug
       GROUP BY dp.id, dp.slug, dp.title, dp.price_sar
       ORDER BY sales_count DESC
       LIMIT 10`
    );

    // Daily revenue (last 30 days - fixed column name)
    const dailyRevenueResult = await pool.query(
      `SELECT 
        DATE(o.created_at) as date,
        COUNT(DISTINCT o.id) as order_count,
        COALESCE(SUM(o.final_price_sar), 0) as daily_revenue
       FROM orders o
       WHERE o.created_at > NOW() - INTERVAL '30 days'
       GROUP BY DATE(o.created_at)
       ORDER BY date DESC`
    );

    res.json({
      totalRevenue: parseFloat(revenueResult.rows[0]?.total_revenue || 0),
      orders: {
        total: parseInt(ordersResult.rows[0]?.total_orders || 0),
        completed: parseInt(ordersResult.rows[0]?.completed || 0),
        pending: parseInt(ordersResult.rows[0]?.pending || 0),
        rejected: parseInt(ordersResult.rows[0]?.rejected || 0),
        avgValue: ordersResult.rows[0]?.avg_order_value ? parseFloat(ordersResult.rows[0].avg_order_value) : 0,
      },
      customers: {
        total: parseInt(customersResult.rows[0]?.total_customers || 0),
        newLast30Days: parseInt(customersResult.rows[0]?.new_last_30days || 0),
      },
      topProducts: topProductsResult.rows || [],
      dailyRevenue: dailyRevenueResult.rows || [],
    });
  } catch (error) {
    console.error("Error fetching analytics:", error);
    res.status(500).json({ error: "خطأ في جلب البيانات التحليلية" });
  }
});

// Get bulk email campaigns
router.get("/admin/emails", requireAdmin, async (_req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, subject, recipient_group, status, sent_count, scheduled_at, created_at
       FROM bulk_emails
       ORDER BY created_at DESC`
    );
    res.json({ emails: result.rows });
  } catch (error) {
    console.error("Error fetching emails:", error);
    res.status(500).json({ error: "خطأ في جلب حملات البريد" });
  }
});

// Create bulk email campaign
router.post("/admin/emails", requireAdmin, async (req, res) => {
  const { subject, body, recipientGroup, scheduledAt } = req.body as {
    subject?: string;
    body?: string;
    recipientGroup?: string;
    scheduledAt?: string;
  };

  if (!subject || !body || !recipientGroup) {
    res.status(400).json({ error: "الموضوع والمحتوى ومجموعة المستقبلات مطلوبة" });
    return;
  }

  try {
    const result = await pool.query(
      `INSERT INTO bulk_emails (subject, body, recipient_group, status, scheduled_at)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, subject, recipient_group, status, sent_count, created_at`,
      [subject, body, recipientGroup, scheduledAt ? "scheduled" : "draft", scheduledAt || null]
    );
    res.status(201).json({ email: result.rows[0] });
  } catch (error) {
    console.error("Error creating email:", error);
    res.status(500).json({ error: "خطأ في إنشاء حملة البريد" });
  }
});

// Send saved campaign now
router.post("/admin/emails/:id/send", requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) {
    res.status(400).json({ error: "معرف الحملة غير صالح" });
    return;
  }

  try {
    const campaignResult = await pool.query(
      `SELECT id, subject, body, recipient_group
       FROM bulk_emails
       WHERE id = $1
       LIMIT 1`,
      [id],
    );

    if (campaignResult.rows.length === 0) {
      res.status(404).json({ error: "الحملة غير موجودة" });
      return;
    }

    const campaign = campaignResult.rows[0] as {
      subject: string;
      body: string;
      recipient_group: string;
    };

    let emails: string[] = [];

    if (campaign.recipient_group.startsWith("email:")) {
      const specificEmail = campaign.recipient_group.slice("email:".length).trim().toLowerCase();
      if (specificEmail) emails = [specificEmail];
    } else if (campaign.recipient_group === "recent_customers") {
      const rows = await pool.query(
        `SELECT email FROM customers WHERE created_at > NOW() - INTERVAL '30 days' AND email IS NOT NULL`,
      );
      emails = rows.rows.map((r) => String(r.email).toLowerCase());
    } else if (campaign.recipient_group === "inactive_customers") {
      const rows = await pool.query(
        `SELECT c.email
         FROM customers c
         LEFT JOIN orders o ON o.customer_id = c.id
         GROUP BY c.id, c.email
         HAVING COALESCE(MAX(o.created_at), c.created_at) < NOW() - INTERVAL '120 days'`,
      );
      emails = rows.rows.map((r) => String(r.email).toLowerCase());
    } else {
      const rows = await pool.query(`SELECT email FROM customers WHERE email IS NOT NULL`);
      emails = rows.rows.map((r) => String(r.email).toLowerCase());
    }

    const uniqueEmails = [...new Set(emails.filter(Boolean))];
    let sentCount = 0;
    for (const email of uniqueEmails) {
      const sent = await sendCustomEmail(email, campaign.subject, campaign.body);
      if (sent) sentCount += 1;
    }

    await pool.query(
      `UPDATE bulk_emails
       SET status = $1, sent_count = $2, sent_at = NOW()
       WHERE id = $3`,
      ["sent", sentCount, id],
    );

    res.json({ success: true, sentCount });
  } catch (error) {
    console.error("Error sending campaign:", error);
    res.status(500).json({ error: "خطأ أثناء إرسال الحملة" });
  }
});

// Get automation rules
router.get("/admin/automations", requireAdmin, async (_req, res) => {
  try {
    await ensureDefaultAutomationRules(pool);
    const result = await pool.query(
      `SELECT id, name, trigger, action, action_data, enabled, created_at
       FROM automation_rules
       ORDER BY created_at DESC`
    );
    res.json({ automations: result.rows });
  } catch (error) {
    console.error("Error fetching automations:", error);
    res.status(500).json({ error: "خطأ في جلب قواعل الأتمتة" });
  }
});

// Update automation rule
router.put("/admin/automations/:id", requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { name, trigger, action, actionData, enabled } = req.body as {
    name?: string;
    trigger?: string;
    action?: string;
    actionData?: unknown;
    enabled?: boolean;
  };

  if (!name || !trigger || !action) {
    res.status(400).json({ error: "الاسم والمحفز والإجراء مطلوبة" });
    return;
  }

  try {
    const result = await pool.query(
      `UPDATE automation_rules
       SET name = $1,
           trigger = $2,
           action = $3,
           action_data = $4,
           enabled = COALESCE($5, enabled),
           updated_at = NOW()
       WHERE id = $6
       RETURNING id, name, trigger, action, action_data, enabled, created_at`,
      [name.trim(), trigger, action, normalizeAutomationActionData(actionData), enabled, id],
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: "قاعدة الأتمتة غير موجودة" });
      return;
    }

    res.json({ automation: result.rows[0] });
  } catch (error) {
    console.error("Error editing automation:", error);
    res.status(500).json({ error: "خطأ في تعديل قاعدة الأتمتة" });
  }
});

// Create automation rule
router.post("/admin/automations", requireAdmin, async (req, res) => {
  const { name, trigger, action, actionData } = req.body as {
    name?: string;
    trigger?: string;
    action?: string;
    actionData?: any;
  };

  if (!name || !trigger || !action) {
    res.status(400).json({ error: "الاسم والمشغل والحدث مطلوبة" });
    return;
  }

  try {
    const normalizedName = name?.trim();
    const result = await pool.query(
      `INSERT INTO automation_rules (name, trigger, action, action_data)
       VALUES ($1, $2, $3, $4)
       RETURNING id, name, trigger, action, action_data, enabled, created_at`,
      [normalizedName, trigger, action, normalizeAutomationActionData(actionData)]
    );
    res.status(201).json({ automation: result.rows[0] });
  } catch (error) {
    console.error("Error creating automation:", error);
    res.status(500).json({ error: "خطأ في إنشاء قاعدة الأتمتة" });
  }
});

// Toggle automation rule
router.patch("/admin/automations/:id", requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { enabled } = req.body as { enabled?: boolean };

  if (enabled === undefined) {
    res.status(400).json({ error: "حالة التفعيل مطلوبة" });
    return;
  }

  try {
    const result = await pool.query(
      `UPDATE automation_rules SET enabled = $1 WHERE id = $2
       RETURNING id, name, trigger, action, action_data, enabled, created_at`,
      [enabled, id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: "قاعدة الأتمتة غير موجودة" });
      return;
    }

    res.json({ automation: result.rows[0] });
  } catch (error) {
    console.error("Error updating automation:", error);
    res.status(500).json({ error: "خطأ في تحديث قاعدة الأتمتة" });
  }
});

// Delete automation rule
router.delete("/admin/automations/:id", requireAdmin, async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query(
      `DELETE FROM automation_rules WHERE id = $1 RETURNING id`,
      [id],
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: "قاعدة الأتمتة غير موجودة" });
      return;
    }

    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting automation:", error);
    res.status(500).json({ error: "خطأ في حذف قاعدة الأتمتة" });
  }
});

// Send WhatsApp message (single or campaign use)
router.post("/admin/whatsapp/send", requireAdmin, async (req, res) => {
  const { to, message } = req.body as { to?: string; message?: string };

  if (!to || !message) {
    res.status(400).json({ error: "رقم المستلم ونص الرسالة مطلوبان" });
    return;
  }

  const webStatus = getWhatsAppWebStatus();

  try {
    if (!webStatus.connected) {
      res.status(503).json({
        error: "WhatsApp Web غير متصل. اربط عبر QR من قسم الأتمتة أولاً.",
        whatsappWeb: webStatus,
      });
      return;
    }

    const result = await sendWhatsAppWebMessage({ to, message });
    if (!result.success) {
      res.status(502).json({ error: "فشل إرسال واتساب عبر WhatsApp Web" });
      return;
    }

    res.json({ success: true, mode: "web" });
  } catch (error) {
    console.error("Error sending WhatsApp Web:", error);
    res.status(500).json({ error: "خطأ في إرسال واتساب عبر WhatsApp Web" });
  }
});

// Start WhatsApp Web QR flow (no Meta token required)
router.post("/admin/whatsapp-web/connect", requireAdmin, async (_req, res) => {
  try {
    const status = await startWhatsAppWebConnection();
    res.json({ success: true, whatsappWeb: status });
  } catch (error) {
    console.error("Error starting WhatsApp Web connection:", error);
    res.status(500).json({ error: "فشل بدء ربط WhatsApp Web" });
  }
});

// Disconnect WhatsApp Web session and mark as disconnected
router.post("/admin/whatsapp-web/disconnect", requireAdmin, async (_req, res) => {
  try {
    const status = await disconnectWhatsAppWeb();
    res.json({ success: true, whatsappWeb: status });
  } catch (error) {
    console.error("Error disconnecting WhatsApp Web:", error);
    res.status(500).json({ error: "فشل قطع اتصال واتساب" });
  }
});

// Invalidate previous QR and generate a fresh WhatsApp Web QR
router.post("/admin/whatsapp-web/refresh-qr", requireAdmin, async (_req, res) => {
  try {
    const status = await refreshWhatsAppWebQr();
    res.json({ success: true, whatsappWeb: status });
  } catch (error) {
    console.error("Error refreshing WhatsApp Web QR:", error);
    res.status(500).json({ error: "فشل إنشاء كود واتساب جديد" });
  }
});

// Get WhatsApp Web status and QR image
router.get("/admin/whatsapp-web/status", requireAdmin, async (_req, res) => {
  try {
    const status = getWhatsAppWebStatus();
    res.json({ whatsappWeb: status });
  } catch (error) {
    console.error("Error fetching WhatsApp Web status:", error);
    res.status(500).json({ error: "فشل جلب حالة WhatsApp Web" });
  }
});

// Get notifications
router.get("/admin/notifications", requireAdmin, async (_req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, type, title, message, read, order_id, created_at
       FROM notifications
       ORDER BY created_at DESC
       LIMIT 50`
    );
    res.json({ notifications: result.rows });
  } catch (error) {
    console.error("Error fetching notifications:", error);
    res.status(500).json({ error: "خطأ في جلب الإشعارات" });
  }
});

// Export orders as CSV/JSON for admin dashboard
router.get("/admin/export/:format", requireAdmin, async (req, res) => {
  const format = req.params.format;

  if (format !== "csv" && format !== "json") {
    res.status(400).json({ error: "صيغة التصدير غير مدعومة" });
    return;
  }

  try {
    const result = await pool.query(
      `SELECT id, package_name, customer_name, customer_email, status, final_price_sar, created_at
       FROM orders
       ORDER BY created_at DESC`
    );

    if (format === "json") {
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      res.setHeader("Content-Disposition", "attachment; filename=orders.json");
      res.send(JSON.stringify(result.rows, null, 2));
      return;
    }

    const header = ["id", "package_name", "customer_name", "customer_email", "status", "final_price_sar", "created_at"];
    const csvRows = result.rows.map((row) => {
      const values = [
        row.id,
        row.package_name,
        row.customer_name,
        row.customer_email,
        row.status,
        row.final_price_sar,
        row.created_at,
      ];
      return values
        .map((value) => `"${String(value ?? "").replace(/"/g, '""')}"`)
        .join(",");
    });

    const csv = [header.join(","), ...csvRows].join("\n");
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", "attachment; filename=orders.csv");
    res.send(csv);
  } catch (error) {
    console.error("Error exporting data:", error);
    res.status(500).json({ error: "خطأ في تصدير البيانات" });
  }
});

export default router;
