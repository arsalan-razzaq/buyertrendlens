import { useEffect, useState } from 'react';
import { dataHttp, getErrorMessage } from '../api/http';
import DataTable from '../components/DataTable';
import ExportModal from '../components/ExportModal';
import FilterPanel from '../components/FilterPanel';
import { useAuth } from '../hooks/useAuth';
import { downloadFile, formatCoins } from '../utils/format';

const COIN_COST_PER_ROW = 1;
const EXPORT_CONFIRMATION_STORAGE_KEY = 'skip-export-confirmation';
const FILTER_APPLY_DEBOUNCE_MS = 300;
const SUPPORTED_EXPORT_FORMATS = new Set(['csv', 'json', 'tsv']);

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

  const openExportModal = async (format = 'csv') => {
    setError('');
    try {
      await refreshProfile();
      const { data } = await dataHttp.post('/export/preview', { dataset, ...appliedFilters, format });
      setPreview({ ...data, format });
    } catch (previewError) {
      setError(getErrorMessage(previewError));
    }
  };

  const handleExport = async ({ format = 'csv', rememberChoice = false } = {}) => {
    setExportLoading(true);
    setError('');

    try {
      const { data } = await dataHttp.post('/export', { dataset, ...appliedFilters, format });
      downloadFile(data.filename, data.content, data.mimeType);
      setMessage(`${String(data.format || format).toUpperCase()} export completed. ${formatCoins(data.cost)} deducted from your wallet.`);
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

    await openExportModal('csv');
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
        canExport={canExport}
        onExport={handleExportClick}
      />

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
