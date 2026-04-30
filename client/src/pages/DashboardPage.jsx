import { useEffect, useMemo, useState } from 'react';
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

const DashboardChart = ({ totalRows, estimatedCost, walletBalance, walletReport }) => {
  const chartData = useMemo(() => {
    if (walletReport.timeline.length) {
      return walletReport.timeline;
    }

    return Array.from({ length: 6 }, (_, index) => ({
      label: `D${index + 1}`,
      credits: 0,
      debits: 0,
      net: 0
    }));
  }, [walletReport.timeline]);

  const maxValue = Math.max(
    ...chartData.flatMap((point) => [point.credits, point.debits, Math.abs(point.net)]),
    1
  );

  return (
    <div className="overflow-hidden rounded-[30px] border border-slate-200 bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.16),_transparent_32%),linear-gradient(135deg,#06131c_0%,#0b2230_55%,#112f43_100%)] shadow-[0_24px_80px_rgba(8,15,28,0.12)]">
      <div className="p-6 lg:p-7">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-100/70">Coin Activity Chart</p>
          </div>
          <div className="flex flex-wrap gap-3 text-[11px] font-semibold uppercase tracking-[0.18em]">
            <span className="inline-flex items-center gap-2 text-emerald-200">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
              Purchased
            </span>
            <span className="inline-flex items-center gap-2 text-sky-200">
              <span className="h-2.5 w-2.5 rounded-full bg-sky-400" />
              Used
            </span>
          </div>
        </div>

        <div className="relative h-80 overflow-hidden rounded-[24px] border border-white/10 bg-[linear-gradient(180deg,rgba(8,15,28,0.25),rgba(8,15,28,0.7))] px-4 pb-10 pt-6">
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(148,163,184,0.10)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.08)_1px,transparent_1px)] bg-[size:100%_25%,12.5%_100%]" />

          <div className="relative z-10 flex h-full items-end gap-3">
            {chartData.map((point) => {
              const creditHeight = `${Math.max((point.credits / maxValue) * 100, point.credits ? 12 : 0)}%`;
              const debitHeight = `${Math.max((point.debits / maxValue) * 100, point.debits ? 12 : 0)}%`;

              return (
                <div key={point.label} className="flex flex-1 flex-col items-center justify-end gap-3">
                  <div className="flex h-full w-full items-end justify-center gap-2">
                    <div className="flex h-full w-full max-w-[18px] items-end">
                      <div
                        className="w-full rounded-t-full bg-[linear-gradient(180deg,#34d399_0%,#0f766e_100%)] shadow-[0_0_18px_rgba(52,211,153,0.22)]"
                        style={{ height: creditHeight }}
                        title={`${point.label} credits: ${point.credits.toFixed(2)}`}
                      />
                    </div>
                    <div className="flex h-full w-full max-w-[18px] items-end">
                      <div
                        className="w-full rounded-t-full bg-[linear-gradient(180deg,#60a5fa_0%,#1d4ed8_100%)] shadow-[0_0_18px_rgba(96,165,250,0.22)]"
                        style={{ height: debitHeight }}
                        title={`${point.label} debits: ${point.debits.toFixed(2)}`}
                      />
                    </div>
                  </div>
                  <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400">{point.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

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

const DashboardPage = () => {
  const { user, refreshProfile } = useAuth();
  const [filters, setFilters] = useState(initialFilters);
  const [appliedFilters, setAppliedFilters] = useState(initialFilters);
  const [dataset, setDataset] = useState({ total: 0 });
  const [walletReport, setWalletReport] = useState({
    totalCredits: 0,
    totalDebits: 0,
    netFlow: 0,
    largestCredit: 0,
    largestDebit: 0,
    transactionCount: 0,
    timeline: []
  });
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
      const [{ data }, walletResponse] = await Promise.all([
        dataHttp.get('/', {
          params: {
            ...requestedFilters,
            page: 1,
            limit: 1
          }
        }),
        http.get('/wallet')
      ]);

      setDataset({ total: data.total });
      const transactions = Array.isArray(walletResponse.data?.transactions) ? walletResponse.data.transactions : [];
      const credits = transactions.filter((item) => item.type === 'credit');
      const debits = transactions.filter((item) => item.type === 'debit');

      const groupedTimeline = transactions
        .slice()
        .reverse()
        .reduce((accumulator, transaction) => {
          const date = new Date(transaction.createdAt);
          const label = date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
          const current = accumulator.get(label) || { label, credits: 0, debits: 0, net: 0 };
          const amount = Number(transaction.amount) || 0;

          if (transaction.type === 'credit') {
            current.credits += amount;
            current.net += amount;
          } else {
            current.debits += amount;
            current.net -= amount;
          }

          accumulator.set(label, current);
          return accumulator;
        }, new Map());

      const timeline = Array.from(groupedTimeline.values()).slice(-6);

      setWalletReport({
        totalCredits: credits.reduce((sum, item) => sum + (Number(item.amount) || 0), 0),
        totalDebits: debits.reduce((sum, item) => sum + (Number(item.amount) || 0), 0),
        netFlow: transactions.reduce(
          (sum, item) => sum + ((item.type === 'credit' ? 1 : -1) * (Number(item.amount) || 0)),
          0
        ),
        largestCredit: credits.reduce((max, item) => Math.max(max, Number(item.amount) || 0), 0),
        largestDebit: debits.reduce((max, item) => Math.max(max, Number(item.amount) || 0), 0),
        transactionCount: transactions.length,
        timeline
      });
    } catch (requestError) {
      setError(getErrorMessage(requestError));
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
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard title="Wallet Balance" value={formatCoins(user?.coins)} helper="Updated after every export or approved recharge." icon={<WalletIcon />} />
        <StatCard title="Filtered Rows" value={dataset.total} helper="Current dataset footprint matching your query." accent="bg-amber-500" icon={<RowsIcon />} />
        <StatCard title="Estimated Export Cost" value={formatCoins(estimatedCost)} helper="This is the estimated coin cost based on the applied filters." accent="bg-sky-500" icon={<ExportCostIcon />} />
      </div>

      <DashboardChart
        totalRows={dataset.total}
        estimatedCost={estimatedCost}
        walletBalance={user?.coins ?? 0}
        walletReport={walletReport}
      />

      {/* <FilterPanel
        filters={filters}
        onChange={updateFilter}
        onApply={handleApply}
        onReset={handleReset}
        loading={loading}
      /> */}

      {/* {message ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{message}</div>
      ) : null}
      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
      ) : null} */}

      {/* <DataTable
        total={dataset.total}
        estimatedCost={estimatedCost}
        currentBalance={user?.coins ?? 0}
        loading={loading}
        canExport={canExport}
        onExport={handleExportClick}
      /> */}

      <ExportModal
        preview={preview}
        loading={exportLoading}
        onClose={() => setPreview(null)}
        onConfirm={handleExport}
      />
    </div>
  );
};

export default DashboardPage;
