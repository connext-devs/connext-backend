const express = require('express')
const router = express.Router();

//controller
const controller = require('../../controllers/oauth/oauth.controller');


//temporary
router.get('/test', controller.googleTest)

router.get('/google', controller.googlePopup)
router.get('/google/callback', controller.googleCallback)

module.exports = router