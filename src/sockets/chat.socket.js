const userSockets = new Map(); // { userUID -> Set(socketId) }
const Conversation = require("../models/chats/conversation.model");
const Message = require("../models/chats/message.model");
const { employersModel } = require("../models/employers/employers.model");

// for creating notification
const { createNotificationFunction } = require("../controllers/notifications.controller");

// --- Socket Utilities --- //
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

function getAllConnectedUsers() {
  const users = [];
  for (const [userId, socketIds] of userSockets.entries()) {
    users.push({
      userId,
      sockets: [...socketIds],
    });
  }
  return users;
}

let ioInstance = null;

function getIO() {
  if (!ioInstance) {
    throw new Error("Socket.io not initialized yet!");
  }
  return ioInstance;
}

// --- Main Socket Logic --- //
function chatSocket(io) {
  ioInstance = io;
  io.on("connection", (socket) => {
    console.log("🔌 New socket connected:", socket.id);

    // register user
    socket.on("registerUser", (userId) => {
      console.log(`User registered: ${userId} with socket: ${socket.id}`);
      addUserSocket(userId, socket.id);
      socket.join(userId);
      console.log(getAllConnectedUsers(), " connected users");

      // Emit presence update for user online
      io.emit("userPresenceUpdate", {
        userId,
        online: true,
      });

      io.emit("notification", {
        message: "This is a global test notification",
      });
    });

    // join conversation
    socket.on("joinConversation", (conversationUID) => {
      socket.join(conversationUID);
      console.log(`🟢 Socket ${socket.id} joined conversation ${conversationUID}`);
    });

    // leave conversation
    socket.on("leaveConversation", (conversationUID) => {
      socket.leave(conversationUID);
      console.log(`🔴 Socket ${socket.id} left conversation ${conversationUID}`);
    });

    // send message
    socket.on("sendMessage", async ({ conversationUID, senderUID, text }) => {
      try {
        const conversation = await Conversation.findOne({ conversationUID });
        if (!conversation) return;

        // Block seeker if locked
        if (conversation.status === "locked" && senderUID === conversation.seekerUID) return;

        const employer = await employersModel.findOne({ employerUID: conversation.employerUID });

        // Unlock if employer sends first
        if (conversation.status === "locked" && senderUID === conversation.employerUID) {
          const { updateApplicationFunction } = require("../controllers/jobseekers/applications.controller");

          // update application's status to contacted by employer
          await updateApplicationFunction(conversation.applicationID, "contacted");

          // notify jobseeker employer sent a message
          const notifPayload = {
            receiverUID: conversation.seekerUID,
            senderUID: conversation.employerUID,
            title: `${employer.companyName} sent you a message`,
            message: text,
            type: "message",
            data: { conversationUID },
            receiverRole: "jobseeker",
          };

          const notif = await createNotificationFunction({ ...notifPayload, io });
          console.log(notif, "notiffffff");

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

        // also emit to other user if connected elsewhere
        const otherUID =
          senderUID === conversation.employerUID ? conversation.seekerUID : conversation.employerUID;

        emitToUser(io, otherUID, "newMessage", message);
      } catch (err) {
        console.error("❌ sendMessage error:", err.message);
      }
    });

    // disconnect
    socket.on("disconnect", () => {
      console.log("❌ Disconnected:", socket.id);
      let disconnectedUserId = null;
      for (const [uid, socketIds] of userSockets.entries()) {
        if (socketIds.has(socket.id)) {
          removeUserSocket(uid, socket.id);
          disconnectedUserId = uid;
          break;
        }
      }
      // If user has no more connected sockets, emit offline presence update
      if (disconnectedUserId !== null && !userSockets.has(disconnectedUserId)) {
        io.emit("userPresenceUpdate", {
          userId: disconnectedUserId,
          online: false,
        });
        console.log(`User offline: ${disconnectedUserId}`);
      }
    });
  });
}

module.exports = {
  chatSocket,
  emitToUser,
  getIO,
  userSockets,
};
