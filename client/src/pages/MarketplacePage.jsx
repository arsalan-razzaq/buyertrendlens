import { useEffect, useState } from 'react';
import http, { dataHttp, getErrorMessage } from '../api/http';
import DataTable from '../components/DataTable';
import ExportModal from '../components/ExportModal';
import FilterPanel from '../components/FilterPanel';
import GuidedTour from '../components/GuidedTour';
import { useAuth } from '../hooks/useAuth';
import { buildBrandedExportFilename, downloadBlob, formatCoins } from '../utils/format';

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
  const [refreshing, setRefreshing] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [preview, setPreview] = useState(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [tourOpen, setTourOpen] = useState(true);

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
    setRefreshing(false);
    setTourOpen(true);
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
    const hasSummary = Number.isFinite(datasetSummary.total);
    if (loading || !hasSummary) {
      setLoading(true);
    } else {
      setRefreshing(true);
    }
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
      setRefreshing(false);
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
    setMessage('');
    try {
      await refreshProfile();
      const { data } = await dataHttp.post('/export/preview', { dataset, ...appliedFilters, format });

      if ((Number(data?.totalRows) || 0) <= 0) {
        setPreview(null);
        setError('No rows match the selected filters. Adjust the filters and try again.');
        return;
      }

      setPreview({ ...data, format });
    } catch (previewError) {
      setPreview(null);
      setError(getErrorMessage(previewError));
    }
  };

  const handleExport = async ({ format = 'xls', rememberChoice = false } = {}) => {
    setExportLoading(true);
    setError('');
    setMessage('');

    try {
      const { data } = await dataHttp.post('/export', { dataset, ...appliedFilters, format });
      await downloadSavedExport(data.id, data.filename);
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
  const tourSteps = dataset === 'eldorado'
    ? [
        {
          selector: '[data-tour-id="export-summary"]',
          title: 'Eldorado export summary',
          description: 'This section shows the live total rows, export cost, and wallet balance for the currently selected Eldorado filters. It updates automatically after every filter change.'
        },
        {
          selector: '[data-tour-id="search-filter"]',
          title: 'Title search',
          description: 'Use this when you already know the offer title or a keyword. It is the fastest way to narrow a broad list immediately.'
        },
        {
          selector: '[data-tour-id="category-filter"]',
          title: 'Category type',
          description: 'Select the category type first. This tells the backend which product family to search in and keeps the remaining options relevant.'
        },
        {
          selector: '[data-tour-id="game-filter"]',
          title: 'Game selection',
          description: 'The game field is the most important filter after category. Choosing a specific game makes both the seller list and export count much more accurate.'
        },
        {
          selector: '[data-tour-id="verified-filter"]',
          title: 'Verified sellers only',
          description: 'Turn this on to show only verified Eldorado sellers. It is useful when you want a trust-focused shortlist.'
        },
        {
          selector: '[data-tour-id="seller-filter"]',
          title: 'Seller lookup',
          description: 'The Seller Name field uses remote search. Type at least one character to load matching sellers and lock the dataset to a specific seller.'
        },
        {
          selector: '[data-tour-id="numeric-filters"]',
          title: 'Price range filters',
          description: 'Use Min Price and Max Price to control the export by budget or pricing band. This is useful when you only want premium or low-cost offers.'
        },
        {
          selector: '[data-tour-id="export-button"]',
          title: 'Export flow',
          description: 'Once the totals look right, use Export Data to start the preview and file generation flow. The cost is deducted from the wallet based on matching rows.'
        }
      ]
    : [
        {
          selector: '[data-tour-id="export-summary"]',
          title: 'G2G export summary',
          description: 'This section shows how many rows match the current G2G filters, the estimated export cost, and the available wallet balance.'
        },
        {
          selector: '[data-tour-id="search-filter"]',
          title: 'Quick title search',
          description: 'If you already know the account title or a keyword, use this field to narrow the results directly. It works as a quick shortcut before broader filtering.'
        },
        {
          selector: '[data-tour-id="category-filter"]',
          title: 'Category filter',
          description: 'Choosing a category segments the data stream, such as accounts or other product types. Setting this first makes the remaining filters more relevant.'
        },
        {
          selector: '[data-tour-id="game-filter"]',
          title: 'Game name filter',
          description: 'The Game Name field narrows the selected category to a specific game. Once a game is selected, unnecessary results drop significantly.'
        },
        {
          selector: '[data-tour-id="seller-rank-filter"]',
          title: 'Seller rank filter',
          description: 'Seller Rank lets you control the quality tier, from normal seller up to legendary seller. Higher rank filtering is useful when targeting premium sellers.'
        },
        {
          selector: '[data-tour-id="seller-filter"]',
          title: 'Seller search',
          description: 'Use Seller Name to lock the results to a specific vendor. After setting rank, category, and game, seller search returns much cleaner results.'
        },
        {
          selector: '[data-tour-id="numeric-filters"]',
          title: 'Advanced numeric filters',
          description: 'Use fields like price, rating, user level, score, and orders sold to refine the shortlist aggressively. These filters are most useful when you want a high-intent export.'
        },
        {
          selector: '[data-tour-id="export-button"]',
          title: 'Export final data',
          description: 'The Export Data button opens the preview and generates the approved file. The final export includes only the rows currently matching the filters.'
        }
      ];

  const closeTour = () => {
    setTourOpen(false);
  };

  const handleExportClick = async () => {
    if (skipExportConfirmation && canExport) {
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
        refreshing={refreshing}
        exportLoading={exportLoading}
        canExport={canExport}
        onExport={handleExportClick}
      />
      <FilterPanel
        dataset={dataset}
        filters={filters}
        onChange={updateFilter}
        onReset={handleReset}
        onOpenTour={() => setTourOpen(true)}
        loading={loading}
      />

      <ExportModal
        preview={preview}
        loading={exportLoading}
        onClose={() => setPreview(null)}
        onConfirm={handleExport}
      />
      <GuidedTour
        open={tourOpen}
        steps={tourSteps}
        onClose={closeTour}
        onComplete={closeTour}
      />
    </div>
  );
};

export default MarketplacePage;
