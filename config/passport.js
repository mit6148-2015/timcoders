var GoogleStrategy = require('passport-google-oauth').OAuth2Strategy;
// load up the user model
var User = require('../models/user');
// load the auth variables
var configAuth = require('./auth');

module.exports = function(passport) {

    // used to serialize the user for the session
    passport.serializeUser(function(user, done) {
        done(null, user.id);
    });

    // used to deserialize the user
    passport.deserializeUser(function(id, done) {
        User.findById(id, function(err, user) {
            done(err, user);
        });
    });

    // ======================================================
    // GOOGLE ===============================================
    // ======================================================
    passport.use(new GoogleStrategy({

        clientID        : configAuth.googleAuth.clientID,
        clientSecret    : configAuth.googleAuth.clientSecret,
        callbackURL     : configAuth.googleAuth.callbackURL,

    },
    function(token, refreshToken, profile, done) {

        // make the code asynchronous
        // User.findOne won't fire until we have all our data back from Google
        process.nextTick(function() {

            // try to find the user based on their google id
            User.findOne({ 'id' : profile.id }, function(err, user) {
                if (err)
                    console.log(err);  // handle errors!
                    return done(err);

                if (!err && user !== null) {

                    // if a user is found, log them in
                    return done(null, user);
                } else {
                    // if the user isnt in our database, create a new user
                    var newUser = new User();

                    // set all of the relevant information
                    newUser.id    = profile.id;
                    newUser.token = token;
                    newUser.displayName = profile.displayName;
                    newUser.name.firstname  = profile.name.givenName;
                    newUser.name.lastname = profile.name.familyName;
                    newUser.email = profile.emails[0].value; // pull the first email
                    newUser.pic = profile.photos[0].value;
                    
                    // save the user to database
                    // save is mongoose command
                    newUser.save(function(err) {
                        if (err) {
                            console.log(err);  // handle errors!
                            throw err;
                        } else {   
                            return done(null, newUser);
                        }
                    });
                }
            });
        });

    }));

};