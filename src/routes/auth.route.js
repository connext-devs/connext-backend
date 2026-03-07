const express = require("express");
const router = express.Router();
const { generateToken, oauthRegister, googleAuth, googleAuthCallback } = require("../controllers/auth.controller");

// POST /api/auth/generate-token - Generate JWT for Firebase authenticated users
router.post("/generate-token", generateToken);

// POST /api/auth/oauth-register - Register new OAuth user
router.post("/oauth-register", oauthRegister);

// GET /api/auth/google - Initiate Google OAuth for authentication
router.get("/google", googleAuth);

// GET /api/auth/google/callback - Google OAuth callback
router.get("/google/callback", googleAuthCallback);

module.exports = router;
