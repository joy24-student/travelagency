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

    // Read and run schema migration
    const schemaSql = fs.readFileSync(
      path.join(__dirname, "supabase", "migrations", "20260608_comprehensive_travel_platform_schema.sql"),
      "utf8"
    );
    console.log("\nApplying 20260608_comprehensive_travel_platform_schema.sql...");
    await client.query(schemaSql);
    console.log("Schema migration applied successfully!");

    // Read and run seed migration
    const seedSql = fs.readFileSync(
      path.join(__dirname, "supabase", "migrations", "20260608b_seed_travel_platform_data.sql"),
      "utf8"
    );
    console.log("\nApplying 20260608b_seed_travel_platform_data.sql...");
    await client.query(seedSql);
    console.log("Seed migration applied successfully!");

    // Read and run zero-trust hardening migration
    const hardeningSql = fs.readFileSync(
      path.join(__dirname, "supabase", "migrations", "20260609_zero_trust_security_hardening.sql"),
      "utf8"
    );
    console.log("\nApplying 20260609_zero_trust_security_hardening.sql...");
    await client.query(hardeningSql);
    console.log("Zero-trust security hardening migration applied successfully!");

    // Record migrations in schema_migrations table
    try {
      await client.query(`
        INSERT INTO supabase_migrations.schema_migrations (version, name, statements)
        VALUES 
          ('20260608', 'comprehensive_travel_platform_schema', ARRAY['Applied via runner']),
          ('20260608b', 'seed_travel_platform_data', ARRAY['Applied via runner']),
          ('20260609', 'zero_trust_security_hardening', ARRAY['Applied via runner'])
        ON CONFLICT (version) DO NOTHING;
      `);
      console.log("Recorded migrations in supabase_migrations.schema_migrations.");
    } catch (e) {
      console.log("Note on recording migration:", e.message);
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
  } catch (err) {
    console.error("Migration error:", err);
    process.exit(1);
  }
}

applyMigrations();
