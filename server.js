// server/server.js
const express = require("express");
const cors = require("cors");
const multer = require("multer");
const path = require("path");
const bcrypt = require('bcryptjs');
const jwt = require("jsonwebtoken");
const fs = require("fs");
const mongoose = require("mongoose");
const User = require("./models/User");
const Post = require("./models/Post");
const Comment = require("./models/Comment");
const app = express();
app.use(cors());
const PORT = process.env.PORT || 5000;

// Middleware
app.use(express.json());
// 정적 파일 제공 (uploads 폴더를 공개)
const uploadsDir = path.join(__dirname, "uploads");
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log("Uploads directory created");
}

// MongoDB URI
const uri =
  "mongodb+srv://xormsowo:wlfkf571@cluster0.mfvhg.mongodb.net/forum?retryWrites=true&w=majority&appName=Cluster0";

// Mongoose 연결
mongoose
  .connect(uri, {})
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error("MongoDB connection error:", err));

// 파일 저장 설정
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, 'uploads')); // Ensure the path is correct
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});

const upload = multer({ storage: storage });

// API 엔드포인트 - 모든 포스트 가져오기
app.get("/api/posts", async (req, res) => {
  try {
    const allPosts = await Post.find(); // Mongoose를 사용하여 모든 포스트 가져오기
    res.json(allPosts);
  } catch (error) {
    console.error("Error fetching posts:", error);
    res.status(500).send({ error: error.message });
  }
});

// API 엔드포인트 - 특정 포스트 가져오기
app.get("/api/posts/:id", async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).send("Post not found");
    res.json(post);
  } catch (error) {
    console.error("Error fetching post:", error);
    res.status(500).send({ error: error.message });
  }
});

// API 엔드포인트 - 포스트 추가
app.post('/api/posts', upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).send('No file uploaded.');
  }

  console.log('File uploaded:', req.file); // Log the file details
  const fileUrl = `http://localhost:5000/uploads/${req.file.filename}`;
  
  const { title, content, username } = req.body;
  const newPost = new Post({ title, content, username, fileUrl });

  try {
    const savedPost = await newPost.save();
    res.status(201).json({ message: 'Post created successfully', post: savedPost });
  } catch (error) {
    console.error('Error saving post:', error);
    res.status(500).send({ error: error.message });
  }
});


// API 엔드포인트 - 포스트 수정
app.put("/api/posts/:id", async (req, res) => {
  const postId = req.params.id;
  const { username } = req.body; // 요청 본문에서 username 가져오기
  try {
    const post = await Post.findById(postId);
    if (!post) return res.status(404).send("Post not found");
    // username 비교
    if (post.username !== username) {
      return res.status(403).send("You are not authorized to edit this post");
    }
    const updatedPost = await Post.findByIdAndUpdate(postId, req.body, {
      new: true,
    }); // 포스트 업데이트
    res.status(200).json(updatedPost);
  } catch (error) {
    console.error("Error updating post:", error);
    res.status(500).send({ error: error.message });
  }
});

// API 엔드포인트 - 포스트 삭제
app.delete("/api/posts/:id", async (req, res) => {
  const { username } = req.body; // 요청 본문에서 username 가져오기
  const { id } = req.params;
  try {
    const post = await Post.findById(id);
    if (!post) return res.status(404).send("Post not found");
    // username 비교
    if (post.username !== username) {
      return res.status(403).send("You are not authorized to delete this post");
    }
    const deletedPost = await Post.findByIdAndDelete(id); // 포스트 삭제
    res.status(200).send("Post deleted successfully");
  } catch (error) {
    console.error("Error deleting post:", error);
    res.status(500).send({ error: error.message });
  }
});

// 회원가입
app.post("/api/auth/register", async (req, res) => {
  const { username, password } = req.body;
  const hashedPassword = await bcrypt.hash(password, 10);
  const user = new User({ username, password: hashedPassword });
  await user.save();
  res.status(201).send("User registered");
});

// 로그인
app.post("/api/auth/login", async (req, res) => {
  const { username, password } = req.body;
  const user = await User.findOne({ username });
  if (!user) return res.status(400).send("Invalid credentials");

  const isValid = await bcrypt.compare(password, user.password);
  if (!isValid) return res.status(400).send("Invalid credentials");

  const token = jwt.sign({ userId: user._id }, "your_jwt_secret");
  res.json({ token, username: user.username });
});

// 로그아웃 (프론트엔드에서 클라이언트 측에서 토큰 삭제)
app.post("/api/auth/logout", (req, res) => {
  // 클라이언트에서 JWT를 삭제하여 로그아웃을 처리합니다.
  res.send("Logged out");
});

//회원탈퇴
app.delete("/api/auth/delete", async (req, res) => {
  const { userId } = req.body; // 클라이언트에서 userId를 받아옵니다.
  try {
    // 사용자 삭제
    await User.findByIdAndDelete(userId);
    res.send("User deleted successfully");
  } catch (error) {
    console.error("Error deleting user:", error);
    res.status(500).send("Error deleting user");
  }
});

// 댓글 가져오기
app.get("/api/posts/:postId/comments", async (req, res) => {
  try {
    const comments = await Comment.find({ postId: req.params.postId });
    res.json(comments);
  } catch (error) {
    console.error("Error fetching comments:", error);
    res.status(500).json({ message: "Failed to fetch comments" });
  }
});

// 댓글 추가하기
app.post("/api/posts/:postId/comments", async (req, res) => {
  const { username, content } = req.body; // username이 빠져 있습니다.
  try {
    const newComment = new Comment({
      postId: req.params.postId,
      username, // username이 undefined일 수 있음
      content,
    });
    await newComment.save();
    res.status(201).json(newComment);
  } catch (error) {
    console.error("Error adding comment:", error);
    res.status(500).json({ message: "Failed to add comment" });
  }
});

// 서버 실행
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
