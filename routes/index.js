var express = require('express');
var router = express.Router();

// load up the user model
var User = require('../models/user.js');

// =====================================
// ROOT PAGE (with google login) ========
// =====================================
var index = function(app, passport) {
  router.get('/', function(req, res) {
      // Rendering the index view with the title 'Welcome'
      res.render('index', { title: 'Welcome'});
  });

  // =====================================
  // DASHBOARD ===========================
  // route for showing the dashboard page
  // =====================================
  // we will want this protected so you have to be logged in to visit
  // we will use route middleware to verify this (the ensureAuthenticated function)
  router.get('/home', ensureAuthenticated, function(req, res) {
    User.findById(req.session.passport.user, function(err, user) {
      if(err) {
        console.log(err);  // handle errors
      } else {
        res.render('home', { user: user});
      }
    });
  });

  // =====================================
  // LOGOUT ==============================
  // route for logging out
  // =====================================
  router.get('/logout', function(req, res) {
      req.logout();
      res.redirect('/');
  });

  // =====================================
  // GOOGLE ROUTES =======================
  // =====================================
  // send to google to do the authentication
  // profile gets us their basic information including their name
  // email gets their emails
  //router.get('/auth/google', passport.authenticate('google', { scope : ['profile', 'email'] }));
  app.get('/auth/google', passport.authenticate('google', { scope : ['profile', 'email'] }));
  
  // the callback after google has authenticated the user
  /**
  router.get('/auth/google/callback',
          passport.authenticate('google', {
                  successRedirect : '/events',
                  failureRedirect : '/test',
                  failureFlash:true
                })
          );
  **/
  app.get('/auth/google/callback',
          passport.authenticate('google', {
                  successRedirect : '/home',
                  failureRedirect : '/'
                })
          );

  return router;
};

// route middleware to make sure a user is logged in
function ensureAuthenticated(req, res, next) {
    // if user is authenticated in the session, carry on 
    if (req.isAuthenticated())
        return next();

    // if they aren't redirect them to the home page
    res.redirect('/');
}


module.exports = index;