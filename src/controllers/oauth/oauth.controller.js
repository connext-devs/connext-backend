//for passport
require('../../config/oauth')
const passport = require('passport')
const {
  findEmployerByEmail
} = require('../employers.controller');

const {
  updateScheduleFunction
} = require('../schedules/schedules.controller');



const {
  google
} = require('googleapis');

const {
  handleUpdateProfile
} = require('../employers.controller');

//tester
exports.googleTest = (req, res) => {
  res.send("<a href='exp://iw2cv5a-patnhel-8081.exp.direct/--/chats/123'>Open Chat</a>");
};

const crypto = require('crypto');

// Convert hex string to Buffer
const ENCRYPTION_KEY = Buffer.from(process.env.OAUTH_SECRET, 'hex');
const IV_LENGTH = 16;

function encrypt(text) {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv('aes-256-cbc', ENCRYPTION_KEY, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

function decrypt(text) {
  const [ivHex, encryptedText] = text.split(':');
  const iv = Buffer.from(ivHex, 'hex');
  const decipher = crypto.createDecipheriv('aes-256-cbc', ENCRYPTION_KEY, iv);
  let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}


exports.googlePopup = (req, res, next) => {
  const redirectUri = req.query.redirect_uri;
  const userUID = req.query.userUID
  req.session.redirect_uri = redirectUri;
  req.session.userUID = userUID

  const payload = {
    redirectUri,
    userUID
  }

  passport.authenticate('google', {
    scope: [
      'email',
      'https://www.googleapis.com/auth/calendar',
      'https://www.googleapis.com/auth/calendar.events',
    ],
    accessType: 'offline',
    prompt: 'consent',
    state: encodeURIComponent(JSON.stringify(payload))
  })(req, res, next);
};


exports.googleCallback = [
  passport.authenticate('google', {
    failureRedirect: '/auth/failure'
  }),
  async (req, res) => {
    try {
      const state = JSON.parse(decodeURIComponent(req.query.state));

      console.log('STATEE', state)

      const token = req.user.accessToken;
      const refreshToken = req.user.refreshToken;
      const redirectUri = state.redirectUri; // your app deep link
      const userUID = state.userUID

      // await saveGoogleTokensToUser(req.user.id, { token, refreshToken });

      const updatedUser = await handleUpdateProfile(userUID, {
        oauth: {
          accessToken: token,
          refreshToken: refreshToken,
          accessTokenExpiresAt: new Date(Date.now() + 3600 * 1000),
          refreshTokenExpiresAt: new Date(Date.now() + 30 * 24 * 3600 * 1000),
        }
      });

      console.log('updateduser', updatedUser);

      console.log('OAuth success, tokens saved for user:', req.user);

      // ✅ Redirect back to the app with a simple success flag
      res.redirect(`${redirectUri}?status=success`);
    } catch (err) {
      console.error('OAuth callback error:', err);
      res.redirect(`${redirectUri}?status=failure`);
    }
  },
];

//----- end of auth

//create meeting

const oauth2Client = new google.auth.OAuth2(
  process.env.OAUTH_CLIENT_ID,
  process.env.OAUTH_CLIENT_SECRET,
  process.env.OAUTH_CALLBACK_URL,
);


//getting refresh token
async function refreshAccessToken(refreshToken) {
  oauth2Client.setCredentials({
    refresh_token: refreshToken
  });
  try {
    const {
      credentials
    } = await oauth2Client.refreshAccessToken();
    console.log('New access token:', credentials.access_token);
    console.log('Expires in (seconds):', credentials.expiry_date);
    return credentials;
  } catch (err) {
    console.error('❌ Failed to refresh access token:', err);

    // Re-throw the original error with its message
    throw new Error(err.message || 'Unexpected error while refreshing access token');
  }
}



exports.createMeeting = async (req, res) => {
  console.log(req.body, 'AAAAAAAAAA');
  const {
    summary,
    description,
    start,
    end,
    conferenceData
  } = req.body

  let employer = await findEmployerByEmail('connext.devs@gmail.com');
  employer = employer[0]
  let accessToken = employer.oauth.accessToken
  let refreshToken = employer.oauth.refreshToken
  const atExp = employer.oauth.accessTokenExpiresAt
  const rtExp = employer.oauth.refreshTokenExpiresAt;


  console.log(accessToken, 'act');
  console.log(refreshToken, 'rfrsh');

  //if ACCESS TOKEN is expired automatically get one
  try {
    // if (new Date() >= new Date(atExp)) {
    if(true){
      console.log('Access token expired — refreshing...');
      const credentials = await refreshAccessToken(refreshToken);
      console.log('Access token refreshed automatically.');
      accessToken = credentials.access_token;

      // updating the user's access token
      const updatedUser = await handleUpdateProfile(employer.employerUID, {
        oauth: {
          refreshToken: employer.oauth.refreshToken,
          accessToken: accessToken,
          refreshTokenExpiresAt: employer.oauth.refreshTokenExpiresAt,
          accessTokenExpiresAt: new Date(Date.now() + 3600 * 1000),
        }
      });

      console.log("Successfully updated user's profile");
    }
  } catch (err) {
    if (err.message === 'invalid_grant' || err.message.includes('re-authenticate')) {
      console.error('Refresh token invalid or expired — user needs to re-authenticate');
      return res.status(401).json({
        success: false,
        message: 'Refresh token invalid or expired — please re-authenticate with Google.',
        code: "REFRESH_TOKEN_EXPIRED"
      });
    } else {
      console.error('Failed to refresh access token:', err.message);
      return res.status(500).json({
        success: false,
        message: 'Unexpected error while refreshing access token.',
        error: err.message,
      });
    };
  }


  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({
    access_token: accessToken,
    refresh_token: refreshToken
  });

  const calendar = google.calendar({
    version: 'v3',
    auth: oauth2Client
  });

  const event = {
    summary: summary,
    description: description,
    start: {
      dateTime: start.dateTime,
      timeZone: 'Asia/Manila',
    },
    end: {
      dateTime: end.dateTime,
      timeZone: 'Asia/Manila',
    },
    conferenceData: {
      createRequest: {
        requestId: Date.now().toString(),
        conferenceSolutionKey: {
          type: 'hangoutsMeet'
        }
      }
    }
  };
  try {
    const response = await calendar.events.insert({
      calendarId: 'primary',
      resource: event,
      conferenceDataVersion: 1,
    });
    res.json({
      message: 'Meeting created!',
      eventUID: response.data.id,
      eventLink: response.data.htmlLink,
      hangoutLink: response.data.conferenceData.entryPoints[0].uri, // Google Meet URL
    });
  } catch (error) {
    console.error('Error creating meeting:', error.code, ' ', error.message);
    res.status(500).json({
      success: false,
      message: error
    });
  }
};

//edit meeting
exports.updateSchedule = async (req, res) => {
  const {
    eventUID,
    summary,
    description,
    start,
    end,
    meetingUID,
    status   
  } = req.body;


  if (!eventUID) {
    return res.status(400).json({
      success: false,
      message: 'Missing eventUID'
    });
  }

  let employer = await findEmployerByEmail('connext.devs@gmail.com');
  employer = employer[0];
  let accessToken = employer.oauth.accessToken;
  let refreshToken = employer.oauth.refreshToken;
  const atExp = employer.oauth.accessTokenExpiresAt;

  try {
    if (new Date() >= new Date(atExp)) {
      console.log('Access token expired — refreshing...');
      const credentials = await refreshAccessToken(refreshToken);
      accessToken = credentials.access_token;

      await handleUpdateProfile(employer.employerUID, {
        oauth: {
          ...employer.oauth,
          accessToken: accessToken,
          accessTokenExpiresAt: new Date(Date.now() + 3600 * 1000)
        },
      });
    }
  } catch (err) {
    if (err.message === 'invalid_grant' || err.message.includes('re-authenticate')) {
      return res.status(401).json({
        success: false,
        message: 'Refresh token invalid or expired — please re-authenticate with Google.',
        code: "REFRESH_TOKEN_EXPIRED"
      });
    }
    return res.status(500).json({
      success: false,
      message: 'Unexpected error while refreshing access token.',
      error: err.message
    });
  }

  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({
    access_token: accessToken,
    refresh_token: refreshToken,
  });

  const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

  if (status === "cancelled") {
    try {
      await calendar.events.delete({
        calendarId: 'primary',
        eventId: eventUID
      });

      await updateScheduleFunction(meetingUID, {
        status: "cancelled"
      });

      return res.json({
        success: true,
        message: "Meeting cancelled successfully."
      });

    } catch (error) {
      console.error("Error cancelling meeting:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to cancel meeting.",
        error: error.message
      });
    }
  }



  try {
    const updatedEvent = {
      summary,
      description,
      start: { dateTime: start.dateTime, timeZone: 'Asia/Manila' },
      end: { dateTime: end.dateTime, timeZone: 'Asia/Manila' },
    };

    const response = await calendar.events.patch({
      calendarId: 'primary',
      eventId: eventUID,
      requestBody: updatedEvent,
    });

    const updatesPayload = {
      title: summary,
      description,
      startTime: start.dateTime,
      endTime: end.dateTime,
      status
    };

    console.log('updates payload', updatesPayload)

    await updateScheduleFunction(meetingUID, updatesPayload);

    res.json({
      success: true,
      message: 'Meeting updated successfully!',
      eventLink: response.data.htmlLink,
      updatedData: response.data,
    });

  } catch (error) {
    console.error('Error updating meeting:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update meeting.',
      error: error.message,
    });
  }
};
