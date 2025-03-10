// models/Message.js
const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  conversationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Conversation', required: true }, // Référence à la conversation
  sender: { type: mongoose.Schema.Types.ObjectId, ref: "users"}, // UID32 sender
  receiver: {  type: mongoose.Schema.Types.ObjectId, ref: "articles" }, // UID32 receiver
  content: { type: String, required: true }, // message
  timestamp: { type: Date, default: Date.now }, // timestamp message
});

module.exports = mongoose.model('Message', messageSchema);