
// import express from "express";
// import jwtDecode from "jwt-decode";
// var express = require("express");
// var router = express.Router();
// require("../models/connection");
// const User = require("../models/users.js");
// const { checkBody } = require("../modules/checkBody");
// const jwt = require("jsonwebtoken");
// // import { jwtDecode } from "jwt-decode";
// const moment = require("moment");
// const bcrypt = require("bcrypt");
// const nodemailer = require("nodemailer");
// const uid2 = require('uid2');
// const { OAuth2Client } = require('google-auth-library');

const express = require("express");
const router = express.Router();
require("../models/connection");
const User = require("../models/users.js");
const { checkBody } = require("../modules/checkBody");
const jwtDecode = require("jwt-decode");
const moment = require("moment");
const bcrypt = require("bcrypt");
const nodemailer = require("nodemailer");
const uid2 = require("uid2");
const { OAuth2Client } = require("google-auth-library");

// Regex to validate email
const emailRegex =
  /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;

router.post("/signup", async (req, res) => {
  try {
    //clean all  req.body is correct withouth spaces
    const cleanedBody = {
      firstname: req.body.firstname?.trim() || "",
      lastname: req.body.lastname?.trim() || "",
      email: req.body.email?.trim() || "",
      password: req.body.password,
      confirmPassword: req.body.confirmPassword,
      dateOfBirth: req.body.dateOfBirth,
      conditionUtilisation: req.body.conditionUtilisation,
      publicy: req.body.publicy,
    };

    // check if the body is correct
    if (
      !checkBody(cleanedBody, [
        "firstname",
        "password",
        "confirmPassword",
        "email",
        "lastname",
        "dateOfBirth",
      ])
    ) {
      return res.json({ result: false, error: "Missing or empty fields" });
    }

    // check if the password length is greater than 5 characters
    if (cleanedBody.password.length < 5) {
      return res.json({
        result: false,
        error: "Password must be at least 5 characters long",
      });
    }

    // check if the user accepted the terms and conditions
    if (!Boolean(req.body.conditionUtilisation) && !Boolean(req.body.publicy)) {
      return res.json({
        result: false,
        error: "You must accept the terms and conditions",
      });
    }

    // check if the email is valid
    if (!emailRegex.test(cleanedBody.email)) {
      return res.json({ result: false, error: "Invalid email" });
    }

    // checke if the user exists
    const existingUser = await User.findOne({ email: cleanedBody.email });

    if (existingUser) {
      return res.json({ result: false, error: "User already exists" });
    }

    // check if the password and confirmPassword are the same
    if (cleanedBody.password !== cleanedBody.confirmPassword) {
      return res.json({ result: false, error: "Passwords do not match" });
    }

    // hash the password
    const hash = bcrypt.hashSync(cleanedBody.password, 10);

    // Ggenerate a token NOT USED FOR V1
    // const token = jwt.sign(
    //   { email: cleanedBody.email },
    //   process.env.JWT_SECRET,
    //   {
    //     expiresIn: "1y",
    //   }
    // );

    // format the date of birth
    const dateOfBirth = moment(
      req.body.dateOfBirth,
      true
    );

    const { firstname, lastname, email } = cleanedBody;

    // create a new user
    const newUser = new User({
      firstname,
      lastname,
      email,
      dateOfBirth,
      password: hash,
      token: uid2(32),
    });

    // Save the user
    const savedUser = await newUser.save();

    const userResponse = {
      firstname: savedUser.firstname,
      lastname: savedUser.lastname,
      email: savedUser.email,
      dateOfBirth: savedUser.dateOfBirth,
      token: savedUser.token,
    };

   
    // Send an email configuration to the user
    /**
     * Creates a Nodemailer transporter object using SMTP configuration from environment variables.
     * 
     * @constant {Object} transporter - The Nodemailer transporter object.
     * @property {string} host - The SMTP server hostname, taken from the environment variable `SMTP_HOST`.
     * @property {number} port - The SMTP server port, taken from the environment variable `SMTP_PORT`.
     * @property {boolean} secure - Indicates if the connection should use SSL/TLS.
     * @property {Object} auth - The authentication object.
     * @property {string} auth.user - The username for authentication, taken from the environment variable `SMTP_USER`.
     * @property {string} auth.pass - The password for authentication, taken from the environment variable `SMTP_PASS`.
     */
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT),
      secure: true,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    // Send an email to the user
    /**
     * Email object to be sent to the client.
     * 
     * @typedef {Object} MailToClient
     * @property {string} from - The sender's email address, retrieved from environment variables.
     * @property {string} to - The recipient's email address, taken from the cleaned request body.
     * @property {string} subject - The subject of the email.
     * @property {string} text - The body of the email, including a personalized greeting.
     */
    const mailToClient = {
      from: process.env.EMAIL_FROM,
      to: cleanedBody.email, // Email du client
      subject: "Accusé de réception de votre demande",
      text: `Bonjour ${userResponse.firstname},\nNous avons le plaisir de vous compter parmis nous et vous souhaitons d'agréable moments chez KIDDIZ !! `,
    };

    await transporter.sendMail(mailToClient);
    
    // Respond with the user data
    res.json({ result: true, userResponse });
    console.log(userResponse);
  } catch (error) {
    // Handle any errors
    res.status(500).json({
      result: false,
      message: "An error has occurred.",
      error: error.message,
    });
  }
});



