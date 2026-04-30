const asyncHandler = require('../utils/asyncHandler');
const { sendContactEmail } = require('../services/emailService');

const submitContactForm = asyncHandler(async (req, res) => {
  const { name, email, company, subject, message } = req.body;

  await sendContactEmail({
    name: String(name).trim(),
    email: String(email).trim(),
    company: String(company || '').trim(),
    subject: String(subject || '').trim(),
    message: String(message).trim()
  });

  res.status(201).json({
    message: 'Your message has been sent successfully.'
  });
});

module.exports = {
  submitContactForm
};
