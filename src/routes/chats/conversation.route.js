const express= require('express');
const router = express.Router();

const controller = require('../../controllers/chats/conversation.controller')

//creating conversations
router.post('/createConversation', controller.createConversation)
//getting conversation for a user
router.get('/getUserConversations/:userUID', controller.getUserConversations)
//getting a specific conversation
router.get('/getConversation/:conversationUID',controller.getConversation)

module.exports =router