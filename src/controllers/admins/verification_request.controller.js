const VerificationRequest = require("../../models/admins/verification_request.model");

// Employer submits verification request
exports.submitVerification = async (req, res) => {
  const {
    employerUID,
    verificationDocs
  } = req.body;

  try {
    const request = await VerificationRequest.create({
      employerUID,
      verificationDocs,
    });

    console.log("✅ Verification request submitted:", request._id);

    res.status(201).json({
      success: true,
      message: "Verification request submitted successfully",
      data: request,
    });
  } catch (err) {
    console.error("❌ Error submitting verification:", err);
    res.status(400).json({
      success: false,
      error: err.message,
    });
  }
};

// Admin reviews a verification request
exports.reviewVerification = async (req, res) => {
  const { verificationUID } = req.params; // same as _id
  const { status, reviewedBy, notes } = req.body;

  console.log(verificationUID,'boomy', req.body,'wammy');


  try {
    // fetch the existing request
    const request = await VerificationRequest.findById(verificationUID);
    if (!request) {
      return res.status(404).json({
        success: false,
        message: "Verification request not found",
      });
    }

    // track what’s being changed
    const changes = {};
    if (request.verificationStatus !== status) {
      changes.verificationStatus = { from: request.verificationStatus, to: status };
    }
    if (request.notes !== notes) {
      changes.notes = { from: request.notes, to: notes };
    }
    if (request.reviewedBy !== reviewedBy) {
      changes.reviewedBy = { from: request.reviewedBy, to: reviewedBy };
    }

    // apply the updates
    request.verificationStatus = status;
    request.reviewedBy = reviewedBy;
    request.notes = notes;
    request.reviewedAt = new Date();

    // push edit entry
    request.edits.push({
      editorUID: reviewedBy,     // admin who reviewed
      editedAt: new Date(),
      changes: Object.keys(changes).length ? changes : null,
      note: `Status set to ${status}`, // optional summary note
    });

    // save the updated doc
    await request.save();

    console.log(`✅ Verification ${status} by admin ${reviewedBy}:`, verificationUID);

    res.status(200).json({
      success: true,
      message: `Verification ${status} successfully`,
      data: request,
    });
  } catch (err) {
    console.error("❌ Error reviewing verification:", err);
    res.status(400).json({
      success: false,
      error: err.message,
    });
  }
};


// Get single verification request
exports.getVerification = async (req, res) => {
  try {
    const { employerUID } = req.params; 

    const request = await VerificationRequest.aggregate([
      {
        $match: { employerUID } // find verification by employerUID
      },
      {
        $lookup: {
          from: "employers",
          localField: "employerUID",
          foreignField: "employerUID",
          as: "employerInfo"
        }
      },
      {
        $unwind: {
          path: "$employerInfo",
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $project: {
          verificationUID: 1,
          employerUID: 1,
          verificationStatus: 1,
          verificationDocs: 1,
          submittedAt: 1,
          reviewedAt: 1,
          notes: 1,
          "employerInfo.companyName": 1,
          "employerInfo.industries": 1,
          "employerInfo.email": 1,
          "employerInfo.location": 1
        }
      }
    ]);

    if (!request || request.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Verification request not found for this employer"
      });
    }

    res.status(200).json({
      success: true,
      data: request[0]
    });
  } catch (err) {
    console.error("❌ Error fetching verification:", err);
    res.status(400).json({
      success: false,
      error: err.message
    });
  }
};


exports.getAllVerifications = async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query; // default page 1, 10 items per page
    let statusFilter = [];
    if (status) statusFilter = status.split(',').map(s => s.trim());

    const pipeline = [
      { $sort: { submittedAt: -1 } },
      {
        $lookup: {
          from: "employers",
          localField: "employerUID",
          foreignField: "employerUID",
          as: "employerInfo",
        },
      },
      { $unwind: { path: "$employerInfo", preserveNullAndEmptyArrays: true } },
      {
        $project: {
          verificationUID: 1,
          verificationStatus: 1,
          employerUID:1,
          submittedAt: 1,
          reviewedAt: 1,
          notes: 1,
          edits: 1,
          "employerInfo.companyName": 1,
          "employerInfo.industries": 1,
          "employerInfo.email": 1,
          "employerInfo.location": 1,
        },
      },
    ];

    if (statusFilter.length) {
      pipeline.push({ $match: { verificationStatus: { $in: statusFilter } } });
    }

    // Pagination
    const pageNumber = parseInt(page);
    const pageLimit = parseInt(limit);
    const skip = (pageNumber - 1) * pageLimit;

    pipeline.push({ $skip: skip }, { $limit: pageLimit });

    const requests = await VerificationRequest.aggregate(pipeline);

    res.status(200).json({ 
      success: true, 
      page: pageNumber,
      limit: pageLimit,
      data: requests 
    });
  } catch (err) {
    console.error("❌ Error fetching verifications:", err);
    res.status(400).json({ success: false, error: err.message });
  }
};



exports.getAllVerificationsCount = async (req, res) => {
  try {
    const {
      status
    } = req.query;

    // If just a single status filter is requested
    if (status) {
      const count = await VerificationRequest.countDocuments({
        verificationStatus: status
      });

      return res.status(200).json({
        success: true,
        status,
        count,
      });
    }

    // Normal grouped counts
    const counts = await VerificationRequest.aggregate([{
      $group: {
        _id: "$verificationStatus",
        total: {
          $sum: 1
        },
      },
    }, ]);

    const countObj = counts.reduce((acc, cur) => {
      acc[cur._id] = cur.total;
      return acc;
    }, {});

    // Extra: count of approved this week
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const verifiedThisWeek = await VerificationRequest.countDocuments({
      verificationStatus: "approved",
      reviewedAt: {
        $gte: oneWeekAgo
      },
    });

    // Add inside counts
    countObj.verifiedThisWeek = verifiedThisWeek;

    res.status(200).json({
      success: true,
      counts: countObj,
    });
  } catch (err) {
    console.error("❌ Error counting verifications:", err);
    res.status(400).json({
      success: false,
      error: err.message,
    });
  }
};


// Get employer's verification history
exports.getEmployerVerifications = async (req, res) => {
  const {
    employerUID
  } = req.params;

  try {
    const requests = await VerificationRequest.find({
      employerUID
    }).sort({
      submittedAt: -1,
    });

    res.status(200).json({
      success: true,
      data: requests,
    });
  } catch (err) {
    console.error("❌ Error fetching employer verifications:", err);
    res.status(400).json({
      success: false,
      error: err.message,
    });
  }
};