router.post('/signpGoogle', async (req, res) => {
  const { token } = req.body;

  try {
    const userData = await  jwtDecode(token);
    const { email, name } = userData;

    // check if the user exists
    let user = await User.findOne({ email });
    if (user && user.googleAuth) {
      return res.status(4200).json({ result: true,  user });
    }

    // Create a new user
    user = new User({
      email,
      name,
      googleAuth: true,
      token: uid2(32),
      // password not required
    });
    await user.save();

    res.json({ result: true,  user });
  } catch (error) {
    res.status(500).json({ message: "Erreur lors du Sign Up", error });
  }
});


router.post("/signin", async (req, res) => {
  try {

    
    // Check if the body is correct
    if (!checkBody(req.body, ["email", "password"])) {
      res.json({ result: false, error: "Missing or empty fields" });
      return;
    }

    // Check if the email is valid
    if (!emailRegex.test(req.body.email)) {
      res.json({ result: false, error: "Invalid email" });
      return;
    }
    // Find the user
    const userData = await User.findOne({ email: req.body.email });

    //check if user signup with google
    if (userData.googleAuth) {
      return res.status(400).json({ message: "Utilisateur déjà existant via une connexion Google, essayez de vous connecter." });
    }

    // Check if the user exists and the password is correct
    if (userData && bcrypt.compareSync(req.body.password, userData.password)) {
      res.json({ result: true, userData });
    } else {
      res.json({ result: false, error: "User not found or wrong password" });
    }
  } catch (error) {
    // Handle any errors
    res.status(500).json({
      result: false,
      message: "An error has occurred.",
      error: error.message,
    });
  }
});

router.put("/update/:token", async (req, res) => {
  try {
    
    // Clean all the fields
    const cleanedAddress = {
      number: req.body.number?.trim() || '',
      line1: req.body.line1?.trim() || '',
      line2: req.body.line2?.trim() || '',
      zipCode: req.body.zipCode?.trim() || '',
      city: req.body.city?.trim() || '',
      state: req.body.state?.trim() || '',
      country: req.body.country?.trim() || '',
    };

    // Check if the body is correct
    if (!checkBody(cleanedAddress, ['number', 'line1', 'zipCode', 'city'])) {
      return res.json({ result: false, error: 'Missing or empty address fields' });
    }

    // Find the user
    const userId = req.params.token;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ result: false, error: 'User not found' });
    }

    user.address = cleanedAddress;
    const updatedUser = await user.save();

    const userResponse = {
      firstname: updatedUser.firstname,
      lastname: updatedUser.lastname,
      email: updatedUser.email,
      address: updatedUser.address, 
    };

    res.json({ result: true, userResponse });

  } catch (error) {
    // Handle any errors
    res.status(500).json({
      result: false,
      message: "An error has occurred.",
      error: error.message,
    });
  }
});



module.exports = router;
