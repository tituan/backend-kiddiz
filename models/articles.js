const mongoose = require('mongoose');

const articleSchema = mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: "users"},
    stripeProductId: { type: String },
    articleCreationDate: { type: Date },
    title: { type: String, required: true },
    productDescription: { type: String },
    category: { type: String },
    itemType: { type: String },
    condition: { type: String }, // "new", "pristine", "good"
    price: { type: Number },
    vat: { type: Number, default: 0 },
    currency: { type: String, default: "EUR" },
    pictures: [{ type: String }],
    availableStock: {type: Number, default: 1},
    usersLikers: [{ type: mongoose.Schema.Types.ObjectId, ref: "users" }],
    boughtBy: { type: mongoose.Schema.Types.ObjectId, ref: "users" },
});

const Article = mongoose.model('articles', articleSchema);

module.exports = Article;