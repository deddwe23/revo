import pg from "pg";

const { Pool } = pg;

export async function bootstrapDatabase() {
  const connectionString = process.env["DATABASE_URL"];
  if (!connectionString) {
    throw new Error("DATABASE_URL must be set before bootstrapping the database.");
  }

  const pool = new Pool({ connectionString });

  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS customers (
        id SERIAL PRIMARY KEY,
        email TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        full_name TEXT NOT NULL,
        phone TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS customer_sessions (
        id SERIAL PRIMARY KEY,
        customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
        token TEXT NOT NULL UNIQUE,
        expires_at TIMESTAMPTZ NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS admin_sessions (
        id SERIAL PRIMARY KEY,
        token TEXT NOT NULL UNIQUE,
        expires_at TIMESTAMPTZ NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS otp_codes (
        id SERIAL PRIMARY KEY,
        code TEXT NOT NULL,
        used BOOLEAN NOT NULL DEFAULT FALSE,
        expires_at TIMESTAMPTZ NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS customer_login_codes (
        id SERIAL PRIMARY KEY,
        email TEXT NOT NULL,
        code TEXT NOT NULL,
        used BOOLEAN NOT NULL DEFAULT FALSE,
        expires_at TIMESTAMPTZ NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_customer_login_codes_lookup
      ON customer_login_codes (email, code, used, expires_at);
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS orders (
        id SERIAL PRIMARY KEY,
        package_id TEXT NOT NULL,
        package_name TEXT NOT NULL,
        quantity INTEGER NOT NULL DEFAULT 1,
        package_price_sar INTEGER NOT NULL DEFAULT 0,
        final_price_sar INTEGER NOT NULL DEFAULT 0,
        coupon_code TEXT,
        coupon_discount_sar INTEGER,
        customer_name TEXT NOT NULL,
        customer_id INTEGER REFERENCES customers(id) ON DELETE SET NULL,
        customer_email TEXT,
        receipt_filename TEXT,
        receipt_mimetype TEXT,
        receipt_data BYTEA,
        status TEXT NOT NULL DEFAULT 'pending_review' CHECK (status IN ('pending_review', 'in_progress', 'completed', 'cancelled')),
        notes TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS coupons (
        id SERIAL PRIMARY KEY,
        code TEXT NOT NULL UNIQUE,
        discount_sar INTEGER NOT NULL CHECK (discount_sar >= 0),
        max_uses INTEGER NOT NULL CHECK (max_uses > 0),
        remaining_uses INTEGER NOT NULL CHECK (remaining_uses >= 0),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await pool.query(`CREATE INDEX IF NOT EXISTS idx_coupons_code ON coupons (code);`);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS order_items (
        id SERIAL PRIMARY KEY,
        order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
        package_id TEXT NOT NULL,
        package_name TEXT NOT NULL,
        quantity INTEGER NOT NULL DEFAULT 1,
        unit_price_sar INTEGER NOT NULL DEFAULT 0,
        line_total_sar INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await pool.query(`CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items (order_id);`);

    await pool.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS quantity INTEGER NOT NULL DEFAULT 1;`);
    await pool.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS package_price_sar INTEGER NOT NULL DEFAULT 0;`);
    await pool.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS final_price_sar INTEGER NOT NULL DEFAULT 0;`);
    await pool.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS coupon_code TEXT;`);
    await pool.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS coupon_discount_sar INTEGER;`);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS digital_products (
        id SERIAL PRIMARY KEY,
        slug TEXT NOT NULL UNIQUE,
        title TEXT NOT NULL,
        description TEXT NOT NULL DEFAULT '',
        price_sar INTEGER NOT NULL DEFAULT 0,
        delivery_details TEXT,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS store_settings (
        id BOOLEAN PRIMARY KEY DEFAULT TRUE,
        store_name TEXT NOT NULL DEFAULT 'ستوديو.كود',
        support_email TEXT,
        whatsapp_number TEXT,
        bank_name TEXT,
        beneficiary_name TEXT,
        iban TEXT,
        account_number TEXT,
        tiktok_url TEXT,
        instagram_url TEXT,
        currency TEXT NOT NULL DEFAULT 'SAR',
        order_auto_accept BOOLEAN NOT NULL DEFAULT FALSE,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await pool.query(`ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS bank_name TEXT;`);
    await pool.query(`ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS beneficiary_name TEXT;`);
    await pool.query(`ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS iban TEXT;`);
    await pool.query(`ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS account_number TEXT;`);
    await pool.query(`ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS tiktok_url TEXT;`);
    await pool.query(`ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS instagram_url TEXT;`);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS site_content (
        key TEXT PRIMARY KEY,
        value JSONB NOT NULL DEFAULT '{}'::jsonb,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await pool.query(`
      INSERT INTO store_settings (id)
      VALUES (TRUE)
      ON CONFLICT (id) DO NOTHING;
    `);

    await pool.query(`
      INSERT INTO digital_products (slug, title, description, price_sar, delivery_details, is_active)
      VALUES
        ('basic', 'الباقة الأساسية', 'موقع بسيط واحترافي مناسب للبدايات', 1500, 'تسليم خلال 7 أيام عمل', TRUE),
        ('pro', 'الباقة الاحترافية', 'حل متكامل مع لوحة تحكم وقاعدة بيانات', 4500, 'تسليم خلال 21 يوم عمل', TRUE),
        ('premium', 'الباقة المميزة', 'حلول رقمية شاملة للشركات والمشاريع الكبيرة', 12000, 'تسليم خلال 45 يوم عمل', TRUE)
      ON CONFLICT (slug) DO NOTHING;
    `);

    await pool.query(`
      INSERT INTO site_content (key, value)
      VALUES (
        'home',
        jsonb_build_object(
          'heroLine1', 'أحوّل أفكارك إلى',
          'heroLine2', 'واقع رقمي مبهر',
          'heroSubtitle', 'مطور برمجيات محترف متخصص في بناء تطبيقات ويب وجوال متطورة، سريعة، ومصممة خصيصاً لتنمية أعمالك في العصر الرقمي.',
          'packagesSubtitle', 'خطط مدروسة لتناسب حجم مشروعك وميزانيتك',
          'footerDescription', 'مطور برمجيات محترف متخصص في بناء تطبيقات ويب وجوال متطورة وعصرية.',
          'services', jsonb_build_array(
            jsonb_build_object('title', 'تطوير المواقع الإلكترونية', 'desc', 'مواقع سريعة، متجاوبة، ومبنية بأحدث التقنيات لتعكس احترافية علامتك التجارية.'),
            jsonb_build_object('title', 'تطوير تطبيقات الجوال', 'desc', 'تطبيقات أصلية وهجينة توفر تجربة مستخدم سلسة على iOS و Android.'),
            jsonb_build_object('title', 'متاجر إلكترونية', 'desc', 'منصات تجارة إلكترونية متكاملة مع بوابات دفع آمنة ولوحات تحكم.'),
            jsonb_build_object('title', 'تطوير APIs والخدمات الخلفية', 'desc', 'بنى تحتية قوية وقابلة للتوسع لضمان أداء مستقر لتطبيقاتك.'),
            jsonb_build_object('title', 'تصميم واجهات المستخدم', 'desc', 'تصاميم UX/UI حديثة تركز على سهولة الاستخدام وجاذبية المظهر.'),
            jsonb_build_object('title', 'الاستشارات التقنية', 'desc', 'توجيه تقني لاختيار أفضل التقنيات لضمان نجاح مشروعك بأقل التكاليف.')
          )
        )
      )
      ON CONFLICT (key) DO NOTHING;
    `);

    await pool.query(`
      UPDATE site_content
      SET value = jsonb_set(
        value,
        '{services}',
        jsonb_build_array(
          jsonb_build_object('title', 'تطوير المواقع الإلكترونية', 'desc', 'مواقع سريعة، متجاوبة، ومبنية بأحدث التقنيات لتعكس احترافية علامتك التجارية.'),
          jsonb_build_object('title', 'تطوير تطبيقات الجوال', 'desc', 'تطبيقات أصلية وهجينة توفر تجربة مستخدم سلسة على iOS و Android.'),
          jsonb_build_object('title', 'متاجر إلكترونية', 'desc', 'منصات تجارة إلكترونية متكاملة مع بوابات دفع آمنة ولوحات تحكم.'),
          jsonb_build_object('title', 'تطوير APIs والخدمات الخلفية', 'desc', 'بنى تحتية قوية وقابلة للتوسع لضمان أداء مستقر لتطبيقاتك.'),
          jsonb_build_object('title', 'تصميم واجهات المستخدم', 'desc', 'تصاميم UX/UI حديثة تركز على سهولة الاستخدام وجاذبية المظهر.'),
          jsonb_build_object('title', 'الاستشارات التقنية', 'desc', 'توجيه تقني لاختيار أفضل التقنيات لضمان نجاح مشروعك بأقل التكاليف.')
        ),
        true
      ),
      updated_at = NOW()
      WHERE key = 'home' AND (value->'services') IS NULL;
    `);
  } finally {
    await pool.end();
  }
}
