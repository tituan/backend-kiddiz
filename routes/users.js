var express = require('express');
var router = express.Router();
require('../models/connection');
const User = require('../models/users.js');
const { checkBody } = require('../modules/checkBody');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');


// Regex pour valider un format d'email
const emailRegex = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;


router.post('/signup', async (req, res) => {

  try {

    // Check if any require fields are empty
    if (!checkBody(req.body, ['firstname', 'password', 'lastname', 'email', 'dateOfBirth', 'confirmPassword'])) {
      res.json({ result: false, error: 'Missing or empty fields' });
      return;
    }

    //Check the email format
    if (!emailRegex.test(req.body.email)) {
      return res.json({ result: false, error: 'Invalid email format' });
    }
    // Check if the user has not already been registered
    const existingUser = await User.findOne({ email: req.body.email })
    if (existingUser === null && req.body.password === req.body.confirmPassword) {
      const hash = bcrypt.hashSync(req.body.password, 10);

      // Clean code
      const { firstname, lastname, email, dateOfBirth } = req.body;

      //Create tokenUser with JWT
      const token = jwt.sign(
        { email: email },
        JWT_SECRET,
        { expiresIn: '1year' }
      );

      // Creat newUszer using user schema
      const newUser = new User({
        firstname,
        lastname,
        email,
        dateOfBirth,
        password: hash,
        token: token,
      });

      const savedUser = await newUser.save();

      res.json({ result: true, savedUser });

    } else {
      // User already exists in database
      res.json({ result: false, error: 'User already exists' });
    };
  }
  catch (error) {
    // Gérer les erreurs éventuelles
    res.status(500).json({ result: false, message: 'An error has occurred.', error });
  }
});


router.post('/signin', async (req, res) => {
  try {
    if (!checkBody(req.body, ['email', 'password'])) {
      res.json({ result: false, error: 'Missing or empty fields' });
      return;
    }

    const userData = await User.findOne({ email: req.body.username } && { admin: true })
    if (userData && bcrypt.compareSync(req.body.password, data.password)) {
      res.json({ result: true, token: data.token });
    } else {
      res.json({ result: false, error: 'User not found or wrong password' });
    }
    ;

  } catch (error) {
    // Handle any errors
    res.status(500).json({ result: false, message: 'An error has occurred.', error: error.message });
  }
});

module.exports = router;
