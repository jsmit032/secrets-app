//jshint esversion:6
require('dotenv').config()

const express = require('express');
const bodyParser = require('body-parser');
const ejs = require('ejs');
const mongoose = require('mongoose');
const encrypt = require('mongoose-encryption');

const app = express();

app.use(express.static('public'));
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({extended: true}));

mongoose.connect('mongodb://localhost:27017/userDB', {useNewUrlParser: true, useUnifiedTopology: true});

const userSchema = new mongoose.Schema ({
    email: String,
    password: String
});

userSchema.plugin(encrypt, {secret: process.env.SECRET, encryptedFields: ['password'] });

const User = new mongoose.model('User', userSchema);

// Routes
app.get('/', function(req, res){
  res.render('home');
});

app.get('/register', function(req, res){
  res.render('register');
});

app.post('/register', function(req, res){
  const userName = req.body.username;
  const password = req.body.password;

  var newUser = new User({
    email: userName,
    password: password
  });

  User.findOne({email: userName}, function(err, foundUser){
    if (!err) {
      if (!foundUser) {
        newUser.save(function(err){
          if (!err)
            {
              res.render('secrets');
            } else {
              console.log(err);
            }
        });
      } else {
        res.redirect('/register');
        console.log("There's already a user with this e-mail. Please provide a different e-mail address!");
      }
    }
  });
});

app.get('/login', function(req, res){
  res.render('login');
});

app.post('/login', function(req, res){
  const userName = req.body.username;
  const password = req.body.password;

  User.findOne({email: userName}, function(err, foundUser){
    if (!err) {
      if (!foundUser) {
        console.log("This user doesn't exisit, please register to login");
      } else {
        if (password === foundUser.password) {
          res.render('secrets');
        } else {
          console.log("Either username or password is incorrect, please try again.");
        }
      }
    } else {
      console.log(err);
    }
  });
});


app.listen(3000, function(){
  console.log("Server started on port 3000");
});
