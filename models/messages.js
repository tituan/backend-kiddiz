const mongoose = require('mongoose');

const messageSchema = mongoose.Schema({
    buyer: { type: mongoose.Schema.Types.ObjectId, ref: "users" },
    seller: { type: mongoose.Schema.Types.ObjectId, ref: "users" },
    content: { type: String },
    date: { type: Date },
    read: { type: Boolean, default: false },
  });

const Message = mongoose.model('messages', messageSchema);

module.exports = Message;