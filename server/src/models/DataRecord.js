const mongoose = require('mongoose');

const dataRecordSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    category: { type: String, trim: true, default: '' },
    gameName: { type: String, trim: true, default: '' },
    sellerName: { type: String, trim: true, default: '' },
    price: { type: Number, default: 0 },
    rating: { type: Number, default: 0 },
    userLevel: { type: Number, default: 0 },
    sellerRank: { type: String, trim: true, default: '' },
    score: { type: Number, default: 0 },
    groupName: { type: String, trim: true, default: '' },
    ordersSold: { type: Number, default: 0 }
  },
  {
    timestamps: true
  }
);

dataRecordSchema.index({ title: 'text', sellerName: 'text', gameName: 'text' });
dataRecordSchema.index({ category: 1, groupName: 1, sellerRank: 1 });
dataRecordSchema.index({ createdAt: -1 });
dataRecordSchema.index({ category: 1, gameName: 1, sellerName: 1, sellerRank: 1, createdAt: -1 });
dataRecordSchema.index({ sellerName: 1, createdAt: -1 });
dataRecordSchema.index({ gameName: 1, createdAt: -1 });
dataRecordSchema.index({ price: 1 });
dataRecordSchema.index({ ordersSold: -1 });

module.exports = mongoose.model('DataRecord', dataRecordSchema);
