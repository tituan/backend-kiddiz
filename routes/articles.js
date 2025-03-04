var express = require("express");
var router = express.Router();
const User = require("../models/users.js");
const Article = require("../models/articles.js");
const FavoriteArticle = require("../models/favoriteArticles.js");
const { checkBody } = require("../modules/checkBody");
const mongoose = require("mongoose");

// Article creation
router.post('/', async (req, res) => {

    try {
        // check if the body is correct
        if (!checkBody(req.body, [
            "title",
            "productDescription",
            "category",
            "itemType",
            "condition",
            "price",
            "pictures",
        ])
        ) {
            return res.json({ result: false, error: "Missing or empty fields" });
        }

        const { user, title, productDescription, category, itemType, condition, price, pictures } = req.body;

        // An article can't be created without an userID
        if (!user) {
            return res.status(400).json({ result: false, error: "User ID is required" });
        }

        // Price must be a positive number
        if (price < 0) {
            return res.status(400).json({ result: false, error: "Invalid price value" });
        }

        // Validate user ID format
        if (!mongoose.Types.ObjectId.isValid(user)) {
            return res.status(400).json({ result: false, error: "Invalid user ID format" });
        }

        // Check if the user exists in the database
        const foundUser = await User.findById(user);
        if (!foundUser) {
            return res.status(404).json({ result: false, error: "User not found" });
        }

        // create a new article
        const newArticle = new Article({
            user,
            title,
            productDescription,
            category,
            itemType,
            condition,
            price,
            pictures,
            articleCreationDate: new Date()
        });

        // Save the new article
        const savedArticle = await newArticle.save();

        // selection of the informations i want to share
        const articleResponse = {
            title: savedArticle.title,
            productDescription: savedArticle.productDescription,
            category: savedArticle.category,
            itemType: savedArticle.itemType,
            condition: savedArticle.condition,
            price: savedArticle.price,
            pictures: savedArticle.pictures,
            articleCreationDate: savedArticle.articleCreationDate,
        };

        // Réponse avec le résultat
        res.json({ result: true, article: articleResponse });

    } catch (error) {
        // Gérer les erreurs éventuelles
        res
            .status(500)
            .json({
                result: false,
                message: "An error has occurred.",
                error: error.message,
            });
    }
});

// Display all articles
router.get('/', async (req, res) => {

    try {

        // display all the articles
        const articles = await Article.find()
            .populate('user', 'firstname note address.city -_id');;

        // selection of the informations i want to share
        const articlesResponse = articles.map(article => ({
            id: article.id,
            title: article.title,
            productDescription: article.productDescription,
            category: article.category,
            itemType: article.itemType,
            condition: article.condition,
            price: article.price,
            pictures: article.pictures,
            articleCreationDate: article.articleCreationDate,
            user: article.user
        }));

        res.json({ result: true, articles: articlesResponse });

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

// Display article by ID
router.get('/:id', async (req, res) => {

    try {

        const article = await Article.findById(req.params.id)
            .populate('user', 'firstname note address.city -_id');

        // Check if the id is exist in database
        if (!article) {
            return res.status(404).json({ result: false, error: "Article not found" });
        }

        // selection of the informations i want to share
        const articleResponse = {
            id: article.id,
            title: article.title,
            productDescription: article.productDescription,
            category: article.category,
            itemType: article.itemType,
            condition: article.condition,
            price: article.price,
            pictures: article.pictures,
            articleCreationDate: article.articleCreationDate,
            user: article.user
        };

        res.json({ result: true, article: articleResponse });

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

// User like an Article // A VOIR SI CE CODE RESTE ICI OU SI ON CREE UNE NOUVELLE ROUTE PAR LA SUITE
router.post('/like', async (req, res) => {

    try {

        const { userId, articleId } = req.body;

        // Validate user ID format
        if (!mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(400).json({ result: false, error: "Invalid user ID format" });
        }

        // Vérifier si l'utilisateur existe
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ result: false, error: "User not found" });
        }

        // Vérifier si l'article existe
        const article = await Article.findById(articleId);
        if (!article) {
            return res.status(404).json({ result: false, error: "Article not found" });
        }

        // Vérifier si un enregistrement favori existe déjà pour l'utilisateur
        let favorite = await FavoriteArticle.findOne({ user: userId });

        if (!favorite) {

            // Si aucun enregistrement, on le crée sous forme d'objet, ([articleId] car le schéma favoriteArticle attend un tableau)
            favorite = new FavoriteArticle({ user: userId, articles: [articleId] });

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


module.exports = router;