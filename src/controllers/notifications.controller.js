const {
    notificationModel
} = require("../models/notifications/notifications.models");




// A reusable create notification function
async function createNotificationFunction({
    receiverUID,
    senderUID,
    title,
    message,
    type = "system",
    data = {},
    receiverRole,
    io,
}) {
    const {
        emitToUser
    } = require("../sockets/chat.socket");

    if (!receiverUID || !title || !message || !receiverRole) {
        throw new Error(
            "Missing required fields: receiverUID, title, message, receiverRole"
        );
    }

    const notification = await notificationModel.create({
        receiverUID,
        senderUID,
        title,
        message,
        type,
        data,
        receiverRole,
    });

    // Emit the notification over socket.io if io instance provided
    if (io) {
        console.log(notification, 'testttt');
        emitToUser(io, receiverUID, "newNotification", notification)
    }
    return notification;
}
exports.createNotificationFunction = createNotificationFunction;

// Route handler using the reusable function
exports.createNotifications = async (req, res) => {
    try {
        const {
            receiverUID,
            senderUID,
            title,
            message,
            type = "system",
            data = {},
            receiverRole,
        } = req.body;

        if (!receiverUID || !title || !message || !receiverRole) {
            return res.status(400).json({
                success: false,
                message: "Missing required fields: receiverUID, title, message, receiverRole",
            });
        }

        // Pass req.io to emit notification if socket io instance available
        const notification = await createNotificationFunction({
            receiverUID,
            senderUID,
            title,
            message,
            type,
            data,
            receiverRole,
            io: req.io,
        });

        res.status(201).json({
            success: true,
            notification,
        });
    } catch (err) {
        console.error("❌ Error creating notification:", err.message);
        res.status(500).json({
            success: false,
            error: err.message,
        });
    }
};


//getting notifs
const {
    employersModel
} = require('../models/employers/employers.model')
exports.getNotifications = async (req, res) => {
    try {
        const {
            receiverUID
        } = req.params;
        const {
            role,
            limit
        } = req.query; 

        if (!receiverUID) {
            return res.status(400).json({
                success: false,
                message: "Missing required parameter: receiverUID",
            });
        }

        let notifLimit = Number(limit) 

        console.log(notifLimit,'limittt', limit);

        // find latest notifications
        const notifications = await notificationModel
            .find({
                receiverUID
            })
            .sort({
                createdAt: -1
            })
            .limit(notifLimit ?? undefined);

        let enrichedNotifications = notifications;

        if (role === "jobseeker") {
            const senderUIDs = notifications
                .map((n) => n.senderUID)
                .filter(Boolean);

            const employers = await employersModel.find({
                employerUID: {
                    $in: senderUIDs
                }
            }, {
                employerUID: 1,
                companyName: 1,
                email: 1,
                profilePic: 1,
                "location.display_name": 1,
                _id: 0,
            });

            const employerMap = new Map(
                employers.map((emp) => [emp.employerUID, emp])
            );

            enrichedNotifications = notifications.map((notif) => ({
                ...notif.toObject(),
                senderDetails: employerMap.get(notif.senderUID) || null,
            }));
        }

        res.status(200).json({
            success: true,
            count: enrichedNotifications.length,
            notifications: enrichedNotifications,
        });
    } catch (err) {
        console.error("❌ Error fetching notifications:", err.message);
        res.status(500).json({
            success: false,
            error: err.message,
        });
    }
};


//update notifs

exports.updateNotification = async (req, res) => {
    try {
        const {
            notificationUID
        } = req.params; // changed from id
        const updateData = req.body; // partial fields to update

        if (!notificationUID) {
            return res.status(400).json({
                success: false,
                message: "Missing notificationUID in params",
            });
        }

        if (!updateData || Object.keys(updateData).length === 0) {
            return res.status(400).json({
                success: false,
                message: "Nothing to update, request body is empty",
            });
        }

        const updatedNotification = await notificationModel.findOneAndUpdate({
                notificationUID
            }, // query by notificationUID field
            {
                $set: updateData
            }, {
                new: true
            } // return updated document
        );

        if (!updatedNotification) {
            return res.status(404).json({
                success: false,
                message: "Notification not found",
            });
        }
        res.status(200).json({
            success: true,
            notification: updatedNotification,
        });
    } catch (err) {
        console.error("❌ Error updating notification:", err.message);
        res.status(500).json({
            success: false,
            error: err.message,
        });
    }
};