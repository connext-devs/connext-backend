const jwt = require("jsonwebtoken");
const { adminsModel } = require("../models/admins/verification_request.model");

// Generic middleware: validates token
exports.authMiddleware = (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res.status(401).json({ success: false, message: "No token provided" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // attach payload (e.g., { uid, role }) to request
    next();
  } catch (err) {
    console.error("❌ Auth failed:", err);
    return res.status(401).json({ success: false, message: "Invalid or expired token" });
  }
};

// Admin-specific middleware
exports.isAdmin = async (req, res, next) => {
  try {
    const admin = await adminsModel.findOne({ adminUID: req.user.uid });
    if (!admin) {
      return res.status(403).json({ success: false, message: "Not authorized as admin" });
    }

    req.admin = admin; // attach admin document
    next();
  } catch (err) {
    console.error("❌ Admin check failed:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};
