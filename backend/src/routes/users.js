import express from "express";
import pool from "../config/db.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import authMiddleware from "../middleware/auth.js"; // Import auth middleware

const router = express.Router();

// POST /user/login
router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    const result = await pool.query("SELECT * FROM users WHERE email=$1", [email]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "User doesn't exist" });
    }

    const user = result.rows[0];
    const validPassword = await bcrypt.compare(password, user.password);

    if (!validPassword) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "2h" }
    );

    res.json({ token });
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /user 
router.get("/", async (req, res) => {
  try {
    const result = await pool.query("SELECT id, username, email FROM users ORDER BY id ASC");

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "No users found" });
    }

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /user/profile - Get current user's profile information
router.get("/profile", authMiddleware, async (req, res) => {
  try {
    console.log("Accessing /user/profile route");
    console.log("req.user:", req.user); // Log req.user to inspect its content
    if (!req.user || !req.user.id) {
      console.error("req.user or req.user.id is missing after authMiddleware");
      return res.status(401).json({ error: "Unauthorized: User information missing" });
    }
    const userId = req.user.id;
    console.log("User ID from token:", userId);

    // Fetch user details
    const userResult = await pool.query(
      "SELECT username, email, created_at FROM users WHERE id=$1",
      [userId]
    );
    console.log("User details query result:", userResult.rows);

    if (userResult.rows.length === 0) {
      console.log("User not found for ID:", userId);
      return res.status(404).json({ error: "User not found" });
    }

    const user = userResult.rows[0];

    // Format created_at date
    let formattedCreatedAt = 'N/A';
    if (user.created_at) {
      const createdAtDate = new Date(user.created_at);
      const options = { year: 'numeric', month: 'long', day: 'numeric' };
      formattedCreatedAt = createdAtDate.toLocaleDateString('id-ID', options); // 'id-ID' for Indonesian locale
    }
    console.log("Formatted created_at:", formattedCreatedAt);

    res.json({
      username: user.username,
      email: user.email,
      joined_at: formattedCreatedAt,
    });
  } catch (err) {
    console.error("Error in /user/profile route:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /user/:id
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      "SELECT id, username, email FROM users WHERE id=$1",
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "User doesn't exist" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
