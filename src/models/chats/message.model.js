// models/Message.js
const mongoose = require("mongoose");
const { v4: uuidv4 } = require("uuid");


const MessageSchema = new mongoose.Schema({
  messageUID: {
    type: String,
    default: uuidv4, // generate unique string id
    unique: true,
  },
  conversationUID: {
    type: String, // link back to conversation
    required: true,
  },
  senderUID: {
    type: String, // employerUID or seekerUID
    required: true,
  },
  text: {
    type: String,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Index to fetch messages fast by conversation
MessageSchema.index({ conversationUID: 1, createdAt: 1 });

module.exports = mongoose.model("Message", MessageSchema);
