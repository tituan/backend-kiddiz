var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' });
});


const crypto = require('crypto');

const secret = crypto.randomBytes(32).toString('hex');
console.log(secret);
module.exports = router;
