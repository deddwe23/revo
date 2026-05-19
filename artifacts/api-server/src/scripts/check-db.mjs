import pg from "pg";

const url = process.env.DATABASE_URL;

if (!url) {
  console.error("DATABASE_URL is missing. Add it to your .env file first.");
  process.exit(1);
}

const maskedUrl = url.replace(/:[^:@/]+@/, ":****@");
console.log("Checking DB connection:", maskedUrl);

const pool = new pg.Pool({ connectionString: url });

try {
  const result = await pool.query(
    "select current_database() as db, current_user as user_name, now() as server_time",
  );
  const row = result.rows[0];
  console.log("DB connected successfully.");
  console.log("Database:", row.db);
  console.log("User:", row.user_name);
  console.log("Server time:", row.server_time);
} catch (error) {
  console.error("DB connection failed.");
  if (error && typeof error === "object") {
    const maybeErr = error;
    const code = maybeErr.code;
    const message = maybeErr.message;
    if (code) console.error("Code:", code);
    if (message) console.error("Message:", message);
    const aggregateErrors = maybeErr.aggregateErrors;
    if (Array.isArray(aggregateErrors)) {
      for (const item of aggregateErrors) {
        if (item?.code || item?.message) {
          console.error("Cause:", item.code ?? "", item.message ?? "");
        }
      }
    }
  } else {
    console.error(String(error));
  }
  process.exitCode = 1;
} finally {
  await pool.end();
}
