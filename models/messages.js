const mongoose = require('mongoose');

const mesagesSchema = mongoose.Schema({
    buyer: { type: mongoose.Schema.Types.ObjectId, ref: "users" },
    seller: { type: mongoose.Schema.Types.ObjectId, ref: "users" },
    content: { type: String },
    date: { type: Date },
    read: { type: Boolean, default: false },
  });

const Mesages = mongoose.model('mesages', mesagesSchema);

module.exports = Mesages;