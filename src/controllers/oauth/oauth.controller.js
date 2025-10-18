//for passport
require('../../config/oauth')
const passport = require('passport')

//tester
exports.googleTest = (req, res) => {
    res.send("<a href='http://localhost:3000/oauth/google'>Login with google</a>")
}


exports.googlePopup = ('/auth/google', passport.authenticate('google', {
    scope: ['email', 'https://www.googleapis.com/auth/calendar', 'https://www.googleapis.com/auth/calendar.events'],
    accessType: 'offline',
    prompt: 'consent'
}))

// OAuth callback route
exports.googleCallback = ('/google/callback',
    passport.authenticate('google', {
        successRedirect: '/dashboard',
        failureRedirect: '/auth/failure'
    }),
    async (req, res) => {
        res.send('Login successful! You can now access the Calendar API.');
    });