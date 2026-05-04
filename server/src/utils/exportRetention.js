const EXPORT_RETENTION_DAYS = 20;
const EXPORT_RETENTION_MS = EXPORT_RETENTION_DAYS * 24 * 60 * 60 * 1000;

const buildExportExpiryDate = () => new Date(Date.now() + EXPORT_RETENTION_MS);

module.exports = {
  EXPORT_RETENTION_DAYS,
  EXPORT_RETENTION_MS,
  buildExportExpiryDate
};
