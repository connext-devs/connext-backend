const express = require('express');
const router = express.Router();

const controller = require('../../controllers/admins/admin.controller')
//getting admin
router.get('/getAdmin/:adminUID',controller.getAdmin)



module.exports = router