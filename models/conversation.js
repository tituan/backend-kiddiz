const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema({
  participants: [{  type: mongoose.Schema.Types.ObjectId, ref: "users"}], // list of participants
  articleId: {  type: mongoose.Schema.Types.ObjectId, ref: "articles"}, // ID of the article
  createdAt: { type: Date, default: Date.now }, // creation date
});

module.exports = mongoose.model('conversations', conversationSchema);