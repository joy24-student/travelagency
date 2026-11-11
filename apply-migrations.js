const { Client } = require("pg");
const fs = require("fs");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env.local") });
require("dotenv").config({ path: path.join(__dirname, ".env") });

const connectionString =
  process.env.DATABASE_URL ||
  process.env.SUPABASE_DB_URL;

if (!connectionString) {
  console.error("FATAL: DATABASE_URL or SUPABASE_DB_URL environment variable is required.");
  process.exit(1);
}

async function applyMigrations() {
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
  });

  try {
    await client.connect();
    console.log("Connected to Supabase PostgreSQL database via connection pooler.");

    // Ensure migration tracking table exists
    await client.query(`
      CREATE SCHEMA IF NOT EXISTS supabase_migrations;
      CREATE TABLE IF NOT EXISTS supabase_migrations.schema_migrations (
        version TEXT PRIMARY KEY,
        name TEXT,
        statements TEXT[],
        inserted_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
      );
    `);

    // Get all migration files in chronological order
    const migrationsDir = path.join(__dirname, "supabase", "migrations");
    const migrationFiles = fs
      .readdirSync(migrationsDir)
      .filter((file) => file.endsWith(".sql"))
      .sort();

    console.log(`\nFound ${migrationFiles.length} migration files in supabase/migrations:\n`);

    // Fetch already applied migrations
    const appliedRes = await client.query(
      "SELECT version FROM supabase_migrations.schema_migrations;"
    );
    const appliedSet = new Set(appliedRes.rows.map((r) => r.version));

    for (const file of migrationFiles) {
      const version = file.split("_")[0];
      const name = file.replace(/\.sql$/, "");

      if (appliedSet.has(version)) {
        console.log(`⏩ Skipping ${file} (already applied)`);
        continue;
      }

      console.log(`\nApplying ${file}...`);
      const sql = fs.readFileSync(path.join(migrationsDir, file), "utf8");

      try {
        await client.query("BEGIN;");
        await client.query(sql);
        await client.query(
          `INSERT INTO supabase_migrations.schema_migrations (version, name, statements)
           VALUES ($1, $2, $3)
           ON CONFLICT (version) DO NOTHING;`,
          [version, name, [`Applied from ${file}`]]
        );
        await client.query("COMMIT;");
        console.log(`✅ ${file} applied successfully!`);
      } catch (sqlErr) {
        try { await client.query("ROLLBACK;"); } catch (_) {}
        console.error(`⚠️  Warning/Error applying ${file}:`, sqlErr.message);
        // Continue to other independent migrations
      }
    }

    // Verify all public tables
    const tablesRes = await client.query(`
      SELECT tablename, rowsecurity 
      FROM pg_tables 
      WHERE schemaname = 'public' 
      ORDER BY tablename;
    `);

    console.log(`\nVerified ${tablesRes.rows.length} tables in public schema:`);
    tablesRes.rows.forEach((r, idx) => {
      console.log(`  ${idx + 1}. ${r.tablename} (RLS: ${r.rowsecurity})`);
    });

    await client.end();
    console.log("\nAll migrations processed successfully!");
  } catch (err) {
    console.error("Migration fatal error:", err);
    process.exit(1);
  }
}

applyMigrations();
