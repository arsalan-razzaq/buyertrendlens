export const formatCoins = (value = 0) => {
  const amount = Number(value) || 0;
  const formattedAmount = new Intl.NumberFormat(undefined, {
    minimumFractionDigits: Number.isInteger(amount) ? 0 : 2,
    maximumFractionDigits: 2
  }).format(amount);

  return `${formattedAmount} ${Math.abs(amount) === 1 ? 'coin' : 'coins'}`;
};

export const formatDate = (value) =>
  new Date(value).toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

export const formatLocalDateTime = (value, options = {}) => {
  if (!value) {
    return 'Not available';
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
    ...options
  }).format(new Date(value));
};

export const formatCurrency = (value = 0) =>
  new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2
  }).format(Number(value) || 0);

const slugifySegment = (value) =>
  String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

export const buildBrandedExportFilename = ({
  filename = '',
  dataset = '',
  format = '',
  prefix = 'buyer-trend-lens'
} = {}) => {
  const normalizedFilename = String(filename || '').trim();
  const extensionMatch = normalizedFilename.match(/\.([a-z0-9]+)$/i);
  const extension = slugifySegment(format || extensionMatch?.[1] || 'csv') || 'csv';
  const datasetSegment = slugifySegment(dataset) || 'dataset';
  const date = new Date().toISOString().slice(0, 10);

  return `${prefix}-${datasetSegment}-export-${date}.${extension}`;
};

export const downloadCsv = (filename, csv) => {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export const downloadFile = (filename, content, mimeType = 'application/octet-stream') => {
  const blob = new Blob([content], { type: mimeType });
  downloadBlob(filename, blob);
};

export const downloadBlob = (filename, blob) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export const formatTimeRemaining = (value) => {
  if (!value) {
    return 'Unavailable';
  }

  const diffMs = new Date(value).getTime() - Date.now();

  if (diffMs <= 0) {
    return 'Removing soon';
  }

  const totalHours = Math.ceil(diffMs / (1000 * 60 * 60));
  const days = Math.floor(totalHours / 24);
  const hours = totalHours % 24;

  if (days >= 1) {
    return `${days} day${days === 1 ? '' : 's'}${hours ? ` ${hours}h` : ''}`;
  }

  return `${Math.max(totalHours, 1)} hour${Math.max(totalHours, 1) === 1 ? '' : 's'}`;
};
