// models/Conversation.js
const mongoose = require("mongoose");
const { v4: uuidv4 } = require("uuid");

const ConversationSchema = new mongoose.Schema({
  conversationUID: {
    type: String,
    default: uuidv4, // generate unique id automatically
    unique: true,
  },
  employerUID: {
    type: String,
    required: true,
  },
  seekerUID: {
    type: String,
    required: true,
  },
  status: {
    type: String,
    enum: ["locked", "open"],
    default: "locked",
  },
  lastMessage: {
    type: String,
    default: null,
  },
    applicationID: {
    type: String, // the job application currently being discussed
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Ensure unique conversation per employer <-> seeker
ConversationSchema.index({ employerUID: 1, seekerUID: 1 }, { unique: true });

module.exports = mongoose.model("Conversation", ConversationSchema);
