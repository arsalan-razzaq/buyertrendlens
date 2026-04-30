import { useEffect, useState } from 'react';
import http, { dataHttp, getErrorMessage } from '../api/http';
import DataTable from '../components/DataTable';
import ExportModal from '../components/ExportModal';
import FilterPanel from '../components/FilterPanel';
import StatCard from '../components/StatCard';
import { useAuth } from '../hooks/useAuth';
import { downloadFile, formatCoins } from '../utils/format';

const COIN_COST_PER_ROW = 1;
const EXPORT_CONFIRMATION_STORAGE_KEY = 'skip-export-confirmation';
const FILTER_APPLY_DEBOUNCE_MS = 300;
const SUPPORTED_EXPORT_FORMATS = new Set(['csv', 'json', 'tsv']);

const WalletIcon = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <ellipse cx="12" cy="7" rx="5.5" ry="2.5" />
    <path d="M6.5 7v4c0 1.38 2.46 2.5 5.5 2.5s5.5-1.12 5.5-2.5V7" />
    <path d="M6.5 11v4c0 1.38 2.46 2.5 5.5 2.5s5.5-1.12 5.5-2.5v-4" />
  </svg>
);

const RowsIcon = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="4" y="5" width="16" height="4" rx="1.5" />
    <rect x="4" y="10" width="16" height="4" rx="1.5" />
    <rect x="4" y="15" width="16" height="4" rx="1.5" />
  </svg>
);

const ExportCostIcon = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="7" />
    <path d="M12 8v8" />
    <path d="M14.75 9.75c0-1.1-1.23-2-2.75-2s-2.75.9-2.75 2 1.23 2 2.75 2 2.75.9 2.75 2-1.23 2-2.75 2-2.75-.9-2.75-2" />
  </svg>
);

const initialFilters = {
  search: '',
  category: '',
  gameName: '',
  sellerName: '',
  priceMin: '',
  priceMax: '',
  rating: '',
  userLevel: '',
  minSellerRank: '',
  score: '',
  group: '',
  groupName: '',
  ordersSold: ''
};

const G2gpage = () => {
  const { user, refreshProfile } = useAuth();
  const [filters, setFilters] = useState(initialFilters);
  const [appliedFilters, setAppliedFilters] = useState(initialFilters);
  const [dataset, setDataset] = useState({ total: 0 });
  const [loading, setLoading] = useState(true);
  const [exportLoading, setExportLoading] = useState(false);
  const [preview, setPreview] = useState(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [savedExportFormat, setSavedExportFormat] = useState(() => {
    if (typeof window === 'undefined') {
      return '';
    }

    const storedValue = window.localStorage.getItem(EXPORT_CONFIRMATION_STORAGE_KEY) || '';
    return SUPPORTED_EXPORT_FORMATS.has(storedValue) ? storedValue : '';
  });
  const skipExportConfirmation = Boolean(savedExportFormat);

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
          ...requestedFilters,
          page: 1,
          limit: 1
        }
      });

      setDataset({ total: Number(data.total) || 0 });
    } catch (requestError) {
      setError(getErrorMessage(requestError));
      setDataset({ total: 0 });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(appliedFilters);
  }, [appliedFilters]);

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
      const { data } = await dataHttp.post('/export/preview', { ...appliedFilters, format });
      setPreview({ ...data, format });
    } catch (previewError) {
      setError(getErrorMessage(previewError));
    }
  };

  const handleExport = async ({ format = 'csv', rememberChoice = false } = {}) => {
    setExportLoading(true);
    setError('');

    try {
      const { data } = await dataHttp.post('/export', { ...appliedFilters, format });
      downloadFile(data.filename, data.content, data.mimeType);
      setMessage(`${String(data.format || format).toUpperCase()} export completed. ${formatCoins(data.cost)} deducted from your wallet.`);
      setPreview(null);
      if (rememberChoice) {
        window.localStorage.setItem(EXPORT_CONFIRMATION_STORAGE_KEY, format);
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

  const estimatedCost = Number((dataset.total * COIN_COST_PER_ROW).toFixed(2));
  const canExport = dataset.total > 0 && (user?.coins ?? 0) >= estimatedCost;

  const handleExportClick = async () => {
    if (skipExportConfirmation) {
      await handleExport({ format: savedExportFormat });
      return;
    }

    await openExportModal('csv');
  };

  return (
    <div className="space-y-5">
      {/* <div className="grid gap-4 md:grid-cols-3">
        <StatCard title="Wallet Balance" value={formatCoins(user?.coins)} helper="Updated after every export or approved recharge." icon={<WalletIcon />} />
        <StatCard title="Filtered Rows" value={dataset.total} helper="Current dataset footprint matching your query." accent="bg-amber-500" icon={<RowsIcon />} />
        <StatCard title="Estimated Export Cost" value={formatCoins(estimatedCost)} helper="This is the estimated coin cost based on the applied filters." accent="bg-sky-500" icon={<ExportCostIcon />} />
      </div> */}

      {message ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{message}</div>
      ) : null}
      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
      ) : null}

      <DataTable
        total={dataset.total}
        estimatedCost={estimatedCost}
        currentBalance={user?.coins ?? 0}
        loading={loading}
        canExport={canExport}
        onExport={handleExportClick}
      />

      <FilterPanel
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

export default G2gpage;
