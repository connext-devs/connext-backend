const express = require('express');
const router = express.Router();

const controller = require('../../controllers/admins/verification_request.controller')

//when the employer registers they send a verification request
router.post('/submitVerification', controller.submitVerification);
//When admins reviews the verification requests
router.patch('/reviewVerification/:verificationUID', controller.reviewVerification)
//getting all the requests
router.get('/getVerification/:employerUID', controller.getVerification)
router.get('/getAllVerifications', controller.getAllVerifications)
router.get('/getAllVerificationsCount', controller.getAllVerificationsCount)


//getting the history of the admins 
router.get('/getEmployerVerifications/:employerUID', controller.getEmployerVerifications)

module.exports = router