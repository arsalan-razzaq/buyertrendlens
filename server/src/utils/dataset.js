const SUPPORTED_DATASETS = new Set(['g2g', 'eldorado']);

const normalizeDataset = (value) => {
  const normalized = String(value || '').trim().toLowerCase();
  return SUPPORTED_DATASETS.has(normalized) ? normalized : 'g2g';
};

module.exports = {
  normalizeDataset,
  SUPPORTED_DATASETS
};
