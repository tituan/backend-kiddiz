var express = require("express");
var router = express.Router();
const User = require("../models/users.js");
const Article = require("../models/articles.js");
const { checkBody } = require("../modules/checkBody");
const mongoose = require("mongoose");
const uniqid = require("uniqid");
const cloudinary = require("cloudinary").v2;
const fs = require("fs");
const { emit, send } = require("process");
const nodemailer = require("nodemailer");

// Create an article
router.post("/", async (req, res) => {
    try {

        // check if the body is correct
        if (
            !checkBody(req.body, [
                "title",
                "productDescription",
                "category",
                "itemType",
                "condition",
                "price",
            ])
        ) {
            return res.json({ result: false, error: "Missing or empty fields" });
        }

        const {
            token,
            title,
            productDescription,
            category,
            itemType,
            condition,
            price,
            iban,
        } = req.body;

        // Check if user exist
        const user = await User.findOne({ token: token });


        // Price must be a positive number
        if (price < 0 || price > 999) {
            return res
                .status(400)
                .json({ result: false, error: "Invalid price value" });
        }

        // title must have maximum 30 characters
        if (title.length > 30) {
            return res
                .status(400)
                .json({ result: false, error: "Invalid title length" });
        }

        // description must have maximum 250 characters
        if (productDescription.length > 250) {
            return res
                .status(400)
                .json({ result: false, error: "Invalid description length" });
        }

        // An article can't be created without an userID
        if (!user) {
            return res
                .status(400)
                .json({ result: false, error: "User ID is required" });
        }

        // Validate user ID format
        if (!mongoose.Types.ObjectId.isValid(user)) {
            return res
                .status(400)
                .json({ result: false, error: "Invalid user ID format" });
        }

        // send the pictures to cloudinary
        const photoPath = `/tmp/${uniqid()}.jpg`;

        console.log(req.files);
        // check if the picture is present
        if (!req.files.pictures) {
            res.json({ result: false, error: "Pas de photo" });
        }
        const resultMove = await req.files.pictures.mv(photoPath);

        // check if the picture is moved
        let resultCloudinary = null;

        if (!resultMove) {
            resultCloudinary = await cloudinary.uploader.upload(photoPath); // await is important here
            fs.unlinkSync(photoPath);
        } else {
            return res.json({
                result: false,
                error: resultMove.message || resultMove,
            }); // return the error
        }

        // check if the picture is uploaded
        if (!resultCloudinary) {
            return res.json({
                result: false,
                error: "Failed to upload picture to Cloudinary",
            });
        }

        // create a new article
        const newArticle = new Article({
            user: user._id,
            title,
            productDescription,
            category,
            itemType,
            condition,
            price,
            pictures: resultCloudinary.secure_url,
            articleCreationDate: new Date(),
        });

        // Save the new article
        const savedArticle = await newArticle.save();
        const savedUser = await User.updateOne({ token: token },{ $set: { iban: iban } });
        
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
        res.json({ result: true, article: articleResponse , user : savedUser.token, userIban: savedUser.iban});
    } catch (error) {
        // Gérer les erreurs éventuelles
        res.status(500).json({
            result: false,
            message: "An error has occurred.",
            error: error.message,
        });
    }
});

// Display all articles & Display articles by search
router.get('/', async (req, res) => {

    try {

        // Récupérer le terme de recherche depuis la requête s'il y en a un 
        const searchTerm = req.query.search || '';

        // Filtrer la recherche sur le titre de l'article
        const filter = searchTerm ? { title: { $regex: searchTerm, $options: 'i' }, availableStock: { $gt: 0 } } : { availableStock: { $gt: 0 } };

        // Afficher tous les articles ou ceux qui correspondent au terme de recherche
        const articles = await Article.find(filter)
            .populate('user', 'firstname note token address.city -_id');

        // selection of the informations i want to share
        const articlesResponse = articles.map((article) => ({
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
            userToken: article.user.token,
            usersLikers: article.usersLikers.token,
        }));

        res.json({ result: true, articles: articlesResponse });
    } catch (error) {
        res.status(500).json({
            result: false,
            message: "An error has occurred.",
            error: error.message,
        });
    }
});

