const express = require("express"); // Express 모듈을 가져와서 서버를 쉽게 설정할 수 있게 해줌
const cors = require("cors"); // CORS(Cross-Origin Resource Sharing)를 허용하여 외부 도메인에서 API 호출을 허용
const multer = require("multer"); // 파일 업로드를 관리하는 라이브러리
const path = require("path"); // 경로 관리를 위한 Node.js 모듈
const bcrypt = require("bcryptjs"); // 비밀번호를 암호화하기 위한 라이브러리
const jwt = require("jsonwebtoken"); // JWT를 사용하여 인증을 처리하는 라이브러리
const fs = require("fs"); // 파일 시스템 관련 작업을 위한 기본 Node.js 모듈
const mongoose = require("mongoose"); // MongoDB와 상호작용하기 위한 라이브러리
const User = require("./models/User"); // User 모델을 가져와서 MongoDB와 연결
const Post = require("./models/Post"); // Post 모델을 가져와서 MongoDB와 연결
const Comment = require("./models/Comment"); // Comment 모델을 가져와서 MongoDB와 연결

const app = express();
const PORT = process.env.PORT || 5000;
app.use((req, res, next) => {
  res.setHeader(
    "Content-Security-Policy",
    "default-src 'self'; font-src 'self' https://myforumserver-production.up.railway.app; img-src 'self' https://myforumserver-production.up.railway.app; script-src 'self'; style-src 'self';"
  );
  next();
});
app.use(cors);
app.use(express.json());
const uploadsDir = path.join(__dirname, "uploads");
app.use("/uploads", express.static(uploadsDir));
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log("Uploads directory created");
}

// MongoDB URI 설정
const uri =
  "mongodb+srv://xormsowo:wlfkf571@cluster0.mfvhg.mongodb.net/forum?retryWrites=true&w=majority&appName=Cluster0";

// Mongoose로 MongoDB와 연결
mongoose
  .connect(uri, {}) // MongoDB URI로 연결
  .then(() => console.log("MongoDB connected")) // 연결 성공 시 메시지 출력
  .catch((err) => console.error("MongoDB connection error:", err)); // 연결 실패 시 에러 출력

// 파일 업로드 설정 (Multer 사용)
const storage = multer.diskStorage({
  // diskStorage는 파일을 디스크에 저장하는 방식에 대한 설정을 정의
  // 두 가지 주요 옵션인 destination(저장 경로)과 filename(저장할 파일 이름)을 정의하여 파일이 어디에 어떻게 저장될지를 설정
  destination: function (req, file, cb) {
    // (파일 저장 경로)
    /* req는 HTTP 요청 객체, 
    file은 업로드된 파일 정보, 
    cb는 콜백 함수 */
    cb(null, uploadsDir); // 파일 저장 경로 설정
    // null(에러 없음)과 함께 파일을 저장할 경로를 반환
    // cb(null, ...)에서 **null**은 에러가 없음을 나타내는 값
    // 첫 번째 인자로 에러가 전달되지 않으면(즉, null이 전달되면) 작업이 정상적으로 진행
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname));
    // 파일 이름을 현재 시간으로 설정하여 고유하게 만듦
    // originalname은 업로드된 파일의 원래 이름
    //**path.extname()**은 파일의 확장자 부분을 추출하는 함수
    // example.png라면, .png 확장자를 반환
  },
});

// Multer 인스턴스 생성
const upload = multer({ storage: storage });

// 모든 게시물을 가져오는 API 엔드포인트
app.get("/api/posts", async (req, res) => {
  try {
    const allPosts = await Post.find(); // 모든 게시물 검색
    res.json(allPosts); // JSON 형식으로 반환
  } catch (error) {
    console.error("Error fetching posts:", error);
    res.status(500).send({ error: error.message }); // 에러 발생 시 500 상태 코드 반환
  }
});

// API 엔드포인트 - 특정 포스트 가져오기
app.get("/api/posts/:id", async (req, res) => {
  try {
    const post = await Post.findById(req.params.id); // ID로 게시물 찾기
    if (!post) return res.status(404).send("Post not found");
    res.json(post);
  } catch (error) {
    console.error("Error fetching post:", error);
    res.status(500).send({ error: error.message });
  }
});

// API 엔드포인트 - 포스트 추가
app.post("/api/posts", upload.single("file"), async (req, res) => {
  const { title, content, username } = req.body;
  let fileUrl = null;
  if (req.file) {
    fileUrl = `https://myforumserver-production.up.railway.app/uploads/${req.file.filename}`;
    console.log("File uploaded:", req.file);
  }

  const newPost = new Post({ title, content, username, fileUrl });

  try {
    const savedPost = await newPost.save();
    res
      .status(201)
      .json({ message: "Post created successfully", post: savedPost, fileUrl });
  } catch (error) {
    console.error("Error saving post:", error);
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
