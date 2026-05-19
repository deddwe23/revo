import pg from "pg";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is missing.");
  process.exit(1);
}

const args = process.argv.slice(2);
const normalizedArgs = args[0] === "--" ? args.slice(1) : args;
const sql = normalizedArgs.join(" ").trim();
if (!sql) {
  console.error("Usage: corepack pnpm --filter @workspace/api-server run db:query -- <SQL>");
  process.exit(1);
}

const pool = new pg.Pool({ connectionString: url });

try {
  const result = await pool.query(sql);
  if (result.rows.length > 0) {
    console.table(result.rows);
  } else {
    console.log(`Query executed successfully. Rows affected: ${result.rowCount ?? 0}`);
  }
} catch (error) {
  console.error("Query failed.");
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
} finally {
  await pool.end();
}
