const express = require('express');
const router = express.Router();

//controller import
const controller = require('../../controllers/jobseekers.controller')

//register Job seeker
router.post('/registerJobSeeker', controller.registerJobSeeker)
//get Job seeker
router.get('/getJobseeker', controller.getJobseeker)
    //count
router.get('/getJobseekerCount', controller.getJobseekerCount)

//update Profile
router.patch('/updateProfile/:id', controller.updateProfile)

module.exports = router