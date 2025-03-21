var express = require("express");
var router = express.Router();
const User = require("../models/users.js");
const Article = require("../models/articles.js");
const mongoose = require("mongoose");
const FavoriteArticle = require("../models/favoriteArticles.js");

// User likes an Article
router.post('/', async (req, res) => {

    try {

        const { token, articleId } = req.body;

        // Vérifier si l'utilisateur existe
        const user = await User.findOne({ token: token });
        if (!user) {
            return res.status(404).json({ result: false, error: "User not found" });
        }

        // Validate article ID format
        if (!mongoose.Types.ObjectId.isValid(articleId)) {
            return res.status(400).json({ result: false, error: "Invalid article ID format" });
        }

        // Vérifier si l'article existe
        const article = await Article.findById(articleId);
        if (!article) {
            return res.status(404).json({ result: false, error: "Article not found" });
        }

        const favoriteArticles = await FavoriteArticle.findOne({ user: user._id })
        
        // Si cet utilisateur n'a jamais liké d'articles
        if (!favoriteArticles) {

            // On le crée sous forme d'objet, ([articleId] car le schéma favoriteArticle attend un tableau)
            const newFavorite = new FavoriteArticle({ user: user._id, articles: [articleId] });

            await newFavorite.save();

            // Et on ajoute l'id de l'utilisateur dans le tableau usersLikers de l'article
            await Article.updateOne({ _id: article._id }, { $addToSet: { usersLikers: user._id } })

            return res.status(201).json({ result: true, message: "Article added to favorites and user created in likers array" })
        
        // Sinon si l'article est déjà liké
        } else if (favoriteArticles.articles.some((e) => e.toString() === articleId)) {

            // On retire l'article de la liste de like de l'utilisateur
            await FavoriteArticle.updateOne({ _id: favoriteArticles._id }, { $pull: { articles: articleId }});

            // on retire le user du tableau userLikers 
            await Article.updateOne({ _id: article._id }, { $pull: { usersLikers: user._id } })

            return res.status(200).json({ result: true, message: "Article removed from favorites and user removed from likers" });

        } else {

            // Sinon on ajoute l'article dans la liste favoriteArticles du user
            await FavoriteArticle.updateOne({ _id: favoriteArticles._id }, { $addToSet: { articles: articleId }});

            // et on ajoute le user dans le tableau usersLikers 
            await Article.updateOne({ _id: article._id }, { $addToSet: { usersLikers: user._id } })

            return res.status(200).json({ result: true, message: "Article added to favorites and user added to likers" })
        }

    } catch (error) {
        res.status(500).json({ result: false, error: error.message });
    }
});


router.get('/:userToken', async (req, res) => {
    try {
        const userToken = req.params.userToken;

        // Vérifier si l'utilisateur existe
        const user = await User.findOne({ token: userToken });
        if (!user) {
            return res.status(404).json({ result: false, error: "User not found" });
        }

        // Vérifier si l'utilisateur a des articles favoris
        const favoriteArticles = await FavoriteArticle.findOne({ user: user._id }).populate('articles');

        // Vérifier si l'utilisateur a des articles favoris
        if (!favoriteArticles || favoriteArticles.articles.length === 0) {
            return res.json({ result: false, error: "No favorite articles found" });
        }

        // Créer la réponse avec les informations nécessaires
        const articlesResponse = favoriteArticles.articles.map((article) => {

            return {
                id: article.id,
                title: article.title,
                productDescription: article.productDescription,
                category: article.category,
                itemType: article.itemType,
                condition: article.condition,
                price: article.price,
                pictures: article.pictures,
                articleCreationDate: article.articleCreationDate,
                likesCount: article.usersLikers.length,
                availableStock: article.availableStock,
                user: article.user,
            };
        });

        res.json({ result: true, articles: articlesResponse });
    } catch (error) {
        res.status(500).json({
            result: false,
            message: "An error has occurred.",
            error: error.message,
        });
    }
});

module.exports = router;