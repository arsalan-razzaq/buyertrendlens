const asyncHandler = require('../utils/asyncHandler');
const {
  searchMailboxMessages,
  getMailboxMessageById,
  sendMailboxReply
} = require('../services/mailboxService');

const getMailboxEmails = asyncHandler(async (req, res) => {
  const { folder = 'inbox', q = '', page = 1, limit = 20 } = req.query;
  const response = await searchMailboxMessages({ folder, query: q, page, limit });

  res.json(response);
});

const getMailboxEmailDetail = asyncHandler(async (req, res) => {
  const response = await getMailboxMessageById(req.params.id, req.query.folder);
  res.json(response);
});

const replyToMailboxEmail = asyncHandler(async (req, res) => {
  const response = await sendMailboxReply({
    messageId: req.body.emailId,
    replyBody: req.body.replyBody
  });

  res.json(response);
});

module.exports = {
  getMailboxEmails,
  getMailboxEmailDetail,
  replyToMailboxEmail
};
