var express = require('express');
var router = express.Router();
require('../models/connection');
const User = require('../models/users.js');
const { checkBody } = require('../modules/checkBody');
const jwt = require('jsonwebtoken');
const { expressjwt: expressJwt } = require('express-jwt');
const bcrypt = require('bcrypt');
router.post('/signup', async (req, res) => {
  try{
    if (!checkBody(req.body, ['username', 'password'])) {
      res.json({ result: false, error: 'Missing or empty fields' });
      return;
    }
  
    // Check if the user has not already been registered
    const existingUser = await User.findOne({ username: req.body.username })
    if (existingUser === null && req.body.password === req.body.confirmPassword) {
        const hash = bcrypt.hashSync(req.body.password, 10);
      const {firstname,lastname, email, dateOfBirth } = req.body,
        const newUser = new User({
          firstname,
          lastname,
          email,
          dateOfBirth, 
          password: hash,
          tokenUser: ,
        });
  
        const savedUser = await newUser.save();
        
          res.json({ result: true, newUser });
        
      } else {
        // User already exists in database
        res.json({ result: false, error: 'User already exists' });
      };}
    catch (error) {
    // Gérer les erreurs éventuelles
    res.status(500).json({ result: false, message: 'An error has occurred.', error });
}
});

router.post ('/signin', async (req, res) => {
  try{
    if (!checkBody(req.body, ['username', 'password'])) {
      res.json({ result: false, error: 'Missing or empty fields' });
      return;
    }
    
    const userData = await User.findOne({ username: req.body.username } && { admin : true})
      if (userData && bcrypt.compareSync(req.body.password, data.password)) {
        res.json({ result: true, token: data.token });
      } else {
        res.json({ result: false, error: 'User not found or wrong password' });
      }
    ;

  }catch (error) {
    // Handle any errors
    res.status(500).json({ result: false, message: 'An error has occurred.', error: error.message });
}
});

module.exports = router;
