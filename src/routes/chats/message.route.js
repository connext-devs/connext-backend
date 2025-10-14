const express = require('express');
const router = express.Router();

const controller = require('../../controllers/chats/message.controller')

//creating conversations
router.post('/sendMessage', controller.sendMessage)
//getting conversation for a user
router.get('/getMessages/:conversationUID', controller.getMessages);

module.exports = router