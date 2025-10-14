const Conversation = require("../../models/chats/conversation.model")
const Message = require("../../models/chats/message.model");
const { userSockets } = require("../../sockets/chat.socket");

// Send a message
exports.sendMessage = async (req, res) => {
  try {
    const {
      conversationUID,
      senderUID,
      text
    } = req.body;

    const conversation = await Conversation.findOne({
      conversationUID
    });
    if (!conversation) {
      return res.status(404).json({
        error: "Conversation not found"
      });
    }

    // Block seeker from sending first if locked
    if (conversation.status === "locked" && senderUID === conversation.seekerUID) {
      return res.status(403).json({
        error: "Employer must send first message"
      });
    }

    // If employer sends first → unlock
    if (conversation.status === "locked" && senderUID === conversation.employerUID) {
      conversation.status = "open";
    }

    // Create message
    const message = await Message.create({
      conversationUID,
      senderUID,
      text,
    });

    // Update conversation metadata
    conversation.lastMessage = text;
    conversation.updatedAt = new Date();
    await conversation.save();

    const receiverUID = senderUID === conversation.seekerUID ?
      conversation.employerUID :
      conversation.seekerUID;

    const receiverSocketId = userSockets.get(receiverUID);
    if (receiverSocketId && req.io) {
      req.io.to(receiverSocketId).emit("newMessage", message);
      req.io.to(receiverSocketId).emit("conversationUpdated", {
        conversationUID: conversation.conversationUID,
        lastMessage: text,
        updatedAt: conversation.updatedAt,
      });
    }

    res.status(200).json(message);
  } catch (err) {
    res.status(500).json({
      error: err.message
    });
  }
};

// Get message history
exports.getMessages = async (req, res) => {
  try {
    const {
      conversationUID
    } = req.params;

    const messages = await Message.find({
      conversationUID
    }).sort({
      createdAt: 1
    });

    res.status(200).json(messages);
  } catch (err) {
    res.status(500).json({
      error: err.message
    });
  }
};