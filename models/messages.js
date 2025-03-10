const mongoose = require('mongoose');

const messagesSchema = mongoose.Schema({
    buyer: { type: mongoose.Schema.Types.ObjectId, ref: "users" },
    seller: { type: mongoose.Schema.Types.ObjectId, ref: "users" },
    content: { type: String },
    date: { type: Date },
    read: { type: Boolean, default: false },
  });

const Messages = mongoose.model('messagess', messagesSchema);

module.exports = Messages;