const mongoose = require("mongoose");
const {
  v4: uuidv4
} = require("uuid");

const VerificationRequestSchema = new mongoose.Schema({
  _id: {
    type: String,
    default: uuidv4, // primary key will be UUID
  },
  verificationUID: {
    type: String,
    default: function () {
      return this._id; // copy value from _id
    },
  },
  employerUID: {
    type: String,
    required: true,
    index: true,
  },
  verificationDocs: [{
      type: String,
      required: true
    } // array of file URLs
  ],
  verificationStatus: {
    type: String,
    enum: ["pending", "approved", "rejected"],
    default: "pending",
  },
  edits: [{
    editorUID: {
      type: String,
      required: true
    }, // who made the change
    editedAt: {
      type: Date,
      default: Date.now
    }, // when
    changes: {
      type: mongoose.Schema.Types.Mixed
    }, // optional diff or snapshot
    note: {
      type: String
    } // optional human note
  }],
  reviewedAt: {
    type: Date
  },
  reviewedBy: {
    type: String
  }, // adminUID
  submittedAt: {
    type: Date,
    default: Date.now
  },
  notes: {
    type: String
  },
}, {
  timestamps: true
});

module.exports = mongoose.model("Verification_Request", VerificationRequestSchema);