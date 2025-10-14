const express = require('express')
const route = express.Router();

const controller = require('../../controllers/jobseekers/job_interaction.controller')

//get requests
route.get('/getJobInteraction', controller.getJobInteractions)

//post requests
route.post('/createJobInteraction', controller.createJobInteraction)


module.exports = route