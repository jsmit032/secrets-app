//jshint esversion:6
require('dotenv').config()

const express = require('express');
const bodyParser = require('body-parser');
const ejs = require('ejs');
const mongoose = require('mongoose');
const session = require('express-session');
const passport = require('passport');
const passportLocalMongoose = require('passport-local-mongoose');
const findOrCreate = require('mongoose-findorcreate');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const FacebookStrategy = require('passport-facebook').Strategy;

const app = express();

app.use(express.static('public'));
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({extended: true}));

app.use(session({
  secret: process.env.SECRET,
  resave: false,
  saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

const login = "mongodb+srv://admin-jennifer:";
const end = "@cluster0-h5qrt.mongodb.net/";
const database = "userDB";
const pw = process.env.MONGODB;

mongoose.connect(login + pw + end + database, {useNewUrlParser: true, useUnifiedTopology: true});
mongoose.set('useCreateIndex', true);

const userSchema = new mongoose.Schema ({
    email: String,
    password: String,
    googleId: String,
    facebookId: String,
    secret: String
});

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

const User = new mongoose.model('User', userSchema);

passport.use(User.createStrategy());

passport.serializeUser(function(user, done) {
  done(null, user.id);
});

passport.deserializeUser(function(id, done) {
  User.findById(id, function(err, user) {
    done(err, user);
  });
});

passport.use(new GoogleStrategy({
    clientID: process.env.CLIENTID,
    clientSecret: process.env.CLIENTSECRET,
    callbackURL: "https://gentle-taiga-85346.herokuapp.com/auth/google/secrets",
    userProfileURL: 'https://www.googleapis.com/oauth2/v3/userinfo'
  },
  function(accessToken, refreshToken, profile, cb) {
    User.findOrCreate({ googleId: profile.id}, function (err, user) {
      User.dropIndex("username_1");
      return cb(err, user);
    });
  }
));

passport.use(new FacebookStrategy({
    clientID: process.env.FBAPPID,
    clientSecret: process.env.FBSECRET,
    callbackURL: "https://gentle-taiga-85346.herokuapp.com/auth/facebook/secrets"
  },
  function(accessToken, refreshToken, profile, cb) {
    User.findOrCreate({ facebookId: profile.id}, function (err, user) {
      User.dropIndex("username_1");
      return cb(err, user);
    });
  }
));

// Routes
app.get('/', function(req, res){
  res.render('home');
});

app.get('/auth/google', passport.authenticate('google', {
    scope: ['profile']
}));

app.get('/auth/google/secrets',
  passport.authenticate('google', { failureRedirect: '/login' }),
  function(req, res) {
    // Successful authentication, to secrests.
    res.redirect('/secrets');
  });

app.get('/auth/facebook', passport.authenticate('facebook'));

app.get('/auth/facebook/secrets',
  passport.authenticate('facebook', { failureRedirect: '/login' }),
  function(req, res) {
    res.redirect('/secrets');
  });

app.get('/register', function(req, res){
  res.render('register');
});

app.get("/secrets", function(req, res){
  User.find({'secret': { $ne: null }}, function(err, foundUsers){
    if (err) {
      console.log(err);
    } else {
      if (foundUsers) {
        res.render('secrets', {usersWithSecrets: foundUsers});
      }
    }
  });
});

app.get("/logout", function(req, res){
  req.logout();
  res.redirect("/");
});

app.post("/register", function(req, res){

  User.register({username: req.body.username}, req.body.password, function(err, user){
    if (err) {
      console.log(err);
      res.redirect("/register");
    } else {
      passport.authenticate("local")(req, res, function(){
        res.redirect("/secrets");
      });
    }
  });

});

app.get('/login', function(req, res){
  res.render('login');
});

app.post("/login", function(req, res){

  const user = new User({
    username: req.body.username,
    password: req.body.password
  });

  req.login(user, function(err){
    if (err) {
      res.redirect('/login');
    } else {
      passport.authenticate("local")(req, res, function(){
        res.redirect("/secrets");
      });
    }
  });

});

app.get('/submit', function(req, res){
  if (req.isAuthenticated()){
    res.render('submit');
  } else {
    res.redirect('/login');
  }
});

app.post('/submit', function(req, res){
  const submittedSecret = req.body.secret;
  const userId = req.user.id;

  User.findById(userId, function(err, foundUser){
    if (err) {
      console.log(err);
    } else {
      if (foundUser) {
        foundUser.secret = submittedSecret;
        foundUser.save(function(){
          res.redirect('/secrets');
        });
      }
    }
  });
});

let port = process.env.PORT;
if (port == null | port == "") {
  port = 3000;
}

app.listen(port, function(){
  console.log("Server started on port 3000");
});
