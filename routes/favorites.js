var express = require("express");
var router = express.Router();
const User = require("../models/users.js");
const Article = require("../models/articles.js");
const mongoose = require("mongoose");
const FavoriteArticle = require("../models/favoriteArticles.js");

// User like an Article
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

        // Vérifier si un enregistrement favori existe déjà pour l'utilisateur
        let favorite = await FavoriteArticle.findOne({ user: user._id });

        if (!favorite) {

            // Si aucun enregistrement, on le crée sous forme d'objet, ([articleId] car le schéma favoriteArticle attend un tableau)
            favorite = new FavoriteArticle({ user: user._id, articles: [articleId] });

        } else {

            // Si l'article est déjà liké on ajoute la mécanique de délike 
            if (favorite.articles.includes(articleId)) {

                // On retire l'article de sa liste de favoris
                favorite.articles = favorite.articles.filter(id => id.toString() !== articleId.toString())

                // Si plus aucun article n'est en favori, supprimer l'entrée FavoriteArticle car il n'y aurait plus qu'un user avec un tableau vide
                if (favorite.articles.length === 0) {
                    await FavoriteArticle.findByIdAndDelete(favorite._id);
                    return res.json({ result: true, message: "No more favorites" });
                }

            } else {

                // Sinon, on ajoute l'article à sa liste de favoris
                favorite.articles.push(articleId);
            }
        }

        // Sauvegarde en base
        await favorite.save();

        res.json({ result: true, message: "Article added to favorites", favorite });

    } catch (error) {
        res.status(500).json({ result: false, error: error.message });
    }
});

// Display article by likes so that the user can see his likes
router.get('/:userToken', async (req, res) => {

    try {

        const userToken = req.params.userToken;

        // Check if user exist
        const user = await User.findOne({ token: userToken });
        if (!user) {
            return res.status(404).json({ result: false, error: "User not found" });
        }

        // Check if user has some favoriteArticles
        const articles = await FavoriteArticle.find({ user: user._id })
            .populate('articles');

        // Check if there is articles to display
        if (!articles) {
            return res.status(204).json({ result: false, error: "Articles not found" });
        }

        res.json({ result: true, article: articles });

    } catch (error) {
        res
            .status(500)
            .json({
                result: false,
                message: "An error has occurred.",
                error: error.message,
            });
    }
})

module.exports = router;