const express = require('express')
const router = express.Router()
const {authMiddleware, isAdmin} = require('../middlewares/authMiddleware')

//routes imports
const OTPRoute = require('./employers/OTP.route')
    //jobseekers
const jobseekersRoute = require('./jobseekers/jobseekers.route')

const applicationsRoute = require('./jobseekers/applications.route')

    //employers
const employersRoute = require('./employers/employers.route')
const imagekitRoute = require('./employers/imagekit.route')
    //job listings
const joblistingsRoute = require('./employers/joblistings.route')
const job_interactionRoute = require('./jobseekers/job_interaction.route')
    //chats
const conversationRoute = require('./chats/conversation.route')
const messageRoute = require('./chats/message.route')

    //admins
const verificationRoute = require('./admins/verification_request.route')
const adminRoute = require('./admins/admin.route')

    //oauth
const oauthRoute = require('./oauth/oauth.routes')

    //schedules
const schedulesRoute = require('./schedules/schedules.routes')

    //notifications
const notificationsRoute = require('./notifications/notifications.routes')

    //scraping
const scrapingRoute = require('./admins/scraping.route')



//OTP Routes
router.use('/api/otp', OTPRoute)
//Jobseeekers Routes
router.use('/api/jobseekers',jobseekersRoute)
//Employers Routes
router.use('/api/employers',employersRoute)
//imageKit Routes
router.use('/api/employers/imagekit', imagekitRoute)
//Joblistings Routes
router.use('/api/joblistings',joblistingsRoute)
//Applications Routes
router.use('/api/applications', applicationsRoute)
//Job interaction Routes
router.use('/api/jobinteraction', job_interactionRoute)
//Conversation Routes
router.use('/api/conversation', conversationRoute)
//Message Routes
router.use('/api/message', messageRoute)

//Admin controls
router.use('/api/admins', verificationRoute)
router.use('/api/admins', adminRoute)

//oauth
router.use('/oauth', oauthRoute)

//Schedules Routes
router.use('/api/schedules',schedulesRoute)

//Notifications Routes
router.use('/api/notifications',notificationsRoute)

//Scraping Routes
router.use('/api/scraping', scrapingRoute)



module.exports = {router}