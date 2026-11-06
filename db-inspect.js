const { Client } = require("pg");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env.local") });
require("dotenv").config({ path: path.join(__dirname, ".env") });

const connectionString =
  process.env.DATABASE_URL ||
  process.env.SUPABASE_DB_URL;

if (!connectionString) {
  console.error("DATABASE_URL or SUPABASE_DB_URL environment variable is required.");
  process.exit(1);
}

const client = new Client({
  connectionString: connectionString,
  ssl: { rejectUnauthorized: false },
  application_name: "db_inspector",
});

async function inspectDatabase() {
  try {
    await client.connect();
    console.log("Connected to PostgreSQL database\n");

    // Get all tables
    const tablesQuery = `
      SELECT 
        schemaname,
        tablename,
        tableowner,
        rowsecurity
      FROM pg_tables
      WHERE schemaname = 'public'
      ORDER BY tablename;
    `;

    const tablesResult = await client.query(tablesQuery);
    console.log("PUBLIC TABLES (" + tablesResult.rows.length + " total):\n");
    console.log("┌─ Table Name ─────────────────────┬─ Owner ──┬─ RLS ──┐");

    for (const table of tablesResult.rows) {
      const rlsText = table.rowsecurity ? "ON " : "OFF";
      console.log(
        `│ ${table.tablename.padEnd(33)} │ ${table.tableowner.padEnd(8)} │ ${rlsText.padEnd(6)} │`,
      );
    }
    console.log("└───────────────────────────────────┴──────────┴────────┘\n");
    console.log("Database inspection complete!");
  } catch (error) {
    console.error("Error:", error.message);
  } finally {
    await client.end();
  }
}

inspectDatabase();
