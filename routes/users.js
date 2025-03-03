var express = require("express");
var router = express.Router();
require("../models/connection");
const User = require("../models/users.js");
const { checkBody } = require("../modules/checkBody");
const jwt = require("jsonwebtoken");
const moment = require("moment");
const bcrypt = require("bcrypt");

// Regex to validate email
const emailRegex =
  /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;

router.post("/signup", async (req, res) => {
  try {
    // check if the body is correct
    if (
      !checkBody(req.body, [
        "firstname",
        "password",
        "confirmPassword",
        "email",
        "lastname",
      ])
    ) {
      return res.json({ result: false, error: "Missing or empty fields" });
    }

    // checke if the user exists
    const existingUser = await User.findOne({ email: req.body.email });

    if (existingUser) {
      return res.json({ result: false, error: "User already exists" });
    }

    // check if the password and confirmPassword are the same
    if (req.body.password !== req.body.confirmPassword) {
      return res.json({ result: false, error: "Passwords do not match" });
    }
    // clean code
    const { username, firstname, lastname, email, password, confirmPassword } =
      req.body;

    // hash the password
    const hash = bcrypt.hashSync(req.body.password, 10);

    // Ggenerate a token
    const token = jwt.sign({ email: req.body.email }, process.env.JWT_SECRET, {
      expiresIn: "1y",
    });

    // format the date of birth
    const dateOfBirth = moment(
      req.body.dateOfBirth,
      ["YYYY-MM-DD", "DD/MM/YYYY", "MMMM D, YYYY"],
      true
    );

    // create a new user
    const newUser = new User({
      username,
      firstname,
      lastname,
      email,
      dateOfBirth,
      password: hash,
      token: token,
    });
    // Sauvegarder le nouvel utilisateur
    const saveUser = await newUser.save();


    // Réponse avec le résultat
    res.json({ result: true });
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



router.post("/signin", async (req, res) => {
  try {
    if (!checkBody(req.body, ["email", "password"])) {
      res.json({ result: false, error: "Missing or empty fields" });
      return;
    }

    const userData = await User.findOne(
      { email: req.body.username } && { admin: true }
    );
    if (userData && bcrypt.compareSync(req.body.password, data.password)) {
      res.json({ result: true, token: data.token });
    } else {
      res.json({ result: false, error: "User not found or wrong password" });
    }
  } catch (error) {
    // Handle any errors
    res
      .status(500)
      .json({
        result: false,
        message: "An error has occurred.",
        error: error.message,
      });
  }
});

module.exports = router;
