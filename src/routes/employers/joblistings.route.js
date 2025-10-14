const express = require('express');
const router = express.Router()

//controller
const controller = require('../../controllers/joblistings.controller')

//post jobs
router.post('/postJobs', controller.postJobs)

//getting single job for employer
router.get('/getJob', controller.getJob)

//getting all of the jobs 
router.get('/getJobs', controller.getJobs)

// Update a job (using _id from params)
router.patch('/updateJobs/:jobUID', controller.updateJobs);

module.exports = router