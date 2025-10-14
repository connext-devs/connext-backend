const Conversation = require("../../models/chats/conversation.model")
const Message = require("../../models/chats/message.model")

// Create or get conversation between employer & seeker
exports.createConversation = async (req, res) => {
    try {
        const {
            employerUID,
            seekerUID,
            applicationID
        } = req.body;

        console.log(req.body);
        // Check if conversation already exists
        let conversation = await Conversation.findOne({
            employerUID,
            seekerUID
        });

        if (!conversation) {
            // Create new conversation if none exists
            conversation = await Conversation.create({
                employerUID,
                seekerUID,
                applicationID,
                status: "locked",
            });
        } else {
            // Update applicationID if it already exists
            conversation.applicationID = applicationID;
            conversation.updatedAt = Date.now();
            await conversation.save();
        }

        res.status(200).json({
            success: true,
            payload: conversation,
        });
    } catch (err) {
        res.status(500).json({
            error: err.message,
        });
    }
};



// Get all conversations for a user
exports.getUserConversations = async (req, res) => {
  try {
    const { userUID } = req.params;

    const conversations = await Conversation.aggregate([
      {
        $match: {
          $or: [{ employerUID: userUID }, { seekerUID: userUID }],
        },
      },
      {
        $lookup: {
          from: "job_seekers",
          localField: "seekerUID",
          foreignField: "seekerUID",
          as: "seeker",
        },
      },
      {
        $unwind: { path: "$seeker", preserveNullAndEmptyArrays: true },
      },
      {
        $lookup: {
          from: "employers",
          localField: "employerUID",
          foreignField: "employerUID",
          as: "employer",
        },
      },
      {
        $unwind: { path: "$employer", preserveNullAndEmptyArrays: true },
      },
      // 🔗 Join with applications to get jobUID + status
      {
        $lookup: {
          from: "applications",
          localField: "applicationID",
          foreignField: "applicationID",
          as: "application",
        },
      },
      { $unwind: { path: "$application", preserveNullAndEmptyArrays: true } },

      // 🔗 Join with job_listings to fetch jobTitle
      {
        $lookup: {
          from: "job_listings",
          localField: "application.jobUID",
          foreignField: "jobUID",
          as: "job",
        },
      },
      { $unwind: { path: "$job", preserveNullAndEmptyArrays: true } },

      {
        $project: {
          conversationUID: 1,
          applicationID: 1,
          status: 1,
          lastMessage: 1,
          updatedAt: 1,
          seekerName: "$seeker.fullName",
          employerProfilePic: "$employer.profilePic",
          employerName: "$employer.companyName",
          applicationStatus: "$application.status",
          jobUID: "$application.jobUID",
          jobTitle: "$job.jobTitle", // 👈 depends on your schema field name
        },
      },
      { $sort: { updatedAt: -1 } },
    ]);

    res.status(200).json(conversations);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
