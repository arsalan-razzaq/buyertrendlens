const { ImapFlow } = require('imapflow');
const sanitizeHtml = require('sanitize-html');
const { simpleParser } = require('mailparser');
const MailboxMessage = require('../models/MailboxMessage');
const { emitToAdmins } = require('./socketService');
const { createAdminNotifications } = require('./notificationService');
const { createTransporter, getSmtpConfig } = require('./emailService');

const DEFAULT_MAILBOX_PAGE_SIZE = 20;
const MAX_MAILBOX_PAGE_SIZE = 50;

const normalizeBoolean = (value, fallback = false) => {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'string') {
    return value.trim().toLowerCase() === 'true';
  }

  return fallback;
};

const getImapConfig = () => {
  const host = process.env.MAIL_HOST || 'imap.hostinger.com';
  const port = Number(process.env.MAIL_PORT || 993);
  const secure = normalizeBoolean(process.env.MAIL_SECURE, true);
  const user = process.env.MAIL_USER || process.env.SMTP_USER;
  const pass = process.env.MAIL_PASS || process.env.SMTP_PASS;

  if (!user || !pass) {
    throw new Error('Mailbox is not configured. Set MAIL_USER and MAIL_PASS on the server.');
  }

  return {
    host,
    port,
    secure,
    auth: {
      user,
      pass
    }
  };
};

const sanitizeMailboxHtml = (value) =>
  sanitizeHtml(value || '', {
    allowedTags: sanitizeHtml.defaults.allowedTags.concat([
      'img',
      'table',
      'thead',
      'tbody',
      'tfoot',
      'tr',
      'th',
      'td',
      'hr'
    ]),
    allowedAttributes: {
      a: ['href', 'name', 'target', 'rel'],
      img: ['src', 'alt', 'title', 'width', 'height', 'style'],
      '*': ['style', 'class', 'align']
    },
    allowedSchemes: ['http', 'https', 'mailto', 'data'],
    allowedSchemesByTag: {
      img: ['http', 'https', 'data']
    },
    transformTags: {
      a: sanitizeHtml.simpleTransform('a', { rel: 'noopener noreferrer', target: '_blank' }, true)
    }
  });

const escapeHtml = (value) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const textToHtml = (value) =>
  `<div style="white-space:pre-wrap;word-break:break-word;">${escapeHtml(value || '')}</div>`;

const formatAddress = (entry) => ({
  name: entry?.name || '',
  address: entry?.address || ''
});

const getPrimaryAddress = (addressObject) => formatAddress(addressObject?.value?.[0]);

const buildThreadReferences = (references = [], messageId) => {
  const values = [];

  for (const reference of references) {
    if (reference) {
      values.push(reference);
    }
  }

  if (messageId && !values.includes(messageId)) {
    values.push(messageId);
  }

  return values.join(' ').trim();
};

const normalizeSubject = (subject) => {
  const trimmedSubject = String(subject || '').trim();

  if (!trimmedSubject) {
    return 'No subject';
  }

  return /^re:/i.test(trimmedSubject) ? trimmedSubject : `Re: ${trimmedSubject}`;
};

const toMailboxError = (error, transport = 'IMAP') => {
  if (error?.statusCode) {
    return error;
  }

  const sourceMessage = String(error?.message || '').trim();
  const normalizedCode = String(error?.code || '').toUpperCase();

  if (normalizedCode === 'AUTHENTICATIONFAILED' || sourceMessage.toLowerCase().includes('authentication')) {
    return new Error(`${transport} authentication failed. Check mailbox credentials in the server environment.`);
  }

  if (
    normalizedCode === 'ECONNREFUSED' ||
    normalizedCode === 'ETIMEDOUT' ||
    normalizedCode === 'ESOCKET' ||
    sourceMessage.toLowerCase().includes('connect')
  ) {
    return new Error(`${transport} connection failed. Verify host, port, and network access.`);
  }

  return new Error(sourceMessage || `${transport} request failed.`);
};

const createImapClient = () =>
  new ImapFlow({
    ...getImapConfig(),
    logger: false
  });

