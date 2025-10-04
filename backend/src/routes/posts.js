import express from "express";
import pool from "../config/db.js";
import authMiddleware from "../middleware/auth.js";

const router = express.Router();

// GET /posts 
router.get("/", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT posts.id, posts.title, posts.content, posts.author_id, posts.created_at 
       FROM posts
       JOIN users ON posts.author_id = users.id
       ORDER BY posts.created_at DESC`
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "No Posts" });
    }

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /posts/:id 
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT posts.id, posts.title, posts.content, posts.author_id, posts.created_at 
       FROM posts
       JOIN users ON posts.author_id = users.id
       WHERE posts.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Post doesn't exist" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /posts 
router.post("/", authMiddleware, async (req, res) => {
  try {
    const { title, content } = req.body;

    if (!title || !content) {
      return res.status(400).json({ error: "Title and content cannot be empty" });
    }

    const author_id = req.user.id;

    const result = await pool.query(
      `INSERT INTO posts (title, content, author_id)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [title, content, author_id]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
