const express = require('express');
const router = express.Router();

const controller = require('../../controllers/admins/analytics.controller')
//getting admin
router.get('/getAnalytics',controller.getAnalytics)



module.exports = router