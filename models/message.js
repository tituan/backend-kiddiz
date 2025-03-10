// models/Message.js
const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  conversationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Conversation', required: true }, // Référence à la conversation
  sender: { type: String, required: true }, // UID32 sender
  receiver: { type: String, required: true }, // UID32 receiver
  content: { type: String, required: true }, // message
  timestamp: { type: Date, default: Date.now }, // timestamp message
});

module.exports = mongoose.model('Message', messageSchema);