const { OAuth2Client } = require('google-auth-library');

const getGoogleClient = () => new OAuth2Client(process.env.GOOGLE_CLIENT_ID || undefined);
const getAllowedAudiences = () =>
  String(process.env.GOOGLE_AUTH_CLIENT_ID || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);

const verifyGoogleToken = async (credential) => {
  const client = getGoogleClient();
  const verifyOptions = {
    idToken: credential
  };
  const allowedAudiences = getAllowedAudiences();

  // Verify audience strictly only when a dedicated auth client id is configured.
  // GOOGLE_CLIENT_ID is also used by GA4 OAuth on this server and may not match Firebase login tokens.
  if (allowedAudiences.length === 1) {
    verifyOptions.audience = allowedAudiences[0];
  } else if (allowedAudiences.length > 1) {
    verifyOptions.audience = allowedAudiences;
  }

  const ticket = await client.verifyIdToken(verifyOptions);

  return ticket.getPayload();
};

module.exports = {
  verifyGoogleToken
};
