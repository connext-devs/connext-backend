const { mongoose } = require('../../config/db');

const applicationsSchema = new mongoose.Schema(
  {
    _id: {
      type: String,
      default: function () {
        return this.applicationID;
      },
    },
    applicationID: {
      type: String,
      unique: true,
      required: true,
    },
    jobUID: {
      type: String, // reference to joblistings._id
      required: true,
    },
    employerUID: {
      type: String, // reference to employers._id
      required: true,
    },
    seekerUID: {
      type: String, // reference to jobseekers.seekerUID
      required: true,
    },
    resume: {
      type: String,
      default: null,
    },
    status: {
      type: String,
      enum: ["pending", "viewed", "shortlisted", "contacted","hired", "closed"],
      default: "pending",
    },
    appliedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true, // auto add createdAt & updatedAt
  }
);

exports.applicationsModel = mongoose.model('applications', applicationsSchema);
