const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema({
  participants: [{ type: String, required: true }], // list of participants
  articleId: {  type: mongoose.Schema.Types.ObjectId, ref: "articles"}, // ID of the article
  createdAt: { type: Date, default: Date.now }, // creation date
});

module.exports = mongoose.model('Conversations', conversationSchema);