var express = require("express");
var router = express.Router();
const User = require("../models/users.js");
const Article = require("../models/articles.js");
const { checkBody } = require("../modules/checkBody");
const mongoose = require("mongoose");
const uniqid = require("uniqid");
const cloudinary = require("cloudinary").v2;
const fs = require("fs");

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
      user,
      title,
      productDescription,
      category,
      itemType,
      condition,
      price,
    } = req.body;

    // Price must be a positive number
    if (price < 0) {
      return res
        .status(400)
        .json({ result: false, error: "Invalid price value" });
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
    const photoPath = `./tmp/${uniqid()}.jpg`;

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
      const url = resultCloudinary.secure_url;
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
      user,
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
    res.status(500).json({
      result: false,
      message: "An error has occurred.",
      error: error.message,
    });
  }
});

router.get("/", async (req, res) => {
  try {
    // display all the articles
    const articles = await Article.find().populate(
      "user",
      "firstname note address.city -_id"
    );

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
      user: article.user,
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

router.get("/:id", async (req, res) => {
  try {
    const article = await Article.findById(req.params.id).populate(
      "user",
      "firstname note address.city -_id"
    );

    // Check if the id is exist in database
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
      user: article.user,
    };

    res.json({ result: true, article: articleResponse });
  } catch (error) {
    res.status(500).json({
      result: false,
      message: "An error has occurred.",
      error: error.message,
    });
  }
});

module.exports = router;
