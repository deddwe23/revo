import {
  boolean,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const customersTable = pgTable("customers", {
  id: serial("id").primaryKey(),
  email: text("email").notNull(),
  passwordHash: text("password_hash").notNull(),
  fullName: text("full_name").notNull(),
  phone: text("phone"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex("customers_email_unique").on(table.email),
]);

export const customerSessionsTable = pgTable("customer_sessions", {
  id: serial("id").primaryKey(),
  customerId: integer("customer_id").notNull().references(() => customersTable.id, { onDelete: "cascade" }),
  token: text("token").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex("customer_sessions_token_unique").on(table.token),
]);

export const adminSessionsTable = pgTable("admin_sessions", {
  id: serial("id").primaryKey(),
  token: text("token").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex("admin_sessions_token_unique").on(table.token),
]);

export const otpCodesTable = pgTable("otp_codes", {
  id: serial("id").primaryKey(),
  code: text("code").notNull(),
  used: boolean("used").notNull().default(false),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const ordersTable = pgTable("orders", {
  id: serial("id").primaryKey(),
  packageId: text("package_id").notNull(),
  packageName: text("package_name").notNull(),
  customerName: text("customer_name").notNull(),
  customerId: integer("customer_id").references(() => customersTable.id, { onDelete: "set null" }),
  customerEmail: text("customer_email"),
  receiptFilename: text("receipt_filename"),
  receiptMimetype: text("receipt_mimetype"),
  receiptData: text("receipt_data"), // Binary data (bytea in DB)
  status: text("status").notNull().default("pending_review"),
  notes: text("notes"),
  // Financial columns
  quantity: integer("quantity").notNull().default(1),
  packagePriceSar: integer("package_price_sar").notNull().default(0),
  finalPriceSar: integer("final_price_sar").notNull().default(0),
  couponCode: text("coupon_code"),
  couponDiscountSar: integer("coupon_discount_sar"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const orderItemsTable = pgTable("order_items", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").notNull().references(() => ordersTable.id, { onDelete: "cascade" }),
  packageId: text("package_id").notNull(),
  packageName: text("package_name").notNull(),
  quantity: integer("quantity").notNull().default(1),
  unitPriceSar: integer("unit_price_sar").notNull().default(0),
  lineTotalSar: integer("line_total_sar").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const ratingsTable = pgTable("ratings", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").notNull().references(() => ordersTable.id, { onDelete: "cascade" }),
  customerId: integer("customer_id").notNull().references(() => customersTable.id, { onDelete: "cascade" }),
  rating: integer("rating").notNull(), // 1-5 stars
  reviewText: text("review_text"),
  approved: boolean("approved").notNull().default(false), // Admin approval needed
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const notificationsTable = pgTable("notifications", {
  id: serial("id").primaryKey(),
  type: text("type").notNull(), // order_status, new_message, rating, promotion
  title: text("title").notNull(),
  message: text("message"),
  read: boolean("read").notNull().default(false),
  orderId: integer("order_id").references(() => ordersTable.id, { onDelete: "cascade" }),
  customerId: integer("customer_id").references(() => customersTable.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const automationRulesTable = pgTable("automation_rules", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  trigger: text("trigger").notNull(), // order_completed, customer_signup, rating_submitted
  action: text("action").notNull(), // send_email, send_sms, add_coupon
  actionData: text("action_data"), // JSON data
  enabled: boolean("enabled").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const bulkEmailTable = pgTable("bulk_emails", {
  id: serial("id").primaryKey(),
  subject: text("subject").notNull(),
  body: text("body").notNull(),
  recipientGroup: text("recipient_group").notNull(), // all_customers, recent_customers, inactive_customers
  status: text("status").notNull().default("draft"), // draft, scheduled, sent, failed
  scheduledAt: timestamp("scheduled_at", { withTimezone: true }),
  sentCount: integer("sent_count").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  sentAt: timestamp("sent_at", { withTimezone: true }),
});

export const digitalProductsTable = pgTable("digital_products", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull(),
  title: text("title").notNull(),
  description: text("description").notNull().default(""),
  priceSar: integer("price_sar").notNull().default(0),
  deliveryDetails: text("delivery_details"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex("digital_products_slug_unique").on(table.slug),
]);

export const couponTable = pgTable("coupons", {
  id: serial("id").primaryKey(),
  code: text("code").notNull(),
  discountSar: integer("discount_sar").notNull(),
  maxUses: integer("max_uses").notNull(),
  remainingUses: integer("remaining_uses").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex("coupons_code_unique").on(table.code),
]);

export const storeSettingsTable = pgTable("store_settings", {
  id: boolean("id").primaryKey().default(true),
  storeName: text("store_name").notNull().default("REVO | ريفو"),
  supportEmail: text("support_email"),
  whatsappNumber: text("whatsapp_number"),
  // Banking details
  bankName: text("bank_name"),
  beneficiaryName: text("beneficiary_name"),
  iban: text("iban"),
  // Social media
  socialInstagram: text("social_instagram"),
  socialTwitter: text("social_twitter"),
  socialLinkedin: text("social_linkedin"),
  currency: text("currency").notNull().default("SAR"),
  orderAutoAccept: boolean("order_auto_accept").notNull().default(false),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

// Security tables
export const auditLogsTable = pgTable("audit_logs", {
  id: serial("id").primaryKey(),
  tableName: text("table_name").notNull(),
  operation: text("operation").notNull(), // INSERT, UPDATE, DELETE
  recordId: integer("record_id"),
  oldValues: text("old_values"), // JSON
  newValues: text("new_values"), // JSON
  changedAt: timestamp("changed_at", { withTimezone: true }).defaultNow().notNull(),
  ipAddress: text("ip_address"),
});

export const failedLoginAttemptsTable = pgTable("failed_login_attempts", {
  id: serial("id").primaryKey(),
  email: text("email").notNull(),
  attemptCount: integer("attempt_count").notNull().default(1),
  lastAttemptAt: timestamp("last_attempt_at", { withTimezone: true }).defaultNow().notNull(),
  lockedUntil: timestamp("locked_until", { withTimezone: true }),
  ipAddress: text("ip_address"),
});

export const sessionSecurityTable = pgTable("session_security", {
  id: serial("id").primaryKey(),
  sessionId: text("session_id").notNull(),
  userType: text("user_type").notNull(), // customer, admin
  userId: integer("user_id"),
  ipAddress: text("ip_address").notNull(),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
});

export const encryptionKeysTable = pgTable("encryption_keys", {
  id: serial("id").primaryKey(),
  keyId: text("key_id").notNull(),
  publicKey: text("public_key").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  rotatedAt: timestamp("rotated_at", { withTimezone: true }),
}, (table) => [
  uniqueIndex("encryption_keys_key_id_unique").on(table.keyId),
]);
