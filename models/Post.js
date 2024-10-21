// models/Post.js
const mongoose = require("mongoose");

const PostSchema = new mongoose.Schema({
  title: { type: String, required: true },
  content: { type: String, required: true },
  username: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  fileUrl: { type: String },
});

module.exports = mongoose.model("Post", PostSchema);
