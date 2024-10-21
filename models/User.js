// models/User.js
const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  // 추가 필드 필요에 따라 추가
});

module.exports = mongoose.model('User', UserSchema);
