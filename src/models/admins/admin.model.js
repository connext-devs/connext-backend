const mongoose = require("mongoose");

const AdminSchema = new mongoose.Schema(
  {
    _id: { type: String, required: true }, // Firebase UID
    adminUID: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    role: { type: String, enum: ["superadmin", "moderator", "reviewer"], default: "reviewer" },
    permissions: {
      canApproveVerifications: { type: Boolean, default: false },
      canSuspendAccounts: { type: Boolean, default: false },
      canManageAdmins: { type: Boolean, default: false },
    },
    lastLoginAt: { type: Date },
  },
  { timestamps: true }
);

// ensure adminUID mirrors _id
AdminSchema.pre("save", function (next) {
  if (!this.adminUID) this.adminUID = this._id;
  next();
});

// Only create model if it doesn't already exist
module.exports = mongoose.models.Admin || mongoose.model("Admin", AdminSchema);
