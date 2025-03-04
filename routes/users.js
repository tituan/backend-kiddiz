var express = require("express");
var router = express.Router();
require("../models/connection");
const User = require("../models/users.js");
const { checkBody } = require("../modules/checkBody");
const jwt = require("jsonwebtoken");
const moment = require("moment");
const bcrypt = require("bcrypt");
const nodemailer = require("nodemailer");

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

    // Ggenerate a token
    const token = jwt.sign(
      { email: cleanedBody.email },
      process.env.JWT_SECRET,
      {
        expiresIn: "1y",
      }
    );

    // format the date of birth
    const dateOfBirth = moment(
      req.body.dateOfBirth,
      ["YYYY-MM-DD", "DD/MM/YYYY", "MMMM D, YYYY"],
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
      token: token,
    });

    // Save the user
    const savedUser = await newUser.save();

    const userResponse = {
      firstname: savedUser.firstname,
      lastname: savedUser.lastname,
      email: savedUser.email,
      dateOfBirth: savedUser.dateOfBirth,
    };
    // Send an email configuration to the user
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
    const mailToClient = {
      from: process.env.EMAIL_FROM,
      to: cleanedBody.email, // Email du client
      subject: "Accusé de réception de votre demande",
      text: `Bonjour ${userResponse.firstname},\nNous avons le plaisir de vous compter parmis nous et vous souhaitons d'agréable moments chez KIDDIZ !! `,
    };

    await transporter.sendMail(mailToClient);

    // Respond with the user data
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
    // Check if the user exists and the password is correct
    if (userData && bcrypt.compareSync(req.body.password, userData.password)) {
      res.json({ result: true, token: userData.token });
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
