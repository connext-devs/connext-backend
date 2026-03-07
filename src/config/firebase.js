const admin = require("firebase-admin");

// Initialize Firebase Admin SDK
// You can either use service account JSON file or environment variables
try {
  if (!admin.apps.length) {
    // Option 1: Using service account key file (recommended for development)
    // Download from Firebase Console > Project Settings > Service Accounts > Generate new private key
    // const serviceAccount = require('../../firebase-service-account.json');
    // admin.initializeApp({
    //   credential: admin.credential.cert(serviceAccount)
    // });

    // Option 2: Using environment variables (for production)
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      }),
    });

    console.log('✅ Firebase Admin initialized');
  }
} catch (error) {
  console.error('❌ Firebase Admin initialization error:', error);
}

module.exports = admin;
