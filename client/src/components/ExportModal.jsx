import { useEffect, useState } from 'react';
import { formatCoins } from '../utils/format';

const RowsIcon = () => (
  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
    <rect x="4" y="5" width="16" height="4" rx="1.5" />
    <rect x="4" y="10" width="16" height="4" rx="1.5" />
    <rect x="4" y="15" width="16" height="4" rx="1.5" />
  </svg>
);

const CostIcon = () => (
  <svg
    viewBox="0 0 24 24"
    className="h-4 w-4"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M12 3v18" />
    <path d="M16.5 7.5c0-1.66-2.01-3-4.5-3s-4.5 1.34-4.5 3 2.01 3 4.5 3 4.5 1.34 4.5 3-2.01 3-4.5 3-4.5-1.34-4.5-3" />
  </svg>
);

const BalanceIcon = () => (
  <svg
    viewBox="0 0 24 24"
    className="h-4 w-4"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M3 7.5A2.5 2.5 0 0 1 5.5 5H18a2 2 0 0 1 2 2v1H5.5A2.5 2.5 0 0 0 3 10.5v-3Z" />
    <path d="M3 10.5A2.5 2.5 0 0 1 5.5 8H21v8.5A2.5 2.5 0 0 1 18.5 19h-13A2.5 2.5 0 0 1 3 16.5v-6Z" />
    <circle cx="16.5" cy="13.5" r="1" fill="currentColor" stroke="none" />
  </svg>
);

const SummaryStat = ({ icon, label, value, tone }) => (
  <div className="rounded-2xl bg-white px-4 py-3 shadow-[inset_0_0_0_1px_rgba(148,163,184,0.12)]">
    <div className={`inline-flex h-8 w-8 items-center justify-center rounded-xl ${tone}`}>{icon}</div>
    <p className="mt-3 text-[11px] uppercase tracking-[0.16em] text-slate-400">{label}</p>
    <p className="mt-1 text-lg font-semibold text-ink">{value}</p>
  </div>
);

const exportFormats = [
  { value: 'xls', label: 'Excel', description: 'Styled sheet with bold headers, centered cells, and clickable links.' },
  { value: 'csv', label: 'CSV', description: 'Plain spreadsheet data without styling.' },
  { value: 'json', label: 'JSON', description: 'Structured raw dataset for APIs or scripts.' },
  { value: 'tsv', label: 'TSV', description: 'Tab-separated export for Excel-style tools.' }
];

const ExportSpinner = () => (
  <span
    className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/35 border-t-white"
    aria-hidden="true"
  />
);

const ExportModal = ({ preview, loading, onClose, onConfirm }) => {
  const [skipNextTime, setSkipNextTime] = useState(false);
  const [format, setFormat] = useState('xls');
  const remainingBalance =
    typeof preview?.remainingBalance === 'number'
      ? preview.remainingBalance
      : Math.max((preview?.currentBalance || 0) - (preview?.cost || 0), 0);

  useEffect(() => {
    setSkipNextTime(false);
    setFormat(preview?.format || 'xls');
  }, [preview]);

  if (!preview) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/45 px-4 py-6">
      <div className="flex min-h-full items-center justify-center">
      <div className="panel w-full max-w-lg p-4 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="panel-title">Confirm Export</h2>
            <p className="mt-1 text-sm text-slate-500">
              This export contains {preview.totalRows} rows and will cost {formatCoins(preview.cost)}.
            </p>
          </div>
          <button type="button" className="text-slate-400 transition hover:text-slate-700" onClick={onClose}>
            Close
          </button>
        </div>

        <div className="mt-6 grid gap-3 rounded-2xl bg-slate-50 p-4 md:grid-cols-3">
          <SummaryStat
            icon={<RowsIcon />}
            label="Rows"
            value={preview.totalRows}
            tone="bg-amber-100 text-amber-700"
          />
          <SummaryStat
            icon={<CostIcon />}
            label="Cost"
            value={formatCoins(preview.cost)}
            tone="bg-sky-100 text-sky-700"
          />
          <SummaryStat
            icon={<BalanceIcon />}
            label="Balance After Export"
            value={formatCoins(remainingBalance)}
            tone="bg-emerald-100 text-emerald-700"
          />
        </div>

        <div className="mt-5">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Export Format</p>
          <div className="mt-3 grid gap-3">
            {exportFormats.map((option) => (
              <label
                key={option.value}
                className={`flex cursor-pointer items-start gap-3 rounded-2xl border px-4 py-3 transition ${
                  format === option.value
                    ? 'border-brand-200 bg-brand-50/70'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <input
                  type="radio"
                  name="export-format"
                  className="mt-1 h-4 w-4 border-slate-300 text-brand-600 focus:ring-brand-500"
                  checked={format === option.value}
                  onChange={() => setFormat(option.value)}
                />
                <span>
                  <span className="block text-sm font-semibold text-slate-700">{option.label}</span>
                  <span className="mt-1 block text-sm text-slate-500">{option.description}</span>
                </span>
              </label>
            ))}
          </div>
        </div>

        {!preview.canExport ? (
          <div className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            You do not have enough coins to complete this export.
          </div>
        ) : null}

        {loading ? (
          <div className="mt-5 rounded-2xl border border-sky-200 bg-sky-50 px-4 py-4 text-sm text-sky-800">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 inline-flex h-9 w-9 items-center justify-center rounded-full bg-sky-100 text-sky-700">
                <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-sky-300 border-t-sky-700" />
              </span>
              <div>
                <p className="font-semibold text-sky-900">Export tayar ho rahi hai</p>
                <p className="mt-1 text-sky-700">
                  Download isi popup se complete hoga. Background section me ab alag loading card nahi dikhaya jayega.
                </p>
              </div>
            </div>
          </div>
        ) : null}

        {preview.canExport ? (
          <label className="mt-5 flex items-start gap-3 rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-600">
            <input
              type="checkbox"
              className="mt-1 h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
              checked={skipNextTime}
              onChange={(event) => setSkipNextTime(event.target.checked)}
            />
            <span>Do not show this popup again and export directly next time.</span>
          </label>
        ) : null}

        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-end">
          <button type="button" className="button-secondary w-full sm:w-auto" onClick={onClose} disabled={loading}>
            Cancel
          </button>
          <button
            type="button"
            className="button-primary flex w-full items-center justify-center gap-2 sm:w-auto"
            onClick={() => onConfirm({ format, rememberChoice: skipNextTime })}
            disabled={loading || !preview.canExport}
          >
            {loading ? (
              <>
                <ExportSpinner />
                Exporting...
              </>
            ) : (
              'Confirm Export'
            )}
          </button>
        </div>
      </div>
      </div>
    </div>
  );
};

export default ExportModal;