// Display articles by date
router.get('/recent', async (req, res) => {

    try {

        const articles = await Article.find({ availableStock: { $gt: 0 } })
            .populate('user', 'firstname note token address.city -_id')
            .populate('usersLikers', 'token -_id')
            .sort({  articleCreationDate: -1 });

        // Check if the id is exist in database
        if (!articles || articles.length === 0) {
            return res
                .status(404)
                .json({ result: false, error: "articles not found" });
        }

        // Mapper les articles pour ne renvoyer que les informations souhaitées
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
            likesCount: article.usersLikers.length, // Ajout du nombre de likes
            availableStock: article.availableStock,
            user: article.user,
            usersLikers: article.usersLikers,
        }));

        res.json({ result: true, article: articlesResponse });

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

// Display articles by Seller
router.get('/get-by/buyer/:token', async (req, res) => {

    try {

        const user = await User.findOne({ token: req.params.token })

        const articles = await Article.find({ user: user._id, availableStock: { $gt: 0 } })
            .populate('user', 'firstname lastname followers note address.city token -_id')
            .populate('usersLikers', 'token -_id');
    
        // Check if the id is exist in database
        if (!articles || articles.length === 0) {
            return res
                .status(404)
                .json({ result: false, error: "No articles not found" });
        }

        // Mapper les articles pour ne renvoyer que les informations souhaitées
        const articlesResponse = articles.map(article => ({
            id: article._id,
            title: article.title,
            productDescription: article.productDescription,
            category: article.category,
            itemType: article.itemType,
            condition: article.condition,
            price: article.price,
            pictures: article.pictures,
            articleCreationDate: article.articleCreationDate,
            likesCount: article.usersLikers.length, // Ajout du nombre de likes
            availableStock: article.availableStock,
            user: article.user,
            usersLikers: article.usersLikers,
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

// Display articles by Seller
router.get('/get-by/seller/:token', async (req, res) => {

    try {

        const user = await User.findOne({ token: req.params.token })

        const articles = await Article.find({ user: user._id, availableStock: { $gt: 0 } })
            .populate('user', 'firstname lastname followers note address.city token -_id')
            .populate('usersLikers', 'token -_id');
    
        // Check if the id is exist in database
        if (!articles || articles.length === 0) {
            return res
                .status(200)
                .json({ result: false, error: "No articles not found" });
        }

        // Mapper les articles pour ne renvoyer que les informations souhaitées
        const articlesResponse = articles.map(article => ({
            id: article._id,
            title: article.title,
            productDescription: article.productDescription,
            category: article.category,
            itemType: article.itemType,
            condition: article.condition,
            price: article.price,
            pictures: article.pictures,
            articleCreationDate: article.articleCreationDate,
            likesCount: article.usersLikers.length, // Ajout du nombre de likes
            availableStock: article.availableStock,
            user: article.user,
            usersLikers: article.usersLikers,
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

// Display sold articles by Seller
router.get('/sold-by/seller/:token', async (req, res) => {

    try {

        // Seller
        const user = await User.findOne({ token: req.params.token })

          if (!user) {
            return res
                .status(404)
                .json({ result: false, error: "User not found" });
        }

        const articles = await Article.find({ user: user._id, availableStock: 0 })
        .populate('user', 'firstname lastname email token -_id')
        .populate('boughtBy', 'firstname token -_id')

        if (!articles || articles.length === 0) {
            return res
                .status(404)
                .json({ result: false, error: "Articles not found" });
        }

        // Mapper les articles pour ne renvoyer que les informations souhaitées
        const articlesResponse = articles.map(article => ({
            id: article._id,
            title: article.title,
            price: article.price,
            category: article.category,
            itemType: article.itemType,
            condition: article.condition,
            productDescription: article.productDescription,
            pictures: article.pictures,
            availableStock: article.availableStock,
            likesCount: article.usersLikers.length,
            user: article.user,
            boughtBy: article.boughtBy
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

// Display bought articles by Buyer
router.get('/bought-by/buyer/:token', async (req, res) => {

    try {

        // Buyer
        const user = await User.findOne({ token: req.params.token })
        .populate({
            path: 'articlesBought',
            select: 'title price pictures category condition productDescription itemType availableStock user',
            populate: {
                path: 'user',
                select: 'firstname -_id'
            }
        });
         
        if (!user) {
            return res
                .status(404)
                .json({ result: false, error: "User not found" });
        }

        const userResponse = ({
            firstname: user.firstname,
            lastname: user.lastname,
            email: user.email,
            token: user.token,
            articlesBought: user.articlesBought,
        });

        res.json({ result: true, user: userResponse });

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
router.get('/get-by/id/:id', async (req, res) => {

    try {

        const article = await Article.findOne({_id: req.params.id, availableStock: { $gt: 0 }})
            .populate('user', 'firstname note address.city token -_id');

        // Check if the id exist in database
        if (!article) {
            return res
                .status(404)
                .json({ result: false, error: "Article not found" });
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
            availableStock: article.availableStock,
            user: article.user,
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

//Display articles by item type
router.get('/get-by/type/:itemType', async (req, res) => {
    
    try {

        const articles = await Article.find({ itemType: req.params.itemType, availableStock: { $gt: 0 } })
            .populate('user', 'firstname note address.city token -_id');

        // Check if the id is exist in database
        if (!articles) {
            return res
                .status(404)
                .json({ result: false, error: "Article not found" });
        }

        // selection of the informations i want to share
        const articlesResponse = articles.map((article) => ({
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
        }));  

        res.json({ result: true, article: articlesResponse });

    } catch (error) {
        res
            .status(500)
            .json({
                result: false,
                message: "An error has occurred.",
                error: error.message,
            });
    };
}
);

// Display articles by category
router.get('/category/:category', async (req, res) => {

    try {

        const articles = await Article.find({category: req.params.category, availableStock: { $gt: 0 } })
            .populate('user', 'firstname note address.city token -_id');


        // Check if the id is exist in database
        if (!articles) {
            return res
                .status(404)
                .json({ result: false, error: "Article not found" });
            }


        // selection of the informations i want to share
        const articleResponse = articles.map((article) => ({
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
        }));

        res.json({ result: true, article: articleResponse });

    } catch (error) {
        res
            .status(500)
            .json({
                result: false,
                message: "An error has occurred.",
                error: error.message,
            });
    };
}   
);

// Modify Article for Seller EN COURS
router.put("/:articleId", async (req, res) => {
    try {
        const { articleId } = req.params;
        const {
            token,
            title,
            productDescription,
            category,
            itemType,
            condition,
            price,
        } = req.body;

        // Check if user exist
        const user = await User.findOne({ token: token });

        // Check if the article exists and belongs to the user
        const article = await Article.findOne({ _id: articleId, user: user._id });

        if (!article) {
            return res.status(404).json({ result: false, error: "Article not found or unauthorized" });
        }

        // Validate the fields if they are provided
        if (price < 0 || price > 999) {
            return res.status(400).json({ result: false, error: "Invalid price value" });
        }

        if (title && title.length > 30) {
            return res.status(400).json({ result: false, error: "Invalid title length" });
        }

        if (productDescription && productDescription.length > 250) {
            return res.status(400).json({ result: false, error: "Invalid description length" });
        }

        // Update the article fields if they are provided
        if (title) article.title = title;
        if (productDescription) article.productDescription = productDescription;
        if (category) article.category = category;
        if (itemType) article.itemType = itemType;
        if (condition) article.condition = condition;
        if (price !== undefined) article.price = price;

        // Handle picture update if a new picture is provided
        if (req.files && req.files.pictures) {
            const photoPath = `/tmp/${uniqid()}.jpg`;
            const resultMove = await req.files.pictures.mv(photoPath);

            if (!resultMove) {
                const resultCloudinary = await cloudinary.uploader.upload(photoPath);
                fs.unlinkSync(photoPath);
                article.pictures = resultCloudinary.secure_url;
            } else {
                return res.json({ result: false, error: resultMove.message || resultMove });
            }
        }

        // Save the updated article
        const updatedArticle = await article.save();

        // Select the information to share
        const articleResponse = {
            title: updatedArticle.title,
            productDescription: updatedArticle.productDescription,
            category: updatedArticle.category,
            itemType: updatedArticle.itemType,
            condition: updatedArticle.condition,
            price: updatedArticle.price,
            pictures: updatedArticle.pictures,
            articleCreationDate: updatedArticle.articleCreationDate,
        };

        // Response with the result
        res.json({ result: true, article: articleResponse });
    } catch (error) {
        // Handle potential errors
        res.status(500).json({
            result: false,
            message: "An error has occurred.",
            error: error.message,
        });
    }
});

// Delete an article
router.put("/stock/:articleId", async (req, res) => {
    try {
        const { articleId } = req.params;
        const {
            token,
        } = req.body;

        console.log("Article ID:", articleId); // Log pour vérifier l'ID
        console.log("Token:", token);

        // Check if user exist
        const user = await User.findOne({ token: token });

        // Check if the article exists and belongs to the user
        const article = await Article.findOne({ _id: articleId, user: user._id });

        if (!article) {
            return res.status(404).json({ result: false, error: "Article not found or unauthorized" });
        }

        // Update the availableStock to 0
        article.availableStock = 0;
       
        // Save the updated article
        await article.save();

        // Response with the result
        res.json({ result: true, message: "article deleted" });
    } catch (error) {
        // Handle potential errors
        res.status(500).json({
            result: false,
            message: "An error has occurred.",
            error: error.message,
        });
    }
});

// Buy article
router.put("/buy/buy/buy", async (req, res) => {
    try {
        // Vérifier que tous les champs requis sont présents
        if (!checkBody(req.body, ["number", "line1", "postalCode", "city", "token", "articleId"])) {
            return res.status(400).json({ result: false, error: "Missing or empty fields" });
        }

        const { number, line1, line2, postalCode, city, token, articleId } = req.body;

        // Vérifier si l'utilisateur existe
        const buyer = await User.findOne({ token: token });
        if (!buyer) {
            return res.status(404).json({ result: false, error: "User not found" });
        }
        console.log("User:", buyer);

        // Vérifier si l'article existe
        const article = await Article.findById(articleId).populate("user", "firstname lastname email iban");
        if (!article) {
            return res.status(404).json({ result: false, error: "Article not found" });
        }

        const seller = article.user;

        // Vérifier si l'article est toujours en stock
        if (article.availableStock === 0) {
            return res.status(400).json({ result: false, error: "Article out of stock" });
        }

        //  Mettre à jour l'adresse de l'acheteur en respectant `addressSchema`
        buyer.address = {
            number: number,
            line1: line1,
            line2: line2 || "", // Optionnel
            zipCode: postalCode,
            city: city,
        };
        
        if (!buyer.articlesBought.includes(articleId)) {
            buyer.articlesBought.push(articleId);
        }
        await buyer.save();

        // Mettre à jour `availableStock` de l'article à `0`
        article.availableStock = 0;
        article.boughtBy = buyer._id;

        await article.save();

        const transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: parseInt(process.env.SMTP_PORT),
            secure: false,
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS,
            },
        });
    
        //send mail to buyer
        const mailToSeller = {
            from: process.env.EMAIL_FROM,
            to: seller.email,
            subject: "Votre article a été vendu !",
            text: `Bonjour ${seller.firstname}, 
    
    Votre article "${article.title}" a été acheté par :
    
    Nom : ${buyer.firstname} ${buyer.lastname}
    Email : ${buyer.email}
    Adresse : ${buyer.address.number} ${buyer.address.line1}, ${buyer.address.city}, ${buyer.address.zipCode}
    
    Merci d'attendre la réception du paiement sur votre IBAN (${seller.iban}) avant d'expédier l'article.
    
    Cordialement,
    L'équipe Kiddiz`,
        };
    
        await transporter.sendMail(mailToSeller);

            //send mail to buyer
        const totalPrice = (article.price + 3.99).toFixed(2);  // tofixed(2) pour avoir 2 chiffres après la virgule pour le prix
        //send mail to buyer
    const mailToBuyer = {
        from: process.env.EMAIL_FROM,
        to: buyer.email,
        subject: "Confirmation d'achat - Paiement requis",
        text: `Bonjour ${buyer.firstname}, 

Merci pour votre achat sur Kiddiz ! Voici votre facture :

Article : ${article.title}
Prix : ${article.price}€
Frais de livraison : 1.99€
Total à payer : ${totalPrice}€

Merci d’effectuer le paiement sur le compte bancaire du vendeur via son IBAN afin qu’il puisse expédier l’article.

IBAN du vendeur : ${seller.iban}

Une fois le paiement effectué, votre article vous sera expédié à l'adresse :
${buyer.address.number} ${buyer.address.line1}, ${buyer.address.city}, ${buyer.address.zipCode}

Merci pour votre confiance !
L'équipe Kiddiz`,
    };
// Envoi du mail
    await transporter.sendMail(mailToBuyer);


        //  Réponse avec les nouvelles données
        res.json({
            result: true,
            message: "Achat validé. Adresse mise à jour et stock modifié.",
            buyer: {
                firstname: buyer.firstname,
                lastname: buyer.lastname,
                address: buyer.address,
            },
            article: {
                title: article.title,
                availableStock: article.availableStock,
            }
        });

    } catch (error) {
        console.error("Erreur lors de l'achat :", error);
        res.status(500).json({
            result: false,
            message: "An error has occurred.",
            error: error.message,
        });
    }
});

// Ancienne route popular
// router.get('/popular', async (req, res) => {
//     try {
//         const articles = await Article.aggregate([
//             { $match: { availableStock: { $gt: 0 } } }, // Only available stock
//             { $addFields: { likesCount: { $size: "$usersLikers" } } }, // Compute likes count
//             { $sort: { likesCount: -1 } }, // Sort by likes count descending
//             { $lookup: { 
//                 from: "users", 
//                 localField: "user", 
//                 foreignField: "_id", 
//                 as: "userData"
//             }},
//             { $unwind: "$userData" }, // Convert user array to object
//             { 
//                 $project: {
//                     _id: 1,
//                     title: 1,
//                     productDescription: 1,
//                     category: 1,
//                     itemType: 1,
//                     condition: 1,
//                     price: 1,
//                     pictures: 1,
//                     articleCreationDate: 1,
//                     likesCount: 1,
//                     availableStock: 1,
//                     user: {
//                         firstname: "$userData.firstname",
//                         note: "$userData.note",
//                         token: "$userData.token",
//                         city: "$userData.address.city",
//                     },
//                     usersLikers: 1
//                 }
//             }
//         ]);

//         if (!articles || articles.length === 0) {
//             return res.status(404).json({ result: false, error: "articles not found" });
//         }

//         res.json({ result: true, articles });
//     } catch (error) {
//         res.status(500).json({ result: false, message: "An error has occurred.", error: error.message });
//     }
// });

module.exports = router;