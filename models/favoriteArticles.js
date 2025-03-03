const mongoose = require('mongoose');

const favoriteArticleSchema = mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: "users", required: true },
    articles: [{ type: mongoose.Schema.Types.ObjectId, ref: "articles", required: true }],
});

const FavoriteArticle = mongoose.model('favoriteArticles', favoriteArticleSchema);

module.exports = FavoriteArticle;