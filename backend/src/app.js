import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import userRoutes from "./routes/users.js";
import postRoutes from "./routes/posts.js";
import pool from "./config/db.js";

dotenv.config();
const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// === API tetap jalan ===
app.use("/user", userRoutes);
app.use("/posts", postRoutes);

// === Halaman HTML langsung dari Express ===

// Home
app.get("/", (req, res) => {
  res.send(`
    <h1>Simple Blog</h1>
    <p><a href="/view/posts">View All Posts</a></p>
    <p><a href="/view/login">Login</a></p>
  `);
});

// Login Page
app.get("/view/login", (req, res) => {
  res.send(`
    <h1>Login Admin</h1>
    <button onclick="goHome()">Back</button>
    <form id="loginForm">
      <label>Email:</label><br>
      <input type="email" id="email" required /><br><br>
      <label>Password:</label><br>
      <input type="password" id="password" required /><br><br>
      <button type="submit">Login</button>
    </form>
    <p id="result"></p>

    <script>
      function goHome() {
        window.location.href = "/";
      }

      const form = document.getElementById("loginForm");
      form.addEventListener("submit", async (e) => {
        e.preventDefault();

        const email = document.getElementById("email").value;
        const password = document.getElementById("password").value;

        const resLogin = await fetch("/user/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        });

        const data = await resLogin.json();

        if (data.token) {
          localStorage.setItem("token", data.token);
          alert("Login success");
          window.location.href = "/view/new-post";
        } else {
          alert("Login failed: " + (data.error || "Unknown error"));
        }
      });
    </script>
  `);
});


// Buat Post (hanya admin dengan token)
app.get("/view/new-post", (req, res) => {
  res.send(`
    <h1>Create Posts</h1>
    <button onclick="goPosts()">View All Posts</button>
    <button onclick="goProfile()">My Profile</button>
    <form id="postForm">
      <label>Title:</label><br>
      <input type="text" id="title" required /><br><br>
      <label>Content:</label><br>
      <textarea id="content" rows="6" required></textarea><br><br>
      <button type="submit">Create</button>
    </form>
    <p id="result"></p>

    <script>
      // kalau belum login → redirect ke halaman login
      const token = localStorage.getItem("token");
      if (!token) {
        alert("You have to login!");
        window.location.href = "/view/login";
      }

      function goPosts() {
        window.location.href = "/view/posts";
      }

      function goProfile() {
        window.location.href = "/view/profile";
      }

      const form = document.getElementById("postForm");
      form.addEventListener("submit", async (e) => {
        e.preventDefault();

        const title = document.getElementById("title").value;
        const content = document.getElementById("content").value;

        const resPost = await fetch("/posts", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": "Bearer " + token
          },
          body: JSON.stringify({ title, content })
        });

        const data = await resPost.json();

        if (resPost.status === 201) {
          alert("Post successfully created!");
          window.location.href = "/view/posts";
        } else {
          alert("Gagal: " + (data.error || "Unknown error"));
        }
      });
    </script>
  `);
});

// Profile Page
app.get("/view/profile", (req, res) => {
  res.send(`
    <h1>My Profile</h1>
    <button onclick="goNewPost()">Back</button>
    <button onclick="logout()">Logout</button>
    <div id="profile-info">Loading profile...</div>

    <script>
      const token = localStorage.getItem("token");
      if (!token) {
        alert("You have to login!");
        window.location.href = "/view/login";
      }

      function goNewPost() {
        window.location.href = "/view/new-post";
      }
      
      function logout() {
        localStorage.removeItem("token");
        alert("Logout success");
        window.location.href = "/";
      }

      async function fetchProfile() {
        try {
          const resProfile = await fetch("/user/profile", {
            method: "GET",
            headers: {
              "Authorization": "Bearer " + token
            }
          });

          const data = await resProfile.json();
          const profileInfoDiv = document.getElementById("profile-info");

          if (resProfile.status === 200) {
            profileInfoDiv.innerHTML = \`
              <p><b>Username:</b> \${data.username}</p>
              <p><b>Email:</b> \${data.email}</p>
              <p><b>Joined:</b> \${data.joined_at}</p>
            \`;
          } else {
            profileInfoDiv.innerHTML = "<p>Error fetching profile: " + (data.error || "Unknown error") + "</p>";
          }
        } catch (err) {
          console.error(err);
          document.getElementById("profile-info").innerHTML = "<p>An error occurred while fetching profile.</p>";
        }
      }

      fetchProfile();
    </script>
  `);
});


// Lihat Semua Artikel
app.get("/view/posts", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT posts.id, posts.title, posts.content, users.username AS author
       FROM posts
       JOIN users ON posts.author_id = users.id
       ORDER BY posts.created_at DESC`
    );

    let html = `
      <h1>All Posts</h1>
      <div id="action"></div>
      <script>
        const token = localStorage.getItem("token");
        const actionDiv = document.getElementById("action");

        if (token) {
          // admin login → tombol logout + tombol buat artikel
          actionDiv.innerHTML = 
            '<button onclick="logout()">Logout</button> ' +
            '<button onclick="newPost()">Create Post</button>';
        } else {
          // visitor → tombol kembali
          actionDiv.innerHTML = '<button onclick="goHome()">Back</button>';
        }

        function logout() {
          localStorage.removeItem("token");
          alert("Logout success");
          window.location.href = "/";
        }

        function goHome() {
          window.location.href = "/";
        }

        function newPost() {
          window.location.href = "/view/new-post";
        }
      </script>
    `;

    if (result.rows.length === 0) {
      html += "<h2>There are no Posts</h2>";
    } else {
      result.rows.forEach(post => {
        html += `
          <h2>${post.title}</h2>
          <p>${post.content}</p>
          <small>Author: ${post.author}</small>
          <hr>
        `;
      });
    }

    res.send(html);
  } catch (err) {
    console.error(err);
    res.send("<h2>An error occured when fetching post</h2>");
  }
});


// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: "Internal server error" });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
