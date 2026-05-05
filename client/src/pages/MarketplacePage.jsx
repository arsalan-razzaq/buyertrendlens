import { useEffect, useState } from 'react';
import http, { dataHttp, getErrorMessage } from '../api/http';
import DataTable from '../components/DataTable';
import ExportModal from '../components/ExportModal';
import FilterPanel from '../components/FilterPanel';
import { useAuth } from '../hooks/useAuth';
import { buildBrandedExportFilename, downloadBlob, formatCoins, formatTimeRemaining } from '../utils/format';

const COIN_COST_PER_ROW = 1;
const EXPORT_CONFIRMATION_STORAGE_KEY = 'skip-export-confirmation';
const FILTER_APPLY_DEBOUNCE_MS = 300;
const SUPPORTED_EXPORT_FORMATS = new Set(['xls', 'csv', 'json', 'tsv']);

const initialFilters = {
  search: '',
  category: '',
  gameName: '',
  sellerName: '',
  priceMin: '',
  priceMax: '',
  verifiedOnly: false,
  rating: '',
  userLevel: '',
  minSellerRank: '',
  score: '',
  group: '',
  groupName: '',
  ordersSold: ''
};

const MarketplacePage = ({ dataset }) => {
  const { user, refreshProfile } = useAuth();
  const [filters, setFilters] = useState(initialFilters);
  const [appliedFilters, setAppliedFilters] = useState(initialFilters);
  const [datasetSummary, setDatasetSummary] = useState({ total: 0 });
  const [loading, setLoading] = useState(true);
  const [exportLoading, setExportLoading] = useState(false);
  const [preview, setPreview] = useState(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [lastExport, setLastExport] = useState(null);

  const downloadSavedExport = async (exportId, fallbackFilename) => {
    const response = await http.get(`/export/${exportId}/download`, {
      responseType: 'blob'
    });
    const disposition = String(response.headers['content-disposition'] || '');
    const matchedFilename = disposition.match(/filename="([^"]+)"/i)?.[1] || fallbackFilename || 'dataset-export';
    const brandedFilename = buildBrandedExportFilename({
      filename: matchedFilename,
      dataset,
      format: matchedFilename.split('.').pop()
    });

    downloadBlob(brandedFilename, response.data);
  };
  const [savedExportFormat, setSavedExportFormat] = useState(() => {
    if (typeof window === 'undefined') {
      return '';
    }

    const storedValue = window.localStorage.getItem(`${EXPORT_CONFIRMATION_STORAGE_KEY}:${dataset}`) || '';
    return SUPPORTED_EXPORT_FORMATS.has(storedValue) ? storedValue : '';
  });
  const skipExportConfirmation = Boolean(savedExportFormat);

  useEffect(() => {
    setFilters(initialFilters);
    setAppliedFilters(initialFilters);
    setPreview(null);
    setMessage('');
    setError('');
  }, [dataset]);

  useEffect(() => {
    refreshProfile().catch(() => {});
  }, [refreshProfile]);

  useEffect(() => {
    const handleWindowFocus = () => {
      refreshProfile().catch(() => {});
    };

    window.addEventListener('focus', handleWindowFocus);

    return () => {
      window.removeEventListener('focus', handleWindowFocus);
    };
  }, [refreshProfile]);

  const fetchData = async (requestedFilters = appliedFilters) => {
    setLoading(true);
    setError('');

    try {
      const { data } = await dataHttp.get('/', {
        params: {
          dataset,
          ...requestedFilters,
          page: 1,
          limit: 1
        }
      });

      setDatasetSummary({ total: Number(data.total) || 0 });
    } catch (requestError) {
      setError(getErrorMessage(requestError));
      setDatasetSummary({ total: 0 });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(appliedFilters);
  }, [appliedFilters, dataset]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setAppliedFilters(filters);
    }, FILTER_APPLY_DEBOUNCE_MS);

    return () => {
      window.clearTimeout(timer);
    };
  }, [filters]);

  const updateFilter = (key, value) => {
    setFilters((current) => ({ ...current, [key]: value }));
  };

  const handleReset = () => {
    setFilters(initialFilters);
    setAppliedFilters(initialFilters);
  };

  const openExportModal = async (format = 'xls') => {
    setError('');
    try {
      await refreshProfile();
      const { data } = await dataHttp.post('/export/preview', { dataset, ...appliedFilters, format });
      setPreview({ ...data, format });
    } catch (previewError) {
      setError(getErrorMessage(previewError));
    }
  };

  const handleExport = async ({ format = 'xls', rememberChoice = false } = {}) => {
    setExportLoading(true);
    setError('');

    try {
      const { data } = await dataHttp.post('/export', { dataset, ...appliedFilters, format });
      await downloadSavedExport(data.id, data.filename);
      setMessage(`${String(data.format || format).toUpperCase()} export completed. ${formatCoins(data.cost)} deducted from your wallet.`);
      setLastExport({
        id: data.id,
        filename: buildBrandedExportFilename({
          filename: data.filename,
          dataset,
          format: data.format || format
        }),
        format: data.format,
        totalRows: data.totalRows,
        expiresAt: data.expiresAt
      });
      setPreview(null);
      if (rememberChoice) {
        window.localStorage.setItem(`${EXPORT_CONFIRMATION_STORAGE_KEY}:${dataset}`, format);
        setSavedExportFormat(format);
      }
      await refreshProfile();
      await fetchData(appliedFilters);
    } catch (exportError) {
      setError(getErrorMessage(exportError));
    } finally {
      setExportLoading(false);
    }
  };

  const estimatedCost = Number((datasetSummary.total * COIN_COST_PER_ROW).toFixed(2));
  const canExport = datasetSummary.total > 0 && (user?.coins ?? 0) >= estimatedCost;

  const handleExportClick = async () => {
    if (skipExportConfirmation) {
      await handleExport({ format: savedExportFormat });
      return;
    }

    await openExportModal('xls');
  };

  return (
    <div className="space-y-5">
      {message ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{message}</div>
      ) : null}
      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
      ) : null}

      <DataTable
        total={datasetSummary.total}
        estimatedCost={estimatedCost}
        currentBalance={user?.coins ?? 0}
        loading={loading}
        exportLoading={exportLoading}
        canExport={canExport}
        onExport={handleExportClick}
      />
      {lastExport && !exportLoading ? (
        <div className="rounded-[28px] border border-emerald-200 bg-[linear-gradient(135deg,rgba(16,185,129,0.08),rgba(255,255,255,0.96))] px-5 py-5 shadow-[0_18px_40px_rgba(16,185,129,0.08)]">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-700/80">Saved export</p>
              <h3 className="mt-2 text-base font-semibold text-slate-900">{lastExport.filename}</h3>
              <p className="mt-1 text-sm text-slate-600">
                {String(lastExport.format || '').toUpperCase()} file with {Number(lastExport.totalRows || 0).toLocaleString()} rows. Auto remove in {formatTimeRemaining(lastExport.expiresAt)}.
              </p>
            </div>
          </div>
        </div>
      ) : null}

      <FilterPanel
        dataset={dataset}
        filters={filters}
        onChange={updateFilter}
        onReset={handleReset}
        loading={loading}
      />

      <ExportModal
        preview={preview}
        loading={exportLoading}
        onClose={() => setPreview(null)}
        onConfirm={handleExport}
      />
    </div>
  );
};

export default MarketplacePage;