const MAILBOX_FOLDER_MAP = {
  inbox: {
    specialUse: '\\Inbox',
    fallbackPaths: ['INBOX']
  },
  sent: {
    specialUse: '\\Sent',
    fallbackPaths: ['INBOX.Sent', 'Sent', 'INBOX.Sent Items', 'Sent Items']
  },
  drafts: {
    specialUse: '\\Drafts',
    fallbackPaths: ['INBOX.Drafts', 'Drafts']
  }
};

const resolveFolderPath = async (client, folderKey) => {
  const folderConfig = MAILBOX_FOLDER_MAP[folderKey];

  if (!folderConfig) {
    const invalidError = new Error('Invalid mailbox folder.');
    invalidError.statusCode = 400;
    throw invalidError;
  }

  const mailboxes = await client.list();
  const bySpecialUse = mailboxes.find((mailbox) => mailbox.specialUse === folderConfig.specialUse);

  if (bySpecialUse?.path) {
    return bySpecialUse.path;
  }

  const normalizedMap = new Map(
    mailboxes.map((mailbox) => [String(mailbox.path || '').trim().toLowerCase(), mailbox.path])
  );

  for (const path of folderConfig.fallbackPaths) {
    const match = normalizedMap.get(path.toLowerCase());

    if (match) {
      return match;
    }
  }

  if (folderKey === 'inbox') {
    return 'INBOX';
  }

  const missingError = new Error(`${folderKey} mailbox is not available for this account.`);
  missingError.statusCode = 404;
  throw missingError;
};

const withMailbox = async (folderKey, handler) => {
  const client = createImapClient();

  try {
    await client.connect();
    const folderPath = await resolveFolderPath(client, folderKey);
    await client.mailboxOpen(folderPath);
    return await handler(client, folderPath);
  } catch (error) {
    throw toMailboxError(error, 'IMAP');
  } finally {
    try {
      await client.logout();
    } catch (error) {
      // Connection might not have reached a logged-in state.
    }
  }
};

const parsePagination = ({ page, limit }) => {
  const safePage = Math.max(Number(page) || 1, 1);
  const safeLimit = Math.min(Math.max(Number(limit) || DEFAULT_MAILBOX_PAGE_SIZE, 1), MAX_MAILBOX_PAGE_SIZE);

  return { page: safePage, limit: safeLimit };
};

const buildPreview = (value = '') => String(value || '').replace(/\s+/g, ' ').trim().slice(0, 180);

const mapParsedEmailToSummary = ({ folderKey, folderPath, uid, envelope, flags, internalDate, parsed }) => {
  const parsedSender = getPrimaryAddress(parsed.from);
  const envelopeSender = getPrimaryAddress(envelope?.from);
  const parsedReplyTo = getPrimaryAddress(parsed.replyTo || parsed.from);
  const subject = parsed.subject || envelope?.subject || 'No subject';
  const sender = parsedSender.address || parsedSender.name ? parsedSender : envelopeSender;
  const replyTo = parsedReplyTo.address || parsedReplyTo.name ? parsedReplyTo : sender;

  return {
    folderKey,
    folderPath,
    uid,
    subject,
    senderName: sender.name || '',
    senderAddress: sender.address || '',
    replyToName: replyTo.name || '',
    replyToAddress: replyTo.address || '',
    preview: buildPreview(parsed.text || parsed.html || ''),
    receivedAt: parsed.date || internalDate || envelope?.date || new Date(),
    isRead: flags?.has('\\Seen') || false,
    hasAttachments: Boolean(parsed.attachments?.length),
    attachmentsCount: parsed.attachments?.length || 0,
    messageId: parsed.messageId || envelope?.messageId || '',
    references: parsed.references || []
  };
};

