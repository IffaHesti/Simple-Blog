import dotenv from "dotenv";
dotenv.config();
import pool from "../config/db.js";
import bcrypt from "bcryptjs";

const [,, username, email, password] = process.argv;

if (!username || !email || !password) {
  console.log("Usage: node src/scripts/createAdmin.js <username> <email> <password>");
  process.exit(1);
}

const run = async () => {
  const hashed = await bcrypt.hash(password, 10);
  const result = await pool.query(
    "INSERT INTO users (username, email, password, is_admin) VALUES ($1, $2, $3, true) RETURNING id, email",
    [username, email, hashed]
  );
  console.log("Admin created:", result.rows[0]);
  await pool.end();
};

run().catch(err => { console.error(err); process.exit(1); });
