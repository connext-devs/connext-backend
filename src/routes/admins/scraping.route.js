const express = require('express');
const router = express.Router()

//controller
const controller = require('../../controllers/admins/scraping.controller')

//scrape jobs
router.get('/scrapeJobs', controller.scrapeJobs)

//getting scrape batch
router.get('/getScrapeBatches', controller.getScrapeBatches)
//getting specific batch
router.get('/getScrapeBatch', controller.getScrapeBatch)

//FOR JOBS
//getting scraped jobs
router.get('/getScrapeJobs', controller.getScrapeJobs)

//getting all scraped jobs
router.get('/getAllScrapedJobs', controller.getAllScrapedJobs)

//creating scrape batch
router.post('/createScrapeBatch', controller.createScrapeBatch)

//post jobs
router.post('/postJobsExternal', controller.postJobsExternal)

//deleting a scrape job
router.delete('/deleteScrapeJob', controller.deleteScrapeJob);


module.exports = router