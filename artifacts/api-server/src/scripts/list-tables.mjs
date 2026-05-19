import pg from "pg";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is missing.");
  process.exit(1);
}

const pool = new pg.Pool({ connectionString: url });

const requiredTables = [
  "customers",
  "customer_sessions",
  "admin_sessions",
  "otp_codes",
  "orders",
  "digital_products",
  "store_settings",
  "site_content",
];

try {
  const result = await pool.query(
    `SELECT table_name
     FROM information_schema.tables
     WHERE table_schema = 'public'
       AND table_name = ANY($1::text[])
     ORDER BY table_name`,
    [requiredTables],
  );

  const found = result.rows.map((r) => r.table_name);
  console.log("Found tables:", found.join(", "));

  const missing = requiredTables.filter((t) => !found.includes(t));
  if (missing.length > 0) {
    console.log("Missing tables:", missing.join(", "));
    process.exitCode = 1;
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
} finally {
  await pool.end();
}
