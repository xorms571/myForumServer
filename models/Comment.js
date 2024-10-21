const mongoose = require('mongoose');

const CommentSchema = new mongoose.Schema({
  postId: { type: mongoose.Schema.Types.ObjectId, ref: 'Post', required: true }, // 댓글이 달린 게시물
  username: { type: String, required: true }, // 댓글 작성자
  content: { type: String, required: true }, // 댓글 내용
  createdAt: { type: Date, default: Date.now }, // 댓글 작성일
});

module.exports = mongoose.model('Comment', CommentSchema);
