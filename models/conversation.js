const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema({
  participants: [{ type: String, required: true }], // list of participants
  articleId: { type: String, required: true }, // ID of the article
  createdAt: { type: Date, default: Date.now }, // creation date
});

module.exports = mongoose.model('Conversation', conversationSchema);