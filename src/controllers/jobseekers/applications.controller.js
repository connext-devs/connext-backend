const {
  applicationsModel
} = require('../../models/jobseekers/applications.model');
const {
  nanoid
} = require('nanoid');

exports.updateApplications = async (req, res) => {
  const {
    applicationID,
    status
  } = req.body;

  let statusCleaned = status.trim()
  let applicationIDCleaned = applicationID.trim()

  console.log(applicationID, status);

  try {
    const result = await applicationsModel.findByIdAndUpdate(
      applicationIDCleaned, {
        $set: {
          status: statusCleaned
        }
      }, {
        new: true
      }
    );


    console.log(result);

    res.status(200).json({
      success: true,
      message: result
    })

  } catch (err) {
    console.error("❌ Error creating application:", err);
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
}


exports.createApplication = async (req, res) => {
  const {
    jobUID,
    employerUID,
    seekerUID,
    resume,
  } = req.body;

  try {
    const applicationID = `applicID_${nanoid(10)}`;


    const application = await applicationsModel.create({
      applicationID,
      jobUID,
      employerUID,
      seekerUID,
      resume,
    });

    res.status(201).json({
      success: true,
      message: "Application created successfully",
      payload: application
    });
  } catch (err) {
    console.error("❌ Error creating application:", err);
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
};

exports.getApplications = async (req, res) => {
  const {
    seekerUID
  } = req.query; // /applications/job/:seekerUID

  try {
    const applications = await applicationsModel.find({
      seekerUID
    });

    if (!applications || applications.length === 0) {
      return res.status(404).json({
        success: false,
        message: `No applications found for seekerUID: ${seekerUID}`,
      });
    }

    res.json({
      success: true,
      count: applications.length,
      payload: applications,
    });
  } catch (err) {
    console.error("❌ Error fetching applications by job:", err);
    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
};

//employers

//getting applicants count for UX purpose
exports.getApplicantCounts = async (req, res) => {
  const {
    employerUID
  } = req.query;

  const matchStage = {
    ...(employerUID && {
      employerUID
    })
  };

  try {
    const counts = await applicationsModel.aggregate([{
        $match: matchStage
      },
      {
        $group: {
          _id: "$jobUID",
          pending: {
            $sum: {
              $cond: [{
                $eq: ["$status", "pending"]
              }, 1, 0]
            }
          },
          shortlisted: {
            $sum: {
              $cond: [{
                $eq: ["$status", "shortlisted"]
              }, 1, 0]
            }
          },
          viewed: {
            $sum: {
              $cond: [{
                $eq: ["$status", "viewed"]
              }, 1, 0]
            }
          },
        },
      },
    ]);

    if (!counts || counts.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No applicants found for jobs",
      });
    }

    res.json({
      success: true,
      payload: counts,
    });
  } catch (err) {
    console.error("❌ Error fetching applicant counts:", err);
    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
};


exports.getApplicants = async (req, res) => {
  const {
    jobUID,
    status
  } = req.query;
  const limit = 10;


  console.log(jobUID);
  console.log(status);
  const matchStage = {
    jobUID
  }

  if (status) {
    matchStage.status = status.trim()
  }

  try {
    const applicants = await applicationsModel.aggregate([{
        $match: matchStage
      },
      {
        $lookup: {
          from: "job_seekers",
          localField: "seekerUID",
          foreignField: "seekerUID",
          as: "profile"
        }
      },
      {
        $unwind: "$profile"
      },

      {
        $project: {
          _id: 1,
          applicationID: 1,
          jobUID: 1,
          seekerUID: 1,
          status: 1,
          appliedAt: 1,
          "profile.seekerUID": 1,
          "profile.email": 1,
          "profile.fullName": 1,
          "profile.location": 1,
          "profile.status": 1,
          "profile.industries": 1,
          "profile.education": 1,
          "profile.highestLevelAttained": 1,
          "profile.skippedJobs": 1,
          "profile.shortlistedJobs": 1,
          "profile.resume": 1,
          "profile.profileSummary": 1,
          "profile.skills": 1,
          "profile.role": 1
        }
      },

      {
        $limit: limit
      }
    ]);

    if (!applicants.length) {
      return res.status(404).json({
        success: false,
        message: `No applicants found for job ${jobUID}`,
      });
    }

    res.json({
      success: true,
      payload: applicants
    });
  } catch (err) {
    console.error("❌ Error fetching applicants:", err);
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
};

/// ✅ For shortlisted applicants with pagination
exports.getShortlistedApplicants = async (req, res) => {
  const {
    jobUID,
    status,
    page = 1, // default page 1
    limit = 20 // default 20 per page
  } = req.query;

  const skip = (parseInt(page) - 1) * parseInt(limit);

  const matchStage = {
    jobUID
  }
  if (status) {
    // Allow status to be a comma-separated string or an array
    const statuses = Array.isArray(status) ? status : status.split(',').map(s => s.trim());
    matchStage.status = {
      $in: statuses
    };
  }
  console.log("✅ jobUID:", jobUID);
  console.log("✅ page:", page, "limit:", limit);

  try {
    const applicants = await applicationsModel.aggregate([{
        $match: matchStage
      },
      {
        $lookup: {
          from: "job_seekers",
          localField: "seekerUID",
          foreignField: "seekerUID",
          as: "profile"
        }
      },
      {
        $unwind: "$profile"
      },
      {
        $project: {
          _id: 1,
          applicationID: 1,
          jobUID: 1,
          seekerUID: 1,
          status: 1,
          appliedAt: 1,
          "profile.seekerUID": 1,
          "profile.email": 1,
          "profile.fullName": 1,
          "profile.location": 1,
          "profile.status": 1,
          "profile.industries": 1,
          "profile.education": 1,
          "profile.highestLevelAttained": 1,
          "profile.resume": 1,
          "profile.profileSummary": 1,
          "profile.skills": 1,
          "profile.role": 1
        }
      },
      {
        $skip: skip
      }, // ✅ pagination offset
      {
        $limit: parseInt(limit)
      } // ✅ per page
    ]);

    if (!applicants.length) {
      return res.status(404).json({
        success: false,
        message: `No shortlisted applicants found for job ${jobUID} (page ${page})`,
      });
    }

    res.json({
      success: true,
      page: parseInt(page),
      limit: parseInt(limit),
      hasMore: applicants.length === parseInt(limit), // ✅ for infinite scroll
      payload: applicants
    });
  } catch (err) {
    console.error("❌ Error fetching shortlisted applicants:", err);
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
};