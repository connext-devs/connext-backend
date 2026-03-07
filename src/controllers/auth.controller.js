const jwt = require("jsonwebtoken");
const { jobseekersModel } = require("../models/jobseekers/jobseekers.model");
const { employersModel } = require("../models/employers/employers.model");
const passport = require("passport");
const admin = require("../config/firebase");

/**
 * Generate JWT token for authenticated Firebase users
 * Used after Firebase OAuth authentication (Google Sign-In)
 *
 * POST /api/auth/generate-token
 * Body: { firebaseUID: string, email: string }
 */
exports.generateToken = async (req, res) => {
  try {
    const { firebaseUID, email } = req.body;

    if (!firebaseUID || !email) {
      return res.status(400).json({
        success: false,
        message: "firebaseUID and email are required",
      });
    }

    // Check if user exists as jobseeker
    let user = await jobseekersModel.findOne({ seekerUID: firebaseUID });
    let role = "jobseeker";

    // If not a jobseeker, check if employer
    if (!user) {
      user = await employersModel.findOne({ employerUID: firebaseUID });
      role = "employer";
    }

    // If user doesn't exist in either collection, return needs_registration
    if (!user) {
      return res.status(200).json({
        success: true,
        userExists: false,
        message: "User not registered. Please complete registration.",
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      {
        uid: firebaseUID,
        email: email,
        role: role,
      },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    return res.status(200).json({
      success: true,
      userExists: true,
      token: token,
      role: role,
      user: {
        uid: firebaseUID,
        email: email,
        role: role,
        accountIncomplete: user.accountIncomplete ?? false,
      },
    });
  } catch (error) {
    console.error("❌ Error generating token:", error);
    return res.status(500).json({
      success: false,
      message: "Server error generating token",
    });
  }
};

/**
 * Register new OAuth user (Google Sign-In)
 * Creates user in MongoDB after they complete profile setup
 *
 * POST /api/auth/oauth-register
 * Body: { firebaseUID: string, email: string, role: string, ...profileData }
 */
exports.oauthRegister = async (req, res) => {
  try {
    const { firebaseUID, email, role, ...profileData } = req.body;

    if (!firebaseUID || !email || !role) {
      return res.status(400).json({
        success: false,
        message: "firebaseUID, email, and role are required",
      });
    }

    // Check if user with this Firebase UID already exists
    const existingJobseekerByUID = await jobseekersModel.findOne({ seekerUID: firebaseUID });
    const existingEmployerByUID = await employersModel.findOne({ employerUID: firebaseUID });

    // If exists by UID, update and return existing user
    if (existingJobseekerByUID || existingEmployerByUID) {
      const existingUser = existingJobseekerByUID || existingEmployerByUID;
      
      // Update profile data if provided
      const updatedUser = role === "jobseeker" 
        ? await jobseekersModel.findOneAndUpdate(
            { seekerUID: firebaseUID },
            { ...profileData, accountIncomplete: false },
            { new: true }
          )
        : await employersModel.findOneAndUpdate(
            { employerUID: firebaseUID },
            { ...profileData, accountIncomplete: false },
            { new: true }
          );
      
      // Generate JWT token
      const token = jwt.sign(
        {
          uid: firebaseUID,
          email: email,
          role: role,
        },
        process.env.JWT_SECRET,
        { expiresIn: "7d" }
      );

      return res.status(200).json({
        success: true,
        message: "Profile updated successfully",
        token: token,
        role: role,
        user: {
          uid: firebaseUID,
          email: email,
          role: role,
          accountIncomplete: false,
        },
      });
    }

    let user;

    if (role === "jobseeker") {
      user = await jobseekersModel.create({
        seekerUID: firebaseUID,
        email: email,
        authProvider: "google",
        fullName: profileData.fullName || {},
        industries: profileData.industries || null,
        skills: profileData.skills || null,
        location: profileData.location || null,
        education: profileData.education || null,
        highestLevelAttained: profileData.highestLevelAttained || null,
        accountIncomplete: true,
        role: "jobseeker",
      });
    } else if (role === "employer") {
      user = await employersModel.create({
        employerUID: firebaseUID,
        email: email,
        authProvider: "google",
        companyName: profileData.companyName || "",
        industries: profileData.industries || null,
        location: profileData.location || null,
        accountIncomplete: true,
        role: "employer",
      });
    } else {
      return res.status(400).json({
        success: false,
        message: "Invalid role. Must be 'jobseeker' or 'employer'.",
      });
    }

    // Generate JWT token for the new user
    const token = jwt.sign(
      {
        uid: firebaseUID,
        email: email,
        role: role,
      },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    return res.status(201).json({
      success: true,
      message: "User registered successfully",
      token: token,
      role: role,
      user: {
        uid: firebaseUID,
        email: email,
        role: role,
        accountIncomplete: true,
      },
    });
  } catch (error) {
    console.error("❌ Error registering OAuth user:", error);
    return res.status(500).json({
      success: false,
      message: "Server error during registration",
    });
  }
};

/**
 * Google OAuth for authentication (similar to calendar OAuth flow)
 * GET /api/auth/google?redirect_uri=exp://...
 */
exports.googleAuth = (req, res, next) => {
  const redirectUri = req.query.redirect_uri;
  
  if (!redirectUri) {
    return res.status(400).json({ error: "redirect_uri parameter is required" });
  }
  
  // Use OAuth state parameter to preserve redirect URI (session doesn't work with OAuth redirects)
  const state = Buffer.from(JSON.stringify({ redirect_uri: redirectUri })).toString('base64');

  console.log("🔐 Google Auth Config:");
  console.log("   Client ID:", process.env.AUTH_OAUTH_CLIENT_ID);
  console.log("   Callback URL:", process.env.AUTH_OAUTH_CALLBACK_URL);
  console.log("   Redirect URI:", redirectUri);
  console.log("   State:", state);

  passport.authenticate("google-auth", {
    scope: ["email", "profile"],
    prompt: "select_account",
    state: state,
  })(req, res, next);
};

/**
 * Google OAuth callback for authentication
 * GET /api/auth/google/callback
 */
exports.googleAuthCallback = [
  passport.authenticate("google-auth", { failureRedirect: "/auth/failure" }),
  async (req, res) => {
    try {
      // Get redirect URI from state parameter (sent by us to Google, returned in callback)
      const state = req.query.state;
      let redirectUri;
      
      if (state) {
        try {
          const decoded = JSON.parse(Buffer.from(state, 'base64').toString('utf-8'));
          redirectUri = decoded.redirect_uri;
        } catch (e) {
          console.error("❌ Failed to decode state:", e);
        }
      }
      
      if (!redirectUri) {
        console.error("❌ No redirect URI found in state parameter!");
        return res.status(400).json({ error: "Missing redirect URI in state. Please try again." });
      }
      
      const googleUser = req.user;

      console.log("✅ Google OAuth Success!");
      console.log("   User:", googleUser.email);
      console.log("   State:", state);
      console.log("   Redirecting to:", redirectUri);

      // Create or get Firebase user with Google email
      let firebaseUID;
      let mongodbExists = false;
      
      try {
        const firebaseUser = await admin.auth().getUserByEmail(googleUser.email);
        firebaseUID = firebaseUser.uid;
        console.log("   Found existing Firebase user:", firebaseUID);
        
        // Check if MongoDB record exists for this Firebase UID
        const jobseeker = await jobseekersModel.findOne({ seekerUID: firebaseUID });
        const employer = await employersModel.findOne({ employerUID: firebaseUID });
        mongodbExists = !!(jobseeker || employer);
        
        console.log("   MongoDB record exists:", mongodbExists);
      } catch (error) {
        // User doesn't exist in Firebase, create one
        const newFirebaseUser = await admin.auth().createUser({
          email: googleUser.email,
          displayName: googleUser.displayName,
          photoURL: googleUser.picture,
        });
        firebaseUID = newFirebaseUser.uid;
        mongodbExists = false;
        console.log("   Created new Firebase user:", firebaseUID);
      }

      // Generate Firebase custom token
      const customToken = await admin.auth().createCustomToken(firebaseUID);

      // Redirect back to app with token and MongoDB status
      res.redirect(`${redirectUri}?status=success&token=${customToken}&mongodbExists=${mongodbExists}`);
    } catch (error) {
      console.error("❌ Google auth callback error:", error);
      
      // Try to get redirect URI from state to send error back
      const state = req.query.state;
      let redirectUri;
      
      if (state) {
        try {
          const decoded = JSON.parse(Buffer.from(state, 'base64').toString('utf-8'));
          redirectUri = decoded.redirect_uri;
        } catch (e) {
          console.error("❌ Failed to decode state in error handler:", e);
        }
      }
      
      if (redirectUri) {
        res.redirect(`${redirectUri}?status=failure&error=${encodeURIComponent(error.message)}`);
      } else {
        res.status(500).json({ error: error.message });
      }
    }
  },
];