const serializeMailboxMessage = (message) => ({
  id: `${message.folderKey}:${message.uid}`,
  folder: message.folderKey,
  subject: message.subject || 'No subject',
  sender: {
    name: message.senderName || '',
    address: message.senderAddress || ''
  },
  replyTo: {
    name: message.replyToName || '',
    address: message.replyToAddress || ''
  },
  preview: message.preview || '',
  date: message.receivedAt || message.createdAt || null,
  isRead: Boolean(message.isRead),
  hasAttachments: Boolean(message.hasAttachments),
  attachmentsCount: Number(message.attachmentsCount || 0)
});

const getMailboxMessageDetailFromImap = async ({ folderKey, uid }) =>
  withMailbox(folderKey, async (client, folderPath) => {
    const message = await client.fetchOne(
      uid,
      {
        uid: true,
        envelope: true,
        flags: true,
        internalDate: true,
        source: true
      },
      { uid: true }
    );

    if (!message?.source) {
      const notFoundError = new Error('Email not found.');
      notFoundError.statusCode = 404;
      throw notFoundError;
    }

    const parsed = await simpleParser(message.source);

    if (!message.flags?.has('\\Seen')) {
      await client.messageFlagsAdd(uid, ['\\Seen'], { uid: true });
    }

    const htmlBody = parsed.html ? sanitizeMailboxHtml(parsed.html) : textToHtml(parsed.text || '');
    const textBody = parsed.text || '';
    const sender = getPrimaryAddress(parsed.from);
    const fallbackSender = getPrimaryAddress(message.envelope?.from);
    const resolvedSender = sender.address || sender.name ? sender : fallbackSender;
    const replyToCandidate = getPrimaryAddress(parsed.replyTo || parsed.from);
    const replyTo = replyToCandidate.address || replyToCandidate.name ? replyToCandidate : resolvedSender;

    return {
      email: {
        id: `${folderKey}:${message.uid}`,
        folder: folderKey,
        subject: parsed.subject || message.envelope?.subject || 'No subject',
        sender: resolvedSender,
        replyTo,
        to: (parsed.to?.value || []).map(formatAddress),
        cc: (parsed.cc?.value || []).map(formatAddress),
        date: parsed.date || message.internalDate || message.envelope?.date || null,
        isRead: true,
        htmlBody,
        textBody,
        messageId: parsed.messageId || message.envelope?.messageId || '',
        references: parsed.references || [],
        attachments: (parsed.attachments || []).map((attachment, index) => ({
          id: String(index + 1),
          filename: attachment.filename || `attachment-${index + 1}`,
          contentType: attachment.contentType || 'application/octet-stream',
          size: attachment.size || attachment.content?.length || 0,
          contentId: attachment.cid || '',
          contentBase64: attachment.content ? attachment.content.toString('base64') : ''
        }))
      },
      summary: mapParsedEmailToSummary({
        folderKey,
        folderPath,
        uid: message.uid,
        envelope: message.envelope,
        flags: new Set([...(message.flags || []), '\\Seen']),
        internalDate: message.internalDate,
        parsed
      })
    };
  });

