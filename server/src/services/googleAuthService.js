const { OAuth2Client } = require('google-auth-library');

const getGoogleClient = () => new OAuth2Client(process.env.GOOGLE_CLIENT_ID || undefined);

const verifyGoogleToken = async (credential) => {
  const client = getGoogleClient();
  const verifyOptions = {
    idToken: credential
  };

  // When GOOGLE_CLIENT_ID is present we verify the token audience strictly.
  if (process.env.GOOGLE_CLIENT_ID) {
    verifyOptions.audience = process.env.GOOGLE_CLIENT_ID;
  }

  const ticket = await client.verifyIdToken(verifyOptions);

  return ticket.getPayload();
};

module.exports = {
  verifyGoogleToken
};
