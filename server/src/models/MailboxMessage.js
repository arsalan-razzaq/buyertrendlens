const mongoose = require('mongoose');

const mailboxMessageSchema = new mongoose.Schema(
  {
    folderKey: {
      type: String,
      enum: ['inbox', 'sent', 'drafts'],
      required: true,
      index: true
    },
    folderPath: {
      type: String,
      required: true
    },
    uid: {
      type: Number,
      required: true,
      index: true
    },
    subject: {
      type: String,
      default: 'No subject'
    },
    senderName: {
      type: String,
      default: ''
    },
    senderAddress: {
      type: String,
      default: ''
    },
    replyToName: {
      type: String,
      default: ''
    },
    replyToAddress: {
      type: String,
      default: ''
    },
    preview: {
      type: String,
      default: ''
    },
    receivedAt: {
      type: Date,
      default: Date.now,
      index: true
    },
    isRead: {
      type: Boolean,
      default: false
    },
    hasAttachments: {
      type: Boolean,
      default: false
    },
    attachmentsCount: {
      type: Number,
      default: 0
    },
    messageId: {
      type: String,
      default: ''
    },
    references: {
      type: [String],
      default: []
    },
    syncedAt: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true
  }
);

mailboxMessageSchema.index({ folderKey: 1, uid: 1 }, { unique: true });
mailboxMessageSchema.index({ folderKey: 1, receivedAt: -1, uid: -1 });

module.exports = mongoose.model('MailboxMessage', mailboxMessageSchema);