const buildSearchFilter = (query) => {
  const trimmedQuery = String(query || '').trim();

  if (!trimmedQuery) {
    return {};
  }

  const pattern = new RegExp(trimmedQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');

  return {
    $or: [
      { subject: pattern },
      { senderName: pattern },
      { senderAddress: pattern },
      { preview: pattern }
    ]
  };
};

const searchMailboxMessages = async ({
  folder = 'inbox',
  query = '',
  page = 1,
  limit = DEFAULT_MAILBOX_PAGE_SIZE
}) => {
  const { page: safePage, limit: safeLimit } = parsePagination({ page, limit });
  const filter = {
    folderKey: folder,
    ...buildSearchFilter(query)
  };
  const [total, emails] = await Promise.all([
    MailboxMessage.countDocuments(filter),
    MailboxMessage.find(filter)
      .sort({ receivedAt: -1, uid: -1 })
      .skip((safePage - 1) * safeLimit)
      .limit(safeLimit)
  ]);
  const totalPages = Math.max(1, Math.ceil(total / safeLimit));

  return {
    emails: emails.map(serializeMailboxMessage),
    pagination: {
      page: Math.min(safePage, totalPages),
      limit: safeLimit,
      total,
      totalPages
    }
  };
};

const parseMailboxIdentity = ({ messageId, folder }) => {
  const normalizedFolder = String(folder || '').trim().toLowerCase() || 'inbox';
  let resolvedFolder = normalizedFolder;
  let resolvedUid = Number(messageId);

  if (String(messageId).includes(':')) {
    const [folderPart, uidPart] = String(messageId).split(':');
    resolvedFolder = String(folderPart || '').trim().toLowerCase() || normalizedFolder;
    resolvedUid = Number(uidPart);
  }

  return {
    folderKey: resolvedFolder,
    uid: resolvedUid
  };
};

const getMailboxMessageById = async (messageId, folder = 'inbox') => {
  const { folderKey, uid } = parseMailboxIdentity({ messageId, folder });

  if (!Number.isInteger(uid) || uid <= 0) {
    const invalidError = new Error('Invalid email id.');
    invalidError.statusCode = 400;
    throw invalidError;
  }

  const existing = await MailboxMessage.findOne({ folderKey, uid });

  if (!existing) {
    const notFoundError = new Error('Email not found.');
    notFoundError.statusCode = 404;
    throw notFoundError;
  }

  const detail = await getMailboxMessageDetailFromImap({ folderKey, uid });

  await MailboxMessage.updateOne(
    { folderKey, uid },
    {
      $set: {
        ...detail.summary,
        isRead: true,
        syncedAt: new Date()
      }
    }
  );

  emitToAdmins('mailbox:email-updated', {
    email: {
      ...serializeMailboxMessage({
        ...existing.toObject(),
        ...detail.summary,
        isRead: true
      })
    }
  });

  return detail;
};

const sendMailboxReply = async ({ messageId, replyBody }) => {
  const detail = await getMailboxMessageById(messageId);
  const email = detail.email;

  if (!email.replyTo.address && !email.sender.address) {
    throw new Error('Original email does not contain a valid reply address.');
  }

  try {
    const transporter = createTransporter();
    const smtpConfig = getSmtpConfig();
    const recipient = email.replyTo.address || email.sender.address;

    const html = textToHtml(replyBody);
    const references = buildThreadReferences(email.references, email.messageId);

    await transporter.sendMail({
      from: `"${smtpConfig.fromName}" <${smtpConfig.user}>`,
      to: recipient,
      subject: normalizeSubject(email.subject),
      text: replyBody,
      html,
      inReplyTo: email.messageId || undefined,
      references: references || undefined
    });

    return {
      message: 'Reply sent successfully.'
    };
  } catch (error) {
    if (error?.message?.includes('Email not found') || error?.message?.includes('Invalid email id')) {
      throw error;
    }

    throw toMailboxError(error, 'SMTP');
  }
};

const upsertMailboxMessages = async (messages) => {
  if (!messages.length) {
    return {
      syncedMessages: [],
      createdMessages: []
    };
  }

  const identityFilter = messages.map((message) => ({
    folderKey: message.folderKey,
    uid: message.uid
  }));
  const existingMessages = await MailboxMessage.find({ $or: identityFilter }).select('folderKey uid');
  const existingKeys = new Set(existingMessages.map((message) => `${message.folderKey}:${message.uid}`));

  const operations = messages.map((message) => ({
    updateOne: {
      filter: {
        folderKey: message.folderKey,
        uid: message.uid
      },
      update: {
        $set: {
          ...message,
          syncedAt: new Date()
        }
      },
      upsert: true
    }
  }));

  await MailboxMessage.bulkWrite(operations, { ordered: false });
  const syncedMessages = await MailboxMessage.find({
    $or: messages.map((message) => ({
      folderKey: message.folderKey,
      uid: message.uid
    }))
  });
  const createdMessages = syncedMessages.filter(
    (message) => !existingKeys.has(`${message.folderKey}:${message.uid}`)
  );

  return {
    syncedMessages,
    createdMessages
  };
};

const syncMailboxFolder = async ({ folderKey, emitNotifications = true }) =>
  withMailbox(folderKey, async (client, folderPath) => {
    const existingCount = await MailboxMessage.countDocuments({ folderKey });
    const latestStored = await MailboxMessage.findOne({ folderKey }).sort({ uid: -1 }).select('uid');
    const newUidCriteria =
      latestStored?.uid && existingCount
        ? { uid: `${Number(latestStored.uid) + 1}:*` }
        : { all: true };
    const newUids = await client.search(newUidCriteria, { uid: true });
    const sortedNewUids = [...newUids].sort((firstUid, secondUid) => firstUid - secondUid);
    const createdSummaries = [];

    if (sortedNewUids.length) {
      const fetchedMessages = await client.fetchAll(
        sortedNewUids,
        {
          uid: true,
          envelope: true,
          flags: true,
          internalDate: true,
          source: true
        },
        { uid: true }
      );

      const summaries = [];
      for (const message of fetchedMessages) {
        const parsed = await simpleParser(message.source);
        summaries.push(
          mapParsedEmailToSummary({
            folderKey,
            folderPath,
            uid: message.uid,
            envelope: message.envelope,
            flags: message.flags,
            internalDate: message.internalDate,
            parsed
          })
        );
      }

      const { syncedMessages, createdMessages } = await upsertMailboxMessages(summaries);
      createdSummaries.push(...createdMessages.map(serializeMailboxMessage));

      if (emitNotifications && existingCount > 0) {
        for (const summary of createdMessages) {
          const serialized = serializeMailboxMessage(summary);
          const senderLabel = serialized.sender.name || serialized.sender.address || 'New email';
          await createAdminNotifications({
            title: 'New mailbox email',
            message: `[${folderKey}] ${senderLabel}: ${serialized.subject}`,
            type: 'mailbox_email',
            actionUrl: '/admin/mailbox',
            data: {
              emailId: serialized.id,
              folder: serialized.folder,
              sender: serialized.sender,
              subject: serialized.subject
            }
          });
          emitToAdmins('mailbox:email-created', {
            email: serialized
          });
        }
      }
    }

    const recentMessages = await MailboxMessage.find({ folderKey }).sort({ uid: -1 }).limit(100).select('uid');
    const recentUids = recentMessages.map((message) => message.uid);

    if (recentUids.length) {
      const recentFlags = await client.fetchAll(
        recentUids,
        {
          uid: true,
          flags: true
        },
        { uid: true }
      );

      const updates = [];
      for (const message of recentFlags) {
        const isRead = message.flags?.has('\\Seen') || false;
        updates.push({
          updateOne: {
            filter: {
              folderKey,
              uid: message.uid
            },
            update: {
              $set: {
                isRead,
                syncedAt: new Date()
              }
            }
          }
        });
      }

      if (updates.length) {
        await MailboxMessage.bulkWrite(updates, { ordered: false });
      }
    }

    return {
      created: createdSummaries.length,
      emails: createdSummaries
    };
  });

const syncMailboxInbox = async ({ emitNotifications = true } = {}) => {
  const folderKeys = ['inbox', 'sent', 'drafts'];
  const results = [];

  for (const folderKey of folderKeys) {
    try {
      const result = await syncMailboxFolder({ folderKey, emitNotifications });
      results.push({
        folderKey,
        ...result
      });
    } catch (error) {
      if (error.statusCode === 404) {
        continue;
      }

      throw error;
    }
  }

  return {
    created: results.reduce((sum, item) => sum + Number(item.created || 0), 0),
    folders: results
  };
};

const normalizeMailboxCache = async () => {
  await MailboxMessage.updateMany(
    {
      $or: [{ folderKey: { $exists: false } }, { folderKey: null }, { folderKey: '' }]
    },
    {
      $set: {
        folderKey: 'inbox',
        folderPath: 'INBOX'
      }
    }
  );
};

module.exports = {
  getMailboxMessageById,
  normalizeMailboxCache,
  searchMailboxMessages,
  sendMailboxReply,
  syncMailboxInbox
};
