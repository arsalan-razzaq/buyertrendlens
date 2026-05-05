const mongoose = require('mongoose');

const EXPORT_RETENTION_DAYS = 20;
const EXPORT_RETENTION_MS = EXPORT_RETENTION_DAYS * 24 * 60 * 60 * 1000;

const exportFileSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    dataset: {
      type: String,
      default: 'g2g',
      index: true
    },
    format: {
      type: String,
      required: true
    },
    filename: {
      type: String,
      required: true
    },
    mimeType: {
      type: String,
      required: true
    },
    content: {
      type: String,
      default: ''
    },
    contentBuffer: {
      type: Buffer,
      default: null
    },
    contentEncoding: {
      type: String,
      enum: ['identity', 'gzip'],
      default: 'identity'
    },
    totalRows: {
      type: Number,
      default: 0
    },
    cost: {
      type: Number,
      default: 0
    },
    filters: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + EXPORT_RETENTION_MS),
      index: { expires: 0 }
    }
  },
  {
    timestamps: true
  }
);

exportFileSchema.index({ userId: 1, createdAt: -1 });
exportFileSchema.index({ userId: 1, dataset: 1, createdAt: -1 });

module.exports = mongoose.model('ExportFile', exportFileSchema);
