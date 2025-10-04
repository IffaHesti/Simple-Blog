import pool from "./src/config/db.js";

(async () => {
  try {
    const res = await pool.query("SELECT NOW()");
    console.log("✅ Database connected, time:", res.rows[0]);
    process.exit(0);
  } catch (err) {
    console.error("❌ Database connection error:", err.message);
    process.exit(1);
  }
})();
