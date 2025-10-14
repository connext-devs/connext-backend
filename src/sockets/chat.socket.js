// socket.js
const userSockets = new Map(); // { userUID -> Set(socketId) }
const Conversation = require("../models/chats/conversation.model");
const Message = require("../models/chats/message.model");

function addUserSocket(userId, socketId) {
  if (!userSockets.has(userId)) userSockets.set(userId, new Set());
  userSockets.get(userId).add(socketId);
}

function removeUserSocket(userId, socketId) {
  if (!userSockets.has(userId)) return;
  userSockets.get(userId).delete(socketId);
  if (userSockets.get(userId).size === 0) userSockets.delete(userId);
}

function emitToUser(io, userId, event, payload) {
  const sockets = userSockets.get(userId);
  if (!sockets) return;
  for (const sid of sockets) io.to(sid).emit(event, payload);
}

module.exports = (io) => {
  io.on("connection", (socket) => {
    console.log("🔌 New socket connected:", socket.id);

    // register user
    socket.on("registerUser", (userId) => {
      addUserSocket(userId, socket.id);
      console.log(`✅ Registered user ${userId} -> ${socket.id}`);
    });

    // join a conversation room
    socket.on("joinConversation", (conversationUID) => {
      socket.join(conversationUID);
      console.log(`🟢 Socket ${socket.id} joined conversation ${conversationUID}`);
    });

    // leave a conversation room
    socket.on("leaveConversation", (conversationUID) => {
      socket.leave(conversationUID);
      console.log(`🔴 Socket ${socket.id} left conversation ${conversationUID}`);
    });

    // handle sending messages
    socket.on("sendMessage", async ({ conversationUID, senderUID, text }) => {
      try {
        const conversation = await Conversation.findOne({ conversationUID });
        if (!conversation) return;

        // Block seeker if locked
        if (conversation.status === "locked" && senderUID === conversation.seekerUID) return;

        // Unlock if employer sends first
        if (conversation.status === "locked" && senderUID === conversation.employerUID) {
          conversation.status = "open";
        }

        // create message
        const message = await Message.create({ conversationUID, senderUID, text });

        // update conversation metadata
        conversation.lastMessage = text;
        conversation.updatedAt = new Date();
        await conversation.save();

        // emit to all in room
        io.to(conversationUID).emit("newMessage", message);

        // also emit to the other user if they’re connected somewhere else
        const otherUID =
          senderUID === conversation.employerUID
            ? conversation.seekerUID
            : conversation.employerUID;
        emitToUser(io, otherUID, "newMessage", message);
      } catch (err) {
        console.error("❌ sendMessage error:", err.message);
      }
    });

    // disconnect
    socket.on("disconnect", () => {
      console.log("❌ Disconnected:", socket.id);
      for (const [uid, socketIds] of userSockets.entries()) {
        if (socketIds.has(socket.id)) {
          removeUserSocket(uid, socket.id);
          break;
        }
      }
    });
  });
};

module.exports.userSockets = userSockets;
module.exports.emitToUser = emitToUser;
