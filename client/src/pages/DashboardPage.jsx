import { useCallback, useEffect, useMemo, useState } from 'react';
import http, { dataHttp, getErrorMessage } from '../api/http';
import DataTable from '../components/DataTable';
import ExportModal from '../components/ExportModal';
import FilterPanel from '../components/FilterPanel';
import StatCard from '../components/StatCard';
import { useAuth } from '../hooks/useAuth';
import { downloadBlob, formatCoins, formatDate, formatTimeRemaining } from '../utils/format';

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

const DashboardChart = ({ walletReport, loading = false }) => {
  const chartData = useMemo(() => {
    const source = walletReport.timeline.length
      ? walletReport.timeline
      : Array.from({ length: 6 }, (_, index) => ({
          label: `D${index + 1}`,
          credits: 0,
          debits: 0,
          net: 0
        }));

    return source.map((point) => {
      const credits = Number(point.credits) || 0;
      const debits = Number(point.debits) || 0;
      const net = Number(point.net) || 0;

      return {
        label: point.label,
        credits,
        debits,
        net
      };
    });
  }, [walletReport.timeline]);

  const maxValue = Math.max(...chartData.flatMap((point) => [point.credits, point.debits, Math.abs(point.net)]), 1);

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

        <div className="relative overflow-hidden rounded-[24px] border border-white/10 bg-[linear-gradient(180deg,rgba(8,15,28,0.25),rgba(8,15,28,0.7))] px-4 pb-6 pt-6">
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(148,163,184,0.10)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.08)_1px,transparent_1px)] bg-[size:100%_25%,12.5%_100%]" />

          <div className="relative z-10 grid min-h-[18rem] grid-cols-6 gap-3">
            {(loading ? Array.from({ length: 6 }, (_, index) => ({ label: `loading-${index}` })) : chartData).map((point, index) => {
              if (loading) {
                return (
                  <div key={point.label} className="flex min-w-0 flex-col justify-end gap-3">
                    <div className="mx-auto h-6 w-14 animate-pulse rounded-2xl bg-white/10" />
                    <div className="flex h-52 items-end justify-center gap-2">
                      <div className="w-5 animate-pulse rounded-t-[14px] bg-emerald-300/20" style={{ height: `${48 + (index % 3) * 12}%` }} />
                      <div className="w-5 animate-pulse rounded-t-[14px] bg-sky-300/20" style={{ height: `${36 + (index % 4) * 10}%` }} />
                    </div>
                    <div className="space-y-2 text-center">
                      <div className="mx-auto h-3 w-10 animate-pulse rounded-full bg-white/10" />
                      <div className="mx-auto h-2.5 w-12 animate-pulse rounded-full bg-emerald-200/20" />
                      <div className="mx-auto h-2.5 w-12 animate-pulse rounded-full bg-sky-200/20" />
                    </div>
                  </div>
                );
              }

              const creditHeight = `${Math.max((point.credits / maxValue) * 100, point.credits > 0 ? 8 : 0)}%`;
              const debitHeight = `${Math.max((point.debits / maxValue) * 100, point.debits > 0 ? 8 : 0)}%`;

              return (
                <div key={point.label} className="flex min-w-0 flex-col justify-end gap-3">
                  <div className="rounded-2xl border border-white/5 bg-white/[0.03] px-2 py-1 text-center">
                    <p className="truncate text-[10px] font-semibold uppercase tracking-[0.16em] text-cyan-100/60">
                      {formatCoins(point.credits + point.debits)}
                    </p>
                  </div>
                  <div className="flex h-52 items-end justify-center gap-2">
                    <div className="flex h-full w-5 items-end">
                      <div
                        className="w-full rounded-t-[14px] border border-emerald-300/20 bg-[linear-gradient(180deg,#34d399_0%,#0f766e_100%)] shadow-[0_0_18px_rgba(52,211,153,0.22)]"
                        style={{ height: creditHeight }}
                        title={`${point.label} credits: ${point.credits.toFixed(2)}`}
                      />
                    </div>
                    <div className="flex h-full w-5 items-end">
                      <div
                        className="w-full rounded-t-[14px] border border-sky-300/20 bg-[linear-gradient(180deg,#60a5fa_0%,#1d4ed8_100%)] shadow-[0_0_18px_rgba(96,165,250,0.22)]"
                        style={{ height: debitHeight }}
                        title={`${point.label} debits: ${point.debits.toFixed(2)}`}
                      />
                    </div>
                  </div>
                  <div className="space-y-1 text-center">
                    <span className="block text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400">{point.label}</span>
                    <p className="text-[10px] text-emerald-200/80">+{formatCoins(point.credits)}</p>
                    <p className="text-[10px] text-sky-200/80">-{formatCoins(point.debits)}</p>
                  </div>
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

const DATASET_LABELS = {
  g2g: 'G2G',
  eldorado: 'Eldorado'
};

const ExportHistoryPanel = ({ files, loading, retentionDays, onDownload, downloadingId }) => (
  <div className="panel overflow-hidden">
    <div className="border-b border-slate-100 px-5 py-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="panel-title">Saved Export Files</h2>
          <p className="mt-1 text-sm text-slate-500">
            Each export file stays available here for {retentionDays} days and is removed automatically after that.
          </p>
        </div>
        <div className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
          {files.length} files
        </div>
      </div>
    </div>

    {loading ? (
      <div className="space-y-3 px-5 py-5">
        {[0, 1, 2].map((item) => (
          <div key={item} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
            <div className="h-3 w-28 animate-pulse rounded-full bg-slate-200" />
            <div className="mt-3 h-4 w-2/3 animate-pulse rounded-full bg-slate-200" />
            <div className="mt-3 h-3 w-1/2 animate-pulse rounded-full bg-slate-100" />
          </div>
        ))}
      </div>
    ) : files.length ? (
      <div className="divide-y divide-slate-100">
        {files.map((file) => (
          <div key={file.id} className="flex flex-col gap-4 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                  {DATASET_LABELS[file.dataset] || String(file.dataset || '').toUpperCase()}
                </span>
                <span className="rounded-full bg-sky-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-700">
                  {String(file.format || '').toUpperCase()}
                </span>
              </div>
              <h3 className="mt-3 truncate text-sm font-semibold text-slate-900">{file.filename}</h3>
              <p className="mt-1 text-sm text-slate-500">
                {Number(file.totalRows || 0).toLocaleString()} rows, {formatCoins(file.cost)}, created {formatDate(file.createdAt)}
              </p>
              <p className="mt-1 text-sm text-amber-700">Remove in {formatTimeRemaining(file.expiresAt)}</p>
            </div>

            <button
              type="button"
              className="button-secondary shrink-0"
              onClick={() => onDownload(file.id)}
              disabled={downloadingId === file.id}
            >
              {downloadingId === file.id ? 'Preparing download...' : 'Download Again'}
            </button>
          </div>
        ))}
      </div>
    ) : (
      <div className="px-5 py-6 text-sm text-slate-500">No saved export files are available yet.</div>
    )}
  </div>
);

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
  const [savedExports, setSavedExports] = useState([]);
  const [exportHistoryLoading, setExportHistoryLoading] = useState(true);
  const [exportRetentionDays, setExportRetentionDays] = useState(20);
  const [downloadingExportId, setDownloadingExportId] = useState('');
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

  const fetchExportHistory = useCallback(async () => {
    setExportHistoryLoading(true);

    try {
      const { data } = await http.get('/export/history');
      setSavedExports(Array.isArray(data.exports) ? data.exports : []);
      setExportRetentionDays(Number(data.retentionDays) || 20);
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setExportHistoryLoading(false);
    }
  }, []);

  const fetchData = async (requestedFilters = appliedFilters) => {
    setLoading(true);
    setError('');

    try {
      const [{ data }, walletResponse, exportHistoryResponse] = await Promise.all([
        dataHttp.get('/', {
          params: {
            ...requestedFilters,
            page: 1,
            limit: 1
          }
        }),
        http.get('/wallet'),
        http.get('/export/history')
      ]);

      setDataset({ total: data.total });
      const transactions = Array.isArray(walletResponse.data?.transactions) ? walletResponse.data.transactions : [];
      setSavedExports(Array.isArray(exportHistoryResponse.data?.exports) ? exportHistoryResponse.data.exports : []);
      setExportRetentionDays(Number(exportHistoryResponse.data?.retentionDays) || 20);
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
      setExportHistoryLoading(false);
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
      await fetchExportHistory();
    } catch (exportError) {
      setError(getErrorMessage(exportError));
    } finally {
      setExportLoading(false);
    }
  };

  const handleSavedExportDownload = async (exportId) => {
    setDownloadingExportId(exportId);
    setError('');

    try {
      const response = await http.get(`/export/${exportId}/download`, {
        responseType: 'blob'
      });
      const disposition = String(response.headers['content-disposition'] || '');
      const filename = disposition.match(/filename="([^"]+)"/i)?.[1] || 'dataset-export';
      downloadBlob(filename, response.data);
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setDownloadingExportId('');
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
        <StatCard title="Wallet Balance" value={formatCoins(user?.coins)} helper="Updated after every export or approved recharge." icon={<WalletIcon />} loading={loading} />
        <StatCard title="Filtered Rows" value={dataset.total} helper="Current dataset footprint matching your query." accent="bg-amber-500" icon={<RowsIcon />} loading={loading} />
        <StatCard title="Estimated Export Cost" value={formatCoins(estimatedCost)} helper="This is the estimated coin cost based on the applied filters." accent="bg-sky-500" icon={<ExportCostIcon />} loading={loading} />
      </div>

      <DashboardChart walletReport={walletReport} loading={loading} />

      <ExportHistoryPanel
        files={savedExports}
        loading={exportHistoryLoading}
        retentionDays={exportRetentionDays}
        onDownload={handleSavedExportDownload}
        downloadingId={downloadingExportId}
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
