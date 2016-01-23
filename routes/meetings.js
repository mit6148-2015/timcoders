var express = require('express');
var router = express.Router();
var needle = require('needle');
var google = require('googleapis');
var refresh = require('passport-oauth2-refresh');
var User = require('../models/user');
var configAuth = require('../config/auth');
var moment = require('moment');

// Handler for POST requests to /events
router.post('/', function(req, res, next) {
	res.send('Received POST request for /events');
  // save the card to db req.data get data from ajax
});

router.get('/', ensureAuthenticated, function(req, res, next) {
  res.render('meetings', {'title':'Create new meeting'});
});

router.get('/all', function(req, res) {
  getGCalendarEventsPerUser(req, res);
}); //router.get('/all'... ends here

function getGCalendarEventsPerUser(req, res) {
  var retries = 2;
  console.log('starting out getGCalendarEventsPerUser');
  var send401Response = function() {
    return res.status(401).end();
  };

  // Get the user's credentials.
  console.log('finding users credentials');
  User.findById(req.user, function(err, user) {
    if(err || !user) { 
      return send401Response();   // problems with finding user in db; errors!
    }

    var makeRequest = function() {
      retries--;
      if(!retries) {
        // Couldn't refresh the access token.
        return send401Response();
      }
    
    var now = moment().toISOString();
    console.log('Now ' + now);
    var yearFromNow = moment().add(1,'y').toISOString();
    console.log('YearFromNow ' + yearFromNow);

    var url = 'https://www.googleapis.com/calendar/v3/calendars/'+user.email+'/events'+
              '?orderBy=startTime&singleEvents=true&timeMax='+yearFromNow+'&timeMin='+now;
    console.log(url);
    needle.get(url, 
              { headers: { Authorization: 'Bearer '+ user.google.accessToken } },  
      function(error, response) {
        if (!error && response.statusCode == 200) {
          var body = '';

          response.on('data', function(chunk) {
            body += chunk;
          });

          res.on('end',function(){
            console.log('calling filterCalData');
            var data = JSON.parse(body);
            var jsonUserMap = filterCalData(user,data);
            console.log(jsonUserMap);
          });
          res.send(jsonUserMap);
        } else if (response.statusCode === 401) {
        // Access token expired.
        // Try to fetch a new one.
          refresh.requestNewAccessToken('google', user.refreshToken, function(err, accessToken) {
            if (err || !accessToken) {
              return send401Response(); 
              console.log('error!');
            }

            // Save the new accessToken for future use
            user.save( { google: { accessToken: accessToken} }, function(err) {
              if (err) {
                console.log('problems with saving new accessToken to db!');
                console.log(err);  // problems with saving into db; errors!
                throw err;
              } else {   
                // Retry the request.
                console.log('calling makeRequest again');
                makeRequest();
              }
            });
          });
        } else {
          // There was another error, handle it appropriately.
          console.log('some other error happened');
          console.log(response.body);
          res.sendStatus(response.statusCode);
        }   
      }); //end needle get
    };
    makeRequest();
  }); //User.findById ends here
}

function filterCalData(user,data) {
  console.log('Heres the json data');
  console.log(data);
  console.log('....<3.......');
  var filteredJsonArr = [];
  for( var item in data.items) {
    console.log(item.id);
    console.log(item.summary);
    console.log(item.start);
    if( item.start.dateTime === null ) {
      // && typeof item.start.dateTime !== "object") &&
      // (typeof(item.end.date) != 'undefined' || item.end.date !== null)) {
      continue;
    } else {

      filteredJsonArr.push(
        {
          id: item.id,
          ownerId: user._id, // Same as userId if this event was created by this user.
          name: item.summary,
          startTime: item.start.dateTime, 
          endTime: item.end.dateTime,
          isInternal: false, // False means it came from Google calendar or another external source
          externalId: item.id // Would be empty if this event was generated by us.
        } 
      );
      
    }
    
  }
  console.log('Heres the json array');
  console.log(filteredJsonArr);
  var userMap = {userId: user.google.id , events: filteredJsonArr};
  return userMap;

}
  
// route middleware to make sure a user is logged in
function ensureAuthenticated(req, res, next) {
    // if user is authenticated in the session, carry on 
    if (req.isAuthenticated())
        return next();

    // if they aren't redirect them to the home page
    res.redirect('/');
}


module.exports = router;
