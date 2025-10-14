const { mongoose } = require('../../config/db');

const jobInteractionSchema = new mongoose.Schema(
  {
    _id: {
      type: String,
      default: function () {
        return this.jobInteractionID;
      },
    },
    jobInteractionID: {
      type: String,
      unique: true,
      required: true,
    },
    seekerUID: {
      type: String, // reference to jobseekers.seekerUID
      required: true,
      index: true,
    },
    jobUID: {
      type: String, // reference to joblistings._id
      required: true,
      index: true,
    },
    action: {
      type: String,
      enum: ["shortlisted", "skipped"],
      required: true,
    },
    feedback: {
      type: Object, // flexible object for ratings, comments, etc.
      default: null,
    },
    score: {
      type: Number,
      default:null
    },
    boostWeight: {
      type: Number,
      default:null
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: false, // we only want createdAt, not updatedAt
  }
);

// compound index to prevent duplicate interactions
jobInteractionSchema.index({ seekerUID: 1, jobUID: 1 }, { unique: true });

exports.jobInteractionModel = mongoose.model('job_interactions', jobInteractionSchema);
